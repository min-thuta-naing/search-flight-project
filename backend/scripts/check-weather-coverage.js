require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../dist/config/database');

async function checkWeatherCoverage() {
  try {
    console.log('🔍 Checking Weather Data Coverage...\n');

    // Check 2026 data
    const data2026 = await pool.query(`
      SELECT 
        province,
        TO_CHAR(date, 'YYYY-MM') as period,
        COUNT(*) as days,
        MIN(date) as earliest_date,
        MAX(date) as latest_date
      FROM daily_weather_data
      WHERE date >= '2026-01-01'
      GROUP BY province, TO_CHAR(date, 'YYYY-MM')
      ORDER BY province, period
      LIMIT 20
    `);

    console.log('📅 2026 Data Coverage:');
    console.table(data2026.rows);

    // Check 2025 data
    const data2025 = await pool.query(`
      SELECT 
        province,
        TO_CHAR(date, 'YYYY-MM') as period,
        COUNT(*) as days
      FROM daily_weather_data
      WHERE province IN ('bangkok', 'chiang-mai', 'phuket')
        AND date >= '2025-12-01' AND date < '2026-01-01'
      GROUP BY province, TO_CHAR(date, 'YYYY-MM')
      ORDER BY province, period DESC
    `);

    console.log('\n📅 2025 Data Coverage (Dec only):');
    console.table(data2025.rows);

    // Check what periods are needed
    const neededPeriods = [];
    for (let month = 1; month <= 12; month++) {
      neededPeriods.push(`2026-${String(month).padStart(2, '0')}`);
    }

    console.log('\n📋 Checking which periods have data:');
    for (const province of ['bangkok', 'chiang-mai', 'phuket']) {
      console.log(`\n📍 ${province}:`);
      for (const period of neededPeriods) {
        const result = await pool.query(`
          SELECT COUNT(*) as count
          FROM daily_weather_data
          WHERE province = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
        `, [province, period]);
        
        const count = parseInt(result.rows[0].count, 10);
        if (count > 0) {
          console.log(`  ✅ ${period}: ${count} days`);
        } else {
          console.log(`  ❌ ${period}: No data`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkWeatherCoverage();

