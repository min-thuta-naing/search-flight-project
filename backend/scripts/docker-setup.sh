#!/bin/bash

# Script สำหรับ setup Docker PostgreSQL + TimescaleDB
# สำหรับ Windows: ใช้ Git Bash หรือ WSL

echo "🐳 Setting up PostgreSQL + TimescaleDB with Docker..."
echo ""

# ตรวจสอบว่า Docker กำลังรันอยู่
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop first."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Start containers
echo "📦 Starting PostgreSQL + TimescaleDB container..."
docker-compose up -d

# รอให้ database พร้อม
echo "⏳ Waiting for database to be ready..."
sleep 5

# ตรวจสอบสถานะ
if docker-compose ps | grep -q "Up (healthy)"; then
    echo "✅ Database is ready!"
    echo ""
    echo "📊 Container status:"
    docker-compose ps
    echo ""
    echo "🎉 Setup complete!"
    echo ""
    echo "💡 Next steps:"
    echo "   1. Update .env file with database credentials"
    echo "   2. Run: npm run test:db"
    echo "   3. Run: npm run migrate"
    echo "   4. Run: npm run seed (optional)"
    echo "   5. Run: npm run dev"
else
    echo "⚠️  Database might still be starting. Check logs with:"
    echo "   docker-compose logs -f postgres"
fi

