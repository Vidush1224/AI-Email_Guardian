'use client';

import AppShell from '@/components/Navbar';

export default function ThreatsPage() {
  const threatFeeds = [
    { name: 'PhishTank Database', status: 'Active', lastUpdate: '2 min ago', entries: '1.2M', type: 'Phishing URLs' },
    { name: 'VirusTotal API', status: 'Active', lastUpdate: '5 min ago', entries: '890K', type: 'Malware Hashes' },
    { name: 'Spamhaus Block List', status: 'Active', lastUpdate: '10 min ago', entries: '450K', type: 'Spam IPs' },
    { name: 'MITRE ATT&CK', status: 'Syncing', lastUpdate: '1 hr ago', entries: '2.5K', type: 'Attack Patterns' },
  ];

  const recentThreats = [
    { indicator: 'micros0ft-support.com', type: 'Typosquatting Domain', severity: 'Critical', seen: '3/14/2026, 10:23 AM', blocked: true },
    { indicator: 'secure-verify.com', type: 'Phishing Domain', severity: 'High', seen: '3/14/2026, 9:45 AM', blocked: true },
    { indicator: 'vendor-invoice.net', type: 'Suspicious Domain', severity: 'Medium', seen: '3/14/2026, 8:12 AM', blocked: true },
    { indicator: 'a1b2c3.exe', type: 'Malware Hash', severity: 'Critical', seen: '3/13/2026, 2:30 PM', blocked: true },
  ];

  return (
    <AppShell>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Threat Intelligence</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Threat feeds, indicators, and intelligence data</p>
        </div>

        {/* Threat Feeds */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Active Threat Feeds</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16 }}>
            {threatFeeds.map((feed, i) => (
              <div key={i} className="card" style={{ padding: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{feed.name}</span>
                  <span style={{
                    fontSize: 11,
                    padding: '2px 8px',
                    borderRadius: 12,
                    background: feed.status === 'Active' ? '#D1FAE5' : '#FEF3C7',
                    color: feed.status === 'Active' ? '#059669' : '#D97706',
                  }}>{feed.status}</span>
                </div>
                <div style={{ fontSize: 11, color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div>Type: <span style={{ color: '#9CA3AF' }}>{feed.type}</span></div>
                  <div>Entries: <span style={{ color: '#9CA3AF' }}>{feed.entries}</span></div>
                  <div>Updated: <span style={{ color: '#9CA3AF' }}>{feed.lastUpdate}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Threat Indicators */}
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Recent Threat Indicators</h2>
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #E5E7EB' }}>
                  {['Indicator', 'Type', 'Severity', 'First Seen', 'Action'].map(h => (
                    <th key={h} style={{ padding: '14px 20px', textAlign: 'left', fontSize: 12, color: '#6B7280', fontWeight: 500 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentThreats.map((t, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F3F4F6' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#F9FAFB')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={{ padding: '14px 20px', fontSize: 13, color: '#111827', fontFamily: 'JetBrains Mono, monospace' }}>{t.indicator}</td>
                    <td style={{ padding: '14px 20px', fontSize: 12, color: '#6B7280' }}>{t.type}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{
                        fontSize: 11, padding: '2px 10px', borderRadius: 6, fontWeight: 500,
                        background: t.severity === 'Critical' ? '#FEE2E2' : t.severity === 'High' ? '#FFEDD5' : '#FEF3C7',
                        color: t.severity === 'Critical' ? '#DC2626' : t.severity === 'High' ? '#EA580C' : '#D97706',
                      }}>{t.severity}</span>
                    </td>
                    <td style={{ padding: '14px 20px', fontSize: 12, color: '#6B7280' }}>{t.seen}</td>
                    <td style={{ padding: '14px 20px' }}>
                      <span style={{ fontSize: 11, padding: '2px 10px', borderRadius: 6, background: '#FEE2E2', color: '#DC2626' }}>Blocked</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
