/**
 * Script to fetch daily weather data from Open-Meteo Historical (2020-01-01 to 2026-01-06) 
 * and OpenWeatherMap Forecast (5 days ahead, starting from 2026-01-07)
 * 
 * Features:
 * - Fetches daily data (not monthly averages)
 * - Caches data to avoid duplicates
 * - Unified format for both APIs
 * - Exports to CSV (raw data only, no weather score calculation)
 * 
 * Usage:
 *   npm run fetch:daily-weather
 *   npm run fetch:daily-weather -- --all-provinces
 *   npm run fetch:daily-weather -- --provinces="bangkok,chiang-mai"
 *   npm run fetch:daily-weather -- --start-date=2020-01-01 --end-date=2025-12-31
 *   npm run fetch:daily-weather -- --csv="./data/daily_weather.csv"
 */

import dotenv from 'dotenv';
import path from 'path';
import { format, parseISO, addDays, startOfDay, isBefore, isAfter } from 'date-fns';
import { OpenMeteoService } from '../services/openMeteoService';
import * as fs from 'fs';

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

// All 31 Thai provinces with airports
const ALL_PROVINCES = [
  'bangkok', 'rayong', 'trat', 'prachuap-khiri-khan',
  'chiang-mai', 'chiang-rai', 'lampang', 'mae-hong-son', 'nan', 'phrae',
  'phitsanulok', 'sukhothai', 'tak',
  'udon-thani', 'khon-kaen', 'ubon-ratchathani', 'nakhon-phanom',
  'sakon-nakhon', 'roi-et', 'loei', 'buri-ram', 'nakhon-ratchasima',
  'phuket', 'songkhla', 'krabi', 'surat-thani', 'hat-yai',
  'pattani', 'yala', 'narathiwat',
];

interface DailyWeatherData {
  province: string;
  date: string; // YYYY-MM-DD
  tempMax: number;
  tempMin: number;
  tempAvg: number;
  precipitation: number;
  humidity: number | null;
  source: 'open-meteo' | 'openweathermap';
  year: string;
  month: string;
  day: string;
}

interface OpenWeatherMapForecastResponse {
  cod: string;
  message: number;
  cnt: number;
  list: Array<{
    dt: number;
    main: {
      temp: number;
      feels_like: number;
      temp_min: number;
      temp_max: number;
      pressure: number;
      humidity: number;
    };
    weather: Array<{
      main: string;
      description: string;
      icon: string;
    }>;
    clouds: {
      all: number;
    };
    wind: {
      speed: number;
      deg: number;
    };
    rain?: {
      '3h'?: number;
    };
    dt_txt: string;
  }>;
  city: {
    id: number;
    name: string;
    coord: { lat: number; lon: number };
    country: string;
    timezone: number;
  };
}

/**
 * Get province coordinates (reuse from OpenMeteoService)
 */
function getProvinceCoordinates(province: string): { lat: number; lon: number } | null {
  const PROVINCE_COORDINATES: Record<string, { lat: number; lon: number }> = {
    'bangkok': { lat: 13.7563, lon: 100.5018 },
    'rayong': { lat: 12.6814, lon: 101.2817 },
    'trat': { lat: 12.2417, lon: 102.5153 },
    'prachuap-khiri-khan': { lat: 11.8200, lon: 99.7847 },
    'chiang-mai': { lat: 18.7883, lon: 98.9853 },
    'chiang-rai': { lat: 19.9083, lon: 99.8325 },
    'lampang': { lat: 18.2923, lon: 99.4928 },
    'mae-hong-son': { lat: 19.3017, lon: 97.9689 },
    'nan': { lat: 18.7833, lon: 100.7833 },
    'phrae': { lat: 18.1450, lon: 100.1411 },
    'phitsanulok': { lat: 16.8150, lon: 100.2633 },
    'sukhothai': { lat: 17.0125, lon: 99.8233 },
    'tak': { lat: 16.8833, lon: 99.1289 },
    'udon-thani': { lat: 17.4075, lon: 102.7931 },
    'khon-kaen': { lat: 16.4328, lon: 102.8356 },
    'ubon-ratchathani': { lat: 15.2281, lon: 104.8564 },
    'nakhon-phanom': { lat: 17.4108, lon: 104.7786 },
    'sakon-nakhon': { lat: 17.1561, lon: 104.1547 },
    'roi-et': { lat: 16.0531, lon: 103.6531 },
    'loei': { lat: 17.4861, lon: 101.7228 },
    'buri-ram': { lat: 14.9944, lon: 103.1033 },
    'nakhon-ratchasima': { lat: 14.9700, lon: 102.1019 },
    'phuket': { lat: 7.8804, lon: 98.3923 },
    'songkhla': { lat: 7.2050, lon: 100.5953 },
    'krabi': { lat: 8.0863, lon: 98.9063 },
    'surat-thani': { lat: 9.1386, lon: 99.3336 },
    'hat-yai': { lat: 7.0084, lon: 100.4767 },
    'pattani': { lat: 6.8684, lon: 101.2507 },
    'yala': { lat: 6.5414, lon: 101.2814 },
    'narathiwat': { lat: 6.4255, lon: 101.8236 },
  };

  const normalizedProvince = province.toLowerCase().replace(/\s+/g, '-');
  return PROVINCE_COORDINATES[normalizedProvince] || null;
}

