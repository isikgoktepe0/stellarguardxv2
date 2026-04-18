import React, { useState, useEffect, useMemo } from 'react';
import { fetchFlow } from '../api';
import { Icon } from './Icons';

/* ─────────────────────────────────────────────────────────────────────────────
   Pure-SVG Sankey diagram — no external library.

   Layout algorithm:
   1. Separate nodes into LEFT column (senders to target) and
      RIGHT column (receivers from target). Target sits in the MIDDLE.
   2. Assign vertical positions proportional to flow volume.
   3. Draw curved paths between columns.
───────────────────────────────────────────────────────────────────────────── */

const W = 860;
const H = 480;
const NODE_W = 14;
const COL_LEFT  = 80;
const COL_MID   = W / 2 - NODE_W / 2;
const COL_RIGHT = W - 80 - NODE_W;
const PAD_TOP   = 40;
const PAD_BOT   = 40;

const COLORS = {
  inflow:  '#22d98a',
  outflow: '#f03a5a',
  target:  '#2dd4f0',
  neutral: '#7a96b8',
};

function buildLayout(nodes, flows, targetWallet) {
  if (!nodes.length || !flows.length) return { lNodes: [], rNodes: [], tNode: null, paths: [] };

  const targetIdx = nodes.findIndex((n) => n.id === targetWallet);
  if (targetIdx === -1) return { lNodes: [], rNodes: [], tNode: null, paths: [] };

  // Separate inflow (left) and outflow (right) nodes
  const inflowSet  = new Set(flows.filter((f) => f.targetAddr === targetWallet).map((f) => f.sourceAddr));
  const outflowSet = new Set(flows.filter((f) => f.sourceAddr === targetWallet).map((f) => f.targetAddr));

  // Aggregate per-node volumes
  const nodeVol = {};
  flows.forEach((f) => {
    nodeVol[f.sourceAddr] = (nodeVol[f.sourceAddr] || 0) + f.value;
    nodeVol[f.targetAddr] = (nodeVol[f.targetAddr] || 0) + f.value;
  });

  const sortByVol = (a, b) => (nodeVol[b.id] || 0) - (nodeVol[a.id] || 0);

  const lNodes = nodes.filter((n) => inflowSet.has(n.id) && n.id !== targetWallet).sort(sortByVol);
  const rNodes = nodes.filter((n) => outflowSet.has(n.id) && n.id !== targetWallet).sort(sortByVol);

  const usableH = H - PAD_TOP - PAD_BOT;

  // Assign y positions — evenly spaced, min node height 20px
  const assignY = (arr) => {
    const totalVol = arr.reduce((s, n) => s + (nodeVol[n.id] || 1), 0);
    let cursor = PAD_TOP;
    return arr.map((n) => {
      const vol    = nodeVol[n.id] || 1;
      const height = Math.max(20, (vol / totalVol) * usableH);
      const y      = cursor;
      cursor += height + 8;
      return { ...n, y, height, vol };
    });
  };

  const lPlaced = assignY(lNodes);
  const rPlaced = assignY(rNodes);

  // Target node — centered vertically
  const tNode = {
    ...nodes[targetIdx],
    y:      PAD_TOP,
    height: usableH,
    vol:    nodeVol[targetWallet] || 0,
  };

  // Build SVG paths
  const paths = [];

  // Inflow paths: left → target
  lPlaced.forEach((ln) => {
    const relevantFlows = flows.filter((f) => f.sourceAddr === ln.id && f.targetAddr === targetWallet);
    const vol = relevantFlows.reduce((s, f) => s + f.value, 0);
    if (!vol) return;

    const x1 = COL_LEFT + NODE_W;
    const y1 = ln.y + ln.height / 2;
    const x2 = COL_MID;
    const y2 = tNode.y + tNode.height / 2;
    const cx = (x1 + x2) / 2;
    const strokeW = Math.max(1.5, Math.min(18, (vol / (tNode.vol || 1)) * 40));

    paths.push({
      d: `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`,
      color: COLORS.inflow,
      strokeW,
      vol,
      label: `+${vol.toFixed(2)} XLM`,
      type: 'in',
    });
  });

  // Outflow paths: target → right
  rPlaced.forEach((rn) => {
    const relevantFlows = flows.filter((f) => f.sourceAddr === targetWallet && f.targetAddr === rn.id);
    const vol = relevantFlows.reduce((s, f) => s + f.value, 0);
    if (!vol) return;

    const x1 = COL_MID + NODE_W;
    const y1 = tNode.y + tNode.height / 2;
    const x2 = COL_RIGHT;
    const y2 = rn.y + rn.height / 2;
    const cx = (x1 + x2) / 2;
    const strokeW = Math.max(1.5, Math.min(18, (vol / (tNode.vol || 1)) * 40));

    paths.push({
      d: `M${x1},${y1} C${cx},${y1} ${cx},${y2} ${x2},${y2}`,
      color: COLORS.outflow,
      strokeW,
      vol,
      label: `-${vol.toFixed(2)} XLM`,
      type: 'out',
    });
  });

  return { lPlaced, rPlaced, tNode, paths };
}

