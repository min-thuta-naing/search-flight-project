/**
 * Script to fetch Thai holidays from iApp API and save to CSV
 * Fetches holidays for multiple years (2024, 2025, 2026) and saves as backup CSV
 * Then optionally imports to database
 * 
 * Usage:
 *   npm run fetch:holidays
 *   npm run fetch:holidays -- --import
 *   npm run fetch:holidays -- --start-year=2024 --end-year=2026
 *   npm run fetch:holidays -- --import --csv="./data/thai_holidays_2024_2026.csv"
 */

import dotenv from 'dotenv';
import path from 'path';
import { IAppHolidayService } from '../services/iappHolidayService';
import { HolidayStatisticsModel } from '../models/HolidayStatistics';
import { format, parseISO } from 'date-fns';
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
 * Convert holidays array to CSV format
 */
function holidaysToCSV(holidays: Array<{
  date: string;
  name: string;
  nameEn: string;
  type: string;
  isPublicHoliday: boolean;
}>): string {
  const rows: HolidayCSVRow[] = holidays.map(holiday => {
    const holidayDate = parseISO(holiday.date);
    const year = holidayDate.getFullYear();
    const month = String(holidayDate.getMonth() + 1).padStart(2, '0');
    const period = format(holidayDate, 'yyyy-MM');

    return {
      date: holiday.date,
      name: holiday.name,
      nameEn: holiday.nameEn,
      type: holiday.type,
      isPublicHoliday: holiday.isPublicHoliday ? 'true' : 'false',
      year: String(year),
      month,
      period,
    };
  });

  // CSV Header
  const headers = ['date', 'name', 'nameEn', 'type', 'isPublicHoliday', 'year', 'month', 'period'];
  
  // CSV Rows
  const csvRows = [
    headers.join(','),
    ...rows.map(row => [
      `"${row.date}"`,
      `"${row.name.replace(/"/g, '""')}"`, // Escape quotes in CSV
      `"${row.nameEn.replace(/"/g, '""')}"`,
      `"${row.type}"`,
      row.isPublicHoliday,
      row.year,
      row.month,
      `"${row.period}"`,
    ].join(','))
  ];

  return csvRows.join('\n');
}

/**
 * Read CSV and parse holidays
 * Handles quoted fields with commas correctly
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
 * Import holidays from CSV to database
 */
