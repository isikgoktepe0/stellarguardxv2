import React, { useState, useEffect, useRef, useCallback } from 'react';
import WalletInput        from './components/WalletInput';
import RiskScore          from './components/RiskScore';
import RiskReasons        from './components/RiskReasons';
import WalletGraph        from './components/WalletGraph';
import PatternReport      from './components/PatternReport';
import AiSummary          from './components/AiSummary';
import BlacklistPanel     from './components/BlacklistPanel';
import SendPayment        from './components/SendPayment';
import PaymentRequest     from './components/PaymentRequest';
import SankeyFlow         from './components/SankeyFlow';
import WalletComparison   from './components/WalletComparison';
import ScanHistory        from './components/ScanHistory';
import ActivityHeatmap    from './components/ActivityHeatmap';
import { WalletPill, ConnectModal } from './components/WalletConnect';
import SubscriptionModal  from './components/SubscriptionModal';
import { Icon }           from './components/Icons';
import { analyzeWallet, fetchBlacklist } from './api';
import { useScanHistory } from './hooks/useScanHistory';
import { useWallet }      from './hooks/useWallet';

const REFRESH_INTERVAL = 30;

const LOADING_STEPS = [
  'Connecting to Stellar Horizon API',
  'Fetching transaction history',
  'Running blacklist checks',
  'Analyzing behavioral patterns',
  'Generating threat intelligence',
];

