/**
 * aiSummary.js
 * Generates a human-readable, AI-style risk narrative
 * based on the full analysis result — no external API needed.
 */

/**
 * Build a paragraph-style threat summary.
 * @param {object} params
 * @returns {string}
 */
function generateSummary({
  wallet,
  riskLevel,
  riskScore,
  txCount,
  patterns,
  blacklistHit,
  connectedBlacklistHits,
  reasons,
}) {
  const short = `${wallet.slice(0, 6)}...${wallet.slice(-6)}`;
  const lines = [];

  // ── Opening sentence ──────────────────────────────────────────────────────
  if (blacklistHit) {
    lines.push(
      `Wallet ${short} has been identified in our threat intelligence database ` +
      `as a known malicious actor (${blacklistHit.tag}). ` +
      `This wallet should be considered extremely dangerous.`
    );
  } else if (riskLevel === 'High') {
    lines.push(
      `Wallet ${short} exhibits a high-risk behavioral profile with a threat score of ${riskScore}/100. ` +
      `Multiple independent indicators of fraudulent or automated activity have been detected.`
    );
  } else if (riskLevel === 'Medium') {
    lines.push(
      `Wallet ${short} shows moderate risk indicators (score: ${riskScore}/100). ` +
      `While not conclusively malicious, several patterns warrant caution.`
    );
  } else {
    lines.push(
      `Wallet ${short} appears to operate within normal behavioral parameters (score: ${riskScore}/100). ` +
      `No significant threat indicators were detected across ${txCount} analyzed transactions.`
    );
  }

  // ── Pattern findings ──────────────────────────────────────────────────────
  if (patterns.length > 0) {
    const highPatterns = patterns.filter((p) => p.severity === 'HIGH');
    const medPatterns  = patterns.filter((p) => p.severity === 'MEDIUM');

    if (highPatterns.length > 0) {
      lines.push(
        `Critical patterns detected: ${highPatterns.map((p) => p.title).join('; ')}. ` +
        `These are strong indicators of automated or malicious behavior.`
      );
    }
    if (medPatterns.length > 0) {
      lines.push(
        `Additional warning signals: ${medPatterns.map((p) => p.title).join('; ')}.`
      );
    }
  }

  // ── Connected risk ────────────────────────────────────────────────────────
  if (connectedBlacklistHits && connectedBlacklistHits.length > 0) {
    const tags = connectedBlacklistHits.map((h) => h.tag).join(', ');
    lines.push(
      `This wallet has transacted with ${connectedBlacklistHits.length} known malicious ` +
      `address(es) flagged as: ${tags}. ` +
      `Interaction with blacklisted wallets significantly elevates risk.`
    );
  }

  // ── Transaction volume context ────────────────────────────────────────────
  if (txCount === 0) {
    lines.push('No transaction history found. This may be a newly created or dormant wallet.');
  } else if (txCount > 100) {
    lines.push(
      `The wallet has processed ${txCount} transactions — an unusually high volume ` +
      `that may indicate automated operation.`
    );
  }

  // ── Closing recommendation ────────────────────────────────────────────────
  if (riskLevel === 'High' || blacklistHit) {
    lines.push(
      'RECOMMENDATION: Do not interact with this wallet. ' +
      'Report to the Stellar community and relevant authorities if you have received funds from it.'
    );
  } else if (riskLevel === 'Medium') {
    lines.push(
      'RECOMMENDATION: Proceed with caution. Verify the wallet owner\'s identity ' +
      'through independent channels before transacting.'
    );
  } else {
    lines.push(
      'RECOMMENDATION: No immediate action required. Continue monitoring for behavioral changes.'
    );
  }

  return lines.join(' ');
}

module.exports = { generateSummary };
