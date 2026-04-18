import React, { useState, useEffect, useRef } from 'react';
import { Icon } from './Icons';
import { scanWatchlist } from '../api';

/* ── helpers ── */
function riskColor(level) {
  if (level === 'High')   return 'var(--high)';
  if (level === 'Medium') return 'var(--medium)';
  return 'var(--low)';
}

function riskBg(level) {
  if (level === 'High')   return 'rgba(240,58,90,0.12)';
  if (level === 'Medium') return 'rgba(240,165,0,0.1)';
  return 'rgba(34,217,138,0.1)';
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

function ScorePill({ score, level }) {
  return (
    <span style={{
      fontFamily: 'var(--font-mono)', fontSize: '0.68rem', fontWeight: 700,
      color: riskColor(level), background: riskBg(level),
      border: `1px solid ${riskColor(level)}33`,
      padding: '0.12rem 0.5rem', borderRadius: '4px',
      letterSpacing: '0.5px', whiteSpace: 'nowrap',
    }}>
      {score} · {level}
    </span>
  );
}

/* ── History row ── */
function HistoryRow({ entry, onSelect, onRemove, onWatch, isWatched }) {
  const short = `${entry.wallet.slice(0, 8)}...${entry.wallet.slice(-6)}`;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.6rem 0.75rem',
      background: entry.is_blacklisted ? 'rgba(240,58,90,0.06)' : 'var(--bg2)',
      border: `1px solid ${entry.is_blacklisted ? 'rgba(240,58,90,0.25)' : 'var(--border)'}`,
      borderLeft: `2px solid ${riskColor(entry.risk_level)}`,
      borderRadius: 'var(--radius)',
      transition: 'border-color 0.15s',
      animation: 'slide-in 0.3s ease both',
    }}>
      {/* Score pill */}
      <ScorePill score={entry.risk_score} level={entry.risk_level} />

      {/* Address */}
      <button
        onClick={() => onSelect(entry.wallet)}
        style={{
          flex: 1, background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
          color: 'var(--text-mid)', textAlign: 'left', padding: 0,
          transition: 'color 0.15s',
        }}
        title={entry.wallet}
      >
        {short}
      </button>

      {/* Meta */}
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
        {entry.tx_count} tx · {timeAgo(entry.scanned_at)}
      </span>

      {/* Watchlist toggle */}
      <button
        onClick={() => onWatch(entry.wallet)}
        title={isWatched ? 'Remove from watchlist' : 'Add to watchlist'}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
          color: isWatched ? 'var(--medium)' : 'var(--text-dim)',
          transition: 'color 0.15s', display: 'flex', alignItems: 'center',
        }}
      >
        <Icon.Bookmark width="13" height="13" />
      </button>

      {/* Remove */}
      <button
        onClick={() => onRemove(entry.wallet)}
        title="Remove from history"
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
          color: 'var(--text-dim)', transition: 'color 0.15s',
          display: 'flex', alignItems: 'center',
        }}
      >
        <Icon.X width="12" height="12" />
      </button>
    </div>
  );
}

/* ── Watchlist row ── */
function WatchRow({ wallet, result, onSelect, onRemove, scanning }) {
  const short = `${wallet.slice(0, 8)}...${wallet.slice(-6)}`;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: '0.6rem',
      padding: '0.6rem 0.75rem',
      background: result?.is_blacklisted ? 'rgba(240,58,90,0.06)' : 'var(--bg2)',
      border: `1px solid ${result?.is_blacklisted ? 'rgba(240,58,90,0.25)' : 'var(--border)'}`,
      borderLeft: `2px solid ${result ? riskColor(result.risk_level) : 'var(--border-hi)'}`,
      borderRadius: 'var(--radius)',
      animation: 'slide-in 0.3s ease both',
    }}>
      {/* Status */}
      {scanning ? (
        <span style={{ width: '14px', height: '14px', flexShrink: 0 }}>
          <div className="scan-ring-spin" style={{ width: '14px', height: '14px', position: 'relative', display: 'inline-block' }} />
        </span>
      ) : result ? (
        <ScorePill score={result.risk_score} level={result.risk_level} />
      ) : (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)' }}>
          Pending
        </span>
      )}

      {/* Address */}
      <button
        onClick={() => onSelect(wallet)}
        style={{
          flex: 1, background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-mono)', fontSize: '0.72rem',
          color: 'var(--text-mid)', textAlign: 'left', padding: 0,
        }}
        title={wallet}
      >
        {short}
      </button>

      {/* Last scan time */}
      {result?.scanned_at && (
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', whiteSpace: 'nowrap' }}>
          {timeAgo(result.scanned_at)}
        </span>
      )}

      {/* Alert badge if high risk */}
      {result?.risk_level === 'High' && (
        <span style={{
          fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
          color: 'var(--high)', background: 'rgba(240,58,90,0.12)',
          border: '1px solid rgba(240,58,90,0.3)',
          padding: '0.08rem 0.35rem', borderRadius: '3px', letterSpacing: '0.5px',
        }}>
          ALERT
        </span>
      )}

      {/* Remove */}
      <button
        onClick={() => onRemove(wallet)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
          color: 'var(--text-dim)', display: 'flex', alignItems: 'center',
        }}
      >
        <Icon.X width="12" height="12" />
      </button>
    </div>
  );
}