function SummaryPill({ label, value, color }) {
  return (
    <div style={{
      flex: 1, minWidth: '100px',
      background: 'var(--bg2)', border: '1px solid var(--border)',
      borderRadius: 'var(--radius)', padding: '0.5rem 0.75rem', textAlign: 'center',
    }}>
      <div style={{ fontFamily: 'var(--font-title)', fontSize: '1.1rem', fontWeight: 700, color }}>
        {value}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '0.58rem', color: 'var(--text-dim)', letterSpacing: '1px', marginTop: '2px' }}>
        {label}
      </div>
    </div>
  );
}

export default function SankeyFlow({ wallet }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState(null);
  const [hovered, setHovered] = useState(null);

  useEffect(() => {
    if (!wallet) return;
    setLoading(true);
    setError(null);
    fetchFlow(wallet)
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [wallet]);

  const layout = useMemo(() => {
    if (!data) return null;
    return buildLayout(data.nodes, data.flows, wallet);
  }, [data, wallet]);

  if (loading) {
    return (
      <div className="card animate-in" style={{ padding: '2.5rem', textAlign: 'center' }}>
        <div className="card-label"><Icon.Pattern width="12" height="12" />Fund Flow Analysis</div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.6rem', color: 'var(--text-dim)', fontFamily: 'var(--font-mono)', fontSize: '0.75rem' }}>
          <div className="scan-ring-spin" style={{ width: '18px', height: '18px', position: 'relative', display: 'inline-block' }} />
          Loading flow data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card animate-in">
        <div className="card-label"><Icon.Pattern width="12" height="12" />Fund Flow Analysis</div>
        <div className="error-banner"><Icon.Alert width="13" height="13" />{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const { lPlaced = [], rPlaced = [], tNode, paths = [] } = layout || {};
  const { summary } = data;
  const noData = !tNode || (lPlaced.length === 0 && rPlaced.length === 0);

  return (
    <div className="card animate-in" style={{ animationDelay: '0.35s' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div className="card-label" style={{ marginBottom: 0 }}>
          <Icon.Pattern width="12" height="12" />
          Fund Flow Analysis — Sankey Diagram
        </div>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.62rem', color: 'var(--text-dim)' }}>
          {summary.total_ops} operations · {summary.unique_counterparties} counterparties
        </span>
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: '0.6rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <SummaryPill label="Total Inflow"  value={`${summary.inflow.toFixed(2)} XLM`}  color={COLORS.inflow} />
        <SummaryPill label="Total Outflow" value={`${summary.outflow.toFixed(2)} XLM`} color={COLORS.outflow} />
        <SummaryPill label="Net Flow"      value={`${summary.net >= 0 ? '+' : ''}${summary.net.toFixed(2)} XLM`}
          color={summary.net >= 0 ? COLORS.inflow : COLORS.outflow} />
        <SummaryPill label="Counterparties" value={summary.unique_counterparties} color="var(--cyan)" />
      </div>

      {noData ? (
        <div style={{ textAlign: 'center', padding: '3rem', fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          No flow data available — wallet has no recorded transactions
        </div>
      ) : (
        <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden', position: 'relative' }}>
          <svg width="100%" viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }}>
            <defs>
              <filter id="sankey-glow">
                <feGaussianBlur stdDeviation="2" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
            </defs>

            {/* Column labels */}
            <text x={COL_LEFT + NODE_W / 2} y="22" textAnchor="middle"
              fontSize="9" fill={COLORS.inflow} fontFamily="'JetBrains Mono',monospace" letterSpacing="1">
              SENDERS
            </text>
            <text x={COL_MID + NODE_W / 2} y="22" textAnchor="middle"
              fontSize="9" fill={COLORS.target} fontFamily="'JetBrains Mono',monospace" letterSpacing="1">
              TARGET
            </text>
            <text x={COL_RIGHT + NODE_W / 2} y="22" textAnchor="middle"
              fontSize="9" fill={COLORS.outflow} fontFamily="'JetBrains Mono',monospace" letterSpacing="1">
              RECEIVERS
            </text>

            {/* Flow paths */}
            {paths.map((p, i) => (
              <g key={i}>
                <path
                  d={p.d}
                  fill="none"
                  stroke={p.color}
                  strokeWidth={p.strokeW}
                  strokeOpacity={hovered === i ? 0.75 : 0.22}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-opacity 0.15s', cursor: 'pointer' }}
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                />
                {/* Highlighted path on hover */}
                {hovered === i && (
                  <path d={p.d} fill="none" stroke={p.color}
                    strokeWidth={p.strokeW + 2} strokeOpacity={0.9}
                    strokeLinecap="round" filter="url(#sankey-glow)" />
                )}
              </g>
            ))}

            {/* Hover tooltip */}
            {hovered !== null && paths[hovered] && (() => {
              const p = paths[hovered];
              // Midpoint of cubic bezier at t=0.5 (approximate)
              const parts = p.d.match(/[\d.]+/g).map(Number);
              const mx = (parts[0] + parts[6]) / 2;
              const my = (parts[1] + parts[7]) / 2;
              return (
                <g transform={`translate(${mx},${my - 22})`}>
                  <rect x="-45" y="-14" width="90" height="20" rx="4"
                    fill="var(--surface2)" stroke="var(--border-hi)" strokeWidth="1" />
                  <text textAnchor="middle" y="-1" fontSize="8.5"
                    fill={p.color} fontFamily="'JetBrains Mono',monospace">
                    {p.label} · {paths[hovered].count || ''} tx
                  </text>
                </g>
              );
            })()}

            {/* Left nodes (senders) */}
            {lPlaced.map((n) => (
              <g key={n.id}>
                <rect x={COL_LEFT} y={n.y} width={NODE_W} height={n.height}
                  fill={COLORS.inflow} fillOpacity="0.7" rx="3" />
                <text x={COL_LEFT - 6} y={n.y + n.height / 2 + 4}
                  textAnchor="end" fontSize="7.5" fill="var(--text-mid)"
                  fontFamily="'JetBrains Mono',monospace">
                  {n.label}
                </text>
              </g>
            ))}

            {/* Target node (center) */}
            {tNode && (
              <g>
                <rect x={COL_MID} y={tNode.y} width={NODE_W} height={tNode.height}
                  fill={COLORS.target} fillOpacity="0.85" rx="3"
                  filter="url(#sankey-glow)" />
                <text x={COL_MID + NODE_W / 2} y={tNode.y + tNode.height / 2 + 4}
                  textAnchor="middle" fontSize="7.5" fill="var(--bg)"
                  fontFamily="'JetBrains Mono',monospace" fontWeight="700">
                  YOU
                </text>
              </g>
            )}

            {/* Right nodes (receivers) */}
            {rPlaced.map((n) => (
              <g key={n.id}>
                <rect x={COL_RIGHT} y={n.y} width={NODE_W} height={n.height}
                  fill={COLORS.outflow} fillOpacity="0.7" rx="3" />
                <text x={COL_RIGHT + NODE_W + 6} y={n.y + n.height / 2 + 4}
                  textAnchor="start" fontSize="7.5" fill="var(--text-mid)"
                  fontFamily="'JetBrains Mono',monospace">
                  {n.label}
                </text>
              </g>
            ))}
          </svg>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: '1.25rem', marginTop: '0.75rem', fontFamily: 'var(--font-mono)', fontSize: '0.65rem', color: 'var(--text-dim)' }}>
        {[
          { color: COLORS.inflow,  label: 'Inflow (received)' },
          { color: COLORS.outflow, label: 'Outflow (sent)' },
          { color: COLORS.target,  label: 'Target wallet' },
        ].map((l) => (
          <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: l.color, display: 'inline-block' }} />
            {l.label}
          </div>
        ))}
        <span style={{ marginLeft: 'auto' }}>Hover paths to see amounts</span>
      </div>
    </div>
  );
}
