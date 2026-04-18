/**
 * routes/payment.js
 * Express router for all payment-related endpoints.
 *
 * Endpoints:
 *   POST /api/payment/send     — Submit a real XLM payment
 *   POST /api/payment/request  — Create a payment request (invoice)
 *   GET  /api/payment/request/:id — Fetch a payment request
 *   GET  /api/payment/balance/:address — Get XLM balance
 */

const express = require('express');
const router  = express.Router();

const { sendPayment, isValidAddress, isValidSecret, getBalance } = require('../services/stellarPayment');
const { createPaymentRequest, getPaymentRequest, listRequests }  = require('../utils/paymentRequest');
const { checkBlacklist } = require('../utils/blacklist');

// ── POST /api/payment/send ────────────────────────────────────────────────────
router.post('/send', async (req, res) => {
  const { sourceSecret, destination, amount, memo, risk_score } = req.body;

  // ── Input validation ──────────────────────────────────────────────────────
  if (!sourceSecret || !isValidSecret(sourceSecret)) {
    return res.status(400).json({ error: 'Invalid or missing source secret key' });
  }

  if (!destination || !isValidAddress(destination)) {
    return res.status(400).json({ error: 'Invalid destination address' });
  }

  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  if (parsedAmount < 0.0000001) {
    return res.status(400).json({ error: 'Amount too small (minimum 0.0000001 XLM)' });
  }

  // ── Risk hook ─────────────────────────────────────────────────────────────
  // Optional: caller can pass risk_score from StellarGuard X analysis
  if (risk_score !== undefined && Number(risk_score) > 70) {
    return res.status(403).json({
      blocked: true,
      reason:  `High risk wallet detected (score: ${risk_score}/100). Payment blocked by StellarGuard X.`,
    });
  }

  // ── Blacklist check on destination ────────────────────────────────────────
  const { matched, entry } = checkBlacklist(destination);
  if (matched) {
    return res.status(403).json({
      blocked: true,
      reason:  `Destination wallet is blacklisted [${entry.tag}]: ${entry.reason}`,
    });
  }

  // ── Execute payment ───────────────────────────────────────────────────────
  try {
    const result = await sendPayment({ sourceSecret, destination, amount: parsedAmount, memo: memo || undefined });
    return res.json({
      success: true,
      txHash:  result.txHash,
      fee:     result.fee,
      ledger:  result.ledger,
    });
  } catch (err) {
    console.error('[payment/send error]', err.message);

    // Horizon wraps errors in err.response.data
    const extras = err?.response?.data?.extras;
    const horizonCodes = extras?.result_codes || null;

    // Build a human-readable message from Horizon result codes
    let message = err.message;
    if (horizonCodes) {
      const opCodes = horizonCodes.operations || [];
      if (opCodes.includes('op_underfunded'))
        message = 'Insufficient balance to complete this payment.';
      else if (opCodes.includes('op_no_destination'))
        message = 'Destination account does not exist on the Stellar network. It must be funded first.';
      else if (opCodes.includes('op_no_trust'))
        message = 'Destination account does not trust the asset being sent.';
      else if (horizonCodes.transaction === 'tx_bad_auth')
        message = 'Invalid secret key — transaction signing failed.';
      else if (horizonCodes.transaction === 'tx_insufficient_fee')
        message = 'Transaction fee too low. Please try again.';
    }

    return res.status(500).json({
      error:        message,
      horizonCodes: horizonCodes,
    });
  }
});

// ── POST /api/payment/request ─────────────────────────────────────────────────
router.post('/request', (req, res) => {
  const { from, to, amount, memo } = req.body;

  if (!to || !isValidAddress(to)) {
    return res.status(400).json({ error: 'Invalid or missing "to" address' });
  }

  const parsedAmount = parseFloat(amount);
  if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
    return res.status(400).json({ error: 'Amount must be a positive number' });
  }

  // from is optional (open payment request)
  if (from && !isValidAddress(from)) {
    return res.status(400).json({ error: 'Invalid "from" address' });
  }

  const request = createPaymentRequest({ from, to, amount: parsedAmount, memo });

  return res.json({
    requestId:  request.requestId,
    paymentUrl: request.paymentUrl,
    to:         request.to,
    amount:     request.amount,
    memo:       request.memo,
    expiresAt:  request.expiresAt,
    status:     request.status,
  });
});

// ── GET /api/payment/request/:id ──────────────────────────────────────────────
router.get('/request/:id', (req, res) => {
  const request = getPaymentRequest(req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Payment request not found' });
  }
  return res.json(request);
});

// ── GET /api/payment/balance/:address ─────────────────────────────────────────
router.get('/balance/:address', async (req, res) => {
  const { address } = req.params;

  if (!isValidAddress(address)) {
    return res.status(400).json({ error: 'Invalid Stellar address' });
  }

  try {
    const balance = await getBalance(address);
    const note    = balance === '0' ? 'Account not funded or zero balance' : undefined;
    return res.json({ address, balance, asset: 'XLM', ...(note ? { note } : {}) });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// ── GET /api/payment/requests (debug) ─────────────────────────────────────────
router.get('/requests', (_req, res) => {
  return res.json(listRequests());
});

module.exports = router;
