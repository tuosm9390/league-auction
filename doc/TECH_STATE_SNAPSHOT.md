# 💾 TECH_STATE_SNAPSHOT (Session Handover)

## 1. Where are we? (현재 진행 상황)

- **완료된 작업**:
  1. **코드베이스 정비**: `CLAUDE.md` 및 `MEMORY.md`를 현재 커밋(`abe6710`) 기준 실제 코드 상태에 맞게 전면 업데이트 완료.
  2. **저장소 초기화**: 로컬 및 GitHub 원격 저장소를 `abe6710` 커밋 상태로 hard reset + force push 완료.
  3. **원격 URL 수정**: GitHub 저장소명 변경 감지 → remote origin을 `https://github.com/tuosm9390/minionsbid.git`으로 업데이트 완료.
  4. **권한 검증 로직 점검**: 경매방 입장 ~ 팀장 권한 동작까지 전체 흐름 코드 리뷰 완료. 6개 버그 발견.
  5. **P0/P1 버그 수정 완료** (빌드 통과 확인):

  | #   | 위치                                            | 수정 내용                                                                                                                                                                       |
  | --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | 1   | `src/app/api/room-auth/route.ts`                | `path: '/'` → `path: '/room/${roomId}'` + `maxAge: 8h` 추가                                                                                                                     |
  | 2   | `src/features/auction/store/useAuctionStore.ts` | `setRoomContext`에서 `isRoomLoaded: false` 리셋 제거                                                                                                                            |
  | 2   | `src/features/auction/hooks/useRoomAuth.ts`     | 검증 실패 시 `setRoomContext` 재호출 제거, 의존성 배열 정리                                                                                                                     |
  | 3   | `src/lib/supabase-server.ts`                    | 신규 생성 — service_role key 기반 서버 전용 클라이언트                                                                                                                          |
  | 3   | `src/features/auction/api/auctionActions.ts`    | `'use server'` + `getServerClient()` 전환 + `verifyOrganizer/verifyLeader/verifyAnyRole` 추가 + `isValidUUID` 검증 + `sendChatMessage/sendNotice/sendLotteryClosedMessage` 추가 |
  | 4   | `src/app/room/[id]/RoomClient.tsx`              | `handleNotice` → `sendNotice` Server Action 전환, `supabase` import 제거                                                                                                        |

- **현재 상태**: 경매 로직 보안 강화 및 버그 수정 계획 전체 완료. `npm run build` 통과. ⚠️ Supabase 마이그레이션(`00010`, `00011`) 수동 실행 대기 중.

- **이번 세션(2026-03-03)에 새로 완료된 작업**:

  | #   | 파일                                                | 수정 내용                                                                                                                                                                     |
  | --- | --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
  | S1  | `supabase/migrations/00010_rls_policies.sql`        | **신규** — SELECT-only RLS 정책 (anon 쓰기 차단)                                                                                                                              |
  | S2  | `supabase/migrations/00011_award_player_atomic.sql` | **신규** — 낙찰 원자 처리 RPC (`FOR UPDATE` 락 + 단일 트랜잭션)                                                                                                               |
  | S3  | `auctionActions.ts`                                 | `sendChatMessage` 추가, `drawNextPlayer` IN_AUCTION 가드, `placeBid` room_id 검증, `startAuction` 중복 타이머 방지, `awardPlayer` RPC 전환, `restartAuctionWithUnsold` 반환값 |
  | S4  | `ChatPanel.tsx`                                     | `supabase.from('messages').insert` → `sendChatMessage` Server Action                                                                                                          |
  | S5  | `useAuctionControl.ts`                              | `handleCloseLottery` anon INSERT → `sendChatMessage` Server Action                                                                                                            |
  | S6  | `route.ts`                                          | role 화이트리스트 + token DB 대조 (organizer/leader/viewer_token)                                                                                                             |
  | S7  | `page.tsx`                                          | `roleParam` 런타임 화이트리스트 검증                                                                                                                                          |
  | S8  | `useAuctionRealtime.ts`                             | 문자열 기반 `isReAuctionRound` 감지 제거                                                                                                                                      |
  | S9  | `AuctionBoard.tsx`                                  | `setReAuctionRound(true)` 직접 호출 (restartAuctionWithUnsold 반환값 기반)                                                                                                    |

- **잔존 미수정 항목** → **모두 후속 세션에서 완료** (R1~R3 전원 해소)

---

- **이번 세션(2026-03-04) — Broadcast-primary 전면 재작성 + 성능/안정성 개선**:

  | #   | 파일                    | 수정 내용                                                                                                                                              |
  | --- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
  | T1  | `useAuctionRealtime.ts` | **전면 재작성** — postgres_changes CDC 제거, 3초 폴링 제거. `auction-${roomId}` 단일 채널에 Broadcast `STATE_UPDATE` + `CLOSE_LOTTERY` + Presence 통합 |
  | T2  | `useAuctionRealtime.ts` | `fetchAll` 반환 (`return { fetchAll }`) — 외부(useAuctionControl)에서 예외 복구 경로로 사용 가능                                                       |
  | T3  | `auctionActions.ts`     | `after()` 도입 — `awardPlayer`의 `broadcastEvent` 호출을 응답 반환 후 백그라운드 실행으로 전환                                                         |
  | T4  | `auctionActions.ts`     | `RoomStatePayload` 타입 정의 + `awardPlayer` 반환값에 최신 DB 상태 포함 (Rule 1 Optimistic Update 패턴 적용)                                           |
  | T5  | `auctionActions.ts`     | `placeBid` tolerance: `+1000ms` → `+500ms`                                                                                                             |
  | T6  | `supabase-server.ts`    | `broadcastEvent`에 `AbortController` 3초 타임아웃 추가 — 이전엔 무한 대기 → Vercel 30초 함수 한계 도달 시 전체 Server Action 블로킹                    |
  | T7  | `useAuctionControl.ts`  | grace period `1500ms → 800ms` + `result.state` 즉시 `setRealtimeData` + `catch` 블록에 `fetchAll()` fallback 추가                                      |
  | T8  | `RoomClient.tsx`        | `useAuctionRealtime` 반환값에서 `fetchAll` 추출 → `useAuctionControl`에 전달                                                                           |

