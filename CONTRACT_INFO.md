# 📋 StellarGuard X - Smart Contract Information

## Deployment Details

**Deployment Date:** April 24, 2026

**Network:** Stellar Testnet

**Contract ID:**
```
CB7K36JL25A4VO67X6FLIKCCGA2YJWI35CXZZGZ6FBV3UOQX6LLSPN5Q
```

**Deployer Address:**
```
GD4DKHCWBTQM6TMZHZT75WGC5OWMSKQETGUL42AEJGNBUYYTRZBJWEPT
```

---

## Deployment Transactions

### 1. WASM Upload Transaction
**Transaction Hash:** `3db825142ba902724ef213b5a07415a9ff58e07531ad53b3afb830ff382c812e`

**Explorer Link:** https://stellar.expert/explorer/testnet/tx/3db825142ba902724ef213b5a07415a9ff58e07531ad53b3afb830ff382c812e

**WASM Hash:** `823ad7c6ef1d090b4055b8591b737315148550aa6e93a654f1bd58d3613b542f`

**WASM Size:** 2,742 bytes

### 2. Contract Deployment Transaction
**Transaction Hash:** `a466532d5334a7b79e76b79d4b1e1be3a9b584f1344047f8ffa0f20556a073df`

**Explorer Link:** https://stellar.expert/explorer/testnet/tx/a466532d5334a7b79e76b79d4b1e1be3a9b584f1344047f8ffa0f20556a073df

---

## Contract Functions

### 1. `subscribe(subscriber: Address) -> Subscription`
Creates a new subscription for 30 days with 100 wallet scans.

**Example:**
```bash
stellar contract invoke \
  --id CB7K36JL25A4VO67X6FLIKCCGA2YJWI35CXZZGZ6FBV3UOQX6LLSPN5Q \
  --source stellarguard-deployer \
  --network testnet \
  -- \
  subscribe \
  --subscriber GD4DKHCWBTQM6TMZHZT75WGC5OWMSKQETGUL42AEJGNBUYYTRZBJWEPT
```

### 2. `is_active(subscriber: Address) -> bool`
Checks if a subscriber has an active subscription.

**Example:**
```bash
stellar contract invoke \
  --id CB7K36JL25A4VO67X6FLIKCCGA2YJWI35CXZZGZ6FBV3UOQX6LLSPN5Q \
  --source stellarguard-deployer \
  --network testnet \
  -- \
  is_active \
  --subscriber GD4DKHCWBTQM6TMZHZT75WGC5OWMSKQETGUL42AEJGNBUYYTRZBJWEPT
```

### 3. `consume_scan(subscriber: Address) -> u32`
Consumes one scan credit and returns remaining scans.

### 4. `get_subscription(subscriber: Address) -> Option<Subscription>`
Returns subscription details for a subscriber.

### 5. `renew(subscriber: Address) -> Subscription`
Renews subscription by adding 30 days and 100 scans.

---

## Explorer Links

- **Stellar Expert:** https://stellar.expert/explorer/testnet/contract/CB7K36JL25A4VO67X6FLIKCCGA2YJWI35CXZZGZ6FBV3UOQX6LLSPN5Q
- **Stellar Lab:** https://lab.stellar.org/r/testnet/contract/CB7K36JL25A4VO67X6FLIKCCGA2YJWI35CXZZGZ6FBV3UOQX6LLSPN5Q

---

## Integration with Backend

Update your `backend/.env` file:

```bash
STELLAR_NETWORK=testnet
SUBSCRIPTION_CONTRACT_ID=CB7K36JL25A4VO67X6FLIKCCGA2YJWI35CXZZGZ6FBV3UOQX6LLSPN5Q
PORT=4000
```

Install Stellar SDK:
```bash
cd backend
npm install @stellar/stellar-sdk
```

Use the contract in your backend:
```javascript
const { isSubscriptionActive } = require('./services/contractSubscription');

// Check subscription
const hasSubscription = await isSubscriptionActive('GXXX...');
```

---

## Contract Source Code

The contract source code is available in the `contracts/` directory:
- **Main Contract:** `contracts/src/lib.rs`
- **Build Config:** `contracts/Cargo.toml`
- **Deployment Scripts:** `contracts/deploy.sh` and `contracts/deploy.ps1`

---

## Subscription Details

- **Duration:** 30 days (~518,400 ledgers @ 5 seconds/ledger)
- **Scan Credits:** 100 wallet scans per subscription
- **Renewal:** Adds 30 days + 100 scans to existing subscription
- **Storage:** Persistent on-chain storage

---

## Cost Estimation

| Operation | Estimated Cost |
|-----------|----------------|
| Deploy Contract | ~0.5 XLM (one-time, already paid) |
| Subscribe | ~0.001 XLM per transaction |
| Check Status | Free (read-only simulation) |
| Consume Scan | ~0.0001 XLM per transaction |
| Renew | ~0.001 XLM per transaction |

---

## Security Features

✅ **Authentication Required** - All state-changing operations require `require_auth()`

✅ **Expiry Validation** - Subscription expiry checked before allowing scans

✅ **Credit Validation** - Prevents negative scan counts

✅ **Immutable Logic** - Contract logic cannot be changed after deployment

✅ **Persistent Storage** - Data stored permanently on Stellar blockchain

---

## Support & Documentation

- **Full Deployment Guide:** [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Quick Start:** [contracts/QUICKSTART.md](./contracts/QUICKSTART.md)
- **Contract README:** [contracts/README.md](./contracts/README.md)

---

## License

MIT License - See [LICENSE](./LICENSE) for details
