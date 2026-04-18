import React, { useState } from 'react';
import { createPaymentRequest, getPaymentRequest } from '../api/paymentApi';
import { Icon } from './Icons';

/* ── Simple QR placeholder SVG ── */
function QrPlaceholder({ value }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '6px',
      padding: '10px', display: 'inline-block', lineHeight: 1, flexShrink: 0,
    }}>
      <svg width="96" height="96" viewBox="0 0 100 100">
        {[[5,5],[65,5],[5,65]].map(([x,y],i) => (
          <g key={i}>
            <rect x={x} y={y} width="30" height="30" fill="#111" rx="3"/>
            <rect x={x+5} y={y+5} width="20" height="20" fill="#fff" rx="2"/>
            <rect x={x+9} y={y+9} width="12" height="12" fill="#111" rx="1"/>
          </g>
        ))}
        {Array.from({ length: 20 }).map((_, i) => {
          const code = value.charCodeAt(i % value.length);
          return code % 3 === 0
            ? <rect key={i} x={40+(i%5)*10} y={40+Math.floor(i/5)*10} width="7" height="7" fill="#111" rx="1"/>
            : null;
        })}
        <rect x="65" y="65" width="30" height="30" fill="#111" rx="3"/>
        <rect x="70" y="70" width="20" height="20" fill="#fff" rx="2"/>
        <rect x="74" y="74" width="12" height="12" fill="#111" rx="1"/>
      </svg>
    </div>
  );
}

function statusColor(s) {
  if (s === 'paid')    return 'var(--low)';
  if (s === 'expired') return 'var(--high)';
  return 'var(--medium)';
}

function InfoRow({ label, value, color }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      padding: '0.28rem 0.5rem',
      background: 'var(--bg2)', borderRadius: '4px', border: '1px solid var(--border)',
    }}>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.6rem', color: 'var(--text-dim)', letterSpacing: '1px' }}>
        {label}
      </span>
      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: color || 'var(--text-bright)', wordBreak: 'break-all', textAlign: 'right', maxWidth: '60%' }}>
        {value}
      </span>
    </div>
  );
}

