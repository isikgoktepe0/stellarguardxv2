import React, { useState, useEffect, useMemo } from 'react';
import { Icon } from './Icons';

/**
 * ActivityHeatmap
 * Fetches raw payment timestamps from Horizon and renders a
 * GitHub-style contribution calendar showing transaction activity
 * over the last 52 weeks (1 year).
 *
 * No external library — pure SVG + CSS.
 */

const CELL  = 11;   // cell size px
const GAP   = 2;    // gap between cells
const STEP  = CELL + GAP;
const WEEKS = 52;
const DAYS  = 7;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

/* Color scale: 0 = empty, 1-4 = intensity levels */
function cellColor(count, maxCount) {
  if (!count) return 'var(--border)';
  const ratio = count / Math.max(maxCount, 1);
  if (ratio < 0.2) return 'rgba(45,212,240,0.25)';
  if (ratio < 0.4) return 'rgba(45,212,240,0.45)';
  if (ratio < 0.7) return 'rgba(45,212,240,0.7)';
  return 'var(--cyan)';
}

/* Build a 52×7 grid of { date, count } from a list of ISO timestamps */
function buildGrid(timestamps) {
  // Count per day (YYYY-MM-DD)
  const dayMap = {};
  timestamps.forEach((ts) => {
    const d = ts.slice(0, 10); // "2024-03-15"
    dayMap[d] = (dayMap[d] || 0) + 1;
  });

  // Start from 52 weeks ago, aligned to Sunday
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(today);
  startDate.setDate(today.getDate() - WEEKS * 7 + 1);
  // Align to Sunday
  startDate.setDate(startDate.getDate() - startDate.getDay());

  const grid = []; // grid[week][day]
  let maxCount = 0;

  for (let w = 0; w < WEEKS; w++) {
    const week = [];
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + w * 7 + d);
      const key   = date.toISOString().slice(0, 10);
      const count = dayMap[key] || 0;
      if (count > maxCount) maxCount = count;
      week.push({ date: key, count, future: date > today });
    }
    grid.push(week);
  }

  return { grid, maxCount };
}

/* Month label positions */
function monthLabels(grid) {
  const labels = [];
  let lastMonth = -1;
  grid.forEach((week, wi) => {
    const month = new Date(week[0].date).getMonth();
    if (month !== lastMonth) {
      labels.push({ week: wi, label: MONTHS[month] });
      lastMonth = month;
    }
  });
  return labels;
}

/* Fetch payments from Horizon directly (client-side, no backend needed) */
async function fetchTimestamps(wallet) {
  const url = `https://horizon.stellar.org/accounts/${encodeURIComponent(wallet)}/payments?limit=200&order=desc`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error('Failed to fetch from Horizon');
  const data = await res.json();
  const records = data?._embedded?.records || [];
  return records
    .filter((r) => r.type === 'payment' || r.type === 'create_account')
    .map((r) => r.created_at)
    .filter(Boolean);
}

