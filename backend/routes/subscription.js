/**
 * routes/subscription.js — TESTNET version
 *
 * GET  /api/subscription/plans
 * GET  /api/subscription/status/:wallet
 * POST /api/subscription/activate
 */

const express = require('express');
const router  = express.Router();
const StellarSdk = require('@stellar/stellar-sdk');

const { PLANS, activateSubscription, getSubscription } = require('../utils/subscriptionStore');
const { isValidAddress } = require('../services/stellarPayment');

// ── Testnet Horizon ───────────────────────────────────────────────────────────
const horizon = new StellarSdk.Horizon.Server('https://horizon-testnet.stellar.org');

// Treasury = your wallet (receives subscription payments on testnet)
const TREASURY_WALLET = 'GDVDUG3ILMW555NI2WTEQY4LDMW5O4UDDKOLUCEZTAR5CNNFSZMXGLWJ';

// ── GET /api/subscription/plans ───────────────────────────────────────────────
router.get('/plans', (_req, res) => {
  const plans = Object.entries(PLANS).map(([id, p]) => ({
    id,
    name:       p.name,
    price:      p.price,
    scansLimit: p.scansLimit === Infinity ? 'Unlimited' : p.scansLimit,
    duration:   '30 days',
    features:   planFeatures(id),
  }));
  res.json({ plans, treasury: TREASURY_WALLET, network: 'TESTNET' });
});

