/**
 * paymentApi.js
 * Frontend client for the StellarGuard X payment API.
 *
 * ⚠️  SECURITY NOTE:
 *     Passing a secret key from the browser to a backend is only acceptable
 *     for hackathon / demo purposes. In production, use a browser wallet
 *     extension (e.g. Freighter) to sign transactions client-side.
 */

const BASE = '/api/payment';

/**
 * Core fetch wrapper.
 * - Always sends Content-Type: application/json for POST/PUT.
 * - For blocked payments (403 with { blocked: true }), returns the data
 *   instead of throwing so the caller can handle it gracefully.
 * - For unfunded accounts (404 on balance), returns { balance: '0', note }.
 */
async function apiFetch(path, options = {}) {
  const isBody = options.method === 'POST' || options.method === 'PUT';

  const res = await fetch(path, {
    ...options,
    headers: {
      ...(isBody ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });

  const data = await res.json();

  // Blocked payment — 403 with { blocked: true } — return as-is, not an error
  if (res.status === 403 && data.blocked) return data;

  // Unfunded account on balance check — return gracefully
  if (res.status === 404 && path.includes('/balance/')) {
    return { balance: '0', asset: 'XLM', note: 'Account not funded' };
  }

  if (!res.ok) {
    throw new Error(data.error || data.reason || `Request failed (${res.status})`);
  }

  return data;
}

/**
 * Send XLM to a destination address.
 * @param {{ sourceSecret, destination, amount, memo, risk_score }} params
 * @returns {Promise<{ success, txHash, fee, ledger } | { blocked, reason }>}
 */
export function sendPayment(params) {
  return apiFetch(`${BASE}/send`, {
    method: 'POST',
    body:   JSON.stringify(params),
  });
}

/**
 * Create a payment request (invoice).
 * @param {{ from, to, amount, memo }} params
 */
export function createPaymentRequest(params) {
  return apiFetch(`${BASE}/request`, {
    method: 'POST',
    body:   JSON.stringify(params),
  });
}

/**
 * Fetch a payment request by ID.
 * @param {string} requestId
 */
export function getPaymentRequest(requestId) {
  return apiFetch(`${BASE}/request/${encodeURIComponent(requestId)}`);
}

/**
 * Get XLM balance for a public key.
 * Returns { address, balance, asset, note? }
 * Never throws for unfunded accounts — returns balance: '0'.
 * @param {string} address
 */
export function getBalance(address) {
  return apiFetch(`${BASE}/balance/${encodeURIComponent(address)}`);
}