export default function App() {
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const [report, setReport]               = useState(null);
  const [blacklist, setBlacklist]         = useState([]);
  const [activeWallet, setActiveWallet]   = useState(null);
  const [loadStep, setLoadStep]           = useState(0);
  const [countdown, setCountdown]         = useState(REFRESH_INTERVAL);
  const [now, setNow]                     = useState(new Date());
  const [showBlacklist, setShowBlacklist] = useState(false);
  const [activeTab, setActiveTab]         = useState('analyze');

  const {
    history, addScan, removeHistory, clearHistory,
    watchlist, toggleWatch, removeWatch, isWatched,
  } = useScanHistory();

  const {
    wallet: connectedWallet,
    subscription,
    isSubscribed,
    connect,
    disconnect,
    refreshSubscription,
  } = useWallet();

  const [showConnect, setShowConnect]   = useState(false);
  const [showSubscribe, setShowSubscribe] = useState(false);

  const refreshTimer   = useRef(null);
  const countdownTimer = useRef(null);
  const stepTimer      = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    fetchBlacklist().then((d) => setBlacklist(d.entries || [])).catch(() => {});
  }, []);

  const runAnalysis = useCallback(async (wallet) => {
    // Gate: must be connected and subscribed
    if (!connectedWallet) { setShowConnect(true); return; }
    if (!isSubscribed)    { setShowSubscribe(true); return; }

    setLoading(true);
    setError(null);
    setLoadStep(0);
    let step = 0;
    stepTimer.current = setInterval(() => {
      step += 1;
      if (step < LOADING_STEPS.length) setLoadStep(step);
      else clearInterval(stepTimer.current);
    }, 600);
    try {
      const data = await analyzeWallet(wallet, connectedWallet);
      setReport(data);
      setActiveWallet(wallet);
      addScan(data);
      refreshSubscription(); // update scan count in header
    } catch (err) {
      // Handle subscription errors gracefully
      if (err.message.includes('Subscription') || err.message.includes('subscription')) {
        setShowSubscribe(true);
      } else {
        setError(err.message);
      }
    } finally {
      clearInterval(stepTimer.current);
      setLoading(false);
    }
  }, [connectedWallet, isSubscribed, addScan, refreshSubscription]);

  const handleAnalyze = (wallet) => {
    clearInterval(refreshTimer.current);
    clearInterval(countdownTimer.current);
    setCountdown(REFRESH_INTERVAL);
    runAnalysis(wallet);
  };

  useEffect(() => {
    if (!activeWallet || loading) return;
    setCountdown(REFRESH_INTERVAL);
    countdownTimer.current = setInterval(() => {
      setCountdown((c) => (c <= 1 ? REFRESH_INTERVAL : c - 1));
    }, 1000);
    refreshTimer.current = setInterval(() => runAnalysis(activeWallet), REFRESH_INTERVAL * 1000);
    return () => { clearInterval(refreshTimer.current); clearInterval(countdownTimer.current); };
  }, [activeWallet, loading, runAnalysis]);

  const progressPct   = ((REFRESH_INTERVAL - countdown) / REFRESH_INTERVAL) * 100;
  const timeStr       = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const isBlacklisted = report?.is_blacklisted || false;
  const connectedHits = report?.connected_blacklist_hits?.length || 0;
  const patterns      = report?.patterns || [];
  const aiSummary     = report?.ai_summary || '';

  const TABS = [
    { id: 'analyze',  label: 'Analyze',         Icon: Icon.Scan    },
    { id: 'compare',  label: 'Compare',          Icon: Icon.Network },
    { id: 'send',     label: 'Send XLM',         Icon: Icon.Send    },
    { id: 'request',  label: 'Payment Request',  Icon: Icon.Invoice },
  ];

  // Handler: click history item → re-analyze
  const handleHistorySelect = (wallet) => {
    setActiveTab('analyze');
    handleAnalyze(wallet);
  };

  return (
    <div className="app">

      {/* ── Header ── */}
      <header className="header">
        <div className="header-left">
          <div className="header-logo">
            <Icon.Shield width="22" height="22" />
            <h1>Stellar<span>Guard X</span></h1>
          </div>
          <span className="header-sub">Blockchain Fraud Detection &amp; Payment System</span>
        </div>

        <div className="header-right">
          <div className="header-stat online">
            <span className="status-dot" />
            System Online &nbsp;·&nbsp; {timeStr} UTC
          </div>
          <div className="header-stat threats">
            <span className="status-dot" />
            {blacklist.length} Threats in Database
          </div>

          {/* ── Wallet connect / subscription pill ── */}
          {connectedWallet ? (
            <WalletPill
              wallet={connectedWallet}
              subscription={subscription}
              onDisconnect={disconnect}
              onSubscribe={() => setShowSubscribe(true)}
            />
          ) : (
            <button
              className="btn-primary"
              onClick={() => setShowConnect(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', padding: '0.38rem 0.9rem', fontSize: '0.72rem' }}
            >
              <Icon.Wallet width="13" height="13" />
              Connect Wallet
            </button>
          )}

          <button className="btn-ghost" onClick={() => setShowBlacklist((v) => !v)}>
            <Icon.Database width="12" height="12" style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
            {showBlacklist ? 'Hide DB' : 'View DB'}
          </button>
        </div>
      </header>

      {/* ── Modals ── */}
      {showConnect && (
        <ConnectModal
          onConnect={(addr) => { connect(addr); setShowConnect(false); }}
          onClose={() => setShowConnect(false)}
        />
      )}
      {showSubscribe && connectedWallet && (
        <SubscriptionModal
          wallet={connectedWallet}
          onClose={() => setShowSubscribe(false)}
          onActivated={() => { refreshSubscription(); setShowSubscribe(false); }}
        />
      )}

      {showBlacklist && (
        <BlacklistPanel entries={blacklist} matchedAddress={isBlacklisted ? report?.wallet : null} />
      )}

      {/* ── Two-column layout: sidebar + main ── */}
      <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>

        {/* ── Sidebar: History + Watchlist ── */}
        <div style={{ width: '280px', flexShrink: 0, position: 'sticky', top: '1rem' }}>
          <ScanHistory
            history={history}
            watchlist={watchlist}
            isWatched={isWatched}
            onSelect={handleHistorySelect}
            onRemove={removeHistory}
            onClear={clearHistory}
            onToggleWatch={toggleWatch}
            onRemoveWatch={removeWatch}
          />
        </div>

        {/* ── Main content ── */}
        <div style={{ flex: 1, minWidth: 0 }}>

      {/* ── Tab bar ── */}
      <div className="tab-bar">
        {TABS.map(({ id, label, Icon: TabIcon }) => (
          <button
            key={id}
            className={`tab-btn${activeTab === id ? ' active' : ''}`}
            onClick={() => setActiveTab(id)}
          >
            <TabIcon width="14" height="14" />
            {label}
          </button>
        ))}
      </div>

      {/* ── Analyze tab ── */}
      {activeTab === 'analyze' && (
        <>
          {/* ── Paywall gate banner ── */}
          {(!connectedWallet || !isSubscribed) && (
            <div style={{
              background: 'rgba(45,212,240,0.04)',
              border: '1px solid rgba(45,212,240,0.2)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              animation: 'slide-in 0.3s ease',
            }}>
              <div>
                <div style={{ fontFamily: 'var(--font-title)', fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.3rem' }}>
                  {!connectedWallet ? 'Connect your wallet to start scanning' : 'Subscribe to unlock wallet analysis'}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                  {!connectedWallet
                    ? 'Enter your Stellar public key to verify your subscription'
                    : 'Plans start at 5 XLM / month · Demo mode available for free'
                  }
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {!connectedWallet ? (
                  <button
                    className="btn-primary"
                    onClick={() => setShowConnect(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Icon.Wallet width="13" height="13" />
                    Connect Wallet
                  </button>
                ) : (
                  <button
                    className="btn-primary"
                    onClick={() => setShowSubscribe(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                  >
                    <Icon.Invoice width="13" height="13" />
                    Subscribe
                  </button>
                )}
              </div>
            </div>
          )}

          <WalletInput onAnalyze={handleAnalyze} loading={loading} />

          {loading && (
            <div className="loading-overlay animate-in">
              <div className="scan-ring">
                <div className="scan-ring-inner" />
                <div className="scan-ring-spin" />
                <div className="scan-ring-spin2" />
                <div className="scan-ring-dot" />
              </div>
              <div className="loading-steps">
                {LOADING_STEPS.map((step, i) => (
                  <div key={i} className={`loading-step${i <= loadStep ? ' active' : ''}`}>
                    {i < loadStep
                      ? <Icon.Check width="11" height="11" style={{ color: 'var(--low)', flexShrink: 0 }} />
                      : i === loadStep
                        ? <Icon.Dot width="8" height="8" style={{ color: 'var(--cyan)', flexShrink: 0 }} />
                        : <Icon.Dot width="8" height="8" style={{ color: 'var(--border)', flexShrink: 0 }} />
                    }
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {error && (
            <div className="error-banner animate-in">
              <Icon.Alert width="14" height="14" />
              {error}
            </div>
          )}

          {report && !loading && (
            <>
              {isBlacklisted && (
                <div className="threat-alert animate-in" style={{ borderLeftColor: 'var(--high)', borderColor: 'rgba(240,58,90,0.3)', background: 'rgba(240,58,90,0.08)' }}>
                  <Icon.Target width="18" height="18" className="threat-alert-icon" />
                  <div className="threat-content">
                    <strong>Blacklisted Wallet — Known Threat Actor</strong>
                    <p>
                      [{report.blacklist_entry?.tag}] {report.blacklist_entry?.reason}.
                      This wallet is in our threat intelligence database. Do not interact under any circumstances.
                    </p>
                  </div>
                </div>
              )}

              {!isBlacklisted && report.risk_level === 'High' && (
                <div className="threat-alert animate-in">
                  <Icon.Alert width="18" height="18" className="threat-alert-icon" />
                  <div className="threat-content">
                    <strong>High Risk Wallet Detected</strong>
                    <p>
                      Multiple independent fraud indicators detected. This wallet exhibits behavioral
                      patterns consistent with automated bots, money laundering, or scam operations.
                    </p>
                  </div>
                </div>
              )}

              {connectedHits > 0 && (
                <div className="threat-alert animate-in" style={{ borderLeftColor: 'var(--medium)', borderColor: 'rgba(240,165,0,0.25)', background: 'rgba(240,165,0,0.06)' }}>
                  <Icon.Network width="18" height="18" className="threat-alert-icon warn" />
                  <div className="threat-content">
                    <strong className="warn">Connected Threat Detected</strong>
                    <p>
                      This wallet has transacted with {connectedHits} known malicious
                      address{connectedHits > 1 ? 'es' : ''} in our blacklist database.
                    </p>
                  </div>
                </div>
              )}

              {activeWallet && (
                <div className="refresh-bar animate-in">
                  <Icon.Refresh width="11" height="11" />
                  <span>Auto-refresh</span>
                  <div className="refresh-progress">
                    <div className="refresh-progress-fill" style={{ width: `${progressPct}%` }} />
                  </div>
                  <span>{countdown}s</span>
                  <button className="refresh-btn" onClick={() => handleAnalyze(activeWallet)}>
                    Refresh now
                  </button>
                  <button
                    onClick={() => toggleWatch(activeWallet)}
                    title={isWatched(activeWallet) ? 'Remove from watchlist' : 'Add to watchlist'}
                    style={{
                      background: isWatched(activeWallet) ? 'rgba(240,165,0,0.1)' : 'none',
                      border: `1px solid ${isWatched(activeWallet) ? 'rgba(240,165,0,0.3)' : 'var(--border)'}`,
                      color: isWatched(activeWallet) ? 'var(--medium)' : 'var(--text-dim)',
                      fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                      padding: '0.18rem 0.55rem', borderRadius: '4px',
                      cursor: 'pointer', transition: 'all 0.15s',
                      display: 'flex', alignItems: 'center', gap: '0.3rem',
                    }}
                  >
                    <Icon.Bookmark width="11" height="11" />
                    {isWatched(activeWallet) ? 'Watching' : 'Watch'}
                  </button>
                </div>
              )}

              <div className="dashboard-grid">
                <RiskScore
                  score={report.risk_score}
                  level={report.risk_level}
                  txCount={report.transaction_count}
                  wallet={report.wallet}
                  isBlacklisted={isBlacklisted}
                  connectedHits={connectedHits}
                />
                <RiskReasons reasons={report.reasons} level={report.risk_level} />
              </div>

              <AiSummary summary={aiSummary} riskLevel={report.risk_level} />
              <PatternReport patterns={patterns} />
              <WalletGraph nodes={report.graph.nodes} links={report.graph.links} targetWallet={report.wallet} />
              <SankeyFlow wallet={report.wallet} />
              <ActivityHeatmap wallet={report.wallet} />
              <BlacklistPanel entries={blacklist} matchedAddress={isBlacklisted ? report.wallet : null} />
            </>
          )}
        </>
      )}

      {activeTab === 'send'    && <SendPayment />}
      {activeTab === 'request' && <PaymentRequest />}
      {activeTab === 'compare' && <WalletComparison />}

        </div> {/* end main content */}
      </div>   {/* end two-column layout */}
    </div>
  );
}
