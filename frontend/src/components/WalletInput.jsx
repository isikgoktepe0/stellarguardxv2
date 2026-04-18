import React, { useState } from 'react';
import { Icon } from './Icons';

const DEMO_WALLET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

export default function WalletInput({ onAnalyze, loading }) {
  const [value, setValue] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onAnalyze(trimmed);
  };

  return (
    <div className="card animate-in">
      <div className="card-label">
        <Icon.Wallet width="12" height="12" />
        Target Wallet
      </div>
      <form className="wallet-form" onSubmit={handleSubmit}>
        <div className="wallet-input-wrap">
          <span className="input-icon">
            <Icon.Wallet width="14" height="14" />
          </span>
          <input
            className="wallet-input"
            type="text"
            placeholder="Enter Stellar public key (G...)"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
        <button className="btn-scan" type="submit" disabled={loading || !value.trim()}>
          {loading ? 'Scanning...' : 'Scan Wallet'}
        </button>
      </form>
      <div className="demo-hint">
        <span>No wallet?</span>
        <button type="button" onClick={() => setValue(DEMO_WALLET)}>
          Load demo address
        </button>
        <span style={{ marginLeft: 'auto' }}>Horizon API · Mainnet</span>
      </div>
    </div>
  );
}
