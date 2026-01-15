# Script สำหรับสร้าง TimescaleDB extension และ hypertable

Write-Host "🔧 Setting up TimescaleDB..." -ForegroundColor Cyan
Write-Host ""

Write-Host "1️⃣ Creating TimescaleDB extension..." -ForegroundColor Yellow
docker-compose exec postgres psql -U postgres -d flight_search -c "CREATE EXTENSION IF NOT EXISTS timescaledb;"

Write-Host ""
Write-Host "2️⃣ Checking extension..." -ForegroundColor Yellow
docker-compose exec postgres psql -U postgres -d flight_search -c "SELECT extname, extversion FROM pg_extension WHERE extname = 'timescaledb';"

Write-Host ""
Write-Host "3️⃣ Creating hypertable..." -ForegroundColor Yellow
docker-compose exec postgres psql -U postgres -d flight_search -c "SELECT create_hypertable('flight_prices', 'departure_date', if_not_exists => TRUE, chunk_time_interval => INTERVAL '1 day', migrate_data => TRUE);"

Write-Host ""
Write-Host "4️⃣ Verifying hypertable..." -ForegroundColor Yellow
docker-compose exec postgres psql -U postgres -d flight_search -c "SELECT hypertable_name, num_dimensions FROM timescaledb_information.hypertables WHERE hypertable_name = 'flight_prices';"

Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green

