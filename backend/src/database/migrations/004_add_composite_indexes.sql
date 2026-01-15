-- Migration 004: Add composite indexes for better query performance
-- These indexes optimize queries that filter by multiple columns simultaneously

-- Composite index for flight_prices queries with route_id, departure_date, and trip_type
-- This index significantly speeds up queries that filter by route, date range, and trip type
CREATE INDEX IF NOT EXISTS idx_flight_prices_route_date_trip 
ON flight_prices(route_id, departure_date, trip_type) 
INCLUDE (airline_id, price, season);

-- Composite index for route lookups (origin + destination)
-- This optimizes route queries that need base_price and avg_duration_minutes
CREATE INDEX IF NOT EXISTS idx_routes_origin_dest_composite 
ON routes(origin, destination) 
INCLUDE (id, base_price, avg_duration_minutes);

-- Composite index for airline lookups by code
-- This optimizes airline queries that need name and name_th
CREATE INDEX IF NOT EXISTS idx_airlines_code_composite 
ON airlines(code) 
INCLUDE (id, name, name_th);

-- Index for flight_prices queries that filter by season and date range
-- Useful for season-based analysis queries
CREATE INDEX IF NOT EXISTS idx_flight_prices_season_date 
ON flight_prices(season, departure_date) 
INCLUDE (route_id, airline_id, price);

-- Index for flight_prices queries that filter by airline and date range
-- Useful for airline-specific analysis
CREATE INDEX IF NOT EXISTS idx_flight_prices_airline_date 
ON flight_prices(airline_id, departure_date) 
INCLUDE (route_id, price, season, trip_type);

