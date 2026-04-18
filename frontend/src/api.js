/**
 * api.js — StellarGuard X backend client
 */

async function apiFetch(path, options = {}) {
  const res  = await fetch(path, options);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Unknown server error');
  return data;
}

/** Analyze a wallet — requires an active subscriber wallet */
export const analyzeWallet = (wallet, subscriber) =>
  apiFetch(`/analyze?wallet=${encodeURIComponent(wallet)}&subscriber=${encodeURIComponent(subscriber)}`);

export const fetchBlacklist = () => apiFetch('/blacklist');

export const fetchFlow = (wallet) =>
  apiFetch(`/api/flow?wallet=${encodeURIComponent(wallet)}`);

export const compareWallets = (walletA, walletB) =>
  apiFetch(`/api/compare?walletA=${encodeURIComponent(walletA)}&walletB=${encodeURIComponent(walletB)}`);

export const scanWatchlist = (wallets) =>
  apiFetch('/api/watchlist/scan', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ wallets }),
  });

// ── Subscription API ──────────────────────────────────────────────────────────
export const fetchPlans = () =>
  apiFetch('/api/subscription/plans');

export const fetchSubscriptionStatus = (wallet) =>
  apiFetch(`/api/subscription/status/${encodeURIComponent(wallet)}`);

export const activateSubscription = (wallet, plan, txHash) =>
  apiFetch('/api/subscription/activate', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ wallet, plan, txHash }),
  });

export const activateDemoSubscription = (wallet) =>
  apiFetch('/api/subscription/demo', {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ wallet }),
  });
