'use client';

import { useState, useEffect } from 'react';

export default function MobileGate({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const mobile = window.innerWidth < 768;
    const isDev = process.env.NODE_ENV === 'development';
    setIsMobile(mobile && !isDev);
    setChecked(true);
  }, []);

  if (!checked) return null;

  if (isMobile) {
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center px-8 text-center" style={{ background: 'var(--bg)' }}>
        <span className="text-[16px] font-bold" style={{ color: 'var(--text)' }}>Curvehaus</span>
        <span className="mt-2 text-[13px]" style={{ color: 'var(--text-3)', fontFamily: 'var(--mono)' }}>
          Mobile version coming soon.<br />Open on desktop for now.
        </span>
      </div>
    );
  }

  return <>{children}</>;
}
