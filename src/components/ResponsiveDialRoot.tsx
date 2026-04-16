'use client';
import { useEffect, useState } from 'react';
import { DialRoot } from 'dialkit';

export default function ResponsiveDialRoot() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 768px)');
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  if (isMobile) {
    return (
      <div
        className="fixed inset-x-0 bottom-0 rounded-t-2xl"
        style={{
          zIndex: 'var(--z-sheet)',
          maxHeight: '45vh',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
          background: 'var(--bg-elevated)',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.3), inset 0 var(--border-hairline) 0 0 var(--border-default)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="flex justify-center py-2">
          <div className="h-1 w-8 rounded-full" style={{ background: 'var(--border-strong)' }} />
        </div>
        <DialRoot mode="inline" />
      </div>
    );
  }

  return <DialRoot position="top-right" />;
}
