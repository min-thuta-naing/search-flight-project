-- Migration 007: Create holiday_statistics table
-- This table stores holiday data for dynamic season calculation
-- holiday_statistics: Stores holiday data from iApp API

-- Create holiday_statistics table
-- Stores holiday data from iApp API for season calculation
CREATE TABLE IF NOT EXISTS holiday_statistics (
  id SERIAL PRIMARY KEY,
  period VARCHAR(7) NOT NULL, -- YYYY-MM format (e.g., '2024-01')
  holidays_count INTEGER DEFAULT 0,
  long_weekends_count INTEGER DEFAULT 0,
  holiday_score INTEGER, -- 0-100 score for holiday boost
  holidays_detail JSONB, -- Store holiday details as JSON
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(period)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_holiday_stats_period ON holiday_statistics(period);

-- Add comments to tables
COMMENT ON TABLE holiday_statistics IS 'Stores holiday data from iApp API for dynamic season calculation';
