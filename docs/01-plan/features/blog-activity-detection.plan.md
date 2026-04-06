# 블로그 활동 자동 감지 (Blog Activity Detection)

**작성일**: 2026-04-02  
**상태**: 구현 중  
**우선순위**: P1

## 배경 및 목적
파트너(주로 네이버 블로거)가 프로그램에 참여하여 게시물을 작성했는지 자동으로 감지하고,
활동 링크를 복수로 등록·관리할 수 있는 기능이 필요하다.

현재 `partners.activity_link`는 단수(1개)만 지원하며, 자동 감지 기능이 없어
Admin이 수동으로 확인해야 하는 비효율이 있다.

## 핵심 요구사항

### 1. 활동 링크 복수 지원
- 파트너당 여러 개의 활동 링크 등록 가능
- 링크마다: URL, 제목(선택), 자동감지 여부, 발견일시

### 2. 블로그 자동 검색 (반자동)
- Admin이 "블로그 검색" 버튼 클릭
- 파트너의 `main_channel_link`에서 블로그 ID 추출
- 참여 프로그램의 키워드로 검색
- 결과 미리보기 → Admin이 선택하여 등록

### 3. 검색 방식
**방법 A (블로그 내부 검색, 우선):**
`https://blog.naver.com/{blogId}/search?query={keyword}`
- 해당 블로그 내에서만 검색
- 파트너 ID와 자동 매칭됨
- Bot detection 가능성 낮음

**방법 B (네이버 블로그 섹션 검색, 보조):**
`https://search.naver.com/search.naver?ssc=tab.blog.all&query={keyword}`
- 전체 네이버 블로그에서 검색
- 파트너 블로그 ID로 필터링 필요

### 4. 지원 채널
- 네이버 블로그 (1차)
- 향후 확장: 티스토리, 인스타그램 등

## DB 스키마

### 신규 테이블: `partner_activity_links`
| 컬럼 | 타입 | 설명 |
|------|------|------|
| id | uuid PK | |
| partner_id | uuid FK(partners) | |
| program_id | uuid FK(programs) nullable | 어떤 프로그램 활동인지 |
| url | text NOT NULL | 게시물 URL |
| title | text | 게시물 제목 |
| auto_detected | boolean DEFAULT false | 자동 감지 여부 |
| discovered_at | timestamptz | 발견/등록 시점 |
| created_at | timestamptz DEFAULT now() | |

### 기존 `partners.activity_link` 처리
- 마이그레이션 시 기존 값을 `partner_activity_links`로 복사
- `partners.activity_link` 컬럼은 deprecated (삭제는 추후)

## API 설계

### Admin API
- `GET /api/admin/partners/[id]/activity-links` - 목록 조회
- `POST /api/admin/partners/[id]/activity-links` - 수동 추가
- `DELETE /api/admin/partners/[id]/activity-links/[linkId]` - 삭제
- `POST /api/admin/partners/[id]/scan-blog` - 블로그 자동 검색

### 광고주 API
- `GET /api/advertiser/partners/[id]/activity-links` - 목록 조회
- `POST /api/advertiser/partners/[id]/activity-links` - 수동 추가
- `DELETE /api/advertiser/partners/[id]/activity-links/[linkId]` - 삭제

## UI 요구사항

### Admin 파트너 상세
- 활동 링크 섹션: 링크 목록 + 추가/삭제 버튼
- "블로그 자동 검색" 버튼 → 로딩 → 결과 목록 → 체크박스 선택 → 등록

### 광고주 파트너 상세
- 활동 링크 섹션: 링크 목록 + 수동 추가/삭제

## 구현 순서
1. DB Migration (027)
2. TypeScript 타입 추가
3. Admin API (activity-links CRUD + scan-blog)
4. 광고주 API (activity-links CRUD)
5. Admin UI 업데이트
6. 광고주 UI 업데이트

## 빌드 이력
| 날짜 | 빌드 유형 | 변경 내용 | 결과 |
|------|---------|---------|------|
| 2026-04-02 | production | DB migration 027, API 5개, Admin/광고주 UI 복수 활동링크 + 블로그 자동 검색 구현 | 성공 |

## 테스트 이력
| 날짜 | 테스트 대상 | 결과 | 에러 수 | 경고 수 | 주요 발견 | 조치 |
|------|-----------|------|--------|--------|---------|------|
