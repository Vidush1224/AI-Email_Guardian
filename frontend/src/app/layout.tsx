import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AI Email Guardian - Security Dashboard',
  description: 'Real-Time GenAI Fraud Detection for Enterprise Email Communication',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
