'use client';

import AppShell from '@/components/Navbar';
import { useState } from 'react';

export default function SettingsPage() {
  const [companyDomain, setCompanyDomain] = useState('company.com');
  const [riskThreshold, setRiskThreshold] = useState('40');
  const [aiEnabled, setAiEnabled] = useState(true);
  const [autoBlock, setAutoBlock] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <AppShell>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 700 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Settings</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Configure system behavior and detection parameters</p>
        </div>

        {/* General Settings */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20 }}>General</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>Company Domain</label>
              <input
                value={companyDomain}
                onChange={e => setCompanyDomain(e.target.value)}
                style={{ width: '100%', padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, color: '#111827', fontSize: 13, outline: 'none' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: '#6B7280', display: 'block', marginBottom: 6 }}>AI Deep Analysis Threshold (0-100)</label>
              <input
                value={riskThreshold}
                onChange={e => setRiskThreshold(e.target.value)}
                type="number" min="0" max="100"
                style={{ width: 120, padding: '10px 14px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 8, color: '#111827', fontSize: 13, outline: 'none' }}
              />
              <span style={{ fontSize: 11, color: '#6B7280', marginLeft: 12 }}>Emails scoring above this trigger AI analysis</span>
            </div>
          </div>
        </div>

        {/* Detection Settings */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20 }}>Detection</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { label: 'AI Deep Analysis', desc: 'Enable LLM-powered semantic fraud reasoning', value: aiEnabled, set: setAiEnabled },
              { label: 'Auto-Block Critical', desc: 'Automatically block emails scoring above 80', value: autoBlock, set: setAutoBlock },
              { label: 'Email Notifications', desc: 'Send alerts for high-risk detections', value: notifications, set: setNotifications },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0', borderBottom: i < 2 ? '1px solid #E5E7EB' : 'none' }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: '#111827' }}>{item.label}</div>
                  <div style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{item.desc}</div>
                </div>
                <button
                  onClick={() => item.set(!item.value)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: item.value ? '#2563EB' : '#D1D5DB',
                    position: 'relative', transition: 'background 0.2s',
                  }}
                >
                  <div style={{
                    width: 18, height: 18, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3,
                    left: item.value ? 23 : 3,
                    transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Risk Weights */}
        <div className="card" style={{ padding: 24 }}>
          <h2 style={{ fontSize: 15, fontWeight: 600, color: '#111827', marginBottom: 20 }}>Risk Factor Weights</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[
              { name: 'Phishing Patterns', weight: '0.30' },
              { name: 'Sensitive Data', weight: '0.25' },
              { name: 'Domain Risk', weight: '0.20' },
              { name: 'Attachment Risk', weight: '0.15' },
              { name: 'Metadata Risk', weight: '0.10' },
            ].map((item, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ flex: 1, fontSize: 13, color: '#4B5563' }}>{item.name}</span>
                <input
                  defaultValue={item.weight}
                  style={{ width: 70, padding: '6px 10px', background: '#FFFFFF', border: '1px solid #E5E7EB', borderRadius: 6, color: '#111827', fontSize: 13, outline: 'none', textAlign: 'center' }}
                />
              </div>
            ))}
          </div>
        </div>

        <button style={{ padding: '10px 24px', background: '#2563EB', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', alignSelf: 'flex-start' }}>
          Save Settings
        </button>
      </div>
    </AppShell>
  );
}
