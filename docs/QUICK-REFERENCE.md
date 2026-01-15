# ⚡ Quick Reference Card

คำสั่งที่ใช้บ่อยสำหรับการพัฒนา Flight Search Project

---

## 🚀 Start/Stop Servers

```bash
# Start Database (Docker) 🐳
cd backend
docker-compose up -d

# Start Backend
npm run dev

# Start Frontend  
cd frontend
npm run dev

# Stop Database
cd backend
docker-compose down

# Kill Backend (Windows)
$process = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"} | Select-Object -ExpandProperty OwningProcess -First 1; if ($process) { Stop-Process -Id $process -Force }

# Kill Frontend (Windows)
$process = Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Where-Object {$_.State -eq "Listen"} | Select-Object -ExpandProperty OwningProcess -First 1; if ($process) { Stop-Process -Id $process -Force }
```

---

## 🗄️ Database Commands

### Connect to Database

**Docker (แนะนำ):**
```bash
docker exec -it flight_search_db psql -U postgres -d flight_search
```

**PostgreSQL แบบติดตั้งเอง:**
```bash
psql -U postgres -d flight_search
```

### Quick Checks
```sql
-- Count all flights
SELECT COUNT(*) FROM flight_prices;

-- Check date range
SELECT MIN(departure_date) as earliest, MAX(departure_date) as latest FROM flight_prices;

-- Count by route
SELECT r.origin, r.destination, COUNT(*) as flights
FROM routes r
JOIN flight_prices fp ON r.id = fp.route_id
GROUP BY r.id, r.origin, r.destination
ORDER BY flights DESC;

-- Check airlines
SELECT * FROM airlines;

-- Check weather data
SELECT COUNT(*) FROM weather_statistics;

-- Check holidays
SELECT COUNT(*) FROM thai_holidays;
```

### Clear Data
```sql
-- Clear flight prices only (keeps routes)
TRUNCATE TABLE flight_prices;

-- Clear routes and flights
TRUNCATE TABLE routes, flight_prices CASCADE;

-- Clear all data (⚠️ DANGER!)
TRUNCATE TABLE airlines, routes, flight_prices, weather_statistics, holiday_statistics CASCADE;
```

---

## 🎲 Mock Data Generation

```bash
cd backend

# Generate 360 days of data (default: 90 back, 270 forward)
npm run generate:mock-flights -- --days-back=90 --days-forward=270

# Generate 1 year of data
npm run generate:mock-flights -- --days-back=180 --days-forward=180

# Generate 30 days only
npm run generate:mock-flights -- --days-back=0 --days-forward=30
```

**Expected:** ~130,000-140,000 flights in 30-40 seconds

---

## 📥 Data Import

```bash
cd backend

# Import daily weather data (auto-detect latest CSV)
npm run import:daily-weather

# Import specific CSV file
npm run import:daily-weather -- --csv="./data/daily_weather_data.csv"

# Import holidays
npm run import:holidays
```

---

## 🔍 Testing

### Test Backend Health
```bash
curl http://localhost:3001/api/health
```

### Test Flight Search (PowerShell)
```powershell
$body = @{
  origin = "bangkok"
  destination = "chiang-mai"
  departureDate = "2025-12-30"
  tripType = "one-way"
  durationRange = @{ min = 0; max = 720 }
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Uri "http://localhost:3001/api/flights/analyze" -Method POST -Body $body -ContentType "application/json"
```

---

## 🗃️ Database Maintenance

```sql
-- Analyze tables for query optimization
ANALYZE flight_prices;
ANALYZE routes;

-- Check table sizes
SELECT 
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Check indexes
SELECT tablename, indexname FROM pg_indexes WHERE schemaname = 'public';

-- Vacuum to reclaim space
VACUUM flight_prices;
```

---

## 🔄 Git Workflow

```bash
# Pull latest changes
git pull origin main

# Create feature branch
git checkout -b feature/your-feature-name

# Check status
git status

# Stage changes
git add .

# Commit
git commit -m "feat: your feature description"

# Push
git push origin feature/your-feature-name
```

---

## 📊 Useful Queries

### Find Cheapest Flights
```sql
SELECT 
  fp.departure_date,
  fp.price,
  a.name as airline,
  r.origin || ' -> ' || r.destination as route
FROM flight_prices fp
JOIN routes r ON fp.route_id = r.id
JOIN airlines a ON fp.airline_id = a.id
WHERE r.origin = 'BKK' AND r.destination = 'CNX'
  AND fp.departure_date >= CURRENT_DATE
ORDER BY fp.price
LIMIT 10;
```

