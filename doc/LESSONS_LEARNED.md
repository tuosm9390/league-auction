작성일: 2026-03-05 16:50:00
작성자: Antigravity

# Lessons Learned (프롬프트 교훈)

> 명확하고 단호한 어조로 작성된 AI 에이전트 행동 지침 및 금기 사항들의 아카이브 문서입니다.
> 에이전트는 코드 작성 시 이 문서에 기술된 모든 법칙을 반드시 메모리에 유지하고 준수해야 합니다.

### 규칙 1 — Optimistic Update 의무화 (시간에 민감한 Server Action)

> **시간에 민감한 상태(타이머, 입찰 결과 등)를 변경하는 Server Action은 반드시 변경된 값을 반환해야 하며, 클라이언트는 Supabase 실시간 이벤트를 기다리지 않고 해당 반환값으로 즉시 Store를 업데이트(Optimistic Update)해야 한다.**

**배경**: `startAuction`과 `placeBid`는 DB에 `timer_ends_at`을 쓰지만 반환값이 `{ error?: string }`뿐이었다. 클라이언트는 Supabase CDC → WebSocket → 클라이언트 경로(300~600ms)를 기다려야 했고, 그 사이 DB에선 이미 타이머가 흐르는 반면 UI는 멈춰있는 버그가 발생했다.

**적용 패턴**:

```typescript
// ✅ 올바른 패턴 — Server Action이 변경값을 함께 반환
export async function startAuction(...): Promise<{ error?: string; timerEndsAt?: string }> {
  // DB 업데이트 후
  return { timerEndsAt }  // 실제 저장된 값을 그대로 반환
}

// Client-side: 실시간 이벤트를 기다리지 않고 즉시 반영
const res = await startAuction(roomId, duration)
if (res.timerEndsAt) setRealtimeData({ timerEndsAt: res.timerEndsAt })
```

**잘못된 패턴**:

```typescript
// ❌ 잘못된 패턴 — 클라이언트가 실시간 이벤트만 믿음
export async function startAuction(...): Promise<{ error?: string }> {
  await db.update({ timer_ends_at: timerEndsAt })
  return {}  // 클라이언트는 300~600ms 후 WebSocket 이벤트로만 알 수 있음
}
```

**검사 기준**: 새 Server Action을 작성할 때 "이 변경이 UI에 즉시 반영되어야 하는가?"라는 질문을 먼저 던져라. 그렇다면 반환값에 변경된 상태를 포함시켜라.

### 규칙 2 — RLS 강화 시 anon 직접 쓰기 전수 검사 의무화 (2026-03-03)

> **RLS 정책을 강화(INSERT/UPDATE/DELETE 차단)하기 전에, 반드시 코드베이스 전체에서 `supabase.from(...).insert/update/delete`를 검색하여 anon key로 직접 DB에 쓰는 코드를 모두 찾아낸다. 발견된 모든 직접 쓰기를 service_role 경유 Server Action으로 교체한 후에야 RLS 정책을 배포한다. RLS 정책과 애플리케이션 코드는 반드시 동시에 배포해야 한다.**

**배경**: ChatPanel과 useAuctionControl이 `supabase.from('messages').insert()`로 anon key 직접 쓰기를 수행하고 있었다. SELECT-only RLS를 배포하면 이 쓰기가 차단되어 채팅 기능이 중단된다. RLS 변경과 Server Action 전환을 동시에 수행함으로써 이 문제를 예방했다.

**검사 명령**: `grep -r "supabase\.from\(.*\)\.\(insert\|update\|delete\)" src/` — Server Action 파일(`auctionActions.ts`) 이외의 파일에서 결과가 나오면 즉시 Server Action으로 전환하라.

### 규칙 3 — Zustand Dead State 방지 (2026-03-04)

> **Zustand store에 새 상태를 추가하거나 `set()` 호출을 추가할 때, `useAuctionStore(s => s.새상태명)` 패턴으로 해당 상태를 읽는 소비자가 존재하는지 반드시 grep으로 확인하라. 쓰기만 있고 읽기가 없는 "dead state"는 동명의 로컬 변수와 무음 충돌을 일으켜 버그를 유발한다.**

**배경**: `isReAuctionRound`가 여러 곳에서 `setReAuctionRound(true)`로 쓰였지만, `RoomClient.tsx`는 동명의 로컬 변수(`unsoldPlayers.length > 0 && waitingPlayers.length === 0`)를 사용했다. 재경매 전환 직후 로컬값이 `false`가 되어 타이머 duration이 5초 → 10초로 잘못 계산됐다.

### 규칙 4 — Store 상태 제거 시 소비자 전환 선행 의무 (2026-03-04)

> **Zustand store에서 상태를 제거할 때는, 반드시 먼저 `grep -r "상태명" src/`로 모든 소비 위치를 파악하고, 각 소비자를 로컬 상태나 props로 전환한 뒤에 store에서 제거해야 한다. 제거와 소비자 전환을 동시에 하지 않으면 TypeScript 빌드 에러가 발생한다.**

**배경**: `isReAuctionRound`가 여러 곳에서 `setReAuctionRound(true)`로 쓰였지만, `RoomClient.tsx`는 동명의 로컬 변수(`unsoldPlayers.length > 0 && waitingPlayers.length === 0`)를 사용했다. 재경매 전환 직후 로컬값이 `false`가 되어 타이머 duration이 5초 → 10초로 잘못 계산됐다.

## [2026-03-09 16:04:12] 폰트 시스템 구축 규칙
- **AI 행동 지침**: CSS 수정 시 @import 규칙은 항상 파일의 가장 처음에 배치해야 하며, 특수문자가 많은 설정 파일은 부분 치환보다 전체 구조를 재작성하는 것이 안전하다.

## [2026-03-09 16:37:53] PowerShell 파일 경로 주의사항
- **AI 행동 지침**: 대괄호([])가 포함된 경로를 다룰 때는 반드시 -LiteralPath를 사용해야 하며, UI 가시성 작업 시에는 gray-400 이하의 연한 색상 사용을 금지한다.

## [2026-03-09 16:51:30] UI 컴포넌트 디자인 통일 규칙
- **AI 행동 지침**: 동일 페이지 내의 제어 패널들은 반드시 동일한 시각적 뼈대(Layout Backbone)를 공유해야 한다.

## [2026-03-09 17:40:48] 버튼 디자인 통합 규칙
- **AI 행동 지침**: 프로젝트 내 모든 버튼은 반드시 pixel-button과 같은 공통 유틸리티 클래스를 기반으로 작성하며, 인라인 보더 스타일링을 지양한다.

- 2026-03-09: 윈도우 환경 코드 수정 시 라인별 매칭 수정 방식을 우선하여 환경 차이에 의한 실패를 방지한다.

- 2026-03-09: 숫자형 필드의 조건부 렌더링 시 0을 고려하여 typeof === 'number'를 습관화한다.

- 2026-03-09: 셀 내 다중 정렬 시 absolute 배치를 통한 레이아웃 고정화 기법을 활용한다.

- 2026-03-09: 나란히 배치된 버튼은 동일한 조형 규격(그림자, 테두리 등)을 공유하여 UI 일관성을 확보한다.

- 2026-03-09: 디자인 시스템의 일관성을 위해 신규 UI 작업 시 기존의 대표 컴포넌트 스타일을 벤치마킹한다.

- 2026-03-09: 픽셀 테마에서는 스크롤바 등 브라우저 기본 UI도 각진 형태와 테두리를 갖추도록 커스텀 스타일을 적용한다.