- **이번 세션에서 분석 완료 (미처리)**:
  - **낙찰 후 UI 반영 지연 원인 파악**: 타이머 `0` 표시 후 실제 상태 변경까지 ~1~1.5초 공백 발생. 원인: ① 800ms grace ② Server Action 왕복(~200~500ms) ③ `after()` broadcast 전파. `CenterTimer`는 `timerEndsAt`이 store에서 `null`이 될 때까지 사라지지 않아 사용자는 타이머 `0`이 정지된 채 대기하는 것처럼 인지.

## 2. What is the active stack? (활성 기술 스택)

- **Framework**: Next.js 16 (App Router) + React 19 + TypeScript
- **Styling**: Tailwind CSS v4 (`@theme` 커스텀 컬러 in `globals.css`)
- **State**: Zustand v5 (`src/features/auction/store/useAuctionStore.ts`)
- **DB / Realtime**: Supabase (postgres_changes + Presence)
- **Auth**: HttpOnly 쿠키 기반 (Supabase Auth 미사용) — `/api/room-auth` Route Handler
  - 쿠키 path: `/room/${roomId}` (방별 격리)
  - Server Actions에서 `cookies()` + `SUPABASE_SERVICE_ROLE_KEY`로 서버사이드 검증
- **Animation**: Framer Motion (슬롯머신 추첨 애니메이션)
- **Icons**: Lucide React
- **Excel Import**: xlsx@0.18.5 (선수 등록)
- **Deploy**: Vercel (`https://minionsbid.vercel.app`)

## 3. What is the next step? (다음 단계 및 최우선 목표)

- **목표**: 낙찰 후 UI 반영 지연 개선 (UX)

### 배경 — 지연 구조

```
[화면 타이머 = 0]
  ① +800ms grace (in-flight 입찰 대기)
  ② +200~500ms Server Action 왕복 (RPC + fetchRoomState)
  ③ ORGANIZER: setRealtimeData(result.state) 즉시 반영
     나머지: after() → broadcastEvent → WebSocket → setRealtimeData (+100~200ms)
```

타이머 0 표시 후 `timerEndsAt`이 store에서 `null`이 될 때까지 CenterTimer가 사라지지 않아 약 **1~1.5초** 동안 UI가 멈춘 것처럼 보임.

### 개선 옵션 3가지 (택 1 또는 조합)

| 옵션                                            | 내용                                                                                                                                            | 위험도           | 기대 개선                          |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------- |
| **[옵션 1] UX — 타이머 0 시 "처리 중..." 표시** | `CenterTimer` 또는 배너를 `timeLeftMs === 0` 시점에 "처리 중..." 상태로 교체. 로직 변경 없음.                                                   | 없음             | 지연은 그대로지만 사용자 인지 개선 |
| **[옵션 2] grace period 단축**                  | `800ms → 600ms`. 현재 `placeBid` tolerance 500ms 기준으로 안전 여유 100ms 확보. 네트워크 지연 큰 환경에서 in-flight 입찰 누락 가능성 소폭 증가. | 낮음             | 약 200ms 단축                      |
| **[옵션 3] fetchRoomState 제거**                | `award_player_atomic` RPC가 변경된 전체 상태를 JSONB로 반환하도록 확장 → `fetchRoomState` (5개 DB 쿼리) 왕복 제거. migration 변경 필요.         | 중간 (migration) | 약 200~400ms 단축                  |

**권장**: 옵션 1(즉시 적용, 리스크 없음) + 필요 시 옵션 2 병행.

### 그 외 잔존 작업

- `supabase/migrations/00010_rls_policies.sql`, `00011_award_player_atomic.sql`, `00101_award_player_atomic.sql` Supabase SQL Editor 수동 실행 확인
- 전체 E2E 흐름 테스트: 추첨 → 경매 → 낙찰/유찰 → 재경매 → 드래프트 → 방 종료
- 커밋 및 push

---

## 4. 경매 핵심 흐름 전체 분석 — 기능 재설계 전 사전 검토 (2026-03-03)

> **목적**: 경매 로직 1번 흐름(추첨 → 경매 시작)부터 전체를 새로 작업하기 위해, 현재 코드의 동작 구조·버그 포인트·보안 취약점을 파일별·단계별로 완전히 분석한다.

---

### 4-1. 전체 흐름 단계별 코드 경로 매핑

```
[STEP 0] 방 입장 (인증)
  URL: /api/room-auth?roomId=&role=&teamId=
  파일: src/app/api/room-auth/route.ts

[STEP 1] 페이지 렌더 (Server Component)
  파일: src/app/room/[id]/page.tsx
  → 쿠키 읽기 → roleParam / teamIdParam 결정 → RoomClient props

[STEP 2] 클라이언트 초기화
  파일: src/app/room/[id]/RoomClient.tsx
  → useRoomAuth (Zustand setRoomContext)
  → useAuctionRealtime (DB 구독 + 초기 fetchAll)
  → useAuctionControl (추첨 모달 + 자동 낙찰)

[STEP 3] 추첨
  UI: RoomClient.tsx "🎲 다음 선수 추첨" 버튼
  Action: src/features/auction/api/auctionActions.ts > drawNextPlayer()

[STEP 4] 추첨 애니메이션 (모달)
  Hook: useAuctionControl.ts — players 변경 감지 → lotteryPlayer set
  Component: AuctionBoard.tsx > LotteryAnimation
  Broadcast: supabase.channel(`lottery-{roomId}`) > CLOSE_LOTTERY

[STEP 5] 경매 시작
  UI: RoomClient.tsx "▶ 경매 시작" 버튼
  Action: auctionActions.ts > startAuction()
  Optimistic: setRealtimeData({ timerEndsAt }) 즉시 반영

[STEP 6] 입찰
  UI: BiddingControl.tsx (LEADER 전용)
  Action: auctionActions.ts > placeBid()
  Optimistic: res.newTimerEndsAt → setRealtimeData({ timerEndsAt })

[STEP 7] 자동 낙찰 (타이머 만료)
  Hook: useAuctionControl.ts — setTimeout(delay + 1500ms)
  Action: auctionActions.ts > awardPlayer() — 멱등성 보장

[STEP 8] 사이클 반복 or 종료 처리
  UNSOLD 드래프트: AuctionBoard.tsx > draftPlayer()
  재경매: AuctionBoard.tsx > restartAuctionWithUnsold()
  방 종료: RoomClient.tsx > handleEndRoom() → saveAuctionArchive() + deleteRoom()
```

