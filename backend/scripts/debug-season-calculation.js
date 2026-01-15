/**
 * Debug script to check why season is not changing
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../dist/config/database');
const { DailyWeatherDataModel } = require('../dist/models/DailyWeatherData');

async function debugSeasonCalculation() {
  try {
    console.log('🔍 Debugging Season Calculation...\n');

    // Test provinces
    const testProvinces = ['bangkok', 'chiang-mai', 'phuket', 'krabi'];
    const testPeriods = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];

    console.log('📊 Testing Weather Data Aggregation:');
    console.log('-'.repeat(80));

    for (const province of testProvinces) {
      console.log(`\n📍 Province: ${province}`);
      
      for (const period of testPeriods) {
        try {
          const aggregated = await DailyWeatherDataModel.aggregateToMonthlyStatistics(
            province,
            period
          );

          if (aggregated) {
            console.log(`  ✅ ${period}: temp=${aggregated.avgTemperature}°C, rain=${aggregated.avgRainfall}mm, humidity=${aggregated.avgHumidity}%`);
          } else {
            console.log(`  ❌ ${period}: No data`);
          }
        } catch (error) {
          console.log(`  ⚠️  ${period}: Error - ${error.message}`);
        }
      }
    }

    // Check airport code to province mapping
    console.log('\n\n🔍 Testing Airport Code to Province Mapping:');
    console.log('-'.repeat(80));
    
    const testAirports = ['BKK', 'CNX', 'HKT', 'KBV', 'HDY'];
    const airportToProvince = {
      'BKK': 'bangkok',
      'CNX': 'chiang-mai',
      'HKT': 'phuket',
      'KBV': 'krabi',
      'HDY': 'hat-yai',
    };

    for (const airport of testAirports) {
      const expectedProvince = airportToProvince[airport];
      console.log(`\n✈️  Airport: ${airport} → Expected Province: ${expectedProvince}`);
      
      // Check if data exists
      const count = await DailyWeatherDataModel.getRecordCount(expectedProvince);
      console.log(`  Records in daily_weather_data: ${count}`);
      
      // Check specific period
      const testPeriod = '2026-01';
      const aggregated = await DailyWeatherDataModel.aggregateToMonthlyStatistics(
        expectedProvince,
        testPeriod
      );
      
      if (aggregated) {
        console.log(`  ✅ ${testPeriod}: Found data`);
        console.log(`     Temperature: ${aggregated.avgTemperature}°C`);
        console.log(`     Rainfall: ${aggregated.avgRainfall}mm`);
        console.log(`     Humidity: ${aggregated.avgHumidity}%`);
      } else {
        console.log(`  ❌ ${testPeriod}: No data`);
        
        // Check what periods are available
        const available = await pool.query(`
          SELECT DISTINCT TO_CHAR(date, 'YYYY-MM') as period
          FROM daily_weather_data
          WHERE province = $1
          ORDER BY period DESC
          LIMIT 5
        `, [expectedProvince]);
        
        if (available.rows.length > 0) {
          console.log(`  Available periods: ${available.rows.map(r => r.period).join(', ')}`);
        }
      }
    }

    // Check if data exists for 2026
    console.log('\n\n📅 Checking Data Coverage for 2026:');
    console.log('-'.repeat(80));
    
    const coverage2026 = await pool.query(`
      SELECT 
        province,
        COUNT(DISTINCT TO_CHAR(date, 'YYYY-MM')) as months_count,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM daily_weather_data
      WHERE date >= '2026-01-01'
      GROUP BY province
      ORDER BY months_count DESC
      LIMIT 10
    `);
    
    console.table(coverage2026.rows);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

debugSeasonCalculation();

