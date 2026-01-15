-- Script to check season calculation data in database
-- Run this to verify data completeness and correctness

-- 1. Check Flight Prices Data
\echo '=== FLIGHT PRICES DATA ==='
SELECT 
  COUNT(*) as total_flights,
  COUNT(DISTINCT route_id) as unique_routes,
  COUNT(DISTINCT DATE_TRUNC('month', departure_date)) as unique_months,
  MIN(departure_date) as earliest_date,
  MAX(departure_date) as latest_date,
  AVG(price) as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM flight_prices;

-- Check flight prices by route
\echo ''
\echo '=== FLIGHT PRICES BY ROUTE (Top 10) ==='
SELECT 
  r.origin || ' → ' || r.destination as route,
  COUNT(*) as flight_count,
  COUNT(DISTINCT DATE_TRUNC('month', fp.departure_date)) as months_covered,
  AVG(fp.price)::INTEGER as avg_price,
  MIN(fp.price) as min_price,
  MAX(fp.price) as max_price
FROM flight_prices fp
JOIN routes r ON fp.route_id = r.id
GROUP BY r.id, r.origin, r.destination
ORDER BY flight_count DESC
LIMIT 10;

-- Check flight prices by month
\echo ''
\echo '=== FLIGHT PRICES BY MONTH ==='
SELECT 
  TO_CHAR(departure_date, 'YYYY-MM') as period,
  COUNT(*) as flight_count,
  COUNT(DISTINCT route_id) as unique_routes,
  AVG(price)::INTEGER as avg_price,
  MIN(price) as min_price,
  MAX(price) as max_price
FROM flight_prices
GROUP BY TO_CHAR(departure_date, 'YYYY-MM')
ORDER BY period DESC
LIMIT 12;

-- 2. Check Weather Statistics Data
\echo ''
\echo '=== WEATHER STATISTICS DATA ==='
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT province) as unique_provinces,
  COUNT(DISTINCT period) as unique_periods,
  MIN(period) as earliest_period,
  MAX(period) as latest_period
FROM weather_statistics;

-- Check weather data by province
\echo ''
\echo '=== WEATHER DATA BY PROVINCE ==='
SELECT 
  province,
  COUNT(*) as record_count,
  COUNT(DISTINCT period) as periods_covered,
  MIN(period) as earliest_period,
  MAX(period) as latest_period,
  AVG(weather_score)::INTEGER as avg_weather_score,
  COUNT(CASE WHEN weather_score IS NULL THEN 1 END) as null_scores
FROM weather_statistics
GROUP BY province
ORDER BY record_count DESC;

-- Check weather data completeness by period
\echo ''
\echo '=== WEATHER DATA COMPLETENESS BY PERIOD ==='
SELECT 
  period,
  COUNT(DISTINCT province) as provinces_count,
  AVG(weather_score)::INTEGER as avg_weather_score,
  MIN(weather_score) as min_score,
  MAX(weather_score) as max_score
FROM weather_statistics
WHERE period >= TO_CHAR(CURRENT_DATE - INTERVAL '12 months', 'YYYY-MM')
GROUP BY period
ORDER BY period DESC;

-- 3. Check Holiday Statistics Data
\echo ''
\echo '=== HOLIDAY STATISTICS DATA ==='
SELECT 
  COUNT(*) as total_records,
  COUNT(DISTINCT period) as unique_periods,
  MIN(period) as earliest_period,
  MAX(period) as latest_period,
  AVG(holiday_score)::INTEGER as avg_holiday_score,
  MIN(holiday_score) as min_score,
  MAX(holiday_score) as max_score
FROM holiday_statistics;

-- Check holiday data by period
\echo ''
\echo '=== HOLIDAY DATA BY PERIOD (Last 12 months) ==='
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
ORDER BY period DESC;

-- 4. Check Data Consistency Issues
\echo ''
\echo '=== POTENTIAL DATA ISSUES ==='

-- Check for routes without weather data
\echo ''
\echo 'Routes that might not have weather data (checking popular routes):'
SELECT DISTINCT
  r.origin || ' → ' || r.destination as route,
  r.origin as origin_code,
  r.destination as destination_code
FROM routes r
LEFT JOIN weather_statistics ws ON ws.province = (
  CASE r.destination
    WHEN 'BKK' THEN 'bangkok'
    WHEN 'CNX' THEN 'chiang-mai'
    WHEN 'HKT' THEN 'phuket'
    WHEN 'KBV' THEN 'krabi'
    WHEN 'USM' THEN 'samui'
    WHEN 'HDY' THEN 'hat-yai'
    WHEN 'UTH' THEN 'udon-thani'
    WHEN 'KKC' THEN 'khon-kaen'
    WHEN 'UBP' THEN 'ubon-ratchathani'
    WHEN 'NAK' THEN 'nakhon-ratchasima'
    WHEN 'CEI' THEN 'chiang-rai'
    WHEN 'LPT' THEN 'lampang'
    WHEN 'PHS' THEN 'phitsanulok'
    WHEN 'THS' THEN 'sukhothai'
    WHEN 'TKT' THEN 'tak'
    WHEN 'SNO' THEN 'sakon-nakhon'
    WHEN 'ROI' THEN 'roi-et'
    WHEN 'LOE' THEN 'loei'
    WHEN 'BFV' THEN 'buri-ram'
    WHEN 'UTP' THEN 'rayong'
    WHEN 'TDX' THEN 'trat'
    WHEN 'HHQ' THEN 'prachuap-khiri-khan'
    ELSE NULL
  END
)
WHERE r.destination IN ('BKK', 'CNX', 'HKT', 'KBV', 'USM', 'HDY', 'UTH', 'KKC', 'UBP', 'NAK', 'CEI', 'LPT', 'PHS', 'THS', 'TKT', 'SNO', 'ROI', 'LOE', 'BFV', 'UTP', 'TDX', 'HHQ')
  AND ws.province IS NULL
LIMIT 10;

-- Check for months without holiday data
\echo ''
\echo 'Months without holiday data (last 12 months):'
SELECT 
  TO_CHAR(date_trunc('month', generate_series(
    CURRENT_DATE - INTERVAL '12 months',
    CURRENT_DATE,
    '1 month'::interval
  )), 'YYYY-MM') as period
EXCEPT
SELECT period FROM holiday_statistics
ORDER BY period DESC;

-- Check for duplicate or inconsistent data
\echo ''
\echo 'Duplicate weather records (same province + period):'
SELECT 
  province,
  period,
  COUNT(*) as duplicate_count
FROM weather_statistics
GROUP BY province, period
HAVING COUNT(*) > 1;

\echo ''
\echo 'Duplicate holiday records (same period):'
SELECT 
  period,
  COUNT(*) as duplicate_count
FROM holiday_statistics
GROUP BY period
HAVING COUNT(*) > 1;

