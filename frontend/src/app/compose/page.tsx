'use client';

import AppShell from '@/components/Navbar';
import { useState, useRef, useCallback } from 'react';

const FACTOR_ITEMS = [
  { key: 'sensitive_data', label: 'Financial Data Risk' },
  { key: 'phishing', label: 'AI Pattern Detection' },
  { key: 'domain_risk', label: 'External Domain Risk' },
  { key: 'metadata_risk', label: 'Social Engineering Risk' },
  { key: 'attachment_risk', label: 'Attachment Risk' },
];

function getRiskLabel(score: number): { label: string; color: string } {
  if (score <= 30) return { label: 'Low', color: '#10B981' };
  if (score <= 60) return { label: 'Medium', color: '#F59E0B' };
  if (score <= 80) return { label: 'High', color: '#F97316' };
  return { label: 'Critical', color: '#EF4444' };
}

const SIGNAL_LABELS: Record<string, string> = {
  external_recipients: '🌐 External recipient detected',
  external_domain: '🌐 External email domain',
  password_exposed: '🔓 Password detected in content',
  bank_account_exposed: '🏦 Bank account information detected',
  api_key_exposed: '🔑 API key detected in content',
  urgency_language: '⏰ Urgent request language',
  financial_request_language: '💰 Financial request detected',
  confidentiality_pressure: '🤫 Confidentiality pressure',
  credential_harvesting: '🔐 Credential harvesting attempt',
  suspension_threat: '⛔ Account suspension threat',
  ai_generated_text_patterns: '🤖 AI-generated text patterns',
  typosquatting_domain: '🎭 Typosquatting domain',
  outbound_to_external: '📤 Outbound to external',
};

