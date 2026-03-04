# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

4. **CLAUDE.md 저장**: 프로젝트 루트 `CLAUDE.md` 하단의 `## 🧠 새로 학습한 교훈 (Lessons Learned)` 섹션에 상위 항목의 `AI 행동 지침 (Lessons Learned & New Rules)` 규칙을 직접 추가(Append)한다. 작업 시간을 작성하고, 섹션이 없으면 새로 만든다.
5. **MEMORY.md 동기화**: `MEMORY.md`에도 동일 내용을 반영한다. 5. **보고**: 저장 완료 후 사용자에게 요약 보고한다.

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

## Architecture

**League of Legends internal match auction system** (League Auction 🍌). Korean UI. Minion-themed.
배포 URL: `https://minionsbid.vercel.app` (프로젝트명: Minions Bid)

### Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (custom colors in `globals.css` via `@theme`)
- Zustand v5 for global state (`src/features/auction/store/useAuctionStore.ts`)
- Supabase for DB, realtime, and presence tracking
- Framer Motion for animations (lottery slot machine, etc.)
- Lucide React for icons
- xlsx@0.18.5 for Excel file import (player registration)

### Directory Structure

```
src/
  app/
    api/room-auth/route.ts   # Auth Route Handler (쿠키 설정, path: '/room/${roomId}', maxAge: 8h)
    room/[id]/
      page.tsx               # Server Component (쿠키 읽기 전용)
      RoomClient.tsx         # Client Component (경매 전체 UI + 실시간 구독)
    layout.tsx               # OG/Twitter 메타데이터, Dynamic Rendering 강제
    page.tsx                 # Home page (hero + how-to-use + modals)
    globals.css              # Tailwind v4 @theme + global styles
    robots.ts                # SEO robots 설정
    sitemap.ts               # SEO 사이트맵
    favicon.ico
  features/auction/
    api/        auctionActions.ts  # 'use server' + getServerClient() (service_role). verifyOrganizer/verifyLeader/verifyAnyRole 서버사이드 검증 포함.
    components/ AuctionBoard, TeamList (UnsoldPanel도 export), ChatPanel, BiddingControl,
                LinksModal, HowToUseModal, EndRoomModal,
                AuctionResultModal, LotteryAnimation
    hooks/      useAuctionControl.ts, useAuctionRealtime.ts, useRoomAuth.ts
    store/      useAuctionStore.ts
  components/   공통 컴포넌트 (CreateRoomModal, AuctionArchiveSection, ArchiveModalWrapper)
  middleware.ts # 동적 CSP Nonce 생성 + 보안 헤더 (Next.js 16에서 deprecated 경고 있으나 동작함)
  lib/
    supabase.ts
    supabase-server.ts  # 서버 전용 service_role 클라이언트 (getServerClient())
    utils.ts    # cn() utility (clsx + tailwind-merge)
__tests__/
  auctionActions.test.ts
  CreateRoomModal.test.tsx
  optimization.test.ts
  setup.ts
supabase/
  migrations/
    00001_init.sql                         # Initial DB schema
    00002_add_room_creation_fields.sql     # members_per_team, leader info, player description
    00003_realtime_fix.sql                 # REPLICA IDENTITY FULL + publication
    00004_create_auction_archives.sql      # auction_archives 테이블 생성
    00009_server_time_and_selfbid_fix.sql  # get_server_time() RPC + place_bid_secure RPC
    00010_rls_policies.sql                 # SELECT-only RLS (anon 쓰기 차단, writes via service_role)
    00011_award_player_atomic.sql          # award_player_atomic RPC (FOR UPDATE 락 + 단일 트랜잭션)
    00100_full_schema.sql                  # 전체 스키마 재생성용 참조 파일
    00101_award_player_atomic.sql          # 00011과 동일 내용 (00100 이후 실행용)
```

### Auth Model

No Supabase Auth. **HttpOnly 쿠키 기반** 인증:

