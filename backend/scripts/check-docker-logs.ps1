# Script สำหรับตรวจสอบ Docker logs
Write-Host "📋 Checking Docker container logs..." -ForegroundColor Cyan
Write-Host ""
docker-compose logs --tail=50 postgres

