import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LexAI',
  description: '정확한 법령 근거, 빠른 현장 판단',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="min-h-screen" style={{ background: 'var(--color-bg)' }}>
        {children}
      </body>
    </html>
  );
}
