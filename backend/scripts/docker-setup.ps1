# PowerShell Script สำหรับ setup Docker PostgreSQL + TimescaleDB

Write-Host "🐳 Setting up PostgreSQL + TimescaleDB with Docker..." -ForegroundColor Cyan
Write-Host ""

# ตรวจสอบว่า Docker กำลังรันอยู่
try {
    docker info | Out-Null
    Write-Host "✅ Docker is running" -ForegroundColor Green
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host ""

# Start containers
Write-Host "📦 Starting PostgreSQL + TimescaleDB container..." -ForegroundColor Yellow
docker-compose up -d

# รอให้ database พร้อม
Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# ตรวจสอบสถานะ
Write-Host ""
Write-Host "📊 Container status:" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "🎉 Setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "💡 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Update .env file with database credentials"
Write-Host "   2. Run: npm run test:db"
Write-Host "   3. Run: npm run migrate"
Write-Host "   4. Run: npm run seed (optional)"
Write-Host "   5. Run: npm run dev"

