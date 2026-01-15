/**
 * Check if flight prices vary by route
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../dist/config/database');

async function checkPriceVariation() {
  try {
    console.log('🔍 Checking Price Variation by Route...\n');

    // Check price variation by route for specific months
    const priceVariation = await pool.query(`
      SELECT 
        TO_CHAR(fp.departure_date, 'YYYY-MM') as period,
        r.origin || ' → ' || r.destination as route,
        COUNT(*) as flight_count,
        ROUND(AVG(fp.price))::INTEGER as avg_price,
        ROUND(STDDEV(fp.price))::INTEGER as stddev_price,
        MIN(fp.price) as min_price,
        MAX(fp.price) as max_price,
        ROUND((MAX(fp.price) - MIN(fp.price))::NUMERIC / AVG(fp.price) * 100, 2) as price_variation_pct
      FROM flight_prices fp
      JOIN routes r ON fp.route_id = r.id
      WHERE fp.departure_date >= '2026-01-01' AND fp.departure_date < '2026-02-01'
      GROUP BY TO_CHAR(fp.departure_date, 'YYYY-MM'), r.id, r.origin, r.destination
      ORDER BY period, avg_price DESC
    `);

    console.log('📊 Price Variation by Route (January 2026):');
    console.log('-'.repeat(100));
    console.table(priceVariation.rows);

    // Check if prices are identical across routes
    const identicalPrices = await pool.query(`
      WITH route_avg_prices AS (
        SELECT 
          TO_CHAR(fp.departure_date, 'YYYY-MM') as period,
          r.origin || ' → ' || r.destination as route,
          ROUND(AVG(fp.price))::INTEGER as avg_price
        FROM flight_prices fp
        JOIN routes r ON fp.route_id = r.id
        WHERE fp.departure_date >= '2026-01-01' AND fp.departure_date < '2026-02-01'
        GROUP BY TO_CHAR(fp.departure_date, 'YYYY-MM'), r.id, r.origin, r.destination
      )
      SELECT 
        period,
        COUNT(DISTINCT avg_price) as unique_avg_prices,
        COUNT(DISTINCT route) as route_count,
        MIN(avg_price) as min_avg,
        MAX(avg_price) as max_avg,
        CASE 
          WHEN COUNT(DISTINCT avg_price) = 1 THEN '⚠️ ALL ROUTES HAVE SAME PRICE!'
          WHEN COUNT(DISTINCT avg_price) <= 3 THEN '⚠️ Very few price variations'
          ELSE '✅ Good price variation'
        END as status
      FROM route_avg_prices
      GROUP BY period
    `);

    console.log('\n⚠️  Price Variation Analysis:');
    console.log('-'.repeat(100));
    console.table(identicalPrices.rows);

    // Check price distribution by route
    const priceDistribution = await pool.query(`
      SELECT 
        r.origin || ' → ' || r.destination as route,
        COUNT(DISTINCT TO_CHAR(fp.departure_date, 'YYYY-MM')) as months_with_data,
        ROUND(AVG(fp.price))::INTEGER as overall_avg_price,
        ROUND(MIN(fp.price))::INTEGER as overall_min_price,
        ROUND(MAX(fp.price))::INTEGER as overall_max_price,
        ROUND((MAX(fp.price) - MIN(fp.price))::NUMERIC / AVG(fp.price) * 100, 2) as price_range_pct
      FROM flight_prices fp
      JOIN routes r ON fp.route_id = r.id
      GROUP BY r.id, r.origin, r.destination
      ORDER BY overall_avg_price DESC
      LIMIT 15
    `);

    console.log('\n📈 Overall Price Distribution by Route:');
    console.log('-'.repeat(100));
    console.table(priceDistribution.rows);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkPriceVariation();

