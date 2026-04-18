import React, { useState, useEffect } from 'react';
import { Icon } from './Icons';
import { fetchPlans, activateSubscription, activateDemoSubscription } from '../api';

const PLAN_COLORS = {
  basic:     { color: 'var(--cyan)',    border: 'rgba(45,212,240,0.3)',  bg: 'rgba(45,212,240,0.06)' },
  pro:       { color: 'var(--low)',     border: 'rgba(34,217,138,0.3)',  bg: 'rgba(34,217,138,0.06)' },
  unlimited: { color: 'var(--medium)', border: 'rgba(240,165,0,0.3)',   bg: 'rgba(240,165,0,0.06)' },
};

export default function SubscriptionModal({ wallet, onClose, onActivated }) {
  const [plans, setPlans]         = useState([]);
  const [treasury, setTreasury]   = useState('');
  const [selected, setSelected]   = useState('pro');
  const [step, setStep]           = useState('plans'); // plans | pay | verify | done
  const [txHash, setTxHash]       = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verifyErr, setVerifyErr] = useState('');
  const [result, setResult]       = useState(null);
  const [copied, setCopied]       = useState(null); // 'treasury' | 'amount' | null
  const [demoLoading, setDemoLoading] = useState(false);

  useEffect(() => {
    fetchPlans()
      .then((d) => { setPlans(d.plans); setTreasury(d.treasury); })
      .catch(() => {});
  }, []);

  const selectedPlan = plans.find((p) => p.id === selected);

  const copy = (text, key) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  /* ── Demo activation (no payment needed) ── */
  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      const data = await activateDemoSubscription(wallet);
      setResult(data.subscription);
      setStep('done');
      onActivated(data.subscription);
    } catch (err) {
      setVerifyErr(err.message);
    } finally {
      setDemoLoading(false);
    }
  };

  /* ── Real payment verification ── */
  const handleVerify = async () => {
    if (!txHash.trim()) return;
    setVerifying(true);
    setVerifyErr('');
    try {
      const data = await activateSubscription(wallet, selected, txHash.trim());
      setResult(data.subscription);
      setStep('done');
      onActivated(data.subscription);
    } catch (err) {
      setVerifyErr(err.message);
    } finally {
      setVerifying(false);
    }
  };

  const shortWallet = wallet ? `${wallet.slice(0, 8)}...${wallet.slice(-6)}` : '';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(6,10,18,0.9)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      backdropFilter: 'blur(6px)',
      animation: 'fade-in 0.2s ease',
    }}>
      <div style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border-hi)',
        borderRadius: 'var(--radius-lg)',
        width: '100%', maxWidth: '540px',
        maxHeight: '92vh', overflowY: 'auto',
        animation: 'slide-in 0.25s ease',
        position: 'relative',
      }}>

        {/* ── Modal header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '1.25rem 1.5rem',
          borderBottom: '1px solid var(--border)',
          position: 'sticky', top: 0,
          background: 'var(--surface2)', zIndex: 1,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <Icon.Invoice width="18" height="18" style={{ color: 'var(--cyan)' }} />
            <div>
              <div style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 700, color: 'var(--text-bright)' }}>
                Subscribe to StellarGuard X
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--medium)', letterSpacing: '1px' }}>
                STELLAR TESTNET · PAY WITH XLM
              </div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}>
            <Icon.X width="16" height="16" />
          </button>
        </div>

        <div style={{ padding: '1.5rem' }}>

          {/* ── Wallet info ── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.5rem 0.75rem', marginBottom: '1.25rem',
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
          }}>
            <Icon.Wallet width="13" height="13" style={{ color: 'var(--cyan)', flexShrink: 0 }} />
            <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-mid)' }}>
              {shortWallet}
            </span>
          </div>

          {/* ── STEP: Choose plan ── */}
          {step === 'plans' && (
            <>
              {/* Demo button — prominent at top */}
              <div style={{
                background: 'rgba(34,217,138,0.06)',
                border: '1px solid rgba(34,217,138,0.25)',
                borderRadius: 'var(--radius)',
                padding: '0.85rem 1rem',
                marginBottom: '1.25rem',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                gap: '1rem', flexWrap: 'wrap',
              }}>
                <div>
                  <div style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '0.88rem', color: 'var(--low)', marginBottom: '0.2rem' }}>
                    Hackathon Demo Mode
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
                    Activate Pro plan instantly — no payment required
                  </div>
                </div>
                <button
                  className="btn-primary"
                  onClick={handleDemo}
                  disabled={demoLoading}
                  style={{
                    background: 'var(--low)', color: 'var(--bg)',
                    display: 'flex', alignItems: 'center', gap: '0.4rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {demoLoading
                    ? 'Activating...'
                    : <><Icon.Check width="13" height="13" />Free Demo</>
                  }
                </button>
              </div>

              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.62rem',
                color: 'var(--text-dim)', letterSpacing: '1.5px',
                marginBottom: '0.75rem', textAlign: 'center',
              }}>
                — OR PAY WITH XLM ON TESTNET —
              </div>

              {/* Plan cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.25rem' }}>
                {plans.map((plan) => {
                  const c = PLAN_COLORS[plan.id] || PLAN_COLORS.basic;
                  const isSel = selected === plan.id;
                  return (
                    <div
                      key={plan.id}
                      onClick={() => setSelected(plan.id)}
                      style={{
                        padding: '0.85rem 1rem',
                        background: isSel ? c.bg : 'var(--bg2)',
                        border: `1px solid ${isSel ? c.border : 'var(--border)'}`,
                        borderLeft: `3px solid ${isSel ? c.color : 'var(--border)'}`,
                        borderRadius: 'var(--radius)',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <div style={{
                            width: '13px', height: '13px', borderRadius: '50%',
                            border: `2px solid ${isSel ? c.color : 'var(--border)'}`,
                            background: isSel ? c.color : 'none', flexShrink: 0,
                          }} />
                          <span style={{ fontFamily: 'var(--font-title)', fontSize: '0.9rem', fontWeight: 700, color: isSel ? c.color : 'var(--text-bright)' }}>
                            {plan.name}
                          </span>
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.95rem', fontWeight: 700, color: c.color }}>
                          {plan.price} XLM
                          <span style={{ fontSize: '0.6rem', color: 'var(--text-dim)', fontWeight: 400 }}> / 30d</span>
                        </span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.3rem' }}>
                        {plan.features.map((f) => (
                          <span key={f} style={{
                            fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                            color: 'var(--text-dim)', background: 'var(--surface)',
                            border: '1px solid var(--border)',
                            padding: '0.08rem 0.4rem', borderRadius: '3px',
                          }}>{f}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                className="btn-primary"
                onClick={() => setStep('pay')}
                disabled={!selectedPlan}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Icon.Send width="13" height="13" />
                Pay {selectedPlan?.price} XLM for {selectedPlan?.name}
              </button>
            </>
          )}

          {/* ── STEP: Payment instructions ── */}
          {step === 'pay' && selectedPlan && (
            <>
              {/* Testnet notice */}
              <div style={{
                background: 'rgba(240,165,0,0.07)',
                border: '1px solid rgba(240,165,0,0.25)',
                borderLeft: '2px solid var(--medium)',
                borderRadius: 'var(--radius)',
                padding: '0.6rem 0.85rem',
                marginBottom: '1rem',
                fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                color: 'var(--medium)', lineHeight: 1.55,
                display: 'flex', gap: '0.5rem', alignItems: 'flex-start',
              }}>
                <Icon.Alert width="12" height="12" style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  This is the Stellar <strong>Testnet</strong>. Use Stellar Laboratory or any testnet wallet to send.
                  Get free testnet XLM from{' '}
                  <a href="https://laboratory.stellar.org/account-creator" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
                    Stellar Friendbot
                  </a>.
                </span>
              </div>

              {/* Payment details */}
              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '1rem', marginBottom: '1rem',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '1.5px', marginBottom: '0.75rem' }}>
                  SEND THIS EXACT PAYMENT ON TESTNET
                </div>

                {[
                  { label: 'Amount',      value: `${selectedPlan.price}.0000000 XLM`, key: 'amount', copyVal: `${selectedPlan.price}.0000000` },
                  { label: 'From',        value: shortWallet },
                  { label: 'To (Treasury)', value: treasury, key: 'treasury', copyVal: treasury },
                  { label: 'Memo',        value: `SGX-${selectedPlan.id.toUpperCase()}` },
                  { label: 'Network',     value: 'TESTNET', color: 'var(--medium)' },
                ].map((row) => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '0.38rem 0', borderBottom: '1px solid var(--border)', gap: '0.75rem',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', flexShrink: 0 }}>
                      {row.label}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: row.color || 'var(--text-bright)', wordBreak: 'break-all', textAlign: 'right' }}>
                        {row.value}
                      </span>
                      {row.copyVal && (
                        <button
                          onClick={() => copy(row.copyVal, row.key)}
                          style={{
                            background: copied === row.key ? 'var(--low-dim)' : 'var(--cyan-dim)',
                            border: `1px solid ${copied === row.key ? 'rgba(34,217,138,0.3)' : 'rgba(45,212,240,0.2)'}`,
                            color: copied === row.key ? 'var(--low)' : 'var(--cyan)',
                            fontFamily: 'var(--font-mono)', fontSize: '0.6rem',
                            padding: '0.1rem 0.4rem', borderRadius: '3px',
                            cursor: 'pointer', transition: 'all 0.15s', flexShrink: 0,
                            display: 'flex', alignItems: 'center', gap: '0.2rem',
                          }}
                        >
                          {copied === row.key
                            ? <><Icon.Check width="9" height="9" />OK</>
                            : <><Icon.Copy width="9" height="9" />Copy</>
                          }
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Stellar Laboratory link */}
              <a
                href={`https://laboratory.stellar.org/transaction-builder?network=test`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.4rem',
                  padding: '0.6rem 0.85rem', marginBottom: '1rem',
                  background: 'rgba(45,212,240,0.05)',
                  border: '1px solid rgba(45,212,240,0.2)',
                  borderRadius: 'var(--radius)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.7rem',
                  color: 'var(--cyan)', textDecoration: 'none',
                  transition: 'all 0.15s',
                }}
              >
                <Icon.Link width="13" height="13" />
                Open Stellar Laboratory (Testnet) to send payment
              </a>

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button className="btn-outline" onClick={() => setStep('plans')} style={{ flex: 1 }}>
                  Back
                </button>
                <button
                  className="btn-primary"
                  onClick={() => setStep('verify')}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  <Icon.Check width="13" height="13" />
                  I sent the payment
                </button>
              </div>
            </>
          )}

          {/* ── STEP: Verify TX hash ── */}
          {step === 'verify' && (
            <>
              <div style={{ marginBottom: '1rem' }}>
                <label className="field-label">Testnet Transaction Hash</label>
                <input
                  className="field-input"
                  type="text"
                  placeholder="Paste your testnet TX hash..."
                  value={txHash}
                  onChange={(e) => { setTxHash(e.target.value); setVerifyErr(''); }}
                  spellCheck={false}
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                />
                <div style={{ marginTop: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.63rem', color: 'var(--text-dim)', lineHeight: 1.5 }}>
                  Find the TX hash in{' '}
                  <a href="https://stellar.expert/explorer/testnet" target="_blank" rel="noopener noreferrer"
                    style={{ color: 'var(--cyan)', textDecoration: 'none' }}>
                    Stellar Expert (Testnet)
                  </a>{' '}
                  after sending.
                </div>
              </div>

              {verifyErr && (
                <div className="error-banner" style={{ marginBottom: '1rem' }}>
                  <Icon.Alert width="13" height="13" />
                  {verifyErr}
                </div>
              )}

              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <button className="btn-outline" onClick={() => setStep('pay')} style={{ flex: 1 }}>
                  Back
                </button>
                <button
                  className="btn-primary"
                  onClick={handleVerify}
                  disabled={verifying || !txHash.trim()}
                  style={{ flex: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem' }}
                >
                  {verifying
                    ? <>Verifying on Testnet...</>
                    : <><Icon.Check width="13" height="13" />Verify & Activate</>
                  }
                </button>
              </div>
            </>
          )}

          {/* ── STEP: Done ── */}
          {step === 'done' && result && (
            <div style={{ textAlign: 'center', padding: '0.5rem 0' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'var(--low-dim)', border: '2px solid var(--low)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 1rem',
                boxShadow: '0 0 20px var(--low-glow)',
              }}>
                <Icon.Check width="24" height="24" style={{ color: 'var(--low)' }} />
              </div>

              <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-bright)', marginBottom: '0.3rem' }}>
                Subscription Activated
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '1.25rem' }}>
                {result.planName} plan · {result.scansRemaining === Infinity ? 'Unlimited' : result.scansRemaining} scans available
              </div>

              <div style={{
                background: 'var(--bg2)', border: '1px solid var(--border)',
                borderRadius: 'var(--radius)', padding: '0.75rem',
                marginBottom: '1.25rem', textAlign: 'left',
              }}>
                {[
                  { label: 'Plan',    value: result.planName },
                  { label: 'Scans',   value: result.scansLimit === Infinity ? 'Unlimited' : result.scansLimit },
                  { label: 'Expires', value: new Date(result.expiresAt).toLocaleDateString() },
                ].map((row) => (
                  <div key={row.label} style={{
                    display: 'flex', justifyContent: 'space-between',
                    padding: '0.28rem 0', borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)' }}>{row.label}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-bright)' }}>{row.value}</span>
                  </div>
                ))}
              </div>

              <button className="btn-primary" onClick={onClose}
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Icon.Scan width="14" height="14" />
                Start Scanning
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
