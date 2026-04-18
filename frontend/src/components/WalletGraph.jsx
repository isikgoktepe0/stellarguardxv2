import React, { useMemo, useEffect, useRef, useState } from 'react';
import { Icon } from './Icons';

const W = 860, H = 460;

function computeDegrees(links) {
  const deg = {};
  links.forEach(({ source, target }) => {
    deg[source] = (deg[source] || 0) + 1;
    deg[target] = (deg[target] || 0) + 1;
  });
  return deg;
}

function nodeColor(degree, maxDeg, isTarget, isBlacklisted) {
  if (isBlacklisted && !isTarget) return { fill: '#f03a5a', stroke: '#f06070', glow: 'rgba(240,58,90,0.7)' };
  if (isTarget) return { fill: '#2dd4f0', stroke: '#7ae8f8', glow: 'rgba(45,212,240,0.65)' };
  const r = maxDeg > 0 ? degree / maxDeg : 0;
  if (r > 0.6) return { fill: '#f03a5a', stroke: '#f06070', glow: 'rgba(240,58,90,0.5)' };
  if (r > 0.3) return { fill: '#f0a500', stroke: '#f0c050', glow: 'rgba(240,165,0,0.45)' };
  return { fill: '#162038', stroke: '#243a5e', glow: 'rgba(45,212,240,0.15)' };
}

