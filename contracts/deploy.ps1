# StellarGuard Subscription Contract Deployment Script (PowerShell)
# Usage: .\deploy.ps1 [testnet|mainnet]

param(
    [string]$Network = "testnet"
)

$ErrorActionPreference = "Stop"

$IDENTITY = "stellarguard-deployer"

Write-Host "🚀 Deploying StellarGuard Subscription Contract to $Network" -ForegroundColor Cyan
Write-Host ""

# Check if stellar CLI is installed
if (-not (Get-Command stellar -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Stellar CLI not found. Install it with:" -ForegroundColor Red
    Write-Host "   cargo install --locked stellar-cli"
    exit 1
}

# Check if wasm32 target is installed
$targets = rustup target list
if ($targets -notmatch "wasm32-unknown-unknown \(installed\)") {
    Write-Host "📦 Installing wasm32-unknown-unknown target..." -ForegroundColor Yellow
    rustup target add wasm32-unknown-unknown
}

# Build the contract
Write-Host "🔨 Building contract..." -ForegroundColor Yellow
stellar contract build

$WASM_PATH = "target/wasm32-unknown-unknown/release/stellarguard_subscription.wasm"

if (-not (Test-Path $WASM_PATH)) {
    Write-Host "❌ Build failed: $WASM_PATH not found" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build successful: $WASM_PATH" -ForegroundColor Green
Write-Host ""

# Check if identity exists
try {
    stellar keys show $IDENTITY --network $Network 2>&1 | Out-Null
    Write-Host "🔑 Using existing identity: $IDENTITY" -ForegroundColor Green
} catch {
    Write-Host "🔑 Creating new identity: $IDENTITY" -ForegroundColor Yellow
    stellar keys generate $IDENTITY --network $Network
    
    if ($Network -eq "testnet") {
        Write-Host "💰 Funding testnet account..." -ForegroundColor Yellow
        stellar keys fund $IDENTITY --network testnet
    }
}

$DEPLOYER_ADDRESS = stellar keys address $IDENTITY
Write-Host "📍 Deployer address: $DEPLOYER_ADDRESS" -ForegroundColor Cyan
Write-Host ""

# Deploy the contract
Write-Host "🚀 Deploying contract to $Network..." -ForegroundColor Yellow
$CONTRACT_ID = stellar contract deploy `
    --wasm $WASM_PATH `
    --source $IDENTITY `
    --network $Network

Write-Host ""
Write-Host "✅ Contract deployed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Contract Details:" -ForegroundColor Cyan
Write-Host "   Network:     $Network"
Write-Host "   Contract ID: $CONTRACT_ID"
Write-Host "   Deployer:    $DEPLOYER_ADDRESS"
Write-Host ""
Write-Host "🔗 Save this Contract ID in your backend:" -ForegroundColor Yellow
Write-Host "   `$env:SUBSCRIPTION_CONTRACT_ID='$CONTRACT_ID'"
Write-Host ""

# Save contract ID to file
$CONTRACT_ID | Out-File -FilePath ".contract-id-$Network" -Encoding utf8
Write-Host "💾 Contract ID saved to .contract-id-$Network" -ForegroundColor Green
Write-Host ""

# Test the contract
Write-Host "🧪 Testing contract..." -ForegroundColor Yellow
Write-Host ""

# Subscribe test
Write-Host "Testing subscribe function..." -ForegroundColor Cyan
stellar contract invoke `
    --id $CONTRACT_ID `
    --source $IDENTITY `
    --network $Network `
    -- `
    subscribe `
    --subscriber $DEPLOYER_ADDRESS

Write-Host ""
Write-Host "Testing is_active function..." -ForegroundColor Cyan
stellar contract invoke `
    --id $CONTRACT_ID `
    --source $IDENTITY `
    --network $Network `
    -- `
    is_active `
    --subscriber $DEPLOYER_ADDRESS

Write-Host ""
Write-Host "✅ Deployment and testing complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📝 Next steps:" -ForegroundColor Yellow
Write-Host "   1. Update backend/.env with:"
Write-Host "      SUBSCRIPTION_CONTRACT_ID=$CONTRACT_ID"
Write-Host "      STELLAR_NETWORK=$Network"
Write-Host ""
Write-Host "   2. Install Stellar SDK in backend:"
Write-Host "      cd backend && npm install @stellar/stellar-sdk"
Write-Host ""
Write-Host "   3. Update backend to use on-chain subscriptions"
Write-Host ""
