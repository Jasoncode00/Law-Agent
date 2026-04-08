import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Law Navigator',
  description: '법령 자문 AI Agent',
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
