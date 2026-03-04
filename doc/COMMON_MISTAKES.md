# 🚨 COMMON_MISTAKES.md — 반복하지 말아야 할 실수 & 교훈

> 이 문서는 실제 버그 해결 과정에서 발견된 구조적 실수와 교훈을 기록한다.
> 새로운 기능을 구현하거나 코드를 수정하기 전에 반드시 읽어라.

---

## CASE 1 — 쿠키 이름 충돌: 동일 브라우저 다중 역할 덮어쓰기

### 🔴 이슈 요약 (The Problem)

같은 브라우저에서 여러 팀장이 각자의 초대 링크를 열면, 새 탭이 열릴 때마다 이전 탭의 쿠키가 덮어씌워졌다. 팀A 팀장이 먼저 입장하고 팀B 팀장이 입장하면, 팀A 탭이 갑자기 팀B로 인식되는 현상 발생.

**영향 파일**: `src/app/api/room-auth/route.ts`, `src/app/room/[id]/page.tsx`

### ❌ 실패한 접근법 (What didn't work)

쿠키 이름을 `room_auth_{roomId}` 하나로 고정한 설계. 방(roomId)별로는 분리되지만, **같은 방 안에서 모든 역할(ORGANIZER/LEADER/VIEWER)이 동일한 이름을 공유**했다.

```
room_auth_abc123 = { role: "LEADER", teamId: "team-A" }
// 팀B 팀장이 입장 시 →
room_auth_abc123 = { role: "LEADER", teamId: "team-B" }  // 팀A 데이터 소멸
```

브라우저는 같은 도메인+path+이름의 쿠키를 하나만 유지한다. 쿠키의 `path: '/'`라는 광역 설정이 덮어쓰기를 더욱 쉽게 만들었다.

**Root Cause**: 쿠키 격리 단위가 "방(roomId)" 수준에서 끝났고, "방 안의 역할+팀" 수준으로 내려가지 않았다.

### ✅ 최종 해결책 (What worked)

역할+팀ID별 고유 쿠키 이름 + 리다이렉트 URL에 role/teamId 포함.

```typescript
// route.ts — 쿠키 이름을 역할+팀ID로 고유화
const cookieSuffix =
  role === "LEADER" && teamId ? `LEADER_${teamId}` : role.toUpperCase();
const cookieName = `room_auth_${roomId}_${cookieSuffix}`;
// 예) room_auth_abc123_LEADER_team-A, room_auth_abc123_LEADER_team-B

// 리다이렉트 URL에 role/teamId 포함 → page.tsx가 어떤 쿠키를 읽을지 특정 가능
const redirectUrl = new URL(`/room/${roomId}`, request.url);
redirectUrl.searchParams.set("role", role);
if (role === "LEADER" && teamId) redirectUrl.searchParams.set("teamId", teamId);
```

```typescript
// page.tsx — URL searchParams로 쿠키 이름 결정
const cookieSuffix =
  roleParam === "LEADER" && teamIdParam
    ? `LEADER_${teamIdParam}`
    : roleParam.toUpperCase();
const cookieName = `room_auth_${roomId}_${cookieSuffix}`;
const authCookie = cookieStore.get(cookieName);
```

### 📌 AI 행동 지침 (Lessons Learned & New Rules)

> **쿠키, localStorage, sessionStorage 등 브라우저 저장소의 Key(이름)를 설계할 때는 "같은 브라우저에서 동시에 존재할 수 있는 모든 경우의 수"를 기준으로 고유성을 보장해야 한다. 역할·사용자·팀 등 구체적인 식별자가 다르다면 Key도 달라야 한다.**

---

## CASE 2 — Server Action "Fire and Forget": 실시간 UI 지연 버그

### 🔴 이슈 요약 (The Problem)

1. ORGANIZER가 "▶ 경매 시작" 버튼을 누른 후 타이머 UI가 나타나기까지 300~600ms의 공백이 존재했다. 그 사이 DB에서는 이미 타이머가 카운트다운 중이었지만 UI는 여전히 "경매 준비중..." 상태.
2. 팀장이 입찰 후 타이머가 5초로 연장될 때도 같은 지연이 발생. 입찰 버튼을 눌렀는데 UI 반응이 느림.

