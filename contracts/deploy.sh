#!/bin/bash

# StellarGuard Subscription Contract Deployment Script
# Usage: ./deploy.sh [testnet|mainnet]

set -e

NETWORK=${1:-testnet}
IDENTITY="stellarguard-deployer"

echo "🚀 Deploying StellarGuard Subscription Contract to $NETWORK"
echo ""

# Check if stellar CLI is installed
if ! command -v stellar &> /dev/null; then
    echo "❌ Stellar CLI not found. Install it with:"
    echo "   cargo install --locked stellar-cli"
    exit 1
fi

# Check if wasm32 target is installed
if ! rustup target list | grep -q "wasm32-unknown-unknown (installed)"; then
    echo "📦 Installing wasm32-unknown-unknown target..."
    rustup target add wasm32-unknown-unknown
fi

# Build the contract
echo "🔨 Building contract..."
stellar contract build

WASM_PATH="target/wasm32-unknown-unknown/release/stellarguard_subscription.wasm"

if [ ! -f "$WASM_PATH" ]; then
    echo "❌ Build failed: $WASM_PATH not found"
    exit 1
fi

echo "✅ Build successful: $WASM_PATH"
echo ""

# Check if identity exists
if ! stellar keys show $IDENTITY --network $NETWORK &> /dev/null; then
    echo "🔑 Creating new identity: $IDENTITY"
    stellar keys generate $IDENTITY --network $NETWORK
    
    if [ "$NETWORK" == "testnet" ]; then
        echo "💰 Funding testnet account..."
        stellar keys fund $IDENTITY --network testnet
    fi
else
    echo "🔑 Using existing identity: $IDENTITY"
fi

DEPLOYER_ADDRESS=$(stellar keys address $IDENTITY)
echo "📍 Deployer address: $DEPLOYER_ADDRESS"
echo ""

# Deploy the contract
echo "🚀 Deploying contract to $NETWORK..."
CONTRACT_ID=$(stellar contract deploy \
    --wasm $WASM_PATH \
    --source $IDENTITY \
    --network $NETWORK)

echo ""
echo "✅ Contract deployed successfully!"
echo ""
echo "📋 Contract Details:"
echo "   Network:     $NETWORK"
echo "   Contract ID: $CONTRACT_ID"
echo "   Deployer:    $DEPLOYER_ADDRESS"
echo ""
echo "🔗 Save this Contract ID in your backend:"
echo "   export SUBSCRIPTION_CONTRACT_ID=$CONTRACT_ID"
echo ""

# Save contract ID to file
echo "$CONTRACT_ID" > .contract-id-$NETWORK
echo "💾 Contract ID saved to .contract-id-$NETWORK"
echo ""

# Test the contract
echo "🧪 Testing contract..."
echo ""

# Subscribe test
echo "Testing subscribe function..."
stellar contract invoke \
    --id $CONTRACT_ID \
    --source $IDENTITY \
    --network $NETWORK \
    -- \
    subscribe \
    --subscriber $DEPLOYER_ADDRESS

echo ""
echo "Testing is_active function..."
stellar contract invoke \
    --id $CONTRACT_ID \
    --source $IDENTITY \
    --network $NETWORK \
    -- \
    is_active \
    --subscriber $DEPLOYER_ADDRESS

echo ""
echo "✅ Deployment and testing complete!"
echo ""
echo "📝 Next steps:"
echo "   1. Update backend/.env with:"
echo "      SUBSCRIPTION_CONTRACT_ID=$CONTRACT_ID"
echo "      STELLAR_NETWORK=$NETWORK"
echo ""
echo "   2. Install Stellar SDK in backend:"
echo "      cd backend && npm install @stellar/stellar-sdk"
echo ""
echo "   3. Update backend to use on-chain subscriptions"
echo ""