---

### 4-2. STEP별 상세 코드 분석

#### STEP 0 — 방 입장 (`/api/room-auth/route.ts`)

**동작 요약**

- URL 파라미터에서 `roomId`, `role`, `teamId`를 추출
- 역할+팀ID 조합으로 **고유한 쿠키 이름** 생성: `room_auth_{roomId}_{ROLE}` 또는 `room_auth_{roomId}_LEADER_{teamId}`
- HttpOnly + Secure + SameSite=lax + path=`/room/{roomId}` + maxAge=8h 으로 쿠키 세팅
- 리다이렉트 URL: `/room/{roomId}?role={role}&teamId={teamId}`

**발견된 문제점**
| # | 종류 | 위치 | 내용 | 심각도 |
|---|------|------|------|--------|
| A1 | 보안 | route.ts:16 | `role` 파라미터를 DB에서 실제 역할과 대조하지 않음. 누구든 `?role=ORGANIZER`로 요청하면 ORGANIZER 쿠키 발급 | **P0 (보안)** |
| A2 | 보안 | route.ts:18 | `cookieSuffix`에 `role.toUpperCase()` 적용 시 입력값 미검증 — `role=ORGANIZER%20INJECTION` 같은 값이 쿠키 이름에 삽입될 수 있음 | P1 |
| A3 | 기능 | route.ts:9 | `teamId === 'undefined'` 문자열 처리는 있으나 숫자형 ID, 특수문자 포함 ID 등에 대한 UUID 포맷 검증 없음 | P2 |
| A4 | 보안 | route.ts:33 | 리다이렉트 URL을 `new URL(request.url)` 기반으로 생성 — 신뢰할 수 없는 Host 헤더를 그대로 사용하면 Open Redirect 가능 | P1 |

**수정 방향**

- `role`이 `'ORGANIZER' | 'LEADER' | 'VIEWER'` 세 값 중 하나인지 서버에서 검증
- LEADER인 경우 `teamId`가 실제 해당 방의 팀 ID인지 DB 조회로 확인
- 리다이렉트 URL 생성 시 `process.env.NEXT_PUBLIC_BASE_URL` 기반으로 절대 URL 구성

---

#### STEP 1 — 페이지 렌더 (`src/app/room/[id]/page.tsx`)

**동작 요약**

- `searchParams.role` 파라미터로 쿠키 이름을 결정하고, 해당 쿠키를 읽어 `roleParam` / `teamIdParam` 추출
- 쿠키가 없거나 파싱 실패 시 `role = null` → `RoomClient`에 `roleParam={null}` 전달 → 차단 화면

**발견된 문제점**
| # | 종류 | 위치 | 내용 | 심각도 |
|---|------|------|------|--------|
| B1 | 보안 | page.tsx:16 | `(resolvedSearchParams.role as Role)` — TypeScript 타입 캐스트만 하고 실제 값 검증 없음. `?role=HACKER` 입력 시 `cookieSuffix = 'HACKER'`가 되어 없는 쿠키를 조회하고 `role = null` 처리됨. 현재는 무해하지만 미래 코드 변경 시 위험. | P2 |
| B2 | 기능 | page.tsx:32 | 쿠키 파싱은 `try/catch`로 보호하지만, 파싱된 `parsed.role` 값이 실제 `Role` 타입에 속하는지 재확인하지 않음. 쿠키가 위변조된 경우 잘못된 role이 전달될 수 있음 (단, 쿠키는 httpOnly이므로 위변조 가능성 매우 낮음) | P3 |
| B3 | 기능 | page.tsx 전체 | `roomId`에 대한 UUID 형식 검증 없음. Supabase는 잘못된 UUID 쿼리 시 에러를 반환하나, 이를 처리하는 로직이 없음 (Supabase anon 쿼리는 빈 결과 반환으로 graceful하게 처리됨) | P3 |

**수정 방향**

- `roleParam` 값을 화이트리스트 배열 `['ORGANIZER', 'LEADER', 'VIEWER']`로 검증
- 쿠키에서 파싱한 `parsed.role`도 동일하게 검증
- `roomId`를 UUID regex로 검증하여 잘못된 요청 조기 차단

---

#### STEP 2 — 클라이언트 초기화 (`RoomClient.tsx` + 훅들)

**동작 요약**

1. `useRoomAuth` → `setRoomContext(roomId, role, teamId)` → Zustand에 역할 저장
2. `useAuctionRealtime(roomId)` → `fetchAll()` 즉시 실행 + Supabase 구독 시작
3. 구독 `SUBSCRIBED` 이벤트 시 `fetchAll()` 한 번 더 호출 (fetchingRef dedup으로 직렬화)
4. 3초 폴링 (`fetchPoll`) 시작

**Zustand Store의 초기 상태 흐름**

```
초기: isRoomLoaded=false, players=[], teams=[], ...
↓ setRoomContext() 호출 → roomId, role, teamId 저장 (isRoomLoaded 변경 없음)
↓ fetchAll() 완료 → setRealtimeData({...모든 데이터, isRoomLoaded: true})
↓ UI 렌더 시작 (로딩 화면 해제)
```

