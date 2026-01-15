-- Migration 010: Create weather_statistics table
-- This table stores monthly aggregated weather statistics with calculated scores
-- weather_statistics: Stores weather data aggregated by province and period (month)

-- Create weather_statistics table
-- Stores weather statistics for season calculation
CREATE TABLE IF NOT EXISTS weather_statistics (
  id SERIAL PRIMARY KEY,
  province VARCHAR(100) NOT NULL,
  period VARCHAR(7) NOT NULL, -- YYYY-MM format (e.g., '2024-01')
  avg_temperature DECIMAL(5, 2),
  avg_rainfall DECIMAL(8, 2),
  avg_humidity DECIMAL(5, 2),
  weather_score INTEGER, -- 0-100 score for weather conditions
  days_count INTEGER DEFAULT 0, -- Number of days with data in this period
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(province, period)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_weather_stats_province ON weather_statistics(province);
CREATE INDEX IF NOT EXISTS idx_weather_stats_period ON weather_statistics(period);
CREATE INDEX IF NOT EXISTS idx_weather_stats_province_period ON weather_statistics(province, period);

-- Add comments to tables
COMMENT ON TABLE weather_statistics IS 'Stores monthly aggregated weather statistics with calculated scores for season calculation';
COMMENT ON COLUMN weather_statistics.province IS 'Province name (e.g., bangkok, chiang-mai)';
COMMENT ON COLUMN weather_statistics.period IS 'Period in YYYY-MM format';
COMMENT ON COLUMN weather_statistics.weather_score IS 'Weather score (0-100) calculated from temperature, rainfall, and humidity';
