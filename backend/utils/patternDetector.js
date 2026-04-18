/**
 * patternDetector.js
 * Advanced behavioral pattern analysis for Stellar payment streams.
 * Returns an array of detected pattern objects.
 */

/**
 * Round a float to 4 decimal places for bucketing.
 */
const bucket = (n) => Math.round(parseFloat(n) * 10000) / 10000;

/**
 * Detect all suspicious patterns in a payment operation list.
 * @param {string} wallet
 * @param {Array}  ops  - filtered payment/create_account records
 * @returns {Array<{ id, severity, title, detail, score }>}
 */
function detectPatterns(wallet, ops) {
  const findings = [];

  if (!ops || ops.length === 0) return findings;

  // ── 1. Repeated exact amounts (structuring / automation) ─────────────────
  const amountFreq = {};
  ops.forEach((p) => {
    const amt = bucket(p.amount || 0);
    if (amt > 0) amountFreq[amt] = (amountFreq[amt] || 0) + 1;
  });

  const repeatedAmounts = Object.entries(amountFreq)
    .filter(([, count]) => count >= 5)
    .sort((a, b) => b[1] - a[1]);

  if (repeatedAmounts.length > 0) {
    const top = repeatedAmounts[0];
    findings.push({
      id:       'REPEATED_AMOUNTS',
      severity: 'HIGH',
      title:    'Structured / Repeated Transaction Amounts',
      detail:   `Amount ${top[0]} XLM repeated ${top[1]} times. ` +
                `${repeatedAmounts.length} distinct repeated amounts detected. ` +
                `Consistent with automated bots or structuring to evade detection.`,
      score:    25,
    });
  }

  // ── 2. Transaction burst (high frequency in short window) ────────────────
  const timestamps = ops
    .map((p) => new Date(p.created_at).getTime())
    .filter(Boolean)
    .sort((a, b) => a - b);

  if (timestamps.length >= 10) {
    // Sliding window: count max tx in any 60-second window
    let maxBurst = 0;
    let burstWindowStart = null;
    for (let i = 0; i < timestamps.length; i++) {
      const windowEnd = timestamps[i] + 60_000;
      let count = 0;
      for (let j = i; j < timestamps.length && timestamps[j] <= windowEnd; j++) count++;
      if (count > maxBurst) {
        maxBurst = count;
        burstWindowStart = new Date(timestamps[i]).toISOString();
      }
    }

    if (maxBurst >= 10) {
      findings.push({
        id:       'TX_BURST',
        severity: maxBurst >= 20 ? 'HIGH' : 'MEDIUM',
        title:    'Transaction Frequency Burst Detected',
        detail:   `${maxBurst} transactions within a 60-second window ` +
                  `(starting ${burstWindowStart}). ` +
                  `Indicates automated scripting or bot-driven activity.`,
        score:    maxBurst >= 20 ? 20 : 12,
      });
    }
  }

  // ── 3. Round-number bias (money laundering signal) ────────────────────────
  const roundAmounts = ops.filter((p) => {
    const amt = parseFloat(p.amount || 0);
    return amt > 0 && amt % 10 === 0;
  });

  const roundRatio = roundAmounts.length / ops.length;
  if (ops.length >= 10 && roundRatio > 0.7) {
    findings.push({
      id:       'ROUND_NUMBER_BIAS',
      severity: 'MEDIUM',
      title:    'Round-Number Transaction Bias',
      detail:   `${Math.round(roundRatio * 100)}% of transactions use round numbers ` +
                `(multiples of 10 XLM). This pattern is associated with manual ` +
                `layering in money laundering schemes.`,
      score:    15,
    });
  }

  // ── 4. Single-direction flow (all in or all out) ──────────────────────────
  const incoming = ops.filter((p) => (p.to || p.account) === wallet);
  const outgoing = ops.filter((p) => p.from === wallet);

  if (ops.length >= 5) {
    if (outgoing.length === 0) {
      findings.push({
        id:       'RECEIVE_ONLY',
        severity: 'MEDIUM',
        title:    'Receive-Only Wallet (Collection Address)',
        detail:   `All ${ops.length} transactions are inbound. No outgoing payments detected. ` +
                  `Consistent with a collection address used to aggregate funds before moving them.`,
        score:    10,
      });
    } else if (incoming.length === 0) {
      findings.push({
        id:       'SEND_ONLY',
        severity: 'MEDIUM',
        title:    'Send-Only Wallet (Distribution Address)',
        detail:   `All ${ops.length} transactions are outbound. No incoming payments detected. ` +
                  `Consistent with a distribution wallet used to disperse funds to many targets.`,
        score:    10,
      });
    }
  }

  // ── 5. Rapid fan-out to many unique addresses ─────────────────────────────
  const uniqueDests = new Set(
    ops.filter((p) => p.to && p.to !== wallet).map((p) => p.to)
  );

  if (uniqueDests.size > 25) {
    findings.push({
      id:       'FAN_OUT',
      severity: 'HIGH',
      title:    'Rapid Fan-Out to Many Addresses',
      detail:   `Funds distributed to ${uniqueDests.size} unique addresses. ` +
                `Fan-out patterns are a hallmark of airdrop scams, Ponzi payouts, ` +
                `and automated fraud networks.`,
      score:    15,
    });
  }

  // ── 6. Micro-transaction spam ─────────────────────────────────────────────
  const microTx = ops.filter((p) => {
    const amt = parseFloat(p.amount || 0);
    return amt > 0 && amt < 1;
  });

  if (microTx.length > 15) {
    findings.push({
      id:       'MICRO_TX_SPAM',
      severity: 'HIGH',
      title:    'Micro-Transaction Spam Pattern',
      detail:   `${microTx.length} payments under 1 XLM detected. ` +
                `Micro-transaction spam is used for dust attacks, address probing, ` +
                `and network congestion attacks.`,
      score:    20,
    });
  }

  return findings;
}

module.exports = { detectPatterns };
