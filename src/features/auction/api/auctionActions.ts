'use server'

import { getServerClient, broadcastEvent } from '@/lib/supabase-server'
import type { Team, Player, Bid, Message } from '@/features/auction/store/useAuctionStore'

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

const AUCTION_DURATION_MS = 10_000      // 경매 시간 10초
const EXTEND_THRESHOLD_MS = 5_000      // 5초 이하 입찰 시 연장
const EXTEND_DURATION_MS = 5_000      // 5초 연장

// ---------- 타입 ----------

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

// ---------- 내부 헬퍼 ----------

/** 전체 방 상태를 DB에서 읽어 Broadcast payload 형태로 반환 */
async function fetchRoomState(db: ReturnType<typeof getServerClient>, roomId: string): Promise<RoomStatePayload | null> {
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
async function broadcastState(roomId: string, db: ReturnType<typeof getServerClient>) {
  const state = await fetchRoomState(db, roomId)
  if (state) await broadcastEvent(roomId, 'STATE_UPDATE', state)
}

async function sysMsg(db: ReturnType<typeof getServerClient>, roomId: string, content: string) {
  await db.from('messages').insert([{
    room_id: roomId,
    sender_name: '시스템',
    sender_role: 'SYSTEM',
    content,
  }])
}

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

// ---------- 채팅 ----------

/** 일반 채팅 메시지 전송 → Broadcast STATE_UPDATE */
export async function sendChatMessage(
  roomId: string,
  senderName: string,
  senderRole: string,
  content: string,
): Promise<{ error?: string }> {
  if (!content.trim() || content.length > 200) return { error: '유효하지 않은 메시지' }
  const validRoles = ['ORGANIZER', 'LEADER', 'VIEWER', 'SYSTEM', 'NOTICE']
  const safeSenderRole = validRoles.includes(senderRole) ? senderRole : 'VIEWER'
  const db = getServerClient()
  const { error } = await db.from('messages').insert([{
    room_id: roomId,
    sender_name: senderName,
    sender_role: safeSenderRole,
    content: content.trim(),
  }])
  if (error) return { error: error.message }
  await broadcastState(roomId, db)
  return {}
}

/** 공지 전송 (ORGANIZER 전용 UI) → Broadcast STATE_UPDATE */
export async function sendNotice(roomId: string, content: string): Promise<{ error?: string }> {
  if (!content.trim() || content.length > 200) return { error: '유효하지 않은 공지' }
  const db = getServerClient()
  const { error } = await db.from('messages').insert([{
    room_id: roomId,
    sender_name: '주최자',
    sender_role: 'NOTICE',
    content: content.trim(),
  }])
  if (error) return { error: error.message }
  await broadcastState(roomId, db)
  return {}
}

// ---------- 경매 흐름 ----------

/** 랜덤으로 WAITING 선수 1명을 IN_AUCTION으로 전환 → Broadcast STATE_UPDATE */
export async function drawNextPlayer(roomId: string): Promise<{ error?: string }> {
  const db = getServerClient()

  const { data: currentRoom } = await db
    .from('rooms')
    .select('current_player_id')
    .eq('id', roomId)
    .single()
  if (currentRoom?.current_player_id) {
    return { error: '이미 경매 중인 선수가 있습니다.' }
  }

  const { data: waiting } = await db
    .from('players')
    .select('id, name')
    .eq('room_id', roomId)
    .eq('status', 'WAITING')

  if (!waiting || waiting.length === 0) {
    return { error: '대기 중인 선수가 없습니다.' }
  }

  const player = waiting[Math.floor(Math.random() * waiting.length)]

  const { error: pErr } = await db
    .from('players')
    .update({ status: 'IN_AUCTION' })
    .eq('id', player.id)
  if (pErr) return { error: pErr.message }

  const { error: rErr } = await db
    .from('rooms')
    .update({ current_player_id: player.id })
    .eq('id', roomId)
  if (rErr) return { error: rErr.message }

  await broadcastState(roomId, db)
  return {}
}

/** 추첨 모달 닫기 — 시스템 메시지 전송 + CLOSE_LOTTERY 브로드캐스트 + STATE_UPDATE */
export async function closeLotteryAction(
  roomId: string,
  playerName: string,
): Promise<{ error?: string }> {
  const db = getServerClient()
  await sysMsg(db, roomId, `🎲 ${playerName} 선수 등장! (경매 시작 전)`)
  // STATE_UPDATE를 먼저 보내 메시지가 반영된 전체 상태를 클라이언트에 전달
  await broadcastState(roomId, db)
  // CLOSE_LOTTERY는 모달 닫기 전용 — 상태 payload 없음
  await broadcastEvent(roomId, 'CLOSE_LOTTERY', {})
  return {}
}

/** 경매(타이머) 시작 → Broadcast STATE_UPDATE */
export async function startAuction(
  roomId: string,
  durationMs?: number,
): Promise<{ error?: string; timerEndsAt?: string }> {
  const db = getServerClient()
  const { data: room } = await db
    .from('rooms')
    .select('current_player_id, timer_ends_at')
    .eq('id', roomId)
    .single()

  if (!room?.current_player_id) return { error: '진행할 선수가 없습니다.' }

  if (room.timer_ends_at && new Date(room.timer_ends_at).getTime() > Date.now()) {
    return { error: '이미 경매가 진행 중입니다.' }
  }

  const { data: player } = await db
    .from('players')
    .select('name')
    .eq('id', room.current_player_id)
    .single()

  const duration = durationMs || AUCTION_DURATION_MS
  const timerEndsAt = new Date(Date.now() + duration).toISOString()
  const { error: rErr } = await db
    .from('rooms')
    .update({ timer_ends_at: timerEndsAt })
    .eq('id', roomId)
  if (rErr) return { error: rErr.message }

  await sysMsg(db, roomId, `▶️ ${player?.name || '현재'} 선수 경매 시작! (${duration / 1000}초)`)
  await broadcastState(roomId, db)
  return { timerEndsAt }
}

/** 경매 일시 정지 → Broadcast STATE_UPDATE */
export async function pauseAuction(roomId: string): Promise<{ error?: string }> {
  const db = getServerClient()
  const { error } = await db
    .from('rooms')
    .update({ timer_ends_at: null })
    .eq('id', roomId)
  if (error) return { error: error.message }

  await sysMsg(db, roomId, `⚠️ 팀장 접속 이탈로 인해 경매가 일시 중단되었습니다.`)
  await broadcastState(roomId, db)
  return {}
}

/** 중단된 경매 재개 → Broadcast STATE_UPDATE */
export async function resumeAuction(roomId: string): Promise<{ error?: string }> {
  const RESUME_DURATION_MS = 5_000
  const timerEndsAt = new Date(Date.now() + RESUME_DURATION_MS).toISOString()

  const db = getServerClient()
  const { error } = await db
    .from('rooms')
    .update({ timer_ends_at: timerEndsAt })
    .eq('id', roomId)
  if (error) return { error: error.message }

  await sysMsg(db, roomId, `▶️ 모든 팀장이 재접속하여 경매를 재개합니다! (${RESUME_DURATION_MS / 1000}초)`)
  await broadcastState(roomId, db)
  return {}
}

/** 팀장 입찰. 5초 이하 남았으면 타이머 연장 → Broadcast STATE_UPDATE */
export async function placeBid(
  roomId: string,
  playerId: string,
  teamId: string,
  amount: number,
): Promise<{ error?: string; newTimerEndsAt?: string }> {
  if (!Number.isInteger(amount) || amount <= 0) {
    return { error: '입찰액은 양의 정수여야 합니다.' }
  }
  if (amount % 10 !== 0) {
    return { error: '입찰액은 10P 단위여야 합니다.' }
  }

  const db = getServerClient()

  const { data: room } = await db
    .from('rooms')
    .select('timer_ends_at, current_player_id')
    .eq('id', roomId)
    .single()

  if (!room?.timer_ends_at || !room?.current_player_id) {
    return { error: '현재 경매가 진행 중이지 않습니다.' }
  }

  if (new Date(room.timer_ends_at).getTime() + 500 <= Date.now()) {
    return { error: '경매 시간이 종료되었습니다.' }
  }
  if (room.current_player_id !== playerId) {
    return { error: '현재 경매 중인 선수가 아닙니다.' }
  }

  const { data: topBid } = await db
    .from('bids')
    .select('team_id, amount')
    .eq('player_id', playerId)
    .eq('room_id', roomId)
    .order('amount', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (topBid && topBid.team_id === teamId) {
    return { error: '현재 최고 입찰자입니다. 추가 입찰이 불가능합니다.' }
  }

  const minRequired = topBid ? topBid.amount + 10 : 10
  if (amount < minRequired) {
    return { error: `최소 입찰액은 ${minRequired.toLocaleString()}P 입니다.` }
  }

  const { data: team } = await db
    .from('teams')
    .select('point_balance, name')
    .eq('id', teamId)
    .eq('room_id', roomId)
    .single()

  if (!team) return { error: '팀 정보를 불러올 수 없습니다.' }
  if (team.point_balance < amount) {
    return { error: `포인트 부족 (보유: ${team.point_balance.toLocaleString()}P)` }
  }

  const { data: roomInfo } = await db
    .from('rooms').select('members_per_team').eq('id', roomId).single()
  const { count: soldCount } = await db
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('status', 'SOLD')
  const maxPlayers = (roomInfo?.members_per_team ?? 5) - 1
  if ((soldCount ?? 0) >= maxPlayers) {
    return { error: '팀 인원이 가득 찼습니다.' }
  }

  const { error: bidErr } = await db.from('bids').insert([{
    room_id: roomId,
    player_id: playerId,
    team_id: teamId,
    amount,
  }])
  if (bidErr) return { error: bidErr.message }

  // 타이머 연장 체크
  const { data: currentRoom } = await db
    .from('rooms').select('timer_ends_at').eq('id', roomId).single()

  let newTimerEndsAt: string | undefined
  if (currentRoom?.timer_ends_at) {
    const remaining = new Date(currentRoom.timer_ends_at).getTime() - Date.now()
    if (remaining <= EXTEND_THRESHOLD_MS) {
      newTimerEndsAt = new Date(Date.now() + EXTEND_DURATION_MS).toISOString()
      await db.from('rooms').update({ timer_ends_at: newTimerEndsAt }).eq('id', roomId)
    }
  }

  await sysMsg(db, roomId, `💰 ${team.name}이(가) ${amount.toLocaleString()}P로 입찰!`)
  await broadcastState(roomId, db)
  return { newTimerEndsAt }
}

/** 타이머 만료 후 낙찰 처리. */
export async function awardPlayer(
  roomId: string,
  playerId: string,
): Promise<{ error?: string; state?: RoomStatePayload }> {
  const db = getServerClient()
  const { data, error } = await db.rpc('award_player_atomic', {
    p_room_id: roomId,
    p_player_id: playerId,
  })

  if (error) return { error: error.message }

  // fetchRoomState 1회 호출로 broadcast + 클라이언트 반환 동시 처리
  const state = await fetchRoomState(db, roomId)

  // 개발 환경이나 Vercel 환경에서 after()가 의도대로 작동하지 않을 수 있으므로 직접 await 처리
  if (state) {
    await broadcastEvent(roomId, 'STATE_UPDATE', state)
  }

  return { state: state ?? undefined }
}

/** 유찰/대기 선수 영입 (드래프트 자유계약, 0P) → Broadcast STATE_UPDATE */
export async function draftPlayer(
  roomId: string,
  playerId: string,
  teamId: string,
): Promise<{ error?: string }> {
  const db = getServerClient()

  const { data: player } = await db
    .from('players').select('name, status, room_id').eq('id', playerId).single()
  const { data: team } = await db
    .from('teams').select('name').eq('id', teamId).single()

  if (!player || (player.status !== 'UNSOLD' && player.status !== 'WAITING') || !team) {
    return { error: '유효하지 않은 영입 요청입니다.' }
  }

  if (player.room_id !== roomId) {
    return { error: '해당 선수는 이 방에 속하지 않습니다.' }
  }

  const { data: roomInfo } = await db
    .from('rooms').select('members_per_team').eq('id', roomId).single()
  const { count: soldCount } = await db
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('status', 'SOLD')
  const maxPlayers = (roomInfo?.members_per_team ?? 5) - 1
  if ((soldCount ?? 0) >= maxPlayers) {
    return { error: '팀 인원이 가득 찼습니다.' }
  }

  const { error } = await db.from('players').update({
    status: 'SOLD',
    team_id: teamId,
    sold_price: 0,
  }).eq('id', playerId)

  if (error) return { error: '영입 처리 중 오류가 발생했습니다.' }

  await sysMsg(db, roomId, `🤝 ${team.name}장 ${player.name} 선수를 자동 배정(유찰 계약) 했습니다. (0P)`)
  await broadcastState(roomId, db)
  return {}
}

/** 유찰 선수 전원을 다시 대기 상태로 전환 → Broadcast STATE_UPDATE */
export async function restartAuctionWithUnsold(roomId: string): Promise<{ error?: string; reAuctionStarted?: boolean }> {
  const db = getServerClient()

  const { data: unsold } = await db
    .from('players')
    .select('id')
    .eq('room_id', roomId)
    .eq('status', 'UNSOLD')

  if (!unsold || unsold.length === 0) {
    return { error: '유찰된 선수가 없습니다.' }
  }

  const { error: pErr } = await db
    .from('players')
    .update({ status: 'WAITING' })
    .eq('room_id', roomId)
    .eq('status', 'UNSOLD')

  if (pErr) return { error: pErr.message }

  await sysMsg(db, roomId, `🔄 주최자가 모든 유찰 선수를 다시 대기 명단으로 되돌리고 추첨(재경매)을 재개합니다! (${unsold.length}명)`)
  await broadcastState(roomId, db)
  return { reAuctionStarted: true }
}

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
