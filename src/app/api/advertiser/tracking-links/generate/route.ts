import { NextRequest, NextResponse } from 'next/server';
import { getAdvertiserSession } from '@/lib/auth';
import { createAdminClient } from '@/lib/supabase/admin';

interface AirbridgeTrackingLinkResponse {
  data: {
    trackingLink: {
      id: number;
      link: {
        click: string;
        impression: string;
        serverToServerClick: string | null;
      };
      shortId: string;
      shortUrl: string;
    };
  };
}

/**
 * POST /api/advertiser/tracking-links/generate
 * Generate N Airbridge tracking links (pool approach) — millie only
 *
 * Body: { count: number, channel?: string, campaign?: string }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getAdvertiserSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // event_tracking or hybrid only
    if (session.advertiserType !== 'event_tracking' && session.advertiserType !== 'hybrid') {
      return NextResponse.json(
        { error: 'This feature requires event tracking configuration' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const count = Math.min(Math.max(body.count || 1, 1), 100); // 1~100
    const channel = body.channel || 'referio';
    const campaign = body.campaign || 'partner-referral';

    // Get Airbridge config from webhook_integrations
    const admin = createAdminClient();
    const { data: integration, error: intError } = await admin
      .from('webhook_integrations')
      .select('id, config')
      .eq('advertiser_id', session.advertiserUuid)
      .eq('source', 'airbridge')
      .eq('is_active', true)
      .single();

    if (intError || !integration) {
      return NextResponse.json(
        { error: 'Airbridge integration not found' },
        { status: 404 }
      );
    }

    const airbridgeConfig = integration.config as {
      airbridge?: {
        app_name: string;
        tracking_link_api_token: string;
      };
    };

    const appName = airbridgeConfig?.airbridge?.app_name;
    const apiToken = airbridgeConfig?.airbridge?.tracking_link_api_token;

    if (!appName || !apiToken) {
      return NextResponse.json(
        { error: 'Airbridge config incomplete (app_name or tracking_link_api_token missing)' },
        { status: 500 }
      );
    }

    // Generate tracking links via Airbridge API
    const createdLinks: Array<{
      tracking_url: string;
      sub_id: string;
      metadata: Record<string, unknown>;
    }> = [];
    const errors: string[] = [];

    for (let i = 0; i < count; i++) {
      const subId = `ref_${Date.now()}_${i.toString().padStart(3, '0')}`;

      try {
        const res = await fetch(
          'https://api.airbridge.io/v1/tracking-links',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiToken}`,
            },
            body: JSON.stringify({
              channel,
              campaignParams: {
                campaign,
                sub_id: subId,
              },
            }),
          }
        );

        if (!res.ok) {
          const errText = await res.text();
          errors.push(`Link ${i}: ${res.status} ${errText}`);
          continue;
        }

        const data: AirbridgeTrackingLinkResponse = await res.json();
        const trackingLink = data.data.trackingLink;

        createdLinks.push({
          tracking_url: trackingLink.link.click,
          sub_id: subId,
          metadata: {
            airbridge_link_id: trackingLink.id,
            short_id: trackingLink.shortId,
            short_url: trackingLink.shortUrl,
            impression_url: trackingLink.link.impression,
            channel,
            campaign,
          },
        });
      } catch (err) {
        errors.push(`Link ${i}: ${err instanceof Error ? err.message : 'Unknown error'}`);
      }
    }

    // Bulk insert into tracking_links
    if (createdLinks.length > 0) {
      const rows = createdLinks.map((link) => ({
        advertiser_id: session.advertiserUuid,
        provider: 'airbridge',
        tracking_url: link.tracking_url,
        sub_id: link.sub_id,
        status: 'unassigned',
        metadata: link.metadata,
      }));

      const { error: insertError } = await admin
        .from('tracking_links')
        .insert(rows);

      if (insertError) {
        return NextResponse.json(
          { error: `DB insert failed: ${insertError.message}` },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      created: createdLinks.length,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Tracking link generation error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
