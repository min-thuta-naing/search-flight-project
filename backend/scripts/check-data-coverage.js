require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../dist/config/database');

async function checkDataCoverage() {
  try {
    console.log('🔍 Checking Data Coverage for 2026...\n');

    const weatherPeriods = await pool.query(`
      SELECT DISTINCT period 
      FROM weather_statistics 
      WHERE period >= '2025-01' 
      ORDER BY period DESC 
      LIMIT 15
    `);

    console.log('🌤️  Weather periods available:');
    weatherPeriods.rows.forEach(row => console.log(`  ${row.period}`));

    const holidayPeriods = await pool.query(`
      SELECT DISTINCT period 
      FROM holiday_statistics 
      WHERE period >= '2025-01' 
      ORDER BY period DESC 
      LIMIT 15
    `);

    console.log('\n🎉 Holiday periods available:');
    holidayPeriods.rows.forEach(row => console.log(`  ${row.period}`));

    // Check what periods are needed for 2026
    console.log('\n📅 Periods needed for 2026:');
    const neededPeriods = [];
    for (let month = 1; month <= 12; month++) {
      const period = `2026-${String(month).padStart(2, '0')}`;
      neededPeriods.push(period);
      console.log(`  ${period}`);
    }

    // Check missing weather data
    console.log('\n❌ Missing weather data for 2026:');
    const missingWeather = await pool.query(`
      SELECT period
      FROM (SELECT unnest($1::text[]) as period) p
      WHERE NOT EXISTS (
        SELECT 1 FROM weather_statistics ws 
        WHERE ws.period = p.period 
        AND ws.province = 'chiang-mai'
      )
    `, [neededPeriods]);

    if (missingWeather.rows.length > 0) {
      console.log('Missing periods:');
      missingWeather.rows.forEach(row => console.log(`  ${row.period}`));
    } else {
      console.log('✅ All periods have weather data');
    }

    // Check missing holiday data
    console.log('\n❌ Missing holiday data for 2026:');
    const missingHoliday = await pool.query(`
      SELECT period
      FROM (SELECT unnest($1::text[]) as period) p
      WHERE NOT EXISTS (
        SELECT 1 FROM holiday_statistics hs 
        WHERE hs.period = p.period
      )
    `, [neededPeriods]);

    if (missingHoliday.rows.length > 0) {
      console.log('Missing periods:');
      missingHoliday.rows.forEach(row => console.log(`  ${row.period}`));
    } else {
      console.log('✅ All periods have holiday data');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkDataCoverage();

