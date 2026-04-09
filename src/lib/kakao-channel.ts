/**
 * Kakao Channel (PlusFriend) message client
 *
 * Required environment variables:
 *   NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID  — channel profile ID (e.g. _XxXxXx)
 *   KAKAO_ADMIN_KEY                      — kakao app Admin key (server-side only)
 *
 * Prerequisites before use:
 *   - partners table must have a `kakao_user_key` column (TEXT, nullable)
 *     to store each partner's kakao user key after consent.
 *     Add via migration once kakao biz-app review is approved.
 */

const KAKAO_CHANNEL_MESSAGE_URL =
  'https://kapi.kakao.com/v1/api/talk/channels/message/send';

/**
 * Returns true when both required env vars are present.
 * Use this guard before calling any channel messaging function.
 */
export function isKakaoChannelEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_KAKAO_CHANNEL_PUBLIC_ID &&
      process.env.KAKAO_ADMIN_KEY,
  );
}

/**
 * Sends a kakao channel message to a single partner.
 *
 * @param partnerId  - UUID from partners.id
 * @param templateId - kakao channel message template ID
 * @param params     - template variable substitutions (key → value)
 *
 * Errors are logged but never thrown — caller flow is not interrupted.
 *
 * TODO: This function is a skeleton. Before it can send real messages:
 *   1. Add `kakao_user_key TEXT` column to partners table (migration needed).
 *   2. Populate kakao_user_key when a partner consents via plusfriends scope
 *      (retrieve from Supabase user_metadata or kakao /v2/user/me API).
 *   3. Confirm exact kakao channel message API endpoint & payload format
 *      (current impl follows https://developers.kakao.com/docs/latest/ko/kakaotalk-channel/rest-api).
 */
export async function sendKakaoChannelMessage(
  partnerId: string,
  templateId: string,
  params: Record<string, string>,
): Promise<void> {
  if (!isKakaoChannelEnabled()) {
    console.warn('[kakao-channel] skipped: env vars not set');
    return;
  }

  try {
    // TODO: replace with actual DB query once kakao_user_key column exists
    // const { createClient } = await import('@/lib/supabase/server');
    // const supabase = await createClient();
    // const { data: partner } = await supabase
    //   .from('partners')
    //   .select('kakao_user_key, kakao_channel_added')
    //   .eq('id', partnerId)
    //   .single();
    //
    // if (!partner?.kakao_channel_added || !partner.kakao_user_key) {
    //   console.warn(`[kakao-channel] partner ${partnerId} has no channel consent or user key`);
    //   return;
    // }

    // TODO: remove this placeholder once kakao_user_key is available
    const kakaoUserKey: string | null = null;
    if (!kakaoUserKey) {
      console.warn(
        `[kakao-channel] partner ${partnerId}: kakao_user_key not yet stored (pending migration)`,
      );
      return;
    }

    const body = new URLSearchParams({
      receiver_uuids: JSON.stringify([kakaoUserKey]),
      template_id: templateId,
      template_args: JSON.stringify(params),
    });

    const res = await fetch(KAKAO_CHANNEL_MESSAGE_URL, {
      method: 'POST',
      headers: {
        Authorization: `KakaoAK ${process.env.KAKAO_ADMIN_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!res.ok) {
      const text = await res.text();
      console.error(
        `[kakao-channel] message send failed for partner ${partnerId}: ${res.status} ${text}`,
      );
    }
  } catch (err) {
    console.error(`[kakao-channel] unexpected error for partner ${partnerId}:`, err);
  }
}
