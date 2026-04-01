#!/bin/bash
set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

echo "==========================================="
echo "  Plastmassa CRM Deploy"
echo "==========================================="

# .env tekshirish
if [ ! -f apps/backend/.env ]; then
  echo "!! apps/backend/.env fayl topilmadi!"
  echo ">> .env.production.example dan nusxa oling:"
  echo "   cp .env.production.example apps/backend/.env"
  echo "   nano apps/backend/.env"
  exit 1
fi

echo ""
echo ">> Pulling latest code..."
git pull origin main

echo ""
echo ">> Installing dependencies..."
npm install

echo ""
echo ">> Building shared package..."
npm run build:shared

echo ""
echo ">> Building backend..."
npm run build:api

echo ""
echo ">> Building frontend..."
npm run build:web

echo ""
echo ">> Creating directories..."
mkdir -p logs apps/backend/uploads

echo ""
echo ">> Restarting PM2 processes..."
pm2 restart ecosystem.config.js --env production 2>/dev/null || pm2 start ecosystem.config.js --env production

echo ""
echo "==========================================="
echo "  Deploy complete!"
echo "==========================================="
echo ""
pm2 status
echo ""
echo "  API:  http://localhost:6000"
echo "  Web:  http://localhost:6001"
echo ""
echo "  Loglar: pm2 logs"
echo "==========================================="
