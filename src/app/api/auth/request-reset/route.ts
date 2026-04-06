import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/service'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || typeof email !== 'string') {
      // Always return success to avoid leaking email existence
      return NextResponse.json({ success: true })
    }

    const supabase = createServiceClient()

    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email,
      options: {
        redirectTo: 'https://referio.puzl.co.kr/auth/callback?type=recovery',
      },
    })

    if (error || !data?.properties?.action_link) {
      // Silently fail — do not expose whether the email exists
      return NextResponse.json({ success: true })
    }

    const actionLink = data.properties.action_link

    await resend.emails.send({
      from: 'noreply@updates.puzl.co.kr',
      to: email,
      subject: '비밀번호 재설정 | Referio',
      html: `<div style="font-family: sans-serif; max-width: 560px; margin: 0 auto; padding: 24px;">
    <div style="text-align:center; margin-bottom:24px;">
      <span style="font-size:22px; font-weight:bold; color:#0f172a;">Referio</span>
    </div>
    <div style="background:white; border-radius:12px; padding:32px; border:1px solid #e2e8f0;">
      <h2 style="font-size:20px; font-weight:600; color:#0f172a; margin:0 0 8px;">비밀번호 재설정</h2>
      <p style="color:#64748b; margin:0 0 24px; line-height:1.6;">아래 버튼을 클릭하여 새 비밀번호를 설정하세요. 본인이 요청하지 않았다면 이 메일을 무시해 주세요.</p>
      <a href="${actionLink}" style="display:inline-block; background:#4f46e5; color:white; text-decoration:none; padding:13px 28px; border-radius:8px; font-weight:500; font-size:15px;">비밀번호 재설정하기</a>
      <p style="color:#94a3b8; font-size:13px; margin:24px 0 0;">이 링크는 24시간 후 만료됩니다.</p>
    </div>
    <p style="text-align:center; color:#94a3b8; font-size:12px; margin-top:20px;">Powered by 퍼즐코퍼레이션</p>
  </div>`,
    })

    return NextResponse.json({ success: true })
  } catch {
    // Always return success to avoid leaking information
    return NextResponse.json({ success: true })
  }
}
