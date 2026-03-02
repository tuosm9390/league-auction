'use server'

import { cookies } from 'next/headers'
import { getServerClient } from '@/lib/supabase-server'
import type { AuctionArchivePayload } from '@/features/auction/types'

const AUCTION_DURATION_MS = 10_000      // 경매 시간 10초
const EXTEND_THRESHOLD_MS = 5_000      // 5초 이하 입찰 시 연장
const EXTEND_DURATION_MS = 5_000      // 5초 연장
const MAX_BID_AMOUNT = 100_000          // 입찰액 상한 10만P

function isValidUUID(v: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v)
}

// ---------- 서버사이드 역할 검증 ----------

async function verifyOrganizer(roomId: string): Promise<boolean> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(`room_auth_${roomId}`)?.value
  if (!raw) return false
  try {
    const { role, token } = JSON.parse(raw)
    if (role !== 'ORGANIZER') return false
    const db = getServerClient()
    const { data } = await db.from('rooms').select('organizer_token').eq('id', roomId).single()
    return data?.organizer_token === token
  } catch { return false }
}

async function verifyLeader(roomId: string, teamId: string): Promise<boolean> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(`room_auth_${roomId}`)?.value
  if (!raw) return false
  try {
    const { role, token, teamId: cookieTeamId } = JSON.parse(raw)
    if (role !== 'LEADER' || cookieTeamId !== teamId) return false
    const db = getServerClient()
    const { data } = await db.from('teams').select('leader_token').eq('id', teamId).single()
    return data?.leader_token === token
  } catch { return false }
}

async function verifyAnyRole(roomId: string): Promise<{ valid: boolean; role: string; senderName: string }> {
  const cookieStore = await cookies()
  const raw = cookieStore.get(`room_auth_${roomId}`)?.value
  const fail = { valid: false, role: '', senderName: '' }
  if (!raw) return fail
  try {
    const { role, token, teamId } = JSON.parse(raw)
    const db = getServerClient()
    if (role === 'ORGANIZER') {
      const { data } = await db.from('rooms').select('organizer_token').eq('id', roomId).single()
      if (data?.organizer_token !== token) return fail
      return { valid: true, role, senderName: '주최자' }
    }
    if (role === 'LEADER') {
      const { data } = await db.from('teams').select('leader_token, leader_name, name').eq('id', teamId).single()
      if (!data || data.leader_token !== token) return fail
      return { valid: true, role, senderName: data.leader_name || data.name || '팀장' }
    }
    if (role === 'VIEWER') {
      const { data } = await db.from('rooms').select('viewer_token').eq('id', roomId).single()
      if (data?.viewer_token !== token) return fail
      return { valid: true, role, senderName: '관전자' }
    }
    return fail
  } catch { return fail }
}

// ---------- 내부 헬퍼 ----------

async function sysMsg(roomId: string, content: string) {
  const db = getServerClient()
  await db.from('messages').insert([{
    room_id: roomId,
    sender_name: '시스템',
    sender_role: 'SYSTEM',
    content,
  }])
}

async function clearRoomAuction(roomId: string) {
  const db = getServerClient()
  await db.from('rooms')
    .update({ timer_ends_at: null, current_player_id: null })
    .eq('id', roomId)
}

async function auditLog(
  roomId: string,
  action: string,
  actorRole: string,
  actorTeamId: string | null,
  metadata: object,
) {
  try {
    const db = getServerClient()
    await db.from('audit_logs').insert([{
      room_id: roomId,
      action,
      actor_role: actorRole,
      actor_team_id: actorTeamId,
      metadata,
    }])
  } catch {
    // audit_logs 테이블이 아직 없을 수 있음 (Phase 3 마이그레이션 전)
  }
}

// ---------- 채팅 / 공지 Server Actions ----------

/** 인증된 유저 채팅 메시지 전송 */
export async function sendChatMessage(roomId: string, content: string): Promise<{ error?: string }> {
  if (!content.trim() || content.length > 200) return { error: '유효하지 않은 메시지' }
  if (!isValidUUID(roomId)) return { error: '유효하지 않은 요청' }
  const auth = await verifyAnyRole(roomId)
  if (!auth.valid) return { error: '인증 필요' }
  const db = getServerClient()
  const { error } = await db.from('messages').insert([{
    room_id: roomId,
    sender_name: auth.senderName,
    sender_role: auth.role,
    content: content.trim(),
  }])
  if (error) return { error: error.message }
  return {}
}

