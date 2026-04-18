/**
 * paymentRequest.js
 * Generates invoice-style payment request objects.
 * Requests are stored in-memory (replace with DB in production).
 */

const { randomBytes } = require('crypto');

// In-memory store: requestId → request object
const store = new Map();

/**
 * Create a new payment request.
 * @param {object} params
 * @param {string} params.from    - Payer public key (optional, can be blank)
 * @param {string} params.to      - Payee public key (required)
 * @param {number} params.amount  - Amount in XLM
 * @param {string} [params.memo]  - Optional memo
 * @returns {{ requestId: string, paymentUrl: string, expiresAt: string }}
 */
function createPaymentRequest({ from, to, amount, memo }) {
  const id = `REQ-${randomBytes(4).toString('hex').toUpperCase()}`;
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  // Sanitize memo — must be string or null
  const safeMemo = memo && typeof memo === 'string' && memo.trim()
    ? memo.trim().slice(0, 28)
    : null;

  const request = {
    requestId:  id,
    from:       from || null,
    to,
    amount:     parseFloat(amount),
    memo:       safeMemo,
    status:     'pending',
    createdAt:  new Date().toISOString(),
    expiresAt,
    paymentUrl: `https://stellarguardx.app/pay/${id}`,
  };

  store.set(id, request);
  return request;
}

/**
 * Look up a payment request by ID.
 * @param {string} requestId
 * @returns {object|null}
 */
function getPaymentRequest(requestId) {
  return store.get(requestId) || null;
}

/**
 * Mark a payment request as paid.
 * @param {string} requestId
 * @param {string} txHash
 */
function markPaid(requestId, txHash) {
  const req = store.get(requestId);
  if (req) {
    req.status = 'paid';
    req.txHash = txHash;
    req.paidAt = new Date().toISOString();
    store.set(requestId, req);
  }
}

/**
 * List all stored requests (for debugging / admin).
 * @returns {Array}
 */
function listRequests() {
  return Array.from(store.values());
}

module.exports = { createPaymentRequest, getPaymentRequest, markPaid, listRequests };