export default function ComposePage() {
  const [form, setForm] = useState({ sender: 'you@company.com', recipients: '', cc: '', subject: '', body: '', direction: 'OUTBOUND' });
  const [score, setScore] = useState(0);
  const [factors, setFactors] = useState<Record<string, number>>({});
  const [signals, setSignals] = useState<string[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanDone, setScanDone] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const analyze = useCallback((data: typeof form) => {
    if (!data.body && !data.subject && !data.recipients) {
      setScore(0); setFactors({}); setSignals([]); return;
    }
    const text = `${data.subject} ${data.body}`.toLowerCase();
    const sigs: string[] = [];
    let s = 0;
    const f: Record<string, number> = { phishing: 0, sensitive_data: 0, domain_risk: 0, metadata_risk: 0, attachment_risk: 0 };

    if (data.recipients && !data.recipients.includes('@company.com')) { sigs.push('external_recipients'); s += 15; f.domain_risk = 40; }
    if (text.includes('password') || text.includes('api key') || text.includes('api_key')) { sigs.push('password_exposed'); s += 25; f.sensitive_data = Math.max(f.sensitive_data, 80); }
    if (text.includes('bank account') || text.includes('routing number') || text.includes('account number')) { sigs.push('bank_account_exposed'); s += 25; f.sensitive_data = Math.max(f.sensitive_data, 91); }
    if (text.includes('api key') || text.includes('sk-')) { sigs.push('api_key_exposed'); s += 20; f.sensitive_data = Math.max(f.sensitive_data, 75); }
    if (text.includes('urgent') || text.includes('immediately') || text.includes('act now')) { sigs.push('urgency_language'); s += 15; f.metadata_risk = Math.max(f.metadata_risk, 65); }
    if (text.includes('wire transfer') || text.includes('gift card') || text.includes('payment due')) { sigs.push('financial_request_language'); s += 20; f.phishing = Math.max(f.phishing, 60); }
    if (text.includes('confidential') || text.includes('do not share') || text.includes("don't tell")) { sigs.push('confidentiality_pressure'); s += 10; f.metadata_risk = Math.max(f.metadata_risk, 50); }
    if (text.includes('verify your') || text.includes('confirm your identity')) { sigs.push('credential_harvesting'); s += 25; f.phishing = Math.max(f.phishing, 82); }
    if (text.includes('suspended') || text.includes('deactivat')) { sigs.push('suspension_threat'); s += 15; f.phishing = Math.max(f.phishing, 70); }

    setScore(Math.min(s, 100)); setFactors(f); setSignals(sigs);
  }, []);

  const handleChange = (field: string, value: string) => {
    const updated = { ...form, [field]: value };
    setForm(updated);
    setScanDone(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // Try backend, fall back to client-side
      fetch('http://localhost:8080/api/emails/analyze-draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated)
      }).then(r => r.json()).then(data => {
        setScore(data.quickScore || 0);
        setFactors(data.factorScores || {});
        setSignals(data.detectedSignals || []);
      }).catch(() => analyze(updated));
    }, 800);
  };

  const handleScan = async () => {
    setScanning(true);
    try {
      const res = await fetch('http://localhost:8080/api/emails/scan', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form),
      });
      if (res.ok) {
        const data = await res.json();
        setScore(data.totalScore); setFactors(data.factors || {}); setSignals(data.detectedSignals || []);
      }
    } catch { 
      // Fallback: strictly execute the client-side analyzer
      analyze(form);
    }
    setScanning(false); setScanDone(true);
  };

  const risk = getRiskLabel(score);

  return (
    <AppShell>
      <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827' }}>Compose Email</h1>
          <p style={{ fontSize: 13, color: '#6B7280', marginTop: 4 }}>Draft safe outbound communications with real-time AI security boundaries</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr', gap: 20, alignItems: 'start' }}>
          {/* Email Analyzer Form */}
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Fields */}
            <div style={{ borderBottom: '1px solid #E5E7EB' }}>
              {[
                { label: 'From:', field: 'sender', placeholder: 'you@company.com' },
                { label: 'To:', field: 'recipients', placeholder: 'client@external.com' },
                { label: 'Subject:', field: 'subject', placeholder: 'Project Update' },
              ].map(({ label, field, placeholder }) => (
                <div key={field} style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F3F4F6', padding: '0 24px' }}>
                  <label style={{ width: 75, fontSize: 13, color: '#4B5563', fontWeight: 500, flexShrink: 0 }}>{label}</label>
                  <input
                    type="text"
                    value={(form as any)[field]}
                    onChange={e => handleChange(field, e.target.value)}
                    placeholder={placeholder}
                    style={{ flex: 1, padding: '14px 0', background: 'none', border: 'none', outline: 'none', color: '#111827', fontSize: 13 }}
                  />
                </div>
              ))}
            </div>
            {/* Body */}
            <textarea
              value={form.body}
              onChange={e => handleChange('body', e.target.value)}
              placeholder="Draft your email here..."
              style={{ width: '100%', minHeight: 260, padding: 24, background: 'none', border: 'none', outline: 'none', color: '#111827', fontSize: 13, resize: 'vertical', lineHeight: 1.7 }}
            />
            {/* Actions */}
            <div style={{ padding: '12px 24px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 12, background: '#F9FAFB' }}>
              <button
                onClick={handleScan}
                disabled={scanning}
                style={{ padding: '8px 20px', background: '#2563EB', color: 'white', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: scanning ? 0.6 : 1 }}
              >
                {scanning ? '⏳ Analyzing...' : '🚀 Send Email'}
              </button>
              <button style={{ padding: '8px 20px', background: 'white', color: '#4B5563', border: '1px solid #D1D5DB', borderRadius: 6, fontSize: 13, cursor: 'pointer' }}>
                Clear
              </button>
            </div>
          </div>

          {/* Right Panel: Threat Analysis */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Score Gauge */}
            <div className="card" style={{ padding: 24, textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: risk.color }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>Threat Analysis</span>
              </div>
              {/* Circular Gauge */}
              <div style={{ position: 'relative', width: 140, height: 140, margin: '0 auto' }}>
                <svg viewBox="0 0 140 140" style={{ width: '100%', height: '100%' }}>
                  <circle cx="70" cy="70" r="56" fill="none" stroke="#F3F4F6" strokeWidth="8" />
                  <circle
                    cx="70" cy="70" r="56" fill="none"
                    stroke={risk.color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 2 * Math.PI * 56} ${2 * Math.PI * 56}`}
                    transform="rotate(-90 70 70)"
                    style={{ transition: 'stroke-dasharray 1s ease, stroke 0.5s' }}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 36, fontWeight: 800, color: risk.color }}>{Math.round(score)}</span>
                  <span style={{ fontSize: 12, color: risk.color, fontWeight: 500 }}>{risk.label}</span>
                </div>
              </div>
              <div style={{ fontSize: 12, color: '#6B7280', marginTop: 12 }}>Fraud Risk Score</div>
            </div>

            {/* Risk Breakdown */}
            <div className="card" style={{ padding: 24 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 16 }}>Risk Breakdown</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {FACTOR_ITEMS.map(f => {
                  const val = Math.round(factors[f.key] || 0);
                  return (
                    <div key={f.key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: 13, color: '#4B5563' }}>{f.label}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: val > 60 ? '#DC2626' : val > 30 ? '#D97706' : '#111827' }}>{val}%</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Signals */}
            {signals.length > 0 && (
              <div className="card animate-slide-in" style={{ padding: 24 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Detected Signals</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {signals.map((s, i) => (
                    <div key={i} style={{ fontSize: 12, color: '#B91C1C', padding: '6px 10px', background: '#FEF2F2', borderRadius: 6, border: '1px solid #FECACA' }}>
                      {SIGNAL_LABELS[s] || `⚠ ${s.replace(/_/g, ' ')}`}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {scanDone && (
              <div className="card animate-slide-in" style={{ padding: 16, borderColor: score > 60 ? 'rgba(239,68,68,0.3)' : score > 30 ? 'rgba(245,158,11,0.3)' : 'rgba(16,185,129,0.3)' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: score > 80 ? '#EF4444' : score > 60 ? '#F97316' : score > 30 ? '#F59E0B' : '#10B981' }}>
                  {score > 80 ? '🚫 Email Blocked' : score > 60 ? '🔶 Strong Warning' : score > 30 ? '⚠️ Warning' : '✅ Email Allowed'}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
