import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET: partner activity feed (messages + activity_posts for a specific advertiser)
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: partner } = await supabase
      .from('partners')
      .select('id')
      .eq('auth_user_id', user.id)
      .single();

    if (!partner) {
      return NextResponse.json({ error: 'Partner not found' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const advertiserId = searchParams.get('advertiser_id');

    if (!advertiserId) {
      return NextResponse.json({ error: 'advertiser_id is required' }, { status: 400 });
    }

    // Verify partner is approved for this advertiser
    const { data: enrollment } = await supabase
      .from('partner_programs')
      .select('id')
      .eq('partner_id', partner.id)
      .eq('advertiser_id', advertiserId)
      .eq('status', 'approved')
      .maybeSingle();

    if (!enrollment) {
      return NextResponse.json({ error: 'Not enrolled in this program' }, { status: 403 });
    }

    const admin = createAdminClient();

    // Fetch partner_messages for this advertiser
    const { data: messages } = await admin
      .from('partner_messages')
      .select('id, title, body, sent_at, target_type, advertiser_id')
      .eq('advertiser_id', advertiserId)
      .eq('target_type', 'all')
      .order('sent_at', { ascending: false });

    // Fetch activity_posts for this advertiser (published only)
    const { data: activityPosts } = await admin
      .from('activity_posts')
      .select('id, title, content, post_type, created_at, advertiser_id')
      .eq('advertiser_id', advertiserId)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    // Fetch read status for messages
    const { data: reads } = await supabase
      .from('partner_message_reads')
      .select('message_id')
      .eq('partner_id', partner.id);

    const readMessageIds = new Set((reads || []).map(r => r.message_id));

    // Build unified feed
    type FeedItem = {
      id: string;
      type: 'message' | 'post';
      post_type?: 'announcement' | 'board';
      title: string;
      body?: string;
      content?: string;
      is_read?: boolean;
      created_at: string;
    };

    const feed: FeedItem[] = [];

    // Add messages
    for (const msg of messages || []) {
      feed.push({
        id: msg.id,
        type: 'message',
        title: msg.title,
        body: msg.body,
        is_read: readMessageIds.has(msg.id),
        created_at: msg.sent_at,
      });
    }

    // Add activity posts
    for (const post of activityPosts || []) {
      feed.push({
        id: post.id,
        type: 'post',
        post_type: post.post_type as 'announcement' | 'board',
        title: post.title,
        content: post.content,
        created_at: post.created_at,
      });
    }

    // Sort by created_at desc
    feed.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Count unread messages
    const unreadCount = (messages || []).filter(m => !readMessageIds.has(m.id)).length;

    return NextResponse.json({ feed, unreadCount });
  } catch (error) {
    console.error('Partner activity GET error:', error);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