1. 공유 링크 형식: `/api/room-auth?roomId={id}&role=ORGANIZER&token={token}`
   - LEADER: `&teamId={teamId}` 추가
   - VIEWER: `role=VIEWER`
2. `/api/room-auth` Route Handler가 **역할+팀ID별 고유 쿠키** 설정 후 role/teamId를 URL 파라미터에 포함해 리다이렉트
   - 쿠키 이름: `room_auth_{roomId}_ORGANIZER` / `room_auth_{roomId}_LEADER_{teamId}` / `room_auth_{roomId}_VIEWER`
   - 쿠키 속성: `httpOnly: true`, `secure: true` (production), `sameSite: 'lax'`, `path: '/room/${roomId}'`, `maxAge: 8h`
   - 리다이렉트 URL 예: `/room/{roomId}?role=LEADER&teamId={teamId}`
3. `page.tsx` (Server Component): `searchParams.role`/`searchParams.teamId`로 쿠키 이름 결정 → 쿠키 파싱 → `RoomClient`에 `role`, `teamId` props 전달
4. `useRoomAuth` 훅: 단순화됨. `setRoomContext` 호출만 수행. `effectiveRole = role`, `isTokenChecked = true` 즉시 반환.
5. Guard UI: `effectiveRole === null`이면 차단 화면 표시 (URL 파라미터 없이 직접 접근 시)

**토큰 검증 없음** (의도적 결정 — 지인용 내부 툴). **같은 브라우저에서 여러 팀장 탭을 열어도 쿠키가 충돌하지 않음.**

### Data Flow

```
Server Action (auctionActions.ts)
  → DB write (getServerClient / service_role)
  → broadcastEvent() via after()  ← non-blocking, 3s AbortController timeout
      ↓ REST API
Supabase Realtime — single channel `auction-{roomId}`
  ↕ Broadcast STATE_UPDATE  (<100ms, 전체 방 상태 스냅샷)
  ↕ Broadcast CLOSE_LOTTERY  (추첨 모달 닫기 동기화)
  ↕ Presence               (팀장 접속 현황, heartbeat 30~60s)
Zustand store (useAuctionStore)
  → React components
```

**Broadcast-primary 아키텍처**: CDC(postgres_changes) 및 3초 폴링 완전 제거. `auction-{roomId}` 단일 채널로 Broadcast + Presence 통합. `useAuctionRealtime(roomId)` (`src/features/auction/hooks/useAuctionRealtime.ts`)가 모든 구독을 관리하며 `RoomClient.tsx`에서 1회 호출. 재연결(SUBSCRIBED) 시 `fetchAll()` 1회 — 비연결 구간 동안 놓친 상태 복원. `fetchAll` 반환값으로 `useAuctionControl`에서 예외 복구 경로로 사용 가능.

### Database Schema (6 tables)

RLS 정책: anon은 SELECT만 허용. INSERT/UPDATE/DELETE는 service_role(Server Actions)만 가능 (migration `00010`). Must have `REPLICA IDENTITY FULL` set and be in the `supabase_realtime` publication (migration `00003`).

Migrations must be run manually in Supabase SQL Editor (not via CLI).

- **rooms**: id, name, total_teams, base_point, members_per_team, timer_ends_at, current_player_id, organizer_token, viewer_token
  - Note: `order_public` column was added in `00002` but is no longer used in UI
- **teams**: id, room_id, name, point_balance, leader_token, leader_name, leader_position, leader_description, captain_points
- **players**: id, room_id, name, tier, main_position, sub_position, status (`WAITING`/`IN_AUCTION`/`SOLD`/`UNSOLD`), team_id, sold_price, description
- **bids**: id, room_id, player_id, team_id, amount, created_at
- **messages**: id, room_id, sender_name, sender_role (`ORGANIZER`/`LEADER`/`VIEWER`/`SYSTEM`/`NOTICE`), content, created_at
- **auction_archives**: id, room_id, room_name, room_created_at, closed_at, result_snapshot (JSONB). Stores permanent post-auction results.

