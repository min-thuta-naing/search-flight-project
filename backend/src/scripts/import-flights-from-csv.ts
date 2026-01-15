/**
 * Script to import flight data from CSV files to database
 * 
 * Usage:
 *   npm run import:flights
 *   npm run import:flights -- --dir="./data/flight_data"
 *   npm run import:flights -- --file="./data/flight_data/bkk_dmk_BFV_30days_20260113.csv"
 */

import dotenv from 'dotenv';
import path from 'path';
import * as fs from 'fs';
import { FlightModel } from '../models/Flight';
import { pool } from '../config/database';

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
 * Parse CSV line (handles quoted values)
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
 * Extract airline code from flight number (e.g., "FD 4511" -> "FD")
 */
function extractAirlineCode(flightNumber: string): string {
  if (!flightNumber) return '';
  const match = flightNumber.match(/^([A-Z0-9]{2})/);
  return match ? match[1] : '';
}

/**
 * Normalize trip type (e.g., "One way" -> "one-way")
 */
function normalizeTripType(tripType: string): 'one-way' | 'round-trip' {
  const normalized = tripType.toLowerCase().trim();
  if (normalized === 'one way' || normalized === 'one-way') {
    return 'one-way';
  }
  if (normalized === 'round trip' || normalized === 'round-trip') {
    return 'round-trip';
  }
  return 'one-way'; // default
}

/**
 * Normalize travel class (e.g., "Economy" -> "economy")
 */
function normalizeTravelClass(travelClass: string): string {
  if (!travelClass) return 'economy';
  return travelClass.toLowerCase().trim();
}

/**
 * Parse boolean from string (handles "True", "False", "true", "false")
 */
function parseBoolean(value: string): boolean {
  if (!value) return false;
  const normalized = value.toLowerCase().trim();
  return normalized === 'true' || normalized === '1' || normalized === 'yes';
}

/**
 * Map Thai airline names to English names
 */
function getAirlineName(airlineThai: string, airlineCode: string): { name: string; nameTh: string } {
  const airlineMap: Record<string, { name: string; nameTh: string }> = {
    'FD': { name: 'Thai AirAsia', nameTh: 'แอร์เอเชีย' },
    'TG': { name: 'Thai Airways', nameTh: 'การบินไทย' },
    'SL': { name: 'Thai Lion Air', nameTh: 'ไทยไลอ้อนแอร์' },
    'VZ': { name: 'Thai Vietjet Air', nameTh: 'ไทยเวียดเจ็ทแอร์' },
    'PG': { name: 'Bangkok Airways', nameTh: 'บางกอกแอร์เวย์' },
    'DD': { name: 'Nok Air', nameTh: 'นกแอร์' },
    'W1': { name: 'Wings Air', nameTh: 'วิงส์แอร์' },
  };

  if (airlineMap[airlineCode]) {
    return airlineMap[airlineCode];
  }

  // Fallback: use Thai name and try to translate
  return {
    name: airlineThai || airlineCode,
    nameTh: airlineThai || airlineCode,
  };
}

/**
 * Import flight data from a single CSV file
 */
