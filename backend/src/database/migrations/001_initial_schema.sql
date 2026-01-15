-- Initial Schema Migration
-- This migration creates only essential tables for Amadeus API integration
-- Removes dependencies on weather, holidays, festivals, and season_configs

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create airlines table
CREATE TABLE IF NOT EXISTS airlines (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  name_th VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create airports table (NEW - for Amadeus airport data)
CREATE TABLE IF NOT EXISTS airports (
  id SERIAL PRIMARY KEY,
  code VARCHAR(10) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  city VARCHAR(100),
  country VARCHAR(10),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create routes table
CREATE TABLE IF NOT EXISTS routes (
  id SERIAL PRIMARY KEY,
  origin VARCHAR(50) NOT NULL,
  destination VARCHAR(50) NOT NULL,
  base_price DECIMAL(10, 2) NOT NULL DEFAULT 0,
  avg_duration_minutes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(origin, destination)
);

-- Create flight_prices table (TimescaleDB hypertable)
CREATE TABLE IF NOT EXISTS flight_prices (
  id SERIAL,
  route_id INTEGER NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
  airline_id INTEGER NOT NULL REFERENCES airlines(id) ON DELETE CASCADE,
  departure_date DATE NOT NULL,
  return_date DATE,
  price DECIMAL(10, 2),
  base_price DECIMAL(10, 2),
  departure_time TIMESTAMP NOT NULL,
  arrival_time TIMESTAMP NOT NULL,
  duration INTEGER NOT NULL, -- in minutes (total_duration from JSON)
  flight_number VARCHAR(20) NOT NULL,
  trip_type VARCHAR(20) NOT NULL CHECK (trip_type IN ('one-way', 'round-trip', 'One way', 'Round trip')),
  travel_class VARCHAR(20) DEFAULT 'economy', -- 'economy', 'business', 'first', 'Economy', etc.
  season VARCHAR(10) CHECK (season IN ('high', 'normal', 'low')),
  -- New fields from JSON format
  search_date DATE, -- Date when the search was performed
  airplane VARCHAR(50), -- Aircraft type (e.g., "ATR 42/72")
  stops INTEGER DEFAULT 0, -- Number of stops
  carbon_emissions INTEGER, -- Carbon emissions in grams
  legroom VARCHAR(20), -- Legroom measurement (e.g., "76 ซม.")
  often_delayed BOOLEAN DEFAULT FALSE, -- Whether flight is often delayed
  lowest_price DECIMAL(10, 2), -- Lowest price for the route on that date
  price_level VARCHAR(20), -- Price level (e.g., "typical", "low", "high")
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  PRIMARY KEY (id, departure_date),
  UNIQUE(route_id, airline_id, departure_date, trip_type, flight_number, departure_time)
);

-- Create search_statistics table
CREATE TABLE IF NOT EXISTS search_statistics (
  id SERIAL PRIMARY KEY,
  origin VARCHAR(50) NOT NULL,
  origin_name VARCHAR(100),
  destination VARCHAR(50) NOT NULL,
  destination_name VARCHAR(100),
  duration_range VARCHAR(20),
  trip_type VARCHAR(10) CHECK (trip_type IN ('one-way', 'round-trip')),
  user_ip VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create price_statistics table
CREATE TABLE IF NOT EXISTS price_statistics (
  id SERIAL PRIMARY KEY,
  origin VARCHAR(50) NOT NULL,
  origin_name VARCHAR(100),
  destination VARCHAR(50) NOT NULL,
  destination_name VARCHAR(100),
  recommended_price DECIMAL(10, 2) NOT NULL,
  season VARCHAR(10) CHECK (season IN ('high', 'normal', 'low')),
  airline VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_flight_prices_route_id ON flight_prices(route_id);
CREATE INDEX IF NOT EXISTS idx_flight_prices_airline_id ON flight_prices(airline_id);
CREATE INDEX IF NOT EXISTS idx_flight_prices_departure_date ON flight_prices(departure_date);
CREATE INDEX IF NOT EXISTS idx_flight_prices_season ON flight_prices(season);
CREATE INDEX IF NOT EXISTS idx_flight_prices_trip_type ON flight_prices(trip_type);
CREATE INDEX IF NOT EXISTS idx_flight_prices_travel_class ON flight_prices(travel_class);
CREATE INDEX IF NOT EXISTS idx_flight_prices_search_date ON flight_prices(search_date);
CREATE INDEX IF NOT EXISTS idx_flight_prices_price_level ON flight_prices(price_level);
CREATE INDEX IF NOT EXISTS idx_flight_prices_departure_time ON flight_prices(departure_time);
CREATE INDEX IF NOT EXISTS idx_routes_origin_destination ON routes(origin, destination);
CREATE INDEX IF NOT EXISTS idx_airlines_code ON airlines(code);
CREATE INDEX IF NOT EXISTS idx_airports_code ON airports(code);
CREATE INDEX IF NOT EXISTS idx_search_stats_destination ON search_statistics(destination);
CREATE INDEX IF NOT EXISTS idx_search_stats_created_at ON search_statistics(created_at);
CREATE INDEX IF NOT EXISTS idx_price_stats_destination ON price_statistics(destination);
CREATE INDEX IF NOT EXISTS idx_price_stats_created_at ON price_statistics(created_at);

-- Convert flight_prices to TimescaleDB hypertable (if TimescaleDB is available)
-- This will be executed conditionally in the migration script
-- SELECT create_hypertable('flight_prices', 'departure_date', if_not_exists => TRUE);