### Auction Logic (`src/features/auction/api/auctionActions.ts`)

`'use server'` Server Actions. `getServerClient()` (service_role key, RLS 우회)로 DB 조작. **토큰/역할 검증 없음** (지인용 내부 툴). 제거된 항목: `isValidUUID`, `verifyOrganizer`, `verifyLeader`, `verifyAnyRole`, `sendLotteryClosedMessage`. 추가된 항목: `sendChatMessage`, `sendNotice`, `RoomStatePayload` 타입.

Timer constants: `AUCTION_DURATION_MS = 10_000`, `EXTEND_THRESHOLD_MS = 5_000`, `EXTEND_DURATION_MS = 5_000`.

| Function                                     | Purpose                                                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drawNextPlayer(roomId)`                     | Picks random `WAITING` player → `IN_AUCTION`, sets `current_player_id` (no timer yet)                                                                                                       |
| `startAuction(roomId, durationMs?)`          | Sets `timer_ends_at = now + 10s` (or custom), sends system message                                                                                                                          |
| `pauseAuction(roomId)`                       | Sets `timer_ends_at = null` (on team leader disconnect), sends warning system message                                                                                                       |
| `resumeAuction(roomId)`                      | Sets `timer_ends_at = now + 5s` (on reconnect), sends resume message                                                                                                                        |
| `sendChatMessage(roomId, name, role, content)` | Inserts message via service_role; broadcasts STATE_UPDATE |
| `sendNotice(roomId, content)`                | ORGANIZER 전용 공지. NOTICE role로 메시지 삽입 + STATE_UPDATE |
| `placeBid(roomId, playerId, teamId, amount)` | Validates 10P units, point balance, team capacity, timer active (**0.5s** tolerance), not already top bidder; inserts bid; extends timer to 5s if <5s remaining                             |
| `awardPlayer(roomId, playerId)`              | **Idempotent** — `award_player_atomic` RPC (FOR UPDATE 락). SOLD 또는 UNSOLD 처리 + `timer_ends_at=null` + `current_player_id=null`. 최신 `RoomStatePayload` 반환 + `after()`로 broadcast 비동기 전파. |
| `draftPlayer(roomId, playerId, teamId)`      | Assigns `UNSOLD` or `WAITING` player to team at 0P (free contract). Validates room membership and team capacity.                                                                            |
| `restartAuctionWithUnsold(roomId)`           | Converts all `UNSOLD` → `WAITING` for re-auction                                                                                                                                            |
| `deleteRoom(roomId)`                         | Invalidates tokens first (room rename + new tokens), then deletes bids → messages → players → teams → room                                                                                  |
| `saveAuctionArchive(payload)`                | Saves final results snapshot to `auction_archives` table. `ArchiveTeam`, `AuctionArchivePayload` 타입은 이 파일 상단에 인라인 정의.                                                         |

**Auto-award on timer expiry**: ORGANIZER 클라이언트만 `setTimeout(delay + 800ms grace)`로 `awardPlayer` 호출. `awardLock` ref로 동일 클라이언트 내 이중 실행 방지. `playersRef`로 stale closure 방지. 성공 시 `result.state`로 즉시 `setRealtimeData`, 예외 시 `fetchAll()` fallback.

**Post-auction UNSOLD handling:**

- 소수 빈자리: ORGANIZER가 팀별로 `draftPlayer` 호출 (자유계약 영입). WAITING 선수도 가능.
- 다수 빈자리: `restartAuctionWithUnsold` → 재경매

**`handleNotice` (공지 전송)**: `RoomClient.tsx` 내부에서 `sendNotice` Server Action 호출. 서버사이드에서 ORGANIZER 역할 검증 후 DB INSERT.

### Key Components

- `RoomClient` (`room/[id]/RoomClient.tsx`) — Client Component. 경매 UI 전체 + `useAuctionRealtime` 호출.
- `CreateRoomModal` (`src/components/`) — 4-step modal: (0) basic info + previous rooms, (1) captain registration, (2) player registration (with Excel import), (3) links. Saves rooms to `localStorage` key `league_auction_rooms` (max 5). Includes sample data template button.
- `AuctionArchiveSection` (`src/components/`) — Displays past auction results from `auction_archives` table with filtering.
- `AuctionBoard` — Center panel. Shows captain connection grid (Presence-based) when idle, full auction UI when active. Contains `CenterTimer` (large countdown) and `NoticeBanner` (latest `NOTICE` message).
- `ChatPanel` — Realtime chat. `SYSTEM` messages show as gray italic pills; `NOTICE` messages show as amber banners.
- `BiddingControl` — Bid form with amount input and validation, shown to LEADER role. `storeTeamId` (쿠키 검증된 값, `useRoomAuth` 경유) 사용.
- `LinksModal` — ORGANIZER only; regenerates all invite links from store data.
- `HowToUseModal` — Usage guide, available in header for all roles.
- `EndRoomModal` — Room deletion confirmation with `saveAuctionArchive` + `deleteRoom` flow.
- `AuctionResultModal` — 경매 완료 후 최종 결과 테이블 모달.
- `LotteryAnimation` — 슬롯머신 추첨 애니메이션 (Framer Motion). `auction-{roomId}` 단일 채널 Broadcast `CLOSE_LOTTERY` 이벤트로 모달 닫기 동기화.
- `TeamList` — 좌측 사이드바: 팀 로스터. `UnsoldPanel`도 named export.

### Security (CSP / Middleware)

`src/middleware.ts`에서 요청마다 동적 Nonce 생성 (Next.js 16 deprecated 경고 있으나 동작함. 선택적 개선: `src/proxy.ts`로 파일명 변경):

```
crypto.randomUUID() → base64 → nonce
CSP 헤더: script-src 'self' 'nonce-{nonce}' 'strict-dynamic' 'unsafe-inline'
         (dev 모드에서는 'unsafe-eval' 추가)