// Weather score calculation removed - will be calculated when data is used

/**
 * Fetch forecast data from OpenWeatherMap
 */
async function fetchOpenWeatherMapForecast(
  province: string,
  _days: number = 5, // OpenWeatherMap free API provides 5 days forecast
  minDate?: Date // Minimum date to include (default: 2026-01-07, to avoid overlap with Open-Meteo)
): Promise<DailyWeatherData[]> {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY || process.env.NEXT_PUBLIC_OPENWEATHERMAP_API_KEY;
  
  if (!apiKey || apiKey === 'your_api_key_here') {
    console.warn(`⚠️  OpenWeatherMap API key not configured, skipping forecast for ${province}`);
    return [];
  }

  const coords = getProvinceCoordinates(province);
  if (!coords) {
    console.warn(`⚠️  No coordinates found for ${province}`);
    return [];
  }

  try {
    const baseUrl = 'https://api.openweathermap.org/data/2.5';
    // Note: OpenWeatherMap free API only provides 5 days (40 forecasts)
    // We'll fetch what's available and filter to day 7 onwards
    const url = `${baseUrl}/forecast?lat=${coords.lat}&lon=${coords.lon}&appid=${apiKey}&units=metric&lang=th&cnt=40`;

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error(`❌ OpenWeatherMap API error for ${province}:`, response.status, errorData);
      return [];
    }

    const data = await response.json() as OpenWeatherMapForecastResponse;
    
    // Group forecasts by date
    const dailyData: Map<string, {
      tempMax: number[];
      tempMin: number[];
      precipitation: number[];
      humidity: number[];
    }> = new Map();

    data.list.forEach(item => {
      const date = new Date(item.dt * 1000);
      const dateKey = format(date, 'yyyy-MM-dd');
      
      if (!dailyData.has(dateKey)) {
        dailyData.set(dateKey, {
          tempMax: [],
          tempMin: [],
          precipitation: [],
          humidity: [],
        });
      }

      const dayData = dailyData.get(dateKey)!;
      dayData.tempMax.push(item.main.temp_max);
      dayData.tempMin.push(item.main.temp_min);
      dayData.precipitation.push(item.rain?.['3h'] || 0);
      dayData.humidity.push(item.main.humidity);
    });

    // Convert to DailyWeatherData format
    const result: DailyWeatherData[] = [];
    const today = startOfDay(new Date());
    // Default: start from 2026-01-07 to avoid overlap with Open-Meteo (which covers up to 2026-01-06)
    const minDateToInclude = minDate || parseISO('2026-01-07');
    
    for (const [dateKey, dayData] of dailyData.entries()) {
      const date = parseISO(dateKey);
      
      // Only include dates after 2026-01-06 (to avoid overlap with Open-Meteo)
      // and only future dates (forecast)
      if (isBefore(date, minDateToInclude) || isBefore(date, today)) continue;

      const tempMax = Math.max(...dayData.tempMax);
      const tempMin = Math.min(...dayData.tempMin);
      const tempAvg = (tempMax + tempMin) / 2;
      const precipitation = dayData.precipitation.reduce((a, b) => a + b, 0);
      const humidity = dayData.humidity.length > 0
        ? dayData.humidity.reduce((a, b) => a + b, 0) / dayData.humidity.length
        : null;

      const [year, month, day] = dateKey.split('-');

      result.push({
        province,
        date: dateKey,
        tempMax: Math.round(tempMax * 100) / 100,
        tempMin: Math.round(tempMin * 100) / 100,
        tempAvg: Math.round(tempAvg * 100) / 100,
        precipitation: Math.round(precipitation * 100) / 100,
        humidity: humidity !== null ? Math.round(humidity * 100) / 100 : null,
        source: 'openweathermap',
        year,
        month,
        day,
      });
    }

    return result;
  } catch (error: any) {
    console.error(`❌ Error fetching OpenWeatherMap forecast for ${province}:`, error.message);
    return [];
  }
}

/**
 * Read existing CSV and return Set of existing keys (province-date)
 */
