/**
 * สคริปต์ทดสอบการเชื่อมต่อ Database
 * ใช้สำหรับตรวจสอบว่าการตั้งค่า database ถูกต้องหรือไม่
 * 
 * วิธีใช้งาน:
 * 1. แก้ไขค่าต่างๆ ในไฟล์นี้ให้ตรงกับ .env ของคุณ
 * 2. รัน: node scripts/test-connection.js
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'flight_search',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function testConnection() {
  console.log('🔍 กำลังทดสอบการเชื่อมต่อ Database...\n');

  try {
    // ทดสอบการเชื่อมต่อ
    console.log('📡 กำลังเชื่อมต่อ...');
    const client = await pool.connect();
    console.log('✅ เชื่อมต่อสำเร็จ!\n');

    // ทดสอบ query
    console.log('📊 ทดสอบ query...');
    const result = await pool.query('SELECT version()');
    console.log('✅ Query สำเร็จ!\n');
    console.log('PostgreSQL Version:', result.rows[0].version.split(' ')[0] + ' ' + result.rows[0].version.split(' ')[1]);
    console.log();

    // ตรวจสอบ database
    console.log('🗄️  ตรวจสอบ Database...');
    const dbResult = await pool.query('SELECT current_database()');
    console.log('✅ Database:', dbResult.rows[0].current_database);
    console.log();

    // ตรวจสอบ TimescaleDB (ถ้ามี)
    console.log('⏱️  ตรวจสอบ TimescaleDB Extension...');
    try {
      const timescaleResult = await pool.query(
        "SELECT * FROM pg_extension WHERE extname = 'timescaledb'"
      );
      if (timescaleResult.rows.length > 0) {
        console.log('✅ TimescaleDB Extension พร้อมใช้งาน!');
      } else {
        console.log('⚠️  TimescaleDB Extension ยังไม่ได้ติดตั้ง (ไม่บังคับ)');
      }
    } catch (error) {
      console.log('⚠️  TimescaleDB Extension ยังไม่ได้ติดตั้ง (ไม่บังคับ)');
    }
    console.log();

    // ตรวจสอบ tables
    console.log('📋 ตรวจสอบ Tables...');
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    if (tablesResult.rows.length > 0) {
      console.log('✅ พบ Tables:');
      tablesResult.rows.forEach((row) => {
        console.log(`   - ${row.table_name}`);
      });
    } else {
      console.log('ℹ️  ยังไม่มี tables (รัน migrations เพื่อสร้าง tables)');
    }
    console.log();

    client.release();
    console.log('🎉 ทุกอย่างพร้อมใช้งาน!');
    console.log('\n💡 คำแนะนำ:');
    console.log('   - รัน migrations: npm run migrate');
    console.log('   - Seed data: npm run seed');
    console.log('   - Start server: npm run dev');

    process.exit(0);
  } catch (error) {
    console.error('❌ เกิดข้อผิดพลาด!\n');
    console.error('Error:', error.message);
    console.error('\n🔧 วิธีแก้ไข:');
    console.error('   1. ตรวจสอบว่า PostgreSQL กำลังรันอยู่');
    console.error('   2. ตรวจสอบ .env file (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD)');
    console.error('   3. ตรวจสอบว่า database "flight_search" ถูกสร้างแล้ว');
    console.error('   4. ตรวจสอบ username และ password');
    console.error('\n📚 ดูคู่มือเพิ่มเติม: DATABASE_SETUP_GUIDE.md');
    
    process.exit(1);
  } finally {
    await pool.end();
  }
}

testConnection();

