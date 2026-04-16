'use client';

import { useState, useEffect, useCallback } from 'react';

let showToastFn: ((msg: string) => void) | null = null;

export function mobileToast(msg: string) {
  showToastFn?.(msg);
}

export default function MobileToast() {
  const [message, setMessage] = useState('');
  const [visible, setVisible] = useState(false);

  const show = useCallback((msg: string) => {
    setMessage(msg);
    setVisible(true);
    setTimeout(() => setVisible(false), 2000);
  }, []);

  useEffect(() => {
    showToastFn = show;
    return () => { showToastFn = null; };
  }, [show]);

  if (!visible) return null;

  return (
    <div className="fixed left-0 right-0 top-12 flex justify-center pointer-events-none md:hidden"
      style={{ zIndex: 'var(--z-toast)' }}>
      <div className="rounded-xl px-5 py-2.5 text-[14px] font-medium pointer-events-auto"
        style={{
          background: 'var(--bg-surface)',
          boxShadow: 'inset 0 0 0 var(--border-hairline) var(--border-default)',
          color: 'var(--text-primary)',
          animation: 'toastFade 2s ease both',
        }}>
        {message}
      </div>
    </div>
  );
}