/* ── Main component ── */
export default function ScanHistory({
  history, watchlist, isWatched,
  onSelect, onRemove, onClear, onToggleWatch, onRemoveWatch,
}) {
  const [tab, setTab]           = useState('history'); // 'history' | 'watchlist'
  const [watchResults, setWatchResults] = useState({});
  const [scanning, setScanning] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef(null);
  const cdRef    = useRef(null);

  /* Auto-scan watchlist every 60s */
  const runWatchScan = async () => {
    if (!watchlist.length) return;
    setScanning(true);
    try {
      const { summaries } = await scanWatchlist(watchlist);
      const map = {};
      summaries.forEach((s) => { if (!s.error) map[s.wallet] = s; });
      setWatchResults(map);
    } catch {}
    finally { setScanning(false); }
  };

  useEffect(() => {
    if (!watchlist.length) return;
    runWatchScan();
    setCountdown(60);

    cdRef.current = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { return 60; } return c - 1; });
    }, 1000);

    timerRef.current = setInterval(runWatchScan, 60000);

    return () => {
      clearInterval(timerRef.current);
      clearInterval(cdRef.current);
    };
  }, [watchlist.join(',')]); // re-run when watchlist changes

  const alertCount = Object.values(watchResults).filter((r) => r.risk_level === 'High').length;

  return (
    <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
      {/* Tab header */}
      <div style={{
        display: 'flex', borderBottom: '1px solid var(--border)',
        background: 'var(--surface2)',
      }}>
        {[
          { id: 'history',   label: 'Scan History', Icon: Icon.History,  badge: history.length },
          { id: 'watchlist', label: 'Watchlist',     Icon: Icon.Bookmark, badge: alertCount || watchlist.length, alert: alertCount > 0 },
        ].map(({ id, label, Icon: TabIcon, badge, alert }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: '0.4rem', padding: '0.7rem 1rem',
              background: tab === id ? 'var(--surface3)' : 'none',
              border: 'none', borderBottom: tab === id ? '2px solid var(--cyan)' : '2px solid transparent',
              color: tab === id ? 'var(--cyan)' : 'var(--text-dim)',
              fontFamily: 'var(--font-ui)', fontSize: '0.78rem', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <TabIcon width="13" height="13" />
            {label}
            {badge > 0 && (
              <span style={{
                background: alert ? 'var(--high)' : 'var(--surface)',
                border: `1px solid ${alert ? 'rgba(240,58,90,0.4)' : 'var(--border)'}`,
                color: alert ? '#fff' : 'var(--text-dim)',
                fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                padding: '0.05rem 0.4rem', borderRadius: '10px', letterSpacing: '0.3px',
              }}>
                {badge}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ padding: '1rem' }}>

        {/* ── History tab ── */}
        {tab === 'history' && (
          <>
            {history.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                No scans yet — analyze a wallet to start building history
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>
                    {history.length} RECENT SCANS
                  </span>
                  <button
                    onClick={onClear}
                    style={{
                      background: 'none', border: '1px solid var(--border)',
                      color: 'var(--text-dim)', fontFamily: 'var(--font-mono)',
                      fontSize: '0.62rem', padding: '0.18rem 0.5rem',
                      borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}
                  >
                    <Icon.Trash width="11" height="11" /> Clear all
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '320px', overflowY: 'auto' }}>
                  {history.map((entry) => (
                    <HistoryRow
                      key={entry.wallet}
                      entry={entry}
                      onSelect={onSelect}
                      onRemove={onRemove}
                      onWatch={onToggleWatch}
                      isWatched={isWatched(entry.wallet)}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ── Watchlist tab ── */}
        {tab === 'watchlist' && (
          <>
            {watchlist.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)', lineHeight: 1.6 }}>
                No wallets being monitored.
                <br />
                Click the bookmark icon on any scan to add it.
              </div>
            ) : (
              <>
                {/* Watchlist status bar */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: '0.6rem',
                  padding: '0.45rem 0.7rem', marginBottom: '0.75rem',
                  background: 'var(--bg2)', border: '1px solid var(--border)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)',
                }}>
                  <span className="status-dot" style={{ background: scanning ? 'var(--cyan)' : 'var(--low)', boxShadow: `0 0 5px ${scanning ? 'var(--cyan-glow)' : 'var(--low-glow)'}` }} />
                  {scanning ? 'Scanning...' : `Auto-scan · next in ${countdown}s`}
                  <div style={{ flex: 1, height: '2px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', background: 'var(--cyan)', width: `${((60 - countdown) / 60) * 100}%`, transition: 'width 1s linear', borderRadius: '2px' }} />
                  </div>
                  <button
                    onClick={runWatchScan}
                    disabled={scanning}
                    style={{
                      background: 'none', border: '1px solid var(--border)',
                      color: 'var(--cyan)', fontFamily: 'var(--font-mono)',
                      fontSize: '0.6rem', padding: '0.15rem 0.45rem',
                      borderRadius: '4px', cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                      opacity: scanning ? 0.4 : 1,
                    }}
                  >
                    <Icon.Refresh width="10" height="10" /> Scan now
                  </button>
                  {alertCount > 0 && (
                    <span style={{
                      background: 'var(--high)', color: '#fff',
                      fontFamily: 'var(--font-mono)', fontSize: '0.58rem',
                      padding: '0.08rem 0.4rem', borderRadius: '3px', letterSpacing: '0.5px',
                    }}>
                      {alertCount} ALERT{alertCount > 1 ? 'S' : ''}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', maxHeight: '320px', overflowY: 'auto' }}>
                  {watchlist.map((wallet) => (
                    <WatchRow
                      key={wallet}
                      wallet={wallet}
                      result={watchResults[wallet]}
                      onSelect={onSelect}
                      onRemove={onRemoveWatch}
                      scanning={scanning}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
