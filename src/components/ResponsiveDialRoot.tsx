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
        className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-[#27272a] bg-[#18181b]"
        style={{
          maxHeight: '45vh',
          overflowY: 'auto',
          paddingBottom: 'env(safe-area-inset-bottom, 20px)',
          boxShadow: '0 -8px 30px rgba(0,0,0,0.3)',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <div className="flex justify-center py-2">
          <div className="h-1 w-8 rounded-full bg-[#3f3f46]" />
        </div>
        <DialRoot mode="inline" />
      </div>
    );
  }

  return <DialRoot position="top-right" />;
}
