/**
 * contractSubscription.js
 * Integration with StellarGuard Subscription Soroban Contract
 */

const {
  Contract,
  SorobanRpc,
  TransactionBuilder,
  Networks,
  Keypair,
  nativeToScVal,
  Address,
  scValToNative,
} = require('@stellar/stellar-sdk');

// Configuration
const CONTRACT_ID = process.env.SUBSCRIPTION_CONTRACT_ID || '';
const NETWORK = process.env.STELLAR_NETWORK || 'testnet';
const RPC_URL = NETWORK === 'mainnet'
  ? 'https://soroban-rpc.mainnet.stellar.org'
  : 'https://soroban-testnet.stellar.org';

const server = new SorobanRpc.Server(RPC_URL);
const networkPassphrase = NETWORK === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

/**
 * Check if a subscriber has an active subscription
 * @param {string} subscriberAddress - Stellar public key (G...)
 * @returns {Promise<boolean>}
 */
async function isSubscriptionActive(subscriberAddress) {
  if (!CONTRACT_ID) {
    console.warn('⚠️  SUBSCRIPTION_CONTRACT_ID not set, falling back to in-memory');
    return false;
  }

  try {
    const contract = new Contract(CONTRACT_ID);
    
    // Build the contract call
    const account = await server.getAccount(subscriberAddress);
    const builtTransaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          'is_active',
          nativeToScVal(subscriberAddress, { type: 'address' })
        )
      )
      .setTimeout(30)
      .build();

    // Simulate the transaction (read-only, no fees)
    const simulation = await server.simulateTransaction(builtTransaction);

    if (simulation.error) {
      console.error('Contract simulation error:', simulation.error);
      return false;
    }

    // Parse the result
    const result = scValToNative(simulation.result.retval);
    return result === true;
  } catch (error) {
    console.error('Error checking subscription:', error.message);
    return false;
  }
}

/**
 * Subscribe a wallet (requires signing)
 * @param {string} subscriberSecret - Stellar secret key (S...)
 * @returns {Promise<object>} Subscription details
 */
async function subscribe(subscriberSecret) {
  if (!CONTRACT_ID) {
    throw new Error('SUBSCRIPTION_CONTRACT_ID not configured');
  }

  const keypair = Keypair.fromSecret(subscriberSecret);
  const subscriberAddress = keypair.publicKey();

  try {
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(subscriberAddress);

    // Build transaction
    const builtTransaction = new TransactionBuilder(account, {
      fee: '1000',
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          'subscribe',
          nativeToScVal(subscriberAddress, { type: 'address' })
        )
      )
      .setTimeout(30)
      .build();

    // Prepare transaction
    const preparedTx = await server.prepareTransaction(builtTransaction);
    
    // Sign
    preparedTx.sign(keypair);

    // Submit
    const result = await server.sendTransaction(preparedTx);
    
    // Wait for confirmation
    let status = await server.getTransaction(result.hash);
    while (status.status === 'PENDING' || status.status === 'NOT_FOUND') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await server.getTransaction(result.hash);
    }

    if (status.status === 'SUCCESS') {
      const subscription = scValToNative(status.returnValue);
      return {
        success: true,
        txHash: result.hash,
        subscription,
      };
    } else {
      throw new Error(`Transaction failed: ${status.status}`);
    }
  } catch (error) {
    console.error('Error subscribing:', error.message);
    throw error;
  }
}

/**
 * Consume one scan credit
 * @param {string} subscriberSecret - Stellar secret key (S...)
 * @returns {Promise<number>} Remaining scans
 */
async function consumeScan(subscriberSecret) {
  if (!CONTRACT_ID) {
    throw new Error('SUBSCRIPTION_CONTRACT_ID not configured');
  }

  const keypair = Keypair.fromSecret(subscriberSecret);
  const subscriberAddress = keypair.publicKey();

  try {
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(subscriberAddress);

    const builtTransaction = new TransactionBuilder(account, {
      fee: '1000',
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          'consume_scan',
          nativeToScVal(subscriberAddress, { type: 'address' })
        )
      )
      .setTimeout(30)
      .build();

    const preparedTx = await server.prepareTransaction(builtTransaction);
    preparedTx.sign(keypair);

    const result = await server.sendTransaction(preparedTx);
    
    let status = await server.getTransaction(result.hash);
    while (status.status === 'PENDING' || status.status === 'NOT_FOUND') {
      await new Promise(resolve => setTimeout(resolve, 1000));
      status = await server.getTransaction(result.hash);
    }

    if (status.status === 'SUCCESS') {
      const remaining = scValToNative(status.returnValue);
      return remaining;
    } else {
      throw new Error(`Transaction failed: ${status.status}`);
    }
  } catch (error) {
    console.error('Error consuming scan:', error.message);
    throw error;
  }
}

/**
 * Get subscription details
 * @param {string} subscriberAddress - Stellar public key (G...)
 * @returns {Promise<object|null>}
 */
async function getSubscription(subscriberAddress) {
  if (!CONTRACT_ID) {
    return null;
  }

  try {
    const contract = new Contract(CONTRACT_ID);
    const account = await server.getAccount(subscriberAddress);

    const builtTransaction = new TransactionBuilder(account, {
      fee: '100',
      networkPassphrase,
    })
      .addOperation(
        contract.call(
          'get_subscription',
          nativeToScVal(subscriberAddress, { type: 'address' })
        )
      )
      .setTimeout(30)
      .build();

    const simulation = await server.simulateTransaction(builtTransaction);

    if (simulation.error) {
      return null;
    }

    const result = scValToNative(simulation.result.retval);
    return result;
  } catch (error) {
    console.error('Error getting subscription:', error.message);
    return null;
  }
}

module.exports = {
  isSubscriptionActive,
  subscribe,
  consumeScan,
  getSubscription,
};
