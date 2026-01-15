-- Migration 003: Add additional indexes for Search Statistics Tables
-- This migration adds additional indexes that were not included in the initial schema
-- to optimize search statistics and price statistics queries

-- Additional indexes for search_statistics
CREATE INDEX IF NOT EXISTS idx_search_stats_origin ON search_statistics(origin);
CREATE INDEX IF NOT EXISTS idx_search_stats_trip_type ON search_statistics(trip_type);
CREATE INDEX IF NOT EXISTS idx_search_stats_destination_created_at ON search_statistics(destination, created_at);

-- Additional indexes for price_statistics
CREATE INDEX IF NOT EXISTS idx_price_stats_origin ON price_statistics(origin);
CREATE INDEX IF NOT EXISTS idx_price_stats_season ON price_statistics(season);
CREATE INDEX IF NOT EXISTS idx_price_stats_destination_created_at ON price_statistics(destination, created_at);

-- Add comments to tables
COMMENT ON TABLE search_statistics IS 'Stores user search queries for analytics and statistics';
COMMENT ON TABLE price_statistics IS 'Stores price recommendations for trend analysis';

