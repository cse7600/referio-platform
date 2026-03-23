import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/public/advertiser?id={uuid_or_advertiser_id}
// Public endpoint — returns minimal advertiser info for inquiry page
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return NextResponse.json({ error: 'id is required' }, { status: 400 })
  }

  const admin = createAdminClient()
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)

  const query = admin
    .from('advertisers')
    .select('company_name, program_name, logo_url, primary_color, contact_phone, program_description')

  const { data, error } = await (
    isUuid ? query.eq('id', id) : query.eq('advertiser_id', id)
  ).single()

  if (error || !data) {
    return NextResponse.json({ error: 'Advertiser not found' }, { status: 404 })
  }

  return NextResponse.json({ advertiser: data })
}
