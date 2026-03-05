'use server'

import {
  getServerClient,
  broadcastState,
  type CreateRoomPayload,
  type CreateRoomResult,
  type AuctionArchivePayload,
} from './serverActionUtils'
import { broadcastEvent } from '@/lib/supabase-server'

// ---------- 방 생성 ----------

/** 방 + 팀 + 선수를 service_role로 생성 (구독자가 없으므로 Broadcast 없음) */
export async function createRoom(payload: CreateRoomPayload): Promise<CreateRoomResult> {
  const db = getServerClient()

  const { data: room, error: roomError } = await db
    .from('rooms')
    .insert([{
      name: payload.name,
      total_teams: payload.totalTeams,
      base_point: payload.basePoint,
      members_per_team: payload.membersPerTeam,
    }])
    .select()
    .single()
  if (roomError) return { error: roomError.message }

  const teamsData = payload.captains.map((c) => ({
    room_id: room.id,
    name: c.teamName,
    point_balance: payload.basePoint - c.captainPoints,
    leader_name: c.name,
    leader_position: c.position,
    leader_description: c.description,
    captain_points: c.captainPoints,
  }))
  const { data: teamsResult, error: teamsError } = await db
    .from('teams')
    .insert(teamsData)
    .select()
  if (teamsError) return { error: teamsError.message }

  if (payload.players.length > 0) {
    const playersData = payload.players.map((p) => ({
      room_id: room.id,
      name: p.name,
      tier: p.tier,
      main_position: p.mainPosition,
      sub_position: p.subPosition,
      description: p.description,
    }))
    const { error: playersError } = await db.from('players').insert(playersData)
    if (playersError) return { error: playersError.message }
  }

  return {
    roomId: room.id,
    organizerToken: room.organizer_token,
    viewerToken: room.viewer_token,
    teams: (teamsResult ?? []).map((t) => ({
      id: t.id,
      name: t.name,
      leader_token: t.leader_token,
    })),
  }
}

// ---------- auction_archives ----------

/** 경매 결과를 auction_archives 테이블에 영구 저장 (Broadcast 없음 — 방 종료 직전) */
export async function saveAuctionArchive(payload: AuctionArchivePayload): Promise<{ error?: string }> {
  const db = getServerClient()
  const { error } = await db.from('auction_archives').insert([{
    room_id: payload.roomId,
    room_name: payload.roomName,
    room_created_at: payload.roomCreatedAt,
    closed_at: new Date().toISOString(),
    result_snapshot: payload.teams,
  }])
  if (error) return { error: error.message }
  return {}
}

// ---------- 방 삭제 ----------

/** 방 종료 — 토큰 무효화 후 전체 삭제 → Broadcast { roomDeleted: true } */
export async function deleteRoom(roomId: string): Promise<{ error?: string }> {
  const db = getServerClient()

  const { data: roomData } = await db.from('rooms').select('name').eq('id', roomId).single()
  const currentName = roomData?.name || '경매방'

  // 토큰 무효화 (입장 링크 차단)
  await db.from('rooms').update({
    name: `[종료된 경매] ${currentName}`,
    organizer_token: crypto.randomUUID(),
    viewer_token: crypto.randomUUID(),
  }).eq('id', roomId)

  // 방 삭제 전 모든 클라이언트에 알림
  await broadcastEvent(roomId, 'STATE_UPDATE', { roomDeleted: true })

  const tables = ['bids', 'messages', 'players', 'teams'] as const
  for (const table of tables) {
    const { error: delErr } = await db.from(table).delete().eq('room_id', roomId)
    if (delErr) console.error(`deleteRoom: ${table} 삭제 실패 (계속 진행):`, delErr.message)
  }

  const { error: roomErr } = await db.from('rooms').delete().eq('id', roomId)
  if (roomErr) {
    return { error: `방 삭제에 실패했습니다. (토큰은 무효화됨): ${roomErr.message}` }
  }

  return {}
}
