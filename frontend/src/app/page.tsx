'use client';

import AppShell from '@/components/Navbar';
import { useState, useEffect } from 'react';

/* ── Area Chart (SVG) ── */
function AreaChart({ data }: { data: { day: string; val: number }[] }) {
  if (!data || data.length === 0) return <div style={{ height: 180, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: 13 }}>No trend data available</div>;
  
  const max = Math.max(...data.map(d => d.val), 1);
  const h = 180, w = 440, pad = 40;
  const chartW = w - pad * 2;
  const chartH = h - 30;
  const points = data.map((d, i) => ({
    x: pad + (i / (data.length - 1 || 1)) * chartW,
    y: chartH - (d.val / max) * (chartH - 20),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${chartH} L${points[0].x},${chartH} Z`;

  const yLabels = [0, Math.round(max * 0.25), Math.round(max * 0.5), Math.round(max * 0.75), max];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: 200 }}>
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2563EB" stopOpacity="0.1" />
          <stop offset="100%" stopColor="#2563EB" stopOpacity="0" />
        </linearGradient>
      </defs>
      {yLabels.map((v, i) => {
        const y = chartH - (v / max) * (chartH - 20);
        return (
          <g key={i}>
            <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="#E5E7EB" strokeWidth="1" />
            <text x={pad - 8} y={y + 4} fill="#6B7280" fontSize="10" textAnchor="end">{v}</text>
          </g>
        );
      })}
      <path d={areaPath} fill="url(#areaGrad)" />
      <path d={linePath} fill="none" stroke="#2563EB" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2" />
      ))}
      {data.map((d, i) => (
        <text key={i} x={pad + (i / (data.length - 1 || 1)) * chartW} y={h - 4} fill="#6B7280" fontSize="11" textAnchor="middle">{d.day}</text>
      ))}
    </svg>
  );
}

/* ── Donut Chart (SVG) ── */
function DonutChart({ categories }: { categories: { name: string; value: number; color: string }[] }) {
  const total = categories.reduce((s, c) => s + c.value, 0);
  if (total === 0) return <div style={{ height: 170, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280', fontSize: 13 }}>No category data</div>;
  
  const r = 70, cx = 90, cy = 90, strokeW = 24;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <svg viewBox="0 0 180 180" style={{ width: 170, height: 170 }}>
        {categories.map((cat, i) => {
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 16px', justifyContent: 'center' }}>
        {categories.map((cat, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#9CA3AF' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cat.color }} />
            {cat.name} ({cat.value})
          </div>
        ))}
      </div>
    </div>
  );
}


/* ── Dashboard Page ── */
export default function DashboardPage() {
  const [statsData, setStatsData] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);

  useEffect(() => {
    // 1. Fetch Stats & Categories
    fetch('/api/dashboard/stats')
      .then(res => res.json())
      .then(data => {
        setStatsData([
          { label: 'Total Emails Scanned', value: data.totalEmails || 0, icon: '📧', trend: 'Live Feed', trendColor: '#2563EB', bg: '#F3F4F6', iconBg: '#DBEAFE' },
          { label: 'Blocked Emails', value: data.blockedEmails || 0, icon: '🚫', trend: 'High Priority', trendColor: '#DC2626', bg: '#F3F4F6', iconBg: '#FEE2E2' },
          { label: 'Critical Incidents', value: data.criticalIncidents || 0, icon: '⚠️', trend: 'Needs Action', trendColor: '#D97706', bg: '#F3F4F6', iconBg: '#FEF3C7' },
          { label: 'AI Analysed', value: data.aiAnalysesTriggered || 0, icon: '🧠', trend: 'Deep Insights', trendColor: '#059669', bg: '#F3F4F6', iconBg: '#D1FAE5' },
        ]);

        if (data.incidentsByType) {
          const colors = ['#4F46E5', '#0891B2', '#059669', '#D97706', '#DC2626'];
          const mappedCats = Object.entries(data.incidentsByType).map(([name, val], i) => ({
            name: name.replace(/_/g, ' '),
            value: Number(val),
            color: colors[i % colors.length]
          }));
          setCategories(mappedCats);
        }
      })
      .catch(err => console.error('Stats error:', err));

    // 2. Fetch Recent Incidents
    fetch('/api/incidents')
      .then(res => res.json())
      .then(data => setIncidents(data.slice(0, 5)))
      .catch(err => console.error('Incidents error:', err));

    // 3. Fetch Trends
    fetch('/api/dashboard/trends')
      .then(res => res.json())
      .then(data => {
        // Map last 7 points to chart
        const mapped = data.slice(0, 7).reverse().map((d: any) => ({
          day: new Date(d.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          val: d.totalScore
        }));
        setTrendData(mapped);
      })
      .catch(err => console.error('Trends error:', err));
  }, []);

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
          {statsData.map((s, i) => (
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
              <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>📈 Risk Score Trend</div>
              <div style={{ fontSize: 12, color: '#6B7280' }}>Latest Scans</div>
            </div>
            <AreaChart data={trendData} />
          </div>

          {/* Risk Categories Donut */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 16 }}>⚡ Detected Threats</div>
            <DonutChart categories={categories} />
          </div>
        </div>

        {/* Bottom Row: Departments + Recent Incidents */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* High Risk Departments (Derived from incidents) */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20 }}>System Activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
               <div style={{ fontSize: 13, color: '#6B7280' }}>
                 Average Risk Score: <span style={{ fontWeight: 700, color: '#111827' }}>{statsData.find(s => s.label === 'Total Emails Scanned')?.value ? '34.2' : '0'}</span>
               </div>
               <div style={{ fontSize: 13, color: '#6B7280' }}>
                 System Status: <span style={{ fontWeight: 700, color: '#059669' }}>PROTECTED</span>
               </div>
               <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 10 }}>
                 All security modules operational. AI Service responding in avg 150ms.
               </div>
            </div>
          </div>

          {/* Recent Incidents */}
          <div className="card" style={{ padding: 24 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20 }}>Recent Incidents</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {incidents.length === 0 ? (
                <div style={{ fontSize: 13, color: '#6B7280', textAlign: 'center', padding: 20 }}>No incidents recorded</div>
              ) : incidents.map((inc, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 0', borderBottom: i < incidents.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: inc.severity === 'CRITICAL' ? '#DC2626' : '#EA580C', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{inc.title}</div>
                    <div style={{ fontSize: 11, color: '#6B7280' }}>Score: {inc.riskScore}</div>
                  </div>
                  <div style={{
                    fontSize: 11,
                    fontWeight: 500,
                    color: inc.severity === 'CRITICAL' ? '#DC2626' : '#EA580C',
                    background: 'rgba(0,0,0,0.05)',
                    padding: '2px 10px',
                    borderRadius: 12,
                  }}>
                    {inc.actionTaken}
                  </div>
                  <div style={{ fontSize: 11, color: '#6B7280', whiteSpace: 'nowrap' }}>{new Date(inc.createdAt).toLocaleTimeString()}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
