# 📚 System Documentation - Flight Search Project

เอกสารเกี่ยวกับสถาปัตยกรรมระบบ, สูตรการคำนวณ, API และข้อมูลที่ใช้งาน

---

## 📋 Table of Contents

1. [System Architecture](#system-architecture)
2. [Calculation Formulas](#calculation-formulas)
3. [API Documentation](#api-documentation)
4. [Data Models](#data-models)
5. [External APIs](#external-apis)
6. [Season Calculation System](#season-calculation-system)

---

## 🏗️ System Architecture

### Technology Stack

#### Backend
- **Runtime**: Node.js (v18+)
- **Framework**: Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL 18+ with TimescaleDB (optional)
- **ORM**: None (Raw SQL queries via `pg` library)
- **Scheduler**: node-cron (optional, via `ENABLE_SCHEDULED_JOBS`)

#### Frontend
- **Framework**: Next.js 14+ (React)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Radix UI + shadcn/ui

### Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                         FRONTEND                             │
│                    (Next.js + React)                         │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Search Form  │  │ Results Grid │  │ Season Chart │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTP/REST API
┌────────────────────────┴────────────────────────────────────┐
│                         BACKEND                              │
│                   (Express.js + TypeScript)                  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │              Controllers Layer                        │  │
│  │  - flightController                                   │  │
│  │  - destinationController                              │  │
│  │  - airportController                                  │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
│  ┌────────────────┴─────────────────────────────────────┐  │
│  │              Services Layer                           │  │
│  │  - flightAnalysisService (Season Calculation)        │  │
│  │  - pricePredictionService                             │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
│  ┌────────────────┴─────────────────────────────────────┐  │
│  │              Models Layer                             │  │
│  │  - Flight Model                                       │  │
│  │  - WeatherStatistics Model                            │  │
│  │  - HolidayStatistics Model                            │  │
│  │  - DemandStatistics Model                             │  │
│  └────────────────┬─────────────────────────────────────┘  │
│                   │                                          │
└───────────────────┼──────────────────────────────────────────┘
                    │
┌───────────────────┴──────────────────────────────────────────┐
│                    DATABASE LAYER                            │
│                PostgreSQL + TimescaleDB                      │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Airlines   │  │    Routes    │  │Flight Prices │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Weather    │  │   Holidays   │  │   Demand     │     │
│  │  Statistics  │  │  Statistics  │  │  Statistics  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└──────────────────────────────────────────────────────────────┘
                    │
┌───────────────────┴──────────────────────────────────────────┐
│                  EXTERNAL APIS (Optional)                    │
│                                                              │
│  ┌──────────────┐  ┌──────────────┐     │
│  │  Open-Meteo  │  │   iApp API   │     │
│  │  Weather API │  │  Holiday API │     │
│  └──────────────┘  └──────────────┘     │
│            ↓                   ↓         │
│      Import to DB       Import to DB     │
└──────────────────────────────────────────────────────────────┘
```

---

## 🧮 Calculation Formulas

### 1. Mock Data Price Calculation

**Location:** `backend/src/scripts/generate-mock-flights.ts`

#### Base Price Calculation

```typescript
basePrice = 1000 + (distance_km * 0.15)
```

**Example:**
- BKK → CNX: Distance = 600 km
- Base Price = 1000 + (600 × 0.15) = 1090 THB

#### Seasonal Price Multiplier

```typescript
function getSeasonalMultiplier(month: number): number {
  // High season (Nov-Feb): 1.3-1.5x
  if (month === 11 || month === 12 || month === 1 || month === 2) {
    return 1.3 + Math.random() * 0.2; // 1.3-1.5x
  }
  
  // Low season (May-Oct): 0.7-0.9x  
  if (month >= 5 && month <= 10) {
    return 0.7 + Math.random() * 0.2; // 0.7-0.9x
  }
  
  // Normal season (Mar-Apr): 0.9-1.1x
  return 0.9 + Math.random() * 0.2; // 0.9-1.1x
}
```

#### Final Price Calculation

```typescript
price = basePrice × seasonalMultiplier × tripTypeMultiplier × travelClassMultiplier × randomVariation

Where:
- basePrice: 1000 + (distance_km × 0.15)
- seasonalMultiplier: 0.7-1.5x (depends on month)
- tripTypeMultiplier: 1.0 (one-way) or 1.8 (round-trip)
- travelClassMultiplier: 1.0 (economy), 2.5 (business), 4.0 (first)
- randomVariation: 0.98-1.02 (±2% for realism)
```

**Example (High Season, One-way, Business Class):**
```
basePrice = 1090 THB
seasonalMultiplier = 1.4 (high season)
tripTypeMultiplier = 1.0 (one-way)
travelClassMultiplier = 2.5 (business)
randomVariation = 1.01

finalPrice = 1090 × 1.4 × 1.0 × 2.5 × 1.01 = 3853 THB
```

---

### 2. Season Calculation (Multi-Factor Scoring)

**Location:** `backend/src/services/flightAnalysisService.ts`

#### Multi-Factor Score

```typescript
seasonScore = (pricePercentile × 0.6) + 
              (holidayScore × 0.3) + 
              (weatherScore × 0.1)

Where:
- pricePercentile: 0-100 (lower price = lower percentile = low season)
- holidayScore: 0-100 (more holidays = higher score = high season)
- weatherScore: 0-100 (better weather = higher score = high season)
```

**Note:** Demand factor ถูกถอดออกแล้ว ใช้เฉพาะ Price (60%), Holiday (30%), และ Weather (10%)

#### Price Percentile Calculation

```typescript
// Step 1: Calculate average price per month from database
avgPricesByMonth[month] = AVG(prices in that month)

// Step 2: Calculate percentiles across all months
sortedPrices = SORT(allAvgPrices)
pricePercentile[month] = 
  (count of prices ≤ avgPrice[month] / total prices) × 100
```

#### Holiday Score Calculation

```typescript
holidayScore = (holidaysCount × 30) + (longWeekendsCount × 20)

// Clamp to 0-100
holidayScore = Math.min(100, holidayScore)
```

#### Weather Score Calculation

```typescript
score = 50 // base score

// Temperature (20-28°C is optimal)
if (temperature >= 20 && temperature <= 28) {
  score += 20
} else if (temperature < 20 || temperature > 32) {
  score -= 20
}

// Rainfall (less is better)
if (rainfall < 50) {
  score += 15
} else if (rainfall > 200) {
  score -= 15
}

// Humidity (50-70% is optimal)
if (humidity >= 50 && humidity <= 70) {
  score += 15
} else if (humidity > 80) {
  score -= 15
}

weatherScore = clamp(score, 0, 100)
```

#### Season Classification

```typescript
// Calculate percentiles of final season scores
p33 = 33rd percentile of seasonScores
p67 = 67th percentile of seasonScores

// Classify months
if (seasonScore < p33) → Low Season
if (seasonScore >= p33 && seasonScore < p67) → Normal Season
if (seasonScore >= p67) → High Season
```

---

### 3. Price Prediction

**Location:** `backend/src/services/pricePredictionService.ts`

#### Simple Moving Average (7-day window)

```typescript
predictedPrice = AVG(prices from 7 days before target date)

// If insufficient historical data, use current average
if (historicalPrices.length < 7) {
  predictedPrice = AVG(all available prices for that route)
}
```

---

### 4. Distance Calculation (Haversine Formula)

**Location:** `backend/src/scripts/generate-mock-flights.ts`

```typescript
// Haversine formula to calculate great-circle distance
R = 6371 // Earth's radius in km

φ1 = lat1 × π/180
φ2 = lat2 × π/180
Δφ = (lat2 - lat1) × π/180
Δλ = (lon2 - lon1) × π/180

a = sin²(Δφ/2) + cos(φ1) × cos(φ2) × sin²(Δλ/2)
c = 2 × atan2(√a, √(1−a))

distance = R × c
```

---

### 5. Flight Duration Estimation

```typescript
duration_minutes = (distance_km / 800) × 60 + 30

Where:
- 800 km/h: Average cruising speed
- +30 minutes: Taxi, takeoff, landing buffer
```

**Example:**
- Distance: 600 km
- Duration = (600 / 800) × 60 + 30 = 75 minutes

---

## 🌐 API Documentation

### Internal REST API Endpoints

**Base URL:** `http://localhost:3001/api`

#### 1. Flight Search

```http
POST /flights/search
Content-Type: application/json

{
  "origin": "bangkok",
  "destination": "chiang-mai",
  "departureDate": "2025-12-30",
  "returnDate": "2026-01-05", // optional
  "tripType": "one-way", // or "round-trip"
  "adults": 1,
  "airlinePreference": [], // optional
  "maxStops": 0,
  "durationRange": {
    "min": 0,
    "max": 720
  }
}

Response:
{
  "success": true,
  "data": [
    {
      "id": "123",
      "origin": "BKK",
      "destination": "CNX",
      "departureDate": "2025-12-30",
      "price": 1500,
      "airline": {
        "code": "TG",
        "name": "Thai Airways"
      },
      "duration": 75,
      "stops": 0
    }
  ],
  "meta": {
    "count": 25,
    "cheapest": 1200,
    "fastest": 65
  }
}
```

#### 2. Flight Price Analysis

```http
POST /flights/analyze
Content-Type: application/json

{
  "origin": "bangkok",
  "destination": "chiang-mai",
  "departureDate": "2025-12-30",
  "returnDate": null,
  "tripType": "one-way",
  "durationRange": {
    "min": 0,
    "max": 720
  }
}

Response:
{
  "success": true,
  "data": {
    "seasons": [
      {
        "type": "low",
        "months": ["กุมภาพันธ์", "มีนาคม", "กันยายน"],
        "priceRange": {
          "min": 741,
          "max": 16400
        },
        "bestDeal": {
          "date": "2026-03-15",
          "price": 741
        },
        "description": "ราคาถูกที่สุดของปี เหมาะสำหรับผู้ที่มีความยืดหยุ่นในการเดินทาง"
      },
      {
        "type": "normal",
        "months": ["มกราคม", "เมษายน", ...],
        "priceRange": { "min": 982, "max": 16000 }
      },
      {
        "type": "high",
        "months": ["ตุลาคม", "พฤศจิกายน", "ธันวาคม"],
        "priceRange": { "min": 696, "max": 1788 }
      }
    ],
    "priceComparison": {
      "userSelectedPrice": 1500,
      "bestDealPrice": 741,
      "savings": 759,
      "percentageDifference": 50.6
    },
    "recommendation": {
      "date": "2026-03-15",
      "price": 741,
      "reason": "ราคาถูกกว่าที่คุณเลือก 759 บาท (50.6%)"
    }
  }
}
```

#### 3. Cheapest Dates

```http
POST /flights/cheapest-dates
Content-Type: application/json

{
  "origin": "BKK",
  "destination": "CNX",
  "departureDate": "2025-12-30"
}

Response:
{
  "success": true,
  "data": [
    {
      "date": "2025-12-28",
      "price": 1200
    },
    {
      "date": "2025-12-29",
      "price": 1250
    },
    {
      "date": "2025-12-30",
      "price": 1500
    }
  ]
}
```

#### 4. Destination Inspiration

```http
POST /destinations/inspiration
Content-Type: application/json

{
  "origin": "BKK",
  "maxPrice": 3000
}

Response:
{
  "success": true,
  "data": [
    {
      "destination": "CNX",
      "destinationName": "Chiang Mai",
      "price": 1200,
      "departureDate": "2025-12-30",
      "returnDate": "2026-01-05"
    }
  ]
}
```

#### 5. Airport Search

```http
GET /airports/search?keyword=bangkok&subType=AIRPORT

Response:
{
  "success": true,
  "data": [
    {
      "iataCode": "BKK",
      "name": "Suvarnabhumi Airport",
      "cityName": "Bangkok",
      "countryCode": "TH"
    }
  ]
}
```

---

## 💾 Data Models

### Airlines Table

```sql
CREATE TABLE airlines (
  id SERIAL PRIMARY KEY,
  code VARCHAR(3) UNIQUE NOT NULL,        -- IATA code (e.g., 'TG')
  name VARCHAR(255) NOT NULL,              -- English name
  name_th VARCHAR(255),                    -- Thai name
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**Data:**
- TG - Thai Airways (การบินไทย)
- FD - Thai AirAsia (แอร์เอเชีย)
- SL - Thai Lion Air (ไทยไลอ้อนแอร์)
- VZ - Thai Vietjet Air (ไทยเวียตเจ็ทแอร์)
- PG - Bangkok Airways (บางกอกแอร์เวย์ส)
- DD - Nok Air (นกแอร์)

---

### Routes Table

```sql
CREATE TABLE routes (
  id SERIAL PRIMARY KEY,
  origin VARCHAR(3) NOT NULL,              -- Airport code (e.g., 'BKK')
  destination VARCHAR(3) NOT NULL,         -- Airport code (e.g., 'CNX')
  distance_km INTEGER,                     -- Distance in km
  duration_minutes INTEGER,                -- Flight duration
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(origin, destination)
);
```

**Data:**
- 31 routes from Bangkok (BKK) to all Thai provinces
- Distance: 100-1200 km
- Duration: 45-150 minutes

---

### Flight Prices Table

```sql
CREATE TABLE flight_prices (
  id BIGSERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(id) ON DELETE CASCADE,
  airline_id INTEGER REFERENCES airlines(id),
  departure_date DATE NOT NULL,
  return_date DATE,
  price DECIMAL(10, 2) NOT NULL,
  base_price DECIMAL(10, 2),               -- Raw price before multipliers
  trip_type VARCHAR(20) NOT NULL,          -- 'one-way' or 'round-trip'
  travel_class VARCHAR(20) DEFAULT 'economy', -- 'economy', 'business', or 'first'
  departure_time TIME,
  arrival_time TIME,
  season VARCHAR(20),                      -- Calculated season
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

**TimescaleDB Hypertable:**
```sql
SELECT create_hypertable('flight_prices', 'departure_date', 
                         if_not_exists => TRUE);
```

**Data Volume:**
- ~130,000-140,000 records
- Date range: 90 days back, 270 days forward (360 days total)
- 31 routes × 6 airlines × 360 days × 2 trip types ≈ 133,920 flights

---

### Daily Weather Data Table

```sql
CREATE TABLE daily_weather_data (
  id SERIAL PRIMARY KEY,
  province VARCHAR(100) NOT NULL,          -- Province slug (e.g., 'chiang-mai')
  date DATE NOT NULL,                       -- Date (YYYY-MM-DD)
  temperature DECIMAL(5, 2),                -- Celsius
  rainfall DECIMAL(8, 2),                   -- mm
  humidity DECIMAL(5, 2),                   -- Percentage
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(province, date)
);
```

**Data Source:** CSV import from Open-Meteo Historical API & OpenWeatherMap Forecast API
**Data Volume:** ~68,289 records (31 provinces × ~2,200 days)
**Note:** ข้อมูลเป็น daily data (ไม่ใช่ monthly averages)

---

### Holiday Statistics Table

```sql
CREATE TABLE thai_holidays (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  name_th VARCHAR(255) NOT NULL,
  name_en VARCHAR(255),
  holiday_type VARCHAR(50),                -- 'public', 'bank', 'government'
  is_long_weekend BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Data Source:** Manual import from Thai government calendar
**Data Volume:** 88 records (2024-2026)

---

### Demand Statistics Table

```sql
CREATE TABLE demand_statistics (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES routes(id),
  period VARCHAR(7) NOT NULL,              -- YYYY-MM format
  bookings_count INTEGER DEFAULT 0,
  travelers_count INTEGER DEFAULT 0,
  flights_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(route_id, period)
);
```

**Data Source:** 
- Mock data generator

---

## 🔌 External APIs

### 1. Open-Meteo Weather API

**Documentation:** https://open-meteo.com/

#### Used Endpoint:

- **Historical Weather Data**
  - Endpoint: `/v1/archive`
  - Parameters: `latitude`, `longitude`, `start_date`, `end_date`
  - Variables: `temperature_2m`, `precipitation`, `relative_humidity_2m`

#### Data Flow:

```
Open-Meteo API → CSV Export → Import Script → weather_statistics table
```

**Note:** API ไม่รองรับวันที่อนาคต → ใช้ข้อมูลจาก database แทน

---

### 2. iApp Holiday API (Thailand)

**Documentation:** https://github.com/snอพcod3/iApp-Holiday-API

#### Used Endpoint:

- **Thai Holidays**
  - Endpoint: `/api/v1/holidays/TH/{year}`
  - Purpose: Get public holidays in Thailand

#### Data Flow:

```
iApp API → Manual/Scheduled Import → thai_holidays table
```

---

## 🎯 Season Calculation System

### Overview

ระบบคำนวณฤดูกาล (Season) โดยใช้ **Multi-Factor Scoring** จาก 3 ปัจจัย:

1. **Price (60%)** - ราคาเที่ยวบิน (จาก database)
2. **Holiday (30%)** - วันหยุดนักขัตฤกษ์ (จาก database หรือ iApp API)
3. **Weather (10%)** - สภาพอากาศ (จาก database หรือสร้าง mock จากราคา)

### Calculation Flow

```
┌─────────────────────────────────────────────────────────┐
│  1. Collect Data (180-day range)                        │
│     - Flight prices from database                       │
│     - Weather data from database (daily_weather_data)   │
│     - Holiday data from database (holiday_statistics)   │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  2. Group by Month & Calculate Averages                 │
│     - avgPrice[month] = AVG(prices from database)       │
│     - holidayScore[month] = holidays × 30 + weekends    │
│     - weatherScore[month] = from database or mock       │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  3. Calculate Percentiles & Scores (0-100)              │
│     - pricePercentile = percentile(avgPrice)            │
│     - holidayScore = from database (0-100)              │
│     - weatherScore = from database or mock (0-100)      │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  4. Calculate Final Season Score                        │
│     seasonScore = (price × 0.6) +                       │
│                   (holiday × 0.3) + (weather × 0.1)     │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  5. Classify Months into Seasons                        │
│     p33 = 33rd percentile, p67 = 67th percentile        │
│     - seasonScore < p33 → Low Season                    │
│     - p33 ≤ seasonScore < p67 → Normal Season           │
│     - seasonScore ≥ p67 → High Season                   │
└──────────────────┬──────────────────────────────────────┘
                   ↓
┌─────────────────────────────────────────────────────────┐
│  6. Return Season Data                                  │
│     {                                                    │
│       type: 'low' | 'normal' | 'high',                  │
│       months: [...],                                     │
│       priceRange: { min, max },                         │
│       bestDeal: { date, price }                         │
│     }                                                    │
└─────────────────────────────────────────────────────────┘
```

### Why 180-day Range?

ระบบจะขยาย date range อัตโนมัติเป็น **180 วัน** (90 วันก่อน + 90 วันหลัง) เพื่อ:

1. **ครอบคลุมทุกเดือน** - ต้องมีข้อมูลอย่างน้อย 6 เดือนขึ้นไป
2. **คำนวณ percentile ได้แม่นยำ** - ต้องมี data points เพียงพอ
3. **แบ่ง season ได้ชัดเจน** - ถ้าข้อมูลน้อยเกินไป จะไม่สามารถแบ่ง 3 season ได้

---

## 📊 Data Sources Summary

| Data Type | Source | Update Frequency | Fallback |
|-----------|--------|------------------|----------|
| Flight Prices | Mock Generator | One-time | N/A |
| Airlines | Manual | Static | N/A |
| Routes | Calculated | Static | N/A |
| Weather Statistics | CSV Import (Open-Meteo) | Manual | None |
| Thai Holidays | CSV/Migration | Annual | None |

---

## 🔐 Environment Variables Reference

### Backend `.env`

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flight_search
DB_USER=postgres
DB_PASSWORD=your_password

# TimescaleDB (Optional)
ENABLE_TIMESCALEDB=false  # Set to 'true' if using TimescaleDB

# Server
PORT=3001
NODE_ENV=development

# Scheduled Jobs (Optional)
ENABLE_SCHEDULED_JOBS=false  # Set to 'true' to enable scheduled tasks

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000  # 1 minute
RATE_LIMIT_MAX_REQUESTS=1000  # Development: 1000, Production: 300

# OpenWeatherMap API (Optional, for forecast data)
OPENWEATHERMAP_API_KEY=your_api_key

# CORS
CORS_ORIGIN=http://localhost:3000
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 📈 Performance Considerations

### Database Indexes

Critical indexes for query performance:

```sql
-- Flight prices by date
CREATE INDEX idx_flight_prices_departure_date 
  ON flight_prices(departure_date);

-- Flight prices by route and date
CREATE INDEX idx_flight_prices_route_date 
  ON flight_prices(route_id, departure_date);

-- Weather by province and period
CREATE INDEX idx_weather_stats_province_period 
  ON weather_statistics(province, period);
```

### TimescaleDB Benefits (Optional)

TimescaleDB เป็น optional extension ที่สามารถเปิดใช้งานได้ผ่าน environment variable:

```env
ENABLE_TIMESCALEDB=true
```

**Benefits:**
- **Efficient time-series queries** - `flight_prices` can be a hypertable
- **Automatic data partitioning** by date
- **Better compression** for historical data
- **Faster aggregations** on time ranges

**Note:** ระบบทำงานได้ปกติโดยไม่ต้องใช้ TimescaleDB

---

## 🚀 Scaling Considerations

### Current Features

1. **Scheduled Jobs** (Optional)
   - Enable via `ENABLE_SCHEDULED_JOBS=true`
   - Background tasks for data sync
   - Pre-calculate popular routes

2. **Rate Limiting**
   - Configurable per environment
   - Separate limits for statistics endpoints
   - Production: 300 requests/minute
   - Development: 1000 requests/minute

### Current Limitations

1. **Single database** - No read replicas
2. **No caching layer** - Every request hits database
3. **No CDN** - Static assets served from Next.js

### Future Improvements

1. **Add Redis caching**
   - Cache flight search results (5-15 min)
   - Cache season calculations (1 day)
   
2. **Database read replicas**
   - Separate read/write operations
   - Load balance read queries

3. **CDN for frontend**
   - Vercel/Cloudflare
   - Edge caching

4. **Background jobs** (Partially implemented)
   - Pre-calculate popular routes

---

## ✈️ Travel Class Support

### Overview

ระบบรองรับการคำนวณราคาตามชั้นโดยสาร (Travel Class) 3 ระดับ:

1. **Economy Class** (ชั้นประหยัด) - Multiplier: 1.0x
2. **Business Class** (ชั้นธุรกิจ) - Multiplier: 2.5x
3. **First Class** (ชั้นหนึ่ง) - Multiplier: 4.0x

### Price Calculation with Travel Class

```typescript
finalPrice = basePrice × 
             seasonalMultiplier × 
             tripTypeMultiplier × 
             travelClassMultiplier × 
             passengerCount

Where:
- travelClassMultiplier:
  - economy: 1.0x
  - business: 2.5x
  - first: 4.0x
```

### Database Storage

- คอลัมน์ `travel_class` ในตาราง `flight_prices` เก็บข้อมูลชั้นโดยสาร
- Default value: `'economy'`
- ถ้า database มีข้อมูล travel_class อยู่แล้ว ใช้ราคานั้นเลย
- ถ้าไม่มี (มีแค่ economy) ระบบจะคูณด้วย multiplier อัตโนมัติ

### API Usage

```typescript
// Request
{
  "origin": "bangkok",
  "destination": "chiang-mai",
  "travelClass": "business", // Optional, default: "economy"
  "passengerCount": 2,
  // ... other params
}

// Response price will be calculated with travel class multiplier
```

---

**Last Updated:** 2025-12-30
**Version:** 1.1.0

