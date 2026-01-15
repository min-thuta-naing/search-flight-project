# Flight Search Backend API

Backend API สำหรับ Flight Search Application ใช้ Node.js + Express + PostgreSQL + TimescaleDB

## 🚀 Features

- **RESTful API** สำหรับค้นหาและวิเคราะห์ราคาตั๋วเครื่องบิน
- **Smart Caching** - ใช้ PostgreSQL/TimescaleDB เป็น cache เพื่อเพิ่มประสิทธิภาพ
- **Automatic Airport Code Conversion** - แปลงชื่อจังหวัด/ประเทศเป็น airport code อัตโนมัติ
- **Seasonal Price Analysis** - วิเคราะห์ราคาตามฤดูกาลแบบ dynamic จากข้อมูลจริง
- **Price Prediction** - ทำนายราคาในอนาคตด้วย Linear Regression
- **TypeScript** สำหรับ type safety
- **Input Validation** ด้วย Zod
- **Rate Limiting** และ security middleware
- **Database Migrations** สำหรับจัดการ schema

## 📋 Prerequisites

- **Node.js** 18+ 
- **Docker** และ **Docker Compose** (สำหรับ PostgreSQL และ TimescaleDB)

> 💡 **ต้องการคู่มือการเริ่มต้นใช้งานแบบละเอียด?** ดู [GETTING_STARTED.md](./GETTING_STARTED.md)

## 🛠️ Quick Installation

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Environment Variables

คัดลอก `.env.example` เป็น `.env` และแก้ไขค่าตามต้องการ:

```bash
cp .env.example .env
```

แก้ไขไฟล์ `.env`:

```env
# Server Configuration
PORT=3001
NODE_ENV=development

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flight_search
DB_USER=postgres
DB_PASSWORD=postgres

# TimescaleDB Extension
ENABLE_TIMESCALEDB=true

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=200

# Scheduled Jobs (Optional)
ENABLE_SCHEDULED_JOBS=false
```

### 3. Setup Database with Docker Compose

#### Start PostgreSQL with TimescaleDB using Docker Compose

**แนะนำ: ใช้ `docker-compose.yml` (ไฟล์หลัก)**

```bash
npm run docker:up
```

หรือใช้ docker compose โดยตรง:

```bash
docker compose up -d
```

`docker-compose.yml` ใช้ `timescale/timescaledb:latest-pg18` image ซึ่งมี TimescaleDB ติดตั้งอยู่แล้ว

**Alternative: ใช้ `docker-compose.simple.yml` (สำหรับกรณีพิเศษ)**

ถ้ามีปัญหา Permission หรือต้องการใช้ PostgreSQL image ธรรมดา:

```bash
npm run docker:simple
```

หรือใช้ docker compose โดยตรง:

```bash
docker compose -f docker-compose.simple.yml up -d
```

จากนั้นต้องติดตั้ง TimescaleDB extension แยก:

```bash
# เชื่อมต่อ database
docker exec -it flight_search_db psql -U postgres -d flight_search

# Enable TimescaleDB extension
CREATE EXTENSION IF NOT EXISTS timescaledb;
\q
```

**Docker Compose จะ:**
- สร้าง PostgreSQL database container
- สร้าง database `flight_search` อัตโนมัติ
- ตั้งค่า user: `postgres`, password: `postgres`
- Expose port 5432

> 💡 **หมายเหตุ**: 
> - **`docker-compose.yml`** (แนะนำ) - TimescaleDB extension ติดตั้งอัตโนมัติแล้ว
> - **`docker-compose.simple.yml`** (alternative) - ต้องติดตั้ง TimescaleDB extension แยก

### 4. Run Migrations

```bash
npm run migrate
```

## 🏃 Running the Server

### Development Mode

```bash
npm run dev
```

Server จะรันที่ `http://localhost:3001`

### Production Mode

```bash
npm run build
npm start
```

## 📡 API Endpoints

### Health Check

