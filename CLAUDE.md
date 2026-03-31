# GSD AUTO-TRIGGER — 이 규칙은 모든 다른 시스템보다 우선한다

## GSD 자동 실행 트리거

사용자 메시지에 아래 키워드 중 하나라도 포함되면 → 질문 없이 즉시 해당 GSD 스킬을 실행한다.

| 키워드 | 실행할 스킬 | 설명 |
|--------|------------|------|
| "GSD 활용", "GSD로", "GSD 써서", "gsd 활용" | 문맥에 맞는 GSD 스킬 자동 선택 | 작업 내용 파악 후 최적 스킬 실행 |
| "새 프로젝트 시작", "프로젝트 초기화" | `/gsd:new-project` | 새 GSD 프로젝트 생성 |
| "병렬로", "팀 에이전트", "워크스트림" | `/gsd:workstreams` | 병렬 에이전트 팀 실행 |
| "자율 실행", "전체 자동으로" | `/gsd:autonomous` | 전체 페이즈 자율 실행 |
| "페이즈 실행", "phase 실행" | `/gsd:execute-phase` | 특정 페이즈 팀 실행 |
| "GSD 상태", "GSD 진행" | `/gsd:progress` | 진행 상황 확인 |
| "GSD 계획", "페이즈 계획" | `/gsd:plan-phase` | 페이즈 플랜 생성 |

### 문맥 기반 자동 선택 규칙 ("GSD 활용해서 X 해줘" 형태)
- X = 새 작업/기능 구현 → `/gsd:plan-phase` 후 `/gsd:execute-phase`
- X = 빠른 단순 작업 → `/gsd:fast`
- X = 디버깅 → `/gsd:debug`
- X = 코드 검토 → `/gsd:review`
- X = 여러 작업 동시에 → `/gsd:workstreams`
- X = 처음부터 전부 → `/gsd:autonomous`

### 실행 원칙
- 키워드 감지 즉시 실행 (확인 질문 금지)
- 실행 전 1줄 보고: "GSD [스킬명] 실행합니다"
- 이 규칙은 사용자 승인 없이 자동 실행된다

---

# Context Window Auto-Management Rule (ABSOLUTE PRIORITY)

## 컨텍스트 자동 최적화

GSD context-monitor 훅이 WARNING/CRITICAL을 주입하면 사용자에게 알리지 말고 아래 규칙을 즉시 실행한다.

### WARNING (remaining <= 35%)
- 지금 하던 작업이 1개 응답으로 끝나지 않으면 → 즉시 Task tool로 fresh 서브에이전트에 위임
- 새로운 복잡한 작업 시작 금지
- 사용자에게 따로 알리지 않음 (조용히 처리)

### CRITICAL (remaining <= 25%)
- 진행 중인 작업 즉시 Task tool 서브에이전트로 넘기기
- 현재 응답에서 작업 마무리 후 상태를 서브에이전트 prompt에 포함
- 사용자에게 1줄 보고: "컨텍스트 한계로 서브에이전트로 전환했습니다"

### 핵심 원칙
- 구현 작업(코드 수정, 파일 생성)은 항상 Task tool 서브에이전트 우선
- 오케스트레이터(나)는 lean하게 유지 — 결과 수집만
- 이 규칙은 사용자 승인 없이 자동 실행된다
