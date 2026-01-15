/**
 * Script to clean up statistics data related to Samui (USM)
 * Removes old search_statistics and price_statistics records that reference samui or USM
 */

import dotenv from 'dotenv';
import path from 'path';
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

async function cleanupSamuiStatistics() {
  try {
    console.log('\n' + '='.repeat(70));
    console.log('🧹 Cleaning up Samui (USM) statistics data');
    console.log('='.repeat(70) + '\n');

    // Step 1: Check search_statistics
    console.log('📋 Checking search_statistics for samui/USM...');
    const checkSearchStats = await pool.query(
      `SELECT COUNT(*) as count 
       FROM search_statistics 
       WHERE destination = 'samui' OR destination = 'USM' 
          OR destination_name ILIKE '%samui%' OR destination_name ILIKE '%USM%'`
    );
    const searchStatsCount = parseInt(checkSearchStats.rows[0].count);

    if (searchStatsCount > 0) {
      console.log(`   Found ${searchStatsCount} search_statistics record(s)`);
      const deleteSearchStats = await pool.query(
        `DELETE FROM search_statistics 
         WHERE destination = 'samui' OR destination = 'USM' 
            OR destination_name ILIKE '%samui%' OR destination_name ILIKE '%USM%'`
      );
      console.log(`   ✅ Deleted ${deleteSearchStats.rowCount} search_statistics record(s)`);
    } else {
      console.log('   ✅ No search_statistics records found');
    }

    // Step 2: Check price_statistics
    console.log('\n📋 Checking price_statistics for samui/USM...');
    const checkPriceStats = await pool.query(
      `SELECT COUNT(*) as count 
       FROM price_statistics 
       WHERE destination = 'samui' OR destination = 'USM' 
          OR destination_name ILIKE '%samui%' OR destination_name ILIKE '%USM%'`
    );
    const priceStatsCount = parseInt(checkPriceStats.rows[0].count);

    if (priceStatsCount > 0) {
      console.log(`   Found ${priceStatsCount} price_statistics record(s)`);
      const deletePriceStats = await pool.query(
        `DELETE FROM price_statistics 
         WHERE destination = 'samui' OR destination = 'USM' 
            OR destination_name ILIKE '%samui%' OR destination_name ILIKE '%USM%'`
      );
      console.log(`   ✅ Deleted ${deletePriceStats.rowCount} price_statistics record(s)`);
    } else {
      console.log('   ✅ No price_statistics records found');
    }

    console.log('\n' + '='.repeat(70));
    console.log('✅ Statistics cleanup completed!');
    console.log('='.repeat(70) + '\n');

  } catch (error: any) {
    console.error('\n❌ Error cleaning up statistics:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  cleanupSamuiStatistics();
}

export { cleanupSamuiStatistics };