```http
GET /api/health
```

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "service": "flight-search-api"
}
```

### Flight Analysis

```http
POST /api/flights/analyze
```

**Request Body:**
```json
{
  "origin": "Bangkok",
  "destination": "Chiang Mai",
  "durationRange": { "min": 2, "max": 5 },
  "selectedAirlines": ["TG", "FD"],
  "startDate": "2024-06-01",
  "endDate": "2024-06-30",
  "tripType": "round-trip",
  "passengerCount": 1
}
```

**Response:**
```json
{
  "seasons": {
    "high": { "price": 5000, "dates": ["2024-06-15", "2024-06-16"] },
    "normal": { "price": 3500, "dates": ["2024-06-10", "2024-06-11"] },
    "low": { "price": 2500, "dates": ["2024-06-05", "2024-06-06"] }
  },
  "recommendations": [...],
  "priceTrend": [...]
}
```

### Get Flight Prices

```http
POST /api/flights/prices
```

**Request Body:**
```json
{
  "origin": "Bangkok",
  "destination": "Chiang Mai",
  "startDate": "2024-06-01",
  "endDate": "2024-06-05",
  "tripType": "round-trip",
  "passengerCount": 2,
  "selectedAirlines": ["TG", "FD"]
}
```

### Get Available Airlines

```http
GET /api/flights/airlines?origin=BKK&destination=CNX
```

### Get Cheapest Dates

```http
POST /api/flights/cheapest-dates
```

**Request Body:**
```json
{
  "origin": "BKK",
  "destination": "CNX",
  "startDate": "2024-06-01",
  "endDate": "2024-06-30",
  "tripType": "round-trip"
}
```

### Predict Price

```http
POST /api/flights/predict-price
```

**Request Body:**
```json
{
  "origin": "BKK",
  "destination": "CNX",
  "targetDate": "2024-07-01",
  "tripType": "round-trip",
  "daysOfHistory": 90
}
```

### Get Price Trend

```http
POST /api/flights/price-trend
```

**Request Body:**
```json
{
  "origin": "BKK",
  "destination": "CNX",
  "tripType": "round-trip",
  "daysAhead": 30
}
```

### Predict Price Range

```http
POST /api/flights/predict-price-range
```

**Request Body:**
```json
{
  "origin": "BKK",
  "destination": "CNX",
  "startDate": "2024-07-01",
  "endDate": "2024-07-31",
  "tripType": "round-trip"
}
```

### Search Airports

```http
GET /api/airports/search?keyword=bangkok&subType=AIRPORT
```

**Query Parameters:**
- `keyword` (required) - คำค้นหา
- `subType` (optional) - `AIRPORT` หรือ `CITY`

### Get Airport Details

```http
GET /api/airports/:code
```

### Get All Airlines

```http
GET /api/airlines
```

### Get Airline by Code

```http
GET /api/airlines/:code
```

### Statistics

```http
POST /api/statistics/search
POST /api/statistics/price
GET /api/statistics
GET /api/statistics/price
```

## 🔧 Scripts

### Development

- `npm run dev` - Run development server with hot reload
- `npm run build` - Build TypeScript to JavaScript
- `npm start` - Run production server

### Database

- `npm run migrate` - Run database migrations
- `npm run migrate:up` - Run migrations (up)
- `npm run migrate:down` - Rollback migrations (down)

### Docker (Optional)

- `npm run docker:up` - Start Docker containers (ใช้ `docker-compose.yml` - **แนะนำ**)
- `npm run docker:simple` - Start simple PostgreSQL container (ใช้ `docker-compose.simple.yml` - alternative)
- `npm run docker:down` - Stop Docker containers
- `npm run docker:logs` - View Docker logs
- `npm run docker:restart` - Restart containers
- `npm run docker:reset` - Reset database (delete volumes and recreate)

### Code Quality

- `npm run lint` - Run ESLint

## 📁 Project Structure

```
backend/
├── src/
│   ├── config/              # Configuration files
│   │   ├── database.ts      # Database connection & TimescaleDB setup
│   │   └── server.ts         # Server configuration
│   ├── controllers/         # Request handlers
│   │   ├── flightController.ts
│   │   ├── airportController.ts
│   │   ├── airlineController.ts
│   │   └── statisticsController.ts
│   ├── database/            # Database related
│   │   ├── migrations/      # SQL migration files
│   │   └── migrate.ts       # Migration runner
│   ├── middleware/          # Express middleware
│   │   ├── errorHandler.ts
│   │   └── validation.ts
│   ├── models/              # Database models
│   │   ├── Flight.ts
│   │   ├── Airport.ts
│   │   └── SearchStatistics.ts
│   ├── routes/              # API routes
│   │   ├── flightRoutes.ts
│   │   ├── airportRoutes.ts
│   │   ├── airlineRoutes.ts
│   │   ├── statisticsRoutes.ts
│   │   └── index.ts
│   ├── services/            # Business logic
│   │   ├── flightAnalysisService.ts
│   │   ├── pricePredictionService.ts
│   │   ├── cacheService.ts
│   │   └── schedulerService.ts
│   ├── scripts/             # Utility scripts
│   ├── types/               # TypeScript types
│   │   └── index.ts
│   ├── utils/               # Utility functions
│   │   └── airportCodeConverter.ts
│   └── server.ts            # Express app entry point
├── .env.example              # Environment variables template
├── package.json
├── tsconfig.json
└── README.md
```

## 🗄️ Database Schema

### Tables

- **airports** - ข้อมูลสนามบิน
- **airlines** - ข้อมูลสายการบิน
- **routes** - เส้นทางการบิน
- **flight_prices** - ราคาตั๋วเครื่องบิน (TimescaleDB hypertable)
- **flight_prices_history** - ประวัติราคา (TimescaleDB hypertable)
- **search_statistics** - สถิติการค้นหา
- **price_statistics** - สถิติราคา

### TimescaleDB

ตาราง `flight_prices` และ `flight_prices_history` ถูกแปลงเป็น TimescaleDB hypertable เพื่อรองรับ time-series queries ที่มีประสิทธิภาพ

## ⚙️ Configuration

### Environment Variables

ดูรายละเอียดใน [env.example](./env.example)

## 🔒 Security

- **Helmet.js** สำหรับ security headers
- **CORS** configuration
- **Rate Limiting** - ป้องกัน API abuse
- **Input Validation** ด้วย Zod
- **Error Handling** แบบ centralized

## 📝 Notes

- **Database Setup**: แนะนำให้ใช้ Docker Compose สำหรับ PostgreSQL และ TimescaleDB (ง่ายและรวดเร็ว)
- TimescaleDB เป็น optional แต่แนะนำให้ใช้สำหรับประสิทธิภาพที่ดีขึ้น
- ถ้าไม่มี TimescaleDB ระบบจะทำงานได้ปกติแต่ไม่มี hypertable features
- Database migrations ควรรันแยกก่อน start server ใน production
- ระบบจะแปลงชื่อจังหวัด/ประเทศเป็น airport code อัตโนมัติ

### Alternative: Manual Installation

ถ้าไม่ต้องการใช้ Docker สามารถติดตั้ง PostgreSQL และ TimescaleDB แบบปกติได้:
- **PostgreSQL**: ดาวน์โหลดจาก [postgresql.org](https://www.postgresql.org/download/)
- **TimescaleDB**: ดูคำแนะนำที่ [timescale.com/docs](https://docs.timescale.com/install/latest/self-hosted/)

## 🐛 Troubleshooting

### Database Connection Issues

```bash
# Test database connection (using Docker)
docker exec -it flight_search_db psql -U postgres -d flight_search

# Or if psql is installed locally
psql -h localhost -U postgres -d flight_search
```

### Migration Issues

```bash
# Check migration status
npm run migrate

# Reset migrations (careful!)
# Delete schema_migrations table and re-run migrations
```

## 📚 Documentation

- **[GETTING_STARTED.md](./GETTING_STARTED.md)** - คู่มือการเริ่มต้นใช้งานแบบละเอียด

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📄 License

ISC
