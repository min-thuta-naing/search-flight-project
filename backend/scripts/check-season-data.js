/**
 * Script to check season calculation data in database
 * Run: node scripts/check-season-data.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../dist/config/database');

async function checkSeasonData() {
  try {
    console.log('🔍 Checking Season Calculation Data...\n');
    console.log('='.repeat(80));

    // 1. Check Flight Prices Data
    console.log('\n📊 FLIGHT PRICES DATA');
    console.log('-'.repeat(80));
    const flightStats = await pool.query(`
      SELECT 
        COUNT(*) as total_flights,
        COUNT(DISTINCT route_id) as unique_routes,
        COUNT(DISTINCT DATE_TRUNC('month', departure_date)) as unique_months,
        MIN(departure_date)::TEXT as earliest_date,
        MAX(departure_date)::TEXT as latest_date,
        ROUND(AVG(price))::INTEGER as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM flight_prices
    `);
    console.table(flightStats.rows[0]);

    // Check flight prices by route
    console.log('\n📈 FLIGHT PRICES BY ROUTE (Top 10)');
    console.log('-'.repeat(80));
    const routeStats = await pool.query(`
      SELECT 
        r.origin || ' → ' || r.destination as route,
        COUNT(*) as flight_count,
        COUNT(DISTINCT DATE_TRUNC('month', fp.departure_date)) as months_covered,
        ROUND(AVG(fp.price))::INTEGER as avg_price,
        MIN(fp.price) as min_price,
        MAX(fp.price) as max_price
      FROM flight_prices fp
      JOIN routes r ON fp.route_id = r.id
      GROUP BY r.id, r.origin, r.destination
      ORDER BY flight_count DESC
      LIMIT 10
    `);
    console.table(routeStats.rows);

    // Check flight prices by month
    console.log('\n📅 FLIGHT PRICES BY MONTH (Last 12 months)');
    console.log('-'.repeat(80));
    const monthStats = await pool.query(`
      SELECT 
        TO_CHAR(departure_date, 'YYYY-MM') as period,
        COUNT(*) as flight_count,
        COUNT(DISTINCT route_id) as unique_routes,
        ROUND(AVG(price))::INTEGER as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM flight_prices
      WHERE departure_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(departure_date, 'YYYY-MM')
      ORDER BY period DESC
      LIMIT 12
    `);
    console.table(monthStats.rows);

    // 2. Check Weather Statistics Data
    console.log('\n🌤️  WEATHER STATISTICS DATA');
    console.log('-'.repeat(80));
    const weatherStats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT province) as unique_provinces,
        COUNT(DISTINCT period) as unique_periods,
        MIN(period) as earliest_period,
        MAX(period) as latest_period
      FROM weather_statistics
    `);
    console.table(weatherStats.rows[0]);

    // Check weather data by province
    console.log('\n🌍 WEATHER DATA BY PROVINCE');
    console.log('-'.repeat(80));
    const provinceWeather = await pool.query(`
      SELECT 
        province,
        COUNT(*) as record_count,
        COUNT(DISTINCT period) as periods_covered,
        MIN(period) as earliest_period,
        MAX(period) as latest_period,
        ROUND(AVG(weather_score))::INTEGER as avg_weather_score,
        COUNT(CASE WHEN weather_score IS NULL THEN 1 END) as null_scores
      FROM weather_statistics
      GROUP BY province
      ORDER BY record_count DESC
    `);
    console.table(provinceWeather.rows);

    // Check weather data completeness by period
    console.log('\n📆 WEATHER DATA COMPLETENESS BY PERIOD (Last 12 months)');
    console.log('-'.repeat(80));
    const periodWeather = await pool.query(`
      SELECT 
        period,
        COUNT(DISTINCT province) as provinces_count,
        ROUND(AVG(weather_score))::INTEGER as avg_weather_score,
        MIN(weather_score) as min_score,
        MAX(weather_score) as max_score
      FROM weather_statistics
      WHERE period >= TO_CHAR(CURRENT_DATE - INTERVAL '12 months', 'YYYY-MM')
      GROUP BY period
      ORDER BY period DESC
    `);
    console.table(periodWeather.rows);

    // 3. Check Holiday Statistics Data
    console.log('\n🎉 HOLIDAY STATISTICS DATA');
    console.log('-'.repeat(80));
    const holidayStats = await pool.query(`
      SELECT 
        COUNT(*) as total_records,
        COUNT(DISTINCT period) as unique_periods,
        MIN(period) as earliest_period,
        MAX(period) as latest_period,
        ROUND(AVG(holiday_score))::INTEGER as avg_holiday_score,
        MIN(holiday_score) as min_score,
        MAX(holiday_score) as max_score
      FROM holiday_statistics
    `);
    console.table(holidayStats.rows[0]);

    // Check holiday data by period
    console.log('\n📅 HOLIDAY DATA BY PERIOD (Last 12 months)');
    console.log('-'.repeat(80));
    const periodHoliday = await pool.query(`
      SELECT 
        period,
        holidays_count,
        long_weekends_count,
        holiday_score,
        CASE 
          WHEN holidays_detail IS NULL THEN 'No details'
          WHEN jsonb_typeof(holidays_detail) = 'array' THEN jsonb_array_length(holidays_detail)::TEXT || ' holidays'
          ELSE 'Invalid format'
        END as holidays_detail_info
      FROM holiday_statistics
      WHERE period >= TO_CHAR(CURRENT_DATE - INTERVAL '12 months', 'YYYY-MM')
      ORDER BY period DESC
    `);
    console.table(periodHoliday.rows);

    // 4. Check Data Consistency Issues
    console.log('\n⚠️  POTENTIAL DATA ISSUES');
    console.log('-'.repeat(80));

    // Check for months without holiday data
    console.log('\n❌ Months without holiday data (last 12 months):');
    const missingHolidays = await pool.query(`
      SELECT 
        TO_CHAR(date_trunc('month', generate_series(
          CURRENT_DATE - INTERVAL '12 months',
          CURRENT_DATE,
          '1 month'::interval
        )), 'YYYY-MM') as period
      EXCEPT
      SELECT period FROM holiday_statistics
      ORDER BY period DESC
    `);
    if (missingHolidays.rows.length > 0) {
      console.table(missingHolidays.rows);
    } else {
      console.log('✅ All months have holiday data');
    }

    // Check for duplicate records
    console.log('\n🔍 Duplicate weather records:');
    const duplicateWeather = await pool.query(`
      SELECT 
        province,
        period,
        COUNT(*) as duplicate_count
      FROM weather_statistics
      GROUP BY province, period
      HAVING COUNT(*) > 1
    `);
    if (duplicateWeather.rows.length > 0) {
      console.table(duplicateWeather.rows);
    } else {
      console.log('✅ No duplicate weather records');
    }

    console.log('\n🔍 Duplicate holiday records:');
    const duplicateHoliday = await pool.query(`
      SELECT 
        period,
        COUNT(*) as duplicate_count
      FROM holiday_statistics
      GROUP BY period
      HAVING COUNT(*) > 1
    `);
    if (duplicateHoliday.rows.length > 0) {
      console.table(duplicateHoliday.rows);
    } else {
      console.log('✅ No duplicate holiday records');
    }

    // Check price distribution
    console.log('\n💰 PRICE DISTRIBUTION ANALYSIS');
    console.log('-'.repeat(80));
    const priceDistribution = await pool.query(`
      SELECT 
        TO_CHAR(departure_date, 'YYYY-MM') as period,
        COUNT(*) as count,
        ROUND(AVG(price))::INTEGER as avg_price,
        ROUND(PERCENTILE_CONT(0.33) WITHIN GROUP (ORDER BY price))::INTEGER as p33_price,
        ROUND(PERCENTILE_CONT(0.67) WITHIN GROUP (ORDER BY price))::INTEGER as p67_price,
        MIN(price) as min_price,
        MAX(price) as max_price
      FROM flight_prices
      WHERE departure_date >= CURRENT_DATE - INTERVAL '12 months'
      GROUP BY TO_CHAR(departure_date, 'YYYY-MM')
      ORDER BY period DESC
      LIMIT 12
    `);
    console.table(priceDistribution.rows);

    console.log('\n' + '='.repeat(80));
    console.log('✅ Data check completed!');
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await pool.end();
  }
}

checkSeasonData();

