import React, { useEffect, useState } from 'react';
import { Icon } from './Icons';

const CIRCUMFERENCE = 2 * Math.PI * 54;

function getColor(level, isBlacklisted) {
  if (isBlacklisted) return '#f03a5a';
  if (level === 'High')   return 'var(--high)';
  if (level === 'Medium') return 'var(--medium)';
  return 'var(--low)';
}

export default function RiskScore({ score, level, txCount, wallet, isBlacklisted = false, connectedHits = 0 }) {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    let cur = 0;
    const step = Math.max(1, Math.ceil(score / 40));
    const timer = setInterval(() => {
      cur += step;
      if (cur >= score) { setDisplayScore(score); clearInterval(timer); }
      else setDisplayScore(cur);
    }, 28);
    return () => clearInterval(timer);
  }, [score]);

  const color      = getColor(level, isBlacklisted);
  const offset     = CIRCUMFERENCE - (displayScore / 100) * CIRCUMFERENCE;
  const badgeClass = level === 'High' ? 'badge-high' : level === 'Medium' ? 'badge-medium' : 'badge-low';
  const glowClass  = isBlacklisted || level === 'High' ? 'card-glow-high' : level === 'Medium' ? 'card-glow-medium' : 'card-glow-low';
  const shortWallet = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-6)}` : '';

  return (
    <div className={`card ${glowClass} risk-score-card animate-in`} style={{ animationDelay: '0.1s' }}>
      <div className="card-label">
        <Icon.Target width="12" height="12" />
        Risk Assessment
      </div>

      {isBlacklisted && (
        <div style={{
          background: 'rgba(240,58,90,0.12)',
          border: '1px solid rgba(240,58,90,0.35)',
          borderRadius: 'var(--radius)',
          padding: '0.45rem 0.75rem',
          marginBottom: '1rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem',
          color: 'var(--high)',
          letterSpacing: '1px',
          display: 'flex',
          alignItems: 'center',
          gap: '0.45rem',
        }}>
          <Icon.Target width="11" height="11" />
          BLACKLISTED — KNOWN THREAT ACTOR
        </div>
      )}

      <div className="score-arc-wrap">
        <svg viewBox="0 0 120 120" width="148" height="148">
          <circle className="score-arc-bg" cx="60" cy="60" r="54"
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset="0"
            transform="rotate(-90 60 60)" />
          <circle className="score-arc-fill" cx="60" cy="60" r="54"
            stroke={color}
            strokeDasharray={CIRCUMFERENCE} strokeDashoffset={offset}
            transform="rotate(-90 60 60)" />
        </svg>
        <div className="score-center-text">
          <span className="score-number" style={{ color }}>{displayScore}</span>
          <span className="score-denom">/ 100</span>
        </div>
      </div>

      <span className={`risk-level-badge ${badgeClass}`}
        style={isBlacklisted ? { background: 'rgba(240,58,90,0.15)', color: 'var(--high)', borderColor: 'rgba(240,58,90,0.3)' } : {}}>
        {isBlacklisted ? 'Blacklisted' : `${level} Risk`}
      </span>

      <div className="score-stats">
        {[
          { label: 'Transactions',      value: txCount },
          { label: 'Connected Threats', value: connectedHits, style: connectedHits > 0 ? { color: 'var(--high)' } : {} },
          { label: 'Wallet',            value: shortWallet },
          { label: 'Network',           value: 'Stellar Mainnet', style: { color: 'var(--low)' } },
        ].map((s) => (
          <div className="score-stat" key={s.label}>
            <span className="score-stat-label">{s.label}</span>
            <span className="score-stat-value wallet-addr" style={s.style || {}}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
