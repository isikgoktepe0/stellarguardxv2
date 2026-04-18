/**
 * subscriptionStore.js
 * In-memory subscription registry.
 * Maps walletAddress → { plan, scansUsed, scansLimit, expiresAt, txHash }
 *
 * In production: replace with a database (PostgreSQL / Redis).
 */

const store = new Map();

const PLANS = {
  basic: {
    name:       'Basic',
    price:      5,      // XLM
    scansLimit: 10,
    durationMs: 30 * 24 * 60 * 60 * 1000, // 30 days
  },
  pro: {
    name:       'Pro',
    price:      20,
    scansLimit: 100,
    durationMs: 30 * 24 * 60 * 60 * 1000,
  },
  unlimited: {
    name:       'Unlimited',
    price:      50,
    scansLimit: Infinity,
    durationMs: 30 * 24 * 60 * 60 * 1000,
  },
};

/**
 * Activate or renew a subscription for a wallet.
 */
function activateSubscription(walletAddress, plan, txHash) {
  const planConfig = PLANS[plan];
  if (!planConfig) throw new Error(`Unknown plan: ${plan}`);

  const now       = Date.now();
  const existing  = store.get(walletAddress);
  // If already active, extend from current expiry
  const base      = existing && existing.expiresAt > now ? existing.expiresAt : now;

  store.set(walletAddress, {
    wallet:     walletAddress,
    plan,
    planName:   planConfig.name,
    price:      planConfig.price,
    scansUsed:  0,
    scansLimit: planConfig.scansLimit,
    activatedAt: new Date().toISOString(),
    expiresAt:  base + planConfig.durationMs,
    txHash,
  });

  return store.get(walletAddress);
}

/**
 * Get subscription status for a wallet.
 * Returns null if no subscription exists.
 */
function getSubscription(walletAddress) {
  const sub = store.get(walletAddress);
  if (!sub) return null;

  const now    = Date.now();
  const active = sub.expiresAt > now && sub.scansUsed < sub.scansLimit;

  return {
    ...sub,
    active,
    scansRemaining: sub.scansLimit === Infinity
      ? Infinity
      : Math.max(0, sub.scansLimit - sub.scansUsed),
    expiresAt: new Date(sub.expiresAt).toISOString(),
  };
}

/**
 * Consume one scan credit. Returns false if quota exceeded.
 */
function consumeScan(walletAddress) {
  const sub = store.get(walletAddress);
  if (!sub) return false;
  if (Date.now() > sub.expiresAt) return false;
  if (sub.scansLimit !== Infinity && sub.scansUsed >= sub.scansLimit) return false;

  sub.scansUsed += 1;
  store.set(walletAddress, sub);
  return true;
}

/**
 * Check if a wallet has an active subscription with remaining scans.
 */
function hasActiveSubscription(walletAddress) {
  const sub = store.get(walletAddress);
  if (!sub) return false;
  if (Date.now() > sub.expiresAt) return false;
  if (sub.scansLimit !== Infinity && sub.scansUsed >= sub.scansLimit) return false;
  return true;
}

module.exports = {
  PLANS,
  activateSubscription,
  getSubscription,
  consumeScan,
  hasActiveSubscription,
};
