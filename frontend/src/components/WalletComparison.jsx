import React, { useState } from 'react';
import { compareWallets } from '../api';
import { Icon } from './Icons';

const DEMO_A = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';
const DEMO_B = 'GDQP2KPQGKIHYJGXNUIYOMHARUARCA7DJT5FO2FFOOKY3B2WSQHG4W37';

/* ── Helpers ── */
function riskColor(level) {
  if (level === 'High')   return 'var(--high)';
  if (level === 'Medium') return 'var(--medium)';
  return 'var(--low)';
}

function riskBg(level) {
  if (level === 'High')   return 'rgba(240,58,90,0.1)';
  if (level === 'Medium') return 'rgba(240,165,0,0.08)';
  return 'rgba(34,217,138,0.08)';
}

/* ── Arc gauge (mini) ── */
const CIRC = 2 * Math.PI * 28;

function MiniArc({ score, level }) {
  const color  = riskColor(level);
  const offset = CIRC - (score / 100) * CIRC;
  return (
    <div style={{ position: 'relative', width: '72px', height: '72px', flexShrink: 0 }}>
      <svg viewBox="0 0 64 64" width="72" height="72" style={{ overflow: 'visible' }}>
        <circle cx="32" cy="32" r="28" fill="none" stroke="var(--border)" strokeWidth="5"
          strokeDasharray={CIRC} strokeDashoffset="0" transform="rotate(-90 32 32)" />
        <circle cx="32" cy="32" r="28" fill="none" stroke={color} strokeWidth="5"
          strokeLinecap="round" strokeDasharray={CIRC} strokeDashoffset={offset}
          transform="rotate(-90 32 32)"
          style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dashoffset 1s ease' }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 700, color, lineHeight: 1 }}>{score}</span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.5rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>/100</span>
      </div>
    </div>
  );
}

