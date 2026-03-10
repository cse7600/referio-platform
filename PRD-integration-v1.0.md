# Referio 데이터 연동 시스템 PRD

**문서 버전**: 1.0
**작성일**: 2026-03-10
**상태**: 설계 완료 — 구현 대기
**담당자**: Product Owner

---

## 목차

1. [배경 및 문제 정의](#1-배경-및-문제-정의)
2. [핵심 원칙: 연동 게이팅](#2-핵심-원칙-연동-게이팅)
3. [광고주 데이터 환경 분류](#3-광고주-데이터-환경-분류)
4. [연동 유형 카탈로그](#4-연동-유형-카탈로그)
5. [에어테이블 연동 상세 설계](#5-에어테이블-연동-상세-설계)
6. [보안 설계](#6-보안-설계)
7. [광고주 온보딩 UX](#7-광고주-온보딩-ux)
8. [데이터 모델](#8-데이터-모델)
9. [경쟁 분석](#9-경쟁-분석)
10. [구현 로드맵](#10-구현-로드맵)
11. [역할 분담 (Referio vs 광고주)](#11-역할-분담-referio-vs-광고주)

---

## 1. 배경 및 문제 정의

### 왜 이게 가장 중요한 미션인가

Referio의 비즈니스 모델은 단순하다.

```
파트너가 고객을 데려옴 → 계약 성사 → 파트너에게 정산
```

이 흐름이 작동하려면 한 가지가 반드시 필요하다.

> **"이 고객이 어떤 파트너가 데려온 사람인지" 를 정확하게 추적해야 한다.**

문제는 광고주마다 고객 데이터를 관리하는 방식이 전부 다르다는 것이다.

| 광고주 유형 | 사용 도구 | Referio 없이는? |
|------------|---------|----------------|
| 에어테이블로 리드 관리 | Airtable | 파트너 출처 정보 없음. 수동 엑셀 대조 |
| CRM 소프트웨어 사용 | 리캐치, 세일즈맵 | 시스템이 따로 놀아 담당자가 직접 입력 |
| 자체 개발 서버 | 내부 DB | 외부 접근 불가. 개발팀에 매번 요청 |
| 문의폼 자체 없음 | 영업팀 전화 | 파트너 기여 추적 자체가 불가 |

**결론**: 연동이 없으면 정산이 틀리고, 정산이 틀리면 파트너가 떠나고, 파트너가 떠나면 플랫폼이 작동하지 않는다.

### 실제 사례: 한화비전 키퍼

현재 운영 중인 연동 구조.

```
파트너가 추천 링크 공유
  ↓
고객이 keeper.ceo 접속 (?ref=파트너코드 포함)
  ↓
Cloudflare Worker가 문의폼 서빙
  ↓
고객이 폼 제출 → 에어테이블 '피추천인' 테이블에 저장
  ↓
에어테이블 → Referio로 추천코드 포함 데이터 전송
  ↓
영업팀이 에어테이블에서 '영업상태' 필드 변경 (유효/계약)
  ↓
에어테이블 → Referio로 상태 변경 전송
  ↓
Referio가 파트너 정산 자동 생성
```

이 구조를 Referio 플랫폼 안으로 내재화하고, 에어테이블 외 다른 환경에도 동일하게 적용하는 것이 이 PRD의 목표다.

### 장기 비전

> 카페24와 아임웹이 커머스 기업의 기술 인프라가 된 것처럼,
> Referio는 비커머스 B2B 서비스들이 파트너 채널을 운영하기 위한 **표준 연동 허브**가 된다.
> 광고주가 어떤 도구를 쓰든 Referio 하나로 파트너 채널 전체를 운영할 수 있는 환경.

---

## 2. 핵심 원칙: 연동 게이팅

### 원칙

> **데이터 연동이 완료되지 않으면 캠페인을 공개할 수 없다.**

연동 없이 파트너를 모집하면:
- 파트너가 리드를 가져와도 추적이 안 됨
- 정산 근거가 없음
- 분쟁 발생

이를 막기 위해 캠페인 공개를 연동 완료의 조건으로 건다.

### 연동 상태 5단계

```
not_configured  →  configured  →  verified  →  (운영)  →  error
     │                │               │
  설정 없음         설정 완료        테스트 이벤트
  캠페인 공개 불가   캠페인 공개 불가  수신 확인
                                    캠페인 공개 가능
```

| 상태 | 의미 | 캠페인 공개 |
|------|------|------------|
| `not_configured` | 연동 설정 없음 | 불가 |
| `configured` | 설정했으나 테스트 미완료 | 불가 |
| `verified` | 테스트 이벤트 수신 확인됨 | **가능** |
| `error` | 마지막 이벤트 처리 실패 | 불가 (경고) |
| `inactive` | 수동 비활성화 | 불가 |

### 게이팅 흐름

```
광고주가 캠페인 공개 시도
           ↓
  연동 verified 확인
  ├── 없음 → 403 차단
  │         "연동을 먼저 설정해주세요" 안내
  │         → 연동 설정 페이지로 이동
  └── 있음 → 공개 허용
```

---

## 3. 광고주 데이터 환경 분류

### 현재 클라이언트 기준 비율 (추정)

| 유형 | 비율 | 도구 |
|------|------|------|
| 에어테이블 기반 | ~60% | Airtable |
| 내부 서버/DB | ~25% | 자체 개발 API |
| SaaS CRM | ~10% | 리캐치, 세일즈맵 |
| 도구 없음 | ~5% | 없음 (영업팀 전화) |

### 두 가지 근본 시나리오

**시나리오 A: 문의폼이 있는 경우**

광고주 사이트에 이미 문의폼이 존재한다. 데이터가 에어테이블이나 CRM으로 들어오고 있다.
→ 그 데이터에 추천코드를 붙이고 Referio로 전송하는 연동 필요

**시나리오 B: 문의폼이 없는 경우**

영업팀이 콜드 아웃리치를 하거나, 파트너가 직접 고객을 소개하는 방식.
→ Referio 자체 문의폼을 쓰거나, 파트너가 리드를 직접 등록하는 방식 제공

---

## 4. 연동 유형 카탈로그

### Phase 1 (즉시 구현)

#### Type 1: Referio 자체 문의폼

광고주 사이트에 iframe 한 줄 삽입. 코드 복붙만으로 완료.

```
파트너 추천 링크 클릭 (?ref=코드)
  ↓ localStorage에 30일 보존 (ref_tracker.js)
  ↓
광고주 사이트 문의 페이지
  <iframe src="https://referio.kr/inquiry/[광고주ID]">
  ↓
폼 제출 시 ref_code 자동 포함
  ↓
POST /api/inquiry → referrals 생성
```

**광고주 설정 난이도**: ★☆☆☆☆
**검증 방식**: 자체 폼이므로 즉시 verified

---

#### Type 2: 에어테이블 Automation 수신 (Push)

에어테이블이 Referio로 데이터를 밀어넣는 방식.
에어테이블 API Key가 Referio 밖으로 나오지 않아 보안상 가장 안전.

**트리거 A: 신규 레코드 생성 + 추천코드 있을 때**
**트리거 B: 영업상태 필드 변경 시 (유효/계약/무효)**

→ 상세 설계는 [섹션 5](#5-에어테이블-연동-상세-설계) 참고

**광고주 설정 난이도**: ★★☆☆☆
**검증 방식**: 첫 Webhook 수신 시 자동 verified

---

#### Type 3: Webhook 수신 (내부 서버 → Referio)

광고주 자체 서버가 리드 발생 시 Referio로 POST 전송.

```http
POST https://referio.kr/api/webhook/lead
X-API-Key: ref_live_xxxx
Content-Type: application/json

{
  "name": "홍길동",
  "phone": "010-1234-5678",
  "ref_code": "ABC12",
  "inquiry": "도입 문의드립니다"
}
```

계약 완료 시:
```http
POST https://referio.kr/api/webhook/deal
X-API-Key: ref_live_xxxx

{
  "phone": "010-1234-5678",
  "status": "completed",
  "contracted_at": "2026-03-10T09:00:00Z"
}
```

**광고주 설정 난이도**: ★★★☆☆ (개발자 필요)
**검증 방식**: 첫 Webhook 수신 시 자동 verified

---

#### Type 4: Webhook 발신 (Referio → 광고주 서버)

Referio가 이벤트 발생 시 광고주 서버로 능동적으로 전송.

```
리드 접수 → Referio → POST → 광고주 서버
계약 완료 → Referio → POST → 광고주 서버
```

페이로드:
```json
{
  "event": "lead.created",
  "timestamp": "2026-03-10T09:00:00Z",
  "data": {
    "name": "홍길동",
    "phone": "010-1234-5678",
    "ref_code": "ABC12",
    "partner_name": "파트너A"
  }
}
```

**광고주 설정 난이도**: ★★★☆☆ (수신 서버 구현 필요)
**구현 상태**: 미구현 (webhook_url 필드는 존재)

---

### Phase 2 (1~2개월 후)

#### Type 5: 리캐치 (re:catch) 커넥터

리캐치 Webhook → Referio 자동 변환. 필드 매핑 UI 제공.

#### Type 6: 세일즈맵 커넥터

세일즈맵 딜 완료 이벤트 → Referio 정산 트리거.

---

### Phase 3 (3개월+)

#### Type 7: GA4 이벤트
#### Type 8: 에어브릿지 / AppsFlyer (모바일 앱)
#### Type 9: 연동 마켓플레이스 (외부 개발사 커넥터 등록)

---

## 5. 에어테이블 연동 상세 설계

### 핵심 개념: Push vs Pull

```
Pull 방식 (사용하지 않음):
  Referio → 에어테이블 API 호출하여 데이터 조회
  문제: Referio 서버에 에어테이블 API Key 보관 필요
        → Referio DB 침해 시 에어테이블 전체 데이터 노출

Push 방식 (채택):
  에어테이블 → Referio Webhook 호출
  장점: 에어테이블 API Key가 에어테이블 밖으로 나오지 않음
        → Referio DB 침해돼도 에어테이블 데이터 안전
        → 실시간 (폴링 지연 없음)
        → API 호출 비용 없음
```

### 두 가지 트리거

**트리거 A: 신규 레코드 생성**

```
Automation 설정: When record is created
Script 조건: 추천코드 필드가 비어있으면 전송 스킵
전송 내용: 이름, 연락처, 추천코드, 이메일(선택), 문의내용(선택)
Referio 처리: 신규 referral 생성 + 파트너 매칭
```

**트리거 B: 영업상태 필드 변경**

```
Automation 설정: When record matches conditions
                 (영업상태 is any of 유효, 계약, 무효)
전송 내용: 레코드ID, 전화번호, 현재 상태값, 계약일(선택)
Referio 처리: 기존 referral 상태 업데이트 + 정산 자동 생성
```

### 에어테이블 Automation Script (신규 리드용)

광고주가 Referio 설정 화면에서 필드명 입력 후 자동 생성되는 스크립트.

```javascript
// Referio 연동 스크립트 — 신규 리드 전송
// [Referio 설정 화면에서 자동 생성됨. 직접 수정 금지]

const config        = input.config()
const REFERIO_URL   = 'https://referio.kr/api/webhook/airtable'

// 필드명 (Referio 설정 화면에서 자동 채워짐)
const FIELD = {
  name:     '이름',
  phone:    '연락처',
  ref_code: '추천인코드',
  status:   '영업상태',
}

const record  = input.config().record
const refCode = record.getCellValueAsString(FIELD.ref_code)?.trim()

// 추천코드 없으면 전송 안 함
if (!refCode) {
  output.set('result', 'skipped')
  return
}

// 필요한 필드만 추출 (에어테이블 전체 데이터 노출 방지)
const payload = {
  record_id:  record.id,
  name:       record.getCellValueAsString(FIELD.name),
  phone:      record.getCellValueAsString(FIELD.phone),
  ref_code:   refCode,
  event_type: 'lead_created',
}

const timestamp = String(Math.floor(Date.now() / 1000))
const headers   = {
  'Content-Type':        'application/json',
  'X-API-Key':           config.REFERIO_API_KEY,
  'X-Referio-Timestamp': timestamp,
}

// HMAC 서명 (Secret 설정된 경우 자동 적용)
if (config.REFERIO_SECRET) {
  const body   = JSON.stringify(payload)
  const input  = `${timestamp}.${body}`
  const enc    = new TextEncoder()
  const key    = await crypto.subtle.importKey(
    'raw', enc.encode(config.REFERIO_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const sig    = await crypto.subtle.sign('HMAC', key, enc.encode(input))
  const sigHex = Array.from(new Uint8Array(sig))
                     .map(b => b.toString(16).padStart(2, '0')).join('')
  headers['X-Referio-Signature'] = `sha256=${sigHex}`
}

const res    = await fetch(REFERIO_URL, { method: 'POST', headers, body: JSON.stringify(payload) })
const result = await res.json()
output.set('result',         res.ok ? 'success' : 'error')
output.set('referral_id',    result.referral_id ?? '')
output.set('partner_matched', String(result.partner_matched ?? false))
```

---

## 6. 보안 설계

### 위협 분석

| 위협 | 공격 방법 | 방어 수단 | 구현 상태 |
|------|----------|----------|----------|
| 가짜 리드 주입 | 누군가 Webhook URL에 직접 POST | `X-API-Key` 헤더 검증 | ✅ 구현됨 |
| Replay Attack | 캡처된 요청을 나중에 재전송 | `X-Referio-Timestamp` 5분 윈도우 | ⚠️ 미적용 |
| 페이로드 변조 | API Key 탈취 후 내용 조작 | HMAC-SHA256 서명 검증 | ⚠️ 미적용 |
| 중간자 공격 | 전송 중 도청/변조 | HTTPS TLS 1.3 | ✅ Vercel 제공 |
| 에어테이블 Key 노출 | Referio DB 침해 | Push 방식 (Key를 저장 안 함) | ✅ 구조적 보장 |
| 과도한 데이터 노출 | 에어테이블 모든 필드 전송 | 스크립트 화이트리스팅 | ✅ 스크립트 설계 |
| 중복 이벤트 | 같은 레코드 중복 트리거 | record_id 멱등성 처리 | ⚠️ 미구현 |
| 브루트포스 | API Key 무차별 대입 | Rate Limiting | ⚠️ 미구현 |

### 3단계 보안 레이어 (봉인된 편지 비유)

```
Layer 1: API Key      = 발신자 확인    "누가 보냈는가"
Layer 2: Timestamp    = 발송 시각 확인 "언제 보냈는가 (5분 초과 거부)"
Layer 3: HMAC 서명    = 내용 무결성    "내용이 변조되지 않았는가"
```

**에어테이블 Script의 HMAC 지원**: 에어테이블 자동화 스크립트는 브라우저 수준의 WebCrypto API(`crypto.subtle`)를 내장 지원한다. 별도 라이브러리 설치 없이 HMAC-SHA256 서명 계산 가능.

### API Key 보관 방법

```
❌ 잘못된 방법: 스크립트 코드에 직접 입력
   const API_KEY = 'ref_live_xxx'  ← 위험

✅ 올바른 방법: 에어테이블 Input Variables (암호화 저장)
   const config = input.config()
   const API_KEY = config.REFERIO_API_KEY  ← 안전
```

에어테이블 Input Variables는 암호화 저장되어 스크립트 코드에서 값을 직접 조회하거나 로그로 출력할 수 없다.

---

## 7. 광고주 온보딩 UX

### 가입 후 온보딩 플로우

```
회원가입 완료
      ↓
[Step 1] 기업 기본 정보
         회사명, 산업 분야, 프로그램명
      ↓
[Step 2] 데이터 연동 선택  ← 핵심 단계
         "리드를 어디서 관리하시나요?"

  ┌──────────────────────────────────────────┐
  │  Referio 문의폼     즉시 시작 가능         │
  │  에어테이블         가이드 따라 30분       │
  │  리캐치             가이드 따라 20분       │
  │  세일즈맵           가이드 따라 20분       │
  │  자체 서버          개발팀과 함께 1~2일    │
  │  나중에 설정        (캠페인 공개 불가)      │
  └──────────────────────────────────────────┘

      ↓
[Step 3] 연동 설정 + 실시간 테스트
         선택한 연동 유형별 가이드 표시
         ● 연결 대기 중... (깜박임)
         테스트 이벤트 수신 시 → ✅ 연결됨
      ↓
[Step 4] 파트너 수수료 설정
      ↓
온보딩 완료 → 대시보드
```

### 에어테이블 연동 설정 화면

```
[연동 설정 — 에어테이블]

───────────────────────────────
 발급된 자격증명

 API Key   ref_live_xxxxxxxx  [복사]
 Secret    secret_xxxxxxxx    [복사]
───────────────────────────────
 내 에어테이블 필드명 입력

 이름 필드:       [ 이름          ]
 연락처 필드:     [ 연락처        ]
 추천코드 필드:   [ 추천인코드    ]
 영업상태 필드:   [ 영업상태      ]
 계약으로 인식:   [ 계약          ]
 유효로 인식:     [ 유효          ]
 무효로 인식:     [ 무효          ]

           [스크립트 생성하기]
───────────────────────────────
 생성된 스크립트 (에어테이블에 붙여넣기)

 ┌──────────────────────────────┐
 │ const FIELD = {              │
 │   name: '이름',               │
 │   phone: '연락처',            │
 │   ref_code: '추천인코드',     │
 │   ...                        │
 │ }                            │
 └──────────────────────────────┘
              [코드 복사]
───────────────────────────────
 연결 상태

 ● 연결 대기 중...
 테스트 레코드를 생성하면 자동으로 확인됩니다.
───────────────────────────────

[단계별 설정 가이드 보기 ▼]

STEP 1  에어테이블 → Automations → + New Automation
STEP 2  트리거: When record is created
STEP 3  액션: Run Script 선택
STEP 4  Input Variables 추가
        REFERIO_API_KEY = ref_live_xxx  [복사]
        REFERIO_SECRET  = secret_xxx    [복사]
STEP 5  Script 창에 위 코드 붙여넣기
STEP 6  Save → 테스트 레코드 생성
```

### 실시간 연결 확인

광고주가 에어테이블에서 테스트 레코드를 생성하면:

```
Before: ● 연결 대기 중...

After:  ✅ 연결됨
        마지막 수신: 방금 전
        수신 데이터: 홍길동 / 010-... / 추천코드: TEST1
```

---

## 8. 데이터 모델

### `integrations` 테이블 (신규)

기존 `webhook_integrations` 테이블을 대체/확장.

```sql
CREATE TABLE integrations (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  advertiser_id     UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,

  -- 기본 정보
  name              TEXT NOT NULL,
  type              TEXT NOT NULL CHECK (type IN (
    'referio_form',       -- Referio 자체 문의폼
    'airtable_push',      -- 에어테이블 Automation → Referio
    'airtable_pull',      -- Referio가 에어테이블 주기 조회 (비권장)
    'inbound_webhook',    -- 광고주 서버 → Referio
    'outbound_webhook',   -- Referio → 광고주 서버
    'recatch',
    'salesmap',
    'ga4',
    'airbridge'
  )),

  -- 상태
  status            TEXT NOT NULL DEFAULT 'configured' CHECK (status IN (
    'not_configured', 'configured', 'verified', 'error', 'inactive'
  )),

  -- 인증 정보
  api_key           TEXT UNIQUE,          -- Referio 발급 (inbound용)
  api_secret        TEXT,                 -- HMAC 서명용 Secret

  -- 엔드포인트
  webhook_url       TEXT,                 -- outbound: 광고주 서버 URL

  -- 설정 (연동 유형별 상이)
  config            JSONB DEFAULT '{}',
  /*
    airtable_push 예시:
    {
      "field_mappings": {
        "name": "이름",
        "phone": "연락처",
        "ref_code": "추천인코드",
        "status": "영업상태"
      },
      "valid_values": ["유효"],
      "contract_values": ["계약"],
      "invalid_values": ["무효"],
      "contract_date_field": "계약일"
    }
  */

  -- 폼 커스터마이징 (referio_form용)
  form_config       JSONB DEFAULT '{
    "fields": ["name", "phone", "inquiry"],
    "submit_button_text": "문의하기",
    "success_message": "문의가 접수되었습니다."
  }',

  -- 구독 이벤트 (outbound용)
  subscribed_events TEXT[] DEFAULT ARRAY['lead.created', 'lead.contract_completed'],

  -- 검증 정보
  verified_at       TIMESTAMPTZ,
  last_event_at     TIMESTAMPTZ,
  last_error        TEXT,
  last_error_at     TIMESTAMPTZ,

  -- 통계
  total_leads_received  INTEGER DEFAULT 0,
  total_errors          INTEGER DEFAULT 0,

  -- 메타
  is_primary        BOOLEAN DEFAULT false,   -- 캠페인 게이팅 기준
  is_active         BOOLEAN DEFAULT true,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_integrations_advertiser
  ON integrations(advertiser_id, is_active, status);

CREATE UNIQUE INDEX idx_integrations_api_key
  ON integrations(api_key) WHERE api_key IS NOT NULL;

CREATE UNIQUE INDEX idx_integrations_primary
  ON integrations(advertiser_id)
  WHERE is_primary = true AND is_active = true;
```

### `integration_events` 테이블 (신규)

수신/발신 이벤트 전체 로그.

```sql
CREATE TABLE integration_events (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  integration_id  UUID NOT NULL REFERENCES integrations(id) ON DELETE CASCADE,
  advertiser_id   UUID NOT NULL,

  -- 이벤트 분류
  direction       TEXT NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  event_type      TEXT NOT NULL,
  -- inbound:  'lead_created', 'status_changed', 'test_event'
  -- outbound: 'lead.created', 'lead.contract_completed', 'delivery_failed'

  -- 데이터
  raw_payload     JSONB,          -- 수신/발신 원본 페이로드
  processed_data  JSONB,          -- 변환 후 표준 형식

  -- 처리 결과
  status          TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('success', 'failed', 'duplicate', 'ignored')),
  referral_id     UUID REFERENCES referrals(id),
  error_message   TEXT,

  -- 재시도 (outbound 실패 시)
  retry_count     INTEGER DEFAULT 0,
  next_retry_at   TIMESTAMPTZ,

  -- 요청 메타
  source_ip       TEXT,
  response_code   INTEGER,
  response_time_ms INTEGER,

  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_integration_events_recent
  ON integration_events(integration_id, created_at DESC);

CREATE INDEX idx_integration_events_retry
  ON integration_events(next_retry_at)
  WHERE status = 'failed' AND next_retry_at IS NOT NULL;
```

### `referrals` 테이블 추가 컬럼

```sql
ALTER TABLE referrals
  ADD COLUMN IF NOT EXISTS airtable_record_id TEXT,  -- 멱등성 처리용
  ADD COLUMN IF NOT EXISTS integration_id UUID REFERENCES integrations(id);

CREATE UNIQUE INDEX idx_referrals_airtable_record
  ON referrals(advertiser_id, airtable_record_id)
  WHERE airtable_record_id IS NOT NULL;
```

---

## 9. 경쟁 분석

### 텐핑(Tenping) 대비 Referio의 구조적 차별점

텐핑은 2010년대 초 설계된 B2C 중심 플랫폼. 픽셀 → 랜딩 → 전환 감지라는 단순 구조.
B2B의 "문의 → 영업 → 계약" 다단계 사이클을 처음부터 고려하지 않았다.

| 기준 | 텐핑 | Referio |
|------|------|---------|
| 타겟 | B2C (앱 설치, 구매) | B2B (문의, 계약) |
| 추적 방식 | 픽셀/쿠키 | 서버사이드 Webhook |
| 브라우저 차단 취약성 | 높음 (ITP, 광고 차단기) | 없음 (서버 간 통신) |
| 영업 사이클 지원 | 즉시 전환만 | 문의→유효→계약 다단계 |
| CRM 연동 | 없음 | 9가지 연동 유형 |
| 이탈 장벽 | 낮음 (픽셀 삭제) | 높음 (CRM 깊숙이 통합) |
| 데이터 소유권 | 플랫폼 보관 | 광고주 CRM (Referio는 중계) |
| 확장성 | 폐쇄형 | 앱스토어 오픈 에코시스템 |

### 비즈니스 해자 (Moat)

연동이 깊어질수록 이탈이 어려워진다.

```
텐핑 이탈: 픽셀 한 줄 삭제 → 끝

Referio 이탈:
  에어테이블 Automation 삭제
  + 필드 매핑 재설정
  + 영업팀 프로세스 변경
  + 파트너 추천 링크 전면 교체
  → 현실적으로 어려움
```

---

## 10. 구현 로드맵

### Phase 1 — 지금 ~ 4주

**목표**: 기존 클라이언트(한화비전 등) 연동 완전 내재화 + 게이팅 적용

| 항목 | 파일 | 공수 |
|------|------|------|
| `integrations` 테이블 마이그레이션 | `018_integrations_v2.sql` | 2시간 |
| `integration_events` 테이블 | 동일 SQL | 1시간 |
| `airtable/route.ts`: Timestamp 검증 추가 | `route.ts` | 30분 |
| `airtable/route.ts`: record_id 멱등성 | `route.ts` | 1시간 |
| `airtable/route.ts`: HMAC 서명 검증 | `route.ts` | 1시간 |
| `airtable/route.ts`: integration_events 로그 | `route.ts` | 1시간 |
| verified_at 자동 업데이트 로직 | `route.ts` | 30분 |
| 캠페인 공개 게이팅 API | `campaigns/publish/route.ts` | 2시간 |
| 설정 페이지: 연동 상태 배지 | `settings/page.tsx` | 2시간 |
| 설정 페이지: 스크립트 자동 생성 | `settings/page.tsx` | 3시간 |
| 설정 페이지: 실시간 연결 확인 | `settings/page.tsx` | 2시간 |

**Phase 1 완료 시 커버**: 현재 클라이언트 80% + 게이팅 적용

---

### Phase 2 — 5~8주

**목표**: 내부 서버 연동 완성 + Outbound Webhook 구현

| 항목 | 공수 |
|------|------|
| Outbound Webhook 디스패처 | 4시간 |
| 재시도 큐 (실패 시 1초→5초→30초 재시도) | 2시간 |
| Rate Limiting 미들웨어 | 2시간 |
| 온보딩 연동 선택 Step 2 UI | 4시간 |
| Webhook 테스트 발송 버튼 | 2시간 |
| 이벤트 로그 뷰어 (최근 10건) | 3시간 |

---

### Phase 3 — 9~14주

**목표**: 서드파티 CRM 공식 커넥터

| 항목 | 공수 |
|------|------|
| 리캐치 전용 커넥터 + 필드 자동 매핑 | 1주 |
| 세일즈맵 커넥터 | 1주 |
| GA4 이벤트 수신 | 2주 |

---

### Phase 4 — 15주+

**목표**: 연동 마켓플레이스 오픈

- 외부 개발사 커넥터 등록 SDK
- `/marketplace` 앱 카탈로그 페이지
- HubSpot, Notion, 채널톡, Google Sheets 커넥터

---

## 11. 역할 분담 (Referio vs 광고주)

### Referio가 해주는 것 (자동)

```
✅ API Key + Secret 자동 발급
✅ 필드명 입력 → 실행 가능한 스크립트 자동 생성
✅ 코드 복사 버튼 (복붙 준비 완료)
✅ 단계별 스크린샷 가이드 (인앱 표시)
✅ 연결 대기 상태 실시간 표시
✅ 첫 이벤트 수신 시 "연결됨" 자동 전환
✅ 이벤트 로그 뷰어 (마지막 수신 N분 전)
```

### 광고주가 해야 하는 것 (불가피)

```
필수 작업:
  에어테이블 로그인
  Automations 메뉴 열기
  + New Automation 클릭
  Input Variables 2개 값 붙여넣기 (복사 제공)
  Script 창에 코드 붙여넣기 (복사 제공)
  Save → 테스트 레코드 생성 1개

소요 시간: 가이드 보면서 15~20분
```

### 왜 광고주가 직접 해야 하나

Referio가 광고주의 에어테이블 계정에 접근하는 것은 기술적으로 불가능하다 (접근하려면 에어테이블 API Key가 필요하고, 그러면 Push 방식의 보안 원칙이 무너진다).

에어테이블 내부 작업은 에어테이블 계정 소유자만 가능하다.

### 초기 고객 지원 방식

```
초기 고객 (한화비전 등):
  → Referio 담당자가 화면 공유로 함께 설정
  → 이 경험을 바탕으로 가이드 문서 개선

성장 후:
  → 가이드만으로 혼자 설정 완료 (목표 15분)
  → 연동 실패 시 이벤트 로그로 자가 진단 가능
```

---

## 부록: 현재 구현 상태 vs 목표

| 항목 | 현재 | 목표 |
|------|------|------|
| X-API-Key 검증 | ✅ | ✅ |
| X-Timestamp 검증 | ❌ airtable 미적용 | ✅ |
| HMAC 서명 검증 | ❌ airtable 미적용 | ✅ |
| record_id 멱등성 | ❌ | ✅ |
| integration_events 로그 | ❌ | ✅ |
| verified_at 자동 업데이트 | ❌ | ✅ |
| 캠페인 공개 게이팅 | ❌ | ✅ |
| 스크립트 자동 생성 UI | ❌ | ✅ |
| 실시간 연결 확인 UI | ❌ | ✅ |
| Outbound Webhook | ❌ | ✅ |
| 리캐치/세일즈맵 커넥터 | ❌ | Phase 3 |
| 마켓플레이스 | ❌ | Phase 4 |

---

**작성자**: Claude (개발팀)
**검토 대상**: Product Owner
**다음 리뷰**: Phase 1 구현 완료 후
