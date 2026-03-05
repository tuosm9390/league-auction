# Client: Auction Logic

경매 비즈니스 핵심 로직과 Server Action을 정의합니다 (`auctionActions.ts`).

## 주요 Server Actions

위치: `src/features/auction/api/auctionActions.ts`
이 서비스는 토큰 및 역할을 세밀하게 검증하지 않습니다 (의도된 내부 툴 규격 - 지인용 설계). DB 제어에는 RLS를 우회하는 `getServerClient()`가 사용됩니다.

- `drawNextPlayer(roomId)`: 대기중인 선수를 무작위로 추출(`IN_AUCTION`). 아직 타이머 시작 안 함.
- `startAuction(roomId, durationMs?)`: 타이머를 시작/재설정(기본 10초).
- `pauseAuction(roomId)` / `resumeAuction`: 연결 대기, 재개 로직.
- `placeBid(roomId, playerId, teamId, amount)`: 포인트, 현재 상태, 타이머 유효성을 1초 딜레이(lag tolerance)까지 검증하며 입찰을 처리합니다. 남은 시간이 5초 미만일 경우 `EXTEND_DURATION`만큼 타이머를 연장합니다.
- `awardPlayer(roomId, playerId)`: (멱등성 보장) 경쟁 조건을 막기 위해 다중 호출을 방지하며, 선수를 `SOLD` 또는 `UNSOLD` 처리합니다.
- `draftPlayer(roomId, playerId, teamId)`: 유찰 또는 대기 선수를 각 팀장이 0포인트로 영입합니다.
- `restartAuctionWithUnsold(roomId)`: 유찰 선수들을 전부 재경매 대상(WAITING)으로 세팅합니다.
- `deleteRoom(roomId)`: 모든 하위 데이터와 방을 연쇄 삭제합니다.

## 타이머 및 상수

- `AUCTION_DURATION_MS = 10_000` (10초)
- `EXTEND_THRESHOLD_MS = 5_000` (5초 미만시 연장)
- `EXTEND_DURATION_MS = 5_000` (5초 연장)

## 자동 낙찰 조건

방장의 클라이언트 단 타이머가 만료 시 오동작(`awardLock` 사용)을 방지하며 지연 시간 보정용 `grace(+1500ms)`을 주어 `awardPlayer`를 1회 자동 호출합니다.

## 성능 최적화 교훈: Optimistic Update 의무화

시간에 민감한 상태(타이머 갱신 등)를 수정하는 Server Action(`startAuction`, `placeBid` 등)은 반드시 변경된 상태 값(예: `timerEndsAt`)을 반환해야 합니다. 클라이언트틑 300~600ms 걸리는 Supabase 실시간 소켓 업데이트를 기다리지 않고 방금 액션으로부터 반환받은 값을 Zustand에 **Optimistic Update**로 즉시 반영해야 UI가 동기화 지연 없이 정상적으로 작동합니다.
