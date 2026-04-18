import React, { useState } from 'react';
import { Icon } from './Icons';

/**
 * WalletConnect
 * Modal for connecting a Stellar wallet by entering the public key.
 * Shows connected state with subscription info in the header.
 */

/* ── Connected pill shown in header ── */
export function WalletPill({ wallet, subscription, onDisconnect, onSubscribe }) {
  const [open, setOpen] = useState(false);
  const short = wallet ? `${wallet.slice(0, 6)}...${wallet.slice(-4)}` : '';

  const isActive = subscription?.active;
  const scansLeft = subscription?.scansRemaining === Infinity
    ? 'Unlimited'
    : subscription?.scansRemaining ?? 0;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: '0.45rem',
          padding: '0.38rem 0.8rem',
          background: isActive ? 'rgba(34,217,138,0.08)' : 'var(--surface)',
          border: `1px solid ${isActive ? 'rgba(34,217,138,0.25)' : 'var(--border)'}`,
          borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-mono)', fontSize: '0.67rem',
          color: isActive ? 'var(--low)' : 'var(--text-mid)',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <Icon.Wallet width="12" height="12" />
        {short}
        {isActive && (
          <span style={{
            background: 'var(--low)', color: 'var(--bg)',
            fontSize: '0.55rem', fontWeight: 700,
            padding: '0.05rem 0.35rem', borderRadius: '3px', letterSpacing: '0.5px',
          }}>
            {subscription.planName?.toUpperCase()}
          </span>
        )}
        <Icon.ChevronDown width="10" height="10" />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99 }}
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)',
            width: '260px', zIndex: 100,
            background: 'var(--surface2)',
            border: '1px solid var(--border-hi)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
            animation: 'slide-in 0.2s ease',
          }}>
            {/* Wallet address */}
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '1.5px', marginBottom: '0.3rem' }}>
                CONNECTED WALLET
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-bright)', wordBreak: 'break-all' }}>
                {wallet}
              </div>
            </div>

            {/* Subscription status */}
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius)', padding: '0.6rem 0.75rem',
              marginBottom: '0.75rem',
            }}>
              {isActive ? (
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)' }}>Plan</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--low)', fontWeight: 700 }}>
                      {subscription.planName}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)' }}>Scans left</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--cyan)' }}>
                      {scansLeft}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)' }}>Expires</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-mid)' }}>
                      {new Date(subscription.expiresAt).toLocaleDateString()}
                    </span>
                  </div>
                </>
              ) : (
                <div style={{ textAlign: 'center', fontFamily: 'var(--font-mono)', fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                  No active subscription
                </div>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              {!isActive && (
                <button
                  onClick={() => { setOpen(false); onSubscribe(); }}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Icon.Invoice width="13" height="13" />
                  Subscribe
                </button>
              )}
              <button
                onClick={() => { setOpen(false); onDisconnect(); }}
                className="btn-outline"
                style={{ width: '100%', justifyContent: 'center', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Icon.X width="12" height="12" />
                Disconnect
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Connect modal ── */
export function ConnectModal({ onConnect, onClose }) {
  const [address, setAddress] = useState('');
  const [error, setError]     = useState('');

  const handleConnect = () => {
    const trimmed = address.trim();
    if (!trimmed.startsWith('G') || trimmed.length !== 56) {
      setError('Enter a valid Stellar public key (G..., 56 characters)');
      return;
    }
    onConnect(trimmed);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(6,10,18,0.85)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
      backdropFilter: 'blur(4px)',
      animation: 'fade-in 0.2s ease',
    }}>
      <div style={{
        background: 'var(--surface2)',
        border: '1px solid var(--border-hi)',
        borderRadius: 'var(--radius-lg)',
        padding: '2rem',
        width: '100%', maxWidth: '480px',
        animation: 'slide-in 0.25s ease',
        position: 'relative',
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '1rem', right: '1rem',
            background: 'none', border: 'none',
            color: 'var(--text-dim)', cursor: 'pointer',
            display: 'flex', alignItems: 'center',
          }}
        >
          <Icon.X width="16" height="16" />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
          <Icon.Wallet width="20" height="20" style={{ color: 'var(--cyan)' }} />
          <div>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-bright)' }}>
              Connect Wallet
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>
              STELLAR PUBLIC KEY
            </div>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label className="field-label">Your Stellar Public Key (G...)</label>
          <input
            className="field-input"
            type="text"
            placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
            value={address}
            onChange={(e) => { setAddress(e.target.value); setError(''); }}
            spellCheck={false}
            autoFocus
            onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
          />
          {error && (
            <div style={{ marginTop: '0.4rem', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: 'var(--high)' }}>
              {error}
            </div>
          )}
        </div>

        <div style={{
          background: 'rgba(45,212,240,0.05)',
          border: '1px solid rgba(45,212,240,0.15)',
          borderRadius: 'var(--radius)',
          padding: '0.65rem 0.85rem',
          marginBottom: '1.25rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.68rem',
          color: 'var(--text-dim)',
          lineHeight: 1.6,
        }}>
          Your public key is used to verify your subscription. Your secret key is never required here.
        </div>

        <button
          className="btn-primary"
          onClick={handleConnect}
          disabled={!address.trim()}
          style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
        >
          <Icon.Wallet width="14" height="14" />
          Connect Wallet
        </button>
      </div>
    </div>
  );
}