**영향 파일**: `src/features/auction/api/auctionActions.ts`, `src/app/room/[id]/RoomClient.tsx`, `src/features/auction/components/BiddingControl.tsx`

### ❌ 실패한 접근법 (What didn't work)

모든 Server Action이 `{ error?: string }`만 반환하고, 클라이언트는 DB 변경을 Supabase 실시간 이벤트로만 인지하는 구조.

```typescript
// ❌ 잘못된 패턴 — 클라이언트가 WebSocket 이벤트만 믿음
export async function startAuction(
  roomId: string,
): Promise<{ error?: string }> {
  const timerEndsAt = new Date(Date.now() + 10000).toISOString();
  await db.update({ timer_ends_at: timerEndsAt });
  return {}; // 클라이언트는 여기서 아무것도 모름
}
// 클라이언트는 DB → CDC → WebSocket → 클라이언트 경로(300~600ms)를 기다려야 함
```

**Root Cause**: Server Action은 DB에 이미 쓴 값을 알고 있는데, 그 값을 반환하지 않고 버렸다. 클라이언트는 다시 Supabase 실시간 구독을 통해 간접적으로 같은 값을 받아야 했다. 불필요한 왕복(round-trip) 지연이 경매 타이머처럼 ms 단위가 중요한 UI에서 체감 버그로 나타났다.

### ✅ 최종 해결책 (What worked)

Server Action이 DB에 저장한 값을 반환값에 포함. 클라이언트는 실시간 이벤트를 기다리지 않고 즉시 Store 업데이트(Optimistic Update).

```typescript
// ✅ 올바른 패턴 — Server Action이 변경된 값을 함께 반환
export async function startAuction(
  roomId: string,
  durationMs?: number
): Promise<{ error?: string; timerEndsAt?: string }> {
  const timerEndsAt = new Date(Date.now() + duration).toISOString()
  await db.update({ timer_ends_at: timerEndsAt })
  return { timerEndsAt }  // 실제 DB에 저장된 값을 그대로 반환
}

export async function placeBid(
  ...
): Promise<{ error?: string; newTimerEndsAt?: string }> {
  // ... 입찰 처리 후 타이머 연장 시
  newTimerEndsAt = new Date(Date.now() + EXTEND_DURATION_MS).toISOString()
  await db.update({ timer_ends_at: newTimerEndsAt })
  return { newTimerEndsAt }
}
```

```typescript
// RoomClient.tsx — 반환값으로 즉시 Store 업데이트
const res = await startAuction(roomId, duration);
if (res.error) alert(res.error);
else if (res.timerEndsAt) setRealtimeData({ timerEndsAt: res.timerEndsAt }); // 즉각 반영

// BiddingControl.tsx — 입찰 성공 시 타이머 연장 즉시 반영
const res = await placeBid(roomId, currentPlayer.id, teamId, finalAmount);
if (res.error) setBidError(res.error);
else {
  setBidAmount(finalAmount + 10);
  if (res.newTimerEndsAt) setRealtimeData({ timerEndsAt: res.newTimerEndsAt });
}
```

### 📌 AI 행동 지침 (Lessons Learned & New Rules)

> **시간에 민감한 상태(타이머, 입찰 결과 등)를 변경하는 Server Action은 반드시 변경된 값을 반환해야 하며, 클라이언트는 Supabase 실시간 이벤트를 기다리지 않고 해당 반환값으로 즉시 Store를 업데이트(Optimistic Update)해야 한다. "쓰고 잊는(fire and forget)" Server Action 패턴은 실시간 경매처럼 ms가 중요한 UI에서 항상 지연 버그를 만들어낸다.**

---

## CASE 3 — fetchAll 이중 setRealtimeData 호출: 중간 렌더 깜빡임

### 🔴 이슈 요약 (The Problem)

