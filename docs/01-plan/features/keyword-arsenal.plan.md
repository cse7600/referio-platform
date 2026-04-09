# 파트너 키워드 무기고 (Keyword Arsenal) Planning Document — v2.0

> **Summary**: 광고주가 등록한 100만+ 추천 키워드와 네이버 검색량을 파트너 대시보드에서 한눈에 확인, 블로그 포스팅 전략을 돕는 기능
>
> **Project**: Referio Platform
> **Version**: 2.0 (대규모 아키텍처 재설계)
> **Author**: cse7600
> **Date**: 2026-04-08
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

블로거 파트너들은 열심히 활동하지만 "어떤 키워드로 써야 성과가 나는가"를 모른다. 이 기능은 광고주가 등록한 추천 키워드와 네이버 검색량을 파트너 대시보드 내에서 바로 제공해 "지금 이 키워드로 쓰면 좋다"는 판단을 돕는다.

### 1.2 v1 → v2 변경 배경

- **밀리의서재 사례**: 책 22만권 × (책명 + 후기/추천/리뷰 등 조합) = 잠재적 100만 건 키워드
- v1의 "최대 30개 태그 입력" 방식으로는 대응 불가
- 100만 건 저장·조회·갱신을 안정적으로 처리할 수 있는 아키텍처 필요
- 경쟁도 수동 입력 제거 → `is_featured` + `memo` 필드로 대체

### 1.3 Related Documents

- 메인 PRD: `docs/PRD-v1.0.md`
- 네이버 검색광고 API 문서: https://naver.github.io/searchad-apidoc/

---

## 2. Scope

### 2.1 In Scope

- [ ] 광고주: 프로그램별 키워드 **무제한** 등록 (태그 입력 + CSV 대량 업로드)
- [ ] 광고주: `is_featured` 추천 토글 + `memo` 마케터 메모 + `memo_public` 공개/비공개 토글
- [ ] 파트너: 승인된 프로그램의 키워드 무한스크롤 조회 (검색량 포함)
- [ ] 네이버 검색광고 API 연동 (pcVolume, mobileVolume, competition, avgDepth)
- [ ] Vercel Cron 기반 검색량 갱신 (일일 한도 없음, 초당 20~30req 제한 준수)
- [ ] 파트너 사이드바에 "키워드" 탭 신규 추가
- [ ] 서버사이드 정렬/검색/페이지네이션 (100만 건 대응)
- [ ] "오늘의 추천 키워드" (is_featured) 상단 고정 섹션
- [ ] 빈 상태 / fallback UX 처리

### 2.2 Out of Scope

- 키워드 자동 수집/크롤링
- 구글 검색량 연동
- 키워드별 성과 추적 (어떤 키워드 포스팅이 실제 리퍼럴로 이어졌는지)
- AI 키워드 추천 자동화
- 파트너가 직접 키워드 추가하는 기능
- BigQuery 연동 (불필요 — 섹션 A에서 상세 설명)

---

## 3. 기술 선택 정리 (섹션 H)

| 항목 | 선택 | 이유 |
|------|------|------|
| **스토리지** | **Supabase (PostgreSQL)** | 실시간 조회 필수, RLS 기존 패턴 그대로, btree 인덱스로 1M+ 충분, per-query 비용 0원. BigQuery는 쿼리당 수초 지연 + per-query 과금으로 UX/비용 모두 불리 |
| **대량 업로드** | **CSV (multipart) + JSON 배열 병행** | CSV: 마케터가 엑셀에서 바로 내보낸 파일 업로드. JSON: API 연동·자동화 |
| **무한스크롤** | **Cursor-based pagination** | Offset pagination은 100만 건에서 OFFSET 깊어질수록 성능 저하. Cursor(id 기반)는 일정 성능 유지 |
| **키워드 검색** | **pg_trgm + GIN 인덱스** | ILIKE `%검색어%`는 100만 건에서 full scan. trigram 인덱스로 부분 문자열 검색 O(log n) |
| **Cron** | **Vercel Cron** | 기존 인프라 그대로, 일 1회 실행으로 충분 |
| **캐시 구조** | **인라인 캐시 (program_keywords 테이블 내)** | 별도 테이블 JOIN 비용 제거, 1:1 매핑이므로 정규화 이점 없음 |
| **파티셔닝** | **불필요** | PostgreSQL은 단일 테이블 1,000만 건까지 btree 인덱스로 안정적. 100만 건은 파티셔닝 오버헤드가 더 큼 |

---

## 4. 스토리지 아키텍처 결정 (섹션 A)

### 4.1 Supabase 단독 사용 — BigQuery 불필요

**결정: Supabase (PostgreSQL) 만 사용한다.**

| 비교 항목 | Supabase (PostgreSQL) | BigQuery |
|-----------|----------------------|----------|
| 조회 지연 | 10~50ms (인덱스 히트) | 2~10초 (cold start) |
| 실시간 UX | 즉각 응답 | 파트너가 키워드 탭 열 때마다 수초 대기 — UX 치명적 |
| per-query 비용 | 0원 (Supabase 플랜 내) | 스캔 데이터량 기준 과금 |
| RLS | 기존 패턴 그대로 | 별도 인증 레이어 필요 |
| 운영 복잡도 | 기존 인프라 그대로 | 별도 프로젝트 + 서비스 계정 관리 |
| 1M 행 성능 | btree 인덱스로 충분 | 과잉 — 분석용 PB급에 최적화된 엔진 |