**발견된 문제점**
| # | 종류 | 위치 | 내용 | 심각도 |
|---|------|------|------|--------|
| C1 | 기능 | useAuctionRealtime.ts:102,163 | `fetchAll()`이 초기화 시 최대 2번 호출됨. `fetchingRef`가 첫 번째 호출 완료 후에야 두 번째를 허용하므로 두 번 모두 실행될 수 있음. 불필요한 DB 부하 발생. | P2 |
| C2 | 기능 | useAuctionRealtime.ts:176-194 | Presence 구독이 `role`이 없으면 실행 안 됨 (`if (!roomId \|\| !role) return`). Presence는 실시간으로 팀장 접속 현황을 보여주는데, role이 null인 관전자(URL 직접 접근 차단 화면)는 presence 없음 — 이는 의도된 동작이나 명시적 주석이 없음 | P3 |
| C3 | 성능 | useAuctionRealtime.ts:25-31 | `fetchAll`이 5개 테이블을 `Promise.all`로 동시 조회함. bids 전체를 가져오므로 경매가 길어질수록 페이로드가 증가. bids는 현재 경매 중인 playerId만 필요한데, 방 전체 bids를 조회 중. | P2 |
| C4 | 기능 | RoomClient.tsx:124 | `isAuctionActive = !!timerEndsAt && !isExpired` — 완전히 클라이언트 시계 기반. 클라이언트 시계가 서버보다 빠르면 타이머 만료 전에 입찰 불가 상태가 됨. 반대면 만료 후에도 입찰 시도 (서버에서 1초 오차 허용으로 방어 중) | P2 |
| C5 | 기능 | RoomClient.tsx:81-87 | `allConnected` 판정이 Presence 기반 — Supabase Presence는 30~60초 간격 heartbeat로 동작. 팀장이 브라우저를 닫아도 즉시 `offline`으로 감지되지 않을 수 있음 (최대 30초 지연). | P1 |

---

#### STEP 3 — 추첨 (`drawNextPlayer` Server Action)

**동작 요약**

- DB에서 `WAITING` 선수 전체 조회 → `Math.floor(Math.random() * waiting.length)`로 1명 선택
- `players.status = IN_AUCTION`, `rooms.current_player_id = player.id` 업데이트

**발견된 문제점 — 가장 많은 버그 밀집 구간**
| # | 종류 | 위치 | 내용 | 심각도 |
|---|------|------|------|--------|
| D1 | **버그 (레이스 컨디션)** | auctionActions.ts:76 | 이미 `IN_AUCTION` 선수가 있는지 확인하는 서버사이드 가드가 없음. `!currentPlayer` 체크는 클라이언트 UI에만 존재. 네트워크 지연이나 중복 클릭 시 두 선수가 동시에 `IN_AUCTION` 상태가 될 수 있음 | **P0** |
| D2 | **버그 (중복 추첨)** | auctionActions.ts:76 | 동일 요청을 빠르게 2번 보내면, 두 번 모두 같은 `WAITING` 목록을 읽어 다른 선수 2명을 `IN_AUCTION`으로 만들 가능성 있음. DB에 낙관적 잠금(optimistic lock) 또는 유니크 제약 없음 | **P0** |
| D3 | 보안 | auctionActions.ts:76 | ORGANIZER 역할 검증 없음 — roomId만 알면 누구든 호출 가능. 현재 CLAUDE.md에 "의도적 결정"으로 명시되어 있으나, 역할 파라미터를 Server Action에 받아 최소한 쿠키 검증을 추가하는 것이 권장됨 | P1 |
| D4 | 기능 | auctionActions.ts:88 | `Math.random()`은 서버 사이드에서 실행됨 — 공정한 추첨. 다만 동일 서버 인스턴스에서 seed 고정 공격에 이론적으로 취약 (실용적 위험 없음) | P3 |
| D5 | 기능 | auctionActions.ts:96-100 | `players.update`와 `rooms.update`가 별도 쿼리 — 두 쿼리 사이에 장애가 발생하면 `IN_AUCTION` 선수는 있는데 `current_player_id`가 null인 불일치 상태 발생 가능 | P1 |

**수정 방향 (D1, D2 — P0 우선 필수)**

```typescript
// 현재 코드 (문제)
const { data: waiting } = await db
  .from("players")
  .select("id, name")
  .eq("status", "WAITING");
const player = waiting[Math.floor(Math.random() * waiting.length)];
await db.from("players").update({ status: "IN_AUCTION" }).eq("id", player.id);

// 개선안 — 서버사이드 IN_AUCTION 가드 추가
const { data: alreadyActive } = await db
  .from("rooms")
  .select("current_player_id")
  .eq("id", roomId)
  .single();
if (alreadyActive?.current_player_id)
  return { error: "이미 경매 중인 선수가 있습니다." };

// 개선안 — DB 레벨 원자적 업데이트 (Supabase RPC 또는 트랜잭션 사용)
// players와 rooms를 단일 트랜잭션에서 업데이트 필요
```

---

#### STEP 4 — 추첨 애니메이션 (`useAuctionControl.ts` + `LotteryAnimation`)

**동작 요약**

- `players` 배열 변경 감지 → 이전엔 `IN_AUCTION` 없었는데 현재는 있으면 `lotteryPlayer` 설정
- `LotteryAnimation` 완료 후 ORGANIZER만 "경매 준비" 버튼 노출
- ORGANIZER 버튼 클릭 → `handleCloseLottery` → sysMsg 전송 + Broadcast `CLOSE_LOTTERY`
- 모든 클라이언트가 `CLOSE_LOTTERY` broadcast 수신 → `lotteryPlayer = null` → 모달 닫힘

**발견된 문제점**
| # | 종류 | 위치 | 내용 | 심각도 |
|---|------|------|------|--------|
| E1 | 기능 | useAuctionControl.ts:24-36 | `prevPlayersRef.current.length > 0` 조건 때문에, 페이지 새로고침 후 접속 시 이미 `IN_AUCTION` 선수가 있어도 추첨 애니메이션이 재실행되지 않음. 의도된 동작이나, 재접속자는 선수 정보를 직접 봐야 함. | P3 (의도된 동작) |
| E2 | 기능 | useAuctionControl.ts:52-68 | `handleCloseLottery`에서 `sysMsg` 전송 후 `broadcast` 전송 — sysMsg는 비동기 완료 대기 없이 즉시 broadcast 전송. 메시지 순서 보장이 약함. | P2 |
| E3 | 기능 | useAuctionControl.ts:63 | `supabase.channel(\`lottery-${roomId}\`).send(...)`호출 시 채널이 구독 상태인지 확인하지 않음. 채널 초기화 전에 호출되면 이벤트가 누락될 수 있음. | P2 |
| E4 | 기능 | AuctionBoard.tsx:271 |`LotteryAnimation`에 `candidates={waitingPlayers}` 전달 — drawNextPlayer 직후 waitingPlayers는 선택된 선수가 WAITING에서 빠진 상태. 슬롯머신 후보 목록이 실제 WAITING 선수들로만 구성됨. 선택된 선수가 candidates에서 보이다가 사라지는 UX 이슈 있을 수 있음. | P2 |