/** 방장 공지 전송 */
export async function sendNotice(roomId: string, content: string): Promise<{ error?: string }> {
  if (!content.trim() || content.length > 200) return { error: '유효하지 않은 공지' }
  if (!isValidUUID(roomId)) return { error: '유효하지 않은 요청' }
  if (!(await verifyOrganizer(roomId))) return { error: '권한 없음' }
  const db = getServerClient()
  const { error } = await db.from('messages').insert([{
    room_id: roomId,
    sender_name: '주최자',
    sender_role: 'NOTICE',
    content: content.trim(),
  }])
  if (error) return { error: error.message }
  return {}
}

/** 추첨 종료 시스템 메시지 (방장 전용) */
export async function sendLotteryClosedMessage(roomId: string, playerName: string): Promise<{ error?: string }> {
  if (!isValidUUID(roomId)) return { error: '유효하지 않은 요청' }
  if (!(await verifyOrganizer(roomId))) return { error: '권한 없음' }
  const db = getServerClient()
  await db.from('messages').insert([{
    room_id: roomId,
    sender_name: '시스템',
    sender_role: 'SYSTEM',
    content: `🎲 ${playerName} 선수 등장! (경매 시작 전)`,
  }])
  return {}
}

// ---------- auction_archives ----------

/** 경매 결과를 auction_archives 테이블에 영구 저장 */
export async function saveAuctionArchive(payload: AuctionArchivePayload): Promise<{ error?: string }> {
  if (!isValidUUID(payload.roomId)) return { error: '유효하지 않은 요청' }
  if (!(await verifyOrganizer(payload.roomId))) return { error: '권한 없음' }
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

/** 랜덤으로 WAITING 선수 1명을 IN_AUCTION으로 전환하고 타이머 시작 */
export async function drawNextPlayer(roomId: string): Promise<{ error?: string }> {
  if (!isValidUUID(roomId)) return { error: '유효하지 않은 요청' }
  if (!(await verifyOrganizer(roomId))) return { error: '권한 없음' }

  const db = getServerClient()
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

  return {}
}

/** 경매(타이머) 시작 */
export async function startAuction(roomId: string, durationMs?: number): Promise<{ error?: string }> {
  if (!isValidUUID(roomId)) return { error: '유효하지 않은 요청' }
  if (!(await verifyOrganizer(roomId))) return { error: '권한 없음' }

  const db = getServerClient()
  const { data: room } = await db
    .from('rooms')
    .select('current_player_id')
    .eq('id', roomId)
    .single()

  if (!room?.current_player_id) return { error: '진행할 선수가 없습니다.' }

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

  await sysMsg(roomId, `▶️ ${player?.name || '현재'} 선수 경매 시작! (${duration / 1000}초)`)
  return {}
}

/** 경매 일시 정지 (접속 장애 등) */
export async function pauseAuction(roomId: string): Promise<{ error?: string }> {
  if (!isValidUUID(roomId)) return { error: '유효하지 않은 요청' }
  if (!(await verifyOrganizer(roomId))) return { error: '권한 없음' }

  const db = getServerClient()
  const { error } = await db
    .from('rooms')
    .update({ timer_ends_at: null })
    .eq('id', roomId)

  if (error) return { error: error.message }
  await sysMsg(roomId, `⚠️ 팀장 접속 이탈로 인해 경매가 일시 중단되었습니다.`)
  return {}
}

/** 중단된 경매 재개 */
export async function resumeAuction(roomId: string): Promise<{ error?: string }> {
  if (!isValidUUID(roomId)) return { error: '유효하지 않은 요청' }
  if (!(await verifyOrganizer(roomId))) return { error: '권한 없음' }

  const RESUME_DURATION_MS = 5_000
  const timerEndsAt = new Date(Date.now() + RESUME_DURATION_MS).toISOString()

  const db = getServerClient()
  const { error } = await db
    .from('rooms')
    .update({ timer_ends_at: timerEndsAt })
    .eq('id', roomId)

  if (error) return { error: error.message }
  await sysMsg(roomId, `▶️ 모든 팀장이 재접속하여 경매를 재개합니다! (${RESUME_DURATION_MS / 1000}초)`)
  return {}
}

/** 팀장이 입찰. 5초 이하 남았으면 타이머 연장 */
export async function placeBid(
  roomId: string,
  playerId: string,
  teamId: string,
  amount: number,
): Promise<{ error?: string }> {
  // UUID 형식 검증
  if (!isValidUUID(roomId) || !isValidUUID(playerId) || !isValidUUID(teamId)) {
    return { error: '유효하지 않은 요청' }
  }
  // 팀장 권한 검증
  if (!(await verifyLeader(roomId, teamId))) return { error: '권한 없음' }

  // 입찰액 기본 검증
  if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount <= 0) {
    return { error: '입찰액은 양의 정수여야 합니다.' }
  }
  if (amount % 10 !== 0) {
    return { error: '입찰액은 10P 단위여야 합니다.' }
  }
  if (amount > MAX_BID_AMOUNT) {
    return { error: `최대 입찰액은 ${MAX_BID_AMOUNT.toLocaleString()}P입니다.` }
  }

  const db = getServerClient()

  // 경매 진행 중인지 확인 (타이머 유효 여부)
  const { data: room } = await db
    .from('rooms')
    .select('timer_ends_at, current_player_id')
    .eq('id', roomId)
    .single()

  if (!room?.timer_ends_at || !room?.current_player_id) {
    return { error: '현재 경매가 진행 중이지 않습니다.' }
  }

  // 통신 지연을 고려하여 1초의 오차 허용
  if (new Date(room.timer_ends_at).getTime() + 1000 <= Date.now()) {
    return { error: '경매 시간이 종료되었습니다.' }
  }
  if (room.current_player_id !== playerId) {
    return { error: '현재 경매 중인 선수가 아닙니다.' }
  }

  // 본인이 이미 최고 입찰자인지 확인
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

  // 서버 사이드 레이트 리밋: 동일 팀이 1.5초 이내 재입찰 방지
  const { count: recentBidCount } = await db
    .from('bids')
    .select('id', { count: 'exact', head: true })
    .eq('team_id', teamId)
    .eq('player_id', playerId)
    .gt('created_at', new Date(Date.now() - 1500).toISOString())
  if ((recentBidCount ?? 0) > 0) {
    return { error: '너무 빠른 입찰입니다. 잠시 후 다시 시도하세요.' }
  }

  // 최소 입찰액 검증
  const minRequired = topBid ? topBid.amount + 10 : 10
  if (amount < minRequired) {
    return { error: `최소 입찰액은 ${minRequired.toLocaleString()}P 입니다.` }
  }

  const { data: team } = await db
    .from('teams')
    .select('point_balance, name')
    .eq('id', teamId)
    .single()

  if (!team) return { error: '팀 정보를 불러올 수 없습니다.' }
  if (team.point_balance < amount) {
    return { error: `포인트 부족 (보유: ${team.point_balance.toLocaleString()}P)` }
  }

  // 팀 정원 초과 검증
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

  if (currentRoom?.timer_ends_at) {
    const remaining = new Date(currentRoom.timer_ends_at).getTime() - Date.now()
    if (remaining <= EXTEND_THRESHOLD_MS) {
      const newEnd = new Date(Date.now() + EXTEND_DURATION_MS).toISOString()
      await db.from('rooms').update({ timer_ends_at: newEnd }).eq('id', roomId)
    }
  }

  await sysMsg(roomId, `💰 ${team.name}이(가) ${amount.toLocaleString()}P로 입찰!`)
  await auditLog(roomId, 'place_bid', 'LEADER', teamId, { playerId, amount })
  return {}
}