**결론**: 100만 건은 PostgreSQL이 가장 효율적인 구간. BigQuery는 TB 이상의 분석 워크로드에 적합하며, OLTP(실시간 조회)에는 부적합.

### 4.2 100만 건 성능 최적화 전략

1. **복합 인덱스**: `(advertiser_id, is_featured DESC, keyword)` — 광고주별 조회 + 추천 우선 정렬
2. **pg_trgm GIN 인덱스**: `keyword` 컬럼 — 부분 문자열 검색 최적화
3. **캐시 갱신 스캔 인덱스**: `(naver_cached_at NULLS FIRST)` — Cron이 미갱신 키워드 빠르게 찾기
4. **인라인 캐시**: 검색량 데이터를 동일 테이블에 저장 — JOIN 제거
5. **Cursor pagination**: `id` 기준 — OFFSET 없이 일정 성능

### 4.3 별도 keyword_volume_cache 테이블 vs 인라인 캐시

| 방식 | 장점 | 단점 |
|------|------|------|
| 별도 테이블 | 동일 키워드 중복 캐시 방지 | JOIN 비용, 100만 건 JOIN은 부담 |
| **인라인 캐시** ✅ | JOIN 0, 단일 테이블 스캔으로 끝 | 동일 키워드가 여러 광고주에 있으면 중복 API 호출 |

**결정: 인라인 캐시.** 동일 키워드 중복은 Cron에서 `DISTINCT keyword` 쿼리로 해결 — 네이버 API는 키워드 단위 조회 후 동일 키워드를 가진 모든 행 일괄 UPDATE.

### 4.4 파티셔닝 불필요

PostgreSQL은 단일 테이블 1,000만 건까지 btree 인덱스로 안정적. 100만 건에서 파티셔닝은:
- DDL 복잡도 증가 (파티션 키 설계, 파티션 프루닝 확인)
- Supabase Dashboard에서 파티션 테이블 관리 불편
- 성능 이점 미미 (인덱스만으로 충분)

광고주 수가 1,000개 이상, 키워드가 1,000만 건 이상이 되면 `advertiser_id` 기준 range 파티셔닝 검토.

---

## 5. DB 스키마 — Migration 029 (섹션 B)

### 5.1 program_keywords 테이블

```sql
-- =============================================
-- 029: program_keywords (100만 건 최적화, 인라인 캐시)
-- =============================================

-- 0. pg_trgm 확장 (부분 문자열 검색용)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. program_keywords 테이블
CREATE TABLE program_keywords (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advertiser_id UUID NOT NULL REFERENCES advertisers(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES partner_programs(id) ON DELETE CASCADE,
  keyword TEXT NOT NULL,

  -- advertiser controls
  is_featured BOOLEAN NOT NULL DEFAULT false,
  memo TEXT,                        -- marketer internal memo
  memo_public BOOLEAN NOT NULL DEFAULT false, -- true = visible to partners
  display_order INTEGER DEFAULT 0,

  -- naver volume inline cache
  naver_pc_volume INTEGER,
  naver_mobile_volume INTEGER,
  naver_competition TEXT CHECK (naver_competition IN ('낮음', '중간', '높음')),
  naver_avg_depth NUMERIC(4,1),
  naver_cached_at TIMESTAMPTZ,      -- NULL = never fetched

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- one keyword per program (dedup)
  UNIQUE(program_id, keyword)
);

-- 2. Performance indexes (100만 건 최적화)

-- Primary query: advertiser's keywords for a program
CREATE INDEX idx_pk_program_id ON program_keywords(program_id);

-- Advertiser-level bulk operations (all keywords across programs)
CREATE INDEX idx_pk_advertiser_id ON program_keywords(advertiser_id);

-- Partner view: featured first, then by total volume
CREATE INDEX idx_pk_featured ON program_keywords(program_id, is_featured DESC);

-- Cron: find keywords needing naver refresh (NULL first = never fetched)
CREATE INDEX idx_pk_naver_cache ON program_keywords(naver_cached_at NULLS FIRST)
  WHERE naver_cached_at IS NULL OR naver_cached_at < NOW() - INTERVAL '30 days';

-- Text search: trigram index for ILIKE '%partial%' on 1M rows
CREATE INDEX idx_pk_keyword_trgm ON program_keywords USING gin (keyword gin_trgm_ops);

-- 3. RLS
ALTER TABLE program_keywords ENABLE ROW LEVEL SECURITY;

-- Advertisers: full CRUD on own keywords
CREATE POLICY "advertiser_keywords_policy" ON program_keywords
  FOR ALL
  USING (
    advertiser_id IN (
      SELECT id FROM advertisers WHERE id = advertiser_id
    )
  )
  WITH CHECK (
    advertiser_id IN (
      SELECT id FROM advertisers WHERE id = advertiser_id
    )
  );

-- Partners: read-only on approved programs' keywords
CREATE POLICY "partner_keywords_read" ON program_keywords
  FOR SELECT
  USING (
    program_id IN (
      SELECT id FROM partner_programs WHERE status = 'approved'
    )
  );

-- Service role bypass (API routes use service role)
CREATE POLICY "service_role_all" ON program_keywords
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. updated_at trigger
CREATE TRIGGER update_pk_updated_at BEFORE UPDATE ON program_keywords
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 5.2 스키마 설계 근거

| 컬럼 | 목적 |
|------|------|
| `advertiser_id` | 광고주별 전체 키워드 조회 (프로그램 횡단). `program_id`만으로는 광고주가 보유한 모든 프로그램의 키워드를 한 번에 조회 시 JOIN 필요 |
| `is_featured` | 광고주가 "지금 밀고 있는 키워드" 표시. 파트너 화면에서 "오늘의 추천" 섹션 최상단 고정 |
| `memo` | 마케터 메모. `memo_public` 값에 따라 공개/비공개 결정 |
| `memo_public` | `false`(기본): 광고주 전용 내부 메모. `true`: 파트너에게도 "마케터 메모" 말풍선으로 노출 — 광고주가 키워드별로 토글 제어 |
| `naver_*` 4개 컬럼 | 인라인 캐시. 별도 테이블 JOIN 제거 |
| `naver_cached_at` | NULL = 미조회, 30일 초과 = 만료. Cron이 이 컬럼 기준으로 갱신 대상 스캔 |
| `display_order` | 광고주가 직접 순서 지정 (CSV 업로드 시 행 순서 반영) |

---

## 6. 대량 업로드 API (섹션 C)

### 6.1 Bulk Upload API

```
POST /api/advertiser/keywords/bulk
Content-Type: multipart/form-data 또는 application/json

