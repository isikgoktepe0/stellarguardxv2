/**
 * stellarPayment.js
 * Core Stellar payment logic using @stellar/stellar-sdk.
 *
 * ⚠️  SECURITY NOTE:
 *     In production, the source secret key must NEVER travel over the network.
 *     This backend-signing approach is acceptable for hackathon demos only.
 *     Production systems should use client-side signing (e.g. Freighter wallet).
 */

const StellarSdk = require('@stellar/stellar-sdk');

// Connect to Stellar public network
const server = new StellarSdk.Horizon.Server('https://horizon.stellar.org');
const Networks = StellarSdk.Networks;

/**
 * Send XLM from one account to another.
 *
 * @param {object} params
 * @param {string} params.sourceSecret   - Source account secret key (S...)
 * @param {string} params.destination    - Destination public key (G...)
 * @param {string|number} params.amount  - Amount in XLM (e.g. "10.5")
 * @param {string} [params.memo]         - Optional text memo (max 28 bytes)
 * @returns {Promise<{ txHash: string, fee: number }>}
 */
async function sendPayment({ sourceSecret, destination, amount, memo }) {
  // 1. Derive key pair from secret
  const sourceKeypair = StellarSdk.Keypair.fromSecret(sourceSecret);
  const sourcePublicKey = sourceKeypair.publicKey();

  // 2. Validate destination address
  if (!StellarSdk.StrKey.isValidEd25519PublicKey(destination)) {
    throw new Error('Invalid destination address');
  }

  // 3. Load source account sequence number from Horizon
  let sourceAccount;
  try {
    sourceAccount = await server.loadAccount(sourcePublicKey);
  } catch (err) {
    if (err?.response?.status === 404) {
      throw new Error('Source account not found on the Stellar network. The account must be funded before sending payments.');
    }
    throw err;
  }

  // 4. Build the transaction
  const txBuilder = new StellarSdk.TransactionBuilder(sourceAccount, {
    fee: StellarSdk.BASE_FEE,          // current base fee in stroops
    networkPassphrase: Networks.PUBLIC, // mainnet
  });

  // 4a. Add payment operation
  // Stellar SDK requires exactly 7 decimal places as a string
  const amountStr = parseFloat(amount).toFixed(7);
  txBuilder.addOperation(
    StellarSdk.Operation.payment({
      destination,
      asset: StellarSdk.Asset.native(), // XLM
      amount: amountStr,
    })
  );

  // 4b. Optional memo (text, max 28 bytes)
  const memoText = memo && typeof memo === 'string' ? memo.trim() : '';
  if (memoText) {
    txBuilder.addMemo(StellarSdk.Memo.text(memoText.slice(0, 28)));
  }

  // 4c. Set transaction timeout (30 seconds)
  txBuilder.setTimeout(30);

  // 5. Build + sign
  const transaction = txBuilder.build();
  transaction.sign(sourceKeypair);

  // 6. Submit to Horizon
  const result = await server.submitTransaction(transaction);

  return {
    txHash: result.hash,
    fee:    parseInt(result.fee_charged || StellarSdk.BASE_FEE, 10),
    ledger: result.ledger,
    sourcePublicKey,
  };
}

/**
 * Validate a Stellar public key without throwing.
 * @param {string} address
 * @returns {boolean}
 */
function isValidAddress(address) {
  try {
    return StellarSdk.StrKey.isValidEd25519PublicKey(address);
  } catch {
    return false;
  }
}

/**
 * Validate a Stellar secret key without throwing.
 * @param {string} secret
 * @returns {boolean}
 */
function isValidSecret(secret) {
  try {
    return StellarSdk.StrKey.isValidEd25519SecretSeed(secret);
  } catch {
    return false;
  }
}

/**
 * Fetch the XLM balance of a public key.
 * @param {string} publicKey
 * @returns {Promise<string>} balance in XLM
 */
async function getBalance(publicKey) {
  try {
    const account = await server.loadAccount(publicKey);
    const native  = account.balances.find((b) => b.asset_type === 'native');
    return native ? native.balance : '0';
  } catch (err) {
    if (err?.response?.status === 404) return '0';
    throw err;
  }
}

module.exports = { sendPayment, isValidAddress, isValidSecret, getBalance };
