-- Migration 006: Update flight_prices unique constraint to allow multiple flights per day
-- This allows airlines to have multiple flights (different flight numbers) on the same day

-- Drop the old unique constraint if it exists
ALTER TABLE flight_prices 
DROP CONSTRAINT IF EXISTS flight_prices_route_id_airline_id_departure_date_trip_type_key;

-- Add new unique constraint that includes flight_number
-- This allows multiple flights per airline per day (different flight numbers)
ALTER TABLE flight_prices 
ADD CONSTRAINT flight_prices_unique_flight 
UNIQUE(route_id, airline_id, departure_date, trip_type, flight_number);

-- Add index for better query performance when filtering by flight_number
CREATE INDEX IF NOT EXISTS idx_flight_prices_flight_number 
ON flight_prices(flight_number);

-- Add comment to explain the constraint
COMMENT ON CONSTRAINT flight_prices_unique_flight ON flight_prices IS 
'Allows multiple flights per airline per day, differentiated by flight_number';