--- multipart/form-data ---
Fields:
  program_id: UUID (required)
  file: CSV file (required)
  mode: "append" | "replace" (default: "append")

--- application/json ---
{
  "program_id": "uuid",
  "keywords": [
    { "keyword": "밀리의서재 구독", "is_featured": true, "memo": "2월 집중" },
    { "keyword": "전자책 추천" }
  ],
  "mode": "append"
}

--- Response ---
{
  "inserted": 4523,
  "skipped": 12,       // duplicate keywords
  "updated": 0,        // replace mode only
  "total": 4535,
  "errors": []
}
```

### 6.2 CSV 포맷

```csv
keyword,is_featured,memo
밀리의서재 구독,true,2월 집중
전자책 추천,,
독서앱 비교,true,
밀리의서재 후기,,브랜드팀 요청
```

- 첫 행: 헤더 (keyword 필수, is_featured/memo 선택)
- `keyword` 컬럼만 필수, 나머지 생략 시 default
- 인코딩: UTF-8 (BOM 허용)

### 6.3 처리 로직

```
1. CSV 파싱 (papaparse) 또는 JSON 배열 수신
2. 광고주 세션 검증 + program 소유권 확인
3. 키워드 정규화: trim, 중복 제거, 빈 문자열 스킵
4. 배치 upsert:
   - mode="append": INSERT ... ON CONFLICT (program_id, keyword) DO NOTHING
   - mode="replace": 기존 전체 삭제 후 INSERT (트랜잭션)
5. 배치 크기: 1,000행씩 (Supabase insert 한도 고려)
6. 응답 반환
```

### 6.4 월별 순차 업데이트 워크플로우

밀리의서재 시나리오:
1. **초기**: 22만 키워드 CSV 업로드 (mode=append)
2. **매월**: 이번 달 신간 목록 CSV 업로드 (mode=append) → 기존 목록에 추가
3. **연말 정리**: 절판 도서 키워드 삭제 (bulk delete API)
4. **캐시 갱신**: Cron이 자동으로 신규 키워드(naver_cached_at IS NULL) 우선 처리

### 6.5 단건 API

```
# 단건 추가
POST /api/advertiser/keywords
{ "program_id": "uuid", "keyword": "밀리의서재 구독", "is_featured": true, "memo": "..." }

# 수정 (is_featured, memo, display_order)
PATCH /api/advertiser/keywords/[id]
{ "is_featured": false, "memo": "updated" }

# 삭제
DELETE /api/advertiser/keywords/[id]

# 벌크 삭제
DELETE /api/advertiser/keywords/bulk
{ "program_id": "uuid", "keyword_ids": ["uuid1", "uuid2", ...] }
```

---

## 7. 네이버 API 순차 갱신 Cron (섹션 D)

### 7.1 설계

```
Endpoint: /api/cron/refresh-keyword-volumes
Schedule: 매일 KST 02:00 (Vercel Cron, "0 17 * * *" UTC)
Timeout: 300초 (Vercel Pro Plan) 또는 60초 (Hobby — 배치 축소)

갱신 우선순위 (SQL ORDER):
  1. is_featured = true AND (naver_cached_at IS NULL OR naver_cached_at < 7일)
     → 광고주 핵심 키워드 — 항상 최신 유지 (7일 주기)
  2. naver_cached_at IS NULL
     → 신규 등록, 한 번도 조회 안 한 키워드
  3. naver_cached_at < NOW() - INTERVAL '30 days'
     → 30일 이상 된 만료 캐시

처리량 (공식 확인: 일일 한도 없음, 초당 20~30req 제한):
  - 권장 딜레이: 100ms (초당 10req, 안전 마진)
  - 초당 처리: 10req × 5키워드 = 50개/초
  - 1M 키워드 전량: 약 5.5시간 (단일 계정, 1회 실행)
  - LIMIT 제거: 전량 처리 후 종료
  - 실제 엔드포인트: api.searchad.naver.com (api.naver.com은 308 리다이렉트)
