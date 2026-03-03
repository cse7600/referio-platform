'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import { Image, Film, Youtube, Trash2, Upload, Plus } from 'lucide-react'

interface AdvertiserInfo {
  id: string
  advertiserId: string
  companyName: string
  userId: string
  name: string
  role: string
  logoUrl: string | null
  primaryColor: string | null
}

export default function AdvertiserSettingsPage() {
  const [advertiser, setAdvertiser] = useState<AdvertiserInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // 비밀번호 변경
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // 브랜드 설정
  const [companyName, setCompanyName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [primaryColor, setPrimaryColor] = useState('#f97316')

  // 프로그램 설정
  const [programName, setProgramName] = useState('')
  const [programDescription, setProgramDescription] = useState('')
  const [defaultLeadCommission, setDefaultLeadCommission] = useState('')
  const [defaultContractCommission, setDefaultContractCommission] = useState('')
  const [isPublic, setIsPublic] = useState(false)
  const [category, setCategory] = useState('')
  const [homepageUrl, setHomepageUrl] = useState('')
  const [activityGuide, setActivityGuide] = useState('')
  const [contentSources, setContentSources] = useState('')
  const [prohibitedActivities, setProhibitedActivities] = useState('')
  const [precautions, setPrecautions] = useState('')

  // 미디어
  interface MediaItem { id: string; type: string; url: string; name: string; description: string | null; size_bytes: number | null }
  const [mediaList, setMediaList] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeName, setYoutubeName] = useState('')

  // Airtable 연동
  interface AirtableIntegration {
    id: string
    name: string
    api_key: string
    is_active: boolean
    config: {
      airtable?: {
        name_field: string
        phone_field: string
        ref_code_field: string
        status_field: string
        valid_values: string[]
        contract_values: string[]
        invalid_values: string[]
        sales_rep_field?: string
        contract_date_field?: string
      }
    }
  }
  const [airtableIntegration, setAirtableIntegration] = useState<AirtableIntegration | null>(null)
  const [airtableNameField, setAirtableNameField] = useState('이름')
  const [airtablePhoneField, setAirtablePhoneField] = useState('전화번호')
  const [airtableRefCodeField, setAirtableRefCodeField] = useState('추천코드')
  const [airtableStatusField, setAirtableStatusField] = useState('영업상태')
  const [airtableValidValues, setAirtableValidValues] = useState('유효')
  const [airtableContractValues, setAirtableContractValues] = useState('계약')
  const [airtableInvalidValues, setAirtableInvalidValues] = useState('무효')
  const [airtableContractDateField, setAirtableContractDateField] = useState('계약일')
  const [savingAirtable, setSavingAirtable] = useState(false)

  useEffect(() => {
    fetchAdvertiserInfo()
    fetchMedia()
    fetchAirtableIntegration()
  }, [])

  const fetchAirtableIntegration = async () => {
    try {
      const supabase = createClient()
      const meRes = await fetch('/api/auth/advertiser/me')
      if (!meRes.ok) return
      const meData = await meRes.json()

      const { data: adv } = await supabase
        .from('advertisers')
        .select('id')
        .eq('advertiser_id', meData.advertiser.advertiserId)
        .single()

      if (!adv) return

      const { data } = await supabase
        .from('webhook_integrations')
        .select('id, name, api_key, is_active, config')
        .eq('advertiser_id', adv.id)
        .eq('source', 'airtable')
        .single()

      if (data) {
        setAirtableIntegration(data)
        const cfg = data.config?.airtable
        if (cfg) {
          setAirtableNameField(cfg.name_field || '이름')
          setAirtablePhoneField(cfg.phone_field || '전화번호')
          setAirtableRefCodeField(cfg.ref_code_field || '추천코드')
          setAirtableStatusField(cfg.status_field || '영업상태')
          setAirtableValidValues((cfg.valid_values || ['유효']).join(', '))
          setAirtableContractValues((cfg.contract_values || ['계약']).join(', '))
          setAirtableInvalidValues((cfg.invalid_values || ['무효']).join(', '))
          setAirtableContractDateField(cfg.contract_date_field || '계약일')
        }
      }
    } catch { /* ignore */ }
  }

  const handleAirtableSave = async () => {
    if (!airtableIntegration) return
    setSavingAirtable(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('webhook_integrations')
        .update({
          config: {
            airtable: {
              name_field: airtableNameField,
              phone_field: airtablePhoneField,
              ref_code_field: airtableRefCodeField,
              status_field: airtableStatusField,
              valid_values: airtableValidValues.split(',').map(s => s.trim()).filter(Boolean),
              contract_values: airtableContractValues.split(',').map(s => s.trim()).filter(Boolean),
              invalid_values: airtableInvalidValues.split(',').map(s => s.trim()).filter(Boolean),
              contract_date_field: airtableContractDateField,
            },
          },
        })
        .eq('id', airtableIntegration.id)

      if (error) {
        toast.error('Airtable 설정 저장에 실패했습니다')
      } else {
        toast.success('Airtable 설정이 저장되었습니다')
        fetchAirtableIntegration()
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setSavingAirtable(false)
    }
  }

  const fetchMedia = async () => {
    try {
      const res = await fetch('/api/advertiser/media')
      if (res.ok) {
        const data = await res.json()
        setMediaList(data.media || [])
      }
    } catch { /* ignore */ }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const isVideo = file.type.startsWith('video/')
    const maxSize = isVideo ? 50 * 1024 * 1024 : 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast.error(`파일 크기가 ${isVideo ? '50MB' : '10MB'}를 초과합니다`)
      return
    }

    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('name', file.name)

    try {
      const res = await fetch('/api/advertiser/media', { method: 'POST', body: formData })
      if (res.ok) {
        toast.success('업로드 완료')
        fetchMedia()
      } else {
        const data = await res.json()
        toast.error(data.error || '업로드 실패')
      }
    } catch { toast.error('업로드 실패') }
    setUploading(false)
    e.target.value = ''
  }

  const handleYoutubeAdd = async () => {
    if (!youtubeUrl) return
    try {
      const res = await fetch('/api/advertiser/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: youtubeUrl, name: youtubeName || '유튜브 영상' }),
      })
      if (res.ok) {
        toast.success('유튜브 링크가 등록되었습니다')
        setYoutubeUrl('')
        setYoutubeName('')
        fetchMedia()
      } else {
        const data = await res.json()
        toast.error(data.error || '등록 실패')
      }
    } catch { toast.error('등록 실패') }
  }

  const handleMediaDelete = async (mediaId: string) => {
    try {
      const res = await fetch('/api/advertiser/media', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ media_id: mediaId }),
      })
      if (res.ok) {
        toast.success('삭제되었습니다')
        setMediaList(prev => prev.filter(m => m.id !== mediaId))
      }
    } catch { toast.error('삭제 실패') }
  }

  const fetchAdvertiserInfo = async () => {
    try {
      const response = await fetch('/api/auth/advertiser/me')
      if (response.ok) {
        const data = await response.json()
        setAdvertiser(data.advertiser)

        // Supabase에서 상세 정보 가져오기
        const supabase = createClient()
        const { data: adv } = await supabase
          .from('advertisers')
          .select('company_name, contact_email, contact_phone, primary_color, program_name, program_description, default_lead_commission, default_contract_commission, is_public, category, homepage_url, activity_guide, content_sources, prohibited_activities, precautions')
          .eq('advertiser_id', data.advertiser.advertiserId)
          .single()

        if (adv) {
          setCompanyName(adv.company_name || '')
          setContactEmail(adv.contact_email || '')
          setContactPhone(adv.contact_phone || '')
          setPrimaryColor(adv.primary_color || '#f97316')
          setProgramName(adv.program_name || '')
          setProgramDescription(adv.program_description || '')
          setDefaultLeadCommission(String(adv.default_lead_commission || 0))
          setDefaultContractCommission(String(adv.default_contract_commission || 0))
          setIsPublic(adv.is_public || false)
          setCategory(adv.category || '')
          setHomepageUrl(adv.homepage_url || '')
          setActivityGuide(adv.activity_guide || '')
          setContentSources(adv.content_sources || '')
          setProhibitedActivities(adv.prohibited_activities || '')
          setPrecautions(adv.precautions || '')
        }
      }
    } catch {
      toast.error('정보를 불러오는데 실패했습니다')
    } finally {
      setLoading(false)
    }
  }

  const handlePasswordChange = async () => {
    if (!currentPassword || !newPassword) {
      toast.error('현재 비밀번호와 새 비밀번호를 입력해주세요')
      return
    }
    if (newPassword.length < 8) {
      toast.error('비밀번호는 8자 이상이어야 합니다')
      return
    }
    if (newPassword !== confirmPassword) {
      toast.error('새 비밀번호가 일치하지 않습니다')
      return
    }

    setSaving(true)
    try {
      const response = await fetch('/api/advertiser/settings/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      })

      if (response.ok) {
        toast.success('비밀번호가 변경되었습니다')
        setCurrentPassword('')
        setNewPassword('')
        setConfirmPassword('')
      } else {
        const data = await response.json()
        toast.error(data.error || '비밀번호 변경에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleBrandUpdate = async () => {
    if (!companyName.trim()) {
      toast.error('회사명은 필수입니다')
      return
    }

    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('advertisers')
        .update({
          company_name: companyName,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          primary_color: primaryColor,
        })
        .eq('advertiser_id', advertiser?.advertiserId)

      if (error) {
        toast.error('설정 저장에 실패했습니다')
      } else {
        toast.success('설정이 저장되었습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleProgramUpdate = async () => {
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('advertisers')
        .update({
          program_name: programName || null,
          program_description: programDescription || null,
          default_lead_commission: parseFloat(defaultLeadCommission) || 0,
          default_contract_commission: parseFloat(defaultContractCommission) || 0,
          is_public: isPublic,
          category: category || null,
          homepage_url: homepageUrl || null,
          activity_guide: activityGuide || null,
          content_sources: contentSources || null,
          prohibited_activities: prohibitedActivities || null,
          precautions: precautions || null,
        })
        .eq('advertiser_id', advertiser?.advertiserId)

      if (error) {
        toast.error('프로그램 설정 저장에 실패했습니다')
      } else {
        toast.success('프로그램 설정이 저장되었습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">설정</h1>
          <p className="text-slate-500 mt-1">광고주 계정 및 시스템 설정</p>
        </div>
        <Card className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/3" />
            <div className="h-10 bg-slate-200 rounded" />
            <div className="h-10 bg-slate-200 rounded" />
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">설정</h1>
        <p className="text-slate-500 mt-1">광고주 계정 및 시스템 설정</p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList>
          <TabsTrigger value="account">계정 정보</TabsTrigger>
          <TabsTrigger value="brand">브랜드 설정</TabsTrigger>
          <TabsTrigger value="program">프로그램 설정</TabsTrigger>
          <TabsTrigger value="airtable">Airtable 연동</TabsTrigger>
          <TabsTrigger value="password">비밀번호 변경</TabsTrigger>
        </TabsList>

        {/* 계정 정보 탭 */}
        <TabsContent value="account" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">계정 정보</CardTitle>
              <CardDescription>현재 로그인된 계정 정보입니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm text-slate-500">광고주 ID</Label>
                  <Input value={advertiser?.advertiserId || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-slate-500">사용자 ID</Label>
                  <Input value={advertiser?.userId || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-slate-500">이름</Label>
                  <Input value={advertiser?.name || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label className="text-sm text-slate-500">역할</Label>
                  <Input value={advertiser?.role === 'admin' ? '관리자' : advertiser?.role === 'manager' ? '매니저' : '뷰어'} disabled />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 브랜드 설정 탭 */}
        <TabsContent value="brand" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">브랜드 설정</CardTitle>
              <CardDescription>회사 정보 및 브랜드 색상을 관리합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>회사명 *</Label>
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="회사명을 입력하세요"
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>담당자 이메일</Label>
                  <Input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@company.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>담당자 전화번호</Label>
                  <Input
                    type="tel"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="02-1234-5678"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>브랜드 색상</Label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer border border-slate-200"
                  />
                  <Input
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    placeholder="#f97316"
                    className="w-32"
                  />
                </div>
              </div>
              <Button onClick={handleBrandUpdate} disabled={saving}>
                {saving ? '저장 중...' : '설정 저장'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 프로그램 설정 탭 */}
        <TabsContent value="program" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">어필리에이트 프로그램 설정</CardTitle>
              <CardDescription>
                파트너가 참가할 수 있는 어필리에이트 프로그램을 설정합니다.
                프로그램을 공개하면 파트너 마켓플레이스에 노출됩니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div>
                  <p className="font-medium">프로그램 공개</p>
                  <p className="text-sm text-slate-500">
                    공개 시 모든 파트너가 프로그램을 찾아 참가 신청할 수 있습니다
                  </p>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              {/* 기본 정보 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>프로그램 이름</Label>
                  <Input
                    value={programName}
                    onChange={(e) => setProgramName(e.target.value)}
                    placeholder="예: 리캐치 B2B 어필리에이트"
                  />
                  <p className="text-xs text-slate-500">
                    비워두면 회사명이 사용됩니다
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>업종 카테고리</Label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">선택 안함</option>
                    <option value="security">보안/CCTV</option>
                    <option value="telecom">인터넷/통신</option>
                    <option value="insurance">보험/금융</option>
                    <option value="education">교육</option>
                    <option value="beauty">뷰티/건강</option>
                    <option value="shopping">쇼핑</option>
                    <option value="realestate">부동산</option>
                    <option value="automobile">자동차</option>
                    <option value="travel">여행/숙박</option>
                    <option value="pet">반려동물</option>
                    <option value="food">식품</option>
                    <option value="electronics">가전/IT</option>
                    <option value="etc">기타</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>홈페이지 URL</Label>
                <Input
                  value={homepageUrl}
                  onChange={(e) => setHomepageUrl(e.target.value)}
                  placeholder="https://www.example.com"
                />
              </div>

              <div className="space-y-2">
                <Label>프로그램 설명</Label>
                <Textarea
                  value={programDescription}
                  onChange={(e) => setProgramDescription(e.target.value)}
                  placeholder="프로그램에 대한 간단한 소개. 마켓플레이스 카드와 상세 페이지에 노출됩니다."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>기본 유효 DB 커미션 (원)</Label>
                  <Input
                    type="number"
                    value={defaultLeadCommission}
                    onChange={(e) => setDefaultLeadCommission(e.target.value)}
                    placeholder="15000"
                    min="0"
                  />
                  <p className="text-xs text-slate-500">
                    신규 파트너에게 적용되는 기본 유효 DB 단가
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>기본 계약 커미션 (원)</Label>
                  <Input
                    type="number"
                    value={defaultContractCommission}
                    onChange={(e) => setDefaultContractCommission(e.target.value)}
                    placeholder="200000"
                    min="0"
                  />
                  <p className="text-xs text-slate-500">
                    신규 파트너에게 적용되는 기본 계약 단가
                  </p>
                </div>
              </div>

              {/* 파트너 가이드 섹션 */}
              <div className="border-t pt-6 mt-2">
                <h3 className="font-semibold text-base mb-1">파트너 가이드</h3>
                <p className="text-sm text-slate-500 mb-4">
                  프로그램 상세 페이지에서 파트너에게 보여지는 활동 안내 정보입니다
                </p>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <Label>활동 가이드</Label>
                    <Textarea
                      value={activityGuide}
                      onChange={(e) => setActivityGuide(e.target.value)}
                      placeholder={"1. 블로그, SNS 등에 제품/서비스를 소개해주세요.\n2. 추천 링크를 통한 상담 신청이 유효 DB로 인정됩니다.\n3. 실제 계약 체결 시 계약 커미션이 추가 지급됩니다."}
                      rows={5}
                    />
                    <p className="text-xs text-slate-500">
                      파트너가 어떻게 활동하면 되는지 단계별로 안내해주세요
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>콘텐츠 소스</Label>
                    <Textarea
                      value={contentSources}
                      onChange={(e) => setContentSources(e.target.value)}
                      placeholder={"- 공식 브로슈어: https://...\n- 제품 이미지 모음: https://...\n- 홍보 영상 소스 제공"}
                      rows={4}
                    />
                    <p className="text-xs text-slate-500">
                      파트너가 활동에 활용할 수 있는 이미지, 영상, 문서 등의 자료 링크
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>금지 활동</Label>
                    <Textarea
                      value={prohibitedActivities}
                      onChange={(e) => setProhibitedActivities(e.target.value)}
                      placeholder={"- 허위/과장 광고 금지\n- 스팸 문자/메일 발송 금지\n- 타사 비방 금지"}
                      rows={4}
                    />
                    <p className="text-xs text-slate-500">
                      파트너십 해지 사유가 될 수 있는 금지 활동을 명시해주세요
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>유의 사항</Label>
                    <Textarea
                      value={precautions}
                      onChange={(e) => setPrecautions(e.target.value)}
                      placeholder={"- 중복 DB는 최초 접수 건만 인정됩니다.\n- 정산은 매월 말 마감, 익월 15일 지급됩니다."}
                      rows={4}
                    />
                    <p className="text-xs text-slate-500">
                      정산 기준, 중복 처리, 기타 파트너가 알아야 할 사항
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={handleProgramUpdate} disabled={saving}>
                {saving ? '저장 중...' : '프로그램 설정 저장'}
              </Button>
            </CardContent>
          </Card>

          {/* 미디어 관리 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">미디어 관리</CardTitle>
              <CardDescription>
                파트너에게 제공할 이미지, 영상, 유튜브 링크를 관리합니다.
                이미지 최대 10MB, 영상 최대 50MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* 파일 업로드 */}
              <div>
                <Label className="mb-2 block">이미지/영상 업로드</Label>
                <label className="flex items-center justify-center gap-2 p-6 border-2 border-dashed rounded-lg cursor-pointer hover:border-slate-400 hover:bg-slate-50 transition-colors">
                  <Upload className="w-5 h-5 text-slate-400" />
                  <span className="text-sm text-slate-500">
                    {uploading ? '업로드 중...' : '클릭하여 파일 선택 (이미지/영상)'}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
                    onChange={handleFileUpload}
                    disabled={uploading}
                  />
                </label>
              </div>

              {/* 유튜브 링크 */}
              <div className="space-y-2">
                <Label>유튜브 영상 링크</Label>
                <div className="flex gap-2">
                  <Input
                    value={youtubeName}
                    onChange={(e) => setYoutubeName(e.target.value)}
                    placeholder="영상 제목 (선택)"
                    className="w-1/3"
                  />
                  <Input
                    value={youtubeUrl}
                    onChange={(e) => setYoutubeUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    onClick={handleYoutubeAdd}
                    disabled={!youtubeUrl}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    추가
                  </Button>
                </div>
              </div>

              {/* 미디어 목록 */}
              {mediaList.length > 0 && (
                <div className="space-y-2">
                  <Label>등록된 미디어 ({mediaList.length}개)</Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {mediaList.map((m) => (
                      <div key={m.id} className="flex items-center gap-3 p-3 border rounded-lg">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                          {m.type === 'image' && <Image className="w-4 h-4 text-slate-500" />}
                          {m.type === 'video' && <Film className="w-4 h-4 text-slate-500" />}
                          {m.type === 'youtube' && <Youtube className="w-4 h-4 text-red-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{m.name}</p>
                          <p className="text-xs text-slate-400">
                            {m.type === 'youtube' ? '유튜브' : m.type === 'image' ? '이미지' : '영상'}
                            {m.size_bytes && ` · ${(m.size_bytes / 1024 / 1024).toFixed(1)}MB`}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-400 hover:text-red-500"
                          onClick={() => handleMediaDelete(m.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Airtable 연동 탭 */}
        <TabsContent value="airtable" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Airtable 연동</CardTitle>
              <CardDescription>
                Airtable에서 영업 상태가 변경될 때 Referio에 자동으로 반영됩니다.
                Airtable Automations → "Fetch URL" 액션으로 설정하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {airtableIntegration ? (
                <>
                  {/* API 키 표시 */}
                  <div className="p-4 bg-slate-50 rounded-lg space-y-3">
                    <p className="text-sm font-semibold text-slate-700">Airtable Automation 설정 정보</p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-24">웹훅 URL</span>
                        <code className="flex-1 bg-white border rounded px-2 py-1 text-xs font-mono">
                          https://referio.kr/api/webhook/airtable
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-24">API 키</span>
                        <code className="flex-1 bg-white border rounded px-2 py-1 text-xs font-mono break-all">
                          {airtableIntegration.api_key}
                        </code>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-500 w-24">헤더 이름</span>
                        <code className="flex-1 bg-white border rounded px-2 py-1 text-xs font-mono">
                          X-API-Key
                        </code>
                      </div>
                    </div>
                    <p className="text-xs text-slate-400">
                      Airtable Automation에서 "Fetch URL" 액션을 추가하고, 위 URL과 헤더를 설정하세요.
                      요청 본문(JSON)에 아래 필드 매핑에 따른 레코드 데이터를 포함하면 됩니다.
                    </p>
                  </div>

                  {/* 필드 매핑 설정 */}
                  <div className="space-y-4">
                    <h3 className="font-semibold text-sm text-slate-700">Airtable 필드 이름 매핑</h3>
                    <p className="text-xs text-slate-500">Airtable에서 사용하는 필드 이름을 정확히 입력하세요</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>이름 필드</Label>
                        <Input
                          value={airtableNameField}
                          onChange={(e) => setAirtableNameField(e.target.value)}
                          placeholder="이름"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>전화번호 필드</Label>
                        <Input
                          value={airtablePhoneField}
                          onChange={(e) => setAirtablePhoneField(e.target.value)}
                          placeholder="전화번호"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>추천코드 필드</Label>
                        <Input
                          value={airtableRefCodeField}
                          onChange={(e) => setAirtableRefCodeField(e.target.value)}
                          placeholder="추천코드"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>영업상태 필드</Label>
                        <Input
                          value={airtableStatusField}
                          onChange={(e) => setAirtableStatusField(e.target.value)}
                          placeholder="영업상태"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>계약일 필드</Label>
                        <Input
                          value={airtableContractDateField}
                          onChange={(e) => setAirtableContractDateField(e.target.value)}
                          placeholder="계약일"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 border-t pt-4">
                      <h4 className="text-sm font-medium text-slate-700">영업상태 값 매핑 (쉼표로 구분)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label className="text-green-700">유효 처리 값</Label>
                          <Input
                            value={airtableValidValues}
                            onChange={(e) => setAirtableValidValues(e.target.value)}
                            placeholder="유효"
                            className="border-green-200"
                          />
                          <p className="text-xs text-slate-400">이 값이면 is_valid = true</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-blue-700">계약 처리 값</Label>
                          <Input
                            value={airtableContractValues}
                            onChange={(e) => setAirtableContractValues(e.target.value)}
                            placeholder="계약"
                            className="border-blue-200"
                          />
                          <p className="text-xs text-slate-400">이 값이면 계약 완료 처리</p>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-red-700">무효 처리 값</Label>
                          <Input
                            value={airtableInvalidValues}
                            onChange={(e) => setAirtableInvalidValues(e.target.value)}
                            placeholder="무효"
                            className="border-red-200"
                          />
                          <p className="text-xs text-slate-400">이 값이면 is_valid = false</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button onClick={handleAirtableSave} disabled={savingAirtable}>
                    {savingAirtable ? '저장 중...' : 'Airtable 설정 저장'}
                  </Button>
                </>
              ) : (
                <div className="text-center py-8 text-slate-500">
                  <p className="mb-2">Airtable 연동이 설정되지 않았습니다.</p>
                  <p className="text-sm">DB 마이그레이션을 먼저 실행해주세요.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 비밀번호 변경 탭 */}
        <TabsContent value="password" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">비밀번호 변경</CardTitle>
              <CardDescription>계정 비밀번호를 변경합니다</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>현재 비밀번호</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="현재 비밀번호 입력"
                />
              </div>
              <div className="space-y-2">
                <Label>새 비밀번호</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="새 비밀번호 입력 (8자 이상)"
                />
              </div>
              <div className="space-y-2">
                <Label>새 비밀번호 확인</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="새 비밀번호 다시 입력"
                />
              </div>
              <Button onClick={handlePasswordChange} disabled={saving}>
                {saving ? '변경 중...' : '비밀번호 변경'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
