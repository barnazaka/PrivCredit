#!/usr/bin/env bash
# PrivCredit Quick Start Script
# Run this from the project root after cloning

set -e

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║       PrivCredit — Quick Start               ║"
echo "║  Confidential Private Credit Marketplace    ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── Smart Contracts ────────────────────────────────
echo "📦 Installing contract dependencies..."
cd contracts
npm install

echo ""
echo "🔨 Compiling contracts..."
npm run compile

echo ""
echo "─────────────────────────────────────────────"
echo "⚙️  CONTRACT SETUP REQUIRED"
echo "─────────────────────────────────────────────"
echo ""
echo "Before deploying, configure your contracts/.env file:"
echo ""
echo "  cd contracts"
echo "  cp .env.example .env"
echo "  # Edit .env with your PRIVATE_KEY"
echo ""
echo "Then deploy:"
echo "  npm run deploy:sepolia"
echo ""
echo "Copy the output addresses to frontend/.env.local"
echo ""

cd ..

# ── Frontend ───────────────────────────────────────
echo "📦 Installing frontend dependencies..."
cd frontend
npm install

echo ""
echo "─────────────────────────────────────────────"
echo "⚙️  FRONTEND SETUP REQUIRED"
echo "─────────────────────────────────────────────"
echo ""
echo "Configure your frontend/.env.local file:"
echo ""
echo "  cp .env.local.example .env.local"
echo "  # Edit .env.local with your contract addresses"
echo "  # and WalletConnect project ID"
echo ""
echo "Then run locally:"
echo "  npm run dev"
echo ""

cd ..

echo "─────────────────────────────────────────────"
echo "✅ Dependencies installed successfully!"
echo ""
echo "📖 Full setup instructions: README.md"
echo "─────────────────────────────────────────────"
echo ""