export default function ActivityHeatmap({ wallet }) {
  const [timestamps, setTimestamps] = useState([]);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(null);
  const [tooltip, setTooltip]       = useState(null); // { x, y, date, count }

  useEffect(() => {
    if (!wallet) return;
    setLoading(true);
    setError(null);
    fetchTimestamps(wallet)
      .then(setTimestamps)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [wallet]);

  const { grid, maxCount } = useMemo(
    () => buildGrid(timestamps),
    [timestamps]
  );

  const mLabels = useMemo(() => monthLabels(grid), [grid]);

  // Stats
  const totalTx   = timestamps.length;
  const activeDays = useMemo(() => {
    const s = new Set(timestamps.map((t) => t.slice(0, 10)));
    return s.size;
  }, [timestamps]);

  const peakDay = useMemo(() => {
    const map = {};
    timestamps.forEach((t) => { const d = t.slice(0, 10); map[d] = (map[d] || 0) + 1; });
    let best = null, bestCount = 0;
    Object.entries(map).forEach(([d, c]) => { if (c > bestCount) { bestCount = c; best = d; } });
    return best ? { date: best, count: bestCount } : null;
  }, [timestamps]);

  // Hour distribution (for "most active hour" stat)
  const peakHour = useMemo(() => {
    const hours = new Array(24).fill(0);
    timestamps.forEach((t) => {
      const h = new Date(t).getUTCHours();
      hours[h]++;
    });
    const max = Math.max(...hours);
    return { hour: hours.indexOf(max), count: max };
  }, [timestamps]);

  const SVG_W = WEEKS * STEP + 30; // +30 for day labels
  const SVG_H = DAYS  * STEP + 24; // +24 for month labels

  if (loading) {
    return (
      <div className="card animate-in" style={{ padding: '2rem', textAlign: 'center' }}>
        <div className="card-label"><Icon.Calendar width="12" height="12" />Activity Heatmap</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
          Loading activity data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card animate-in">
        <div className="card-label"><Icon.Calendar width="12" height="12" />Activity Heatmap</div>
        <div className="error-banner"><Icon.Alert width="13" height="13" />{error}</div>
      </div>
    );
  }

  return (
    <div className="card animate-in" style={{ animationDelay: '0.4s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div className="card-label" style={{ marginBottom: 0 }}>
          <Icon.Calendar width="12" height="12" />
          Activity Heatmap — Last 12 Months
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)' }}>
          {totalTx} transactions · {activeDays} active days
        </span>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        {[
          { label: 'Total Tx',    value: totalTx,       color: 'var(--cyan)' },
          { label: 'Active Days', value: activeDays,    color: 'var(--low)' },
          { label: 'Peak Day',    value: peakDay ? `${peakDay.count} tx` : '—', color: 'var(--medium)' },
          { label: 'Peak Hour',   value: peakHour.count ? `${peakHour.hour}:00 UTC` : '—', color: 'var(--text-mid)' },
        ].map((s) => (
          <div key={s.label} style={{
            flex: 1, minWidth: '80px', background: 'var(--bg2)',
            border: '1px solid var(--border)', borderRadius: 'var(--radius)',
            padding: '0.45rem 0.65rem', textAlign: 'center',
          }}>
            <div style={{ fontFamily: 'var(--font-title)', fontSize: '1rem', fontWeight: 700, color: s.color }}>
              {s.value}
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '1px', marginTop: '2px' }}>
              {s.label}
            </div>
          </div>
        ))}
      </div>

      {/* Heatmap SVG */}
      <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', overflowX: 'auto', position: 'relative' }}>
        <svg
          width={SVG_W}
          height={SVG_H}
          style={{ display: 'block', minWidth: SVG_W }}
        >
          {/* Month labels */}
          {mLabels.map(({ week, label }) => (
            <text
              key={`${week}-${label}`}
              x={30 + week * STEP}
              y={10}
              fontSize="8"
              fill="var(--text-dim)"
              fontFamily="'JetBrains Mono',monospace"
            >
              {label}
            </text>
          ))}

          {/* Day labels */}
          {['S','M','T','W','T','F','S'].map((d, i) => (
            i % 2 === 1 && (
              <text
                key={i}
                x={8}
                y={20 + i * STEP + CELL * 0.75}
                fontSize="7.5"
                fill="var(--text-dim)"
                fontFamily="'JetBrains Mono',monospace"
                textAnchor="middle"
              >
                {d}
              </text>
            )
          ))}

          {/* Cells */}
          {grid.map((week, wi) =>
            week.map((cell, di) => {
              if (cell.future) return null;
              const x = 30 + wi * STEP;
              const y = 16 + di * STEP;
              const color = cellColor(cell.count, maxCount);
              return (
                <rect
                  key={`${wi}-${di}`}
                  x={x} y={y}
                  width={CELL} height={CELL}
                  rx="2"
                  fill={color}
                  style={{ cursor: cell.count ? 'pointer' : 'default', transition: 'fill 0.1s' }}
                  onMouseEnter={(e) => {
                    if (!cell.count) return;
                    setTooltip({ x: e.clientX, y: e.clientY, date: cell.date, count: cell.count });
                  }}
                  onMouseLeave={() => setTooltip(null)}
                />
              );
            })
          )}
        </svg>

        {/* Tooltip */}
        {tooltip && (
          <div style={{
            position: 'fixed',
            left: tooltip.x + 12,
            top:  tooltip.y - 36,
            background: 'var(--surface2)',
            border: '1px solid var(--border-hi)',
            borderRadius: 'var(--radius)',
            padding: '0.3rem 0.6rem',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.7rem',
            color: 'var(--text-bright)',
            pointerEvents: 'none',
            zIndex: 1000,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
          }}>
            <span style={{ color: 'var(--cyan)' }}>{tooltip.count} tx</span>
            {' · '}
            {tooltip.date}
          </div>
        )}
      </div>

      {/* Hour distribution bar chart */}
      {totalTx > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)', letterSpacing: '1.5px', marginBottom: '0.5rem' }}>
            HOURLY DISTRIBUTION (UTC)
          </div>
          <HourChart timestamps={timestamps} />
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)' }}>
        <span>Less</span>
        {['var(--border)', 'rgba(45,212,240,0.25)', 'rgba(45,212,240,0.45)', 'rgba(45,212,240,0.7)', 'var(--cyan)'].map((c, i) => (
          <span key={i} style={{ width: '11px', height: '11px', borderRadius: '2px', background: c, display: 'inline-block' }} />
        ))}
        <span>More</span>
        <span style={{ marginLeft: 'auto' }}>Hover cells for details</span>
      </div>
    </div>
  );
}

/* ── Hour distribution mini bar chart ── */
function HourChart({ timestamps }) {
  const hours = useMemo(() => {
    const arr = new Array(24).fill(0);
    timestamps.forEach((t) => { arr[new Date(t).getUTCHours()]++; });
    return arr;
  }, [timestamps]);

  const max = Math.max(...hours, 1);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: '40px' }}>
      {hours.map((count, h) => {
        const heightPct = (count / max) * 100;
        const isNight   = h >= 0 && h < 6;
        const isPeak    = count === max && count > 0;
        return (
          <div
            key={h}
            title={`${h}:00 UTC — ${count} tx`}
            style={{
              flex: 1,
              height: `${Math.max(heightPct, count > 0 ? 8 : 2)}%`,
              background: isPeak
                ? 'var(--cyan)'
                : isNight
                  ? 'rgba(240,58,90,0.5)'
                  : 'rgba(45,212,240,0.35)',
              borderRadius: '2px 2px 0 0',
              transition: 'height 0.6s ease',
              cursor: count > 0 ? 'pointer' : 'default',
              minHeight: '2px',
            }}
          />
        );
      })}
    </div>
  );
}
