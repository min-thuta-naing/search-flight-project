# Simple script to start Docker container

Write-Host "🐳 Starting PostgreSQL + TimescaleDB..." -ForegroundColor Cyan
Write-Host ""

# Stop any existing containers
Write-Host "🛑 Stopping existing containers..." -ForegroundColor Yellow
docker-compose down 2>$null

# Start containers
Write-Host "🚀 Starting containers..." -ForegroundColor Yellow
docker-compose up -d

# Wait a bit
Write-Host "⏳ Waiting for database to initialize..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

# Check status
Write-Host ""
Write-Host "📊 Container Status:" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "📋 Last 20 lines of logs:" -ForegroundColor Cyan
docker-compose logs --tail=20 postgres

Write-Host ""
$status = docker-compose ps --format json | ConvertFrom-Json
if ($status.State -eq "running") {
    Write-Host "✅ Container is running!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Test connection: npm run test:db"
    Write-Host "   2. Run migrations: npm run migrate"
    Write-Host "   3. Start backend: npm run dev"
} else {
    Write-Host "❌ Container is not running. Check logs above for errors." -ForegroundColor Red
    Write-Host ""
    Write-Host "🔍 To see full logs:" -ForegroundColor Yellow
    Write-Host "   docker-compose logs postgres"
}

