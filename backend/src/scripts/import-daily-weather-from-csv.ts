/**
 * Script to import daily weather data from CSV to database
 * 
 * Usage:
 *   npm run import:daily-weather
 *   npm run import:daily-weather -- --csv="./data/daily_weather_data.csv"
 *   npm run import:daily-weather -- --csv="./data/daily_weather_data.csv" --skip-existing
 */

import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { DailyWeatherDataModel } from '../models/DailyWeatherData';
import { WeatherStatisticsModel } from '../models/WeatherStatistics';

// Load environment variables
const envPaths = [
  path.join(__dirname, '../../.env'),
  path.join(process.cwd(), '.env'),
  path.join(process.cwd(), 'backend/.env'),
];

for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
    break;
  } catch (error) {
    // Continue to next path
  }
}

dotenv.config();

/**
 * Parse CSV line
 */
function parseCSVLine(line: string): string[] {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current.trim());
  return values.map(v => v.replace(/^"|"$/g, ''));
}

/**
 * Import daily weather data from CSV to database
 */
async function importCSVToDatabase(csvFilePath: string, skipExisting: boolean = false): Promise<void> {
  console.log(`\n📥 Importing daily weather data from CSV to database...`);
  console.log('='.repeat(80));

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length <= 1) {
    console.error('❌ CSV file is empty or has no data rows');
    process.exit(1);
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const expectedHeaders = ['province', 'date', 'tempMax', 'tempMin', 'tempAvg', 'precipitation', 'humidity', 'source', 'year', 'month', 'day'];
  
  // Validate headers
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    console.error(`❌ Missing required headers: ${missingHeaders.join(', ')}`);
    console.error(`   Found headers: ${headers.join(', ')}`);
    process.exit(1);
  }

  let totalStored = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let totalProcessed = 0;

  // Process rows in batches for better performance
  const BATCH_SIZE = 100;
  const batch: Array<{
    province: string;
    date: string;
    tempMax: number;
    tempMin: number;
    tempAvg: number;
    precipitation: number;
    humidity: number | null;
    source: 'open-meteo' | 'openweathermap';
    year: number;
    month: number;
    day: number;
  }> = [];

  console.log(`📊 Processing ${lines.length - 1} rows...\n`);

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    try {
      const values = parseCSVLine(lines[i]);
      
      // Map values to object
      const row: any = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });

      // Validate required fields
      if (!row.province || !row.date) {
        console.warn(`⚠️  Skipping row ${i + 1}: missing province or date`);
        totalSkipped++;
        continue;
      }

      // Check if exists
      if (skipExisting) {
        const exists = await DailyWeatherDataModel.exists(row.province, row.date);
        if (exists) {
          totalSkipped++;
          continue;
        }
      }

      // Parse numeric values
      const tempMax = parseFloat(row.tempMax);
      const tempMin = parseFloat(row.tempMin);
      const tempAvg = parseFloat(row.tempAvg);
      const precipitation = parseFloat(row.precipitation) || 0;
      const humidity = row.humidity ? parseFloat(row.humidity) : null;
      const year = parseInt(row.year, 10);
      const month = parseInt(row.month, 10);
      const day = parseInt(row.day, 10);

      // Validate source
      if (row.source !== 'open-meteo' && row.source !== 'openweathermap') {
        console.warn(`⚠️  Skipping row ${i + 1}: invalid source "${row.source}"`);
        totalSkipped++;
        continue;
      }

      batch.push({
        province: row.province,
        date: row.date,
        tempMax,
        tempMin,
        tempAvg,
        precipitation,
        humidity,
        source: row.source as 'open-meteo' | 'openweathermap',
        year,
        month,
        day,
      });

      // Process batch when full
      if (batch.length >= BATCH_SIZE) {
        await processBatch(batch);
        totalStored += batch.length;
        totalProcessed += batch.length;
        batch.length = 0; // Clear batch
        
        // Show progress
        if (totalProcessed % 1000 === 0) {
          console.log(`  Processed ${totalProcessed} rows...`);
        }
      }
    } catch (error: any) {
      totalErrors++;
      console.error(`❌ Error processing row ${i + 1}:`, error.message);
    }
  }

  // Process remaining batch
  if (batch.length > 0) {
    await processBatch(batch);
    totalStored += batch.length;
    totalProcessed += batch.length;
  }

  console.log('='.repeat(80));
  console.log(`✅ Daily weather data import completed:`);
  console.log(`   Total processed: ${totalProcessed}`);
  console.log(`   Successfully stored: ${totalStored}`);
  console.log(`   Skipped: ${totalSkipped}`);
  if (totalErrors > 0) {
    console.log(`   Errors: ${totalErrors}`);
  }
  console.log('='.repeat(80));

  // Calculate and store weather statistics (monthly aggregated scores)
  console.log(`\n📊 Calculating weather statistics and scores...`);
  console.log('='.repeat(80));
  await calculateAndStoreWeatherStatistics();
  console.log('='.repeat(80));
}

