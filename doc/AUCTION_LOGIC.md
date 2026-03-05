작성일: 2026-03-05 15:52:00
작성자: Antigravity

# Auction Logic

이 문서는 League Auction 프로젝트의 주요 경매 비즈니스 로직과 Server Actions에 대해 설명합니다.

`src/features/auction/api/auctionActions.ts`

`'use server'` Server Actions. `getServerClient()` (service_role key, RLS 우회)로 DB 조작. **토큰/역할 검증 없음** (지인용 내부 툴). 제거된 항목: `isValidUUID`, `verifyOrganizer`, `verifyLeader`, `verifyAnyRole`, `sendChatMessage`, `sendLotteryClosedMessage`.

Timer constants:

- `AUCTION_DURATION_MS = 10_000`
- `EXTEND_THRESHOLD_MS = 5_000`
- `EXTEND_DURATION_MS = 5_000`

## Server Actions 목록

| Function                                     | Purpose                                                                                                                                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `drawNextPlayer(roomId)`                     | Picks random `WAITING` player → `IN_AUCTION`, sets `current_player_id` (no timer yet)                                                                                                       |
| `startAuction(roomId, durationMs?)`          | Sets `timer_ends_at = now + 10s` (or custom), sends system message                                                                                                                          |
| `pauseAuction(roomId)`                       | Sets `timer_ends_at = null` (on team leader disconnect), sends warning system message                                                                                                       |
| `resumeAuction(roomId)`                      | Sets `timer_ends_at = now + 5s` (on reconnect), sends resume message                                                                                                                        |
| `placeBid(roomId, playerId, teamId, amount)` | Validates 10P units, point balance, team capacity, timer active (1s tolerance for network lag), not already top bidder; inserts bid; extends timer to 5s if <5s remaining                   |
| `awardPlayer(roomId, playerId)`              | **Idempotent** — re-checks timer not extended (race condition guard), re-checks `status === 'IN_AUCTION'`. Marks `SOLD` (deducts points) or `UNSOLD` (no bids). Calls `clearRoomAuction()`. |
| `draftPlayer(roomId, playerId, teamId)`      | Assigns `UNSOLD` or `WAITING` player to team at 0P (free contract). Validates room membership and team capacity.                                                                            |
| `restartAuctionWithUnsold(roomId)`           | Converts all `UNSOLD` → `WAITING` for re-auction                                                                                                                                            |
| `deleteRoom(roomId)`                         | Invalidates tokens first (room rename + new tokens), then deletes bids → messages → players → teams → room                                                                                  |
| `saveAuctionArchive(payload)`                | Saves final results snapshot to `auction_archives` table. `ArchiveTeam`, `AuctionArchivePayload` 타입은 이 파일 상단에 인라인 정의.                                                         |

## 핵심 메커니즘

**Auto-award on timer expiry**:
Organizer's client sets `setTimeout(delay + 1500ms grace)` with a `useRef` lock (`awardLock`) to prevent double execution. `playersRef` avoids stale closures.

**Post-auction UNSOLD handling:**

- 소수 빈자리: ORGANIZER가 팀별로 `draftPlayer` 호출 (자유계약 영입). WAITING 선수도 가능.
- 다수 빈자리: `restartAuctionWithUnsold` → 재경매

**`handleNotice` (공지 전송)**:
`RoomClient.tsx` 내부에서 `sendNotice` Server Action 호출. 서버사이드에서 ORGANIZER 역할 검증 후 DB INSERT.
