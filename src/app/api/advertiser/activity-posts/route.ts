import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { getAdvertiserSession } from '@/lib/auth';

// GET — 게시물 목록 조회 (광고주)
export async function GET(req: NextRequest) {
  const session = await getAdvertiserSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const postType = searchParams.get('type'); // 'announcement' | 'board' | null

  const admin = createAdminClient();

  let query = admin
    .from('activity_posts')
    .select('*')
    .eq('advertiser_id', session.advertiserUuid)
    .order('created_at', { ascending: false });

  if (postType) {
    query = query.eq('post_type', postType);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ posts: data || [] });
}

// POST — 게시물 생성 (광고주)
export async function POST(req: NextRequest) {
  const session = await getAdvertiserSession();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { title, content, post_type, is_published } = await req.json();

  if (!title?.trim() || !content?.trim()) {
    return NextResponse.json({ error: '제목과 내용을 입력해주세요' }, { status: 400 });
  }

  if (!['announcement', 'board'].includes(post_type)) {
    return NextResponse.json({ error: '올바른 게시물 유형이 아닙니다' }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data, error } = await admin
    .from('activity_posts')
    .insert({
      advertiser_id: session.advertiserUuid,
      title: title.trim(),
      content: content.trim(),
      post_type,
      is_published: is_published !== false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ post: data });
}
