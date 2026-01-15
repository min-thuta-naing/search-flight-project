/**
 * Script to import Thai holidays from CSV to database
 * 
 * Usage:
 *   tsx src/scripts/import-holidays-from-csv.ts
 *   tsx src/scripts/import-holidays-from-csv.ts -- --csv="./data/thai_holidays_2024_2026_20251229_163536.csv"
 */

import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { HolidayStatisticsModel } from '../models/HolidayStatistics';
import { IAppHolidayService } from '../services/iappHolidayService';

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

interface HolidayCSVRow {
  date: string;
  name: string;
  nameEn: string;
  type: string;
  isPublicHoliday: string;
  year: string;
  month: string;
  period: string;
}

/**
 * Parse a single CSV line, handling quoted fields with commas
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
        // Escaped quote ("")
        current += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  // Add last field
  values.push(current.trim());

  return values.map(v => v.replace(/^"|"$/g, ''));
}

/**
 * Read CSV and parse holidays
 */
function parseCSV(csvContent: string): HolidayCSVRow[] {
  const lines = csvContent.split('\n').filter(line => line.trim());
  if (lines.length === 0) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: HolidayCSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    
    const values = parseCSVLine(lines[i]);
    const row: any = {};
    
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    
    rows.push(row as HolidayCSVRow);
  }

  return rows;
}

/**
 * Import holidays from CSV to database
 */
async function importCSVToDatabase(csvFilePath: string): Promise<void> {
  console.log(`\n📥 Importing holidays from CSV to database...`);
  console.log('='.repeat(80));

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    process.exit(1);
  }

  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const rows = parseCSV(csvContent);

  if (rows.length === 0) {
    console.error('❌ No holidays found in CSV file');
    process.exit(1);
  }

  // Group by period (YYYY-MM)
  const holidaysByPeriod = new Map<string, Array<{
    date: string;
    name: string;
    nameEn: string;
    type: 'national' | 'regional' | 'observance';
    isPublicHoliday: boolean;
  }>>();

  rows.forEach(row => {
    if (!row.date || !row.period) {
      console.warn(`⚠️  Skipping row with missing date or period`);
      return;
    }

    if (!holidaysByPeriod.has(row.period)) {
      holidaysByPeriod.set(row.period, []);
    }

    holidaysByPeriod.get(row.period)!.push({
      date: row.date,
      name: row.name,
      nameEn: row.nameEn,
      type: row.type as 'national' | 'regional' | 'observance',
      isPublicHoliday: row.isPublicHoliday === 'true' || row.isPublicHoliday === 'TRUE',
    });
  });

  const holidayService = new IAppHolidayService();
  let totalStored = 0;
  let totalErrors = 0;

  console.log(`📊 Processing ${rows.length} holidays across ${holidaysByPeriod.size} periods...\n`);

  for (const [period, monthHolidays] of holidaysByPeriod) {
    try {
      // Calculate statistics
      const longWeekends = monthHolidays.filter(holiday => {
        const holidayDate = new Date(holiday.date);
        return holidayService.isLongWeekend(holidayDate);
      }).length;

      const holidayScore = holidayService.calculateHolidayBoost(monthHolidays);

      // Store in database
      await HolidayStatisticsModel.upsertHolidayStatistics({
        period,
        holidaysCount: monthHolidays.length,
        longWeekendsCount: longWeekends,
        holidayScore,
        holidaysDetail: monthHolidays,
      });

      totalStored++;
      console.log(`✅ Stored ${monthHolidays.length} holidays for ${period} (${longWeekends} long weekends, score: ${holidayScore})`);
    } catch (error: any) {
      totalErrors++;
      console.error(`❌ Error storing holidays for ${period}:`, error.message);
    }
  }

  console.log('='.repeat(80));
  console.log(`✅ Import completed:`);
  console.log(`   Total periods: ${holidaysByPeriod.size}`);
  console.log(`   Successfully stored: ${totalStored}`);
  if (totalErrors > 0) {
    console.log(`   Errors: ${totalErrors}`);
  }
  console.log('='.repeat(80));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const csvFile = args.find(arg => arg.startsWith('--csv='))?.split('=')[1] 
    || './data/thai_holidays_2024_2026_20251229_163536.csv';

  console.log('\n' + '='.repeat(80));
  console.log('📅 Thai Holidays CSV Importer');
  console.log('='.repeat(80));
  console.log(`CSV file: ${csvFile}`);
  console.log('='.repeat(80));

  try {
    await importCSVToDatabase(csvFile);
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
