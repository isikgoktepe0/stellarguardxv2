/**
 * blacklist.js
 * Known risky / sanctioned Stellar wallet addresses.
 * In production this would be loaded from a threat-intel feed.
 * Each entry carries a reason and a severity tag.
 */

const BLACKLIST = [
  {
    address: 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37',
    reason:  'Known phishing operation — reported by multiple community members',
    tag:     'PHISHING',
  },
  {
    address: 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5',
    reason:  'High-volume automated distribution wallet — flagged for suspicious fan-out',
    tag:     'BOT_DISTRIBUTION',
  },
  {
    address: 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGZXG5CPCJDGX4LNZM4IQO',
    reason:  'Associated with known Ponzi scheme on Stellar network',
    tag:     'PONZI',
  },
  {
    address: 'GBTBVKULXHBZH6XNMHQE4ZNKZQRTJKLCEA3FWMNPZMKD3VWQUVLRXBEZ',
    reason:  'Mixer / tumbler wallet — used to obfuscate transaction trails',
    tag:     'MIXER',
  },
  {
    address: 'GDGQVOKHW4VEJRU2TETD6DBAQFW3AQGSYXWUCRPMI4BAAD6BKQFXLBR',
    reason:  'Flagged by Stellar Development Foundation for ToS violations',
    tag:     'SDF_FLAGGED',
  },
];

/**
 * Check if a wallet address is on the blacklist.
 * @param {string} address
 * @returns {{ matched: boolean, entry?: object }}
 */
function checkBlacklist(address) {
  const entry = BLACKLIST.find((e) => e.address === address);
  return entry ? { matched: true, entry } : { matched: false };
}

/**
 * Check if any address in a set appears on the blacklist.
 * Returns all matches found.
 * @param {Set<string>|Array<string>} addresses
 * @returns {Array<object>}
 */
function checkConnectedBlacklist(addresses) {
  const hits = [];
  for (const addr of addresses) {
    const entry = BLACKLIST.find((e) => e.address === addr);
    if (entry) hits.push({ address: addr, ...entry });
  }
  return hits;
}

module.exports = { checkBlacklist, checkConnectedBlacklist, BLACKLIST };
