/**
 * Script to calculate and store route price statistics (monthly aggregated with percentiles)
 * 
 * Usage:
 *   tsx src/scripts/calculate-route-price-statistics.ts
 *   tsx src/scripts/calculate-route-price-statistics.ts -- --route-id=1
 *   tsx src/scripts/calculate-route-price-statistics.ts -- --origin=BKK --destination=CNX
 */

import dotenv from 'dotenv';
import path from 'path';
import { RoutePriceStatisticsModel } from '../models/RoutePriceStatistics';
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
 * Calculate and store price statistics for all routes or a specific route
 */
async function calculateRoutePriceStatistics(
  routeId?: number,
  origin?: string,
  destination?: string
): Promise<void> {
  console.log(`\n📊 Calculating route price statistics...`);
  console.log('='.repeat(80));

  try {
    let routes: Array<{ id: number; origin: string; destination: string }> = [];

    if (routeId) {
      // Get specific route
      const route = await FlightModel.getRouteById(routeId);
      if (route) {
        routes = [route];
      } else {
        console.error(`❌ Route with ID ${routeId} not found`);
        return;
      }
    } else if (origin && destination) {
      // Get route by origin and destination
      const route = await FlightModel.getRoute(origin, destination);
      if (route) {
        routes = [route];
      } else {
        console.error(`❌ Route ${origin} → ${destination} not found`);
        return;
      }
    } else {
      // Get all routes
      const allRoutes = await FlightModel.getAllRoutes();
      routes = allRoutes;
    }

    if (routes.length === 0) {
      console.log('⚠️  No routes found');
      return;
    }

    console.log(`📊 Processing ${routes.length} route(s)...\n`);

    let totalCalculated = 0;
    let totalErrors = 0;

    for (const route of routes) {
      try {
        console.log(`📈 Processing route: ${route.origin} → ${route.destination} (ID: ${route.id})`);

        // Get all flight prices for this route grouped by month
        const query = `
          SELECT 
            TO_CHAR(departure_date, 'YYYY-MM') as period,
            AVG(price)::DECIMAL(10, 2) as avg_price,
            COUNT(*) as flights_count
          FROM flight_prices
          WHERE route_id = $1
            AND price IS NOT NULL
            AND trip_type = 'one-way'
            AND travel_class = 'economy'
          GROUP BY TO_CHAR(departure_date, 'YYYY-MM')
          ORDER BY period ASC
        `;

        const result = await pool.query(query, [route.id]);

        if (result.rows.length === 0) {
          console.log(`   ⚠️  No flight prices found for this route`);
          continue;
        }

        // Get all average prices for percentile calculation
        const allAvgPrices = result.rows
          .map(row => parseFloat(row.avg_price))
          .filter(price => !isNaN(price));

        if (allAvgPrices.length === 0) {
          console.log(`   ⚠️  No valid average prices found`);
          continue;
        }

        // Calculate and store statistics for each period
        let periodCount = 0;
        for (const row of result.rows) {
          const period = row.period;
          const avgPrice = parseFloat(row.avg_price);
          const flightsCount = parseInt(row.flights_count, 10);

          if (isNaN(avgPrice)) {
            continue;
          }

          // Calculate price percentile
          const pricePercentile = RoutePriceStatisticsModel.calculatePricePercentile(
            avgPrice,
            allAvgPrices
          );

          // Store in database
          await RoutePriceStatisticsModel.upsertRoutePriceStatistics({
            routeId: route.id,
            origin: route.origin,
            destination: route.destination,
            period,
            avgPrice,
            pricePercentile,
            flightsCount,
          });

          periodCount++;
        }

        totalCalculated += periodCount;
        console.log(`   ✅ Calculated ${periodCount} period(s) for route ${route.origin} → ${route.destination}`);
      } catch (error: any) {
        totalErrors++;
        console.error(`   ❌ Error processing route ${route.origin} → ${route.destination}:`, error.message);
      }
    }

    console.log('='.repeat(80));
    console.log(`✅ Calculation completed:`);
    console.log(`   Total routes processed: ${routes.length}`);
    console.log(`   Total periods calculated: ${totalCalculated}`);
    if (totalErrors > 0) {
      console.log(`   Errors: ${totalErrors}`);
    }
    console.log('='.repeat(80));
  } catch (error: any) {
    console.error(`❌ Error calculating route price statistics:`, error.message);
    throw error;
  }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2);
  const routeIdArg = args.find(arg => arg.startsWith('--route-id='))?.split('=')[1];
  const originArg = args.find(arg => arg.startsWith('--origin='))?.split('=')[1];
  const destinationArg = args.find(arg => arg.startsWith('--destination='))?.split('=')[1];

  const routeId = routeIdArg ? parseInt(routeIdArg, 10) : undefined;
  const origin = originArg?.toUpperCase();
  const destination = destinationArg?.toUpperCase();

  console.log('\n' + '='.repeat(80));
  console.log('📊 Route Price Statistics Calculator');
  console.log('='.repeat(80));
  if (routeId) {
    console.log(`Route ID: ${routeId}`);
  } else if (origin && destination) {
    console.log(`Route: ${origin} → ${destination}`);
  } else {
    console.log('Processing: All routes');
  }
  console.log('='.repeat(80));

  try {
    await calculateRoutePriceStatistics(routeId, origin, destination);
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

export { calculateRoutePriceStatistics };
