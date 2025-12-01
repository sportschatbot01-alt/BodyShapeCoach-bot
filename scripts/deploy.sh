#!/bin/bash

# BodyShapeCoach Bot Deployment Script
# Author: System Admin
# Version: 1.0.0

set -e

echo "🚀 Starting BodyShapeCoach Bot Deployment"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check dependencies
echo "🔍 Checking dependencies..."
command -v npm >/dev/null 2>&1 || { echo -e "${RED}npm is required but not installed.${NC}"; exit 1; }
command -v wrangler >/dev/null 2>&1 || { echo -e "${RED}wrangler is required but not installed.${NC}"; exit 1; }

# Install dependencies
echo "📦 Installing dependencies..."
npm ci

# Run tests
echo "🧪 Running tests..."
npm test

# Create database if not exists
echo "🗄️ Setting up database..."
npm run db:init

# Apply migrations
echo "📝 Applying migrations..."
wrangler d1 migrations apply bodyshapecoach-db

# Deploy to Cloudflare
echo "☁️ Deploying to Cloudflare Workers..."
npm run deploy

# Set webhook
echo "🔄 Setting Telegram webhook..."
BOT_TOKEN=$(grep BOT_TOKEN .env | cut -d '=' -f2)
WORKER_URL=$(wrangler whoami | grep -o 'https://[^ ]*\.workers\.dev')
curl -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
    -H "Content-Type: application/json" \
    -d "{\"url\": \"${WORKER_URL}/webhook\"}"

# Generate initial subscription keys
echo "🔑 Generating initial subscription keys..."
node scripts/generate-keys.js --count=10 --type=monthly

echo -e "\n${GREEN}✅ Deployment completed successfully!${NC}"
echo -e "\n📊 Next steps:"
echo "1. Test the bot by messaging it on Telegram"
echo "2. Check logs: wrangler tail"
echo "3. Monitor database: wrangler d1 execute bodyshapecoach-db --command='SELECT COUNT(*) FROM users'"
echo "4. Generate admin keys: node scripts/generate-keys.js --admin"
