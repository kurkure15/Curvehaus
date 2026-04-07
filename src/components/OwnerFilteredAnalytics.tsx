'use client';

import { Analytics } from '@vercel/analytics/react';

export default function OwnerFilteredAnalytics() {
  return (
    <Analytics beforeSend={(event) => {
      if (document.cookie.includes('curvehaus_owner=true')) return null;
      return event;
    }} />
  );
}
