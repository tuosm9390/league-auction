작성일: 2026-03-05 15:52:00
작성자: Antigravity

# GEMINI.md (Hub)

This file provides guidance to Gemini when working with code in this repository.

> **Note**: 본 문서는 핵심 정보만을 담은 경량 허브입니다. 도메인별 세부 기술 명세 및 구조는 하단의 `## 📚 Architecture Modules` 링크를 참고하십시오.
> "모르는 내용이거나 불확실한 내용이 있다면 코드 수정을 시도하기 전에 반드시 사용자(나)에게 물어보세요."

---

## ⚙️ 문제 해결 완료 후 필수 워크플로우 (Post-Problem-Solving Workflow)

**모든 문제 해결이 완료된 직후, 사용자 승인 없이 아래 절차를 자동으로 실행한다.**

1. **회고 분석**: 이번 작업에서 "무엇이 작동했고 무엇이 실패했는지(What worked / What didn't work)"를 구체적으로 분석한다.
2. **핵심 규칙 도출**: 분석을 바탕으로 향후 동일한 실수를 반복하지 않기 위한 핵심 규칙 1가지를 명확하고 단호한 문장으로 도출한다.

3. **COMMON_MISTAKES.md 저장**: 프로젝트 루트 내의 `doc/COMMON_MISTAKES.md` 파일에 작업 시간을 작성하고,

```
방금 직면했던 복잡한 에러와 그 해결 과정을 COMMON_MISTAKES.md에 업데이트하려고 해. 네가 직접 이 문제를 분석하고 향후 똑같은 실수를 반복하지 않기 위한 'Lessons Learned(학습한 교훈)' 문서를 작성해 줘.
다음 4가지 항목을 반드시 포함하여 마크다운 형식으로 작성해라:
이슈 요약 (The Problem): 우리가 어떤 기능을 구현하려 했고, 어떤 구체적인 에러(또는 버그)가 발생했는지 요약할 것.
실패한 접근법 (What didn't work): 에러를 해결하기 위해 처음 시도했던 방식들은 무엇이었으며, 왜 그 방식들이 실패했는지(Root Cause) 설명할 것.
최종 해결책 (What worked): 최종적으로 문제를 어떻게 해결했는지 구체적인 코드 패턴이나 구조적 변경 사항을 명시할 것.
AI 행동 지침 (Lessons Learned & New Rules): 이 경험을 바탕으로, 앞으로 네가 코드를 작성할 때 절대 하지 말아야 할 행동과 반드시 지켜야 할 새로운 규칙을 1~2문장으로 추출해 줘. 이 규칙은 우리의 프로젝트 RULES.md에 추가할 수 있을 만큼 명확하고 단호해야 해."
```

이 내용을 프롬프트로 사용하여 문서를 작성한다. 기존 내용을 수정하지 않고, 하단에 누적시키며 작성한다.

4. **LESSONS_LEARNED 저장**: 프로젝트 루트 `doc/LESSONS_LEARNED.md` 하단에 상위 항목의 `AI 행동 지침 (Lessons Learned & New Rules)` 규칙을 직접 추가(Append)한다. 작업 시간을 작성한다.
5. **보고**: 저장 완료 후 사용자에게 요약 보고한다.

---

## Commands

```bash
npm run dev           # Start dev server (http://localhost:3000)
npm run build         # Production build (runs type-check)
npm run lint          # ESLint
npm run test          # Vitest (단위 테스트)
npm run test:watch    # Vitest watch mode
npm run test:coverage # Vitest coverage report
```

Tests live in `__tests__/` (Vitest + Testing Library + jsdom).

## Environment

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

`SUPABASE_SERVICE_ROLE_KEY`는 Server Actions (`auctionActions.ts`)의 서버사이드 권한 검증에 필수. Vercel 배포 환경 변수에도 동일하게 추가 필요.

`src/lib/supabase.ts` falls back to placeholder strings (with `console.warn`) if env vars are missing — useful for local type-checking without a real Supabase project.

---

## 🍌 프로젝트 개요

**League of Legends internal match auction system** (League Auction 🍌). Korean UI. Minion-themed.
배포 URL: `https://minionsbid.vercel.app` (프로젝트명: Minions Bid)

## 📚 Architecture Modules

세부적인 시스템 구조 및 정책은 아래의 모듈화된 문서를 참고하십시오:

| Document                 | Description                                                              |
| ------------------------ | ------------------------------------------------------------------------ |
| `doc/ARCHITECTURE.md`    | 기술 스택, 전체 디렉토리 구조, 인증 모델(Auth), 전체 Data Flow           |
| `doc/DATABASE.md`        | Database Schema(6개 테이블), RLS 정책, Migration 정보                    |
| `doc/AUCTION_LOGIC.md`   | `auctionActions.ts` (Server Actions) 리스트 및 경매 핵심 비즈니스 로직   |
| `doc/COMPONENTS.md`      | Key Components 설명, Zustand 상태(`useAuctionStore`), 실시간 동기화 패턴 |
| `doc/SECURITY.md`        | CSP, Middleware, 보안 헤더, 취약점 대응, SEO 셋업                        |
| `doc/CONVENTIONS.md`     | 코드 베이스 내 확립된 규칙, 모바일 반응형 디자인, Tailwind 컬러 선언     |
| `doc/LESSONS_LEARNED.md` | AI 에이전트 행동 지침, 금기 사항, 새로 학습한 프롬프트 교훈 아카이브     |