```

### 7.2 Cron 실행 로직

```
1. DISTINCT keyword 추출 (중복 제거 — 여러 프로그램에 동일 키워드)
   SELECT DISTINCT keyword
   FROM program_keywords
   WHERE is_featured = true AND (naver_cached_at IS NULL OR naver_cached_at < NOW() - INTERVAL '7 days')
   UNION ALL
   SELECT DISTINCT keyword
   FROM program_keywords
   WHERE naver_cached_at IS NULL AND is_featured = false
   UNION ALL
   SELECT DISTINCT keyword
   FROM program_keywords
   WHERE naver_cached_at < NOW() - INTERVAL '30 days' AND is_featured = false
   LIMIT 5000;

2. 5개씩 묶어 네이버 API 호출
   POST /keywordstool (hintKeywords: [5개])

3. 결과를 동일 keyword를 가진 모든 행에 일괄 UPDATE
   UPDATE program_keywords
   SET naver_pc_volume = $1, naver_mobile_volume = $2,
       naver_competition = $3, naver_avg_depth = $4,
       naver_cached_at = NOW()
   WHERE keyword = $5;

4. 처리 결과 로깅 (processed, failed, remaining)
```

### 7.3 100만 키워드 전체 갱신 소요 시간 (공식 확인 기준)

**일일 한도 없음 확인** — 초당 20~30req 제한만 존재 (naver-searchad GitHub #1049)

| 시나리오 | 딜레이 | 초당 처리 | 1M 키워드 소요 |
|---------|--------|---------|--------------|
| 단일 계정 (안전) | 100ms | 50개/초 | **약 5.5시간** |
| 단일 계정 (보수) | 300ms | 16.7개/초 | **약 17시간** |
| 멀티 2계정 병렬 | 100ms | 100개/초 | **약 2.8시간** |
| 멀티 5계정 병렬 | 100ms | 250개/초 | **약 1.1시간** |

> 단일 계정으로 새벽 Cron 1회 실행으로 전량 처리 가능. 멀티 계정은 선택적 속도 향상.

**is_featured 키워드는 7일 주기로 항상 최신 유지** — 광고주가 중요하다고 표시한 키워드는 절대 오래된 데이터가 표시되지 않음.

---

## 8. 파트너 키워드 조회 API (섹션 E)

### 8.1 Endpoint

```
GET /api/partner/keywords
  ?program_id=UUID         (required)
  &sort=volume|featured|abc  (default: featured)
  &search=검색어            (optional, pg_trgm ILIKE)
  &cursor=UUID              (optional, last item id)
  &limit=50                 (default: 50, max: 100)
  &featured_only=true       (optional, is_featured만)
```

### 8.2 Response

```json
{
  "keywords": [
    {
      "id": "uuid",
      "keyword": "밀리의서재 구독",
      "is_featured": true,
      "pc_volume": 3200,
      "mobile_volume": 9200,
      "total_volume": 12400,
      "competition": "낮음",
      "avg_depth": 5.2,
      "cached_at": "2026-04-07T..."
    }
  ],
  "next_cursor": "uuid-of-last-item",
  "has_more": true,
  "total_count": 220000
}
```

- `memo`: `memo_public = true`인 키워드만 `memo` 값 반환. `false`이면 `memo: null`로 반환 (광고주 내부 메모 보호)
- `total_count`는 `COUNT(*)` — 첫 요청 시만 계산, 이후 cursor 요청에서는 생략

### 8.3 정렬 옵션

| sort 값 | SQL ORDER BY |
|---------|-------------|
| `featured` (기본) | `is_featured DESC, (naver_pc_volume + naver_mobile_volume) DESC NULLS LAST, keyword ASC` |
| `volume` | `(naver_pc_volume + naver_mobile_volume) DESC NULLS LAST, keyword ASC` |
| `abc` | `keyword ASC` |

### 8.4 검색 쿼리

```sql
-- pg_trgm 인덱스 활용
WHERE program_id = $1
  AND keyword ILIKE '%' || $2 || '%'
