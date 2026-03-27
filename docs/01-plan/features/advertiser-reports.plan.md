# 광고주 리포트 탭 — Plan

## 개요
광고주가 파트너 실적 보고서를 작성, 저장, PDF 다운로드할 수 있는 리포트 탭

## 요구사항
- 사이드바에 "리포트" 탭 추가 (`/advertiser/reports`)
- 노션 스타일 에디터 (Tiptap 기반): 제목, 본문, 표, 이미지, 서식
- 실시간 데이터 위젯 삽입: 파트너 현황, 리퍼럴 현황, 정산 현황, TOP 파트너
- PDF 다운로드 (html2pdf.js)
- 리포트 저장/목록 조회 (Supabase reports 테이블)

## 구현 파일
- `src/app/advertiser/reports/page.tsx` — 메인 페이지 (목록/편집/조회)
- `src/app/advertiser/reports/report-editor.tsx` — 노션 스타일 에디터
- `src/app/advertiser/reports/report-viewer.tsx` — 읽기 전용 뷰어
- `src/app/api/advertiser/reports/route.ts` — CRUD API
- `src/app/api/advertiser/reports/[id]/route.ts` — 개별 리포트 API
- `src/app/api/advertiser/reports/stats/route.ts` — 실시간 통계 API
- `supabase/migrations/020_reports.sql` — DB 마이그레이션

## DB 스키마
```sql
reports (
  id UUID PK,
  advertiser_id UUID FK → advertisers.id,
  title TEXT,
  content JSONB,       -- Tiptap JSON
  report_data JSONB,   -- 저장 시점 통계 스냅샷
  is_template BOOLEAN,
  created_at, updated_at
)
```

## 빌드 이력
| 날짜 | 빌드 유형 | 변경 내용 요약 | 결과 |
|------|----------|--------------|------|
| 2026-03-27 | production | 리포트 탭 초기 구현 — 에디터, PDF, CRUD API | 성공 |
| 2026-03-27 | production | 통계 Admin 클라이언트 전환(RLS 버그 수정), Tiptap 커스텀 StatBlock 노드, Sticky 사이드바, 고품질 보고서 템플릿(7섹션+실데이터 테이블) | 성공 |
