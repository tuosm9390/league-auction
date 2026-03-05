# 🚀 GEMINI.md 모듈화 최적화 프롬프트

이 문서는 거대해진 `GEMINI.md` 파일을 3티어 구조로 분리하여 에이전트의 컨텍스트 효율을 극대화하기 위한 지침입니다.

---

## 🎯 목표
`GEMINI.backup.md`의 내용을 분석하여 상시 로드되는 핵심 규칙(Core), 프로젝트 공통 패턴(Shared), 특정 영역별 상세 로직(Client)으로 분리하고, `GEMINI.md`를 이 모듈들을 연결하는 라우터로 재작성한다.

## 🛠️ 실행 지침

### 1. 디렉토리 구조 생성
다음 구조로 폴더를 생성하라:
- `doc/rules/core/`
- `doc/rules/shared/`
- `doc/rules/client/`

### 2. 모듈 분리 및 파일 생성
`GEMINI.backup.md`의 내용을 다음 규칙에 따라 분리하여 저장하라:

#### [Core Tier] - 상시 참조
- `doc/rules/core/hard-walls.md`: 절대 금기 사항 (3-Strike 규칙, 보안, DOM 조작 금지 등)
- `doc/rules/core/user-profile.md`: 사용자 역할(시니어 개발자), 언어(한국어), 코드 스타일 선호도
- `doc/rules/core/workflows.md`: 문제 해결 후 회고 절차, TDD 사이클, 커밋 절차

#### [Shared Tier] - 프로젝트 전반
- `doc/rules/shared/tech-stack.md`: 기술 스택(Next.js 16, Zustand 5, Tailwind v4), 환경 변수 설정
- `doc/rules/shared/architecture.md`: 프로젝트 구조, 데이터 흐름도, DB 스키마 상세
- `doc/rules/shared/conventions.md`: 명명 규칙, 경로 별칭(@/*), 공통 컨벤션

#### [Client Tier] - 영역별 로드 (Glob 기반)
- `doc/rules/client/auction-logic.md`: 서버 액션, 입찰 검증, 타이머 로직 (`src/features/auction/api/**`)
- `doc/rules/client/auth-state.md`: 쿠키 인증, Zustand 스토어 구조, 실시간 구독 (`src/features/auction/hooks/**`, `src/features/auction/store/**`)
- `doc/rules/client/ui-ux.md`: 컴포넌트 구조, SEO, 반응형 디자인 (`src/components/**`, `src/app/room/**`)

### 3. GEMINI.md (Router) 재작성
`GEMINI.md`의 기존 내용을 모두 지우고 아래 형식을 참고하여 라우팅 지침으로 대체하라:

```markdown
# GEMINI.md (Router)

당신은 작업을 시작하기 전, 아래 규칙에 따라 작업 범위와 관련된 모듈을 반드시 읽어야 합니다.

## 🚨 최우선 규칙 (상시 로드)
작업 종류와 관계없이 항상 아래 파일을 읽고 준수하십시오.
- `doc/rules/core/hard-walls.md`
- `doc/rules/core/user-profile.md`
- `doc/rules/core/workflows.md`

## 📂 영역별 동적 로드 (Dynamic Loading)
수정하려는 파일의 경로에 따라 아래 추가 컨텍스트를 로드하십시오.

- **아키텍처 또는 환경 설정 변경 시**:
  - `doc/rules/shared/tech-stack.md`
  - `doc/rules/shared/architecture.md`

- **경매 로직 및 서버 액션 수정 시** (`src/features/auction/api/**`):
  - `doc/rules/client/auction-logic.md`

- **상태 관리 및 인증 수정 시** (`store/**`, `hooks/**`):
  - `doc/rules/client/auth-state.md`

- **UI 컴포넌트 및 스타일 수정 시** (`components/**`, `app/**`):
  - `doc/rules/client/ui-ux.md`
```

### 4. 검증
- 모든 파일이 생성되었는지 확인하라.
- `GEMINI.md`가 간결해졌으며, 에이전트가 지침에 따라 특정 모듈을 읽는지 테스트하라.
