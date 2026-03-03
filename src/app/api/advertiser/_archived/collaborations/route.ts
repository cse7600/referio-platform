import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdvertiserSession } from '@/lib/auth'
import { checkFeatureAccess } from '@/lib/plan-limits'

// GET: 광고주의 협업 목록
export async function GET(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('content_collaborations')
      .select('*, partners(name)')
      .eq('advertiser_id', session.advertiserUuid)
      .order('created_at', { ascending: false })

    if (status) {
      query = query.eq('status', status)
    }

    const { data, error } = await query

    if (error) {
      console.error('Collaborations GET error:', error)
      return NextResponse.json({ error: '협업 목록 조회 실패' }, { status: 500 })
    }

    return NextResponse.json({ collaborations: data || [] })
  } catch (error) {
    console.error('Collaborations GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 새 협업 제안
export async function POST(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const supabase = await createClient()

    // 플랜 체크: branded_content 기능 필요 (Growth 이상)
    const hasAccess = await checkFeatureAccess(supabase, session.advertiserUuid, 'branded_content')
    if (!hasAccess) {
      return NextResponse.json(
        { error: '브랜디드 콘텐츠 기능은 Growth 이상 플랜에서 사용 가능합니다.', upgrade: true },
        { status: 403 }
      )
    }

    const { partner_id, title, brief, content_type, budget, deadline } = await request.json()

    if (!partner_id || !title || !brief || !budget) {
      return NextResponse.json({ error: '필수 항목을 입력해주세요' }, { status: 400 })
    }

    if (budget <= 0) {
      return NextResponse.json({ error: '예산은 0보다 커야 합니다' }, { status: 400 })
    }

    // 크레딧 체크
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('credit_balance')
      .eq('id', session.advertiserUuid)
      .single()

    const balance = Number(advertiser?.credit_balance) || 0
    if (balance < budget) {
      return NextResponse.json(
        { error: `크레딧이 부족합니다. 필요: ₩${Number(budget).toLocaleString()}, 보유: ₩${balance.toLocaleString()}` },
        { status: 400 }
      )
    }

    // 협업 생성
    const { data: collab, error: collabError } = await supabase
      .from('content_collaborations')
      .insert({
        advertiser_id: session.advertiserUuid,
        partner_id,
        title,
        brief,
        content_type: content_type || 'blog',
        budget,
        deadline: deadline || null,
      })
      .select()
      .single()

    if (collabError) {
      console.error('Collaboration create error:', collabError)
      return NextResponse.json({ error: '협업 생성에 실패했습니다' }, { status: 500 })
    }

    // 크레딧 예치 (hold)
    const newBalance = balance - budget
    await supabase
      .from('advertisers')
      .update({ credit_balance: newBalance })
      .eq('id', session.advertiserUuid)

    await supabase.from('credit_transactions').insert({
      advertiser_id: session.advertiserUuid,
      type: 'deduct',
      amount: -budget,
      balance_after: newBalance,
      description: `콘텐츠 협업 예치: ${title}`,
      created_by: 'system',
    })

    return NextResponse.json({ success: true, collaboration: collab }, { status: 201 })
  } catch (error) {
    console.error('Collaboration POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}
