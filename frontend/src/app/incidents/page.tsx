'use client';

import AppShell from '@/components/Navbar';
import { useState, useEffect } from 'react';

const INCIDENTS = [
  {
    id: 'INC-001', title: 'Phishing Attempt', severity: 'Critical', sevColor: '#DC2626',
    description: 'AI-generated BEC attack targeting CEO with fraudulent wire transfer request',
    dept: 'Executive', date: '3/14/2026, 11:30:21 AM', status: 'Open', statusColor: '#DC2626',
    signals: ['typosquatting_domain', 'credential_harvesting', 'urgency_language', 'suspension_threat'],
    score: 92,
  },
  {
    id: 'INC-002', title: 'Data Exposure Risk', severity: 'High', sevColor: '#EA580C',
    description: 'Confidential financial data being sent to external recipient',
    dept: 'Finance', date: '3/14/2026, 11:00:21 AM', status: 'Investigating', statusColor: '#0891B2',
    signals: ['bank_account_exposed', 'outbound_to_external', 'api_key_exposed'],
    score: 85,
  },
  {
    id: 'INC-003', title: 'Suspicious Attachment', severity: 'Medium', sevColor: '#D97706',
    description: 'Invoice attachment flagged for verification - confirmed legitimate',
    dept: 'Procurement', date: '3/13/2026, 12:00:21 PM', status: 'Resolved', statusColor: '#059669',
    signals: ['macro_enabled_attachment', 'suspicious_file_extension'],
    score: 62,
  },
];

export default function IncidentsPage() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [sevFilter, setSevFilter] = useState('');

  useEffect(() => {
    fetch('/api/incidents')
      .then(res => res.json())
      .then(data => setIncidents(data))
      .catch(err => console.error('Incidents fetch error:', err));
  }, []);

  const openCount = incidents.filter(i => !i.resolved).length;
  const criticalCount = incidents.filter(i => i.severity === 'CRITICAL').length;
  const highCount = incidents.filter(i => i.severity === 'HIGH').length;

  const filtered = incidents.filter(i => {
    if (statusFilter === 'open' && i.resolved) return false;
    if (statusFilter === 'resolved' && !i.resolved) return false;
    if (sevFilter && i.severity !== sevFilter.toUpperCase()) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Incident Logs</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Investigate and manage security incidents</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Open Incidents', value: openCount, color: '#DC2626' },
            { label: 'Critical Active', value: criticalCount, color: '#DC2626' },
            { label: 'High Severity', value: highCount, color: '#0891B2' },
            { label: 'Total Scanned', value: incidents.length, color: '#059669' },
          ].map((s: any, i: number) => (
            <div key={i} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search & Filters */}
        <div className="card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input placeholder="Search incidents..." style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#111827', fontSize: 13 }} />
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 12px', color: '#111827', fontSize: 12, outline: 'none' }}>
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="Investigating">Investigating</option>
            <option value="Resolved">Resolved</option>
          </select>
          <select value={sevFilter} onChange={e => setSevFilter(e.target.value)} style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 12px', color: '#111827', fontSize: 12, outline: 'none' }}>
            <option value="">All Severity</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
          </select>
          <select style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 12px', color: '#111827', fontSize: 12, outline: 'none' }}>
            <option>All Depts</option>
          </select>
        </div>

        {/* Incidents List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((inc: any) => (
            <div
              key={inc.id}
              className="card"
              onClick={() => setSelected(selected?.id === inc.id ? null : inc)}
              style={{ padding: '20px 24px', cursor: 'pointer', borderColor: selected?.id === inc.id ? '#2563EB' : undefined }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                {/* Icon */}
                <div style={{ width: 40, height: 40, borderRadius: '50%', border: `2px solid ${inc.severity === 'CRITICAL' ? '#DC2626' : '#EA580C'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: inc.severity === 'CRITICAL' ? '#DC2626' : '#EA580C' }} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{inc.title}</span>
                    <span style={{ fontSize: 11, fontWeight: 600, color: inc.severity === 'CRITICAL' ? '#DC2626' : '#EA580C' }}>{inc.severity}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>{inc.description}</div>
                  <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: '#6B7280' }}>
                    <span>🏢 {inc.dept}</span>
                    <span>📅 {inc.date}</span>
                    <span>{inc.id}</span>
                  </div>
                </div>

                {/* Status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: inc.resolved ? '#059669' : '#DC2626' }} />
                  <span style={{ fontSize: 12, fontWeight: 500, color: inc.resolved ? '#059669' : '#DC2626' }}>{inc.resolved ? 'Resolved' : 'Open'}</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
              </div>

              {/* Expanded Detail */}
              {selected?.id === inc.id && (
                <div className="animate-fade-in" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #E5E7EB' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                    <div>
                      <div style={{ fontSize: 12, color: '#6B7280', marginBottom: 6 }}>Risk Score</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: inc.score > 80 ? '#DC2626' : '#EA580C' }}>{inc.score}</div>
                    </div>
                    <div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {inc.detectedSignals.map((s: string, i: number) => (
                          <span key={i} style={{ fontSize: 11, padding: '2px 8px', background: '#FEF2F2', color: '#B91C1C', borderRadius: 4, border: '1px solid #FECACA' }}>
                            {s.replace(/_/g, ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
