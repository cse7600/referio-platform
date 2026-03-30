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
import { Image, Film, Youtube, Trash2, Upload, Plus, Copy, Check, ExternalLink, Zap, RefreshCw, ChevronDown, AlertCircle, Loader2, Users } from 'lucide-react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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
  const [landingUrl, setLandingUrl] = useState('')
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

  // 파트너 모집 설정
  const [partnerSignupEnabled, setPartnerSignupEnabled] = useState(false)
  const [signupWelcomeTitle, setSignupWelcomeTitle] = useState('')
  const [signupWelcomeMessage, setSignupWelcomeMessage] = useState('')
  const [copiedSignupLink, setCopiedSignupLink] = useState(false)

  // Airtable 연동
  interface AirtableField { id: string; name: string; type: string }
  interface AirtableTable { id: string; name: string; fields: AirtableField[] }
  interface AirtableIntegration {
    id: string
    name: string
    api_key: string
    api_secret: string | null
    is_active: boolean
    config: {
      airtable?: {
        pat?: string
        base_id?: string
        table_id?: string
        last_synced_at?: string | null
        name_field: string
        phone_field: string
        ref_code_field: string
        status_field: string
        valid_values: string[]
        contract_values: string[]
        invalid_values: string[]
        contract_date_field?: string
        utm_source_field?: string
      }
    }
  }
  const [airtableIntegration, setAirtableIntegration] = useState<AirtableIntegration | null>(null)

  // Easy connect state
  const [airtableBaseUrl, setAirtableBaseUrl] = useState('')
  const [airtablePat, setAirtablePat] = useState('')
  const [airtableTables, setAirtableTables] = useState<AirtableTable[]>([])
  const [airtableSelectedTable, setAirtableSelectedTable] = useState('')
  const [airtableSchemaLoading, setAirtableSchemaLoading] = useState(false)
  const [airtableSchemaError, setAirtableSchemaError] = useState('')
  const [airtableConnecting, setAirtableConnecting] = useState(false)
  const [airtableSyncing, setAirtableSyncing] = useState(false)
  const [airtableEditMode, setAirtableEditMode] = useState(false)
  const [airtableShowAdvanced, setAirtableShowAdvanced] = useState(false)

  // Field mapping state
  const [airtableNameField, setAirtableNameField] = useState('이름')
  const [airtablePhoneField, setAirtablePhoneField] = useState('전화번호')
  const [airtableRefCodeField, setAirtableRefCodeField] = useState('추천코드')
  const [airtableStatusField, setAirtableStatusField] = useState('영업상태')
  const [airtableUtmSourceField, setAirtableUtmSourceField] = useState('UTM 소스')
  const [airtableValidValues, setAirtableValidValues] = useState('유효')
  const [airtableContractValues, setAirtableContractValues] = useState('계약완료')
  const [airtableInvalidValues, setAirtableInvalidValues] = useState('무효')

  // Legacy manual webhook state
  const [savingAirtable, setSavingAirtable] = useState(false)
  const [creatingIntegration, setCreatingIntegration] = useState(false)
  const [copiedLink, setCopiedLink] = useState(false)
  const [copiedScript, setCopiedScript] = useState(false)
  const [copiedRefScript, setCopiedRefScript] = useState(false)
  const [airtableStep, setAirtableStep] = useState(1)

  useEffect(() => {
    fetchAdvertiserInfo()
    fetchMedia()
    fetchAirtableIntegration()
  }, [])

  const fetchAirtableIntegration = async () => {
    try {
      const res = await fetch('/api/advertiser/integrations/airtable/connect')
      if (!res.ok) return
      const { integration } = await res.json()

      if (integration) {
        setAirtableIntegration(integration)
        const cfg = integration.config?.airtable
        if (cfg) {
          setAirtableNameField(cfg.name_field || '이름')
          setAirtablePhoneField(cfg.phone_field || '전화번호')
          setAirtableRefCodeField(cfg.ref_code_field || '추천코드')
          setAirtableStatusField(cfg.status_field || '영업상태')
          setAirtableUtmSourceField(cfg.utm_source_field || 'UTM 소스')
          setAirtableValidValues((cfg.valid_values || ['유효']).join(', '))
          setAirtableContractValues((cfg.contract_values || ['계약']).join(', '))
          setAirtableInvalidValues((cfg.invalid_values || ['무효']).join(', '))
        }
      }
    } catch { /* ignore */ }
  }

  // Extract Airtable base ID from URL like https://airtable.com/appXXX/tblXXX/...
  const extractBaseId = (url: string): string => {
    const match = url.match(/app[A-Za-z0-9]+/)
    return match ? match[0] : url.trim()
  }

  const fetchAirtableSchema = async () => {
    const baseId = extractBaseId(airtableBaseUrl)
    if (!baseId || !airtablePat) {
      setAirtableSchemaError('Airtable URL과 API 토큰을 입력하세요')
      return
    }
    setAirtableSchemaLoading(true)
    setAirtableSchemaError('')
    setAirtableTables([])
    try {
      const res = await fetch(`/api/advertiser/integrations/airtable/schema?pat=${encodeURIComponent(airtablePat)}&base_id=${baseId}`)
      const data = await res.json()
      if (!res.ok) {
        setAirtableSchemaError(data.error || '테이블 불러오기 실패')
        return
      }
      setAirtableTables(data.tables || [])
      if (data.tables?.length === 1) {
        setAirtableSelectedTable(data.tables[0].id)
      }
    } catch {
      setAirtableSchemaError('서버 오류가 발생했습니다')
    } finally {
      setAirtableSchemaLoading(false)
    }
  }

  const handleEasyConnect = async () => {
    const baseId = extractBaseId(airtableBaseUrl)
    if (!airtableSelectedTable) {
      toast.error('테이블을 선택하세요')
      return
    }
    setAirtableConnecting(true)
    try {
      const res = await fetch('/api/advertiser/integrations/airtable/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pat: airtablePat,
          base_id: baseId,
          table_id: airtableSelectedTable,
          field_config: {
            name_field: airtableNameField,
            phone_field: airtablePhoneField,
            ref_code_field: airtableRefCodeField,
            status_field: airtableStatusField,
            utm_source_field: airtableUtmSourceField || undefined,
            valid_values: airtableValidValues.split(',').map(s => s.trim()).filter(Boolean),
            contract_values: airtableContractValues.split(',').map(s => s.trim()).filter(Boolean),
            invalid_values: airtableInvalidValues.split(',').map(s => s.trim()).filter(Boolean),
          },
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || '연결 실패')
        return
      }
      toast.success('Airtable 자동 동기화가 시작됩니다!')
      fetchAirtableIntegration()
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setAirtableConnecting(false)
    }
  }

  const handleSyncNow = async () => {
    setAirtableSyncing(true)
    try {
      const res = await fetch('/api/advertiser/integrations/airtable/sync', { method: 'POST' })
      const data = await res.json()
      console.log('[Airtable Sync]', JSON.stringify(data, null, 2))
      if (!res.ok) {
        toast.error(data.error || '동기화 실패')
        return
      }
      const inserted = data.inserted ?? 0
      const updated = data.updated ?? 0
      const skipped = data.skipped ?? 0
      const errors = data.errors ?? 0
      toast.success(`동기화 완료 — 신규 ${inserted}건 / 업데이트 ${updated}건 / 스킵 ${skipped}건${errors > 0 ? ` / 오류 ${errors}건` : ''}`)
      if (skipped > 0 && data.debug?.details) {
        const firstSkip = data.debug.details.find((d: { action: string; reason?: string }) => d.action === 'skipped')
        if (firstSkip) console.warn('[Airtable Sync] 스킵 이유:', firstSkip.reason)
      }
      fetchAirtableIntegration()
    } catch (err) {
      console.error('[Airtable Sync] 오류:', err)
      toast.error('동기화 중 오류가 발생했습니다')
    } finally {
      setAirtableSyncing(false)
    }
  }

  const handleDisconnectAirtable = async () => {
    if (!airtableIntegration) return
    await fetch('/api/advertiser/integrations/airtable/connect', { method: 'DELETE' })
    toast.success('연동이 해제됐습니다')
    setAirtableIntegration(null)
  }

  const getSelectedTableFields = (): AirtableField[] => {
    const table = airtableTables.find(t => t.id === airtableSelectedTable)
    return table?.fields || []
  }

  const handleAirtableSave = async (): Promise<boolean> => {
    if (!airtableIntegration) return false
    setSavingAirtable(true)
    try {
      const existingCfg = airtableIntegration.config.airtable || {}
      const res = await fetch('/api/advertiser/integrations/airtable/connect', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: airtableIntegration.id,
          config: {
            airtable: {
              ...existingCfg,
              name_field: airtableNameField,
              phone_field: airtablePhoneField,
              ref_code_field: airtableRefCodeField,
              status_field: airtableStatusField,
              valid_values: airtableValidValues.split(',').map(s => s.trim()).filter(Boolean),
              contract_values: airtableContractValues.split(',').map(s => s.trim()).filter(Boolean),
              invalid_values: airtableInvalidValues.split(',').map(s => s.trim()).filter(Boolean),
            },
          },
        }),
      })

      if (!res.ok) {
        toast.error('Airtable 설정 저장에 실패했습니다')
        return false
      } else {
        toast.success('필드 설정이 저장됐습니다')
        setAirtableEditMode(false)
        fetchAirtableIntegration()
        return true
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
      return false
    } finally {
      setSavingAirtable(false)
    }
  }

  const handleCreateIntegration = async () => {
    setCreatingIntegration(true)
    try {
      const res = await fetch('/api/advertiser/integrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: 'airtable' }),
      })
      if (res.ok) {
        toast.success('Airtable 연동이 활성화되었습니다')
        fetchAirtableIntegration()
      } else {
        const data = await res.json()
        toast.error(data.error || '연동 생성에 실패했습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setCreatingIntegration(false)
    }
  }

  const getRefCaptureScript = () => {
    const refFieldName = airtableRefCodeField || '추천코드'
    const utmFieldName = airtableUtmSourceField || 'UTM 소스'
    return `<!-- Referio 추천코드 + UTM 자동 캡처 스크립트 -->
<!-- 이 코드를 광고주 웹사이트의 <head> 또는 폼 페이지 하단에 삽입하세요 -->
<script>
(function() {
  var params = new URLSearchParams(window.location.search);
  var ref = params.get('ref');
  var utm = params.get('utm_source');

  // 30일간 저장 (다른 페이지로 이동해도 유지)
  if (ref) {
    localStorage.setItem('referio_ref', ref);
    localStorage.setItem('referio_ref_exp', Date.now() + 30 * 86400000);
  }
  if (utm) {
    localStorage.setItem('referio_utm_source', utm);
    localStorage.setItem('referio_utm_exp', Date.now() + 30 * 86400000);
  }

  // 저장된 값 불러오기
  var storedRef = localStorage.getItem('referio_ref');
  var refExp = localStorage.getItem('referio_ref_exp');
  if (storedRef && refExp && Date.now() < Number(refExp)) ref = ref || storedRef;

  var storedUtm = localStorage.getItem('referio_utm_source');
  var utmExp = localStorage.getItem('referio_utm_exp');
  if (storedUtm && utmExp && Date.now() < Number(utmExp)) utm = utm || storedUtm;

  // 폼 필드에 자동 입력
  function fill() {
    var refFields = document.querySelectorAll(
      'input[name="${refFieldName}"], input[data-referio="ref"], [placeholder*="추천코드"]'
    );
    refFields.forEach(function(el) { if (ref) el.value = ref; });

    var utmFields = document.querySelectorAll(
      'input[name="${utmFieldName}"], input[data-referio="utm_source"]'
    );
    utmFields.forEach(function(el) { if (utm) el.value = utm; });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fill);
  } else { fill(); }
})();
</script>`
  }

  const getAirtableScript = (apiKey: string, apiSecret: string | null) => {
    const fields = {
      name: airtableNameField || '이름',
      phone: airtablePhoneField || '전화번호',
      refCode: airtableRefCodeField || '추천코드',
      status: airtableStatusField || '영업상태',
      utmSource: airtableUtmSourceField || 'UTM 소스',
    }
    const secretLine = apiSecret ? `\nconst API_SECRET = '${apiSecret}';` : ''
    const hmacBlock = apiSecret ? `
// INT-03: HMAC-SHA256 서명 생성
async function sign(secret, timestamp, body) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  const buf = await crypto.subtle.sign('HMAC', key, enc.encode(timestamp + '.' + body));
  return 'sha256=' + Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const timestamp = String(Math.floor(Date.now() / 1000));
const bodyStr = JSON.stringify(payload);
const signature = await sign(API_SECRET, timestamp, bodyStr);

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
  'X-Timestamp': timestamp,
  'X-Signature': signature,
};` : `
const timestamp = String(Math.floor(Date.now() / 1000));
const bodyStr = JSON.stringify(payload);

const headers = {
  'Content-Type': 'application/json',
  'X-API-Key': API_KEY,
  'X-Timestamp': timestamp,
};`

    return `// Referio 연동 스크립트 (Airtable Automation > Run a script)
// Input variables: record (현재 레코드)
const record = input.config();
const fields = record.fields || {};
const API_KEY = '${apiKey}';${secretLine}

const payload = {
  record_id: record.id,
  fields: {
    '${fields.name}': fields['${fields.name}'],
    '${fields.phone}': fields['${fields.phone}'],
    '${fields.refCode}': fields['${fields.refCode}'],
    '${fields.status}': fields['${fields.status}'],
    '${fields.utmSource}': fields['${fields.utmSource}'] || null,
  }
};
${hmacBlock}

const response = await fetch('https://referio.kr/api/webhook/airtable', {
  method: 'POST',
  headers,
  body: bodyStr,
});

const result = await response.json();
console.log('Referio 응답:', JSON.stringify(result));`
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
      const [meRes, settingsRes] = await Promise.all([
        fetch('/api/auth/advertiser/me'),
        fetch('/api/advertiser/settings'),
      ])

      if (meRes.ok) {
        const data = await meRes.json()
        setAdvertiser(data.advertiser)
      }

      if (settingsRes.ok) {
        const { settings: adv } = await settingsRes.json()
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
          setLandingUrl(adv.landing_url || '')
          setActivityGuide(adv.activity_guide || '')
          setContentSources(adv.content_sources || '')
          setProhibitedActivities(adv.prohibited_activities || '')
          setPrecautions(adv.precautions || '')
          setPartnerSignupEnabled(adv.partner_signup_enabled || false)
          setSignupWelcomeTitle(adv.signup_welcome_title || '')
          setSignupWelcomeMessage(adv.signup_welcome_message || '')
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
      const res = await fetch('/api/advertiser/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          contact_email: contactEmail || null,
          contact_phone: contactPhone || null,
          primary_color: primaryColor,
        }),
      })

      if (!res.ok) {
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

  const handlePartnerSignupUpdate = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/advertiser/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partner_signup_enabled: partnerSignupEnabled,
          signup_welcome_title: signupWelcomeTitle || null,
          signup_welcome_message: signupWelcomeMessage || null,
        }),
      })

      if (!res.ok) {
        toast.error('설정 저장에 실패했습니다')
      } else {
        toast.success('파트너 모집 설정이 저장되었습니다')
      }
    } catch {
      toast.error('서버 오류가 발생했습니다')
    } finally {
      setSaving(false)
    }
  }

  const handleCopySignupLink = () => {
    if (!advertiser?.advertiserId) return
    const link = `${window.location.origin}/signup/${advertiser.advertiserId}`
    navigator.clipboard.writeText(link)
    setCopiedSignupLink(true)
    setTimeout(() => setCopiedSignupLink(false), 2000)
  }

  const handleProgramUpdate = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/advertiser/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          program_name: programName || null,
          program_description: programDescription || null,
          default_lead_commission: parseFloat(defaultLeadCommission) || 0,
          default_contract_commission: parseFloat(defaultContractCommission) || 0,
          is_public: isPublic,
          category: category || null,
          homepage_url: homepageUrl || null,
          landing_url: landingUrl || null,
          activity_guide: activityGuide || null,
          content_sources: contentSources || null,
          prohibited_activities: prohibitedActivities || null,
          precautions: precautions || null,
        }),
      })

      if (!res.ok) {
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
          <TabsTrigger value="partner-recruit">파트너 모집</TabsTrigger>
          <TabsTrigger value="airtable">Airtable 연동</TabsTrigger>
          <TabsTrigger value="password">비밀번호 변경</TabsTrigger>
        </TabsList>

        {/* 계정 정보 탭 */}
        <TabsContent value="account" className="space-y-6">
          {/* 문의 폼 링크 */}
          {advertiser?.id && (
            <Card className="border-indigo-200 bg-indigo-50">
              <CardHeader>
                <CardTitle className="text-base text-indigo-900">내 문의 폼 링크</CardTitle>
                <CardDescription className="text-indigo-700">
                  파트너가 고객에게 공유하는 링크입니다. 파트너에게 이 링크를 기반으로 추천 링크를 생성하도록 안내하세요.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex gap-2">
                  <Input
                    value={`${typeof window !== 'undefined' ? window.location.origin : 'https://referio.kr'}/inquiry/${advertiser.id}`}
                    readOnly
                    className="bg-white text-sm font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => {
                      const url = `${window.location.origin}/inquiry/${advertiser.id}`
                      navigator.clipboard.writeText(url)
                      setCopiedLink(true)
                      setTimeout(() => setCopiedLink(false), 2000)
                    }}
                  >
                    {copiedLink ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="shrink-0"
                    onClick={() => window.open(`/inquiry/${advertiser.id}`, '_blank')}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-indigo-600">
                  파트너는 이 링크에 <code className="bg-indigo-100 px-1 py-0.5 rounded">?ref=추천코드</code>를 붙여서 고객에게 공유합니다.
                </p>
              </CardContent>
            </Card>
          )}

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

              <div className="space-y-2 md:col-span-2">
                <Label>추천 랜딩 URL</Label>
                <Input
                  value={landingUrl}
                  onChange={(e) => setLandingUrl(e.target.value)}
                  placeholder="https://www.example.com/landing"
                />
                <p className="text-xs text-slate-500">
                  파트너의 추천 링크가 이 URL로 생성됩니다. 비워두면 기본 문의 페이지가 사용됩니다.
                </p>
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

              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
                수수료 단가는 <a href="/advertiser/campaigns" className="text-indigo-600 font-medium underline underline-offset-2">캠페인 설정</a>에서 관리합니다.
              </div>

              {/* 파트너 가이드 섹션 */}
              <div className="border-t pt-6 mt-2">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-base mb-0.5">파트너 가이드</h3>
                    <p className="text-sm text-slate-500">
                      파트너 상세 페이지에 표시되는 활동 안내입니다. 숫자(1. 2. 3.)로 시작하면 단계별로, 하이픈(- )으로 시작하면 목록으로 보여집니다.
                    </p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* 활동 가이드 */}
                  <div className="rounded-lg border border-blue-100 bg-blue-50/40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-blue-100">
                      <div>
                        <p className="text-sm font-semibold text-blue-800">📋 활동 가이드</p>
                        <p className="text-xs text-blue-600 mt-0.5">파트너가 어떻게 수익을 낼 수 있는지 단계별로 안내해주세요</p>
                      </div>
                      {!activityGuide && (
                        <button
                          type="button"
                          onClick={() => setActivityGuide('1. 블로그, SNS 등에 제품/서비스를 소개해주세요.\n2. 추천 링크를 통해 상담 신청이 들어오면 유효 DB로 인정됩니다.\n3. 실제 계약이 체결되면 계약 커미션이 추가로 지급됩니다.')}
                          className="shrink-0 text-xs text-blue-600 border border-blue-200 bg-white hover:bg-blue-50 rounded-md px-2.5 py-1.5 transition-colors"
                        >
                          템플릿 불러오기
                        </button>
                      )}
                    </div>
                    <div className="p-3">
                      <Textarea
                        value={activityGuide}
                        onChange={(e) => setActivityGuide(e.target.value)}
                        placeholder={'1. 블로그, SNS 등에 제품/서비스를 소개해주세요.\n2. 추천 링크를 통한 상담 신청이 유효 DB로 인정됩니다.\n3. 실제 계약 체결 시 계약 커미션이 추가 지급됩니다.'}
                        rows={5}
                        className="bg-white text-sm"
                      />
                    </div>
                  </div>

                  {/* 콘텐츠 소스 */}
                  <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-indigo-100">
                      <div>
                        <p className="text-sm font-semibold text-indigo-800">🗂️ 콘텐츠 소스</p>
                        <p className="text-xs text-indigo-600 mt-0.5">파트너가 활동에 쓸 수 있는 이미지, 영상, 문서 링크를 제공해주세요</p>
                      </div>
                      {!contentSources && (
                        <button
                          type="button"
                          onClick={() => setContentSources('- 공식 브로슈어: https://\n- 제품 이미지 모음: https://\n- 홍보 영상 링크: https://')}
                          className="shrink-0 text-xs text-indigo-600 border border-indigo-200 bg-white hover:bg-indigo-50 rounded-md px-2.5 py-1.5 transition-colors"
                        >
                          템플릿 불러오기
                        </button>
                      )}
                    </div>
                    <div className="p-3">
                      <Textarea
                        value={contentSources}
                        onChange={(e) => setContentSources(e.target.value)}
                        placeholder={'- 공식 브로슈어: https://...\n- 제품 이미지 모음: https://...\n- 홍보 영상 소스 제공'}
                        rows={4}
                        className="bg-white text-sm"
                      />
                    </div>
                  </div>

                  {/* 금지 활동 */}
                  <div className="rounded-lg border border-red-100 bg-red-50/40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-red-100">
                      <div>
                        <p className="text-sm font-semibold text-red-800">🚫 금지 활동</p>
                        <p className="text-xs text-red-600 mt-0.5">파트너십 해지 사유가 될 수 있는 행위를 명시해주세요</p>
                      </div>
                      {!prohibitedActivities && (
                        <button
                          type="button"
                          onClick={() => setProhibitedActivities('- 허위/과장 광고 금지\n- 스팸 문자·메일 발송 금지\n- 타사 비방 금지\n- 개인정보 무단 수집 금지')}
                          className="shrink-0 text-xs text-red-600 border border-red-200 bg-white hover:bg-red-50 rounded-md px-2.5 py-1.5 transition-colors"
                        >
                          템플릿 불러오기
                        </button>
                      )}
                    </div>
                    <div className="p-3">
                      <Textarea
                        value={prohibitedActivities}
                        onChange={(e) => setProhibitedActivities(e.target.value)}
                        placeholder={'- 허위/과장 광고 금지\n- 스팸 문자/메일 발송 금지\n- 타사 비방 금지'}
                        rows={4}
                        className="bg-white text-sm"
                      />
                    </div>
                  </div>

                  {/* 유의 사항 */}
                  <div className="rounded-lg border border-amber-100 bg-amber-50/40 overflow-hidden">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-amber-100">
                      <div>
                        <p className="text-sm font-semibold text-amber-800">⚠️ 유의 사항</p>
                        <p className="text-xs text-amber-600 mt-0.5">정산 기준, 중복 처리 등 파트너가 꼭 알아야 할 사항</p>
                      </div>
                      {!precautions && (
                        <button
                          type="button"
                          onClick={() => setPrecautions('- 중복 DB는 최초 접수 건만 인정됩니다.\n- 정산은 매월 말 마감, 익월 15일 지급됩니다.\n- 허위 DB 발생 시 해당 건은 차감 처리됩니다.')}
                          className="shrink-0 text-xs text-amber-600 border border-amber-200 bg-white hover:bg-amber-50 rounded-md px-2.5 py-1.5 transition-colors"
                        >
                          템플릿 불러오기
                        </button>
                      )}
                    </div>
                    <div className="p-3">
                      <Textarea
                        value={precautions}
                        onChange={(e) => setPrecautions(e.target.value)}
                        placeholder={'- 중복 DB는 최초 접수 건만 인정됩니다.\n- 정산은 매월 말 마감, 익월 15일 지급됩니다.'}
                        rows={4}
                        className="bg-white text-sm"
                      />
                    </div>
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
              <CardTitle className="text-lg">Airtable 자동 동기화</CardTitle>
              <CardDescription>
                Airtable Base URL과 API 토큰만 입력하면 5분마다 자동으로 동기화됩니다.
                별도 설정이나 코드 작업이 필요 없습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* ── 자동 동기화 활성화됨 ── */}
              {airtableIntegration?.config?.airtable?.pat ? (
                <div className="space-y-4">
                  <div className="flex items-start justify-between p-4 bg-green-50 border border-green-200 rounded-xl">
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full bg-green-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-semibold text-green-900">자동 동기화 활성화됨</p>
                        <p className="text-sm text-green-700 mt-0.5">
                          5분마다 Airtable 변경사항이 Referio에 자동 반영됩니다
                        </p>
                        {airtableIntegration.config.airtable.last_synced_at && (
                          <p className="text-xs text-green-600 mt-1">
                            마지막 동기화: {new Date(airtableIntegration.config.airtable.last_synced_at).toLocaleString('ko-KR')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-lg space-y-2 text-sm">
                    <div className="flex gap-3">
                      <span className="text-slate-500 w-20 shrink-0">Base</span>
                      <code className="text-slate-700 font-mono">{airtableIntegration.config.airtable.base_id}</code>
                    </div>
                    <div className="flex gap-3">
                      <span className="text-slate-500 w-20 shrink-0">테이블</span>
                      <code className="text-slate-700 font-mono">{airtableIntegration.config.airtable.table_id}</code>
                    </div>
                  </div>

                  {!airtableEditMode ? (
                    <div className="flex gap-3 flex-wrap">
                      <Button
                        size="sm"
                        onClick={handleSyncNow}
                        disabled={airtableSyncing}
                        className="bg-indigo-600 hover:bg-indigo-700"
                      >
                        {airtableSyncing ? (
                          <><Loader2 className="w-4 h-4 mr-2 animate-spin" />동기화 중...</>
                        ) : (
                          <><RefreshCw className="w-4 h-4 mr-2" />지금 동기화</>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const cfg = airtableIntegration.config.airtable
                          if (cfg) {
                            setAirtableNameField(cfg.name_field || '')
                            setAirtablePhoneField(cfg.phone_field || '')
                            setAirtableRefCodeField(cfg.ref_code_field || '')
                            setAirtableStatusField(cfg.status_field || '')
                            setAirtableUtmSourceField(cfg.utm_source_field || '')
                            setAirtableValidValues((cfg.valid_values || []).join(', '))
                            setAirtableContractValues((cfg.contract_values || []).join(', '))
                            setAirtableInvalidValues((cfg.invalid_values || []).join(', '))
                          }
                          setAirtableEditMode(true)
                        }}
                      >
                        필드 설정 변경
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600 border-red-200 hover:bg-red-50"
                        onClick={handleDisconnectAirtable}
                      >
                        연동 해제
                      </Button>
                    </div>
                  ) : (
                    /* ── 필드 설정 편집 모드 ── */
                    <div className="space-y-4 border-t pt-4">
                      <p className="text-sm font-medium text-slate-700">필드 매핑 수정</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { label: '이름 필드', value: airtableNameField, setter: setAirtableNameField, placeholder: '피추천인이름' },
                          { label: '연락처 필드', value: airtablePhoneField, setter: setAirtablePhoneField, placeholder: '연락처' },
                          { label: '추천코드 필드', value: airtableRefCodeField, setter: setAirtableRefCodeField, placeholder: '입력한추천인코드' },
                          { label: '영업상태 필드', value: airtableStatusField, setter: setAirtableStatusField, placeholder: '계약상태' },
                          { label: 'UTM 소스 필드 (선택)', value: airtableUtmSourceField, setter: setAirtableUtmSourceField, placeholder: 'UTM 소스' },
                        ].map(({ label, value, setter, placeholder }) => (
                          <div key={label} className="space-y-1.5">
                            <Label className="text-sm">{label}</Label>
                            <Input
                              value={value}
                              onChange={(e) => setter(e.target.value)}
                              placeholder={placeholder}
                              className="font-mono text-sm"
                            />
                          </div>
                        ))}
                      </div>
                      <div className="space-y-3 border-t pt-3">
                        <p className="text-sm font-medium text-slate-700">상태 값 (쉼표로 구분)</p>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div className="space-y-1.5">
                            <Label className="text-green-700 text-xs">유효 처리</Label>
                            <Input value={airtableValidValues} onChange={(e) => setAirtableValidValues(e.target.value)} placeholder="유효" className="border-green-200" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-blue-700 text-xs">계약 완료</Label>
                            <Input value={airtableContractValues} onChange={(e) => setAirtableContractValues(e.target.value)} placeholder="계약완료" className="border-blue-200" />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-red-700 text-xs">무효 처리</Label>
                            <Input value={airtableInvalidValues} onChange={(e) => setAirtableInvalidValues(e.target.value)} placeholder="무효, 중복" className="border-red-200" />
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <Button
                          size="sm"
                          onClick={handleAirtableSave}
                          disabled={savingAirtable}
                          className="bg-indigo-600 hover:bg-indigo-700"
                        >
                          {savingAirtable ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />저장 중...</> : '저장'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setAirtableEditMode(false)}
                        >
                          취소
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── 새 연결 폼 ── */
                <div className="space-y-6">
                  {/* Step 1: URL + PAT */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>
                        Airtable Base URL
                        <span className="text-slate-400 font-normal ml-2 text-xs">
                          (브라우저 주소창에서 복사)
                        </span>
                      </Label>
                      <Input
                        value={airtableBaseUrl}
                        onChange={(e) => setAirtableBaseUrl(e.target.value)}
                        placeholder="https://airtable.com/appBndWqdWkp8GVvq/tbl..."
                        className="font-mono text-sm"
                      />
                      {airtableBaseUrl && (
                        <p className="text-xs text-slate-500">
                          Base ID: <code className="bg-slate-100 px-1 py-0.5 rounded">{airtableBaseUrl.match(/app[A-Za-z0-9]+/)?.[0] || '인식 중...'}</code>
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>
                        Airtable API 토큰
                        <a
                          href="https://airtable.com/create/tokens"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-xs text-indigo-600 hover:underline"
                        >
                          토큰 만들기 →
                        </a>
                      </Label>
                      <Input
                        type="password"
                        value={airtablePat}
                        onChange={(e) => setAirtablePat(e.target.value)}
                        placeholder="pat_xxxxxxxxxxxxxxxx..."
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-slate-500">
                        airtable.com → 계정 아이콘 → Developer Hub → Personal access tokens → Create token
                        <br />
                        권한: <code className="bg-slate-100 px-1 rounded">data.records:read</code> + <code className="bg-slate-100 px-1 rounded">schema.bases:read</code>
                      </p>
                    </div>

                    <Button
                      onClick={fetchAirtableSchema}
                      disabled={airtableSchemaLoading || !airtableBaseUrl || !airtablePat}
                      className="w-full bg-indigo-600 hover:bg-indigo-700"
                    >
                      {airtableSchemaLoading ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />테이블 불러오는 중...</>
                      ) : (
                        <><RefreshCw className="w-4 h-4 mr-2" />테이블 목록 불러오기</>
                      )}
                    </Button>

                    {airtableSchemaError && (
                      <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        {airtableSchemaError}
                      </div>
                    )}
                  </div>

                  {/* Step 2: 테이블 + 필드 선택 (테이블 로드 후 표시) */}
                  {airtableTables.length > 0 && (
                    <div className="space-y-5 border-t pt-5">
                      <h3 className="font-semibold text-slate-800">테이블 및 필드 선택</h3>

                      <div className="space-y-2">
                        <Label>연결할 테이블</Label>
                        <Select value={airtableSelectedTable} onValueChange={setAirtableSelectedTable}>
                          <SelectTrigger>
                            <SelectValue placeholder="테이블 선택..." />
                          </SelectTrigger>
                          <SelectContent>
                            {airtableTables.map(t => (
                              <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {airtableSelectedTable && getSelectedTableFields().length > 0 && (
                        <div className="space-y-4">
                          <p className="text-sm text-slate-600">
                            각 필드가 Airtable의 어떤 컬럼인지 선택하세요
                          </p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { label: '이름 필드', value: airtableNameField, setter: setAirtableNameField, placeholder: '이름' },
                              { label: '연락처 필드', value: airtablePhoneField, setter: setAirtablePhoneField, placeholder: '전화번호' },
                              { label: '추천코드 필드', value: airtableRefCodeField, setter: setAirtableRefCodeField, placeholder: '추천코드' },
                              { label: '영업상태 필드', value: airtableStatusField, setter: setAirtableStatusField, placeholder: '영업상태' },
                              { label: 'UTM 소스 필드 (선택)', value: airtableUtmSourceField, setter: setAirtableUtmSourceField, placeholder: 'UTM 소스' },
                            ].map(({ label, value, setter, placeholder }) => (
                              <div key={label} className="space-y-2">
                                <Label className="text-sm">{label}</Label>
                                <Select
                                  value={value}
                                  onValueChange={setter}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder={placeholder} />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {getSelectedTableFields().map(f => (
                                      <SelectItem key={f.id} value={f.name}>{f.name}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            ))}
                          </div>

                          <div className="space-y-3 border-t pt-4">
                            <p className="text-sm font-medium text-slate-700">상태 값 (쉼표로 구분)</p>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="space-y-1.5">
                                <Label className="text-green-700 text-xs">유효 처리</Label>
                                <Input value={airtableValidValues} onChange={(e) => setAirtableValidValues(e.target.value)} placeholder="유효" className="border-green-200" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-blue-700 text-xs">계약 완료</Label>
                                <Input value={airtableContractValues} onChange={(e) => setAirtableContractValues(e.target.value)} placeholder="계약완료" className="border-blue-200" />
                              </div>
                              <div className="space-y-1.5">
                                <Label className="text-red-700 text-xs">무효 처리</Label>
                                <Input value={airtableInvalidValues} onChange={(e) => setAirtableInvalidValues(e.target.value)} placeholder="무효, 중복" className="border-red-200" />
                              </div>
                            </div>
                          </div>

                          <Button
                            onClick={handleEasyConnect}
                            disabled={airtableConnecting || !airtableSelectedTable}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 text-base"
                          >
                            {airtableConnecting ? (
                              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />연결 중...</>
                            ) : (
                              <><Zap className="w-4 h-4 mr-2" />자동 동기화 시작</>
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* 기존 수동 방식 (접힘) */}
                  {airtableIntegration && (
                    <div className="border-t pt-4">
                      <button
                        className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700"
                        onClick={() => setAirtableShowAdvanced(!airtableShowAdvanced)}
                      >
                        <ChevronDown className={`w-4 h-4 transition-transform ${airtableShowAdvanced ? 'rotate-180' : ''}`} />
                        기존 수동 웹훅 방식 보기
                      </button>
                    </div>
                  )}
                </div>
              )}

            </CardContent>
          </Card>
        </TabsContent>

        {/* 파트너 모집 탭 */}
        <TabsContent value="partner-recruit" className="space-y-6">
          {/* 가입 링크 */}
          <Card className="border-indigo-200 bg-indigo-50">
            <CardHeader>
              <CardTitle className="text-base text-indigo-900 flex items-center gap-2">
                <Users className="w-4 h-4" />
                전용 파트너 가입 링크
              </CardTitle>
              <CardDescription className="text-indigo-700">
                이 링크를 파트너에게 공유하면 귀사 브랜딩이 적용된 가입 페이지로 이동합니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <div className="flex-1 text-sm text-indigo-800 bg-white rounded-md px-3 py-2 border border-indigo-200 font-mono truncate">
                  {typeof window !== 'undefined' ? `${window.location.origin}/signup/${advertiser?.advertiserId}` : `/signup/${advertiser?.advertiserId}`}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 shrink-0"
                  onClick={handleCopySignupLink}
                  disabled={!partnerSignupEnabled}
                >
                  {copiedSignupLink ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copiedSignupLink ? '복사됨' : '복사'}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="border-indigo-300 text-indigo-700 hover:bg-indigo-100 shrink-0"
                  onClick={() => window.open(`/signup/${advertiser?.advertiserId}`, '_blank')}
                  disabled={!partnerSignupEnabled}
                >
                  <ExternalLink className="w-4 h-4" />
                  새 탭으로 열기
                </Button>
              </div>
              {!partnerSignupEnabled && (
                <p className="text-xs text-indigo-600 mt-2">⚠ 아래에서 파트너 모집을 활성화해야 링크가 작동합니다</p>
              )}
            </CardContent>
          </Card>

          {/* 설정 + 실시간 미리보기 */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
            {/* 좌측: 설정 폼 */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">파트너 모집 설정</CardTitle>
                <CardDescription>
                  가입 페이지 좌측 패널에 표시되는 브랜딩 정보를 설정하세요. 로고와 브랜드 색상은 &quot;브랜드 설정&quot; 탭에서 관리됩니다.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* 활성화 토글 */}
                <div className="flex items-center justify-between rounded-lg border p-4">
                  <div>
                    <p className="font-medium text-sm">파트너 모집 활성화</p>
                    <p className="text-xs text-slate-500 mt-0.5">ON으로 설정해야 가입 링크가 작동합니다</p>
                  </div>
                  <Switch
                    checked={partnerSignupEnabled}
                    onCheckedChange={setPartnerSignupEnabled}
                  />
                </div>

                {/* 환영 제목 */}
                <div className="space-y-2">
                  <Label>환영 제목</Label>
                  <Input
                    placeholder="예: 함께 성장할 파트너를 찾습니다"
                    value={signupWelcomeTitle}
                    onChange={(e) => setSignupWelcomeTitle(e.target.value)}
                  />
                  <p className="text-xs text-slate-400">비워두면 &quot;{advertiser?.companyName} 파트너가 되세요&quot;가 기본으로 표시됩니다</p>
                </div>

                {/* 환영 메시지 */}
                <div className="space-y-2">
                  <Label>환영 메시지</Label>
                  <Textarea
                    placeholder="예: 저희 파트너 프로그램에 참여하면 계약 성사 시 커미션을 받으실 수 있습니다. 지금 바로 시작하세요!"
                    value={signupWelcomeMessage}
                    onChange={(e) => setSignupWelcomeMessage(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-slate-400">커미션 정보, 혜택 등 파트너를 유치할 메시지를 자유롭게 입력하세요</p>
                </div>

                <Button onClick={handlePartnerSignupUpdate} disabled={saving}>
                  {saving ? '저장 중...' : '설정 저장'}
                </Button>
              </CardContent>
            </Card>

            {/* 우측: 실시간 미리보기 */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse inline-block" />
                실시간 미리보기
              </p>
              <div className="rounded-xl border overflow-hidden shadow-sm" style={{ minHeight: '460px' }}>
                {/* 미리보기: 브랜딩 패널 */}
                <div
                  className="h-full flex flex-col justify-between p-8"
                  style={{
                    background: `linear-gradient(135deg, ${primaryColor}ee 0%, ${primaryColor}99 100%)`,
                    minHeight: '460px',
                  }}
                >
                  {/* 로고 영역 */}
                  <div className="flex items-center gap-2">
                    {advertiser?.logoUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={advertiser.logoUrl} alt={advertiser.companyName} className="h-7 object-contain" />
                    ) : (
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/20"
                      >
                        <span className="text-white font-bold text-sm">
                          {advertiser?.companyName?.charAt(0) ?? 'B'}
                        </span>
                      </div>
                    )}
                    <span className="text-white font-semibold text-base">{advertiser?.companyName ?? '브랜드명'}</span>
                  </div>

                  {/* 환영 텍스트 */}
                  <div className="text-white">
                    <h2 className="text-2xl font-bold mb-3 leading-snug">
                      {signupWelcomeTitle || `${advertiser?.companyName ?? '브랜드'} 파트너가 되세요`}
                    </h2>
                    <p className="text-white/80 text-sm whitespace-pre-wrap leading-relaxed">
                      {signupWelcomeMessage || '환영 메시지를 입력하면 이곳에 표시됩니다.'}
                    </p>
                  </div>

                  {/* Powered by */}
                  <p className="text-white/50 text-xs">
                    Powered by <span className="text-white/70 font-medium">Referio</span>
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 text-center">실제 가입 페이지의 좌측 패널 모습입니다</p>
            </div>
          </div>
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
