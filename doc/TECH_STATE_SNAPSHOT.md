# 💾 TECH_STATE_SNAPSHOT (Session Handover)

## 1. Where are we? (현재 진행 상황)

- **완료된 작업**:
  1. **코드베이스 정비**: `CLAUDE.md` 및 `MEMORY.md`를 현재 커밋(`abe6710`) 기준 실제 코드 상태에 맞게 전면 업데이트 완료.
  2. **저장소 초기화**: 로컬 및 GitHub 원격 저장소를 `abe6710` 커밋 상태로 hard reset + force push 완료.
  3. **원격 URL 수정**: GitHub 저장소명 변경 감지 → remote origin을 `https://github.com/tuosm9390/minionsbid.git`으로 업데이트 완료.
  4. **권한 검증 로직 점검**: 경매방 입장 ~ 팀장 권한 동작까지 전체 흐름 코드 리뷰 완료. 6개 버그 발견.
  5. **P0/P1 버그 수정 완료** (빌드 통과 확인):

  | # | 위치 | 수정 내용 |
  |---|---|---|
  | 1 | `src/app/api/room-auth/route.ts` | `path: '/'` → `path: '/room/${roomId}'` + `maxAge: 8h` 추가 |
  | 2 | `src/features/auction/store/useAuctionStore.ts` | `setRoomContext`에서 `isRoomLoaded: false` 리셋 제거 |
  | 2 | `src/features/auction/hooks/useRoomAuth.ts` | 검증 실패 시 `setRoomContext` 재호출 제거, 의존성 배열 정리 |
  | 3 | `src/lib/supabase-server.ts` | 신규 생성 — service_role key 기반 서버 전용 클라이언트 |
  | 3 | `src/features/auction/api/auctionActions.ts` | `'use server'` + `getServerClient()` 전환 + `verifyOrganizer/verifyLeader/verifyAnyRole` 추가 + `isValidUUID` 검증 + `sendChatMessage/sendNotice/sendLotteryClosedMessage` 추가 |
  | 4 | `src/app/room/[id]/RoomClient.tsx` | `handleNotice` → `sendNotice` Server Action 전환, `supabase` import 제거 |

- **현재 상태**: P0/P1 버그 4건 수정 완료. `npm run build` 통과. 미수정 버그 2건 존재 (하단 참고).

- **미수정 버그**:

  | # | 위치 | 증상 | 심각도 |
  |---|---|---|---|
  | 5 | `src/features/auction/hooks/useRoomAuth.ts` | LEADER 검증 타이밍 지연 — `fetchAll`이 `setRealtimeData`를 2번 분리 호출하여 검증 사이클 추가 발생 | P1 |
  | 6 | `src/app/room/[id]/RoomClient.tsx` `BiddingControl` | `teamIdParam` (쿠키 원본값) 직접 전달 — 쿠키 충돌 시 잘못된 팀 ID로 입찰 가능 | P2 |

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

- **목표**: 미수정 버그 처리 및 기능 개선

- **세부 지시사항**:

  1. **[P1] 버그 5 수정 — fetchAll 단일 호출로 통합**
     - `src/features/auction/hooks/useAuctionRealtime.ts`의 `fetchAll` 내에서 `setRealtimeData`를 2번 분리 호출하는 구조를 1번 통합 호출로 변경
     - LEADER 검증이 `isRoomLoaded: true` + `teams` 동시에 설정된 상태에서 1회만 실행되도록 보장

  2. **[P2] 버그 6 수정 — BiddingControl teamId 검증 강화**
     - `RoomClient.tsx`에서 `BiddingControl`에 전달하는 `teamId`를 `teamIdParam` (쿠키 원본) 대신 `useRoomAuth`에서 검증된 값 기반으로 전달
     - 현재 `effectiveRole === 'LEADER'` 검증 후 렌더링되므로 실질적 위험은 낮으나, 명시적으로 검증된 teamId를 전달하는 것이 안전

  3. **환경 변수 설정 안내**
     - `.env.local`에 `SUPABASE_SERVICE_ROLE_KEY` 추가 필요 (Server Actions 동작을 위한 필수 값)
     - Vercel 배포 환경 변수에도 추가 필요

  4. **빌드 경고 해결 (선택)**
     - `src/middleware.ts` → Next.js 16에서 deprecated. `src/proxy.ts`로 파일명 변경 검토
     - `layout.tsx`에 `metadataBase` URL 설정

  5. 수정 완료 후 커밋 및 push
