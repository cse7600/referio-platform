'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Deprecated — redirects to /advertiser/events
 */
export default function MillieEventsRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/advertiser/events');
  }, [router]);

  return null;
}
