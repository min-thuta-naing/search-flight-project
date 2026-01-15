# Script สำหรับตรวจสอบ TimescaleDB

Write-Host "🔍 Checking TimescaleDB setup..." -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣ Checking if TimescaleDB extension exists..." -ForegroundColor Yellow
docker-compose exec postgres psql -U postgres -d flight_search -c "SELECT * FROM pg_extension WHERE extname = 'timescaledb';"

Write-Host ""
Write-Host "2️⃣ Checking if extension is enabled..." -ForegroundColor Yellow
docker-compose exec postgres psql -U postgres -d flight_search -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';"

Write-Host ""
Write-Host "3️⃣ Checking if flight_prices table exists..." -ForegroundColor Yellow
docker-compose exec postgres psql -U postgres -d flight_search -c "\d flight_prices"

Write-Host ""
Write-Host "4️⃣ Checking if hypertable was created..." -ForegroundColor Yellow
docker-compose exec postgres psql -U postgres -d flight_search -c "SELECT hypertable_name FROM timescaledb_information.hypertables WHERE hypertable_name = 'flight_prices';" 2>&1

Write-Host ""
Write-Host "5️⃣ Alternative: Check if table is a hypertable..." -ForegroundColor Yellow
docker-compose exec postgres psql -U postgres -d flight_search -c "SELECT * FROM _timescaledb_catalog.hypertable WHERE table_name = 'flight_prices';" 2>&1

