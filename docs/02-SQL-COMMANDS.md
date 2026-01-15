# 🗄️ SQL Commands Reference

รวมคำสั่ง SQL ที่ใช้งานทั้งหมดสำหรับการจัดการข้อมูลในโปรเจค Flight Search System

---

## 📋 Table of Contents

1. [Database Connection](#database-connection)
2. [Data Verification](#data-verification)
3. [Data Cleanup](#data-cleanup)
4. [Data Analysis](#data-analysis)
5. [Performance Optimization](#performance-optimization)
6. [Backup & Restore](#backup--restore)

---

## 🔌 Database Connection

### Connect to Database

```bash
# Windows PowerShell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d flight_search

# macOS/Linux
psql -U postgres -d flight_search
```

### Basic Connection Commands

```sql
-- List all databases
\l

-- Connect to flight_search database
\c flight_search

-- List all tables
\dt

-- Describe table structure
\d table_name

-- List all extensions
\dx

-- Exit psql
\q
```

---

## ✅ Data Verification

### Check All Tables

```sql
-- Count records in all tables
SELECT 
  'airlines' as table_name, COUNT(*) as count FROM airlines
UNION ALL
SELECT 'routes', COUNT(*) FROM routes
UNION ALL
SELECT 'flight_prices', COUNT(*) FROM flight_prices
UNION ALL
SELECT 'weather_statistics', COUNT(*) FROM weather_statistics
UNION ALL
SELECT 'holiday_statistics', COUNT(*) FROM holiday_statistics
UNION ALL
SELECT 'thai_holidays', COUNT(*) FROM thai_holidays
UNION ALL
SELECT 'demand_statistics', COUNT(*) FROM demand_statistics
UNION ALL
SELECT 'search_statistics', COUNT(*) FROM search_statistics;
```

### Airlines

```sql
-- List all airlines
SELECT * FROM airlines ORDER BY code;

-- Count airlines
SELECT COUNT(*) FROM airlines;
-- Expected: 6 airlines (TG, FD, SL, VZ, PG, DD)

-- Check specific airline
SELECT * FROM airlines WHERE code = 'TG';
```

### Routes

```sql
-- List all routes
SELECT 
  id,
  origin,
  destination,
  distance_km,
  duration_minutes
FROM routes
ORDER BY origin, destination;

-- Count routes by origin
SELECT 
  origin, 
  COUNT(*) as route_count
FROM routes
GROUP BY origin
ORDER BY route_count DESC;

-- Expected: 31 routes (BKK to all other provinces)
SELECT COUNT(*) FROM routes WHERE origin = 'BKK';
```

### Flight Prices

```sql
-- Count total flight prices
SELECT COUNT(*) FROM flight_prices;
-- Expected: ~130,000-140,000 records

-- Check date range
SELECT 
  MIN(departure_date) as earliest_date,
  MAX(departure_date) as latest_date,
  COUNT(*) as total_flights
FROM flight_prices;

-- Count flights by route
SELECT 
  r.origin,
  r.destination,
  COUNT(*) as flight_count,
  MIN(fp.price) as min_price,
  MAX(fp.price) as max_price,
  AVG(fp.price)::DECIMAL(10,2) as avg_price
FROM routes r
LEFT JOIN flight_prices fp ON r.id = fp.route_id
GROUP BY r.id, r.origin, r.destination
ORDER BY flight_count DESC;

-- Check flights for specific route
SELECT 
  fp.departure_date,
  fp.return_date,
  fp.price,
  fp.trip_type,
  a.name as airline,
  r.origin || ' -> ' || r.destination as route
FROM flight_prices fp
JOIN routes r ON fp.route_id = r.id
JOIN airlines a ON fp.airline_id = a.id
WHERE r.origin = 'BKK' AND r.destination = 'CNX'
ORDER BY fp.departure_date
LIMIT 20;

-- Check price distribution by month
SELECT 
  TO_CHAR(departure_date, 'YYYY-MM') as month,
  COUNT(*) as flights,
  MIN(price) as min_price,
  MAX(price) as max_price,
  AVG(price)::DECIMAL(10,2) as avg_price
FROM flight_prices fp
JOIN routes r ON fp.route_id = r.id
WHERE r.origin = 'BKK' AND r.destination = 'CNX'
GROUP BY TO_CHAR(departure_date, 'YYYY-MM')
ORDER BY month;
```

### Weather Statistics

```sql
-- Count weather records
SELECT COUNT(*) FROM weather_statistics;

-- List provinces with weather data
SELECT 
  province,
  COUNT(*) as periods,
  MIN(period) as earliest_period,
  MAX(period) as latest_period
FROM weather_statistics
GROUP BY province
ORDER BY province;

-- Check weather data for specific province
SELECT 
  period,
  avg_temperature,
  avg_rainfall,
  avg_humidity,
  weather_score
FROM weather_statistics
WHERE province = 'chiang-mai'
ORDER BY period;

-- Monthly weather summary
SELECT 
  SUBSTRING(period, 6, 2) as month,
  COUNT(DISTINCT province) as provinces_count,
  AVG(avg_temperature)::DECIMAL(5,2) as avg_temp,
  AVG(avg_rainfall)::DECIMAL(8,2) as avg_rain,
  AVG(weather_score)::DECIMAL(5,2) as avg_score
FROM weather_statistics
GROUP BY SUBSTRING(period, 6, 2)
ORDER BY month;
```

### Holiday Statistics

```sql
-- Count holidays
SELECT COUNT(*) FROM thai_holidays;
-- Expected: 88 records (2024-2026)

-- List holidays by year
SELECT 
  EXTRACT(YEAR FROM date) as year,
  COUNT(*) as holiday_count
FROM thai_holidays
GROUP BY EXTRACT(YEAR FROM date)
ORDER BY year;

-- List all holidays in 2025
SELECT 
  date,
  name_th,
  name_en,
  holiday_type
FROM thai_holidays
WHERE EXTRACT(YEAR FROM date) = 2025
ORDER BY date;

-- Check long weekends
SELECT 
  date,
  name_th,
  EXTRACT(DOW FROM date) as day_of_week
FROM thai_holidays
WHERE EXTRACT(YEAR FROM date) = 2025
  AND EXTRACT(DOW FROM date) IN (1, 5) -- Monday or Friday
ORDER BY date;
```

---

## 🗑️ Data Cleanup

### ⚠️ CAUTION: These commands will DELETE data!

### Clear Flight Prices Only

```sql
-- Clear all flight prices (keeps routes and airlines)
TRUNCATE TABLE flight_prices;

-- Clear flight prices for specific route
DELETE FROM flight_prices 
WHERE route_id IN (
  SELECT id FROM routes 
  WHERE origin = 'BKK' AND destination = 'CNX'
);

-- Clear old flight prices (older than 90 days)
DELETE FROM flight_prices 
WHERE departure_date < CURRENT_DATE - INTERVAL '90 days';

-- Clear future flight prices (beyond 1 year)
DELETE FROM flight_prices 
WHERE departure_date > CURRENT_DATE + INTERVAL '1 year';
```

### Clear Routes and Flight Prices

```sql
-- Clear all routes and related flight prices
TRUNCATE TABLE routes, flight_prices CASCADE;

-- Clear specific route
DELETE FROM routes WHERE origin = 'BKK' AND destination = 'CNX';
-- Flight prices will be deleted automatically (CASCADE)
```

### Clear All Mock Data

```sql
-- Clear all flight-related data (keeps airlines)
TRUNCATE TABLE flight_prices, routes CASCADE;

-- Verify
SELECT COUNT(*) FROM flight_prices; -- Should be 0
SELECT COUNT(*) FROM routes; -- Should be 0
```

### Clear Statistics Tables

```sql
-- Clear weather statistics
TRUNCATE TABLE weather_statistics;

-- Clear holiday statistics
TRUNCATE TABLE holiday_statistics;

-- Clear demand statistics
TRUNCATE TABLE demand_statistics;

-- Clear search statistics
TRUNCATE TABLE search_statistics;
```

### Reset Entire Database

```sql
-- ⚠️ DANGER: This will delete ALL data including airlines and holidays!
TRUNCATE TABLE 
  airlines,
  routes,
  flight_prices,
  weather_statistics,
  holiday_statistics,
  demand_statistics,
  search_statistics,
  thai_holidays
CASCADE;

-- Verify all tables are empty
SELECT 
  'airlines' as table_name, COUNT(*) as count FROM airlines
UNION ALL
SELECT 'routes', COUNT(*) FROM routes
UNION ALL
SELECT 'flight_prices', COUNT(*) FROM flight_prices;
```

### Drop and Recreate Database (Nuclear Option)

```bash
# ⚠️ EXTREME CAUTION: Deletes everything!
psql -U postgres -c "DROP DATABASE flight_search;"
psql -U postgres -c "CREATE DATABASE flight_search;"
psql -U postgres -d flight_search -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Then re-run all migrations
cd backend
npm run migrate
```

---

## 📊 Data Analysis

### Flight Price Analysis

```sql
-- Overall price statistics
SELECT 
  COUNT(*) as total_flights,
  MIN(price) as min_price,
  MAX(price) as max_price,
  AVG(price)::DECIMAL(10,2) as avg_price,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY price)::DECIMAL(10,2) as median_price
FROM flight_prices;

-- Price by trip type
SELECT 
  trip_type,
  COUNT(*) as flights,
  AVG(price)::DECIMAL(10,2) as avg_price
FROM flight_prices
GROUP BY trip_type;

-- Price by airline
SELECT 
  a.name as airline,
  COUNT(*) as flights,
  MIN(fp.price) as min_price,
  MAX(fp.price) as max_price,
  AVG(fp.price)::DECIMAL(10,2) as avg_price
FROM flight_prices fp
JOIN airlines a ON fp.airline_id = a.id
GROUP BY a.id, a.name
ORDER BY avg_price;

-- Price by season (based on month)
SELECT 
  CASE 
    WHEN EXTRACT(MONTH FROM departure_date) IN (11, 12, 1, 2) THEN 'High Season'
    WHEN EXTRACT(MONTH FROM departure_date) IN (5, 6, 7, 8, 9, 10) THEN 'Low Season'
    ELSE 'Normal Season'
  END as season,
  COUNT(*) as flights,
  AVG(price)::DECIMAL(10,2) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM flight_prices
GROUP BY 
  CASE 
    WHEN EXTRACT(MONTH FROM departure_date) IN (11, 12, 1, 2) THEN 'High Season'
    WHEN EXTRACT(MONTH FROM departure_date) IN (5, 6, 7, 8, 9, 10) THEN 'Low Season'
    ELSE 'Normal Season'
  END
ORDER BY avg_price DESC;
```

### Route Analysis

```sql
-- Most expensive routes
SELECT 
  r.origin || ' -> ' || r.destination as route,
  COUNT(*) as flights,
  AVG(fp.price)::DECIMAL(10,2) as avg_price,
  MIN(fp.price) as min_price,
  MAX(fp.price) as max_price,
  r.distance_km,
  r.duration_minutes
FROM routes r
JOIN flight_prices fp ON r.id = fp.route_id
GROUP BY r.id, r.origin, r.destination, r.distance_km, r.duration_minutes
ORDER BY avg_price DESC
LIMIT 10;

-- Price per kilometer
SELECT 
  r.origin || ' -> ' || r.destination as route,
  r.distance_km,
  AVG(fp.price)::DECIMAL(10,2) as avg_price,
  (AVG(fp.price) / r.distance_km)::DECIMAL(10,2) as price_per_km
FROM routes r
JOIN flight_prices fp ON r.id = fp.route_id
WHERE r.distance_km > 0
GROUP BY r.id, r.origin, r.destination, r.distance_km
ORDER BY price_per_km DESC
LIMIT 10;
```

### Date Range Analysis

```sql
-- Flights per day
SELECT 
  departure_date,
  COUNT(*) as flights,
  AVG(price)::DECIMAL(10,2) as avg_price
FROM flight_prices
GROUP BY departure_date
ORDER BY departure_date;

-- Busiest days
SELECT 
  departure_date,
  COUNT(*) as flights
FROM flight_prices
GROUP BY departure_date
ORDER BY flights DESC
LIMIT 10;

-- Price trends over time
SELECT 
  DATE_TRUNC('week', departure_date) as week,
  COUNT(*) as flights,
  AVG(price)::DECIMAL(10,2) as avg_price
FROM flight_prices
WHERE departure_date >= CURRENT_DATE
GROUP BY DATE_TRUNC('week', departure_date)
ORDER BY week;
```

### Search Statistics

```sql
-- Most searched routes
SELECT 
  origin,
  destination,
  COUNT(*) as search_count
FROM search_statistics
GROUP BY origin, destination
ORDER BY search_count DESC
LIMIT 10;

-- Popular search dates
SELECT 
  departure_date,
  COUNT(*) as searches
FROM search_statistics
GROUP BY departure_date
ORDER BY searches DESC
LIMIT 10;
```

---

## ⚡ Performance Optimization

### Index Management

```sql
-- Check existing indexes
SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_flight_prices_departure_date 
  ON flight_prices(departure_date);

CREATE INDEX IF NOT EXISTS idx_flight_prices_route_date 
  ON flight_prices(route_id, departure_date);

CREATE INDEX IF NOT EXISTS idx_flight_prices_airline 
  ON flight_prices(airline_id);

-- Check index usage
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;
```

### Table Statistics

```sql
-- Table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Row counts and sizes
SELECT 
  schemaname,
  tablename,
  n_live_tup as row_count,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC;
```

### Vacuum and Analyze

```sql
-- Analyze tables for query optimization
ANALYZE flight_prices;
ANALYZE routes;
ANALYZE airlines;

-- Vacuum tables to reclaim space
VACUUM flight_prices;

-- Full vacuum (locks table)
VACUUM FULL flight_prices;
```

---

## 💾 Backup & Restore

### Backup Database

```bash
# Full database backup
pg_dump -U postgres -d flight_search -F c -f flight_search_backup.dump

# Backup specific tables
pg_dump -U postgres -d flight_search -t flight_prices -t routes -f mock_data_backup.sql

# Backup with compression
pg_dump -U postgres -d flight_search -F c -Z 9 -f flight_search_backup.dump.gz
```

### Restore Database

```bash
# Restore full database
pg_restore -U postgres -d flight_search -c flight_search_backup.dump

# Restore specific tables
psql -U postgres -d flight_search -f mock_data_backup.sql
```

### Export to CSV

```sql
-- Export flight prices to CSV
COPY (
  SELECT 
    fp.id,
    r.origin,
    r.destination,
    fp.departure_date,
    fp.return_date,
    fp.price,
    fp.trip_type,
    a.code as airline_code
  FROM flight_prices fp
  JOIN routes r ON fp.route_id = r.id
  JOIN airlines a ON fp.airline_id = a.id
) TO '/path/to/flight_prices_export.csv' WITH CSV HEADER;
```

---

## 🔍 Query Templates

### Find Cheapest Flights

```sql
-- Cheapest flights for specific route and date
SELECT 
  fp.departure_date,
  fp.price,
  a.name as airline,
  fp.trip_type
FROM flight_prices fp
JOIN routes r ON fp.route_id = r.id
JOIN airlines a ON fp.airline_id = a.id
WHERE r.origin = 'BKK'
  AND r.destination = 'CNX'
  AND fp.departure_date BETWEEN '2025-12-01' AND '2025-12-31'
  AND fp.trip_type = 'one-way'
ORDER BY fp.price
LIMIT 10;
```

### Price Range for Date Range

```sql
-- Get min/max/avg prices for each day in date range
SELECT 
  departure_date,
  COUNT(*) as available_flights,
  MIN(price) as min_price,
  MAX(price) as max_price,
  AVG(price)::DECIMAL(10,2) as avg_price
FROM flight_prices fp
JOIN routes r ON fp.route_id = r.id
WHERE r.origin = 'BKK'
  AND r.destination = 'CNX'
  AND departure_date >= '2025-12-01'
  AND departure_date <= '2025-12-31'
GROUP BY departure_date
ORDER BY departure_date;
```

---

## 📞 Quick Reference

### Common Commands Cheatsheet

```bash
# Connect
psql -U postgres -d flight_search

# Count all flights
SELECT COUNT(*) FROM flight_prices;

# Clear all flights
TRUNCATE TABLE flight_prices;

# Check data range
SELECT MIN(departure_date), MAX(departure_date) FROM flight_prices;

# Check route count
SELECT COUNT(*) FROM routes WHERE origin = 'BKK';

# Exit
\q
```

---

**Last Updated:** 2025-12-30
**Version:** 1.0.0

