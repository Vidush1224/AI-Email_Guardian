'use client';

import AppShell from '@/components/Navbar';
import { useState, useEffect } from 'react';

/* ── Demo Data ── */
const STATS = [
  { label: 'Total Emails Scanned', value: '24,856', icon: '📧', trend: '+12% from last week', trendColor: '#059669', bg: '#F3F4F6', iconBg: '#DBEAFE' },
  { label: 'Blocked Emails', value: '342', icon: '🚫', trend: '-8% from last week', trendColor: '#DC2626', bg: '#F3F4F6', iconBg: '#FEE2E2' },
  { label: 'Fraud Attempts', value: '89', icon: '⚠️', trend: '+5 new today', trendColor: '#D97706', bg: '#F3F4F6', iconBg: '#FEF3C7' },
  { label: 'Data Leaks Prevented', value: '156', icon: '🔒', trend: 'Protected this month', trendColor: '#059669', bg: '#F3F4F6', iconBg: '#D1FAE5' },
];

const THREAT_DATA = [
  { day: 'Mon', val: 5 },
  { day: 'Tue', val: 28 },
  { day: 'Wed', val: 18 },
  { day: 'Thu', val: 22 },
  { day: 'Fri', val: 12 },
  { day: 'Sat', val: 4 },
  { day: 'Sun', val: 2 },
];

const RISK_CATEGORIES = [
  { name: 'Phishing', value: 35, color: '#4F46E5' },
  { name: 'Data Exposure', value: 25, color: '#0891B2' },
  { name: 'Malware', value: 18, color: '#059669' },
  { name: 'BEC', value: 14, color: '#D97706' },
  { name: 'Spam', value: 8, color: '#DC2626' },
];

const DEPARTMENTS = [
  { name: 'Finance', risk: 52, color: '#F59E0B' },
  { name: 'Executive', risk: 41, color: '#F59E0B' },
  { name: 'HR', risk: 35, color: '#F59E0B' },
  { name: 'IT', risk: 22, color: '#F59E0B' },
  { name: 'Sales', risk: 14, color: '#F59E0B' },
];

const RECENT_INCIDENTS = [
  { title: 'Phishing Attempt', dept: 'Executive', status: 'open', statusColor: '#EF4444', time: '11:30:21 AM' },
  { title: 'Data Exposure Risk', dept: 'Finance', status: 'investigating', statusColor: '#9CA3AF', time: '11:00:21 AM' },
  { title: 'Suspicious Attachment', dept: 'Procurement', status: 'resolved', statusColor: '#10B981', time: '12:00:21 PM' },
];

/* ── Area Chart (SVG) ── */
function AreaChart() {
  const max = Math.max(...THREAT_DATA.map(d => d.val));
  const h = 180, w = 440, pad = 40;
  const chartW = w - pad * 2;
  const chartH = h - 30;
  const points = THREAT_DATA.map((d, i) => ({
    x: pad + (i / (THREAT_DATA.length - 1)) * chartW,
    y: chartH - (d.val / max) * (chartH - 20),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${chartH} L${points[0].x},${chartH} Z`;

  // Y-axis labels
  const yLabels = [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 200 }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grid lines */}
      {yLabels.map((v, i) => {
        const y = chartH - (v / max) * (chartH - 20);
        return (
          <g key={i}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#E5E7EB" strokeWidth="1" />
            <text x={pad - 8} y={y + 4} fill="#6B7280" fontSize="10" textAnchor="end">{v}</text>
          </g>
        );
      })}
      {/* Area */}
      <path d={areaPath} fill="url(#areaGrad)" />
      {/* Line */}
      <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots */}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
      ))}
      {/* X-axis labels */}
      {THREAT_DATA.map((d, i) => (
        <text key={i} x={pad + (i / (THREAT_DATA.length - 1)) * chartW} y={h - 4} fill="#6B7280" fontSize="11" textAnchor="middle">{d.day}</text>
      ))}
    </svg>
  );
}

/* ── Donut Chart (SVG) ── */
function DonutChart() {
  const total = RISK_CATEGORIES.reduce((s, c) => s + c.value, 0);
  const r = 70, cx = 90, cy = 90, strokeW = 24;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg viewBox="0 0 180 180" style={{ width: 170, height: 170 }}>
        {RISK_CATEGORIES.map((cat, i) => {
          const pct = cat.value / total;
          const dash = circ * pct;
          const gap = circ - dash;
          const currentOffset = offset;
          offset += dash;
          return (
            <circle
              key={i}
              cx={cx} cy={cy} r={r}
              fill="none"
              stroke={cat.color}
              strokeWidth={strokeW}
              strokeDasharray={`${dash} ${gap}`}
              strokeDashoffset={-currentOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              style={{ transition: 'stroke-dashoffset 0.8s ease' }}
            />
          );
        })}
      </svg>
      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center' }}>
        {RISK_CATEGORIES.map((cat, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9CA3AF' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
            {cat.name}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Dashboard Page ── */
export default function DashboardPage() {
  return (
    <AppShell>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {/* Page Header */}
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Security Dashboard</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Real-time threat monitoring and analytics</p>
        </div>

        {/* Stats Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {STATS.map((s, i) => (
            <div key={i} className="card" style={{ padding: '20px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, color: '#4B5563', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 800, color: '#111827' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: s.trendColor, marginTop: 6 }}>{s.trend}</div>
              </div>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: s.iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Middle Row: Threat Trend + Risk Categories */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16 }}>
          {/* Threat Trend */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>📈 Threat Trend</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Last 7 days</div>
            </div>
            <AreaChart />
          </div>

          {/* Risk Categories Donut */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 16 }}>⚡ Top Risk Categories</div>
            <DonutChart />
          </div>
        </div>

        {/* Bottom Row: Departments + Recent Incidents */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* High Risk Departments */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20 }}>High Risk Departments</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {DEPARTMENTS.map((d, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 70, fontSize: 12, color: '#4B5563', textAlign: 'right', flexShrink: 0 }}>{d.name}</div>
                  <div style={{ flex: 1, height: 20, background: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                    <div
                      className="risk-bar-fill"
                      style={{ width: `${(d.risk / 60) * 100}%`, height: '100%', background: d.color, borderRadius: 4 }}
                    />
                  </div>
                  <div style={{ width: 24, fontSize: 11, color: '#4B5563', textAlign: 'right' }}>{d.risk}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20 }}>Recent Incidents</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {RECENT_INCIDENTS.map((inc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: i < RECENT_INCIDENTS.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: inc.statusColor, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{inc.title}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>{inc.dept}</div>
                  </div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: inc.statusColor,
                    background: inc.status === 'open' ? 'rgba(239,68,68,0.1)' : 'transparent',
                    padding: inc.status === 'open' ? '2px 10px' : '2px 0',
                    borderRadius: 12,
                  }}>
                    {inc.status}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>{inc.time}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
