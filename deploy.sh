#!/bin/bash

echo "🚀 Deploying Body Shape Coach Bot..."

# Login to Cloudflare (if not already logged in)
wrangler login

# Deploy the worker
wrangler deploy

echo "✅ Deployment complete!"
echo "📝 Set webhook URL: https://api.telegram.org/bot8594081950:AAHriXP0h-iH_fj8_chys9CcFmSoaDOZk-4/setWebhook?url=https://body-shape-coach-bot.sportschatbot01.workers.dev"
