# GEMINI.md

이 파일은 리그 옥션(League Auction / Minions Bid) 프로젝트에서 AI 에이전트가 코드를 다룰 때 참조해야 하는 **엔트리 포인트(Entry Point) 및 라우터(Router)** 역할을 합니다. 과거의 방대한 `GEMINI.md`는 AI의 컨텍스트 손실을 방지하기 위해 `doc/rules/` 하위에 도메인별로 모듈화되었습니다.

---

## 🧭 모듈화된 규칙 로드 지침 (Dynamic Routing Instructions)

에이전트는 앞으로 모든 작업을 수행할 때, **자신이 작업 중인 파일 경로와 성격에 따라 아래의 분할된 마크다운 규칙 파일들을 스스로 판별하여 우선적으로 읽어야(load) 합니다.**

### 1. 절대 규칙 (항상 적용 - Core)

다음 파일들은 작업 범위와 상관없이 가장 높은 우선순위로 준수되어야 합니다.

- `[doc/rules/core/hard-walls.md](doc/rules/core/hard-walls.md)` : 3-Strike 룰, 보안 가이드라인(RLS, CSP), 상태 관리 절대 원칙
- `[doc/rules/core/user-profile.md](doc/rules/core/user-profile.md)` : 소통 언어(한국어) 및 시니어 개발자 페르소나, 태도
- `[doc/rules/core/workflows.md](doc/rules/core/workflows.md)` : 문제 해결 후 회고 절차 및 개발 모드 준수 사이클

### 2. 공통 지식 (설정 및 구조 작업 시 - Shared)

프로젝트 전반적인 설정이나 스키마, 아키텍처 결정을 내릴 때 참조하십시오.

- `[doc/rules/shared/tech-stack.md](doc/rules/shared/tech-stack.md)` : 프론트 및 백엔드 스택, 실행/테스트 명령어, 환경변수 설정
- `[doc/rules/shared/architecture.md](doc/rules/shared/architecture.md)` : 디렉토리 구조, 데이터 플로우, DB 스키마 종합 개요
- `[doc/rules/shared/conventions.md](doc/rules/shared/conventions.md)` : Server Action 변이, 타이머 로직 분산 방지 등 주요 코딩 컨벤션

### 3. 클라이언트 영역 (기능별 UI/로직 연동 시 - Client)

`src/features/` 등 특정 UI 및 비즈니스 로직을 다룰 때 적절한 문서를 선택하여 읽으십시오.

- `[doc/rules/client/auction-logic.md](doc/rules/client/auction-logic.md)` : 서버 액션별 목적, 타이머 상수, Optimistic Update 필수 요건
- `[doc/rules/client/auth-state.md](doc/rules/client/auth-state.md)` : HttpOnly 쿠키 기반 인증 구조, 방 참여 역할(ROLE) 관리 등
- `[doc/rules/client/ui-ux.md](doc/rules/client/ui-ux.md)` : 주요 컴포넌트 목록, 브랜드 컬러(커스텀 테일윈드 설정), 모바일 반응형 원칙 및 SEO

---

## 🛠️ 새로 학습한 교훈 기록 방식 (New Lessons Workflow)

1. 문제를 해결한 후 도출한 '새로운 규칙'은 더 이상 이 `GEMINI.md` 파일에 기록하지 마십시오.
2. 해결 과정은 `doc/COMMON_MISTAKES.md`에 이슈/실패접근론/해결책/규칙 형태로 누적 저장합니다.

### 다음 4가지 항목을 반드시 포함하여 마크다운 형식으로 작성해라:

- 이슈 요약 (The Problem): 우리가 어떤 기능을 구현하려 했고, 어떤 구체적인 에러(또는 버그)가 발생했는지 요약할 것.
- 실패한 접근법 (What didn't work): 에러를 해결하기 위해 처음 시도했던 방식들은 무엇이었으며, 왜 그 방식들이 실패했는지(Root Cause) 설명할 것.
- 최종 해결책 (What worked): 최종적으로 문제를 어떻게 해결했는지 구체적인 코드 패턴이나 구조적 변경 사항을 명시할 것.
- AI 행동 지침 (Lessons Learned & New Rules): 이 경험을 바탕으로, 앞으로 네가 코드를 작성할 때 절대 하지 말아야 할 행동과 반드시 지켜야 할 새로운 규칙을 1~2문장으로 추출해 줘. 이 규칙은 우리의 프로젝트 RULES.md에 추가할 수 있을 만큼 명확하고 단호해야 해."

3. **LESSONS_LEARNED 저장**: 프로젝트 루트 `doc/LESSONS_LEARNED.md` 하단에 상위 항목의 `AI 행동 지침 (Lessons Learned & New Rules)` 규칙을 직접 추가(Append)한다. 작업 시간을 작성한다.
4. 최종적으로 도출된 행동 규칙은 `doc/rules/` 하위의 **성격에 맞는 개별 모듈 파일**을 찾아 그곳에 직접 업데이트(Append) 하십시오. (예: UI 관련이면 `ui-ux.md`에 추가)
