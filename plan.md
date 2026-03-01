# 보안 코드 리뷰 & 개선 방안 설계서

> 작성일: 2026-03-01
> 대상 프로젝트: Minions Bid (minionsbid.vercel.app)
> 스택: Next.js 16 · Supabase · Zustand · TypeScript

---

## 목차

1. [전체 위협 모델 요약](#1-전체-위협-모델-요약)
2. [취약점 목록](#2-취약점-목록)
3. [취약점 상세 분석](#3-취약점-상세-분석)
4. [개선 방안 설계](#4-개선-방안-설계)
5. [우선순위별 구현 로드맵](#5-우선순위별-구현-로드맵)
6. [보안 베이스라인 현황](#6-보안-베이스라인-현황)

---

## 1. 전체 위협 모델 요약

본 프로젝트는 **내부 지인 전용 경매 툴**을 목적으로 설계되었으나, 현재 아키텍처에는 외부 공격자가 아닌 **일반 참여자(팀장·관전자)에 의한 내부 어뷰징**도 차단되지 않는 구조적 취약점이 있습니다.

### 아키텍처 핵심 문제

```
현재 상태 (취약):
Browser → supabase (anon key) → DB (RLS = USING(true))
         ↑ 아무 제약 없음

목표 상태 (안전):
Browser → Next.js API Route (Server Action) → supabase (service_role) → DB (RLS 완전 차단)
```

- `auctionActions.ts`에 `'use server'` 지시어가 **없음** → 클라이언트가 Supabase anon key로 직접 DB에 쓰기
- RLS 정책이 전부 `USING(true)` → anon 사용자가 **모든 테이블에 INSERT/UPDATE** 가능
- 토큰 검증이 클라이언트 사이드(React hook)에서만 수행됨 → 브라우저 콘솔에서 bypass 가능

---

## 2. 취약점 목록

| # | 분류 | 심각도 | 파일 | 요약 |
|---|------|--------|------|------|
| V-01 | 권한 우회 | **CRITICAL** | `auctionActions.ts` | 서버 측 권한 검증 없음 — 누구나 모든 경매 액션 호출 가능 |
| V-02 | 과도한 RLS 허용 | **CRITICAL** | `00001_init.sql` | 모든 테이블 anon INSERT/UPDATE 개방 |
| V-03 | 채팅 역할 위조 | **CRITICAL** | `ChatPanel.tsx` | sender_name·sender_role을 클라이언트가 직접 지정 |
| V-04 | 경쟁 조건 (포인트) | **CRITICAL** | `auctionActions.ts:187` | 잔고 확인→차감 사이에 복수 입찰 허용 |
| V-05 | 경쟁 조건 (낙찰) | **CRITICAL** | `auctionActions.ts:237` | 낙찰 처리가 비원자적 — 이중 포인트 차감 가능 |
| V-06 | URL 토큰 노출 | **HIGH** | `room-auth/route.ts` | 토큰이 GET 쿼리 파라미터 → 브라우저 기록·서버 로그에 남음 |
| V-07 | 클라이언트 전용 인증 | **HIGH** | `useRoomAuth.ts` | 역할 검증이 브라우저에서만 수행 → DevTools로 우회 가능 |
| V-08 | 입찰액 무제한 | **HIGH** | `auctionActions.ts:140` | 입찰 상한 없음 → 오버플로·논리 오류 가능 |
| V-09 | 메시지 무제한 삽입 | **HIGH** | `ChatPanel.tsx:100` | 서버에서 메시지 길이·속도 미검증 → DB 폭발 가능 |
| V-10 | 레이트 리밋 없음 | **HIGH** | `auctionActions.ts` | 입찰 스팸 — 초당 수백 건 가능 |
| V-11 | xlsx 알려진 취약점 | **HIGH** | `package.json` | Prototype Pollution (CVSS 7.8) + ReDoS (CVSS 7.5) |
| V-12 | 프로덕션 env 미검증 | **MEDIUM** | `supabase.ts` | 환경 변수 없이 폴백 — 프로덕션에서도 조용히 실패 |
| V-13 | HSTS 헤더 미들웨어 누락 | **MEDIUM** | `middleware.ts` | API 경로(/api/*)에 보안 헤더가 적용되지 않음 |
| V-14 | 프레즌스 역할 위조 | **MEDIUM** | `useAuctionRealtime.ts` | Presence 페이로드에 검증 없음 |
| V-15 | 감사 로그 없음 | **MEDIUM** | `auctionActions.ts` | 중요 액션(낙찰·삭제)에 대한 추적 로그 없음 |
| V-16 | 입력 길이 미검증 | **LOW** | `CreateRoomModal.tsx` | 선수·팀 이름 길이 서버 미검증 |
| V-17 | 타이머 관용 과대 | **LOW** | `auctionActions.ts:160` | 1초 오차 허용 → 타이머 종료 후 입찰 가능 |
| V-18 | 쿠키 만료 없음 | **LOW** | `room-auth/route.ts` | 인증 쿠키에 `maxAge` 미설정 → 세션 종료 후에도 유효 |

---

## 3. 취약점 상세 분석

### V-01 — 서버 측 권한 검증 없음 (CRITICAL)

**위치:** `src/features/auction/api/auctionActions.ts` 전체

**문제:**
파일 최상단에 `'use server'`가 없고, Supabase anon 클라이언트를 직접 임포트해 사용합니다. 브라우저에서 DevTools 콘솔로 다음과 같이 모든 경매 액션을 직접 호출할 수 있습니다.

```js
// 브라우저 콘솔에서 실행 가능 — 아무런 방어 없음
const { supabase } = await import('/src/lib/supabase.ts')
await supabase.from('players').update({ status: 'SOLD', team_id: '내 팀 ID', sold_price: 0 }).eq('id', '타겟 선수 ID')
```

**공격 시나리오:**
- 관전자가 포인트 차감 없이 원하는 선수를 자기 팀에 배정
- 팀장이 다른 팀의 포인트를 0으로 만들어 입찰 불능 상태로 만듦
- `deleteRoom(roomId)`를 호출해 진행 중인 경매방 강제 삭제

---

### V-02 — 완전 개방형 RLS 정책 (CRITICAL)

**위치:** `supabase/migrations/00001_init.sql:71-87`

```sql
-- 현재 상태: 완전 개방
CREATE POLICY "Allow anon insert" ON rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update" ON rooms FOR UPDATE USING (true);
-- teams, players, bids, messages 동일
```

**문제:** `USING(true)`는 **모든 anon 사용자에게 조건 없는 쓰기 권한** 부여.
Supabase anon key는 브라우저 네트워크 탭에서 누구나 획득 가능합니다.

---

### V-03 — 채팅 역할(sender_role) 위조 (CRITICAL)

**위치:** `src/features/auction/components/ChatPanel.tsx:100-105`

```ts
// 클라이언트가 role 값을 그대로 DB에 씀 — 서버 검증 없음
await supabase.from('messages').insert([{
  room_id: roomId,
  sender_name: senderName,   // ← 클라이언트가 결정
  sender_role: role || 'VIEWER', // ← 클라이언트 state 값
  content: input.trim(),
}])
```

**공격 시나리오:**
브라우저 콘솔에서 `supabase.from('messages').insert([{ sender_role: 'ORGANIZER', sender_name: '주최자', content: '경매 취소합니다', room_id: '...' }])`를 실행하면 주최자 뱃지가 달린 가짜 공지 삽입 가능.

---

### V-04 — 포인트 이중 차감 경쟁 조건 (CRITICAL)

**위치:** `auctionActions.ts:187-230` (placeBid)

```
시나리오: TeamA 잔고 100P
T+0ms: 요청1 → SELECT point_balance = 100 (✓ 통과)
T+0ms: 요청2 → SELECT point_balance = 100 (✓ 통과)
T+5ms: 요청1 → INSERT bid(100P) ✓
T+5ms: 요청2 → INSERT bid(100P) ✓
T+20ms: awardPlayer → point_balance = 100 - 100 = 0P (요청1 낙찰)
→ 요청2도 이미 DB에 있어 다음 경매에서도 100P 입찰 허용됨
```

Supabase에서 SELECT→UPDATE 사이에 행 잠금이 없으므로 동시 입찰 시 잔고보다 많은 금액 입찰이 가능합니다.

---

### V-05 — 낙찰 처리 비원자성 (CRITICAL)

**위치:** `auctionActions.ts:237-292` (awardPlayer)

```ts
// 1. 타이머 확인 (SELECT)
// 2. 선수 상태 확인 (SELECT)
// 3. 최고 입찰 조회 (SELECT)
// 4. 선수 업데이트 (UPDATE)
// 5. 팀 포인트 차감 (SELECT + UPDATE) ← 별도 쿼리
```

5개의 개별 쿼리로 구성되어 있어 중간에 중단되면 포인트만 차감되고 선수 배정이 누락되거나 반대 상황이 발생할 수 있습니다. DB 트랜잭션이 없습니다.

---

### V-06 — URL 쿼리 파라미터로 토큰 전달 (HIGH)

**위치:** `src/app/api/room-auth/route.ts:4-14`

```
/api/room-auth?roomId=xxx&role=ORGANIZER&token=yyy-zzz-...
```

**문제:**
- 브라우저 방문 기록에 토큰 저장
- 서버 Access 로그에 토큰 기록
- Referer 헤더를 통해 제3자 사이트로 누출 가능
- 링크를 그대로 복사·붙여넣기 시 토큰 노출

---

### V-11 — xlsx 알려진 취약점 (HIGH)

**위치:** `package.json: "xlsx": "^0.18.5"`

| CVE | CVSS | 유형 | 상태 |
|-----|------|------|------|
| CVE-2023-30533 | 7.8 | Prototype Pollution | npm 패치 없음 |
| 미등록 | 7.5 | ReDoS | npm 패치 없음 |

주최자가 악의적으로 조작된 Excel 파일을 업로드받으면 Prototype Pollution으로 애플리케이션 전역 객체(`Object.prototype`)가 오염될 수 있습니다.

---

## 4. 개선 방안 설계

### 4-A. 핵심 아키텍처 전환: Server Actions 도입

모든 DB 쓰기 액션을 Next.js Server Action으로 전환하여 서버에서 토큰 검증 후 실행합니다.

```
현재: Browser → supabase(anon) → DB
변경: Browser → Server Action(토큰 검증) → supabase(service_role) → DB
```

**구현 패턴:**

```ts
// src/features/auction/api/auctionActions.ts
'use server'

import { cookies } from 'next/headers'
import { createClient } from '@supabase/supabase-js'

// 서버 전용 클라이언트 (service_role key — 브라우저에 노출 안 됨)
function getServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!  // 서버 전용
  )
}

async function verifyRole(roomId: string, requiredRole: 'ORGANIZER' | 'LEADER', teamId?: string) {
  const cookieStore = await cookies()
  const raw = cookieStore.get(`room_auth_${roomId}`)?.value
  if (!raw) return null

  const { role, token, teamId: cookieTeamId } = JSON.parse(raw)
  if (role !== requiredRole) return null

  const supabase = getServerClient()
  if (requiredRole === 'ORGANIZER') {
    const { data } = await supabase.from('rooms').select('organizer_token').eq('id', roomId).single()
    if (data?.organizer_token !== token) return null
    return { role, teamId: null }
  }
  if (requiredRole === 'LEADER') {
    const { data } = await supabase.from('teams').select('leader_token').eq('id', cookieTeamId).single()
    if (data?.leader_token !== token) return null
    return { role, teamId: cookieTeamId }
  }
  return null
}

export async function placeBid(roomId: string, playerId: string, teamId: string, amount: number) {
  // 1. 서버에서 역할 검증
  const auth = await verifyRole(roomId, 'LEADER')
  if (!auth || auth.teamId !== teamId) return { error: '권한 없음' }

  // 2. 이후 기존 로직 실행 (service_role 클라이언트 사용)
  const supabase = getServerClient()
  // ...
}
```

---

### 4-B. RLS 정책 강화

현재 `USING(true)` 정책을 삭제하고 DB 레벨에서 직접 쓰기를 완전 차단합니다.
Server Actions이 `service_role` 키를 사용하므로 RLS를 우회할 수 있어, anon 경로를 완전 봉쇄해도 앱 동작에 문제 없습니다.

```sql
-- 마이그레이션 00004_secure_rls.sql

-- 기존 허용 정책 삭제
DROP POLICY IF EXISTS "Allow anon insert" ON rooms;
DROP POLICY IF EXISTS "Allow anon update" ON rooms;
-- teams, players, bids, messages 동일

-- 읽기는 유지 (Realtime 구독용)
-- INSERT/UPDATE는 service_role(서버)만 가능 — RLS 정책 없으면 anon 차단됨
-- (service_role은 RLS bypass)

-- messages: VIEWER도 읽기 가능, INSERT는 서버만
-- bids: 서버만 INSERT

-- 감사: RLS 확인용 헬퍼 함수
CREATE OR REPLACE FUNCTION is_organizer(p_room_id UUID, p_token UUID)
RETURNS BOOLEAN LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM rooms WHERE id = p_room_id AND organizer_token = p_token
  );
$$;
```

---

### 4-C. DB 트랜잭션으로 경쟁 조건 해결

포인트 차감과 낙찰 처리를 PostgreSQL 저장 프로시저(RPC)로 원자화합니다.

```sql
-- 마이그레이션 00005_atomic_award.sql

CREATE OR REPLACE FUNCTION award_player(
  p_room_id UUID,
  p_player_id UUID
) RETURNS JSONB LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_player RECORD;
  v_top_bid RECORD;
  v_team RECORD;
  v_new_balance INTEGER;
BEGIN
  -- 행 잠금으로 동시 실행 방지
  SELECT * INTO v_player FROM players
    WHERE id = p_player_id FOR UPDATE;

  -- 멱등성: 이미 처리됨
  IF v_player.status != 'IN_AUCTION' THEN
    RETURN '{"ok": true}'::JSONB;
  END IF;

  -- 타이머 재확인
  SELECT timer_ends_at INTO v_room FROM rooms WHERE id = p_room_id;
  IF v_room.timer_ends_at IS NOT NULL AND v_room.timer_ends_at > NOW() THEN
    RETURN '{"error": "timer_not_expired"}'::JSONB;
  END IF;

  -- 최고 입찰 조회
  SELECT * INTO v_top_bid FROM bids
    WHERE player_id = p_player_id AND room_id = p_room_id
    ORDER BY amount DESC LIMIT 1;

  IF v_top_bid IS NULL THEN
    UPDATE players SET status = 'UNSOLD' WHERE id = p_player_id;
  ELSE
    -- 포인트 잔고 확인 후 원자적 차감
    SELECT * INTO v_team FROM teams WHERE id = v_top_bid.team_id FOR UPDATE;
    v_new_balance := v_team.point_balance - v_top_bid.amount;
    IF v_new_balance < 0 THEN
      RETURN '{"error": "insufficient_points"}'::JSONB;
    END IF;
    UPDATE teams SET point_balance = v_new_balance WHERE id = v_top_bid.team_id;
    UPDATE players SET status = 'SOLD', team_id = v_top_bid.team_id, sold_price = v_top_bid.amount
      WHERE id = p_player_id;
  END IF;

  -- 방 초기화
  UPDATE rooms SET timer_ends_at = NULL, current_player_id = NULL WHERE id = p_room_id;

  RETURN '{"ok": true}'::JSONB;
END;
$$;
```

**사용:**
```ts
// auctionActions.ts (Server Action)
const { data } = await supabase.rpc('award_player', {
  p_room_id: roomId,
  p_player_id: playerId,
})
```

---

### 4-D. 채팅 서버 검증

ChatPanel의 직접 Supabase 삽입을 Server Action으로 교체합니다.

```ts
// src/features/auction/api/auctionActions.ts
'use server'

export async function sendMessage(roomId: string, content: string) {
  if (!content || content.trim().length === 0) return { error: '빈 메시지' }
  if (content.length > 200) return { error: '메시지가 너무 깁니다' }

  // 서버에서 쿠키 기반 역할 확인
  const cookieStore = await cookies()
  const raw = cookieStore.get(`room_auth_${roomId}`)?.value
  if (!raw) return { error: '인증 필요' }

  const { role, token, teamId } = JSON.parse(raw)

  // 서버에서 토큰 검증 후 신뢰할 수 있는 sender_name 결정
  const supabase = getServerClient()
  let senderName = '관전자'
  let verifiedRole = role

  if (role === 'ORGANIZER') {
    const { data } = await supabase.from('rooms').select('organizer_token').eq('id', roomId).single()
    if (data?.organizer_token !== token) return { error: '권한 없음' }
    senderName = '주최자'
  } else if (role === 'LEADER') {
    const { data } = await supabase.from('teams').select('leader_token, leader_name, name').eq('id', teamId).single()
    if (data?.leader_token !== token) return { error: '권한 없음' }
    senderName = data.leader_name || data.name
  }

  // 레이트 리밋 (KV 또는 단순 DB 타임스탬프 방식)
  // ...

  await supabase.from('messages').insert([{
    room_id: roomId,
    sender_name: senderName,       // 서버에서 결정
    sender_role: verifiedRole,     // 서버에서 검증됨
    content: content.trim(),
  }])
  return {}
}
```

---

### 4-E. 토큰 URL 노출 해결

링크 방식을 POST 기반으로 전환하거나 토큰을 해시로 즉시 교환합니다.

**단기 (현실적):** 쿠키 만료 및 Referrer 차단

```ts
// room-auth/route.ts 개선
cookieStore.set(cookieName, authData, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: `/room/${roomId}`,   // 경로 제한
  maxAge: 60 * 60 * 8,       // 8시간 만료 추가
})

// Referrer-Policy를 no-referrer로 강화
response.headers.set('Referrer-Policy', 'no-referrer')
```

**중기 (권장):** 토큰 교환 방식으로 전환

```
1. 공유 링크에 short-lived one-time code 포함
2. /api/room-auth에서 code를 검증하고 DB의 실제 토큰과 교환
3. URL에는 영구 토큰이 노출되지 않음
```

---

### 4-F. xlsx 취약점 완화

```ts
// CreateRoomModal.tsx — 파일 크기 제한 추가
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2MB

const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return
  if (file.size > MAX_FILE_SIZE) {
    alert('파일 크기가 2MB를 초과합니다.')
    return
  }
  // 파일 타입 검사
  if (!file.name.match(/\.(xlsx|xls|csv)$/i)) {
    alert('지원하지 않는 파일 형식입니다.')
    return
  }
  // 기존 파싱 로직...
}
```

**대안 라이브러리:** `exceljs` (xlsx 대체, 알려진 취약점 없음) 또는 CSV-only 방식으로 단순화.

---

### 4-G. 입력값 서버 검증 강화

```ts
// 입찰액 검증 강화 (auctionActions.ts)
const MAX_BID_AMOUNT = 100_000  // 10만P 상한

export async function placeBid(...) {
  if (!Number.isFinite(amount) || amount <= 0) return { error: '유효하지 않은 입찰액' }
  if (amount % 10 !== 0) return { error: '10P 단위만 입찰 가능합니다' }
  if (amount > MAX_BID_AMOUNT) return { error: `최대 입찰액은 ${MAX_BID_AMOUNT.toLocaleString()}P입니다` }
  // UUID 형식 검증
  if (!isValidUUID(roomId) || !isValidUUID(playerId) || !isValidUUID(teamId)) {
    return { error: '유효하지 않은 요청' }
  }
  // ...
}

function isValidUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}
```

---

### 4-H. 레이트 리밋

Next.js middleware 또는 Supabase Edge Function에서 IP 기반 제한을 적용합니다.

```ts
// src/middleware.ts에 추가 (간단한 인메모리 방식 — Vercel 단일 인스턴스 환경)
// 프로덕션에서는 Upstash Redis 등 외부 KV 사용 권장

const bidRateLimit = new Map<string, number>()  // teamId → lastBidTimestamp

// Server Action 내부
const lastBid = bidRateLimit.get(teamId) ?? 0
if (Date.now() - lastBid < 1500) {  // 1.5초 간격 제한
  return { error: '너무 빠른 입찰입니다. 잠시 후 다시 시도하세요.' }
}
bidRateLimit.set(teamId, Date.now())
```

---

### 4-I. 감사 로그

```sql
-- 마이그레이션 00006_audit_log.sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  action TEXT NOT NULL,  -- 'BID_PLACED', 'PLAYER_AWARDED', 'ROOM_DELETED', etc.
  actor_role TEXT,
  actor_team_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX ON audit_logs (room_id, created_at DESC);
```

```ts
// 낙찰 처리 후 자동 기록
await supabase.from('audit_logs').insert([{
  room_id: roomId,
  action: 'PLAYER_AWARDED',
  actor_role: 'SYSTEM',
  metadata: { playerId, teamId: topBid.team_id, amount: topBid.amount }
}])
```

---

## 5. 우선순위별 구현 로드맵

### Phase 1 — 즉시 적용 (1~2일, 코드 변경 최소)

> **목표:** 가장 치명적인 취약점을 빠르게 차단

| 작업 | 파일 | 예상 공수 |
|------|------|----------|
| 쿠키에 `maxAge: 28800` (8h) 추가 | `room-auth/route.ts` | 5분 |
| 쿠키 `path`를 `/room/${roomId}`로 제한 | `room-auth/route.ts` | 5분 |
| `Referrer-Policy: no-referrer` 적용 | `middleware.ts` | 5분 |
| 미들웨어 matcher에 `/api/*` 포함 (보안 헤더 적용) | `middleware.ts` | 10분 |
| 입찰액 상한 검증 추가 (`MAX_BID_AMOUNT = 100_000`) | `auctionActions.ts` | 15분 |
| UUID 형식 검증 추가 | `auctionActions.ts` | 20분 |
| Excel 파일 크기·타입 제한 | `CreateRoomModal.tsx` | 20분 |
| 프로덕션 env 검증 (`throw` on missing) | `supabase.ts` | 10분 |

---

### Phase 2 — 단기 적용 (1주일)

> **목표:** 서버 측 권한 검증으로 핵심 보안 구조 전환

| 작업 | 파일 | 예상 공수 |
|------|------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` 환경 변수 추가 | `.env.local` | 15분 |
| `getServerClient()` 헬퍼 작성 | `lib/supabase-server.ts` | 30분 |
| `verifyRole()` 공통 함수 작성 | `auctionActions.ts` | 1h |
| 모든 액션에 `'use server'` + 역할 검증 추가 | `auctionActions.ts` | 4h |
| `sendMessage` Server Action으로 교체 | `auctionActions.ts` + `ChatPanel.tsx` | 2h |
| 클라이언트용 `supabase.ts`는 READ 전용으로만 사용 (구독·조회) | `lib/supabase.ts` | 30분 |

---

### Phase 3 — 중기 적용 (2주일)

> **목표:** DB 레벨 보안 및 원자성 보장

| 작업 | 위치 | 예상 공수 |
|------|------|----------|
| RLS 정책 강화 마이그레이션 작성 | `supabase/migrations/00004_secure_rls.sql` | 2h |
| `award_player` PostgreSQL RPC 함수 작성 | `supabase/migrations/00005_atomic_award.sql` | 3h |
| `place_bid` 원자적 처리 RPC 작성 | `supabase/migrations/00005_atomic_award.sql` | 3h |
| 감사 로그 테이블 및 트리거 추가 | `supabase/migrations/00006_audit_log.sql` | 2h |
| `auction_archives`에 INSERT 정책 추가 | `00004_secure_rls.sql` | 30분 |
| Supabase SQL Editor에서 마이그레이션 실행 | Supabase Dashboard | 30분 |

---

### Phase 4 — 장기 개선 (1개월+)

| 작업 | 설명 |
|------|------|
| xlsx → exceljs 교체 | 알려진 취약점 없는 라이브러리로 마이그레이션 |
| Upstash Redis 레이트 리밋 | Vercel Edge에서 글로벌 레이트 리밋 |
| One-time code 링크 방식 | 토큰 URL 노출 완전 차단 |
| Presence 서버 검증 | Supabase Edge Function으로 presence 페이로드 검증 |
| 통합 테스트 추가 | 권한 우회 시나리오 자동 테스트 |

---

## 6. 보안 베이스라인 현황

### 현재 잘 구현된 사항 ✅

| 항목 | 평가 |
|------|------|
| CSP Nonce 동적 생성 | 우수 — XSS 방어에 효과적 |
| HttpOnly 쿠키 | 양호 — JS 접근 차단 |
| `X-Frame-Options: DENY` | 클릭재킹 방어 |
| `X-Content-Type-Options: nosniff` | MIME 스니핑 방어 |
| `SameSite: lax` | CSRF 기본 방어 |
| awardPlayer 클라이언트 중복 방지 (`awardLock`) | 낙찰 이중 처리 부분 방어 |
| 입찰 중복 방지 (최고 입찰자 체크) | 양호 |
| 팀 정원 체크 (서버 측 count) | 양호 |

### 개선 전후 비교

| 항목 | 현재 | Phase 2 이후 |
|------|------|------------|
| 권한 검증 위치 | 클라이언트 only | 서버 (Server Action) |
| DB 직접 쓰기 | 누구나 가능 | service_role 전용 |
| 채팅 역할 신뢰도 | 클라이언트 전달 값 | 서버 검증 값 |
| 낙찰 원자성 | 5개 분리 쿼리 | DB 트랜잭션(RPC) |
| 포인트 이중 지출 | 가능 | DB 행 잠금으로 차단 |
| 감사 추적 | 없음 | audit_logs 테이블 |

---

> **참고:** 이 프로젝트는 지인 내부 전용 툴로 설계되어 있어 완전한 Public SaaS 수준의 보안이 반드시 필요하지는 않습니다. 그러나 Phase 1(즉시 적용)과 Phase 2(서버 측 권한 검증)는 참여자 간 의도치 않은 어뷰징 및 실수를 방지하기 위해 **강력히 권장**됩니다. Phase 3의 DB 트랜잭션 처리는 경매 결과의 무결성을 보장하기 위해 필수적입니다.
