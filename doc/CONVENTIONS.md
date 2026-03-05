작성일: 2026-03-05 15:52:00
작성자: Antigravity

# Conventions & Styles

이 문서는 League Auction 프로젝트의 개발 규칙, 디자인 컨벤션 및 알려진 이슈를 정리합니다.

## Key Conventions

- All Supabase mutations are done in `auctionActions.ts` (Server Actions), never inline in components.
- Components are role-gated: check `effectiveRole` from `useRoomAuth` before rendering controls.
- Never call `awardPlayer` more than once per auction cycle — use `awardLock` ref.
- Timer extension logic lives in `placeBid` (client-side Supabase call with extend check).
- Path alias `@/*` maps to `src/*`.

## 모바일 반응형 디자인

`src/app/room/[id]/RoomClient.tsx` 파일은 화면 크기에 따라 Mobile-first 레이아웃을 사용합니다.

- 기본(모바일 화면): `flex-col` 구조 — 위에서부터 경매 보드(AuctionBoard) → 실시간 채팅(ChatPanel) → 팀 리스트(TeamList) 순서로 표시
- `lg` 이상(데스크탑 화면): 12칼럼 CSS 그리드 시스템 적용
  - 좌측: 팀 리스트 (3 칼럼)
  - 중앙: 경매 보드 (6 칼럼)
  - 우측: 실시간 채팅 (3 칼럼)

## Custom Tailwind Colors

디자인 테마 컬러는 `src/app/globals.css` 파일의 `@theme` 블록에 정의되어 있습니다:

- `minion-yellow`: `#FBE042` / hover 시 `#F2D214`
- `minion-blue`: `#2358A4` / hover 시 `#194079`
- `minion-grey`: `#808080`
- `minion-skin`: `#FFC09A`

## Known Issues

- 토큰 검증 없음 (의도적 결정 — 내부 지인용 툴이므로 인증 보안은 생략됨).
- 그 외 현재 미수정된 주요 라이브 버그는 없습니다.
