# Script สำหรับแก้ไขปัญหา Docker container ที่ไม่รัน

Write-Host "🔧 Fixing Docker container issues..." -ForegroundColor Cyan
Write-Host ""

# 1. ตรวจสอบสถานะ
Write-Host "📊 Checking container status..." -ForegroundColor Yellow
docker-compose ps

Write-Host ""
Write-Host "📋 Checking logs..." -ForegroundColor Yellow
docker-compose logs --tail=20 postgres

Write-Host ""
Write-Host "🛑 Stopping containers..." -ForegroundColor Yellow
docker-compose down

Write-Host ""
Write-Host "🗑️  Removing old volumes..." -ForegroundColor Yellow
docker-compose down -v

Write-Host ""
Write-Host "🚀 Starting containers..." -ForegroundColor Yellow
docker-compose up -d

Write-Host ""
Write-Host "⏳ Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

Write-Host ""
Write-Host "📊 Final status:" -ForegroundColor Cyan
docker-compose ps

Write-Host ""
Write-Host "📋 Recent logs:" -ForegroundColor Cyan
docker-compose logs --tail=10 postgres

Write-Host ""
Write-Host "✅ Done! Check the status above." -ForegroundColor Green
Write-Host ""
Write-Host "💡 If still not working, check:" -ForegroundColor Yellow
Write-Host "   1. Docker Desktop is running"
Write-Host "   2. Port 5432 is not in use"
Write-Host "   3. Check full logs: docker-compose logs postgres"