async function importCSVToDatabase(csvFilePath: string): Promise<void> {
  console.log(`\n📥 Importing holidays from CSV to database...`);
  console.log('='.repeat(60));

  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const rows = parseCSV(csvContent);

  // Group by period (YYYY-MM)
  const holidaysByPeriod = new Map<string, Array<{
    date: string;
    name: string;
    nameEn: string;
    type: 'national' | 'regional' | 'observance';
    isPublicHoliday: boolean;
  }>>();

  rows.forEach(row => {
    if (!holidaysByPeriod.has(row.period)) {
      holidaysByPeriod.set(row.period, []);
    }

    holidaysByPeriod.get(row.period)!.push({
      date: row.date,
      name: row.name,
      nameEn: row.nameEn,
      type: row.type as 'national' | 'regional' | 'observance',
      isPublicHoliday: row.isPublicHoliday === 'true',
    });
  });

  const holidayService = new IAppHolidayService();
  let totalStored = 0;

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
      console.log(`✅ Stored ${monthHolidays.length} holidays for ${period}`);
    } catch (error: any) {
      console.error(`❌ Error storing holidays for ${period}:`, error.message);
    }
  }

  console.log('='.repeat(60));
  console.log(`✅ Import completed: ${totalStored} periods stored`);
  console.log('='.repeat(60));
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const importToDb = args.includes('--import') || args.includes('-i');
  const csvFile = args.find(arg => arg.startsWith('--csv='))?.split('=')[1];
  const startYear = parseInt(args.find(arg => arg.startsWith('--start-year='))?.split('=')[1] || '2024');
  const endYear = parseInt(args.find(arg => arg.startsWith('--end-year='))?.split('=')[1] || '2026');
  const outputDir = args.find(arg => arg.startsWith('--output='))?.split('=')[1] || './data';

  console.log('\n' + '='.repeat(60));
  console.log('📅 Thai Holidays Fetcher');
  console.log('='.repeat(60));
  console.log(`Years: ${startYear} - ${endYear}`);
  console.log(`Output directory: ${outputDir}`);
  console.log(`Import to database: ${importToDb ? 'Yes' : 'No'}`);
  console.log('='.repeat(60) + '\n');

  try {
    // If CSV file is provided, import from CSV only
    if (csvFile) {
      if (!fs.existsSync(csvFile)) {
        console.error(`❌ CSV file not found: ${csvFile}`);
        process.exit(1);
      }
      await importCSVToDatabase(csvFile);
      return;
    }

    const holidayService = new IAppHolidayService();

    if (!holidayService.isAvailable()) {
      console.error('❌ iApp API key is not configured!');
      console.error('Please set IAPP_API_KEY in your .env file');
      process.exit(1);
    }

    // Fetch holidays for date range: Jan 1, startYear to Dec 31, endYear
    // Use year-by-year method to ensure we get all holidays for each year
    const startDate = `${startYear}-01-01`;
    const endDate = `${endYear}-12-31`;
    console.log(`📡 Fetching holidays from ${startDate} to ${endDate}...`);
    console.log(`📅 Fetching year by year to ensure completeness...`);
    
    const allHolidays: Array<{
      date: string;
      name: string;
      nameEn: string;
      type: 'national' | 'regional' | 'observance';
      isPublicHoliday: boolean;
    }> = [];
    
    // Fetch year by year to ensure we get all holidays
    for (let year = startYear; year <= endYear; year++) {
      console.log(`  📅 Fetching ${year}...`);
      try {
        const yearHolidays = await holidayService.getHolidaysForYear(year);
        allHolidays.push(...yearHolidays);
        console.log(`  ✅ Got ${yearHolidays.length} holidays for ${year}`);
        
        // Rate limiting between years
        if (year < endYear) {
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (error: any) {
        console.error(`  ❌ Error fetching ${year}:`, error.message);
      }
    }
    
    // Remove duplicates (same date)
    const uniqueHolidays = Array.from(
      new Map(allHolidays.map(h => [h.date, h])).values()
    );
    
    // Sort by date
    const holidays = uniqueHolidays.sort((a, b) => a.date.localeCompare(b.date));

    if (holidays.length === 0) {
      console.error('❌ No holidays fetched. Please check your API key and network connection.');
      process.exit(1);
    }

    console.log(`✅ Fetched ${holidays.length} holidays`);

    // Create output directory if it doesn't exist
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${outputDir}`);
    }

    // Generate CSV filename
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const csvFilename = `thai_holidays_${startYear}_${endYear}_${timestamp}.csv`;
    const csvFilePath = path.join(outputDir, csvFilename);

    // Convert to CSV and save
    console.log(`\n💾 Saving to CSV file...`);
    const csvContent = holidaysToCSV(holidays);
    fs.writeFileSync(csvFilePath, csvContent, 'utf-8');
    console.log(`✅ Saved to: ${csvFilePath}`);

    // Show summary
    console.log('\n📊 Summary:');
    console.log('='.repeat(60));
    console.log(`  Date Range: ${startDate} to ${endDate}`);
    
    const holidaysByYear = new Map<number, number>();
    holidays.forEach(holiday => {
      const year = parseISO(holiday.date).getFullYear();
      holidaysByYear.set(year, (holidaysByYear.get(year) || 0) + 1);
    });

    // Sort years for display
    const sortedYears = Array.from(holidaysByYear.keys()).sort();
    sortedYears.forEach(year => {
      console.log(`  ${year}: ${holidaysByYear.get(year)} holidays`);
    });
    console.log(`  Total: ${holidays.length} holidays`);
    console.log('='.repeat(60));

    // Import to database if requested
    if (importToDb) {
      await importCSVToDatabase(csvFilePath);
    } else {
      console.log('\n💡 Tip: To import to database, run:');
      console.log(`   npm run fetch:holidays -- --import`);
      console.log(`   or`);
      console.log(`   npm run fetch:holidays -- --import --csv="${csvFilePath}"`);
    }

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

export { holidaysToCSV, parseCSV, importCSVToDatabase };

