-- ============================================
-- สคริปต์สำหรับสร้าง Database และ Setup
-- สำหรับผู้เริ่มต้นใช้งาน PostgreSQL
-- ============================================

-- 1. สร้าง Database (ถ้ายังไม่มี)
-- หมายเหตุ: คำสั่งนี้ต้องรันในฐานข้อมูล postgres หรือ template1
-- ใช้คำสั่ง: psql -U postgres -f setup-database.sql

-- สร้าง database ใหม่
CREATE DATABASE flight_search;

-- เชื่อมต่อ database (ต้องรันแยกใน psql)
-- \c flight_search

-- 2. สร้าง Extension สำหรับ UUID (ถ้าต้องการ)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 3. สร้าง TimescaleDB Extension (ถ้าติดตั้ง TimescaleDB แล้ว)
-- CREATE EXTENSION IF NOT EXISTS timescaledb;

-- 4. ตรวจสอบ Extensions ที่ติดตั้งแล้ว
-- SELECT * FROM pg_extension;

-- ============================================
-- คำแนะนำการใช้งาน:
-- ============================================
-- 1. เปิด Command Prompt
-- 2. รันคำสั่ง: psql -U postgres
-- 3. พิมพ์รหัสผ่าน
-- 4. Copy และ paste คำสั่ง CREATE DATABASE ด้านบน
-- 5. เชื่อมต่อ database: \c flight_search
-- 6. รันคำสั่ง CREATE EXTENSION (ถ้าต้องการ)
-- 7. ออกจาก psql: \q
-- ============================================

