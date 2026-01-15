-- Migration 005: Create history tables for tracking price changes
-- This table stores historical records when data is updated, preserving past values

-- Flight prices history table
-- Stores historical flight price records when prices change
-- This allows tracking price trends and historical analysis
CREATE TABLE IF NOT EXISTS flight_prices_history (
  id SERIAL PRIMARY KEY,
  route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  airline_id INTEGER NOT NULL REFERENCES airlines(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  return_date DATE,
  price DECIMAL(10, 2) NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL,
  departure_time TIME NOT NULL,
  arrival_time TIME NOT NULL,
  duration INTEGER NOT NULL, -- in minutes
  flight_number VARCHAR(20) NOT NULL,
  trip_type VARCHAR(10) NOT NULL CHECK (trip_type IN ('one-way', 'round-trip')),
  season VARCHAR(10) NOT NULL CHECK (season IN ('high', 'normal', 'low')),
  recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Indexes for efficient queries
  CONSTRAINT fk_fp_history_route FOREIGN KEY (route_id) REFERENCES routes(id) ON DELETE CASCADE,
  CONSTRAINT fk_fp_history_airline FOREIGN KEY (airline_id) REFERENCES airlines(id) ON DELETE CASCADE
);

-- Create indexes for flight_prices_history
CREATE INDEX IF NOT EXISTS idx_fp_history_route_date ON flight_prices_history(route_id, departure_date);
CREATE INDEX IF NOT EXISTS idx_fp_history_recorded_at ON flight_prices_history(recorded_at);
CREATE INDEX IF NOT EXISTS idx_fp_history_airline_date ON flight_prices_history(airline_id, departure_date, recorded_at);
CREATE INDEX IF NOT EXISTS idx_fp_history_trip_type ON flight_prices_history(trip_type, recorded_at);
CREATE INDEX IF NOT EXISTS idx_fp_history_price ON flight_prices_history(price, recorded_at);

-- Add table comments
COMMENT ON TABLE flight_prices_history IS 'Historical records of flight price changes. Stores previous values before updates to enable trend analysis.';
COMMENT ON COLUMN flight_prices_history.recorded_at IS 'Timestamp when this historical record was created (before the update occurred)';

