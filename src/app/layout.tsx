import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from 'sonner';
import { Analytics } from '@vercel/analytics/react';
import MobileGate from '@/components/MobileGate';
import MobileToast from '@/components/MobileToast';

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
        <MobileGate>{children}</MobileGate>
        <div className="hidden md:block"><Toaster theme="dark" position="bottom-left" toastOptions={{ style: { background: '#111113', border: '0.5px solid #27272a', color: '#fafafa', fontSize: '12px', width: 'auto', minWidth: 0, maxWidth: '200px', padding: '8px 14px' } }} /></div>
        <MobileToast />
        <Analytics />
      </body>
    </html>
  );
}