export default function PaymentRequest() {
  const [form, setForm]         = useState({ from: '', to: '', amount: '', memo: '' });
  const [loading, setLoading]   = useState(false);
  const [request, setRequest]   = useState(null);
  const [error, setError]       = useState(null);
  const [copied, setCopied]     = useState(false);

  const [lookupId, setLookupId] = useState('');
  const [looked, setLooked]     = useState(null);
  const [lookErr, setLookErr]   = useState(null);
  const [lookLoading, setLookLoading] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  /* ── Create ── */
  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setRequest(null);

    try {
      const data = await createPaymentRequest({
        from:   form.from.trim()  || undefined,
        to:     form.to.trim(),
        amount: parseFloat(form.amount),
        memo:   form.memo.trim()  || undefined,
      });
      setRequest(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ── Copy URL ── */
  const handleCopy = () => {
    if (!request?.paymentUrl) return;
    navigator.clipboard.writeText(request.paymentUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  /* ── Lookup ── */
  const handleLookup = async () => {
    const id = lookupId.trim();
    if (!id) return;
    setLookLoading(true);
    setLookErr(null);
    setLooked(null);
    try {
      const data = await getPaymentRequest(id);
      setLooked(data);
    } catch (err) {
      setLookErr(err.message);
    } finally {
      setLookLoading(false);
    }
  };

  const canCreate = form.to.trim().length > 0 && parseFloat(form.amount) > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

      {/* ── Create Request ── */}
      <div className="card animate-in" style={{ animationDelay: '0.1s' }}>
        <div className="card-label">
          <Icon.Invoice width="12" height="12" />
          Create Payment Request
        </div>

        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Payee address */}
          <div>
            <label className="field-label">Your Address — Payee (G...)</label>
            <input
              className="field-input"
              type="text"
              placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              value={form.to}
              onChange={set('to')}
              spellCheck={false}
              required
            />
          </div>

          {/* Amount + Memo */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="field-label">Amount (XLM)</label>
              <input
                className="field-input"
                type="number"
                placeholder="10.00"
                min="0.0000001"
                step="any"
                value={form.amount}
                onChange={set('amount')}
                required
              />
            </div>
            <div>
              <label className="field-label">Memo (optional, max 28 chars)</label>
              <input
                className="field-input"
                type="text"
                placeholder="Invoice #001"
                maxLength={28}
                value={form.memo}
                onChange={set('memo')}
              />
            </div>
          </div>

          {/* Optional payer */}
          <div>
            <label className="field-label">Payer Address (optional — leave blank for open request)</label>
            <input
              className="field-input"
              type="text"
              placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
              value={form.from}
              onChange={set('from')}
              spellCheck={false}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !canCreate}
            className="btn-primary"
            style={{ alignSelf: 'flex-start' }}
          >
            {loading ? 'Creating...' : 'Generate Request'}
          </button>
        </form>

        {error && (
          <div className="error-banner" style={{ marginTop: '1rem' }}>
            <Icon.Alert width="13" height="13" />
            {error}
          </div>
        )}

        {/* ── Result ── */}
        {request && (
          <div style={{
            marginTop: '1.25rem',
            background: 'rgba(45,212,240,0.04)',
            border: '1px solid rgba(45,212,240,0.18)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            animation: 'slide-in 0.3s ease',
          }}>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '0.65rem',
              color: 'var(--cyan)', letterSpacing: '1.5px',
              marginBottom: '1rem',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
            }}>
              <Icon.Check width="12" height="12" />
              PAYMENT REQUEST CREATED
            </div>

            <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', alignItems: 'flex-start' }}>
              <QrPlaceholder value={request.paymentUrl} />

              <div style={{ flex: 1, minWidth: '200px', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <InfoRow label="Request ID" value={request.requestId}  color="var(--cyan)" />
                <InfoRow label="Amount"     value={`${request.amount} XLM`} />
                <InfoRow label="Payee"      value={`${request.to.slice(0,8)}...${request.to.slice(-6)}`} />
                <InfoRow label="Status"     value={request.status.toUpperCase()} color={statusColor(request.status)} />
                <InfoRow label="Expires"    value={new Date(request.expiresAt).toLocaleString()} />
                {request.memo && <InfoRow label="Memo" value={request.memo} />}
              </div>
            </div>

            {/* URL + copy button */}
            <div style={{
              marginTop: '1rem',
              background: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              padding: '0.55rem 0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              flexWrap: 'wrap',
            }}>
              <span style={{
                fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
                color: 'var(--cyan)', flex: 1, wordBreak: 'break-all',
              }}>
                {request.paymentUrl}
              </span>
              <button
                onClick={handleCopy}
                style={{
                  background: copied ? 'var(--low-dim)' : 'var(--cyan-dim)',
                  border: `1px solid ${copied ? 'rgba(34,217,138,0.3)' : 'rgba(45,212,240,0.25)'}`,
                  color: copied ? 'var(--low)' : 'var(--cyan)',
                  fontFamily: 'var(--font-mono)', fontSize: '0.68rem',
                  padding: '0.28rem 0.7rem', borderRadius: '4px',
                  cursor: 'pointer', letterSpacing: '0.5px',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: '0.35rem',
                }}
              >
                {copied
                  ? <><Icon.Check width="11" height="11" />Copied</>
                  : <><Icon.Copy  width="11" height="11" />Copy URL</>
                }
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Lookup Request ── */}
      <div className="card animate-in" style={{ animationDelay: '0.15s' }}>
        <div className="card-label">
          <Icon.Scan width="12" height="12" />
          Lookup Payment Request
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            className="field-input"
            type="text"
            placeholder="REQ-XXXXXXXX"
            value={lookupId}
            onChange={(e) => { setLookupId(e.target.value); setLookErr(null); setLooked(null); }}
            spellCheck={false}
            style={{ flex: 1 }}
            onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
          />
          <button
            onClick={handleLookup}
            disabled={!lookupId.trim() || lookLoading}
            className="btn-primary"
          >
            {lookLoading ? '...' : 'Lookup'}
          </button>
        </div>

        {lookErr && (
          <div className="error-banner" style={{ marginTop: '0.75rem' }}>
            <Icon.Alert width="13" height="13" />
            {lookErr}
          </div>
        )}

        {looked && (
          <div style={{
            marginTop: '0.75rem',
            background: 'var(--bg2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1rem',
            animation: 'slide-in 0.3s ease',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
          }}>
            <InfoRow label="Request ID" value={looked.requestId} />
            <InfoRow label="Status"     value={looked.status.toUpperCase()} color={statusColor(looked.status)} />
            <InfoRow label="Amount"     value={`${looked.amount} XLM`} />
            <InfoRow label="To"         value={looked.to} />
            {looked.from && <InfoRow label="From" value={looked.from} />}
            {looked.memo && <InfoRow label="Memo" value={looked.memo} />}
            <InfoRow label="Created"    value={new Date(looked.createdAt).toLocaleString()} />
            <InfoRow label="Expires"    value={new Date(looked.expiresAt).toLocaleString()} />
            {looked.txHash && <InfoRow label="TX Hash" value={looked.txHash} color="var(--low)" />}
            {looked.paidAt && <InfoRow label="Paid At" value={new Date(looked.paidAt).toLocaleString()} color="var(--low)" />}
          </div>
        )}
      </div>
    </div>
  );
}
