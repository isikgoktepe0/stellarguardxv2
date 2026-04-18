import React, { useState } from 'react';
import { sendPayment, getBalance } from '../api/paymentApi';
import { Icon } from './Icons';

const EXPLORER = 'https://stellar.expert/explorer/public/tx/';

export default function SendPayment() {
  const [form, setForm]          = useState({ sourceSecret: '', destination: '', amount: '', memo: '' });
  const [loading, setLoading]    = useState(false);
  const [result, setResult]      = useState(null);
  const [error, setError]        = useState(null);
  const [horizonCodes, setHCodes]= useState(null);
  const [blocked, setBlocked]    = useState(null);
  const [balance, setBalance]    = useState(null);
  const [balLoading, setBalLoad] = useState(false);
  const [showSecret, setShowSec] = useState(false);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    // Clear results when user edits
    if (result || error || blocked) {
      setResult(null); setError(null); setBlocked(null); setHCodes(null);
    }
  };

  const checkBalance = async () => {
    if (!form.destination.trim()) return;
    setBalLoad(true);
    setBalance(null);
    try {
      const data = await getBalance(form.destination.trim());
      setBalance(data);
    } catch (e) {
      setBalance({ error: e.message });
    } finally {
      setBalLoad(false);
    }
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError(null);
    setBlocked(null);
    setHCodes(null);

    try {
      const data = await sendPayment({
        sourceSecret: form.sourceSecret.trim(),
        destination:  form.destination.trim(),
        amount:       parseFloat(form.amount),
        memo:         form.memo.trim() || undefined,
      });

      if (data.blocked) {
        setBlocked(data.reason);
      } else {
        setResult(data);
        // Clear sensitive fields on success
        setForm((f) => ({ ...f, sourceSecret: '', amount: '', memo: '' }));
        setBalance(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isValid =
    form.sourceSecret.trim().length > 0 &&
    form.destination.trim().length > 0 &&
    parseFloat(form.amount) > 0;

  return (
    <div className="card animate-in" style={{ animationDelay: '0.1s' }}>
      <div className="card-label">
        <Icon.Send width="12" height="12" />
        Send XLM Payment
      </div>

      {/* Security notice */}
      <div style={{
        background: 'rgba(240,165,0,0.07)',
        border: '1px solid rgba(240,165,0,0.25)',
        borderLeft: '2px solid var(--medium)',
        borderRadius: 'var(--radius)',
        padding: '0.6rem 0.85rem',
        marginBottom: '1.25rem',
        fontFamily: 'var(--font-mono)',
        fontSize: '0.68rem',
        color: 'var(--medium)',
        lineHeight: 1.55,
        display: 'flex',
        gap: '0.5rem',
        alignItems: 'flex-start',
      }}>
        <Icon.Alert width="12" height="12" style={{ flexShrink: 0, marginTop: '1px' }} />
        <span>
          Demo mode — secret key is processed server-side for hackathon purposes only.
          In production, use a browser wallet (Freighter) for client-side signing.
        </span>
      </div>

      <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Source Secret */}
        <div>
          <label className="field-label">Source Secret Key (S...)</label>
          <div style={{ position: 'relative' }}>
            <input
              className="field-input"
              type={showSecret ? 'text' : 'password'}
              placeholder="SXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              value={form.sourceSecret}
              onChange={set('sourceSecret')}
              autoComplete="off"
              spellCheck={false}
              style={{ paddingRight: '2.8rem' }}
            />
            <button
              type="button"
              onClick={() => setShowSec((v) => !v)}
              style={{
                position: 'absolute', right: '0.7rem', top: '50%',
                transform: 'translateY(-50%)',
                background: 'none', border: 'none',
                color: 'var(--text-dim)', cursor: 'pointer',
                display: 'flex', alignItems: 'center',
              }}
            >
              {showSecret ? <Icon.EyeOff width="14" height="14" /> : <Icon.Eye width="14" height="14" />}
            </button>
          </div>
        </div>

        {/* Destination */}
        <div>
          <label className="field-label">Destination Address (G...)</label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              className="field-input"
              type="text"
              placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              value={form.destination}
              onChange={set('destination')}
              spellCheck={false}
            />
            <button
              type="button"
              className="btn-outline"
              onClick={checkBalance}
              disabled={!form.destination.trim() || balLoading}
              style={{ whiteSpace: 'nowrap' }}
            >
              {balLoading ? '...' : 'Check Balance'}
            </button>
          </div>

          {balance && (
            <div style={{
              marginTop: '0.4rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.7rem',
              color: balance.error ? 'var(--high)' : 'var(--low)',
              padding: '0.28rem 0.55rem',
              background: balance.error ? 'var(--high-dim)' : 'var(--low-dim)',
              borderRadius: '4px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
            }}>
              {balance.error ? (
                <><Icon.Alert width="11" height="11" />{balance.error}</>
              ) : (
                <>
                  <Icon.Check width="11" height="11" />
                  Balance: {parseFloat(balance.balance).toFixed(4)} XLM
                  {balance.note ? ` · ${balance.note}` : ''}
                </>
              )}
            </div>
          )}
        </div>

        {/* Amount + Memo */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <div>
            <label className="field-label">Amount (XLM)</label>
            <input
              className="field-input"
              type="number"
              placeholder="0.0000000"
              min="0.0000001"
              step="any"
              value={form.amount}
              onChange={set('amount')}
            />
          </div>
          <div>
            <label className="field-label">Memo (optional, max 28 chars)</label>
            <input
              className="field-input"
              type="text"
              placeholder="Payment note"
              maxLength={28}
              value={form.memo}
              onChange={set('memo')}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !isValid}
          className="btn-primary"
          style={{ alignSelf: 'flex-start' }}
        >
          {loading ? 'Submitting to Horizon...' : 'Send Payment'}
        </button>
      </form>

      {/* ── Blocked ── */}
      {blocked && (
        <div style={{
          marginTop: '1rem',
          background: 'var(--high-dim)',
          border: '1px solid rgba(240,58,90,0.3)',
          borderLeft: '2px solid var(--high)',
          borderRadius: 'var(--radius)',
          padding: '0.85rem 1rem',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.78rem',
          color: 'var(--high)',
          display: 'flex',
          gap: '0.55rem',
          alignItems: 'flex-start',
        }}>
          <Icon.Block width="14" height="14" style={{ flexShrink: 0, marginTop: '1px' }} />
          <div>
            <strong style={{ display: 'block', marginBottom: '0.25rem', letterSpacing: '0.8px', fontSize: '0.7rem' }}>
              PAYMENT BLOCKED BY STELLARGUARD X
            </strong>
            {blocked}
          </div>
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ marginTop: '1rem' }}>
          <div className="error-banner" style={{ marginBottom: horizonCodes ? '0.4rem' : 0 }}>
            <Icon.Alert width="13" height="13" />
            {error}
          </div>
          {horizonCodes && (
            <div style={{
              background: 'var(--bg2)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.5rem 0.75rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.65rem',
              color: 'var(--text-dim)',
            }}>
              Horizon codes: {JSON.stringify(horizonCodes)}
            </div>
          )}
        </div>
      )}

      {/* ── Success ── */}
      {result && (
        <div style={{
          marginTop: '1rem',
          background: 'var(--low-dim)',
          border: '1px solid rgba(34,217,138,0.25)',
          borderLeft: '2px solid var(--low)',
          borderRadius: 'var(--radius)',
          padding: '1rem',
          animation: 'slide-in 0.3s ease',
        }}>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.65rem',
            color: 'var(--low)',
            letterSpacing: '1.5px',
            marginBottom: '0.75rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
          }}>
            <Icon.Check width="12" height="12" />
            TRANSACTION CONFIRMED
          </div>

          {[
            { label: 'TX Hash', value: result.txHash, mono: true },
            { label: 'Fee',     value: `${result.fee} stroops (${(result.fee / 1e7).toFixed(7)} XLM)` },
            { label: 'Ledger',  value: result.ledger || '—' },
          ].map((row) => (
            <div key={row.label} style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '0.32rem 0',
              borderBottom: '1px solid var(--border)',
              gap: '1rem',
            }}>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.8px', flexShrink: 0 }}>
                {row.label}
              </span>
              <span style={{
                fontFamily: row.mono ? 'var(--font-mono)' : 'var(--font-ui)',
                fontSize: '0.75rem',
                color: 'var(--text-bright)',
                wordBreak: 'break-all',
                textAlign: 'right',
              }}>
                {row.value}
              </span>
            </div>
          ))}

          <a
            href={`${EXPLORER}${result.txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginTop: '0.75rem',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.68rem',
              color: 'var(--cyan)',
              textDecoration: 'none',
              border: '1px solid var(--border)',
              padding: '0.25rem 0.6rem',
              borderRadius: '4px',
              transition: 'all 0.15s',
            }}
          >
            <Icon.Link width="11" height="11" />
            View on Stellar Expert
          </a>
        </div>
      )}
    </div>
  );
}
