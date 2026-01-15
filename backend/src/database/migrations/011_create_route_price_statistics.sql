-- Migration 011: Create route_price_statistics table
-- This table stores monthly aggregated price statistics with calculated percentiles
-- route_price_statistics: Stores price data aggregated by route and period (month)

-- Create route_price_statistics table
-- Stores price statistics for season calculation
CREATE TABLE IF NOT EXISTS route_price_statistics (
  id SERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  origin VARCHAR(50) NOT NULL,
  destination VARCHAR(50) NOT NULL,
  period VARCHAR(7) NOT NULL, -- YYYY-MM format (e.g., '2024-01')
  avg_price DECIMAL(10, 2),
  price_percentile INTEGER, -- 0-100 score for price percentile
  flights_count INTEGER DEFAULT 0, -- Number of flights in this period
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(route_id, period)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_route_price_stats_route_id ON route_price_statistics(route_id);
CREATE INDEX IF NOT EXISTS idx_route_price_stats_origin ON route_price_statistics(origin);
CREATE INDEX IF NOT EXISTS idx_route_price_stats_destination ON route_price_statistics(destination);
CREATE INDEX IF NOT EXISTS idx_route_price_stats_period ON route_price_statistics(period);
CREATE INDEX IF NOT EXISTS idx_route_price_stats_origin_destination ON route_price_statistics(origin, destination);
CREATE INDEX IF NOT EXISTS idx_route_price_stats_route_period ON route_price_statistics(route_id, period);

-- Add comments to tables
COMMENT ON TABLE route_price_statistics IS 'Stores monthly aggregated price statistics with calculated percentiles for season calculation';
COMMENT ON COLUMN route_price_statistics.period IS 'Period in YYYY-MM format';
COMMENT ON COLUMN route_price_statistics.price_percentile IS 'Price percentile (0-100) calculated from average prices across all months';
