import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { DialRoot } from 'dialkit';

export const metadata: Metadata = {
  title: 'Curvehaus — Mathematical Curve Loaders',
  description: 'Pick a loader. Copy the code. Beautiful animated loaders from mathematical curves.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="min-h-screen bg-[#0a0a0a] text-[#fafafa] antialiased" style={{ fontFamily: 'var(--font-geist-sans), -apple-system, sans-serif' }}>
        {children}
        <DialRoot position="top-right" />
      </body>
    </html>
  );
}