---

#### STEP 5 — 경매 시작 (`startAuction` Server Action)

**동작 요약**

- `current_player_id` 확인 → 선수 이름 조회 → `timer_ends_at = now + durationMs`
- 클라이언트에서 Optimistic Update: `setRealtimeData({ timerEndsAt })`

**발견된 문제점**
| # | 종류 | 위치 | 내용 | 심각도 |
|---|------|------|------|--------|
| F1 | **버그** | auctionActions.ts:106 | 이미 타이머가 실행 중인지(`timer_ends_at != null`) 확인하는 서버사이드 가드 없음. 중복 클릭이나 race로 `startAuction`이 2번 호출되면 타이머가 리셋됨 | P1 |
| F2 | 기능 | auctionActions.ts:123 | `timerEndsAt = new Date(Date.now() + duration).toISOString()` — **서버 시계** 기준으로 타이머 생성. 클라이언트와 최대 수백ms 차이 발생 가능. (현재 Optimistic Update로 어느 정도 완화됨) | P2 |
| F3 | 기능 | RoomClient.tsx:191-193 | `duration` 결정 로직 — `isReAuctionRound \|\| wasPausedByDisconnectRef.current ? 5000 : 10000`. 두 조건이 동시에 false여도 재경매 라운드가 맞는 상황이 있을 수 있음. `isReAuctionRound`는 "재경매 시작하기" 클릭 시가 아니라 메시지 content 문자열 감지로 설정됨 — 취약한 감지 방식 | P1 |

**수정 방향 (F1)**

```typescript
// 서버사이드 중복 실행 가드 추가 필요
const { data: room } = await db
  .from("rooms")
  .select("timer_ends_at")
  .eq("id", roomId)
  .single();
if (
  room?.timer_ends_at &&
  new Date(room.timer_ends_at).getTime() > Date.now()
) {
  return { error: "이미 경매가 진행 중입니다." };
}
```

---

#### STEP 6 — 입찰 (`placeBid` Server Action)

**현재 검증 체인 (서버사이드)**

1. amount 양의 정수 & 10P 단위 ✅
2. `timer_ends_at` 존재 & 만료 안 됨 (1초 오차 허용) ✅
3. `current_player_id === playerId` ✅
4. 동일 팀 최고 입찰자 재입찰 방지 ✅
5. 최소 입찰액 (최고가 + 10P) ✅
6. 팀 포인트 잔액 ✅
7. 팀 정원 초과 방지 ✅
8. 타이머 연장 (5초 이하 → 5초 연장) ✅

**발견된 문제점**
| # | 종류 | 위치 | 내용 | 심각도 |
|---|------|------|------|--------|
| G1 | 보안 | auctionActions.ts:164 | `teamId` 파라미터가 실제로 `roomId` 방에 속한 팀인지 검증하지 않음 — 다른 방의 teamId로 입찰 시도 가능. `teams.select('name').eq('id', teamId)`만 하고 `room_id` 일치는 확인 안 함 | **P0** |
| G2 | 보안 | auctionActions.ts:215-237 | 팀 정원 체크 시 `status === 'SOLD'`인 선수만 카운트 — `IN_AUCTION` 선수 (낙찰 예정)는 미포함. 극단적 race 상황에서 정원 1명 초과 가능 | P2 |
| G3 | 기능 | auctionActions.ts:197-203 | 최고 입찰 조회 후 새 입찰 INSERT 사이에 다른 팀이 더 높게 입찰할 수 있음 (TOCTOU). 최소 입찰액 체크가 stale한 topBid 기준으로 이루어짐 — 같은 금액으로 두 팀이 동시에 입찰 시 둘 다 통과될 수 있음 | P1 |
| G4 | 기능 | RoomClient.tsx:428-439 | `BiddingControl`에 `teamId={teamIdParam}` 전달 — 쿠키 원본값(검증 전). 이미 TECH_STATE_SNAPSHOT에 P2로 기록된 알려진 버그 | P2 |

**수정 방향 (G1 — P0 필수)**

```typescript
// teamId의 room_id 검증 추가
const { data: team } = await db
  .from("teams")
  .select("name, point_balance, room_id") // room_id 추가
  .eq("id", teamId)
  .single();

if (!team || team.room_id !== roomId) {
  return { error: "유효하지 않은 팀 정보입니다." };
}
```

---

#### STEP 7 — 자동 낙찰 (`awardPlayer` Server Action + `useAuctionControl`)

**동작 요약**

- ORGANIZER 클라이언트만 `setTimeout(delay + 1500ms)`으로 `awardPlayer` 호출
- `awardLock` ref로 동일 클라이언트 내 이중 실행 방지
- 서버 사이드에서 멱등성 보장: 타이머가 아직 미래이면 즉시 return, `status !== 'IN_AUCTION'`이면 즉시 return

**발견된 문제점**
| # | 종류 | 위치 | 내용 | 심각도 |
|---|------|------|------|--------|
| H1 | **버그** | useAuctionControl.ts:76 | ORGANIZER가 여러 탭을 열면(의도치 않은 경우) `setTimeout`이 탭 수만큼 설정됨. 각 탭의 `awardLock`은 독립적이므로 여러 번 `awardPlayer`가 호출될 수 있음. 서버사이드 멱등성으로 방어 중이나 불필요한 부하 발생 | P1 |
| H2 | 기능 | useAuctionControl.ts:82 | `delay = Math.max(0, new Date(timerEndsAt).getTime() - Date.now()) + 1500` — 1500ms grace는 충분하나, Optimistic Update로 `timerEndsAt`이 먼저 설정되면 서버 실제 만료보다 client 계산 만료가 앞서 grace 타이밍이 맞지 않을 수 있음 | P2 |
| H3 | 기능 | auctionActions.ts:298-313 | `awardPlayer`에서 낙찰 처리: `players.update` → `teams.update(point_balance)` 두 쿼리가 별도. 중간 장애 시 포인트 차감 없이 선수만 SOLD되는 불일치 가능 | P1 |