/**
 * Calculate and store weather statistics (monthly aggregated with scores)
 */
async function calculateAndStoreWeatherStatistics(): Promise<void> {
  try {
    // Get all unique provinces and periods from daily_weather_data
    const query = `
      SELECT DISTINCT 
        province,
        TO_CHAR(date, 'YYYY-MM') as period
      FROM daily_weather_data
      ORDER BY province, period
    `;

    const { pool } = require('../config/database');
    const result = await pool.query(query);

    if (result.rows.length === 0) {
      console.log('⚠️  No weather data found to aggregate');
      return;
    }

    let totalCalculated = 0;
    let totalErrors = 0;

    console.log(`📊 Processing ${result.rows.length} province-period combinations...\n`);

    for (const row of result.rows) {
      try {
        const { province, period } = row;

        // Aggregate daily data to monthly statistics
        const aggregated = await DailyWeatherDataModel.aggregateToMonthlyStatistics(
          province,
          period
        );

        if (!aggregated) {
          console.warn(`⚠️  No data found for ${province} (${period})`);
          continue;
        }

        // Calculate weather score
        const weatherScore = WeatherStatisticsModel.calculateWeatherScore(
          aggregated.avgTemperature,
          aggregated.avgRainfall,
          aggregated.avgHumidity
        );

        // Get days count for this period
        const daysCountQuery = `
          SELECT COUNT(*) as count
          FROM daily_weather_data
          WHERE province = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
        `;
        const daysResult = await pool.query(daysCountQuery, [province, period]);
        const daysCount = parseInt(daysResult.rows[0].count, 10);

        // Store in weather_statistics table
        await WeatherStatisticsModel.upsertWeatherStatistics({
          province,
          period,
          avgTemperature: aggregated.avgTemperature,
          avgRainfall: aggregated.avgRainfall,
          avgHumidity: aggregated.avgHumidity,
          weatherScore,
          daysCount,
        });

        totalCalculated++;
        if (totalCalculated % 50 === 0) {
          console.log(`  Calculated ${totalCalculated} statistics...`);
        }
      } catch (error: any) {
        totalErrors++;
        console.error(`❌ Error calculating statistics for ${row.province} (${row.period}):`, error.message);
      }
    }

    console.log(`\n✅ Weather statistics calculation completed:`);
    console.log(`   Total calculated: ${totalCalculated}`);
    if (totalErrors > 0) {
      console.log(`   Errors: ${totalErrors}`);
    }
  } catch (error: any) {
    console.error(`❌ Error calculating weather statistics:`, error.message);
    throw error;
  }
}

/**
 * Process a batch of records
 */
async function processBatch(
  batch: Array<{
    province: string;
    date: string;
    tempMax: number;
    tempMin: number;
    tempAvg: number;
    precipitation: number;
    humidity: number | null;
    source: 'open-meteo' | 'openweathermap';
    year: number;
    month: number;
    day: number;
  }>
): Promise<void> {
  // Process in parallel for better performance
  await Promise.all(
    batch.map(row =>
      DailyWeatherDataModel.upsertDailyWeatherData(row).catch(error => {
        console.error(`❌ Error storing ${row.province} (${row.date}):`, error.message);
        throw error;
      })
    )
  );
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const csvFile = args.find(arg => arg.startsWith('--csv='))?.split('=')[1] || './data/daily_weather_data.csv';
  const skipExisting = args.includes('--skip-existing');

  console.log('\n' + '='.repeat(80));
  console.log('📥 Daily Weather Data CSV Importer');
  console.log('='.repeat(80));
  console.log(`CSV file: ${csvFile}`);
  console.log(`Skip existing: ${skipExisting ? 'Yes' : 'No (will update)'}`);
  console.log('='.repeat(80));

  try {
    await importCSVToDatabase(csvFile, skipExisting);
    console.log('\n✅ Done!\n');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    const { pool } = require('../config/database');
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { importCSVToDatabase };

