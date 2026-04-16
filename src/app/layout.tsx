import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from 'sonner';
import OwnerFilteredAnalytics from '@/components/OwnerFilteredAnalytics';
import MobileGate from '@/components/MobileGate';

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
        <Toaster theme="dark" position="bottom-center" offset={{ top: '0px', right: '0px', bottom: '120px', left: '0px' }} mobileOffset={{ top: '0px', right: '0px', bottom: '120px', left: '0px' }} toastOptions={{ style: { background: 'var(--bg-surface)', border: '0.5px solid var(--border-default)', color: 'var(--text-primary)', fontSize: '12px', width: 'auto', minWidth: 0, maxWidth: '200px', padding: '8px 14px', left: '50%', right: 'auto', transform: 'translateX(-50%)' } }} />
        <OwnerFilteredAnalytics />
      </body>
    </html>
  );
}
