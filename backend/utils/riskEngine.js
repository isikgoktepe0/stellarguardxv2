/**
 * riskEngine.js
 * StellarGuard X — Master risk scoring engine v2.
 * Combines blacklist checks, pattern detection, connected-wallet risk,
 * and classic heuristics into a single unified score.
 */

const { checkBlacklist, checkConnectedBlacklist } = require('./blacklist');
const { detectPatterns } = require('./patternDetector');
const { generateSummary } = require('./aiSummary');

/**
 * Main entry point.
 * @param {string} wallet
 * @param {Array}  payments - raw Horizon payment records
 * @returns {object} full risk report
 */
function analyzeRisk(wallet, payments) {
  let score = 0;
  const flags = []; // legacy reasons array (kept for compatibility)

  // ── Filter to payment / create_account ops ────────────────────────────────
  const ops = payments.filter(
    (p) => p.type === 'payment' || p.type === 'create_account'
  );
  const txCount = ops.length;

  // ── 1. Blacklist check ────────────────────────────────────────────────────
  const { matched: isBlacklisted, entry: blacklistEntry } = checkBlacklist(wallet);

  if (isBlacklisted) {
    score += 60; // Instant heavy penalty
    flags.push(`BLACKLISTED: ${blacklistEntry.reason} [${blacklistEntry.tag}]`);
  }

  // ── 2. Pattern detection ──────────────────────────────────────────────────
  const patterns = detectPatterns(wallet, ops);
  patterns.forEach((p) => {
    score += p.score;
    flags.push(`[${p.severity}] ${p.title}: ${p.detail}`);
  });

  // ── 3. Classic heuristics (non-overlapping with patterns) ─────────────────

  // High volume (if not already caught by TX_BURST pattern)
  const hasBurst = patterns.some((p) => p.id === 'TX_BURST');
  if (!hasBurst && txCount > 50) {
    score += 15;
    flags.push(`High transaction volume: ${txCount} transactions detected`);
  }

  // Low destination diversity
  const destinations = new Set(
    ops.filter((p) => p.to && p.to !== wallet).map((p) => p.to)
  );
  const hasFanOut = patterns.some((p) => p.id === 'FAN_OUT');
  if (!hasFanOut && txCount > 0 && destinations.size < 5) {
    score += 20;
    flags.push(
      `Low address diversity: only ${destinations.size} unique destination(s) across all transactions`
    );
  }

  // ── 4. Connected wallet risk ──────────────────────────────────────────────
  // Collect all addresses this wallet has interacted with
  const allConnected = new Set();
  ops.forEach((p) => {
    if (p.from && p.from !== wallet) allConnected.add(p.from);
    if (p.to   && p.to   !== wallet) allConnected.add(p.to);
    if (p.account && p.account !== wallet) allConnected.add(p.account);
    if (p.funder  && p.funder  !== wallet) allConnected.add(p.funder);
  });

  const connectedBlacklistHits = checkConnectedBlacklist(allConnected);
  if (connectedBlacklistHits.length > 0) {
    const penalty = Math.min(connectedBlacklistHits.length * 20, 40);
    score += penalty;
    connectedBlacklistHits.forEach((hit) => {
      flags.push(
        `Connected to blacklisted wallet ${hit.address.slice(0, 8)}... ` +
        `[${hit.tag}]: ${hit.reason}`
      );
    });
  }

  // ── 5. Cap and classify ───────────────────────────────────────────────────
  score = Math.min(score, 100);

  let riskLevel;
  if (score <= 30)      riskLevel = 'Low';
  else if (score <= 70) riskLevel = 'Medium';
  else                  riskLevel = 'High';

  if (flags.length === 0) {
    flags.push('No suspicious patterns detected. Wallet appears to operate normally.');
  }

  // ── 6. AI-style summary ───────────────────────────────────────────────────
  const aiSummary = generateSummary({
    wallet,
    riskLevel,
    riskScore: score,
    txCount,
    patterns,
    blacklistHit:           isBlacklisted ? blacklistEntry : null,
    connectedBlacklistHits,
    reasons:                flags,
  });

  // ── 7. Build graph (limit to 30 ops) ─────────────────────────────────────
  const graphOps = ops.slice(0, 30);
  const nodeSet  = new Set();
  const links    = [];

  graphOps.forEach((p) => {
    const from = p.from || p.funder || wallet;
    const to   = p.to   || p.account || wallet;
    if (from) nodeSet.add(from);
    if (to)   nodeSet.add(to);
    if (from && to && from !== to) {
      links.push({
        source: from,
        target: to,
        amount: p.amount || '0',
        asset:  p.asset_code || 'XLM',
      });
    }
  });

  const shorten = (addr) => `${addr.slice(0, 4)}…${addr.slice(-4)}`;
  const blacklistedAddrs = new Set([
    ...(isBlacklisted ? [wallet] : []),
    ...connectedBlacklistHits.map((h) => h.address),
  ]);

  const nodes = Array.from(nodeSet).map((addr) => ({
    id:          addr,
    label:       shorten(addr),
    isTarget:    addr === wallet,
    isBlacklisted: blacklistedAddrs.has(addr),
  }));

  return {
    wallet,
    transaction_count:       txCount,
    risk_score:              score,
    risk_level:              riskLevel,
    is_blacklisted:          isBlacklisted,
    blacklist_entry:         isBlacklisted ? blacklistEntry : null,
    connected_blacklist_hits: connectedBlacklistHits,
    patterns,
    reasons:                 flags,
    ai_summary:              aiSummary,
    graph: { nodes, links },
  };
}

module.exports = { analyzeRisk };
