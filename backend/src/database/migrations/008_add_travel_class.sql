-- Migration 008: Add travel_class column to flight_prices table
-- This migration adds support for different travel classes (economy, business, etc.)
-- Each travel class will have different pricing multipliers

-- Add travel_class column to flight_prices table
ALTER TABLE flight_prices 
ADD COLUMN IF NOT EXISTS travel_class VARCHAR(20) DEFAULT 'economy' 
CHECK (travel_class IN ('economy', 'business', 'first'));

-- Update existing records to have 'economy' as default
UPDATE flight_prices 
SET travel_class = 'economy' 
WHERE travel_class IS NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_flight_prices_travel_class ON flight_prices(travel_class);

-- Update unique constraint to include travel_class
-- First, drop the old unique constraints if they exist
ALTER TABLE flight_prices 
DROP CONSTRAINT IF EXISTS flight_prices_route_id_airline_id_departure_date_trip_type_flight_number_key;

ALTER TABLE flight_prices 
DROP CONSTRAINT IF EXISTS flight_prices_unique_flight;

ALTER TABLE flight_prices 
DROP CONSTRAINT IF EXISTS flight_prices_unique;

-- Add new unique constraint that includes travel_class
ALTER TABLE flight_prices 
ADD CONSTRAINT flight_prices_unique 
UNIQUE(route_id, airline_id, departure_date, trip_type, flight_number, travel_class);

-- Add comment
COMMENT ON COLUMN flight_prices.travel_class IS 'Travel class: economy (1.0x), business (2.0-3.0x), first (3.0-5.0x)';