### Price Statistics by Month
```sql
SELECT 
  TO_CHAR(departure_date, 'YYYY-MM') as month,
  COUNT(*) as flights,
  MIN(price) as min_price,
  MAX(price) as max_price,
  AVG(price)::DECIMAL(10,2) as avg_price
FROM flight_prices fp
JOIN routes r ON fp.route_id = r.id
WHERE r.origin = 'BKK' AND r.destination = 'CNX'
GROUP BY TO_CHAR(departure_date, 'YYYY-MM')
ORDER BY month;
```

### Most Expensive Routes
```sql
SELECT 
  r.origin || ' -> ' || r.destination as route,
  AVG(fp.price)::DECIMAL(10,2) as avg_price,
  MIN(fp.price) as min_price,
  MAX(fp.price) as max_price
FROM routes r
JOIN flight_prices fp ON r.id = fp.route_id
GROUP BY r.id, r.origin, r.destination
ORDER BY avg_price DESC
LIMIT 10;
```

---

## 🐛 Common Issues

### Port Already in Use
```bash
# Windows PowerShell
$process = Get-NetTCPConnection -LocalPort 3001 | Select-Object -ExpandProperty OwningProcess -First 1
Stop-Process -Id $process -Force
```

### Database Connection Failed
```bash
# Check PostgreSQL service
Get-Service -Name "postgresql*"

# Test connection
psql -U postgres -d flight_search -c "SELECT 1;"
```

### No Flight Data
```bash
# Check count
psql -U postgres -d flight_search -c "SELECT COUNT(*) FROM flight_prices;"

# If 0, generate data
cd backend
npm run generate:mock-flights -- --days-back=90 --days-forward=270
```

### Migration Errors
```bash
# Re-run migrations
cd backend
npm run migrate

# Or manually
Get-ChildItem -Path ".\src\database\migrations\*.sql" | Sort-Object Name | ForEach-Object {
    psql -U postgres -d flight_search -f $_.FullName
}
```

---

## 📁 Important Paths

```
Backend:
  - Controllers: backend/src/controllers/
  - Services: backend/src/services/
  - Models: backend/src/models/
  - Migrations: backend/src/database/migrations/
  - Scripts: backend/src/scripts/ (see 04-SCRIPTS-REFERENCE.md)
  - Data: backend/data/
  - Docker: backend/docker-compose.yml

Frontend:
  - Pages: frontend/app/
  - Components: frontend/components/
  - Utils: frontend/lib/

Docs:
  - Getting Started: docs/01-GETTING-STARTED.md (with Docker setup)
  - SQL Commands: docs/02-SQL-COMMANDS.md
  - System Docs: docs/03-SYSTEM-DOCUMENTATION.md
  - Scripts Guide: docs/04-SCRIPTS-REFERENCE.md ⭐ NEW!
  - Quick Reference: docs/QUICK-REFERENCE.md
```

---

## 🔗 URLs

- **Frontend:** http://localhost:3000
- **Backend:** http://localhost:3001
- **API Health:** http://localhost:3001/api/health
- **API Base:** http://localhost:3001/api

---

## 📦 NPM Scripts

### Backend
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run migrate          # Run database migrations
npm run generate:mock-flights  # Generate mock flight data
npm run import:daily-weather   # Import daily weather data from CSV
```

### Frontend
```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run start            # Start production server
npm run lint             # Run ESLint
```

---

## 🎯 Key Formulas

### Mock Price Calculation
```
price = basePrice × seasonalMultiplier × tripTypeMultiplier × randomVariation

basePrice = 1000 + (distance_km × 0.15)
seasonalMultiplier = 0.7-1.5x (depends on month)
tripTypeMultiplier = 1.0 (one-way) or 1.8 (round-trip)
randomVariation = 0.98-1.02 (±2%)
```

### Season Score
```
seasonScore = (pricePercentile × 0.6) + 
              (holidayScore × 0.3) + 
              (weatherScore × 0.1)
```

### Season Classification
```
seasonScore < p33 → Low Season (🟢)
p33 ≤ seasonScore < p67 → Normal Season (🔵)
seasonScore ≥ p67 → High Season (🔴)
```

---

## 📞 Quick Help

**Need more details?** Check:
- [Getting Started Guide](./01-GETTING-STARTED.md)
- [SQL Commands Reference](./02-SQL-COMMANDS.md)
- [System Documentation](./03-SYSTEM-DOCUMENTATION.md)

---

**Last Updated:** 2025-12-30

