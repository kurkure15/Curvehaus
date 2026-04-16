'use client';
import { useEffect, useState } from 'react';

export default function ExcludeAnalytics() {
  const [done, setDone] = useState(false);

  useEffect(() => {
    const expires = new Date();
    expires.setFullYear(expires.getFullYear() + 10);
    document.cookie = `curvehaus_owner=true; path=/; expires=${expires.toUTCString()}; SameSite=Lax`;
    setDone(true);
  }, []);

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg-app)', color: 'var(--text-primary)', fontFamily: 'monospace',
    }}>
      <p>{done ? '✓ Analytics excluded. Close this tab.' : 'Setting cookie…'}</p>
    </div>
  );
}