connect-src: 'self' https://*.supabase.co wss://*.supabase.co
frame-ancestors: 'none'
object-src: 'none'
base-uri: 'none'
```

Middleware matcher: `/((?!api|_next/static|_next/image|favicon.ico).*)` + prefetch 요청 제외.

`next.config.ts` 보안 헤더 (CSP 제외, 미들웨어가 전담):

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains`

- `layout.tsx`에서 `headers()`를 호출해 Dynamic Rendering 강제 (정적 캐시 방지 → CSP nonce 불일치 에러 방지)
- **xlsx@0.18.5 known vulns**: Prototype Pollution (CVSS 7.8) + ReDoS (CVSS 7.5). No npm fix available. Low risk: client-side only, organizer uploads own files.

### SEO / 메타데이터

- `src/app/layout.tsx`: Open Graph / Twitter Cards 메타데이터, locale `ko_KR`, `themeColor: #FDE047`
- `src/app/robots.ts`: robots.txt 설정
- `src/app/sitemap.ts`: 사이트맵 자동 생성
- `public/thumbnail.png`: OG 이미지 1200×630 (소셜 공유 썸네일)
- `public/favicon.png` / `public/favicon.ico`

### 모바일 반응형

`RoomClient.tsx` Mobile-first 레이아웃:

- 기본(모바일): `flex-col` — 경매보드 → 채팅 → 팀리스트 순서
- `lg` 이상(데스크탑): 12칼럼 그리드 (팀리스트 3 | 경매보드 6 | 채팅 3)

### Custom Tailwind Colors

Defined in `src/app/globals.css` `@theme` block:

- `minion-yellow`: `#FBE042` / hover `#F2D214`
- `minion-blue`: `#2358A4` / hover `#194079`
- `minion-grey`: `#808080`
- `minion-skin`: `#FFC09A`

