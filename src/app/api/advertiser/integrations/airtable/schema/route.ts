import { NextRequest, NextResponse } from 'next/server'

interface AirtableField {
  id: string
  name: string
  type: string
}

interface AirtableTable {
  id: string
  name: string
  fields: AirtableField[]
}

// GET /api/advertiser/integrations/airtable/schema?pat=...&base_id=...
// Fetches table list + field names from Airtable Metadata API
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const pat = searchParams.get('pat')
  const baseId = searchParams.get('base_id')

  if (!pat || !baseId) {
    return NextResponse.json({ error: 'pat와 base_id가 필요합니다' }, { status: 400 })
  }

  try {
    const res = await fetch(`https://api.airtable.com/v0/meta/bases/${baseId}/tables`, {
      headers: { Authorization: `Bearer ${pat}` },
    })

    if (res.status === 401) {
      return NextResponse.json({ error: 'API 토큰이 유효하지 않습니다' }, { status: 401 })
    }
    if (res.status === 403) {
      return NextResponse.json({ error: '이 베이스에 접근 권한이 없습니다' }, { status: 403 })
    }
    if (res.status === 404) {
      return NextResponse.json({ error: '베이스를 찾을 수 없습니다. Base ID를 확인하세요' }, { status: 404 })
    }
    if (!res.ok) {
      return NextResponse.json({ error: 'Airtable 연결에 실패했습니다' }, { status: 500 })
    }

    const data = await res.json()
    const tables = (data.tables || []).map((t: AirtableTable) => ({
      id: t.id,
      name: t.name,
      fields: (t.fields || [])
        .filter((f: AirtableField) => ['singleLineText', 'multilineText', 'phoneNumber', 'email', 'singleSelect', 'url', 'number'].includes(f.type))
        .map((f: AirtableField) => ({ id: f.id, name: f.name, type: f.type })),
    }))

    return NextResponse.json({ tables })
  } catch {
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}
