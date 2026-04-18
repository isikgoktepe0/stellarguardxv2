import React, { useState, useEffect } from 'react';
import { Icon } from './Icons';

function useTypewriter(text, speed = 12) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    setDisplayed('');
    if (!text) return;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      setDisplayed(text.slice(0, i));
      if (i >= text.length) clearInterval(timer);
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);
  return displayed;
}

export default function AiSummary({ summary, riskLevel }) {
  const displayed = useTypewriter(summary, 12);
  const recIdx    = displayed.indexOf('RECOMMENDATION:');
  const mainText  = recIdx > -1 ? displayed.slice(0, recIdx).trim() : displayed;
  const recText   = recIdx > -1 ? displayed.slice(recIdx) : '';
  const typing    = displayed.length < (summary || '').length;

  const accentColor =
    riskLevel === 'High'   ? 'var(--high)'   :
    riskLevel === 'Medium' ? 'var(--medium)' : 'var(--cyan)';

  const borderColor =
    riskLevel === 'High'   ? 'rgba(240,58,90,0.28)'  :
    riskLevel === 'Medium' ? 'rgba(240,165,0,0.22)'  : 'rgba(45,212,240,0.2)';

  return (
    <div className="card animate-in" style={{ animationDelay: '0.2s', borderColor, boxShadow: `0 0 24px ${borderColor}` }}>
      <div className="card-label">
        <Icon.Brain width="12" height="12" />
        AI Threat Analysis
      </div>

      {/* Engine badge */}
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '1rem', padding: '0.32rem 0.7rem',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
      }}>
        <Icon.Brain width="11" height="11" style={{ color: accentColor }} />
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '0.5px' }}>
          StellarGuard-X Engine v3.0 · Behavioral Analysis
        </span>
        <span className="status-dot" style={{ background: 'var(--low)', boxShadow: '0 0 5px var(--low-glow)' }} />
      </div>

      {/* Analysis text */}
      <div style={{
        fontFamily: 'var(--font-ui)', fontSize: '0.88rem', lineHeight: 1.7,
        color: 'var(--text)', minHeight: '3.5rem', padding: '0.85rem 1rem',
        background: 'var(--bg2)', border: '1px solid var(--border)',
        borderRadius: 'var(--radius)', marginBottom: recText ? '0.75rem' : 0,
        position: 'relative',
      }}>
        {mainText}
        {typing && (
          <span style={{
            display: 'inline-block', width: '1px', height: '1em',
            background: accentColor, marginLeft: '2px', verticalAlign: 'text-bottom',
            animation: 'pulse-dot 0.5s step-end infinite',
          }} />
        )}
      </div>

      {/* Recommendation */}
      {recText && (
        <div style={{
          padding: '0.75rem 1rem',
          background: riskLevel === 'High' ? 'rgba(240,58,90,0.06)' : 'rgba(45,212,240,0.04)',
          border: `1px solid ${borderColor}`, borderRadius: 'var(--radius)',
          fontFamily: 'var(--font-mono)', fontSize: '0.75rem',
          color: accentColor, lineHeight: 1.6, letterSpacing: '0.2px',
        }}>
          {recText}
        </div>
      )}
    </div>
  );
}