ORDER BY similarity(keyword, $2) DESC, ...
```

파트너가 "밀리" 입력 → "밀리의서재 구독", "밀리의서재 후기", "밀리 앱 추천" 등 매칭.

---

## 9. 광고주 키워드 관리 UI (섹션 F)

### 9.1 진입 경로

```
광고주 네비게이션: 프로그램 관리 → 개별 프로그램 설정 페이지 → "키워드" 탭
또는: 사이드바 "키워드 관리" (전체 프로그램 횡단)
```

### 9.2 UI 구성

```
┌─────────────────────────────────────────────────────────┐
│  키워드 관리 — [밀리의서재 프로그램 ▼]                   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  📎 CSV 업로드 (드래그 앤 드롭)                   │   │
│  │  .csv 파일을 여기에 끌어다 놓거나 클릭하세요      │   │
│  │  [업로드] [템플릿 다운로드]                       │   │
│  │  ● 추가 모드 (기존 유지)  ○ 교체 모드 (기존 삭제)│   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  키워드 직접 입력 (Enter 또는 쉼표로 추가)        │   │
│  │  [밀리의서재 구독] [전자책 추천] [독서앱] [x]     │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  총 223,456개 키워드 · 추천 12개                       │
│  [검색: ________] [정렬: 검색량 순 ▼] [선택 삭제]      │
│                                                         │
│  ┌─────────────────────────────────────────────────┐   │
│  │  ☐ ⭐ 밀리의서재 구독           12,400  낮음    │   │
│  │     메모: 2월 집중 공략 [편집]                    │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  ☐    전자책 추천                8,700  중간    │   │
│  │     메모: — [추가]                               │   │
│  ├─────────────────────────────────────────────────┤   │
│  │  ☐    독서앱 비교                5,200  낮음    │   │
│  │     메모: 브랜드팀 요청 [편집]                    │   │
│  └─────────────────────────────────────────────────┘   │
│  ... (무한스크롤)                                       │
└─────────────────────────────────────────────────────────┘
```

### 9.3 주요 인터랙션

| 동작 | 상세 |
|------|------|
| CSV 업로드 | 파일 선택 → 클라이언트 파싱 → 진행률 바 → bulk API 호출 → 결과 토스트 "4,523개 추가, 12개 중복 스킵" |
| 추천 토글 | 키워드 행의 ⭐ 클릭 → `PATCH /api/advertiser/keywords/[id]` → 낙관적 UI 업데이트 |
| 메모 편집 | 메모 영역 클릭 → 인라인 input → blur 시 자동 저장 |
| 메모 공개 토글 | 메모 하단 "공개/비공개" 스위치 → `PATCH` → 낙관적 UI. 파트너에게 즉시 노출/숨김 |
| 검색 | 입력 → 300ms debounce → 서버 검색 API 호출 |
| 벌크 삭제 | 체크박스 선택 → "선택 삭제" → 확인 다이얼로그 → bulk delete API |
| 템플릿 다운로드 | 헤더행 포함 빈 CSV 파일 브라우저 다운로드 |

### 9.4 업로드 진행률

10만 건 CSV 업로드 시:
1. 클라이언트: papaparse로 파싱 (1~2초)
2. 1,000행씩 배치 분할 → 100개 배치
3. 순차 API 호출 (병렬은 DB 부하) → 배치당 ~200ms → 총 ~20초
4. 진행률 바: `{완료 배치}/{전체 배치}` 표시

---

## 10. 파트너 키워드 탭 UI (섹션 G)

### 10.1 탭/메뉴 네이밍

- **이름**: "키워드"
- **아이콘**: `<Target />` (lucide-react)
- **위치**: 사이드바 "이벤트" 다음, 4번째

### 10.2 UI 구성

```
┌─────────────────────────────────────────────────────────┐
│  🎯 키워드                                              │
│  [밀리의서재 프로그램 ▼]                                │
│                                                         │
│  ── 오늘의 추천 키워드 ──                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  ⭐ 밀리의서재 구독                               │   │
│  │  검색량 12,400 · 경쟁 낮음                        │   │
│  │  💡 검색량 높고 경쟁 적어요. 지금 포스팅 추천!    │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ── 전체 키워드 (223,456개) ──                          │
│  [검색: ________] [정렬: 검색량 순 ▼]                   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │  전자책 추천            8,700  [경쟁: 중간]       │   │
│  │  PC 2,100 · 모바일 6,600                         │   │
│  ├──────────────────────────────────────────────────┤   │
│  │  독서앱 비교            5,200  [경쟁: 낮음]       │   │
│  │  PC 1,800 · 모바일 3,400                         │   │
│  └──────────────────────────────────────────────────┘   │
│  ... (무한스크롤 — 스크롤 시 다음 50개 자동 로드)       │
└─────────────────────────────────────────────────────────┘
```

### 10.3 구현 방식

| 기능 | 구현 |
|------|------|
| 무한스크롤 | cursor-based pagination + `IntersectionObserver` (sentinel div). react-window는 불필요 — cursor pagination이 이미 점진적 로드 |
| 추천 키워드 섹션 | `GET /api/partner/keywords?program_id=X&featured_only=true&limit=10` 별도 호출 — 상단 고정 |
| 전체 키워드 | `GET /api/partner/keywords?program_id=X&sort=volume&limit=50` — 스크롤 시 cursor로 next 호출 |
| 검색 | 입력 → 300ms debounce → `&search=입력값` 파라미터 추가 → 결과 대체 |
| 경쟁도 뱃지 | 낮음: 초록, 중간: 노란, 높음: 빨간 (기존 v1 유지) |
| 캐시 미조회 | `cached_at`이 null → "검색량 준비 중" 회색 텍스트 |
| memo 표시 | `memo_public = true`인 키워드만 "마케터 메모" 말풍선으로 표시. `false`면 비표시 |

### 10.4 모바일 UX

| 항목 | 대응 |
|------|------|
| 카드 레이아웃 | 모바일 1열, 태블릿 2열, PC 3열 |
| 추천 섹션 | 가로 스크롤 카드 (모바일에서 공간 절약) |
| 검색 | full-width 상단 고정 |
| 정렬 | BottomSheet 방식 |

---

## 11. 전략적 가이드 콘텐츠

### 11.1 경쟁도별 힌트 메시지

is_featured 키워드 + 경쟁도 기반으로 카드 하단에 표시:

**경쟁도 낮음 + is_featured**
```
💡 광고주 추천! 검색량 높고 경쟁 적은 키워드예요.
제목에 이 키워드를 넣고, 상세한 후기 중심으로 작성하면 상위 노출 가능성이 높아요.
```

**경쟁도 중간**
```
📝 꾸준히 쓰면 효과 있는 키워드예요.
최신 정보나 개인 경험을 더하면 차별화돼요.
```

**경쟁도 높음**
```
⚡ 경쟁이 치열해요.
"키워드 + [지역/상황]" 롱테일로 차별화하세요.
예: "밀리의서재 구독" → "밀리의서재 구독 취소 방법"
```

### 11.2 "이렇게 활용하세요" 접이식 가이드

키워드 탭 상단에 접이식 섹션으로 제공 (v1과 동일 내용).

---

## 12. 환경 변수

| 변수명 | 용도 | 필수 여부 |
|-------|------|---------|
| `NAVER_API_ACCOUNTS` | 멀티 계정 JSON 배열 (§17.4 참조) | 선택 (우선 사용) |
| `NAVER_SEARCH_AD_API_KEY` | 네이버 검색광고 API 라이선스 키 (단일 계정 레거시) | 선택 (NAVER_API_ACCOUNTS 없을 때 fallback) |
| `NAVER_SEARCH_AD_SECRET` | 네이버 검색광고 API 시크릿 (단일 계정 레거시) | 선택 |
| `NAVER_SEARCH_AD_CUSTOMER_ID` | 네이버 검색광고 고객 번호 (단일 계정 레거시) | 선택 |

---

## 13. API 라우트 전체 목록

| Method | Path | 용도 | 인증 |
|--------|------|------|------|
| `GET` | `/api/partner/keywords` | 파트너 키워드 조회 (cursor pagination) | Partner session |
| `POST` | `/api/advertiser/keywords` | 단건 키워드 추가 | Advertiser session |
| `PATCH` | `/api/advertiser/keywords/[id]` | 키워드 수정 (is_featured, memo 등) | Advertiser session |
| `DELETE` | `/api/advertiser/keywords/[id]` | 단건 삭제 | Advertiser session |
| `POST` | `/api/advertiser/keywords/bulk` | CSV/JSON 대량 업로드 | Advertiser session |
| `DELETE` | `/api/advertiser/keywords/bulk` | 벌크 삭제 | Advertiser session |
| `POST` | `/api/cron/refresh-keyword-volumes` | 네이버 검색량 순차 갱신 | Vercel Cron secret |

---

## 14. 빈 상태 & 엣지 케이스

### 14.1 키워드 미등록 (파트너 화면)

```
┌──────────────────────────────────────┐
│         🎯 (Target 아이콘)           │
│                                      │
│   아직 등록된 키워드가 없어요         │
│   [프로그램명] 광고주가 추천 키워드를  │
│   준비 중이에요. 조금만 기다려주세요. │
└──────────────────────────────────────┘
```

### 14.2 네이버 API 미연동 (fallback)

- 키워드 이름 표시, 검색량 영역에 "검색량 준비 중" 회색 텍스트
- 경쟁도 뱃지 숨김, 추천 기준은 `is_featured` 기반으로만 동작
- 광고주에게: "네이버 API 연동이 필요합니다" 배너

### 14.3 대량 업로드 실패

- 10만 건 중 중간에 실패 시: 이미 삽입된 배치는 유지, 실패 배치부터 재시도 안내
- 잘못된 CSV 포맷: 첫 10행 파싱 후 에러 즉시 반환 (전체 처리 전)

---

## 15. Risks and Mitigation

| 리스크 | 영향도 | 대응 방안 |
|-------|--------|---------|
| 100만 건 검색 쿼리 느림 | High | pg_trgm GIN 인덱스 + cursor pagination으로 해결. EXPLAIN ANALYZE로 검증 |
| 네이버 API 무료 한도 소진 | Medium | 멀티 계정 로테이션(§17)으로 N배 처리량 확보. 유료 전환 시 추가 10배 |
| 100만 건 전체 갱신 160일 (단일) | Medium | 멀티 계정 5개 → 32일, 10개 → 16일. featured 키워드는 항상 7일 주기 보장 |
| CSV 업로드 타임아웃 (Vercel 60초) | High | 클라이언트에서 1,000행 배치 분할 → 순차 API 호출. 서버 단일 요청은 1,000행 이하 |
| 광고주가 100만 건 등록 후 프로그램 삭제 | Low | `ON DELETE CASCADE` — 프로그램 삭제 시 키워드 자동 삭제 |

---

## 16. 구현 단계

### Phase 1 — DB + API 기반 (추정 2일)
- [ ] Migration 029 실행
- [ ] 단건 CRUD API 4개
- [ ] Bulk upload API (CSV + JSON)
- [ ] 파트너 조회 API (cursor pagination + search)

### Phase 2 — 광고주 UI (추정 1.5일)
- [ ] 프로그램 설정 내 키워드 탭
- [ ] CSV 업로드 UI (drag & drop, 진행률)
- [ ] 태그 입력 (기존 UX 유지)
- [ ] is_featured 토글 + memo 인라인 편집
- [ ] 무한스크롤 키워드 목록

### Phase 3 — 파트너 UI (추정 1일)
- [ ] 사이드바 "키워드" 탭 추가
- [ ] 추천 키워드 상단 섹션
- [ ] 무한스크롤 전체 키워드 목록
- [ ] 검색 + 정렬

### Phase 4 — 네이버 API 연동 + 멀티 계정 (추정 1.5일)
- [ ] 네이버 검색광고 API 클라이언트 (`src/lib/naver-search-ad.ts`)
- [ ] `getNaverCredentialsPool()` 멀티 계정 로드 (§17.6)
- [ ] 일별 할당 + fallback 로테이션 로직 (§17.5)
- [ ] Cron job 구현 (멀티 계정 분배 포함)
- [ ] 경쟁도 뱃지 + 힌트 메시지
- [ ] 전략 가이드 콘텐츠

---

## 17. 멀티 API 계정 로테이션

### 17.1 배경 (업데이트: 2026-04-09)

**공식 확인**: 네이버 검색광고 GitHub 이슈 #1049 (naver-searchad Collaborator 답변)
- **일일 호출 한도 없음** — 하루 전체 호출 횟수에 대한 고정 제한 없음
- **초당 20~30회 제한** (광고주 ID별) — 이를 초과하면 트래픽 제한 발생

→ 멀티 계정은 일일 한도 우회가 아닌 **병렬 처리 속도 향상** 목적으로만 의미 있음.

### 17.2 네이버 검색광고 API 한도 (공식 확인)

| 항목 | 값 |
|------|-----|
| 실제 엔드포인트 | `GET https://api.searchad.naver.com/keywordstool` |
| ~~api.naver.com~~ | 308 리다이렉트됨 → `api.searchad.naver.com` 사용할 것 |
| 일일 한도 | **없음** (공식 확인) |
| Rate limit | **초당 20~30회** (광고주 ID별) |
| 안전한 딜레이 | 100ms (초당 10req — 한도의 절반, 안전 마진 확보) |
| 배치 크기 | 요청당 최대 5개 키워드 |

