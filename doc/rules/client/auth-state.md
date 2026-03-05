# Client: Auth State

사용자 인증 모델과 Zustand 전역 상태 및 실시간 구독 아키텍처 규칙을 설명합니다.

## 인증 모델 (Auth Model)

Supabase Auth 방식을 채택하지 않으며, 서버에서 설정되는 **HttpOnly 쿠키 방식**으로 역할을 인증합니다.

- 역할 분류: ORGANIZER(방장), LEADER(팀장), VIEWER(관전자)
- 공유 링크 인증: `/api/room-auth?roomId={id}&role=ORGANIZER&token={token}` 접근 방식으로 작동.
- 쿠키 이름: `room_auth_{roomId}_ROLE`
- **로직**: 이 Route Handler 는 안전한 접근을 위해 인증 성공시 8시간 기한의 쿠키를 설정하며 역할을 부여해 방으로 Redirect 합니다.
- **클라이언트 차단**: `page.tsx`가 쿠키를 파싱하며, 역할이 `null`로 인증되지 않으면 `<Guard>` 화면을 통해 접근을 차단합니다.

## 상태 관리 스토어 (useAuctionStore.ts)

Zustand 라이브러리를 통해 프로젝트의 거의 모든 화면 UI를 제어하는 상태를 담고 있습니다.

- `setRoomContext()`: 방 번호, 권한, 자신의 팀을 설정합니다. 리렌더링 플리커링 방지를 위해 `isRoomLoaded` 상태를 리셋하지 않습니다.
- `setRealtimeData()`: 매크로 실시간 이벤트를 전역 병합하며 초기화 신호로 `isRoomLoaded: true` 플래그를 세팅합니다.
- 각종 Immutable 업데이트 함수 제공.

## 실시간 구독 아키텍처 전략 (useAuctionRealtime.ts)

네트워크 사용량 및 리렌더링 수를 최소화합니다.

- DB Update 이벤트: 부분 변경으로 즉시 Store 병합(`rooms`, `players`, `teams`).
- Insert/Delete 이벤트: 단건의 싱크미스를 무마하기 위한 `fetchAll` 함수로 최신 데이터 전면 새로고침. 단, `fetchingRef`를 둬서 다중 동시 새로고침을 막습니다. (단, 잦은 `Bids`/`Messages` 입력은 캐시 기반으로 실시간 최적화해 단건 덮어쓰기로 구동함.)
- **3초 롱 폴링 Fallback 적용**: 이벤트 파이프라인 단락시에도 화면이 얼어붙지 않도록 서버시간(`setInterval` 3초)을 참조하며 `rooms`, `teams`, `players` 목록만 계속하여 불러옵니다.
