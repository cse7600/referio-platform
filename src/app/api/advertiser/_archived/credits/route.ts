import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAdvertiserSession } from '@/lib/auth'

// GET: 크레딧 잔액 + 거래 내역
export async function GET() {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: '인증이 필요합니다' }, { status: 401 })
    }

    const supabase = await createClient()

    // 잔액
    const { data: advertiser } = await supabase
      .from('advertisers')
      .select('credit_balance')
      .eq('id', session.advertiserUuid)
      .single()

    // 거래 내역 (최근 50건)
    const { data: transactions } = await supabase
      .from('credit_transactions')
      .select('*')
      .eq('advertiser_id', session.advertiserUuid)
      .order('created_at', { ascending: false })
      .limit(50)

    return NextResponse.json({
      balance: advertiser?.credit_balance || 0,
      transactions: transactions || [],
    })
  } catch (error) {
    console.error('Credits GET error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

// POST: 크레딧 충전 (관리자 전용 - service role key 또는 admin 토큰)
export async function POST(request: NextRequest) {
  try {
    const adminKey = request.headers.get('x-admin-key')

    const expectedKey = process.env.ADMIN_SECRET_KEY || 'keeper-admin-secret'
    if (adminKey && adminKey === expectedKey) {
      const supabase = await createClient()
      // 관리자 API로 충전
      const { advertiser_id, amount, description } = await request.json()
      if (!advertiser_id || !amount) {
        return NextResponse.json({ error: 'advertiser_id와 amount가 필요합니다' }, { status: 400 })
      }

      return await chargeCredits(supabase, advertiser_id, amount, description || '관리자 충전', 'admin')
    }

    // 광고주 본인 충전 요청 (향후 PG 연동 시 사용)
    return NextResponse.json({ error: '현재 관리자를 통한 충전만 지원됩니다' }, { status: 400 })
  } catch (error) {
    console.error('Credits POST error:', error)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

async function chargeCredits(
  supabase: Awaited<ReturnType<typeof createClient>>,
  advertiserId: string,
  amount: number,
  description: string,
  createdBy: string,
) {
  // 현재 잔액 조회
  const { data: advertiser } = await supabase
    .from('advertisers')
    .select('credit_balance')
    .eq('id', advertiserId)
    .single()

  if (!advertiser) {
    return NextResponse.json({ error: '광고주를 찾을 수 없습니다' }, { status: 404 })
  }

  const currentBalance = Number(advertiser.credit_balance) || 0
  const newBalance = currentBalance + amount

  if (newBalance < 0) {
    return NextResponse.json({ error: '잔액이 부족합니다' }, { status: 400 })
  }

  // 잔액 업데이트
  const { error: updateError } = await supabase
    .from('advertisers')
    .update({ credit_balance: newBalance })
    .eq('id', advertiserId)

  if (updateError) {
    return NextResponse.json({ error: '잔액 업데이트 실패' }, { status: 500 })
  }

  // 거래 기록
  const { error: txError } = await supabase
    .from('credit_transactions')
    .insert({
      advertiser_id: advertiserId,
      type: amount > 0 ? 'charge' : 'deduct',
      amount,
      balance_after: newBalance,
      description,
      created_by: createdBy,
    })

  if (txError) {
    console.error('Transaction record error:', txError)
  }

  return NextResponse.json({
    success: true,
    balance: newBalance,
    transaction: { type: amount > 0 ? 'charge' : 'deduct', amount, balance_after: newBalance },
  })
}