### Zustand Store (`src/features/auction/store/useAuctionStore.ts`)

**Types**: `Role` (`'ORGANIZER' | 'LEADER' | 'VIEWER' | null`), `PlayerStatus`, `MessageRole`, `PresenceUser`, `Team`, `Player`, `Bid`, `Message`.

**Key actions**:

- `setRoomContext()` — Set roomId, role, teamId. `isRoomLoaded`는 리셋하지 않음 — 로딩 화면 깜빡임 없음.
- `setRealtimeData()` — Merge partial DB state → `isRoomLoaded: true`로 설정
- `updatePlayer()` / `updateTeam()` — Immutable update by id
- `addBid()` / `addMessage()` — Append with dedup check
- `setRoomNotFound()` — Mark room as deleted/inaccessible
- `setReadyAnimationPlayed()` — Track one-shot animation
- `setReAuctionRound()` — Track if re-auction is active

### Realtime Subscription Strategy (`useAuctionRealtime.ts`)

**Broadcast-primary**: CDC(postgres_changes) 제거. Server Action이 DB 쓰기 후 전체 상태를 Broadcast로 전파.

| 이벤트 | 전략 |
| ------ | ---- |
| Broadcast `STATE_UPDATE` | `setRealtimeData(payload)` — 전체 방 상태 스냅샷 즉시 반영 |
| Broadcast `CLOSE_LOTTERY` | `setLotteryPlayer(null)` — 추첨 모달 닫기 |
| Presence `sync` | `setRealtimeData({ presences })` — 팀장 접속 현황 |
| 재연결 (`SUBSCRIBED`) | `fetchAll()` 1회 — 비연결 구간 놓친 상태 복원 |
| 초기 로드 | `fetchAll()` 1회 |

`fetchingRef` deduplication으로 동시 `fetchAll` 호출 방지. `fetchAll`은 rooms + teams + players + messages 병렬 조회 후 `current_player_id` 기준 bids 순차 조회 (5개 쿼리).

### Known Issues

- **낙찰 후 UI 반영 지연** (~1~1.5초): 타이머 `0` 표시 후 `CenterTimer`가 사라지기까지 grace(800ms) + Server Action 왕복 시간만큼 공백 발생. 의도된 설계이나 UX 개선 여지 있음 (처리 중 상태 표시 검토 중).
- 토큰 검증 없음 (의도적 결정 — 지인용 내부 툴).

### Key Conventions

- All Supabase mutations are done in `auctionActions.ts` (Server Actions), never inline in components.
- Components are role-gated: check `effectiveRole` from `useRoomAuth` before rendering controls.
- Never call `awardPlayer` more than once per auction cycle — use `awardLock` ref.
- Timer extension logic lives in `placeBid` Server Action (server-side check).
- `broadcastEvent` is always called via `after()` in Server Actions to avoid blocking the response.
- Path alias `@/*` maps to `src/*`.

---

## 🧠 새로 학습한 교훈 (Lessons Learned)

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

### 규칙 4 — Store 상태 제거 시 소비자 전환 선행 의무 (2026-03-04)

> **Zustand store에서 상태를 제거할 때는, 반드시 먼저 `grep -r "상태명" src/`로 모든 소비 위치를 파악하고, 각 소비자를 로컬 상태나 props로 전환한 뒤에 store에서 제거해야 한다. 제거와 소비자 전환을 동시에 하지 않으면 TypeScript 빌드 에러가 발생한다.**

**배경**: `isReAuctionRound`가 여러 곳에서 `setReAuctionRound(true)`로 쓰였지만, `RoomClient.tsx`는 동명의 로컬 변수(`unsoldPlayers.length > 0 && waitingPlayers.length === 0`)를 사용했다. 재경매 전환 직후 로컬값이 `false`가 되어 타이머 duration이 5초 → 10초로 잘못 계산됐다.