/** 타이머 만료 후 낙찰 처리. 입찰이 없으면 UNSOLD 처리 */
export async function awardPlayer(
  roomId: string,
  playerId: string,
): Promise<{ error?: string }> {
  if (!isValidUUID(roomId) || !isValidUUID(playerId)) return { error: '유효하지 않은 요청' }
  if (!(await verifyOrganizer(roomId))) return { error: '권한 없음' }

  const db = getServerClient()

  // 1. 최신 방 상태 다시 확인 (레이스 컨디션 방어)
  const { data: latestRoom } = await db
    .from('rooms').select('timer_ends_at').eq('id', roomId).single()

  if (latestRoom?.timer_ends_at) {
    const end = new Date(latestRoom.timer_ends_at).getTime()
    if (end > Date.now()) return {}
  }

  // 2. 멱등성 보장: 이미 처리됐으면 스킵
  const { data: player } = await db
    .from('players').select('status, name').eq('id', playerId).single()
  if (!player || player.status !== 'IN_AUCTION') return {}

  const { data: topBid } = await db
    .from('bids')
    .select('*')
    .eq('player_id', playerId)
    .eq('room_id', roomId)
    .order('amount', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!topBid) {
    // 입찰 없음 → UNSOLD 변경
    await db.from('players').update({ status: 'UNSOLD' }).eq('id', playerId)
    await clearRoomAuction(roomId)
    await sysMsg(roomId, `😔 입찰자 없음 — 최저가 입찰이 진행되지 않아 유찰되었습니다.`)
    await auditLog(roomId, 'award_unsold', 'ORGANIZER', null, { playerId, playerName: player.name })
    return {}
  }

  // 낙찰 처리
  await db.from('players').update({
    status: 'SOLD',
    team_id: topBid.team_id,
    sold_price: topBid.amount,
  }).eq('id', playerId)

  // 팀 포인트 차감
  const { data: team } = await db
    .from('teams').select('point_balance, name').eq('id', topBid.team_id).single()
  if (team) {
    await db.from('teams')
      .update({ point_balance: team.point_balance - topBid.amount })
      .eq('id', topBid.team_id)
    await sysMsg(roomId, `🏆 ${player.name} → ${team.name} (${topBid.amount.toLocaleString()}P 낙찰!)`)
    await auditLog(roomId, 'award_sold', 'ORGANIZER', topBid.team_id, {
      playerId, playerName: player.name, teamName: team.name, amount: topBid.amount,
    })
  }

  await clearRoomAuction(roomId)
  return {}
}

