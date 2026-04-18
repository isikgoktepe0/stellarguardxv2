/**
 * server.js
 * StellarGuard X — Express backend
 * Exposes GET /analyze?wallet=ADDRESS
 */

const express = require('express');
const cors = require('cors');
const { fetchPayments } = require('./services/horizon');
const { analyzeRisk } = require('./utils/riskEngine');
const { BLACKLIST } = require('./utils/blacklist');
const paymentRouter = require('./routes/payment');
const { hasActiveSubscription, consumeScan } = require('./utils/subscriptionStore');

const app = express();
const PORT = process.env.PORT || 4000;

// Allow requests from the Vite dev server
app.use(cors());
app.use(express.json());

// ── Health check ─────────────────────────────────────────────────────────────
app.get('/', (_req, res) => {
  res.json({ status: 'StellarGuard X API is running' });
});

// ── Main analysis endpoint ────────────────────────────────────────────────────
app.get('/analyze', async (req, res) => {
  const { wallet, subscriber } = req.query;

  if (!wallet || !/^G[A-Z2-7]{55}$/.test(wallet)) {
    return res.status(400).json({
      error: 'Invalid Stellar wallet address. Must start with G and be 56 characters.',
    });
  }

  // ── Subscription gate ─────────────────────────────────────────────────────
  // subscriber = the wallet that paid for the subscription (may differ from analyzed wallet)
  if (!subscriber || !/^G[A-Z2-7]{55}$/.test(subscriber)) {
    return res.status(402).json({
      error:   'Subscription required',
      code:    'NO_SUBSCRIPTION',
      message: 'Connect your Stellar wallet and subscribe to analyze wallets.',
    });
  }

  if (!hasActiveSubscription(subscriber)) {
    return res.status(402).json({
      error:   'No active subscription',
      code:    'SUBSCRIPTION_EXPIRED',
      message: 'Your subscription has expired or scan quota is exhausted. Please renew.',
    });
  }

  // Deduct one scan credit
  consumeScan(subscriber);

  try {
    const payments = await fetchPayments(wallet);
    const report   = analyzeRisk(wallet, payments);
    return res.json(report);
  } catch (err) {
    console.error('[analyze error]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

// ── Blacklist endpoint ────────────────────────────────────────────────────────
app.get('/blacklist', (_req, res) => {
  res.json({ count: BLACKLIST.length, entries: BLACKLIST });
});

// ── Payment module ────────────────────────────────────────────────────────────
app.use('/api/payment', paymentRouter);

// ── Flow (Sankey) module ──────────────────────────────────────────────────────
app.use('/api/flow', require('./routes/flow'));

// ── Compare module ────────────────────────────────────────────────────────────
app.use('/api/compare', require('./routes/compare'));

// ── Watchlist module ──────────────────────────────────────────────────────────
app.use('/api/watchlist', require('./routes/watchlist'));

// ── Subscription module ───────────────────────────────────────────────────────
app.use('/api/subscription', require('./routes/subscription'));

app.listen(PORT, () => {
  console.log(`✅ StellarGuard X backend running on http://localhost:${PORT}`);
});
