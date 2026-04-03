import type { Metadata, Viewport } from 'next';
import './globals.css';
import { DialRoot } from 'dialkit';

export const metadata: Metadata = {
  title: 'Curvehaus — Animated Curve Loaders',
  description: 'Turn mathematical curves into production-ready animated loaders.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body
        className="h-full overflow-hidden bg-[#0a0a0c] text-white"
        style={{ fontFamily: "-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif" }}
      >
        {children}
        <DialRoot position="top-right" />
      </body>
    </html>
  );
}