async function importCSVFile(csvFilePath: string): Promise<{
  processed: number;
  stored: number;
  skipped: number;
  errors: number;
}> {
  console.log(`\n📄 Processing: ${path.basename(csvFilePath)}`);

  if (!fs.existsSync(csvFilePath)) {
    console.error(`❌ CSV file not found: ${csvFilePath}`);
    return { processed: 0, stored: 0, skipped: 0, errors: 1 };
  }

  const csvContent = fs.readFileSync(csvFilePath, 'utf-8');
  const lines = csvContent.split('\n').filter(line => line.trim());

  if (lines.length <= 1) {
    console.warn(`⚠️  CSV file is empty or has no data rows`);
    return { processed: 0, stored: 0, skipped: 0, errors: 0 };
  }

  // Parse header
  const headers = parseCSVLine(lines[0]);
  const expectedHeaders = [
    'search_date', 'route', 'departure_id', 'arrival_id', 'trip_type',
    'airline', 'flight_number', 'airplane', 'travel_class',
    'departure_time', 'arrival_time', 'total_duration', 'stops',
    'price', 'carbon_emissions', 'legroom', 'often_delayed',
    'lowest_price', 'price_level'
  ];

  // Validate headers
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    console.error(`❌ Missing required headers: ${missingHeaders.join(', ')}`);
    console.error(`   Found headers: ${headers.join(', ')}`);
    return { processed: 0, stored: 0, skipped: 0, errors: 1 };
  }

  let totalProcessed = 0;
  let totalStored = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  // Cache for routes and airlines to avoid repeated queries
  const routeCache = new Map<string, { id: number; origin: string; destination: string }>();
  const airlineCache = new Map<string, { id: number; code: string }>();

  /**
   * Deduplicate batch by unique constraint key
   * Unique constraint: (route_id, airline_id, departure_date, trip_type, flight_number, departure_time)
   */
  function deduplicateBatch(
    batch: Array<{
      route_id: number;
      airline_id: number;
      departure_date: Date;
      return_date?: Date | null;
      price?: number | null;
      base_price?: number | null;
      departure_time: Date | string;
      arrival_time: Date | string;
      duration: number;
      flight_number: string;
      trip_type: 'one-way' | 'round-trip';
      season?: 'high' | 'normal' | 'low' | null;
      travel_class?: string;
      search_date?: Date | null;
      airplane?: string | null;
      stops?: number;
      carbon_emissions?: number | null;
      legroom?: string | null;
      often_delayed?: boolean;
      lowest_price?: number | null;
      price_level?: string | null;
    }>
  ): typeof batch {
    const uniqueMap = new Map<string, typeof batch[0]>();
    
    for (const record of batch) {
      // Normalize departure_time to ISO string
      let departureTimeStr: string;
      if (typeof record.departure_time === 'string') {
        departureTimeStr = record.departure_time;
      } else if (record.departure_time instanceof Date) {
        departureTimeStr = record.departure_time.toISOString();
      } else {
        departureTimeStr = String(record.departure_time);
      }
      
      // Normalize departure_date to YYYY-MM-DD format
      let departureDateStr: string;
      if (record.departure_date instanceof Date) {
        departureDateStr = record.departure_date.toISOString().split('T')[0];
      } else {
        const date = new Date(record.departure_date);
        departureDateStr = date.toISOString().split('T')[0];
      }
      
      // Create unique key from constraint fields
      // Format: route_id_airline_id_YYYY-MM-DD_trip_type_flight_number_ISO_timestamp
      const uniqueKey = `${record.route_id}_${record.airline_id}_${departureDateStr}_${record.trip_type}_${record.flight_number}_${departureTimeStr}`;
      
      // Keep the last occurrence (newer data overwrites older)
      uniqueMap.set(uniqueKey, record);
    }
    
    return Array.from(uniqueMap.values());
  }

  // Process rows in batches
  const BATCH_SIZE = 500;
  const batch: Array<{
    route_id: number;
    airline_id: number;
    departure_date: Date;
    return_date?: Date | null;
    price?: number | null;
    base_price?: number | null;
    departure_time: Date | string;
    arrival_time: Date | string;
    duration: number;
    flight_number: string;
    trip_type: 'one-way' | 'round-trip';
    season?: 'high' | 'normal' | 'low' | null;
    travel_class?: string;
    search_date?: Date | null;
    airplane?: string | null;
    stops?: number;
    carbon_emissions?: number | null;
    legroom?: string | null;
    often_delayed?: boolean;
    lowest_price?: number | null;
    price_level?: string | null;
  }> = [];

  console.log(`   📊 Processing ${lines.length - 1} rows...`);

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
      if (!row.departure_id || !row.arrival_id || !row.flight_number || !row.departure_time) {
        totalSkipped++;
        continue;
      }

      // Extract origin and destination
      const origin = row.departure_id.trim().toUpperCase();
      const destination = row.arrival_id.trim().toUpperCase();

      // Get or create route
      const routeKey = `${origin}-${destination}`;
      let route = routeCache.get(routeKey);

      if (!route) {
        // Calculate base price and avg duration from data (or use defaults)
        const basePrice = parseFloat(row.price) || 0;
        const avgDuration = parseInt(row.total_duration, 10) || 0;

        const routeData = await FlightModel.getOrCreateRoute(
          origin,
          destination,
          basePrice,
          avgDuration
        );
        route = {
          id: routeData.id,
          origin: routeData.origin,
          destination: routeData.destination,
        };
        routeCache.set(routeKey, route);
      }

      // Extract airline code from flight number
      const airlineCode = extractAirlineCode(row.flight_number);
      if (!airlineCode) {
        totalSkipped++;
        continue;
      }

      // Get or create airline
      let airline = airlineCache.get(airlineCode);
      if (!airline) {
        const airlineInfo = getAirlineName(row.airline || '', airlineCode);
        const airlineData = await FlightModel.getOrCreateAirline(
          airlineCode,
          airlineInfo.name,
          airlineInfo.nameTh
        );
        airline = {
          id: airlineData.id,
          code: airlineData.code,
        };
        airlineCache.set(airlineCode, airline);
      }

      // Parse dates and times
      const departureTime = new Date(row.departure_time);
      const arrivalTime = new Date(row.arrival_time);
      const departureDate = new Date(departureTime);
      departureDate.setHours(0, 0, 0, 0);

      const searchDate = row.search_date ? new Date(row.search_date) : null;
      if (searchDate) {
        searchDate.setHours(0, 0, 0, 0);
      }

      // Parse numeric values
      const rawPrice = row.price ? parseFloat(row.price) : null;
      const rawLowestPrice = row.lowest_price ? parseFloat(row.lowest_price) : null;
      
      // Handle price = 0: use lowest_price or skip if both are 0/invalid
      let price: number | null = null;
      let basePrice: number | null = null;
      let priceWasZero = false;
      
      if (rawPrice && rawPrice > 0) {
        price = rawPrice;
      } else if (rawLowestPrice && rawLowestPrice > 0) {
        // If price is 0 or invalid, use lowest_price as price
        price = rawLowestPrice;
        priceWasZero = true;
      } else {
        // Both price and lowest_price are 0 or invalid - skip this record
        if (totalSkipped < 10) { // Only log first 10 to avoid spam
          console.warn(`   ⚠️  Skipping row ${i + 1}: price is 0 or invalid (price=${rawPrice}, lowest_price=${rawLowestPrice})`);
        }
        totalSkipped++;
        continue;
      }
      
      // Set base_price: prefer lowest_price, fallback to price
      basePrice = (rawLowestPrice && rawLowestPrice > 0) ? rawLowestPrice : price;
      
      // Log warning if price was 0 and we used lowest_price
      if (priceWasZero && totalProcessed < 20) { // Only log first 20 to avoid spam
        console.warn(`   ⚠️  Row ${i + 1}: price was 0, using lowest_price (${price}) instead`);
      }
      
      const duration = parseInt(row.total_duration, 10) || 0;
      const stops = parseInt(row.stops, 10) || 0;
      const carbonEmissions = row.carbon_emissions ? parseInt(row.carbon_emissions, 10) : null;

      // Normalize values
      const tripType = normalizeTripType(row.trip_type || 'One way');
      const travelClass = normalizeTravelClass(row.travel_class || 'Economy');
      const oftenDelayed = parseBoolean(row.often_delayed || 'False');

      // Determine season (can be enhanced later based on date analysis)
      const season: 'high' | 'normal' | 'low' | null = null;

      batch.push({
        route_id: route.id,
        airline_id: airline.id,
        departure_date: departureDate,
        return_date: null, // CSV only has one-way flights
        price,
        base_price: basePrice,
        departure_time: departureTime.toISOString(),
        arrival_time: arrivalTime.toISOString(),
        duration,
        flight_number: row.flight_number.trim(),
        trip_type: tripType,
        season,
        travel_class: travelClass,
        search_date: searchDate,
        airplane: row.airplane || null,
        stops,
        carbon_emissions: carbonEmissions,
        legroom: row.legroom || null,
        often_delayed: oftenDelayed,
        lowest_price: row.lowest_price ? parseFloat(row.lowest_price) : null,
        price_level: row.price_level || null,
      });

      totalProcessed++;

      // Process batch when full
      if (batch.length >= BATCH_SIZE) {
        try {
          // Deduplicate batch before inserting
          const deduplicatedBatch = deduplicateBatch(batch);
          const duplicatesRemoved = batch.length - deduplicatedBatch.length;
          
          if (duplicatesRemoved > 0) {
            console.log(`   ⚠️  Removed ${duplicatesRemoved} duplicate(s) from batch`);
          }
          
          await FlightModel.batchInsertFlightPrices(deduplicatedBatch);
          totalStored += deduplicatedBatch.length;
          batch.length = 0;
        } catch (error: any) {
          console.error(`   ❌ Error inserting batch:`, error.message);
          totalErrors += batch.length;
          batch.length = 0;
        }
      }
    } catch (error: any) {
      totalErrors++;
      console.error(`   ❌ Error processing row ${i + 1}:`, error.message);
    }
  }

  // Process remaining batch
  if (batch.length > 0) {
    try {
      // Deduplicate batch before inserting
      const deduplicatedBatch = deduplicateBatch(batch);
      const duplicatesRemoved = batch.length - deduplicatedBatch.length;
      
      if (duplicatesRemoved > 0) {
        console.log(`   ⚠️  Removed ${duplicatesRemoved} duplicate(s) from final batch`);
      }
      
      await FlightModel.batchInsertFlightPrices(deduplicatedBatch);
      totalStored += deduplicatedBatch.length;
    } catch (error: any) {
      console.error(`   ❌ Error inserting final batch:`, error.message);
      totalErrors += batch.length;
    }
  }

  console.log(`   ✅ Completed: ${totalStored} stored, ${totalSkipped} skipped, ${totalErrors} errors`);
  return { processed: totalProcessed, stored: totalStored, skipped: totalSkipped, errors: totalErrors };
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const csvDir = args.find(arg => arg.startsWith('--dir='))?.split('=')[1] || './data/flight_data';
  const csvFile = args.find(arg => arg.startsWith('--file='))?.split('=')[1];

  console.log('\n' + '='.repeat(80));
  console.log('✈️  Flight Data CSV Importer');
  console.log('='.repeat(80));

  let csvFiles: string[] = [];

  if (csvFile) {
    // Import single file
    const fullPath = path.isAbsolute(csvFile) ? csvFile : path.join(process.cwd(), csvFile);
    csvFiles = [fullPath];
    console.log(`📁 File: ${csvFile}`);
  } else {
    // Import all CSV files from directory
    const fullDir = path.isAbsolute(csvDir) ? csvDir : path.join(process.cwd(), csvDir);
    console.log(`📁 Directory: ${csvDir}`);

    if (!fs.existsSync(fullDir)) {
      console.error(`❌ Directory not found: ${fullDir}`);
      process.exit(1);
    }

    const files = fs.readdirSync(fullDir);
    csvFiles = files
      .filter(file => file.endsWith('.csv'))
      .map(file => path.join(fullDir, file));

    if (csvFiles.length === 0) {
      console.error(`❌ No CSV files found in: ${fullDir}`);
      process.exit(1);
    }

    console.log(`📊 Found ${csvFiles.length} CSV file(s)`);
  }

  console.log('='.repeat(80));

  let totalProcessed = 0;
  let totalStored = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  try {
    for (const csvFile of csvFiles) {
      const result = await importCSVFile(csvFile);
      totalProcessed += result.processed;
      totalStored += result.stored;
      totalSkipped += result.skipped;
      totalErrors += result.errors;
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Import Summary:');
    console.log(`   Files processed: ${csvFiles.length}`);
    console.log(`   Total rows processed: ${totalProcessed}`);
    console.log(`   Successfully stored: ${totalStored}`);
    console.log(`   Skipped: ${totalSkipped}`);
    if (totalErrors > 0) {
      console.log(`   Errors: ${totalErrors}`);
    }
    console.log('='.repeat(80));
    console.log('\n✅ Done!\n');
  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    // Close database connection
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

export { importCSVFile };