/* ── Wallet card (one side) ── */
function WalletCard({ data, side }) {
  if (!data) return null;
  const { address, risk_score, risk_level, transaction_count, is_blacklisted, patterns, connected_blacklist_hits, reasons, ai_summary } = data;
  const [showReasons, setShowReasons] = useState(false);

  return (
    <div style={{
      flex: 1, minWidth: 0,
      background: 'var(--surface)',
      border: `1px solid ${is_blacklisted ? 'rgba(240,58,90,0.4)' : 'var(--border)'}`,
      borderTop: `3px solid ${riskColor(risk_level)}`,
      borderRadius: 'var(--radius-lg)',
      padding: '1.25rem',
      display: 'flex', flexDirection: 'column', gap: '1rem',
      boxShadow: is_blacklisted ? '0 0 24px rgba(240,58,90,0.08)' : 'none',
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.6rem', letterSpacing: '2px',
          color: 'var(--text-dim)', background: 'var(--bg2)',
          border: '1px solid var(--border)', borderRadius: '4px',
          padding: '0.15rem 0.5rem',
        }}>
          WALLET {side}
        </span>
        {is_blacklisted && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '1px',
            color: 'var(--high)', background: 'rgba(240,58,90,0.12)',
            border: '1px solid rgba(240,58,90,0.3)', borderRadius: '4px',
            padding: '0.15rem 0.5rem',
          }}>
            BLACKLISTED
          </span>
        )}
      </div>

      {/* Address */}
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-dim)', wordBreak: 'break-all', lineHeight: 1.5 }}>
        {address}
      </div>

      {/* Score + level */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <MiniArc score={risk_score} level={risk_level} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
          <span style={{
            display: 'inline-block', padding: '0.25rem 0.75rem',
            borderRadius: '20px', fontFamily: 'var(--font-mono)',
            fontSize: '0.68rem', fontWeight: 700, letterSpacing: '1.5px',
            background: riskBg(risk_level), color: riskColor(risk_level),
            border: `1px solid ${riskColor(risk_level)}33`,
          }}>
            {risk_level} Risk
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
            {transaction_count} transactions
          </span>
          <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
            {patterns.length} patterns · {connected_blacklist_hits.length} connected threats
          </span>
        </div>
      </div>

      {/* AI summary */}
      <div style={{
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', padding: '0.75rem',
        fontFamily: 'var(--font-ui)', fontSize: '0.8rem',
        color: 'var(--text-mid)', lineHeight: 1.6,
        maxHeight: '120px', overflow: 'hidden',
        maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
      }}>
        {ai_summary}
      </div>

      {/* Reasons toggle */}
      <button
        onClick={() => setShowReasons((v) => !v)}
        style={{
          background: 'none', border: '1px solid var(--border)',
          color: 'var(--text-mid)', fontFamily: 'var(--font-mono)',
          fontSize: '0.65rem', padding: '0.35rem 0.7rem',
          borderRadius: 'var(--radius)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: '0.4rem',
          transition: 'all 0.15s', alignSelf: 'flex-start',
        }}
      >
        {showReasons
          ? <><Icon.ChevronUp width="12" height="12" />Hide flags</>
          : <><Icon.ChevronDown width="12" height="12" />{reasons.length} flags</>
        }
      </button>

      {showReasons && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {reasons.map((r, i) => {
            const isHigh = r.startsWith('BLACKLISTED') || r.startsWith('[HIGH]');
            const isMed  = r.startsWith('[MEDIUM]');
            const color  = isHigh ? 'var(--high)' : isMed ? 'var(--medium)' : 'var(--text-dim)';
            return (
              <div key={i} style={{
                fontFamily: 'var(--font-ui)', fontSize: '0.78rem',
                color: 'var(--text)', lineHeight: 1.5,
                padding: '0.4rem 0.6rem',
                background: 'var(--bg2)', borderRadius: '4px',
                borderLeft: `2px solid ${color}`,
              }}>
                {r.replace(/^\[(HIGH|MEDIUM|LOW)\]\s*/, '')}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ── Metric bar ── */
function MetricRow({ metric, verdict }) {
  const { label, a, b, higherIsBad } = metric;
  const maxVal = Math.max(a, b, 1);
  const aWins  = higherIsBad ? a < b : a > b;
  const bWins  = higherIsBad ? b < a : b > a;
  const tie    = a === b;

  const barColor = (wins) => wins ? 'var(--low)' : 'var(--high)';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', padding: '0.6rem 0', borderBottom: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>
          {label}
        </span>
        {!tie && (
          <span style={{
            fontFamily: 'var(--font-mono)', fontSize: '0.58rem', letterSpacing: '1px',
            color: aWins ? 'var(--low)' : 'var(--high)',
            background: aWins ? 'var(--low-dim)' : 'var(--high-dim)',
            border: `1px solid ${aWins ? 'rgba(34,217,138,0.25)' : 'rgba(240,58,90,0.25)'}`,
            padding: '0.1rem 0.4rem', borderRadius: '3px',
          }}>
            {aWins ? 'A safer' : 'B safer'}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
        {/* A bar */}
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-bright)', width: '32px', textAlign: 'right' }}>{a}</span>
        <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            width: `${(a / maxVal) * 100}%`,
            background: tie ? 'var(--text-dim)' : barColor(aWins),
            transition: 'width 0.8s ease',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', width: '12px', textAlign: 'center' }}>vs</span>
        <div style={{ flex: 1, height: '6px', background: 'var(--border)', borderRadius: '3px', overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: '3px',
            width: `${(b / maxVal) * 100}%`,
            background: tie ? 'var(--text-dim)' : barColor(bWins),
            transition: 'width 0.8s ease',
          }} />
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-bright)', width: '32px' }}>{b}</span>
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function WalletComparison() {
  const [addrA, setAddrA]     = useState('');
  const [addrB, setAddrB]     = useState('');
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);

  const handleCompare = async (e) => {
    e.preventDefault();
    if (!addrA.trim() || !addrB.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await compareWallets(addrA.trim(), addrB.trim());
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadDemo = () => { setAddrA(DEMO_A); setAddrB(DEMO_B); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* Input card */}
      <div className="card animate-in">
        <div className="card-label">
          <Icon.Scan width="12" height="12" />
          Wallet Comparison
        </div>

        <form onSubmit={handleCompare} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="field-label">Wallet A</label>
              <input className="field-input" type="text"
                placeholder="G... first address"
                value={addrA} onChange={(e) => setAddrA(e.target.value)}
                spellCheck={false} />
            </div>
            <div>
              <label className="field-label">Wallet B</label>
              <input className="field-input" type="text"
                placeholder="G... second address"
                value={addrB} onChange={(e) => setAddrB(e.target.value)}
                spellCheck={false} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <button type="submit" disabled={loading || !addrA.trim() || !addrB.trim()} className="btn-primary">
              {loading ? 'Analyzing...' : 'Compare Wallets'}
            </button>
            <button type="button" className="btn-outline" onClick={loadDemo}>
              Load demo pair
            </button>
          </div>
        </form>

        {error && (
          <div className="error-banner" style={{ marginTop: '1rem' }}>
            <Icon.Alert width="13" height="13" />{error}
          </div>
        )}
      </div>

      {/* Results */}
      {result && (
        <>
          {/* Interaction notice */}
          {result.interacted && (
            <div className="threat-alert animate-in" style={{
              borderLeftColor: 'var(--medium)', borderColor: 'rgba(240,165,0,0.25)',
              background: 'rgba(240,165,0,0.06)',
            }}>
              <Icon.Network width="18" height="18" className="threat-alert-icon warn" />
              <div className="threat-content">
                <strong className="warn">Direct Interaction Detected</strong>
                <p>These two wallets have transacted with each other directly. This may indicate a relationship between the accounts.</p>
              </div>
            </div>
          )}

          {/* Verdict banner */}
          <div className="card animate-in" style={{
            background: result.verdict === 'TIE'
              ? 'rgba(45,212,240,0.04)'
              : result.verdict === 'A'
                ? 'rgba(240,58,90,0.06)'
                : 'rgba(240,58,90,0.06)',
            borderColor: result.verdict === 'TIE' ? 'rgba(45,212,240,0.2)' : 'rgba(240,58,90,0.25)',
            padding: '1rem 1.25rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <Icon.Target width="18" height="18" style={{ color: result.verdict === 'TIE' ? 'var(--cyan)' : 'var(--high)', flexShrink: 0 }} />
              <div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', letterSpacing: '1.5px', color: 'var(--text-dim)', marginBottom: '0.2rem' }}>
                  COMPARISON VERDICT
                </div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)' }}>
                  {result.verdict === 'TIE'
                    ? 'Both wallets have equal risk scores'
                    : `Wallet ${result.verdict} is higher risk (score: ${result.verdict === 'A' ? result.walletA.risk_score : result.walletB.risk_score}/100)`
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Side-by-side wallet cards */}
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <WalletCard data={result.walletA} side="A" />
            <WalletCard data={result.walletB} side="B" />
          </div>

          {/* Metric comparison */}
          <div className="card animate-in" style={{ animationDelay: '0.1s' }}>
            <div className="card-label">
              <Icon.Pattern width="12" height="12" />
              Metric Comparison
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {result.metrics.map((m) => (
                <MetricRow key={m.key} metric={m} verdict={result.verdict} />
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
              <span>Wallet A</span>
              <span>Wallet B</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
