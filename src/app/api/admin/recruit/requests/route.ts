import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifyAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const masterEmail = process.env.MASTER_ADMIN_EMAIL
  if (!masterEmail || user.email !== masterEmail) return null
  return { user, supabase }
}

export async function GET() {
  try {
    const auth = await verifyAdmin()
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })

    const { data: requests, error } = await auth.supabase
      .from('advertiser_requests')
      .select(`
        id, brand_name, brand_url, description, requested_by, status, admin_note, created_at,
        partners!requested_by(name, email)
      `)
      .order('created_at', { ascending: false })

    if (error) return NextResponse.json({ error: '조회에 실패했습니다' }, { status: 500 })

    const ids = (requests || []).map(r => r.id)
    let voteCounts: Record<string, number> = {}

    if (ids.length > 0) {
      const { data: votes } = await auth.supabase
        .from('advertiser_request_votes')
        .select('request_id')
        .in('request_id', ids)

      for (const v of votes || []) {
        voteCounts[v.request_id] = (voteCounts[v.request_id] || 0) + 1
      }
    }

    const result = (requests || []).map(r => {
      const partnerInfo = r.partners as unknown as { name: string; email: string } | null
      return {
        id: r.id,
        brand_name: r.brand_name,
        brand_url: r.brand_url,
        description: r.description,
        requested_by: r.requested_by,
        requester_name: partnerInfo?.name || '',
        requester_email: partnerInfo?.email || '',
        status: r.status,
        admin_note: r.admin_note,
        created_at: r.created_at,
        vote_count: voteCounts[r.id] || 0,
      }
    })

    return NextResponse.json({ requests: result })
  } catch (error) {
    console.error('admin requests GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
