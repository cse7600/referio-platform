import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    const { event, metadata } = await req.json()
    const userAgent = req.headers.get('user-agent') || null

    const supabase = createServiceClient()
    await supabase.from('password_reset_logs').insert({
      event,
      user_agent: userAgent,
      metadata: metadata || null,
    })
  } catch {
    // 로그 실패는 조용히 무시 — UX에 영향 없어야 함
  }

  return NextResponse.json({ ok: true })
}