---

#### STEP 8 — 종료 처리 (`deleteRoom`, `saveAuctionArchive`)

**발견된 문제점**
| # | 종류 | 위치 | 내용 | 심각도 |
|---|------|------|------|--------|
| I1 | 기능 | auctionActions.ts:389-413 | 토큰 무효화 → bids/messages/players/teams 삭제 → rooms 삭제 순서이나, 각 단계 에러 시 `console.error` 후 계속 진행 (graceful). 중간 실패 시 부분 삭제 상태 발생 가능 | P2 |
| I2 | 기능 | RoomClient.tsx:205-212 | `isRoomComplete` 조건: `teams.every(t => soldCount === membersPerTeam - 1)` — 팀 인원이 정확히 `membersPerTeam - 1`명(팀장 제외)이어야 함. DRAFT로 0P 자유계약 선수도 `status === 'SOLD'`이므로 카운트에 포함됨. 올바른 동작 ✅ | 해당 없음 |

---

### 4-3. 보안 취약점 종합 요약

| 등급      | 항목                                        | 설명                                                                                    | 파일                  |
| --------- | ------------------------------------------- | --------------------------------------------------------------------------------------- | --------------------- |
| 🔴 **P0** | 역할 미검증 쿠키 발급                       | `/api/room-auth`에서 role을 DB와 대조하지 않음. 누구나 ORGANIZER 쿠키 획득 가능         | route.ts              |
| 🔴 **P0** | `drawNextPlayer` — IN_AUCTION 가드 없음     | 이미 경매 중인 선수가 있어도 새 선수를 추첨 가능. 두 선수가 동시에 IN_AUCTION 상태 유발 | auctionActions.ts     |
| 🔴 **P0** | `placeBid` — teamId 소속 방 검증 없음       | 다른 방의 teamId로 입찰 시도 가능                                                       | auctionActions.ts     |
| 🟠 **P1** | Open Redirect 가능성                        | `new URL(request.url)` 기반 리다이렉트 — 신뢰할 수 없는 Host 헤더 사용                  | route.ts              |
| 🟠 **P1** | `startAuction` — 타이머 중복 실행 가드 없음 | 타이머 진행 중에 재호출 시 타이머 리셋                                                  | auctionActions.ts     |
| 🟠 **P1** | `awardPlayer` — players/teams 별도 쿼리     | 중간 장애 시 포인트 차감 없이 선수만 낙찰                                               | auctionActions.ts     |
| 🟠 **P1** | Presence 30초 지연                          | 팀장 이탈 감지가 최대 30초 늦을 수 있음                                                 | useAuctionRealtime.ts |
| 🟡 **P2** | `placeBid` TOCTOU                           | 동시 입찰 시 같은 금액 중복 입찰 가능                                                   | auctionActions.ts     |
| 🟡 **P2** | bids 전체 페치                              | bids 테이블을 roomId 기준 전체 조회 — 장기 경매 시 성능 저하                            | useAuctionRealtime.ts |
| 🟡 **P2** | 클라이언트 시계 의존                        | isAuctionActive, delay 계산이 클라이언트 시계 기반                                      | RoomClient.tsx        |

---

### 4-4. 기능 재설계 시 필수 반영 사항

#### [필수 — P0 수정]

1. **`/api/room-auth`에 DB 검증 추가**: `role=LEADER`이면 해당 `teamId`가 실제 `roomId` 방에 속한 팀인지 Supabase에서 확인 후 쿠키 발급
2. **`drawNextPlayer`에 서버사이드 IN_AUCTION 가드 추가**: `rooms.current_player_id`가 이미 있으면 오류 반환
3. **`placeBid`에 teamId 소속 방 검증 추가**: `teams.room_id === roomId` 확인

#### [권장 — P1 수정]

4. **`startAuction`에 중복 타이머 가드 추가**: 이미 `timer_ends_at`이 미래 값이면 오류 반환
5. **`awardPlayer`의 두 쿼리 원자성 확보**: Supabase의 `rpc`(PostgreSQL 함수)로 트랜잭션 처리
6. **Presence 이탈 감지 보완**: `timer_ends_at` 설정 후 일정 시간(예: 30초) 내 팀장 미응답 시 pause 처리

#### [코드 품질]

7. **`isReAuctionRound` 감지 방식 개선**: 메시지 content 문자열 검사 → DB에 별도 필드(`is_re_auction`) 추가
8. **bids 쿼리 최적화**: `fetchAll` 시 전체 bids 대신 현재 `current_player_id` 기준 bids만 조회
9. **`page.tsx` role 값 화이트리스트 검증**: 타입 캐스트 대신 런타임 검증 추가

---

### 4-5. Zustand Store — currentPlayerId 미추적 주의

현재 Store에는 `currentPlayerId` 필드가 없다. `rooms.current_player_id`는 DB에 존재하지만 Store에 저장되지 않음. `currentPlayer`는 항상 `players.find(p => p.status === 'IN_AUCTION')`로 도출됨.

이 설계의 **위험 지점**: `players` 배열 업데이트와 `rooms.current_player_id` 업데이트가 서로 다른 realtime 이벤트로 도착할 경우, 두 값이 일시적으로 불일치할 수 있음. 현재는 문제가 없으나 `current_player_id`를 Store에도 저장하고 두 값의 일치 여부를 `awardPlayer` 전에 재확인하는 것이 안전한 설계.

---

### 4-6. 작업 우선순위 체크리스트

