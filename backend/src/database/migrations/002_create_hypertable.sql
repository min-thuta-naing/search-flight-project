-- Convert flight_prices table to TimescaleDB hypertable
-- This migration will only run if TimescaleDB extension is available
-- 
-- Important: The table must have departure_date in the primary key or unique constraint
-- for TimescaleDB to create the hypertable successfully

-- Check if TimescaleDB extension exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'timescaledb') THEN
    -- Convert to hypertable
    -- Note: migrate_data => true will migrate existing data
    PERFORM create_hypertable(
      'flight_prices',
      'departure_date',
      if_not_exists => TRUE,
      chunk_time_interval => INTERVAL '1 day',
      migrate_data => TRUE
    );
    
    RAISE NOTICE 'TimescaleDB hypertable created for flight_prices';
  ELSE
    RAISE NOTICE 'TimescaleDB extension not found. Skipping hypertable creation.';
  END IF;
END $$;

