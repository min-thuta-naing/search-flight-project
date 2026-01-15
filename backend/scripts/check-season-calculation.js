/**
 * Check season calculation logic - why seasons are the same
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { pool } = require('../dist/config/database');

async function checkSeasonCalculation() {
  try {
    console.log('🔍 Checking Season Calculation Logic...\n');

    // Simulate season calculation for different routes
    const routes = ['BKK → CNX', 'BKK → HKT', 'BKK → KBV', 'BKK → HDY'];
    
    for (const routeName of routes) {
      const [origin, dest] = routeName.split(' → ');
      
      // Get flight prices for this route
      const prices = await pool.query(`
        SELECT 
          TO_CHAR(fp.departure_date, 'YYYY-MM') as period,
          EXTRACT(MONTH FROM fp.departure_date)::INTEGER as month,
          AVG(fp.price) as avg_price
        FROM flight_prices fp
        JOIN routes r ON fp.route_id = r.id
        WHERE r.origin = $1 AND r.destination = $2
          AND fp.departure_date >= '2026-01-01' AND fp.departure_date < '2027-01-01'
        GROUP BY TO_CHAR(fp.departure_date, 'YYYY-MM'), EXTRACT(MONTH FROM fp.departure_date)
        ORDER BY month
      `, [origin, dest]);

      if (prices.rows.length === 0) {
        console.log(`\n⚠️  No data for ${routeName}`);
        continue;
      }

      // Calculate price percentiles (like the code does)
      const avgPrices = prices.rows.map(r => parseFloat(r.avg_price));
      const sortedPrices = [...avgPrices].sort((a, b) => a - b);
      
      // Get weather and holiday data
      const weatherData = await pool.query(`
        SELECT period, weather_score
        FROM weather_statistics
        WHERE province = (
          CASE $1
            WHEN 'CNX' THEN 'chiang-mai'
            WHEN 'HKT' THEN 'phuket'
            WHEN 'KBV' THEN 'krabi'
            WHEN 'HDY' THEN 'hat-yai'
            ELSE NULL
          END
        )
        AND period >= '2026-01' AND period < '2027-01'
        ORDER BY period
      `, [dest]);

      const holidayData = await pool.query(`
        SELECT period, holiday_score
        FROM holiday_statistics
        WHERE period >= '2026-01' AND period < '2027-01'
        ORDER BY period
      `);

      const weatherMap = new Map();
      weatherData.rows.forEach(r => weatherMap.set(r.period, r.weather_score));

      const holidayMap = new Map();
      holidayData.rows.forEach(r => holidayMap.set(r.period, r.holiday_score));

      console.log(`\n📊 ${routeName}`);
      console.log('-'.repeat(100));
      
      const monthScores = [];
      prices.rows.forEach(row => {
        const month = row.month;
        const avgPrice = parseFloat(row.avg_price);
        const period = row.period;
        
        // Calculate price percentile
        const pricePercentile = (sortedPrices.filter(p => p <= avgPrice).length / sortedPrices.length) * 100;
        
        // Get weather and holiday scores
        const weatherScore = weatherMap.get(period) || 50;
        const holidayScore = holidayMap.get(period) || 50;
        
        // Calculate season score
        const seasonScore = (pricePercentile * 0.6) + (holidayScore * 0.3) + (weatherScore * 0.1);
        
        monthScores.push({
          month,
          period,
          avgPrice: Math.round(avgPrice),
          pricePercentile: pricePercentile.toFixed(2),
          weatherScore,
          holidayScore,
          seasonScore: seasonScore.toFixed(2)
        });
      });

      // Calculate thresholds
      const allScores = monthScores.map(s => parseFloat(s.seasonScore)).sort((a, b) => a - b);
      const scoreLowThreshold = allScores[Math.floor(allScores.length * 0.33)];
      const scoreHighThreshold = allScores[Math.floor(allScores.length * 0.67)];

      console.table(monthScores);
      
      console.log(`\nThresholds: Low ≤ ${scoreLowThreshold.toFixed(2)}, High ≥ ${scoreHighThreshold.toFixed(2)}`);
      
      const seasonMap = {};
      monthScores.forEach(s => {
        const score = parseFloat(s.seasonScore);
        if (score <= scoreLowThreshold) {
          seasonMap[s.month] = 'low';
        } else if (score >= scoreHighThreshold) {
          seasonMap[s.month] = 'high';
        } else {
          seasonMap[s.month] = 'normal';
        }
      });
      
      console.log('\nSeason Classification:');
      Object.keys(seasonMap).sort((a, b) => a - b).forEach(month => {
        const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        console.log(`  ${monthNames[month]}: ${seasonMap[month]}`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await pool.end();
  }
}

checkSeasonCalculation();

