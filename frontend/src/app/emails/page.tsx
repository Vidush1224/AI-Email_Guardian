'use client';

import AppShell from '@/components/Navbar';
import { useState, useEffect } from 'react';

type EmailData = {
  id: number;
  status: string;
  sender: string;
  recipient: string;
  subject: string;
  score: number;
  time: string;
};

// Fallback demo data if fetch fails
const DEMO_EMAILS: EmailData[] = [];

function getStatusStyle(status: string) {
  switch (status) {
    case 'Critical': return { bg: '#FEE2E2', color: '#DC2626', border: '1px solid #FECACA', icon: '⊘' };
    case 'Warning': return { bg: '#FEF3C7', color: '#D97706', border: '1px solid #FDE68A', icon: '△' };
    case 'Safe': return { bg: '#D1FAE5', color: '#059669', border: '1px solid #A7F3D0', icon: '✓' };
    default: return { bg: '#F3F4F6', color: '#4B5563', border: '1px solid #E5E7EB', icon: '–' };
  }
}

function getScoreColor(score: number) {
  if (score >= 80) return '#DC2626';
  if (score >= 40) return '#0891B2';
  return '#059669';
}

export default function EmailHistoryPage() {
  const [emails, setEmails] = useState<EmailData[]>(DEMO_EMAILS);
  const [statusFilter, setStatusFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch('/api/emails')
      .then(res => res.json())
      .then((data: any[]) => {
        const mapped = data.map(d => {
          let st = 'Safe';
          let sc = 10;
          if (d.status === 'BLOCKED') { st = 'Critical'; sc = 90; }
          else if (d.status === 'STRONG_WARNING') { st = 'Critical'; sc = 75; }
          else if (d.status === 'WARNED') { st = 'Warning'; sc = 50; }
          
          return {
            id: d.id,
            status: st,
            sender: d.sender,
            recipient: d.recipients,
            subject: d.subject || 'No Subject',
            score: sc,
            time: d.createdAt ? new Date(d.createdAt).toLocaleString() : new Date().toLocaleString()
          };
        });
        setEmails(mapped);
      })
      .catch(err => console.error('Error fetching emails:', err));
  }, []);

  const safeCount = emails.filter(e => e.status === 'Safe').length;
  const warnCount = emails.filter(e => e.status === 'Warning').length;
  const critCount = emails.filter(e => e.status === 'Critical').length;

  const filtered = emails.filter(e => {
    if (statusFilter !== 'all' && e.status !== statusFilter) return false;
    if (search && !`${e.sender} ${e.recipient} ${e.subject}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Email Risk History</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>View and analyze all scanned emails</p>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
          {[
            { label: 'Total Emails', value: emails.length, color: '#111827' },
            { label: 'Safe', value: safeCount, color: '#059669' },
            { label: 'Warning', value: warnCount, color: '#D97706' },
            { label: 'Critical', value: critCount, color: '#DC2626' },
          ].map((s, i) => (
            <div key={i} className="card" style={{ padding: '16px 20px' }}>
              <div style={{ fontSize: 12, color: '#6B7280' }}>{s.label}</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Search & Filter */}
        <div className="card" style={{ padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by sender, recipient, or subject..."
              style={{ flex: 1, background: 'none', border: 'none', outline: 'none', color: '#111827', fontSize: 13 }}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6B7280" strokeWidth="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              style={{ background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 6, padding: '6px 12px', color: '#111827', fontSize: 13, outline: 'none' }}
            >
              <option value="all">All Status</option>
              <option value="Safe">Safe</option>
              <option value="Warning">Warning</option>
              <option value="Critical">Critical</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                {['Status', 'Sender ↑↓', 'Recipient ↑↓', 'Subject', 'Risk Score ↑↓', 'Time ↓'].map(h => (
                  <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((email) => {
                const st = getStatusStyle(email.status);
                return (
                  <tr key={email.id} style={{ borderBottom: '1px solid #F3F4F6', cursor: 'pointer' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500, background: st.bg, color: st.color, border: st.border }}>
                        {st.icon} {email.status}
                      </span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#111827' }}>{email.sender}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#111827' }}>{email.recipient}</td>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#111827', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{email.subject}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 60, height: 6, background: '#E5E7EB', borderRadius: 3, overflow: 'hidden' }}>
                          <div className="risk-bar-fill" style={{ width: `${email.score}%`, height: '100%', background: getScoreColor(email.score), borderRadius: 3 }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: getScoreColor(email.score) }}>{email.score}</span>
                      </div>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 12, color: '#6B7280', whiteSpace: 'nowrap' }}>{email.time}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
