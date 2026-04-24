# 🚀 Quick Start: Deploy in 5 Minutes

## Prerequisites Check

```bash
# Check Rust
cargo --version
# If not installed: https://rustup.rs/

# Check Stellar CLI
stellar --version
# If not installed: cargo install --locked stellar-cli

# Add wasm32 target
rustup target add wasm32-unknown-unknown
```

## Deploy to Testnet (3 Steps)

### 1️⃣ Build Contract
```bash
cd contracts
stellar contract build
```

### 2️⃣ Create & Fund Identity
```bash
stellar keys generate deployer --network testnet
stellar keys fund deployer --network testnet
```

### 3️⃣ Deploy
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellarguard_subscription.wasm \
  --source deployer \
  --network testnet
```

**Save the Contract ID!** Example:
```
CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K
```

## Configure Backend

Create `backend/.env`:
```bash
STELLAR_NETWORK=testnet
SUBSCRIPTION_CONTRACT_ID=<YOUR_CONTRACT_ID>
PORT=4000
```

## Test Contract

```bash
# Get your address
stellar keys address deployer

# Subscribe
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- \
  subscribe \
  --subscriber <YOUR_ADDRESS>

# Check status
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source deployer \
  --network testnet \
  -- \
  is_active \
  --subscriber <YOUR_ADDRESS>
```

## Done! 🎉

Your contract is live on Stellar testnet. See [DEPLOYMENT.md](../DEPLOYMENT.md) for full documentation.

## Troubleshooting

**"stellar: command not found"**
```bash
cargo install --locked stellar-cli
```

**"wasm32-unknown-unknown not installed"**
```bash
rustup target add wasm32-unknown-unknown
```

**"Account not found"**
```bash
stellar keys fund deployer --network testnet
```

## Windows Users

Use PowerShell and run:
```powershell
.\deploy.ps1 testnet
```

This automates all steps above!
