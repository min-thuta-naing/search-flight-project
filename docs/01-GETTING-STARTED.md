# 🚀 Getting Started Guide - Flight Search Project

เอกสารสำหรับนักพัฒนาที่เข้ามาพัฒนาต่อโปรเจค Flight Search System

---

## 📋 Table of Contents

1. [Prerequisites](#prerequisites)
2. [Initial Setup](#initial-setup)
3. [Database Setup](#database-setup)
4. [Environment Configuration](#environment-configuration)
5. [Running the Project](#running-the-project)
6. [Data Import](#data-import)
7. [Mock Data Generation](#mock-data-generation)
8. [Development Workflow](#development-workflow)
9. [Troubleshooting](#troubleshooting)

---

## 📦 Prerequisites

ติดตั้งซอฟต์แวร์ต่อไปนี้ก่อนเริ่มพัฒนา:

### Required Software

1. **Node.js** (v18+ recommended)
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **Docker Desktop** (แนะนำ - สำหรับรัน PostgreSQL)
   - Download: https://www.docker.com/products/docker-desktop
   - Verify: `docker --version` และ `docker-compose --version`
   - รวม PostgreSQL 18 + TimescaleDB อัตโนมัติ

   **หรือ**

   **PostgreSQL แบบติดตั้งเอง** (ถ้าไม่ใช้ Docker)
   - Download: https://www.postgresql.org/download/
   - Verify: `psql --version`
   - ต้องติดตั้ง TimescaleDB extension เพิ่มเติม

3. **Git**
   - Download: https://git-scm.com/
   - Verify: `git --version`

4. **Package Manager**
   - npm (มากับ Node.js) หรือ
   - pnpm (optional): `npm install -g pnpm`

---

## 🔧 Initial Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd Search-Flight_Project
```

### 2. Install Dependencies

#### Backend

```bash
cd backend
npm install
```

#### Frontend

```bash
cd frontend
npm install
```

---

## 🗄️ Database Setup

### วิธีที่ 1: Docker Compose (แนะนำ) 🐳

**ง่ายและรวดเร็วที่สุด!** PostgreSQL 18 + TimescaleDB พร้อมใช้งานทันที

```bash
cd backend

# Start PostgreSQL with TimescaleDB
docker-compose up -d

# ตรวจสอบว่า container รันแล้ว
docker ps

# Should see:
# CONTAINER ID   IMAGE                              STATUS
# xxxx          timescale/timescaledb:latest-pg18   Up
```

**Database จะพร้อมใช้งานที่:**
- Host: `localhost`
- Port: `5432`
- Database: `flight_search`
- User: `postgres`
- Password: `postgres`
- PostgreSQL Version: 18
- TimescaleDB: Included (latest-pg18)

**คำสั่งที่มีประโยชน์:**
```bash
# Stop database
docker-compose down

# Stop และลบข้อมูล
docker-compose down -v

# ดู logs
docker-compose logs -f postgres

# เข้า psql ใน container
docker exec -it flight_search_db psql -U postgres -d flight_search
```

### วิธีที่ 2: PostgreSQL แบบติดตั้งเอง

เปิด PostgreSQL และสร้าง database:

```bash
# Windows (PowerShell)
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres

# macOS/Linux
psql -U postgres
```

จากนั้นรันคำสั่ง SQL:

```sql
-- Create database
CREATE DATABASE flight_search;

-- Connect to database
\c flight_search

-- Enable TimescaleDB extension (optional)
-- Note: Only needed if ENABLE_TIMESCALEDB=true in .env
CREATE EXTENSION IF NOT EXISTS timescaledb;
```

### Run Migrations (ทั้ง 2 วิธี)

```bash
cd backend
npm run migrate
```

หรือรัน migration ทีละไฟล์:

**ถ้าใช้ Docker:**
```bash
# Windows PowerShell
cd backend
Get-ChildItem -Path ".\src\database\migrations\*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Running migration: $($_.Name)"
    Get-Content $_.FullName | docker exec -i flight_search_db psql -U postgres -d flight_search
}
```

**ถ้าติดตั้ง PostgreSQL เอง:**
```bash
# Windows PowerShell
Get-ChildItem -Path ".\src\database\migrations\*.sql" | Sort-Object Name | ForEach-Object {
    Write-Host "Running migration: $($_.Name)"
    & "C:\Program Files\PostgreSQL\16\bin\psql.exe" -U postgres -d flight_search -f $_.FullName
}
```

### Verify Database Schema

```sql
-- Check tables
\dt

-- Should see:
-- airlines
-- routes
-- flight_prices
-- weather_statistics
-- holiday_statistics
-- demand_statistics
-- search_statistics
-- thai_holidays
```

---

## ⚙️ Environment Configuration

### 1. Backend Environment Variables

สร้างไฟล์ `backend/.env`:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=flight_search
DB_USER=postgres
DB_PASSWORD=your_password

# TimescaleDB (Optional)
ENABLE_TIMESCALEDB=false  # Set to 'true' if using TimescaleDB

# Server Configuration
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

### 2. Frontend Environment Variables

สร้างไฟล์ `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

---

## 🚀 Running the Project

### 1. Start Backend Server

```bash
cd backend
npm run dev
```

Backend จะรันที่: **http://localhost:3001**

### 2. Start Frontend Server

```bash
cd frontend
npm run dev
```

Frontend จะรันที่: **http://localhost:3000**

### 3. Verify Setup

เปิดเบราว์เซอร์ไปที่:
- Frontend: http://localhost:3000
- Backend Health Check: http://localhost:3001/api/health

---

## 📥 Data Import

### 1. Import Daily Weather Data

```bash
cd backend

# Auto-detect latest CSV file
npm run import:daily-weather

# Or specify file
npm run import:daily-weather -- --csv="./data/daily_weather_data.csv"
```

**Expected output:**
```
✅ Import completed!
📊 Total records: 68,289
✅ Successfully stored: 68,289
```

### 2. Import Holiday Data

```bash
cd backend

# Fetch holidays from API
npm run fetch:holidays -- --start-year=2024 --end-year=2026

# Import holidays from CSV
npm run import:holidays

# Or specify CSV file
npm run import:holidays -- --csv="./data/thai_holidays_2024_2026_20251229_163536.csv"
```

ตรวจสอบข้อมูล:

```sql
SELECT COUNT(*) FROM thai_holidays;
-- Should return: 88 records (2024-2026)
```

---

## 🎲 Mock Data Generation

### Generate Flight Prices

```bash
cd backend
npm run generate:mock-flights -- --days-back=90 --days-forward=270
```

**Parameters:**
- `--days-back`: จำนวนวันย้อนหลัง (default: 30)
- `--days-forward`: จำนวนวันล่วงหน้า (default: 180)

**Expected output:**
```
✅ Generation completed!
📦 Airlines: 6
🛣️  Routes: 31 (BKK to all provinces)
✈️  Flights: 132,990
⏱️  Duration: ~30-40s
```

### Verify Generated Data

```sql
-- Check flight prices count
SELECT COUNT(*) FROM flight_prices;
-- Should see: 132,990

-- Check routes
SELECT origin, destination, COUNT(*) as flights
FROM routes r
JOIN flight_prices fp ON r.id = fp.route_id
GROUP BY r.id, origin, destination
ORDER BY origin, destination;
```

---

## 🔄 Development Workflow

### Daily Development Steps

1. **Pull Latest Changes**
   ```bash
   git pull origin main
   ```

2. **Install New Dependencies** (if any)
   ```bash
   cd backend && npm install
   cd frontend && npm install
   ```

3. **Run Migrations** (if new)
   ```bash
   cd backend
   npm run migrate
   ```

4. **Start Development Servers**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

### Before Making Changes

1. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make Changes & Test**

3. **Commit Changes**
   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

4. **Push & Create PR**
   ```bash
   git push origin feature/your-feature-name
   ```

---

## 🐛 Troubleshooting

### Backend Not Starting

**Problem:** Port 3001 already in use

```bash
# Windows: Kill process on port 3001
$process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | 
           Where-Object {$_.State -eq "Listen"} | 
           Select-Object -ExpandProperty OwningProcess -First 1
if ($process) { Stop-Process -Id $process -Force }
```

### Database Connection Failed

**Problem:** Cannot connect to PostgreSQL

```bash
# 1. Check if PostgreSQL is running
Get-Service -Name "postgresql*"

# 2. Verify credentials in .env file
# 3. Test connection
psql -U postgres -d flight_search -c "SELECT 1;"
```

### Migration Errors

**Problem:** Migration already applied

```bash
# Reset database (⚠️ CAUTION: Deletes all data)
psql -U postgres -c "DROP DATABASE flight_search;"
psql -U postgres -c "CREATE DATABASE flight_search;"
psql -U postgres -d flight_search -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

# Re-run migrations
cd backend
npm run migrate
```

### No Flight Data

**Problem:** Search returns no results

```sql
-- Check if mock data exists
SELECT COUNT(*) FROM flight_prices;

-- If 0, generate mock data:
```

```bash
cd backend
npm run generate:mock-flights -- --days-back=90 --days-forward=270
```

### Frontend Not Loading Data

**Problem:** API calls failing

1. **Check Backend is Running**
   ```bash
   curl http://localhost:3001/api/health
   ```

2. **Check CORS Configuration**
   - Verify `CORS_ORIGIN` in `backend/.env`
   - Should be: `http://localhost:3000`

3. **Check API URL**
   - Verify `NEXT_PUBLIC_API_URL` in `frontend/.env.local`
   - Should be: `http://localhost:3001/api`


## 📊 Verify Everything Works

### Quick Health Check

```bash
# 1. Backend health
curl http://localhost:3001/api/health

# 2. Database connection
psql -U postgres -d flight_search -c "SELECT COUNT(*) FROM flight_prices;"

# 3. Frontend loads
curl http://localhost:3000
```

### Test Flight Search

1. Open: http://localhost:3000
2. Search:
   - From: **Bangkok**
   - To: **Chiang Mai**
   - Date: **Any future date**
   - Trip Type: **One-way**
3. Should see:
   - ✅ Flight search results
   - ✅ Price comparison
   - ✅ Seasonal breakdown with 3 colors
   - ✅ Best time to fly recommendation

---

## 📚 Next Steps

1. Read **02-SQL-COMMANDS.md** - SQL commands for data management
2. Read **03-SYSTEM-DOCUMENTATION.md** - System architecture & formulas
3. Explore codebase:
   - `backend/src/services/` - Business logic
   - `backend/src/controllers/` - API endpoints
   - `frontend/components/` - UI components

---

## 🆘 Need Help?

- Check logs: `backend/logs/` และ browser console
- Review error messages in terminal
- Consult other documentation files in `docs/`

---

**Last Updated:** 2025-12-30
**Version:** 1.0.0

