import React from 'react';
import { Icon } from './Icons';

const TAG_COLORS = {
  PHISHING:        { bg: 'rgba(240,58,90,0.12)',  border: 'rgba(240,58,90,0.4)',  color: 'var(--high)' },
  BOT_DISTRIBUTION:{ bg: 'rgba(240,165,0,0.1)',   border: 'rgba(240,165,0,0.35)', color: 'var(--medium)' },
  PONZI:           { bg: 'rgba(240,58,90,0.12)',  border: 'rgba(240,58,90,0.4)',  color: 'var(--high)' },
  MIXER:           { bg: 'rgba(160,0,240,0.1)',   border: 'rgba(160,0,240,0.35)', color: '#a000f0' },
  SDF_FLAGGED:     { bg: 'rgba(240,100,0,0.1)',   border: 'rgba(240,100,0,0.35)', color: '#f06400' },
};

function TagBadge({ tag }) {
  const c = TAG_COLORS[tag] || TAG_COLORS.SDF_FLAGGED;
  return (
    <span style={{
      background: c.bg, border: `1px solid ${c.border}`, color: c.color,
      fontSize: '0.6rem', fontFamily: 'var(--font-mono)', letterSpacing: '1px',
      padding: '0.12rem 0.45rem', borderRadius: '3px', whiteSpace: 'nowrap',
    }}>
      {tag}
    </span>
  );
}

export default function BlacklistPanel({ entries = [], matchedAddress = null }) {
  return (
    <div className="card animate-in" style={{ animationDelay: '0.3s' }}>
      <div className="card-label">
        <Icon.Database width="12" height="12" />
        Threat Intelligence Database
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {entries.map((entry) => {
          const isMatch = entry.address === matchedAddress;
          return (
            <div key={entry.address} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.7rem',
              padding: '0.7rem 0.9rem',
              background: isMatch ? 'rgba(240,58,90,0.08)' : 'var(--bg2)',
              border: `1px solid ${isMatch ? 'rgba(240,58,90,0.35)' : 'var(--border)'}`,
              borderLeft: `2px solid ${isMatch ? 'var(--high)' : 'var(--border-hi)'}`,
              borderRadius: 'var(--radius)',
              transition: 'all 0.15s',
            }}>
              <span style={{ flexShrink: 0, marginTop: '2px', color: isMatch ? 'var(--high)' : 'var(--text-dim)' }}>
                <Icon.Target width="13" height="13" />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem', flexWrap: 'wrap' }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.68rem', color: isMatch ? 'var(--high)' : 'var(--text-dim)', wordBreak: 'break-all' }}>
                    {entry.address}
                  </span>
                  <TagBadge tag={entry.tag} />
                  {isMatch && (
                    <span style={{
                      background: 'var(--high)', color: 'var(--bg)',
                      fontSize: '0.58rem', fontFamily: 'var(--font-mono)',
                      padding: '0.08rem 0.38rem', borderRadius: '3px', letterSpacing: '1px',
                    }}>
                      MATCH
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '0.8rem', color: isMatch ? 'var(--text)' : 'var(--text-dim)', lineHeight: 1.5 }}>
                  {entry.reason}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
