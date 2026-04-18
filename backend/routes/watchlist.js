/**
 * routes/watchlist.js
 * POST /api/watchlist/scan
 * Body: { wallets: string[] }
 * Scans up to 10 wallets in parallel, returns array of risk summaries.
 * Used by the frontend watchlist auto-monitor feature.
 */

const express = require('express');
const router  = express.Router();
const { fetchPayments }  = require('../services/horizon');
const { analyzeRisk }    = require('../utils/riskEngine');
const { isValidAddress } = require('../services/stellarPayment');

router.post('/scan', async (req, res) => {
  const { wallets } = req.body;

  if (!Array.isArray(wallets) || wallets.length === 0) {
    return res.status(400).json({ error: 'wallets must be a non-empty array' });
  }

  // Validate and cap at 10
  const valid = wallets
    .filter((w) => typeof w === 'string' && isValidAddress(w))
    .slice(0, 10);

  if (valid.length === 0) {
    return res.status(400).json({ error: 'No valid Stellar addresses provided' });
  }

  try {
    const results = await Promise.allSettled(
      valid.map(async (wallet) => {
        const payments = await fetchPayments(wallet, 100);
        const report   = analyzeRisk(wallet, payments);
        return {
          wallet,
          risk_score:     report.risk_score,
          risk_level:     report.risk_level,
          tx_count:       report.transaction_count,
          is_blacklisted: report.is_blacklisted,
          patterns_count: report.patterns.length,
          scanned_at:     new Date().toISOString(),
        };
      })
    );

    const summaries = results.map((r, i) =>
      r.status === 'fulfilled'
        ? r.value
        : { wallet: valid[i], error: r.reason?.message || 'Scan failed' }
    );

    return res.json({ summaries });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
