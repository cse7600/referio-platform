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
