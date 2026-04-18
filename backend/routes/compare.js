/**
 * routes/compare.js
 * GET /api/compare?walletA=ADDRESS&walletB=ADDRESS
 * Runs full analysis on both wallets in parallel and returns a side-by-side report.
 */

const express = require('express');
const router  = express.Router();
const { fetchPayments } = require('../services/horizon');
const { analyzeRisk }   = require('../utils/riskEngine');
const { isValidAddress } = require('../services/stellarPayment');

router.get('/', async (req, res) => {
  const { walletA, walletB } = req.query;

  if (!walletA || !isValidAddress(walletA)) {
    return res.status(400).json({ error: 'Invalid walletA address' });
  }
  if (!walletB || !isValidAddress(walletB)) {
    return res.status(400).json({ error: 'Invalid walletB address' });
  }
  if (walletA === walletB) {
    return res.status(400).json({ error: 'walletA and walletB must be different addresses' });
  }

  try {
    // Fetch both in parallel
    const [paymentsA, paymentsB] = await Promise.all([
      fetchPayments(walletA),
      fetchPayments(walletB),
    ]);

    const [reportA, reportB] = [
      analyzeRisk(walletA, paymentsA),
      analyzeRisk(walletB, paymentsB),
    ];

    // Check if the two wallets have ever interacted
    const connectedAddrsA = new Set([
      ...paymentsA.map((p) => p.from).filter(Boolean),
      ...paymentsA.map((p) => p.to).filter(Boolean),
    ]);
    const interacted = connectedAddrsA.has(walletB);

    // Build comparison metrics
    const metrics = [
      { key: 'risk_score',        label: 'Risk Score',          a: reportA.risk_score,        b: reportB.risk_score,        higherIsBad: true },
      { key: 'transaction_count', label: 'Transaction Count',   a: reportA.transaction_count, b: reportB.transaction_count, higherIsBad: false },
      { key: 'patterns',          label: 'Suspicious Patterns', a: reportA.patterns.length,   b: reportB.patterns.length,   higherIsBad: true },
      { key: 'connected_threats', label: 'Connected Threats',   a: reportA.connected_blacklist_hits.length, b: reportB.connected_blacklist_hits.length, higherIsBad: true },
      { key: 'blacklisted',       label: 'Blacklisted',         a: reportA.is_blacklisted ? 1 : 0, b: reportB.is_blacklisted ? 1 : 0, higherIsBad: true },
    ];

    return res.json({
      walletA: {
        address:    walletA,
        risk_score: reportA.risk_score,
        risk_level: reportA.risk_level,
        transaction_count: reportA.transaction_count,
        is_blacklisted: reportA.is_blacklisted,
        blacklist_entry: reportA.blacklist_entry,
        patterns:   reportA.patterns,
        reasons:    reportA.reasons,
        ai_summary: reportA.ai_summary,
        connected_blacklist_hits: reportA.connected_blacklist_hits,
      },
      walletB: {
        address:    walletB,
        risk_score: reportB.risk_score,
        risk_level: reportB.risk_level,
        transaction_count: reportB.transaction_count,
        is_blacklisted: reportB.is_blacklisted,
        blacklist_entry: reportB.blacklist_entry,
        patterns:   reportB.patterns,
        reasons:    reportB.reasons,
        ai_summary: reportB.ai_summary,
        connected_blacklist_hits: reportB.connected_blacklist_hits,
      },
      interacted,
      metrics,
      verdict: reportA.risk_score > reportB.risk_score ? 'A' : reportB.risk_score > reportA.risk_score ? 'B' : 'TIE',
    });
  } catch (err) {
    console.error('[compare error]', err.message);
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
