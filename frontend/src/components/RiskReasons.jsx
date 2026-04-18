import React, { useState } from 'react';
import { Icon } from './Icons';

function classify(reason) {
  const r = reason.toLowerCase();
  if (reason.startsWith('BLACKLISTED') || reason.startsWith('[HIGH]'))
    return { flag: 'flag-high', Icon: Icon.Alert, label: 'Critical' };
  if (reason.startsWith('Connected to blacklisted'))
    return { flag: 'flag-high', Icon: Icon.Target, label: 'Connected Threat' };
  if (reason.startsWith('[MEDIUM]') || r.includes('low address') || r.includes('receive-only') || r.includes('send-only'))
    return { flag: 'flag-medium', Icon: Icon.Alert, label: 'Warning' };
  if (r.includes('no suspicious') || r.includes('normal'))
    return { flag: 'flag-low', Icon: Icon.Check, label: 'Clear' };
  return { flag: 'flag-medium', Icon: Icon.Alert, label: 'Notice' };
}

function stripPrefix(r) { return r.replace(/^\[(HIGH|MEDIUM|LOW)\]\s*/, ''); }
function truncate(s, max = 120) { return s.length > max ? s.slice(0, max) + '...' : s; }

export default function RiskReasons({ reasons = [] }) {
  const [expanded, setExpanded] = useState(null);
  if (!reasons.length) return null;

  return (
    <div className="card threat-intel-card animate-in" style={{ animationDelay: '0.15s' }}>
      <div className="card-label">
        <Icon.Alert width="12" height="12" />
        Threat Flags
      </div>
      {reasons.map((reason, i) => {
        const { flag, Icon: FlagIcon, label } = classify(reason);
        const clean  = stripPrefix(reason);
        const isOpen = expanded === i;
        const long   = clean.length > 120;
        return (
          <div
            key={i}
            className={`threat-item ${flag}`}
            style={{ cursor: long ? 'pointer' : 'default' }}
            onClick={() => long && setExpanded(isOpen ? null : i)}
          >
            <span className="threat-item-icon">
              <FlagIcon width="13" height="13" style={{
                color: flag === 'flag-high' ? 'var(--high)' : flag === 'flag-medium' ? 'var(--medium)' : 'var(--low)'
              }} />
            </span>
            <div className="threat-item-text">
              <strong>{label}</strong>
              {isOpen ? clean : truncate(clean)}
              {long && (
                <span style={{ marginLeft: '0.4rem', fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                  {isOpen ? '— less' : '— more'}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
