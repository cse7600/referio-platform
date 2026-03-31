// Unsubscribe token utilities
// Generates and verifies HMAC-SHA256 tokens for one-click email unsubscribe

import crypto from 'crypto';

const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET || 'referio-unsubscribe-default-key';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://referio.puzl.co.kr';

export function generateUnsubscribeToken(partnerId: string): string {
  return crypto.createHmac('sha256', UNSUBSCRIBE_SECRET).update(partnerId).digest('hex');
}

export function verifyUnsubscribeToken(partnerId: string, token: string): boolean {
  const expected = generateUnsubscribeToken(partnerId);
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'hex'),
      Buffer.from(token, 'hex')
    );
  } catch {
    return false;
  }
}

export function generateUnsubscribeUrl(partnerId: string): string {
  const token = generateUnsubscribeToken(partnerId);
  return `${APP_URL}/api/partner/unsubscribe?pid=${encodeURIComponent(partnerId)}&token=${token}`;
}