```
[x] P0-A: /api/room-auth — role 화이트리스트 + token DB 대조 (organizer/leader/viewer_token)
[x] P0-B: drawNextPlayer — current_player_id 존재 시 조기 종료 가드
[x] P0-C: placeBid — teamId.room_id === roomId 검증
[x] P1-A: startAuction — timer_ends_at 미래값이면 재시작 차단
[x] P1-B: awardPlayer — award_player_atomic RPC (FOR UPDATE 락 + 단일 트랜잭션)
[x] P1-C: page.tsx — roleParam 런타임 화이트리스트 검증
[x] P2-A: bids 쿼리 — rooms 조회 후 current_player_id 기준 조건부 fetch
[x] P2-B: fetchAll 이중 호출 제거 — SUBSCRIBED 콜백 제거 (3초 폴링이 보정)
[x] P2-C: isReAuctionRound — 스토어 직접 설정/참조로 전환 (문자열 감지 제거)
    → RoomClient: 로컬 계산 제거, useAuctionStore(s.isReAuctionRound) 참조
    → AuctionBoard: handleRestartAuction에서 setReAuctionRound(true) 호출
[x] ChatPanel / useAuctionControl — anon INSERT → sendChatMessage Server Action
[x] RoomClient.BiddingControl.teamId — teamIdParam(URL) → storeTeamId(쿠키 검증)
```

**현재 잔존 미수정 항목**: 없음 (모든 P0/P1/P2 항목 완료)
⚠️ **Supabase 수동 실행 필요**: `00010_rls_policies.sql`, `00011_award_player_atomic.sql`

---

## 5. Supabase Realtime 아키텍처 분석 결과 (2026-03-04)

> **목적**: 전면 재작성(REWRITE_PLAN.md) 전 현재 실시간 통신 구조의 설계 결함을 정량적으로 분석하여, Broadcast-primary 전환 결정의 기술적 근거를 확보.

---

### 5-1. 현재 채널 구조 — 다중화 실패

현재 `useAuctionRealtime.ts`는 사용자 1명당 **3개의 독립 채널**을 생성한다:

| 채널 이름                 | 용도                                                 | 이벤트 수        |
| ------------------------- | ---------------------------------------------------- | ---------------- |
| `realtime:room-${roomId}` | postgres_changes (rooms/teams/players/bids/messages) | 5개 테이블 구독  |
| `presence:${roomId}`      | Presence (팀장 접속 현황)                            | heartbeat 30~60s |
| `lottery-${roomId}`       | Broadcast (CLOSE_LOTTERY 동기화)                     | 1개 이벤트       |

**문제**: 참여자 N명 기준으로 `3 × N`개의 WebSocket 채널이 생성된다. Supabase 무료 플랜 채널 상한(200개)과 유료 플랜 과금 구조를 고려할 때, 동시 접속자가 많아질수록 비효율이 증폭된다. Supabase 공식 문서는 **단일 채널에 여러 이벤트 타입을 혼합 구독(multiplexing)**하는 방식을 권장한다.

**개선 방향**: `auction-${roomId}` 단일 채널에 Broadcast + Presence를 모두 수용.

---

### 5-2. fetchAll 과적합 — INSERT/DELETE마다 전체 테이블 재조회

현재 구독 이벤트별 처리 전략:

| 이벤트                  | 현재 처리                    | 문제                     |
| ----------------------- | ---------------------------- | ------------------------ |
| `rooms` UPDATE          | store 즉시 업데이트 ✅       | 없음                     |
| `players` UPDATE        | store 즉시 업데이트 ✅       | 없음                     |
| `players` INSERT/DELETE | `fetchAll()` 전체 재조회 ⚠️  | 5개 테이블 전체 재fetch  |
| `teams` INSERT/DELETE   | `fetchAll()` 전체 재조회 ⚠️  | 5개 테이블 전체 재fetch  |
| `bids` INSERT           | `addBid()` + `fetchAll()` ⚠️ | 즉시 반영 후 이중 재조회 |

**핵심 문제**: INSERT/DELETE 이벤트는 payload에 변경된 레코드 전체가 포함된다(`REPLICA IDENTITY FULL` 설정 시). 이를 무시하고 매번 5개 테이블 전체를 재조회하는 것은 불필요한 DB 부하를 유발한다.

**올바른 패턴**:

```typescript
// INSERT: payload.new를 배열에 push
players: INSERT → store.players.push(payload.new)

// DELETE: payload.old.id를 기준으로 filter
players: DELETE → store.players.filter(p => p.id !== payload.old.id)

// UPDATE: payload.new로 해당 항목만 교체
players: UPDATE → store.players.map(p => p.id === payload.new.id ? payload.new : p)
```

---

### 5-3. 3초 폴링 상시 가동 — WebSocket 정상 시에도 무조건 실행

현재 `setInterval(fetchPoll, 3000)`은 WebSocket 연결 상태와 무관하게 **항상 실행**된다.

**실측 영향**:

- WebSocket 정상 작동 시에도 3초마다 DB 쿼리 (rooms + teams + players) 실행
- 참여자 10명 기준: 10명 × 20회/분 = **분당 200회 불필요한 DB 쿼리**
- Supabase 무료 플랜 500MB DB 대역폭 소모 가속

**설계 의도**: 원래 WebSocket 연결 실패 시 상태 복원을 위한 fallback 목적이었다. 그러나 `fetchingRef` dedup이 있어 WebSocket 이벤트와 폴링이 동시에 `fetchAll`을 호출해도 직렬화되는 구조이므로, 폴링이 실제 "백업" 역할을 하는 상황은 WebSocket이 완전히 끊긴 경우뿐이다.

**개선 방향**: 폴링 완전 제거 + 재연결 이벤트(`channel.subscribe()` 재구독 완료 시) 시점에만 `fetchAll()` 1회 호출.

---

### 5-4. CDC vs Broadcast vs Presence — 용도 구분 기준

| 메커니즘                   | 지연             | 보장성               | 적합한 용도                     |
| -------------------------- | ---------------- | -------------------- | ------------------------------- |
| **postgres_changes (CDC)** | 300ms ~ 2,000ms  | DB 커밋 완료 보장    | 감사 로그, 외부 시스템 연동     |
| **Broadcast**              | < 100ms          | 최선형 전달 (비영속) | 실시간 상태 동기화, 게임 이벤트 |
| **Presence**               | heartbeat 30~60s | 채널 내 상태 공유    | 접속자 현황, 타이핑 인디케이터  |