// ── GET /api/subscription/status/:wallet ──────────────────────────────────────
router.get('/status/:wallet', (req, res) => {
  const { wallet } = req.params;
  if (!isValidAddress(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }
  const sub = getSubscription(wallet);
  return res.json({ wallet, subscription: sub });
});

// ── POST /api/subscription/activate ──────────────────────────────────────────
router.post('/activate', async (req, res) => {
  const { wallet, plan, txHash } = req.body;

  if (!wallet || !isValidAddress(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }
  if (!plan || !PLANS[plan]) {
    return res.status(400).json({ error: `Invalid plan. Choose: ${Object.keys(PLANS).join(', ')}` });
  }
  if (!txHash || typeof txHash !== 'string' || txHash.length < 10) {
    return res.status(400).json({ error: 'Invalid transaction hash' });
  }

  try {
    // Load operations for this tx on testnet
    const ops     = await horizon.operations().forTransaction(txHash).call();
    const records = ops.records || [];

    const expectedAmount = PLANS[plan].price.toFixed(7);

    const validPayment = records.find((op) =>
      op.type === 'payment' &&
      op.from === wallet &&
      op.to   === TREASURY_WALLET &&
      op.asset_type === 'native' &&
      parseFloat(op.amount) >= parseFloat(expectedAmount)
    );

    if (!validPayment) {
      return res.status(402).json({
        error: `Payment not verified. Expected ${expectedAmount} XLM from your wallet to treasury on testnet.`,
        expected: { from: wallet, to: TREASURY_WALLET, amount: expectedAmount, asset: 'XLM', network: 'TESTNET' },
      });
    }

    const sub = activateSubscription(wallet, plan, txHash);
    return res.json({
      success: true,
      subscription: {
        ...sub,
        scansRemaining: sub.scansLimit === Infinity ? 'Unlimited' : sub.scansLimit - sub.scansUsed,
        expiresAt: new Date(sub.expiresAt).toISOString(),
      },
    });
  } catch (err) {
    console.error('[subscription/activate error]', err.message);
    if (err?.response?.status === 404) {
      return res.status(404).json({ error: 'Transaction not found on testnet. Wait a few seconds and try again.' });
    }
    return res.status(500).json({ error: err.message });
  }
});

// ── POST /api/subscription/demo ───────────────────────────────────────────────
// Instantly activates a free demo subscription — no payment required.
// Used for hackathon demos and testing.
router.post('/demo', (req, res) => {
  const { wallet } = req.body;
  if (!wallet || !isValidAddress(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }
  const sub = activateSubscription(wallet, 'pro', 'DEMO-TX-FREE');
  return res.json({
    success: true,
    demo: true,
    subscription: {
      ...sub,
      scansRemaining: sub.scansLimit - sub.scansUsed,
      expiresAt: new Date(sub.expiresAt).toISOString(),
    },
  });
});

function planFeatures(id) {
  const base = ['Wallet risk analysis', 'Blacklist checks', 'Pattern detection'];
  if (id === 'basic')     return [...base, '10 scans / month'];
  if (id === 'pro')       return [...base, '100 scans / month', 'Wallet comparison', 'Fund flow analysis', 'Activity heatmap'];
  if (id === 'unlimited') return [...base, 'Unlimited scans', 'All Pro features', 'Watchlist monitoring', 'Priority support'];
  return base;
}

module.exports = router;

// ── GET /api/subscription/plans ───────────────────────────────────────────────
router.get('/plans', (_req, res) => {
  const plans = Object.entries(PLANS).map(([id, p]) => ({
    id,
    name:       p.name,
    price:      p.price,
    scansLimit: p.scansLimit === Infinity ? 'Unlimited' : p.scansLimit,
    duration:   '30 days',
    features:   planFeatures(id),
  }));
  res.json({ plans, treasury: TREASURY_WALLET });
});

// ── GET /api/subscription/status/:wallet ──────────────────────────────────────
router.get('/status/:wallet', (req, res) => {
  const { wallet } = req.params;
  if (!isValidAddress(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }
  const sub = getSubscription(wallet);
  return res.json({ wallet, subscription: sub });
});

// ── POST /api/subscription/activate ──────────────────────────────────────────
// Body: { wallet, plan, txHash }
// Verifies the Horizon transaction, then activates the subscription.
router.post('/activate', async (req, res) => {
  const { wallet, plan, txHash } = req.body;

  if (!wallet || !isValidAddress(wallet)) {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }
  if (!plan || !PLANS[plan]) {
    return res.status(400).json({ error: `Invalid plan. Choose: ${Object.keys(PLANS).join(', ')}` });
  }
  if (!txHash || typeof txHash !== 'string' || txHash.length < 10) {
    return res.status(400).json({ error: 'Invalid transaction hash' });
  }

  try {
    // Verify the transaction on Horizon
    const tx = await horizon.transactions().transaction(txHash).call();

    // Load operations for this transaction
    const ops = await horizon.operations().forTransaction(txHash).call();
    const records = ops.records || [];

    const expectedAmount = PLANS[plan].price.toFixed(7);

    // Find a payment operation that:
    // - is from the subscriber wallet
    // - is to the treasury wallet
    // - is for the correct XLM amount
    const validPayment = records.find((op) =>
      op.type === 'payment' &&
      op.from === wallet &&
      op.to   === TREASURY_WALLET &&
      op.asset_type === 'native' &&
      parseFloat(op.amount) >= parseFloat(expectedAmount)
    );

    if (!validPayment) {
      return res.status(402).json({
        error: `Payment not found or insufficient. Expected ${expectedAmount} XLM from ${wallet} to treasury.`,
        expected: { from: wallet, to: TREASURY_WALLET, amount: expectedAmount, asset: 'XLM' },
      });
    }

    // Activate subscription
    const sub = activateSubscription(wallet, plan, txHash);

    return res.json({
      success:      true,
      subscription: {
        ...sub,
        scansRemaining: sub.scansLimit === Infinity ? 'Unlimited' : sub.scansLimit - sub.scansUsed,
        expiresAt: new Date(sub.expiresAt).toISOString(),
      },
    });
  } catch (err) {
    console.error('[subscription/activate error]', err.message);

    // Horizon 404 = tx not found
    if (err?.response?.status === 404) {
      return res.status(404).json({ error: 'Transaction not found on Stellar network. Please wait a few seconds and try again.' });
    }

    return res.status(500).json({ error: err.message });
  }
});

function planFeatures(id) {
  const base = ['Wallet risk analysis', 'Blacklist checks', 'Pattern detection'];
  if (id === 'basic')     return [...base, '10 scans / month'];
  if (id === 'pro')       return [...base, '100 scans / month', 'Wallet comparison', 'Fund flow analysis', 'Activity heatmap'];
  if (id === 'unlimited') return [...base, 'Unlimited scans', 'All Pro features', 'Watchlist monitoring', 'Priority support'];
  return base;
}

module.exports = router;
