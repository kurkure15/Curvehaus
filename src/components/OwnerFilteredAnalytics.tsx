'use client';

import { Analytics } from '@vercel/analytics/react';

export default function OwnerFilteredAnalytics() {
  return (
    <Analytics beforeSend={(event) => {
      if (localStorage.getItem('curvehaus_owner') === 'true') return null;
      return event;
    }} />
  );
}
