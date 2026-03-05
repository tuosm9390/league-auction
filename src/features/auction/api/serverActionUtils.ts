

import { getServerClient, broadcastEvent } from '@/lib/supabase-server'
import type { Team, Player, Bid, Message } from '@/features/auction/store/useAuctionStore'

// ---------- 타입 ----------

/** broadcastState가 서버에서 fetch한 방 상태 — awardPlayer 반환값으로도 사용 */
export type RoomStatePayload = {
  basePoint: number
  totalTeams: number
  membersPerTeam: number
  timerEndsAt: string | null
  createdAt: string
  roomName: string
  organizerToken: string
  viewerToken: string
  teams: Team[]
  bids: Bid[]
  players: Player[]
  messages: Message[]
}

export interface CreateRoomCaptain {
  teamName: string
  name: string
  position: string
  description: string
  captainPoints: number
}

export interface CreateRoomPlayer {
  name: string
  tier: string
  mainPosition: string
  subPosition: string
  description: string
}

export interface CreateRoomPayload {
  name: string
  totalTeams: number
  basePoint: number
  membersPerTeam: number
  captains: CreateRoomCaptain[]
  players: CreateRoomPlayer[]
}

export interface CreateRoomResult {
  error?: string
  roomId?: string
  organizerToken?: string
  viewerToken?: string
  teams?: { id: string; name: string; leader_token: string }[]
}

export interface ArchiveTeam {
  id: string
  name: string
  leader_name: string
  point_balance: number
  players: { name: string; sold_price: number | null }[]
}

export interface AuctionArchivePayload {
  roomId: string
  roomName: string
  roomCreatedAt: string
  teams: ArchiveTeam[]
}

// ---------- 상수 ----------

export const AUCTION_DURATION_MS = 10_000   // 경매 시간 10초
export const EXTEND_THRESHOLD_MS = 5_000   // 5초 이하 입찰 시 연장
export const EXTEND_DURATION_MS = 5_000    // 5초 연장

// ---------- 내부 헬퍼 ----------

/** 전체 방 상태를 DB에서 읽어 Broadcast payload 형태로 반환 */
export async function fetchRoomState(
  db: ReturnType<typeof getServerClient>,
  roomId: string,
): Promise<RoomStatePayload | null> {
  const [roomRes, teamsRes, playersRes, messagesRes] = await Promise.all([
    db.from('rooms').select('*').eq('id', roomId).single(),
    db.from('teams').select('*').eq('room_id', roomId),
    db.from('players').select('*').eq('room_id', roomId),
    db.from('messages').select('*').eq('room_id', roomId)
      .order('created_at', { ascending: true }).limit(200),
  ])

  const room = roomRes.data
  if (!room) return null

  const currentPlayerId = room.current_player_id
  const bidsRes = currentPlayerId
    ? await db.from('bids').select('*')
        .eq('player_id', currentPlayerId)
        .eq('room_id', roomId)
        .order('created_at', { ascending: true })
    : { data: [] }

  return {
    basePoint: room.base_point,
    totalTeams: room.total_teams,
    membersPerTeam: room.members_per_team ?? 5,
    timerEndsAt: room.timer_ends_at,
    createdAt: room.created_at,
    roomName: room.name,
    organizerToken: room.organizer_token,
    viewerToken: room.viewer_token,
    teams: teamsRes.data || [],
    bids: bidsRes.data || [],
    players: playersRes.data || [],
    messages: messagesRes.data || [],
  }
}

/** DB 쓰기 완료 후 전체 상태를 Broadcast로 전파 */
export async function broadcastState(
  roomId: string,
  db: ReturnType<typeof getServerClient>,
) {
  const state = await fetchRoomState(db, roomId)
  if (state) await broadcastEvent(roomId, 'STATE_UPDATE', state)
}

/** 
 * 서버 액션 내에서 상태 파생 및 브로드캐스트 로직의 보일러플레이트를 줄이기 위한 래퍼 함수.
 * 에러 없이 로직이 성공하면 DB에서 방의 최신 상태를 읽고, STATE_UPDATE 브로드캐스트를 전송합니다.
 */
export async function withBroadcast<R extends { error?: string }>(
  roomId: string,
  actionFn: (db: ReturnType<typeof getServerClient>) => Promise<R>
): Promise<R & { state?: RoomStatePayload }> {
  const db = getServerClient()
  const result = await actionFn(db)
  
  if (!result.error) {
    const state = await fetchRoomState(db, roomId)
    if (state) {
      // 개발 환경이나 Vercel에서 after() 미작동 상황 방지를 위한 직접 await 처리
      await broadcastEvent(roomId, 'STATE_UPDATE', state)
      return { ...result, state }
    }
  }
  
  return result
}

/** 시스템 메시지 삽입 */
export async function sysMsg(
  db: ReturnType<typeof getServerClient>,
  roomId: string,
  content: string,
) {
  await db.from('messages').insert([{
    room_id: roomId,
    sender_name: '시스템',
    sender_role: 'SYSTEM',
    content,
  }])
}

// getServerClient re-export (도메인 모듈에서 직접 사용)
export { getServerClient, broadcastEvent }