**현재 코드의 CDC 사용 판단**:

- 경매 시스템의 핵심 요구사항은 "입찰/낙찰/타이머를 모든 탭에서 실시간 동기화"임
- 이는 **Broadcast** 영역이 적합 (< 100ms, 게임형 이벤트)
- CDC는 DB 영속성을 보장하지만 경매 UX에 필요한 속도를 제공하지 못함
- Presence는 현재 용도(팀장 접속 확인)에 적합하나, 지연 특성상 즉각 이탈 감지 불가 (의도된 한계)

---

### 5-5. 분석 결과 → REWRITE_PLAN.md 의사결정 매핑

| 분석 결과                       | REWRITE_PLAN.md 결정                                      |
| ------------------------------- | --------------------------------------------------------- |
| 3개 채널 × N명 = 커넥션 낭비    | `auction-${roomId}` 단일 채널에 Broadcast + Presence 통합 |
| fetchAll 과적합 (INSERT/DELETE) | payload merge 패턴 전환 (INSERT→push, DELETE→filter)      |
| 3초 폴링 상시 가동              | 폴링 완전 제거 + 재연결 시 fetchAll 1회                   |
| CDC 지연(300ms~2s)              | postgres_changes 구독 제거 → Broadcast-primary 전환       |

---

## 6. 리팩토링 실행 기록 (2026-03-05)

> **목적**: 코드 품질 보고서(`260305_RefactoringReview.md`)에 기반하여 컴포넌트 관심사 분리, 서버 액션 모듈화, 보일러플레이트 제거, 테스트 보강을 단계적으로 수행.

---

### 6-1. Phase 1 — 컴포넌트 관심사 분리 (Separation of Concerns)

| #   | 파일                                                 | 작업 내용                                                                                                                           |
| --- | ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| R1  | `src/features/auction/hooks/useAuctionBoard.ts`      | **신규** — `AuctionBoard.tsx`에서 비즈니스 로직 추출 (Store 셀렉터 12개, 파생 데이터 15개, 이벤트 핸들러 2개, 로컬 상태·Effect 4개) |
| R2  | `src/features/auction/hooks/useBiddingControl.ts`    | **신규** — `BiddingControl.tsx`에서 입찰 로직 추출 (상태 관리, `handleBid`, `canBid` 파생 상태, 증감 핸들러)                        |
| R3  | `src/features/auction/components/AuctionBoard.tsx`   | import를 `useAuctionBoard` Hook으로 전환, 비즈니스 로직 110줄 → Hook 호출 33줄                                                      |
| R4  | `src/features/auction/components/BiddingControl.tsx` | import를 `useBiddingControl` Hook으로 전환, 비즈니스 로직 55줄 → Hook 호출로 교체                                                   |

**검증**: `npm run build` 성공 (Exit code: 0)

### 6-2. Phase 2 — 서버 액션 모듈화 (Server Action Modularization)

| #   | 파일                                             | 작업 내용                                                                                                                |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| R5  | `src/features/auction/api/serverActionUtils.ts`  | **신규** — 공통 타입(RoomStatePayload 등), 상수(MS 타이머), 공통 헬퍼(`fetchRoomState`, `broadcastState`, `sysMsg`) 추출 |
| R6  | `src/features/auction/api/roomActions.ts`        | **신규** — 방 생성(`createRoom`), 종료(`deleteRoom`), 아카이브(`saveAuctionArchive`) 로직 분리                           |
| R7  | `src/features/auction/api/chatActions.ts`        | **신규** — 메시지(`sendChatMessage`), 공지(`sendNotice`) 전송 로직 분리                                                  |
| R8  | `src/features/auction/api/auctionFlowActions.ts` | **신규** — 핵심 도메인 로직 분리 (추첨, 시작, 입찰, 낙찰, 영입, 재경매 등)                                               |
| R9  | `src/features/auction/api/auctionActions.ts`     | **배럴 파일화** — 기존 모놀리식 구조 해체, 분리된 4개 모듈을 `export *` 처리해 하위 호환성 유지                          |
| R10 | `__tests__/auctionActions.test.ts`               | 변경된 파일 구조(`getServerClient` 등)에 맞춰 테스트 Mock 업데이트 (통과 확인)                                           |

**검증**: `npm run test` 통과 (30개 테스트 완료) 및 `npm run build` 성공 (Exit code: 0)

### 6-3. Phase 3 — fetchRoomState 보일러플레이트 제거

| #   | 파일                                             | 작업 내용                                                                                                     |
| --- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- |
| R11 | `src/features/auction/api/serverActionUtils.ts`  | `withBroadcast` 래퍼 추가: 성공 시 `fetchRoomState` 및 `broadcastState` 처리를 자동화해 상태 동기화 누락 방지 |
| R12 | `src/features/auction/api/chatActions.ts`        | `sendChatMessage`, `sendNotice` 액션의 중복 반환 코드를 `withBroadcast` 래퍼로 교체                           |
| R13 | `src/features/auction/api/auctionFlowActions.ts` | 도메인 액션(`placeBid`, `awardPlayer`, `draftPlayer` 등)에 `withBroadcast` 일괄 적용하여 보일러플레이트 제거  |

**검증**: `npm run test` 통과 (30개 테스트 완료) 및 `npm run build` 성공 (Exit code: 0)

### 6-4. Phase 4 — 비즈니스 로직(Hook) 테스트 코드 보강

| #   | 파일                                   | 작업 내용                                                                                                |
| --- | -------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| R14 | `__tests__/useAuctionBoard.test.tsx`   | **신규** — `useAuctionBoard` 커스텀 훅의 파생 데이터 계산, `handleDraft` 등 액션 핸들러 단위 테스트 작성 |
| R15 | `__tests__/useBiddingControl.test.tsx` | **신규** — `useBiddingControl` 커스텀 훅의 최적 입찰액 증감, 에러 처리, `handleBid` 액션 핸들러 검증     |

**검증**: `npm run test` 통과 (총 41개 테스트 완료)