초기 로드 또는 INSERT/DELETE 이벤트 수신 시 `fetchAll`이 호출되는데, 내부에서 `setRealtimeData`를 **두 번** 호출했다. 첫 번째 호출 후 잠깐 teams/players가 빈 상태로 렌더되는 깜빡임이 발생.

**영향 파일**: `src/features/auction/hooks/useAuctionRealtime.ts`

### ❌ 실패한 접근법 (What didn't work)

```typescript
// ❌ 두 번 분리 호출 — 중간 불완전 상태 렌더 발생
if (roomRes.data) {
  setRealtimeData({
    timerEndsAt: roomRes.data.timer_ends_at,
    // ... room 필드들만
  }); // ← 이 시점: isRoomLoaded=true지만 teams/players는 아직 이전 값
}
setRealtimeData({
  teams: teamsRes.data || [],
  players: playersRes.data || [],
  // ... 나머지
});
```

**Root Cause**: 5개 테이블을 `Promise.all`로 병렬 fetch하면서도, 결과를 Store에 반영하는 건 두 번에 나눠 했다. React는 두 번의 `setState`를 각각 렌더 사이클로 처리하려 해서 불완전한 중간 상태가 노출되었다.

### ✅ 최종 해결책 (What worked)

```typescript
// ✅ 단일 setRealtimeData 호출로 통합 — 원자적 상태 업데이트
setRealtimeData({
  basePoint: roomRes.data.base_point,
  timerEndsAt: roomRes.data.timer_ends_at,
  // ... 모든 room 필드
  teams: teamsRes.data || [],
  bids: bidsRes.data || [],
  players: playersRes.data || [],
  messages: messagesRes.data || [],
});
```

### 📌 AI 행동 지침 (Lessons Learned & New Rules)

> **하나의 데이터 로드 사이클에서 발생하는 모든 Store 업데이트는 단일 action 호출로 처리해야 한다. 연관된 데이터를 여러 번 setState로 나눠 쓰면 불완전한 중간 상태가 렌더되어 깜빡임이나 UI 불일치가 발생한다.**

---

## CASE 4 — React useRef 초기화 누락: CenterTimer 진행바 미작동

### 🔴 이슈 요약 (The Problem)

경매 타이머의 진행바(progress bar)가 첫 마운트 시 항상 0으로 고정되어 있었다. 타이머 연장 이후에야 정상 동작.

**영향 파일**: `src/features/auction/components/AuctionBoard.tsx` (`CenterTimer` 컴포넌트)

### ❌ 실패한 접근법 (What didn't work)

```typescript
const lastTarget = useRef(target);
useEffect(() => {
  const diff = target - Date.now();
  if (target !== lastTarget.current) {
    // ← 최초 렌더 시 target === lastTarget.current
    initialDuration.current = diff; //    이 블록이 실행되지 않음
    lastTarget.current = target;
  }
}, [target]);

const progress = initialDuration.current
  ? (timeLeftMs / initialDuration.current) * 100
  : 0; // ← initialDuration이 null이므로 항상 0
```

**Root Cause**: `useRef(target)`으로 초기값을 설정했기 때문에 최초 마운트 시 `target === lastTarget.current`가 되어 조건이 false. `initialDuration.current`가 null로 유지되어 진행바가 0에서 시작.

### ✅ 최종 해결책 (What worked)

```typescript
useEffect(() => {
  // target 변경 또는 최초 마운트 시 항상 initialDuration 설정
  initialDuration.current = target - Date.now();
}, [target]);
```

조건 분기 없이 `target`이 바뀔 때마다(최초 포함) 항상 `initialDuration`을 갱신.

### 📌 AI 행동 지침 (Lessons Learned & New Rules)

> **`useRef`를 `useEffect`의 "이전값 비교" 용도로 쓸 때는, 초기값과 첫 번째 변경값이 같으면 effect 내부 블록이 실행되지 않는다는 점을 항상 인지해야 한다. 최초 마운트 시에도 값이 초기화되어야 하는 ref는 조건 없이 effect 내에서 바로 설정해야 한다.**

---

## 요약 테이블