function layoutNodes(nodes, links, targetWallet) {
  const degrees = computeDegrees(links);
  const maxDeg  = Math.max(...Object.values(degrees), 1);
  const cx = W / 2, cy = H / 2;
  const others = nodes.filter((n) => n.id !== targetWallet);
  const sorted = [...others].sort((a, b) => (degrees[b.id] || 0) - (degrees[a.id] || 0));
  const inner  = sorted.slice(0, Math.min(8, Math.floor(sorted.length / 2)));
  const outer  = sorted.slice(inner.length);
  const posMap = {};
  posMap[targetWallet] = { x: cx, y: cy };
  const place = (arr, radius) => arr.forEach((n, i) => {
    const angle = (i / Math.max(arr.length, 1)) * 2 * Math.PI - Math.PI / 2;
    posMap[n.id] = { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
  place(inner, 130);
  place(outer, 200);
  return nodes.map((n) => {
    const deg = degrees[n.id] || 0;
    const isTarget = n.id === targetWallet;
    const r = isTarget ? 20 : Math.max(9, Math.min(16, 9 + deg * 1.4));
    return { ...n, ...(posMap[n.id] || { x: cx, y: cy }), r, deg, ...nodeColor(deg, maxDeg, isTarget, n.isBlacklisted) };
  });
}

export default function WalletGraph({ nodes, links, targetWallet }) {
  const [hoveredNode, setHoveredNode] = useState(null);
  const intervalRef = useRef(null);
  useEffect(() => {
    intervalRef.current = setInterval(() => {}, 2000);
    return () => clearInterval(intervalRef.current);
  }, []);

  const positioned = useMemo(() => layoutNodes(nodes || [], links || [], targetWallet), [nodes, links, targetWallet]);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="card graph-card animate-in" style={{ animationDelay: '0.3s' }}>
        <div className="graph-header">
          <div className="card-label" style={{ marginBottom: 0 }}><Icon.Network width="12" height="12" />Transaction Network</div>
        </div>
        <div className="graph-container"><p className="graph-empty">No transaction data to visualize</p></div>
      </div>
    );
  }

  return (
    <div className="card graph-card animate-in" style={{ animationDelay: '0.3s' }}>
      <div className="graph-header">
        <div className="card-label" style={{ marginBottom: 0 }}><Icon.Network width="12" height="12" />Transaction Network</div>
        <span className="graph-live-badge"><span className="status-dot" />Live</span>
      </div>

      <div className="graph-container">
        <svg className="graph-svg" viewBox={`0 0 ${W} ${H}`} aria-label="Transaction network graph">
          <defs>
            <filter id="glow-c" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <filter id="glow-r" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2.5" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
            <marker id="arr-c" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="rgba(45,212,240,0.5)"/>
            </marker>
            <marker id="arr-r" viewBox="0 0 10 10" refX="20" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0 0L10 5L0 10z" fill="rgba(240,58,90,0.5)"/>
            </marker>
            <radialGradient id="tgt-grad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#7ae8f8"/><stop offset="100%" stopColor="#2dd4f0"/>
            </radialGradient>
          </defs>

          {/* Grid dots */}
          {Array.from({ length: 10 }).map((_, row) =>
            Array.from({ length: 18 }).map((_, col) => (
              <circle key={`${row}-${col}`} cx={col*(W/17)} cy={row*(H/9)} r="0.8" fill="rgba(45,212,240,0.05)" />
            ))
          )}

          {/* Links */}
          {links.map((link, i) => {
            const src = positioned.find((n) => n.id === link.source);
            const tgt = positioned.find((n) => n.id === link.target);
            if (!src || !tgt) return null;
            const hi = (src.deg || 0) > 3 || (tgt.deg || 0) > 3;
            return (
              <line key={i} x1={src.x} y1={src.y} x2={tgt.x} y2={tgt.y}
                stroke={hi ? 'rgba(240,58,90,0.3)' : 'rgba(45,212,240,0.15)'}
                strokeWidth="1.1" markerEnd={hi ? 'url(#arr-r)' : 'url(#arr-c)'} />
            );
          })}

          {/* Pulse rings on target */}
          {(() => {
            const t = positioned.find((n) => n.id === targetWallet);
            if (!t) return null;
            return [1, 2].map((k) => (
              <circle key={k} cx={t.x} cy={t.y} r={t.r + 8 + k * 10}
                fill="none" stroke="rgba(45,212,240,0.12)" strokeWidth="1"
                style={{ animation: `pulse-ring ${1.4 + k * 0.5}s ease-out infinite`, animationDelay: `${k * 0.35}s` }} />
            ));
          })()}

          {/* Nodes */}
          {positioned.map((node) => {
            const isTarget  = node.id === targetWallet;
            const isHovered = hoveredNode === node.id;
            return (
              <g key={node.id} transform={`translate(${node.x},${node.y})`} style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredNode(node.id)}
                onMouseLeave={() => setHoveredNode(null)}>
                <circle r={node.r + 4} fill="none" stroke={node.glow} strokeWidth="1" opacity={isHovered ? 0.7 : 0.25} />
                <circle r={node.r} fill={isTarget ? 'url(#tgt-grad)' : node.fill}
                  stroke={node.stroke} strokeWidth={isTarget ? 1.5 : 1.2}
                  filter={isTarget ? 'url(#glow-c)' : node.fill === '#f03a5a' ? 'url(#glow-r)' : undefined} />
                <text textAnchor="middle" dy="0.35em" fontSize={isTarget ? '7' : '6.2'}
                  fill={isTarget ? '#060a12' : '#7a96b8'}
                  fontFamily="'JetBrains Mono',monospace" fontWeight={isTarget ? '700' : '400'}>
                  {node.label}
                </text>
                {node.isBlacklisted && !isTarget && (
                  <text textAnchor="middle" dy="-14" fontSize="9" fill="#f03a5a" style={{ userSelect: 'none' }}>X</text>
                )}
                {isHovered && (
                  <g transform={`translate(${node.r + 5},${-node.r - 5})`}>
                    <rect x="0" y="-13" width="108" height="17" rx="3" fill="#0d1525" stroke="#1c2d4a" strokeWidth="1"/>
                    <text x="5" y="-1" fontSize="6.5" fill="#2dd4f0" fontFamily="'JetBrains Mono',monospace">
                      {`DEG:${node.deg || 0}  ${node.id.slice(0, 12)}...`}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="graph-footer">
        <div className="graph-legend">
          {[
            { color: '#f03a5a', label: 'Blacklisted', glow: 'rgba(240,58,90,0.7)' },
            { color: '#2dd4f0', label: 'Target',      glow: 'rgba(45,212,240,0.7)' },
            { color: '#f03a5a', label: 'High Activity' },
            { color: '#f0a500', label: 'Medium' },
            { color: '#162038', label: 'Low', border: '1px solid #243a5e' },
          ].map((l) => (
            <div key={l.label} className="legend-item">
              <span className="legend-dot" style={{ background: l.color, boxShadow: l.glow ? `0 0 5px ${l.glow}` : 'none', border: l.border || 'none' }} />
              <span>{l.label}</span>
            </div>
          ))}
        </div>
        <span className="graph-info">{nodes.length} nodes · {links.length} edges</span>
      </div>

      <style>{`@keyframes pulse-ring{0%{opacity:0.5}100%{r:60;opacity:0}}`}</style>
    </div>
  );
}
