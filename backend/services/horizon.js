/**
 * horizon.js
 * Fetches payment data from the Stellar Horizon public API
 */

const https = require('https');

const HORIZON_BASE = 'https://horizon.stellar.org';

/**
 * Fetch up to `limit` payment operations for a given wallet address.
 * Returns an array of payment records.
 */
function fetchPayments(wallet, limit = 200) {
  return new Promise((resolve, reject) => {
    const url = `${HORIZON_BASE}/accounts/${encodeURIComponent(wallet)}/payments?limit=${limit}&order=desc`;

    https.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => { data += chunk; });

      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);

          // Horizon returns error objects with a `status` field
          if (parsed.status && parsed.status >= 400) {
            return reject(new Error(parsed.detail || 'Horizon API error'));
          }

          const records = (parsed._embedded && parsed._embedded.records) || [];
          resolve(records);
        } catch (e) {
          reject(new Error('Failed to parse Horizon response'));
        }
      });
    }).on('error', (err) => {
      reject(new Error(`Network error: ${err.message}`));
    });
  });
}

module.exports = { fetchPayments };