| #   | 버그 유형            | 핵심 원인                                           | 해결 패턴                                       |
| --- | -------------------- | --------------------------------------------------- | ----------------------------------------------- |
| 1   | 쿠키 이름 충돌       | 격리 단위가 "방" 수준에서 끝남, "역할+팀" 미분리    | 쿠키 이름에 `{ROLE}_{teamId}` 포함              |
| 2   | Server Action 지연   | "Fire and forget" — 변경값 미반환, WebSocket만 의존 | Server Action이 변경값 반환 + Optimistic Update |
| 3   | 이중 setState 깜빡임 | 하나의 로드 사이클을 두 번의 setState로 나눔        | 단일 setState 호출로 통합                       |
| 4   | useRef 초기화 누락   | 초기값 비교 조건으로 인해 최초 실행 블록 스킵       | 조건 없이 effect에서 직접 설정                  |

---

## 이슈 #5 — 경매 로직 보안 강화 및 구조 개선 (2026-03-03)

### 이슈 요약 (The Problem)
경매 경쟁 루트(`/api/room-auth`, `drawNextPlayer`, `placeBid`, `awardPlayer`)에 다음 취약점과 버그가 동시에 존재했다:
- **P0**: role 화이트리스트 검증 없는 쿠키 발급, drawNextPlayer에 IN_AUCTION 중복 가드 없음, placeBid의 teamId가 해당 방 소속인지 검증 없음
- **P1**: startAuction 중복 타이머 실행, awardPlayer 비원자 처리(players/teams 업데이트 분리), 문자열 기반 isReAuctionRound 감지
- **P1**: ChatPanel과 useAuctionControl이 anon key로 직접 messages INSERT → RLS 강화 후 차단됨
- **P1**: page.tsx의 roleParam이 타입 캐스트만 하고 런타임 검증 없음

### 실패한 접근법 (What didn't work)
1. **anon key RLS 정책 삭제 후 방치**: SELECT 전용 RLS로 전환하면 기존 ChatPanel/useAuctionControl의 anon INSERT가 차단됨 — DB 정책 변경과 코드 변경이 반드시 함께 진행되어야 한다.
2. **문자열 기반 재경매 감지**: `content.includes('재경매를 재개합니다')` — 메시지 텍스트가 바뀌거나 국제화되면 즉시 깨지는 취약한 패턴이다.
3. **비원자 낙찰 처리**: `players.update(SOLD)` 후 `teams.update(point_balance)` 분리 호출 — 두 쿼리 사이에 충돌이 발생하면 데이터 불일치가 발생한다.

### 최종 해결책 (What worked)
1. **RLS 정책을 SELECT-only로 재설정** (마이그레이션 `00010`) — anon key는 읽기 전용, 모든 쓰기는 service_role(Server Actions)만 가능
2. **모든 DB 쓰기를 Server Action 경유** — ChatPanel, useAuctionControl의 `supabase.from('messages').insert()` → `sendChatMessage()` Server Action 호출로 교체
3. **award_player_atomic RPC** (마이그레이션 `00011`) — PostgreSQL 함수 내에서 `FOR UPDATE` 락으로 players + teams + rooms를 단일 트랜잭션으로 처리
4. **직접 플래그 설정** — `restartAuctionWithUnsold` 반환값에 `reAuctionStarted: true` 포함, AuctionBoard.tsx에서 직접 `setReAuctionRound(true)` 호출
5. **route.ts 토큰 DB 검증** — organizer_token, viewer_token, leader_token을 DB에서 조회하여 비교

### AI 행동 지침 (Lessons Learned & New Rules)
> **DB 정책(RLS)과 애플리케이션 코드는 반드시 함께 변경해야 한다. RLS를 강화할 때는 "anon key로 직접 쓰기를 수행하는 코드가 있는가?"를 반드시 전체 코드베이스에서 검색하고, 발견된 모든 직접 쓰기를 service_role 경유 Server Action으로 전환한 후에야 RLS 정책을 배포한다.**

---

## 이슈 #6 — 상태 읽기/쓰기 불일치 (Dead State) 패턴 (2026-03-04)

