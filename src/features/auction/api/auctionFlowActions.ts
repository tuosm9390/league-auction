'use server'

import {
  withBroadcast,
  sysMsg,
  AUCTION_DURATION_MS,
  EXTEND_THRESHOLD_MS,
  EXTEND_DURATION_MS,
  type RoomStatePayload,
} from './serverActionUtils'
import { broadcastEvent } from '@/lib/supabase-server'

// ---------- 경매 흐름 ----------

/** 랜덤으로 WAITING 선수 1명을 IN_AUCTION으로 전환 → Broadcast STATE_UPDATE */
export async function drawNextPlayer(roomId: string): Promise<{ error?: string }> {
  return withBroadcast<{ error?: string }>(roomId, async (db) => {
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

    return {}
  })
}

/** 추첨 모달 닫기 — 시스템 메시지 전송 + CLOSE_LOTTERY 브로드캐스트 + STATE_UPDATE */
// CLOSE_LOTTERY는 상태 갱신은 별도 STATE_UPDATE가 하지만 여기서는 CLOSE 알림만 보냄
export async function closeLotteryAction(
  roomId: string,
  playerName: string,
): Promise<{ error?: string }> {
  return withBroadcast<{ error?: string }>(roomId, async (db) => {
    await sysMsg(db, roomId, `🎲 ${playerName} 선수 등장! (경매 시작 전)`)
    // CLOSE_LOTTERY는 모달 닫기 전용 — 상태 payload 없음
    await broadcastEvent(roomId, 'CLOSE_LOTTERY', {})
    return {}
  })
}

/** 경매(타이머) 시작 → Broadcast STATE_UPDATE */
export async function startAuction(
  roomId: string,
  durationMs?: number,
): Promise<{ error?: string; timerEndsAt?: string }> {
  return withBroadcast<{ error?: string; timerEndsAt?: string }>(roomId, async (db) => {
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
    return { timerEndsAt }
  })
}

/** 경매 일시 정지 → Broadcast STATE_UPDATE */
export async function pauseAuction(roomId: string): Promise<{ error?: string }> {
  return withBroadcast<{ error?: string }>(roomId, async (db) => {
    const { error } = await db
      .from('rooms')
      .update({ timer_ends_at: null })
      .eq('id', roomId)
    if (error) return { error: error.message }

    await sysMsg(db, roomId, `⚠️ 팀장 접속 이탈로 인해 경매가 일시 중단되었습니다.`)
    return {}
  })
}

/** 중단된 경매 재개 → Broadcast STATE_UPDATE */
export async function resumeAuction(roomId: string): Promise<{ error?: string }> {
  const RESUME_DURATION_MS = 5_000
  const timerEndsAt = new Date(Date.now() + RESUME_DURATION_MS).toISOString()

  return withBroadcast<{ error?: string }>(roomId, async (db) => {
    const { error } = await db
      .from('rooms')
      .update({ timer_ends_at: timerEndsAt })
      .eq('id', roomId)
    if (error) return { error: error.message }

    await sysMsg(db, roomId, `▶️ 모든 팀장이 재접속하여 경매를 재개합니다! (${RESUME_DURATION_MS / 1000}초)`)
    return {}
  })
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

  return withBroadcast<{ error?: string; newTimerEndsAt?: string }>(roomId, async (db) => {
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
    return { newTimerEndsAt }
  })
}

/** 타이머 만료 후 낙찰 처리. */
export async function awardPlayer(
  roomId: string,
  playerId: string,
): Promise<{ error?: string; state?: RoomStatePayload }> {
  return withBroadcast<{ error?: string; state?: RoomStatePayload }>(roomId, async (db) => {
    const { error } = await db.rpc('award_player_atomic', {
      p_room_id: roomId,
      p_player_id: playerId,
    })

    if (error) return { error: error.message }
    return {}
  })
}

/** 유찰/대기 선수 영입 (드래프트 자유계약, 0P) → Broadcast STATE_UPDATE */
export async function draftPlayer(
  roomId: string,
  playerId: string,
  teamId: string,
): Promise<{ error?: string }> {
  return withBroadcast<{ error?: string }>(roomId, async (db) => {
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
    return {}
  })
}

/** 유찰 선수 전원을 다시 대기 상태로 전환 → Broadcast STATE_UPDATE */
export async function restartAuctionWithUnsold(roomId: string): Promise<{ error?: string; reAuctionStarted?: boolean }> {
  return withBroadcast<{ error?: string; reAuctionStarted?: boolean }>(roomId, async (db) => {
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
    return { reAuctionStarted: true }
  })
}