/** 유찰/대기 선수 영입 (드래프트 자유계약, 0P). UNSOLD와 WAITING 선수 모두 지원 */
export async function draftPlayer(
  roomId: string,
  playerId: string,
  teamId: string,
): Promise<{ error?: string }> {
  if (!isValidUUID(roomId) || !isValidUUID(playerId) || !isValidUUID(teamId)) return { error: '유효하지 않은 요청' }
  if (!(await verifyOrganizer(roomId))) return { error: '권한 없음' }

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

  // 팀 정원 체크
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

  if (error) {
    console.error('draftPlayer error:', error)
    return { error: '영입 처리 중 오류가 발생했습니다.' }
  }

  await sysMsg(roomId, `🤝 ${team.name}장 ${player.name} 선수를 자동 배정(유찰 계약) 했습니다. (0P)`)
  await auditLog(roomId, 'draft_player', 'ORGANIZER', teamId, { playerId, playerName: player.name })
  return {}
}

/** (방장 전용) 유찰된 잉여 선수 전원을 다시 대기 상태로 되돌리고 재경매 준비 */
export async function restartAuctionWithUnsold(roomId: string): Promise<{ error?: string }> {
  if (!isValidUUID(roomId)) return { error: '유효하지 않은 요청' }
  if (!(await verifyOrganizer(roomId))) return { error: '권한 없음' }

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

  await sysMsg(roomId, `🔄 주최자가 모든 유찰 선수를 다시 대기 명단으로 되돌리고 추첨(재경매)을 재개합니다! (${unsold.length}명)`)
  return {}
}

/** 방 종료 — 관련 데이터 전체 삭제 (bids → messages → players → teams → rooms 순) */
export async function deleteRoom(roomId: string): Promise<{ error?: string }> {
  if (!isValidUUID(roomId)) return { error: '유효하지 않은 요청' }
  if (!(await verifyOrganizer(roomId))) return { error: '권한 없음' }

  const db = getServerClient()

  // 1. 토큰 무효화로 즉시 접근 차단
  const { data: roomData } = await db.from('rooms').select('name').eq('id', roomId).single()
  const currentName = roomData?.name || '경매방'

  const { error: updErr } = await db
    .from('rooms')
    .update({
      name: `[종료된 경매] ${currentName}`,
      organizer_token: crypto.randomUUID(),
      viewer_token: crypto.randomUUID()
    })
    .eq('id', roomId)

  if (updErr) {
    console.error('Token invalidation failed:', updErr)
  }

  await auditLog(roomId, 'delete_room', 'ORGANIZER', null, { roomName: currentName })

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
