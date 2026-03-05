작성일: 2026-03-05 15:52:00
작성자: Antigravity

# Architecture

이 문서는 League Auction (Minions Bid) 프로젝트의 전반적인 아키텍처와 스택, 인증 모델, 데이터 흐름에 대해 설명합니다.

**League of Legends internal match auction system** (League Auction 🍌). Korean UI. Minion-themed.
배포 URL: `https://minionsbid.vercel.app` (프로젝트명: Minions Bid)

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS v4 (custom colors in `globals.css` via `@theme`)
- Zustand v5 for global state (`src/features/auction/store/useAuctionStore.ts`)
- Supabase for DB, realtime, and presence tracking
- Framer Motion for animations (lottery slot machine, etc.)
- Lucide React for icons
- xlsx@0.18.5 for Excel file import (player registration)

## Directory Structure

```text
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
```

## Auth Model

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

## Data Flow

```text
Supabase DB
  ↕ postgres_changes subscriptions (via useAuctionRealtime)
  ↕ 3-second polling fallback
  ↕ Presence tracking (supabase.channel `presence:{roomId}`)
  ↕ Broadcast channel `lottery-{roomId}` (CLOSE_LOTTERY event sync)
Zustand store (useAuctionStore)
  → React components
```

`useAuctionRealtime(roomId)` (`src/features/auction/hooks/useAuctionRealtime.ts`) manages all subscriptions and is called once in `room/[id]/RoomClient.tsx`. It uses `useCallback` for `fetchAll` stability so it can be safely used in both subscriptions and a `setInterval`.
