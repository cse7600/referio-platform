import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

async function verifyAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const masterEmail = process.env.MASTER_ADMIN_EMAIL;
  if (!masterEmail || user.email !== masterEmail) return null;
  return user;
}

function extractNaverBlogId(url: string): string | null {
  // https://blog.naver.com/0902ab → 0902ab
  const match = url.match(/blog\.naver\.com\/([^/?#]+)/);
  return match ? match[1] : null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const adminUser = await verifyAdmin();
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  // 1. Fetch partner info
  const { data: partner, error: partnerError } = await supabase
    .from('partners')
    .select('id, name, main_channel_link')
    .eq('id', id)
    .single();

  if (partnerError || !partner) {
    return NextResponse.json({ error: '파트너를 찾을 수 없습니다' }, { status: 404 });
  }

  if (!partner.main_channel_link) {
    return NextResponse.json({ error: '주채널 링크가 없습니다' }, { status: 400 });
  }

  const blogId = extractNaverBlogId(partner.main_channel_link);
  if (!blogId) {
    return NextResponse.json({
      error: '네이버 블로그 URL이 아닙니다',
      channel: partner.main_channel_link,
    }, { status: 400 });
  }

  // 2. Fetch approved programs for this partner
  const { data: programs } = await supabase
    .from('partner_programs')
    .select('program_id, programs(id, name)')
    .eq('partner_id', id)
    .eq('status', 'approved');

  const keywords: Array<{ programId: string; programName: string; keyword: string }> = [];

  if (programs && programs.length > 0) {
    for (const pp of programs) {
      const prog = pp.programs as unknown as { id: string; name: string } | null;
      if (prog?.name) {
        keywords.push({
          programId: prog.id,
          programName: prog.name,
          keyword: prog.name,
        });
      }
    }
  }

  // No keywords — return early with search hint
  if (keywords.length === 0) {
    return NextResponse.json({
      blogId,
      results: [],
      searchUrls: [],
      message: '참여 중인 프로그램이 없습니다. 키워드를 직접 입력하여 검색하세요.',
    });
  }

  // 3. 전략: 키워드로 네이버 블로그 최신순 검색 (ssc=tab.blog.all)
  //    → HTML에서 data-url로 게시물 URL 추출
  //    → 파트너 blogId 일치하는 것만 필터링
  //    → data-url 이후 headline1 클래스에서 제목 추출
  const results: Array<{
    url: string;
    title: string;
    snippet: string;
    keyword: string;
    programId: string;
    programName: string;
    searchUrl: string;
  }> = [];

  for (const kw of keywords) {
    const searchUrl = `https://search.naver.com/search.naver?ssc=tab.blog.all&query=${encodeURIComponent(kw.keyword)}&nso=so%3Add%2Cp%3Aall`;

    try {
      const res = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'ko-KR,ko;q=0.9',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const html = await res.text();

        // data-url="https://blog.naver.com/{blogId}/{logNo}" 패턴으로 모든 게시물 추출
        const dataUrlPattern = /data-url="(https:\/\/blog\.naver\.com\/([a-zA-Z0-9_]+)\/(\d+))"/g;
        let m: RegExpExecArray | null;

        const foundPosts = new Map<string, { url: string; title: string; snippet: string }>();

        while ((m = dataUrlPattern.exec(html)) !== null) {
          const [, postUrl, postBlogId, logNo] = m;

          // 파트너 blogId와 일치하는 것만 (대소문자 무시)
          if (postBlogId.toLowerCase() !== blogId.toLowerCase()) continue;
          if (foundPosts.has(logNo)) continue;

          // data-url 이후 3000자에서 제목(headline1) 추출
          const ctxAfter = html.slice(m.index, m.index + 3000);
          const titleMatch = ctxAfter.match(/headline1[^"]*"[^>]*>([^<]{3,150})</);
          const rawTitle = titleMatch ? titleMatch[1] : null;
          const title = rawTitle
            ? rawTitle.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#\d+;/g, '').trim()
            : `${kw.keyword} 관련 게시물`;

          // 스니펫: span 텍스트
          const spanMatch = ctxAfter.match(/<span[^>]*>([가-힣a-zA-Z0-9 ,.!?%]{15,200})<\/span>/);
          const snippet = spanMatch ? spanMatch[1].trim() : '';

          foundPosts.set(logNo, { url: postUrl, title, snippet });
        }

        for (const [, post] of foundPosts) {
          results.push({
            ...post,
            keyword: kw.keyword,
            programId: kw.programId,
            programName: kw.programName,
            searchUrl,
          });
        }
      }
    } catch {
      // fetch 실패 — searchUrl만 반환
    }

    // 결과 없거나 fetch 실패해도 검색 URL은 항상 포함 (Admin 직접 확인용)
    if (!results.find(r => r.programId === kw.programId)) {
      results.push({
        url: searchUrl,
        title: `[직접 확인] "${kw.keyword}" 최신 블로그 검색 열기`,
        snippet: `네이버 블로그에서 "${kw.keyword}" 최신순 검색 후 ${blogId} 게시물 확인`,
        keyword: kw.keyword,
        programId: kw.programId,
        programName: kw.programName,
        searchUrl,
      });
    }
  }

  // Admin이 직접 열어볼 수 있는 최신순 검색 URL
  const searchUrls = keywords.map(kw => ({
    keyword: kw.keyword,
    programName: kw.programName,
    url: `https://search.naver.com/search.naver?ssc=tab.blog.all&query=${encodeURIComponent(kw.keyword)}&nso=so%3Add%2Cp%3Aall`,
  }));

  return NextResponse.json({
    blogId,
    results,
    searchUrls,
  });
}
