# Script สำหรับแก้ปัญหา PostgreSQL 18+ mount point

Write-Host "🔧 Fixing PostgreSQL 18+ mount point issue..." -ForegroundColor Cyan
Write-Host ""

Write-Host "📋 Issue: PostgreSQL 18+ requires mount at /var/lib/postgresql" -ForegroundColor Yellow
Write-Host "   (not /var/lib/postgresql/data)" -ForegroundColor Yellow
Write-Host ""

Write-Host "🛑 Stopping containers..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "🗑️  Removing old volumes (this will delete all data)..." -ForegroundColor Red
Write-Host "   Press Ctrl+C to cancel if you want to keep your data" -ForegroundColor Yellow
Start-Sleep -Seconds 3

docker-compose down -v

Write-Host ""
Write-Host "🧹 Cleaning up old containers..." -ForegroundColor Yellow
docker rm -f flight_search_db 2>$null

Write-Host ""
Write-Host "🚀 Starting container with correct mount point..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "⏳ Waiting for database to initialize (30 seconds)..." -ForegroundColor Yellow
Start-Sleep -Seconds 30

Write-Host ""
Write-Host "📊 Checking container status..." -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "📋 Checking logs..." -ForegroundColor Cyan
$logs = docker-compose logs --tail=30 postgres
Write-Host $logs

Write-Host ""
if ($logs -match "exited with code" -or $logs -match "FATAL" -or $logs -match "ERROR") {
    Write-Host "❌ Still having issues. Check logs above." -ForegroundColor Red
    Write-Host ""
    Write-Host "💡 Try using simple PostgreSQL image:" -ForegroundColor Yellow
    Write-Host "   docker-compose -f docker-compose.simple.yml up -d" -ForegroundColor Yellow
} else {
    Write-Host "✅ Container started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Next steps:" -ForegroundColor Yellow
    Write-Host "   1. Test connection: npm run test:db"
    Write-Host "   2. Run migrations: npm run migrate"
    Write-Host "   3. Start backend: npm run dev"
}

