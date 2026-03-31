# Plan: TiptapEditor Paste Upgrade

## Overview
광고주 이벤트 작성 폼(TiptapEditor)에서 Google Docs/Markdown 텍스트 붙여넣기 시 서식이 유실되는 문제 해결.

## Problem Statement
- 현재 `handlePaste`는 이미지 붙여넣기만 처리
- Google Docs에서 복사한 HTML은 Tiptap StarterKit이 기본 파싱하나, 일부 서식(배경색, 특수 span) 누락 가능
- Markdown 텍스트(`**bold**`, `# heading`, `- list`) 붙여넣기 시 plain text로 삽입됨

## Solution
1. **Markdown 붙여넣기 지원**: plain text에 Markdown 패턴 감지 시 → Markdown→HTML 변환 후 Tiptap에 삽입
2. **Google Docs HTML 개선**: Tiptap 기본 HTML 파싱은 이미 동작하므로, 추가 정리(불필요한 span/style 제거) 정도만 보완
3. **안전한 fallback**: 변환 실패 시 plain text로 안전 삽입

## Implementation
- `marked` 라이브러리로 Markdown→HTML 변환 (lightweight, 널리 사용)
- `handlePaste` 확장: HTML 없이 plain text만 있을 때 Markdown 패턴 감지 → 변환 → `editor.commands.insertContent(html)`
- HTML이 있으면 Tiptap 기본 처리에 위임 (이미 잘 동작)

## Scope
- 파일: `src/components/editor/TiptapEditor.tsx`
- 신규 의존성: `marked` (Markdown parser)
- 영향 범위: 광고주 이벤트 작성 폼만

## Acceptance Criteria
- Google Docs 복사 붙여넣기 시 굵게/이탤릭/제목/목록 서식 유지
- Markdown 텍스트 붙여넣기 시 `**bold**` → 굵게, `# 제목` → 제목 변환
- 일반 텍스트 붙여넣기 정상 동작
- 빌드 에러 없음
