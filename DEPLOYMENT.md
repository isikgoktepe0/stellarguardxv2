# 🚀 StellarGuard X Deployment Guide

Complete guide to deploy the StellarGuard X smart contract and backend.

---

## Prerequisites

### 1. Install Rust & Cargo
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source $HOME/.cargo/env
```

### 2. Install Stellar CLI
```bash
cargo install --locked stellar-cli
```

### 3. Add WebAssembly Target
```bash
rustup target add wasm32-unknown-unknown
```

### 4. Install Node.js Dependencies
```bash
cd backend
npm install @stellar/stellar-sdk
```

---

## Contract Deployment

### Option 1: Automated Deployment (Recommended)

#### Windows (PowerShell)
```powershell
cd contracts
.\deploy.ps1 testnet
```

#### Linux/Mac (Bash)
```bash
cd contracts
chmod +x deploy.sh
./deploy.sh testnet
```

### Option 2: Manual Deployment

#### Step 1: Build Contract
```bash
cd contracts
stellar contract build
```

This creates: `target/wasm32-unknown-unknown/release/stellarguard_subscription.wasm`

#### Step 2: Generate Deployer Identity
```bash
stellar keys generate stellarguard-deployer --network testnet
```

#### Step 3: Fund Testnet Account
```bash
stellar keys fund stellarguard-deployer --network testnet
```

#### Step 4: Deploy Contract
```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellarguard_subscription.wasm \
  --source stellarguard-deployer \
  --network testnet
```

**Save the Contract ID** — you'll need it for backend configuration.

Example output:
```
CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K
```

---

## Backend Configuration

### 1. Update Environment Variables

Create `backend/.env`:
```bash
STELLAR_NETWORK=testnet
SUBSCRIPTION_CONTRACT_ID=CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K
PORT=4000
```

### 2. Update Server to Use Contract

Edit `backend/server.js` to use the contract-based subscription:

```javascript
const { isSubscriptionActive } = require('./services/contractSubscription');

app.get('/analyze', async (req, res) => {
  const { wallet, subscriber } = req.query;

  // Check on-chain subscription
  const hasSubscription = await isSubscriptionActive(subscriber);
  
  if (!hasSubscription) {
    return res.status(402).json({
      error: 'No active subscription',
      code: 'SUBSCRIPTION_EXPIRED',
    });
  }

  // Continue with analysis...
});
```

---

## Testing the Contract

### 1. Test Subscribe Function
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source stellarguard-deployer \
  --network testnet \
  -- \
  subscribe \
  --subscriber <YOUR_ADDRESS>
```

### 2. Test is_active Function
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source stellarguard-deployer \
  --network testnet \
  -- \
  is_active \
  --subscriber <YOUR_ADDRESS>
```

### 3. Test consume_scan Function
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source stellarguard-deployer \
  --network testnet \
  -- \
  consume_scan \
  --subscriber <YOUR_ADDRESS>
```

---

## Frontend Integration

### 1. Install Freighter Wallet
Users need [Freighter](https://www.freighter.app/) browser extension.

### 2. Update Frontend to Call Contract

```javascript
import { Contract, SorobanRpc } from '@stellar/stellar-sdk';

const CONTRACT_ID = 'CBQHNAXSI55GX2GN6D67GK7BHVPSLJUGZQEU7WJ5LKR5PNUCGLIMAO4K';

async function subscribeUser() {
  const { publicKey } = await window.freighter.getPublicKey();
  
  // Call backend endpoint that triggers contract
  const response = await fetch('/api/subscription/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subscriber: publicKey }),
  });
  
  return response.json();
}
```

---

## Mainnet Deployment

### ⚠️ Before Mainnet Deployment

1. **Audit the contract** — review all code thoroughly
2. **Test extensively** on testnet
3. **Fund deployer account** with real XLM
4. **Update environment** to `mainnet`

### Deploy to Mainnet
```bash
cd contracts
./deploy.sh mainnet
```

Update `backend/.env`:
```bash
STELLAR_NETWORK=mainnet
SUBSCRIPTION_CONTRACT_ID=<MAINNET_CONTRACT_ID>
```

---

## Cost Estimation

| Operation | Estimated Cost |
|-----------|----------------|
| Deploy Contract | ~0.5 XLM (one-time) |
| Subscribe | ~0.001 XLM |
| Check Status | Free (read-only) |
| Consume Scan | ~0.0001 XLM |

---

## Troubleshooting

### "Contract not found"
- Verify CONTRACT_ID is correct
- Check network (testnet vs mainnet)
- Ensure contract was deployed successfully

### "Insufficient balance"
- Fund your testnet account: `stellar keys fund <identity> --network testnet`
- For mainnet, send XLM to deployer address

### "Transaction failed"
- Check account has enough XLM for fees
- Verify subscriber has active subscription
- Review transaction error details

---

## Monitoring

### Check Contract State
```bash
stellar contract invoke \
  --id <CONTRACT_ID> \
  --source stellarguard-deployer \
  --network testnet \
  -- \
  get_subscription \
  --subscriber <ADDRESS>
```

### View Transaction History
Visit Stellar Expert:
- Testnet: https://stellar.expert/explorer/testnet/contract/<CONTRACT_ID>
- Mainnet: https://stellar.expert/explorer/public/contract/<CONTRACT_ID>

---

## Security Best Practices

1. ✅ Never commit `.env` files with real credentials
2. ✅ Use hardware wallets for mainnet deployments
3. ✅ Implement rate limiting on backend endpoints
4. ✅ Validate all user inputs
5. ✅ Monitor contract for unusual activity
6. ✅ Keep Stellar SDK updated

---

## Support

- Stellar Docs: https://developers.stellar.org/docs
- Soroban Docs: https://soroban.stellar.org/docs
- Discord: https://discord.gg/stellardev

---

## License

MIT
