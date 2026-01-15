# Script สำหรับ reset migrations และรันใหม่

Write-Host "🔄 Resetting database migrations..." -ForegroundColor Cyan
Write-Host ""

Write-Host "⚠️  This will drop all tables and recreate them!" -ForegroundColor Yellow
Write-Host "   Press Ctrl+C to cancel" -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host ""
Write-Host "🗑️  Dropping all tables..." -ForegroundColor Yellow

# Connect to database and drop schema
docker-compose exec -T postgres psql -U postgres -d flight_search <<EOF
DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;
EOF

Write-Host "✅ Schema reset complete" -ForegroundColor Green

Write-Host ""
Write-Host "🔄 Running migrations..." -ForegroundColor Yellow
npm run migrate

Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green