### 이슈 요약 (The Problem)
Zustand store에 `isReAuctionRound` 상태가 존재하고 `setReAuctionRound()` 쓰기가 여러 곳에서 일어났지만, 실제 `useAuctionStore(s => s.isReAuctionRound)`로 읽는 컴포넌트가 없었다. `RoomClient.tsx`는 동명의 로컬 변수(`const isReAuctionRound = unsoldPlayers.length > 0 && waitingPlayers.length === 0`)를 사용했고, 이 로컬 값은 `restartAuctionWithUnsold` 호출 후 unsold → waiting 전환되는 순간 `false`가 되어 재경매 타이머를 5초 대신 10초로 잘못 계산했다.

### 실패한 접근법 (What didn't work)
1. **로컬 상태 계산 유지**: 플레이어 상태(UNSOLD/WAITING)만으로 "재경매 중"을 판단 — 상태 전환 자체가 감지 조건을 파괴하는 시간차 문제 발생
2. **문자열 기반 메시지 감지**: `content.includes('재경매를 재개합니다')` — 텍스트 변경 시 즉시 깨지는 취약한 패턴

### 최종 해결책 (What worked)
- 로컬 계산식 제거 → `useAuctionStore(s => s.isReAuctionRound)` 참조로 통일
- `handleRestartAuction`에서 `setReAuctionRound(true)` 직접 호출 — 상태 전환과 독립적인 명시적 플래그

### AI 행동 지침 (Lessons Learned & New Rules)
> **Zustand store에 상태를 쓰는 코드를 추가할 때는, 그 상태를 실제로 읽는 컴포넌트가 있는지 반드시 확인하라. 스토어에 write만 하고 아무도 read하지 않는 "dead state"는 로컬 변수와 동명 충돌을 일으켜 버그의 원인이 된다. grep으로 `s\.상태명` 패턴을 검색하여 소비자가 존재하는지 확인할 것.**

---

## 이슈 #7 — Broadcast-primary 아키텍처 전환 시 스토어 상태 제거 부작용 (2026-03-04)

### 이슈 요약 (The Problem)
Broadcast-primary 아키텍처로 전환하면서 Zustand store에서 `hasPlayedReadyAnimation`, `addBid`, `addMessage`, `updatePlayer`, `updateTeam` 등을 제거했다. 그러나 `AuctionBoard.tsx`가 `hasPlayedReadyAnimation`과 `setReadyAnimationPlayed`를 store에서 읽고 있어 빌드 시 TypeScript 에러 발생.

### 실패한 접근법 (What didn't work)
1. **store에서 상태 제거 후 곧바로 빌드**: 상태를 제거하기 전에 어떤 파일이 해당 상태를 소비하는지 확인하지 않아 빌드 에러 발생
2. **"단순히 쓰기만 있는 상태다"라는 가정**: `setReadyAnimationPlayed` 호출이 store에서 `hasPlayedReadyAnimation`을 읽는 곳과 동일 컴포넌트 내에 존재했음

### 최종 해결책 (What worked)
- `AuctionBoard.tsx`에서 store 의존성을 제거하고 `useState`로 로컬 상태 전환:
  ```typescript
  // Before: const hasPlayedReadyAnimation = useAuctionStore(s => s.hasPlayedReadyAnimation)
  const [hasPlayedReadyAnimation, setHasPlayedReadyAnimation] = useState(false)
  const setReadyAnimationPlayed = (played: boolean) => setHasPlayedReadyAnimation(played)
  ```
- Store 상태 제거 전 `grep -r "hasPlayedReadyAnimation" src/` 실행하여 소비자 위치 확인이 선행되었어야 했음

### AI 행동 지침 (Lessons Learned & New Rules)
> **Zustand store에서 상태를 제거할 때는, 반드시 먼저 `grep -r "s\.상태명\|상태명" src/` 명령으로 모든 소비 위치를 파악하고, 각 소비자를 로컬 상태나 props로 전환한 뒤에 store에서 제거해야 한다. 제거와 소비자 전환을 동시에 수행하지 않으면 빌드 에러가 발생한다.**
