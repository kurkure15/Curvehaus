import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { DialRoot } from 'dialkit';
import AgentationWrapper from '@/components/AgentationWrapper';

export const metadata: Metadata = {
  title: 'Curvehaus — Mathematical Curve Loaders',
  description: 'Pick a loader. Copy the code.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body className="antialiased" style={{ fontFamily: 'var(--font-geist-sans), -apple-system, sans-serif' }}>
        {children}
        <DialRoot position="top-right" />
        <AgentationWrapper />
      </body>
    </html>
  );
}