function getExistingDataKeys(csvFilePath: string): Set<string> {
  const existingKeys = new Set<string>();
  
  if (!fs.existsSync(csvFilePath)) {
    return existingKeys;
  }

  try {
    const content = fs.readFileSync(csvFilePath, 'utf-8');
    const lines = content.split('\n').filter(line => line.trim());
    
    if (lines.length <= 1) return existingKeys; // Only header or empty

    // Skip header
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length >= 2) {
        const province = values[0].replace(/^"|"$/g, '');
        const date = values[1].replace(/^"|"$/g, '');
        existingKeys.add(`${province}-${date}`);
      }
    }
  } catch (error) {
    console.warn(`⚠️  Error reading existing CSV: ${error}`);
  }

  return existingKeys;
}

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
 * Convert daily weather data to CSV
 */
function dailyWeatherToCSV(data: DailyWeatherData[]): string {
  const headers = [
    'province', 'date', 'tempMax', 'tempMin', 'tempAvg', 
    'precipitation', 'humidity', 'source', 
    'year', 'month', 'day'
  ];

  const csvRows = [
    headers.join(','),
    ...data.map(row => [
      `"${row.province}"`,
      `"${row.date}"`,
      row.tempMax.toFixed(2),
      row.tempMin.toFixed(2),
      row.tempAvg.toFixed(2),
      row.precipitation.toFixed(2),
      row.humidity !== null ? row.humidity.toFixed(2) : '',
      `"${row.source}"`,
      row.year,
      row.month,
      row.day,
    ].join(','))
  ];

  return csvRows.join('\n');
}

/**
 * Append data to CSV file
 */