### 17.3 단일 계정 처리 시간 (실제)

기준: 고유 키워드 1,000,000개, 딜레이 100ms

| 딜레이 | 초당 처리 | 1M 키워드 소요 | 비고 |
|--------|---------|--------------|------|
| 300ms | 16.7개/초 | **약 17시간** | 원 스펙 기준 |
| 100ms | 50개/초 | **약 5.5시간** | 권장 (한도의 1/3) |
| 50ms | 100개/초 | **약 2.8시간** | 한도 근접, 주의 |

> **단일 계정으로 1회 Cron 실행(1~17시간)에 100만 키워드 전량 처리 가능**
> 멀티 계정은 병렬로 속도를 N배 단축하는 선택적 최적화.

### 17.4 멀티 계정 병렬 처리 (선택적)

| 계정 수 | 병렬 처리 시 소요 (100ms 딜레이 기준) |
|---------|--------------------------------------|
| 1개 | 약 5.5시간 |
| 2개 | 약 2.8시간 |
| 5개 | 약 1.1시간 |

> 멀티 계정은 필수가 아님. 단일 계정으로 운영 시작 후 속도가 문제될 때 추가.

### 17.4 환경변수 설계

**JSON 배열 방식 채택** (개별 변수 방식은 계정 추가 시 코드 변경 필요):

