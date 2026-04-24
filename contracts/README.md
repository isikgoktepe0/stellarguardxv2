# StellarGuard Subscription Contract

Soroban smart contract for managing StellarGuard X subscriptions on-chain.

## Features

- ✅ Subscribe for 30 days with 100 wallet scans
- ✅ Check subscription status
- ✅ Consume scan credits
- ✅ Renew subscription (extends time + adds scans)
- ✅ Persistent storage on Stellar blockchain

## Contract Functions

### `subscribe(subscriber: Address) -> Subscription`
Creates a new subscription for 30 days (~518,400 ledgers) with 100 scans.

### `is_active(subscriber: Address) -> bool`
Checks if a subscriber has an active subscription with remaining scans.

### `consume_scan(subscriber: Address) -> u32`
Consumes one scan credit and returns remaining scans.

### `get_subscription(subscriber: Address) -> Option<Subscription>`
Returns subscription details for a subscriber.

### `renew(subscriber: Address) -> Subscription`
Renews subscription by adding 30 days and 100 scans.

## Build & Deploy

### Prerequisites
```bash
# Install Rust
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh

# Install Stellar CLI
cargo install --locked stellar-cli

# Add wasm32 target
rustup target add wasm32-unknown-unknown
```

### Build
```bash
cd contracts
stellar contract build
```

This creates `target/wasm32-unknown-unknown/release/stellarguard_subscription.wasm`

### Deploy to Testnet
```bash
# Configure testnet identity
stellar keys generate alice --network testnet

# Deploy contract
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellarguard_subscription.wasm \
  --source alice \
  --network testnet
```

### Test
```bash
cargo test
```

## Integration with Backend

Once deployed, update your backend to interact with the contract:

```javascript
const { Contract, SorobanRpc, TransactionBuilder, Networks } = require('@stellar/stellar-sdk');

const contractAddress = 'C...'; // Your deployed contract address
const server = new SorobanRpc.Server('https://soroban-testnet.stellar.org');

async function checkSubscription(subscriberAddress) {
  const contract = new Contract(contractAddress);
  const result = await contract.call('is_active', subscriberAddress);
  return result;
}
```

## Storage

- **Persistent Storage**: Subscription data is stored permanently on-chain
- **Key Format**: `(SUBSCRIPTION, Address)` tuple
- **Data Structure**: 
  ```rust
  Subscription {
    subscriber: Address,
    expires_at: u64,      // Ledger number
    scans_remaining: u32
  }
  ```

## Cost Estimation

- Deploy: ~0.5 XLM (one-time)
- Subscribe: ~0.001 XLM per transaction
- Consume scan: ~0.0001 XLM per transaction

## Security

- ✅ Requires authentication (`require_auth()`) for all state-changing operations
- ✅ Validates subscription expiry before allowing scans
- ✅ Prevents negative scan counts
- ✅ Immutable contract logic after deployment

## License

MIT
