import { NextResponse } from 'next/server';

/**
 * GET /api/advertiser/millie-events
 * Deprecated — redirects to /api/advertiser/events
 */
export async function GET() {
  return NextResponse.redirect(new URL('/api/advertiser/events', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
}