```
NAVER_API_ACCOUNTS='[
  {"apiKey":"key1","secretKey":"secret1","customerId":"cust1"},
  {"apiKey":"key2","secretKey":"secret2","customerId":"cust2"},
  {"apiKey":"key3","secretKey":"secret3","customerId":"cust3"}
]'
```

기존 단일 변수와 하위 호환:
```
# 레거시 (단일 계정) — NAVER_API_ACCOUNTS가 없으면 이 값 사용
NAVER_SEARCH_AD_API_KEY=...
NAVER_SEARCH_AD_SECRET=...
NAVER_SEARCH_AD_CUSTOMER_ID=...
```

### 17.5 로테이션 전략

**일별 할당 + 실패 시 fallback** 방식 채택:

```
1. Cron 실행 시 갱신 대상 키워드 N개 조회
2. 계정 풀 로드: NAVER_API_ACCOUNTS 파싱 (없으면 단일 변수 fallback)
3. 키워드를 계정 수로 균등 분배:
   - 계정 A: 키워드 0~4999
   - 계정 B: 키워드 5000~9999
   - 계정 C: 키워드 10000~14999
4. 각 계정별 순차 처리 (5개씩 배치, 300ms 간격)
5. 특정 계정이 한도 초과(429) → 해당 계정의 남은 키워드를 다음 계정에 재할당
6. 모든 계정 소진 → 남은 키워드는 다음 날로 이월
```

Round-robin(요청마다 계정 교체)은 rate limit 추적이 복잡해지므로 일별 할당이 단순하고 안정적.

### 17.6 `naver-search-ad.ts` 모듈 수정 방향

