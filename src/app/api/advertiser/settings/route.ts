import { NextRequest, NextResponse } from 'next/server'
import { getAdvertiserSession } from '@/lib/auth'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from('advertisers')
      .select('company_name, contact_email, contact_phone, primary_color, program_name, program_description, default_lead_commission, default_contract_commission, is_public, category, homepage_url, landing_url, activity_guide, content_sources, prohibited_activities, precautions, partner_signup_enabled, signup_welcome_title, signup_welcome_message, signup_bg_image_url')
      .eq('advertiser_id', session.advertiserId)
      .single()

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
    }

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error('Settings GET error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getAdvertiserSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    const admin = createAdminClient()
    const { error } = await admin
      .from('advertisers')
      .update(body)
      .eq('advertiser_id', session.advertiserId)

    if (error) {
      console.error('Settings PATCH error:', error)
      return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Settings PATCH error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
