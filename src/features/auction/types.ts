/** 경매 아카이브 저장 시 사용하는 팀 스냅샷 타입 */
export interface ArchiveTeam {
  id: string
  name: string
  leader_name: string
  point_balance: number
  players: { name: string; sold_price: number | null }[]
}

/** saveAuctionArchive Server Action 파라미터 타입 */
export interface AuctionArchivePayload {
  roomId: string
  roomName: string
  roomCreatedAt: string
  teams: ArchiveTeam[]
}