```typescript
// 기존 (단일 계정)
export function getNaverCredentials(): NaverCredentials | null

// 수정 (멀티 계정)
interface NaverCredentials {
  apiKey: string;
  secretKey: string;
  customerId: string;
}

export function getNaverCredentialsPool(): NaverCredentials[] {
  // 1. NAVER_API_ACCOUNTS JSON 배열 파싱 시도
  // 2. 없으면 단일 변수(NAVER_SEARCH_AD_*) fallback → 1개짜리 배열 반환
  // 3. 둘 다 없으면 빈 배열
}

export function splitKeywordsByAccount(
  keywords: string[],
  pool: NaverCredentials[]
): Map<NaverCredentials, string[]> {
  // 균등 분배
}
```

### 17.7 계정별 사용량 추적

별도 DB 테이블은 불필요. Cron 실행 로그에 `{ account: "cust1", processed: 5000, failed: 3 }` 형태로 기록하면 충분. 문제 발생 시 로그로 추적.

---

## 18. memo 공개/비공개 정책

### 18.1 개요

`memo` 필드에 `memo_public` 토글을 추가하여, 광고주가 키워드별로 메모를 파트너에게 공개할지 선택한다.

### 18.2 동작 정의

| `memo_public` | 광고주 화면 | 파트너 화면 |
|--------------|-----------|-----------|
| `false` (기본) | 메모 표시 + "비공개" 라벨 | 메모 미표시 |
| `true` | 메모 표시 + "공개" 라벨 | "마케터 메모" 말풍선으로 표시 |

### 18.3 광고주 UI 변경

키워드 카드의 메모 영역에 "공개 여부" 토글 추가:

```
┌─────────────────────────────────────────────┐
│  ⭐ 밀리의서재 구독           12,400  낮음   │
│  메모: 2월 집중 공략 [편집]                  │
│  공개 여부: [🔒 비공개 | 🔓 공개]  ← 토글   │
└─────────────────────────────────────────────┘
```

- 토글 변경 시 `PATCH /api/advertiser/keywords/[id]` 호출 (`memo_public: true/false`)
- CSV 업로드에도 `memo_public` 컬럼 지원 (선택, 기본값 false)

### 18.4 파트너 UI — 마케터 메모 말풍선

`memo_public = true`이고 `memo`에 값이 있는 키워드만:

```
┌──────────────────────────────────────────────┐
│  ⭐ 밀리의서재 구독           12,400  낮음    │
│  PC 2,100 · 모바일 10,300                    │
│  ┌─────────────────────────────────────┐     │
│  │ 💬 마케터 메모: 2월 집중 공략 키워드. │     │
│  │    체험 후기 중심으로 작성 추천      │     │
│  └─────────────────────────────────────┘     │
└──────────────────────────────────────────────┘
```

- 말풍선 스타일: `bg-blue-50 border-l-4 border-blue-400 p-3 rounded-r`
- `memo_public = false`이거나 `memo`가 비어있으면 말풍선 영역 자체 미렌더링

### 18.5 API 변경

| API | 변경 내용 |
|-----|----------|
| `GET /api/partner/keywords` | 응답에 `memo` 필드 추가. `memo_public = false`이면 `null` 반환 |
| `PATCH /api/advertiser/keywords/[id]` | `memo_public` 필드 수정 가능 |
| `POST /api/advertiser/keywords/bulk` | CSV/JSON에 `memo_public` 컬럼 지원 |

### 18.6 CSV 포맷 업데이트

```csv
keyword,is_featured,memo,memo_public
밀리의서재 구독,true,2월 집중 공략,true
전자책 추천,,,
독서앱 비교,true,브랜드팀 요청,false
```

---

## 19. Success Criteria

- [ ] 10만 건 CSV 업로드 30초 이내 완료
- [ ] 100만 건 키워드에서 검색 응답 200ms 이내 (인덱스 히트)
- [ ] 파트너 키워드 탭 첫 로드 1초 이내
- [ ] Cron 1회 실행으로 만료 키워드 전량 갱신 (100ms 딜레이, 약 5.5시간)
- [ ] is_featured 키워드 7일 이내 데이터 보장
- [ ] 모바일 반응형 정상 동작

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 1.0 | 2026-04-08 | 초안 작성 (30개 태그 방식) | cse7600 |
| 2.0 | 2026-04-08 | 100만 건 대응 아키텍처 재설계: 무제한 등록, CSV 대량 업로드, cursor pagination, pg_trgm 검색, 인라인 캐시, Cron 순차 갱신, is_featured/memo 추가, BigQuery 불필요 결정 | cse7600 |
| 2.1 | 2026-04-08 | memo_public 공개/비공개 토글 추가 (§18), 멀티 API 계정 로테이션 설계 (§17) | cse7600 |
| 2.2 | 2026-04-09 | 네이버 API 공식 확인: 일일 한도 없음, 초당 20~30req 제한. 실제 엔드포인트 api.searchad.naver.com. 1M 키워드 단일 계정 5.5시간 처리 가능. 멀티 계정 불필요(선택적). 160일 추정 전면 수정. | cse7600 |

---

## 빌드 이력

| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|---------|--------------|------|
| 2026-04-09 | production | Migration 029 DB 적용 완료. API 7개(단건 CRUD, bulk, 파트너 조회, Cron) + 파트너 키워드 탭(/dashboard/keywords) + 광고주 키워드 관리(/advertiser/keywords) 구현. 네이버 searchad 유틸 생성. 사이드바 양쪽 탭 추가. | 성공 |