function appendToCSV(csvFilePath: string, data: DailyWeatherData[]): void {
  if (data.length === 0) return;

  const csvContent = dailyWeatherToCSV(data);
  
  if (fs.existsSync(csvFilePath)) {
    // Append without header
    const lines = csvContent.split('\n');
    const dataLines = lines.slice(1).filter(line => line.trim());
    fs.appendFileSync(csvFilePath, '\n' + dataLines.join('\n'), 'utf-8');
  } else {
    // Create new file with header
    fs.writeFileSync(csvFilePath, csvContent, 'utf-8');
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const allProvinces = args.includes('--all-provinces');
  const provincesArg = args.find(arg => arg.startsWith('--provinces='))?.split('=')[1];
  const startDateArg = args.find(arg => arg.startsWith('--start-date='))?.split('=')[1];
  const endDateArg = args.find(arg => arg.startsWith('--end-date='))?.split('=')[1];
  const csvFile = args.find(arg => arg.startsWith('--csv='))?.split('=')[1];
  const outputDir = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || './data';

  console.log('\n' + '='.repeat(80));
  console.log('🌤️  Daily Weather Data Fetcher');
  console.log('='.repeat(80));

  try {
    // Determine CSV file path
    const csvFilePath = csvFile || path.join(outputDir, 'daily_weather_data.csv');
    
    // Create output directory if needed
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${outputDir}`);
    }

    // Get existing data keys to avoid duplicates
    const existingKeys = getExistingDataKeys(csvFilePath);
    console.log(`📋 Found ${existingKeys.size} existing records in CSV`);

    // Determine provinces
    let provinces: string[];
    if (allProvinces) {
      provinces = ALL_PROVINCES;
      console.log(`📍 Processing all ${provinces.length} provinces`);
    } else if (provincesArg) {
      provinces = provincesArg.split(',').map(p => p.trim());
      console.log(`📍 Processing ${provinces.length} provinces: ${provinces.join(', ')}`);
    } else {
      provinces = ['bangkok', 'chiang-mai', 'phuket', 'krabi'];
      console.log(`📍 Processing ${provinces.length} default provinces`);
      console.log('💡 Tip: Use --all-provinces to process all provinces');
    }

    // Determine date range
    const today = startOfDay(new Date());
    const startDate = startDateArg ? parseISO(startDateArg) : parseISO('2020-01-01');
    const endDate = endDateArg ? parseISO(endDateArg) : addDays(today, 5); // Default: today + 5 days

    console.log(`📅 Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
    console.log(`💾 Output file: ${csvFilePath}`);
    console.log('='.repeat(80) + '\n');

    const openMeteoService = new OpenMeteoService();
    const allData: DailyWeatherData[] = [];
    let totalFetched = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    // Split date range: historical (Open-Meteo) and future (OpenWeatherMap)
    // Open-Meteo: fetch up to 2026-01-06
    const historicalEndDate = parseISO('2026-01-06');

    for (const province of provinces) {
      console.log(`📍 Processing ${province}...`);

      // 1. Fetch historical data from Open-Meteo (2020-01-01 to 2026-01-06)
      if (isBefore(startDate, parseISO('2026-01-07')) && (isBefore(startDate, historicalEndDate) || format(startDate, 'yyyy-MM-dd') <= '2026-01-06')) {
        console.log(`  📊 Fetching historical data from Open-Meteo...`);
        
        // Fetch in monthly chunks to avoid API limits
        let currentDate = startDate;
        while (isBefore(currentDate, historicalEndDate) || format(currentDate, 'yyyy-MM-dd') <= '2026-01-06') {
          const monthEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
          let chunkEnd = isBefore(monthEnd, historicalEndDate) ? monthEnd : historicalEndDate;
          
          // Ensure we don't go beyond 2026-01-06
          if (isAfter(chunkEnd, historicalEndDate)) {
            chunkEnd = historicalEndDate;
          }
          
          try {
            const weatherData = await openMeteoService.getHistoricalWeather(
              province,
              currentDate,
              chunkEnd
            );

            for (const wd of weatherData) {
              const key = `${province}-${wd.date}`;
              
              // Skip if date is after 2026-01-06
              if (isAfter(parseISO(wd.date), historicalEndDate)) {
                continue;
              }
              
              if (existingKeys.has(key)) {
                totalSkipped++;
                continue;
              }

              const [year, month, day] = wd.date.split('-');
              allData.push({
                province,
                date: wd.date,
                tempMax: wd.tempMax,
                tempMin: wd.tempMin,
                tempAvg: wd.tempAvg,
                precipitation: wd.precipitation,
                humidity: wd.humidity || null,
                source: 'open-meteo',
                year,
                month,
                day,
              });

              existingKeys.add(key);
              totalFetched++;
            }

            // Rate limiting
            await new Promise(resolve => setTimeout(resolve, 200));
          } catch (error: any) {
            totalErrors++;
            console.error(`  ❌ Error fetching historical data for ${format(currentDate, 'yyyy-MM-dd')}:`, error.message);
          }

          currentDate = addDays(chunkEnd, 1);
          
          // Stop if we've reached 2026-01-06
          if (isAfter(currentDate, historicalEndDate)) {
            break;
          }
        }
      }

      // 2. Fetch forecast data from OpenWeatherMap (5 days ahead)
      // OpenWeatherMap provides 5 days forecast, but we only keep dates after 2026-01-06
      // (since Open-Meteo covers up to 2026-01-06)
      const meteoEndDate = parseISO('2026-01-06');
      const forecastMinDate = addDays(meteoEndDate, 1); // Start from 2026-01-07
      if (isAfter(endDate, today) || isAfter(endDate, meteoEndDate)) {
        console.log(`  🔮 Fetching forecast data from OpenWeatherMap (5 days ahead)...`);
        
        try {
          const forecastData = await fetchOpenWeatherMapForecast(province, 5, forecastMinDate);
          
          for (const fd of forecastData) {
            const key = `${province}-${fd.date}`;
            
            if (existingKeys.has(key)) {
              totalSkipped++;
              continue;
            }

            // Only include if after 2026-01-06 and within date range
            const fdDate = parseISO(fd.date);
            if (isBefore(fdDate, forecastMinDate) || isAfter(fdDate, endDate)) {
              continue;
            }

            allData.push(fd);
            existingKeys.add(key);
            totalFetched++;
          }

          // Rate limiting
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error: any) {
          totalErrors++;
          console.error(`  ❌ Error fetching forecast data:`, error.message);
        }
      }

      console.log(`  ✅ ${province}: Fetched ${totalFetched} new records, skipped ${totalSkipped} duplicates\n`);
    }

    // Save to CSV
    if (allData.length > 0) {
      console.log(`💾 Saving ${allData.length} new records to CSV...`);
      appendToCSV(csvFilePath, allData);
      console.log(`✅ Saved to: ${csvFilePath}`);
    } else {
      console.log(`ℹ️  No new data to save (all data already exists)`);
    }

    // Summary
    console.log('\n📊 Summary:');
    console.log('='.repeat(80));
    console.log(`  Provinces processed: ${provinces.length}`);
    console.log(`  Date range: ${format(startDate, 'yyyy-MM-dd')} to ${format(endDate, 'yyyy-MM-dd')}`);
    console.log(`  New records fetched: ${totalFetched}`);
    console.log(`  Duplicates skipped: ${totalSkipped}`);
    if (totalErrors > 0) {
      console.log(`  Errors: ${totalErrors}`);
    }
    console.log(`  Total records in CSV: ${existingKeys.size + totalFetched}`);
    console.log('='.repeat(80));
    console.log('\n✅ Done!\n');

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { dailyWeatherToCSV, getExistingDataKeys };

