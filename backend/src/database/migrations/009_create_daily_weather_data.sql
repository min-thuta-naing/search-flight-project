-- Migration 009: Create daily_weather_data table
-- This table stores daily weather data from Open-Meteo Historical and OpenWeatherMap Forecast
-- Used for detailed weather analysis and can be aggregated to monthly statistics
-- 
-- Note: This is separate from weather_statistics which stores monthly aggregated data
-- Daily data allows for more flexible analysis and can be aggregated as needed

-- Create daily_weather_data table
CREATE TABLE IF NOT EXISTS daily_weather_data (
  id SERIAL PRIMARY KEY,
  province VARCHAR(100) NOT NULL,
  date DATE NOT NULL, -- YYYY-MM-DD format
  temp_max DECIMAL(5, 2) NOT NULL,
  temp_min DECIMAL(5, 2) NOT NULL,
  temp_avg DECIMAL(5, 2) NOT NULL,
  precipitation DECIMAL(8, 2) NOT NULL DEFAULT 0,
  humidity DECIMAL(5, 2), -- Can be NULL if not available
  source VARCHAR(20) NOT NULL CHECK (source IN ('open-meteo', 'openweathermap')),
  year INTEGER NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  day INTEGER NOT NULL CHECK (day >= 1 AND day <= 31),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(province, date)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_daily_weather_province ON daily_weather_data(province);
CREATE INDEX IF NOT EXISTS idx_daily_weather_date ON daily_weather_data(date);
CREATE INDEX IF NOT EXISTS idx_daily_weather_province_date ON daily_weather_data(province, date);
CREATE INDEX IF NOT EXISTS idx_daily_weather_year_month ON daily_weather_data(year, month);
CREATE INDEX IF NOT EXISTS idx_daily_weather_source ON daily_weather_data(source);
CREATE INDEX IF NOT EXISTS idx_daily_weather_period ON daily_weather_data(province, year, month);

-- Add comments to table
COMMENT ON TABLE daily_weather_data IS 'Stores daily weather data from Open-Meteo Historical and OpenWeatherMap Forecast APIs';
COMMENT ON COLUMN daily_weather_data.province IS 'Province name (e.g., bangkok, chiang-mai)';
COMMENT ON COLUMN daily_weather_data.date IS 'Date in YYYY-MM-DD format';
COMMENT ON COLUMN daily_weather_data.temp_max IS 'Maximum temperature in Celsius';
COMMENT ON COLUMN daily_weather_data.temp_min IS 'Minimum temperature in Celsius';
COMMENT ON COLUMN daily_weather_data.temp_avg IS 'Average temperature in Celsius';
COMMENT ON COLUMN daily_weather_data.precipitation IS 'Precipitation in mm';
COMMENT ON COLUMN daily_weather_data.humidity IS 'Relative humidity percentage (can be NULL)';
COMMENT ON COLUMN daily_weather_data.source IS 'Data source: open-meteo (historical) or openweathermap (forecast)';

