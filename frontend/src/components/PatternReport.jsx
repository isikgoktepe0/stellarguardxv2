import React, { useState } from 'react';
import { Icon } from './Icons';

const SEV = {
  HIGH:   { color: 'var(--high)',   bg: 'rgba(240,58,90,0.08)',  border: 'rgba(240,58,90,0.28)',  Icon: Icon.Alert },
  MEDIUM: { color: 'var(--medium)', bg: 'rgba(240,165,0,0.07)',  border: 'rgba(240,165,0,0.25)',  Icon: Icon.Alert },
  LOW:    { color: 'var(--low)',    bg: 'rgba(34,217,138,0.06)', border: 'rgba(34,217,138,0.2)',  Icon: Icon.Check },
};

function PatternCard({ pattern, index }) {
  const [open, setOpen] = useState(false);
  const cfg = SEV[pattern.severity] || SEV.MEDIUM;

  return (
    <div style={{
      background: cfg.bg, border: `1px solid ${cfg.border}`,
      borderLeft: `2px solid ${cfg.color}`, borderRadius: 'var(--radius)',
      overflow: 'hidden', animation: 'slide-in 0.35s ease both',
      animationDelay: `${index * 0.06}s`,
    }}>
      <div
        style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', padding: '0.7rem 0.9rem', cursor: 'pointer', userSelect: 'none' }}
        onClick={() => setOpen((v) => !v)}
      >
        <cfg.Icon width="13" height="13" style={{ color: cfg.color, flexShrink: 0 }} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontFamily: 'var(--font-ui)', fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-bright)' }}>
            {pattern.title}
          </span>
          <span style={{
            background: cfg.color, color: 'var(--bg)', fontSize: '0.58rem',
            fontFamily: 'var(--font-mono)', padding: '0.08rem 0.4rem',
            borderRadius: '3px', letterSpacing: '1px', fontWeight: 700,
          }}>
            {pattern.severity}
          </span>
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: cfg.color }}>
            +{pattern.score} pts
          </span>
        </div>
        <span style={{ color: 'var(--text-dim)', transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>
          <Icon.ChevronDown width="14" height="14" />
        </span>
      </div>
      {open && (
        <div style={{
          padding: '0 0.9rem 0.8rem 2.5rem', fontSize: '0.82rem',
          color: 'var(--text-mid)', lineHeight: 1.6,
          borderTop: `1px solid ${cfg.border}`, paddingTop: '0.7rem',
        }}>
          {pattern.detail}
        </div>
      )}
    </div>
  );
}

export default function PatternReport({ patterns = [] }) {
  if (!patterns.length) {
    return (
      <div className="card animate-in" style={{ animationDelay: '0.25s' }}>
        <div className="card-label"><Icon.Pattern width="12" height="12" />Behavioral Pattern Analysis</div>
        <p style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--low)', textAlign: 'center', padding: '1rem', letterSpacing: '0.5px' }}>
          No suspicious patterns detected
        </p>
      </div>
    );
  }

  const highCount  = patterns.filter((p) => p.severity === 'HIGH').length;
  const medCount   = patterns.filter((p) => p.severity === 'MEDIUM').length;
  const totalScore = patterns.reduce((s, p) => s + p.score, 0);

  return (
    <div className="card animate-in" style={{ animationDelay: '0.25s' }}>
      <div className="card-label"><Icon.Pattern width="12" height="12" />Behavioral Pattern Analysis</div>

      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Critical', value: highCount,        color: 'var(--high)' },
          { label: 'Warning',  value: medCount,         color: 'var(--medium)' },
          { label: 'Patterns', value: patterns.length,  color: 'var(--cyan)' },
          { label: 'Score Impact', value: `+${totalScore}`, color: 'var(--text-dim)' },
        ].map((s) => (
          <div key={s.label} style={{
            flex: 1, minWidth: '72px', background: 'var(--bg2)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: '0.5rem 0.65rem', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.25rem', color: s.color, fontWeight: 700 }}>
              {s.value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '1px', marginTop: '2px' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
        {patterns.map((p, i) => <PatternCard key={p.id} pattern={p} index={i} />)}
      </div>

      <p style={{ marginTop: '0.65rem', fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
        Click any row to expand details
      </p>
    </div>
  );
}
