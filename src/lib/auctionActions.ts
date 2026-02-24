import { supabase } from '@/lib/supabase'

const AUCTION_DURATION_MS = 30_000      // 경매 시간 30초
const EXTEND_THRESHOLD_MS  = 5_000      // 5초 이하 입찰 시 연장
const EXTEND_DURATION_MS   = 5_000      // 5초 연장

async function sysMsg(roomId: string, content: string) {
  await supabase.from('messages').insert([{
    room_id: roomId,
    sender_name: '시스템',
    sender_role: 'SYSTEM',
    content,
  }])
}

/** 랜덤으로 WAITING 선수 1명을 IN_AUCTION으로 전환하고 타이머 시작 */
export async function drawNextPlayer(roomId: string): Promise<{ error?: string }> {
  const { data: waiting } = await supabase
    .from('players')
    .select('id, name')
    .eq('room_id', roomId)
    .eq('status', 'WAITING')

  if (!waiting || waiting.length === 0) {
    return { error: '대기 중인 선수가 없습니다.' }
  }

  const player = waiting[Math.floor(Math.random() * waiting.length)]

  const { error: pErr } = await supabase
    .from('players')
    .update({ status: 'IN_AUCTION' })
    .eq('id', player.id)
  if (pErr) return { error: pErr.message }

  const timerEndsAt = new Date(Date.now() + AUCTION_DURATION_MS).toISOString()
  const { error: rErr } = await supabase
    .from('rooms')
    .update({ timer_ends_at: timerEndsAt, current_player_id: player.id })
    .eq('id', roomId)
  if (rErr) return { error: rErr.message }

  await sysMsg(roomId, `🎲 ${player.name} 선수 경매 시작! (${AUCTION_DURATION_MS / 1000}초)`)
  return {}
}

/** 팀장이 입찰. 5초 이하 남았으면 타이머 연장 */
export async function placeBid(
  roomId: string,
  playerId: string,
  teamId: string,
  amount: number,
): Promise<{ error?: string }> {
  const { data: team } = await supabase
    .from('teams')
    .select('point_balance, name')
    .eq('id', teamId)
    .single()

  if (!team) return { error: '팀 정보를 불러올 수 없습니다.' }
  if (team.point_balance < amount) {
    return { error: `포인트 부족 (보유: ${team.point_balance.toLocaleString()}P)` }
  }

  const { error: bidErr } = await supabase.from('bids').insert([{
    room_id: roomId,
    player_id: playerId,
    team_id: teamId,
    amount,
  }])
  if (bidErr) return { error: bidErr.message }

  // 타이머 연장 체크
  const { data: room } = await supabase
    .from('rooms').select('timer_ends_at').eq('id', roomId).single()

  if (room?.timer_ends_at) {
    const remaining = new Date(room.timer_ends_at).getTime() - Date.now()
    if (remaining > 0 && remaining < EXTEND_THRESHOLD_MS) {
      const newEnd = new Date(Date.now() + EXTEND_DURATION_MS).toISOString()
      await supabase.from('rooms').update({ timer_ends_at: newEnd }).eq('id', roomId)
    }
  }

  await sysMsg(roomId, `💰 ${team.name}이(가) ${amount.toLocaleString()}P로 입찰!`)
  return {}
}

/** 타이머 만료 후 낙찰 처리. 입찰이 없으면 WAITING으로 복귀 */
export async function awardPlayer(
  roomId: string,
  playerId: string,
): Promise<{ error?: string }> {
  // 멱등성 보장: 이미 처리됐으면 스킵
  const { data: player } = await supabase
    .from('players').select('status, name').eq('id', playerId).single()
  if (!player || player.status !== 'IN_AUCTION') return {}

  const { data: topBid } = await supabase
    .from('bids')
    .select('*')
    .eq('player_id', playerId)
    .eq('room_id', roomId)
    .order('amount', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!topBid) {
    // 입찰 없음 → WAITING 복귀
    await supabase.from('players').update({ status: 'WAITING' }).eq('id', playerId)
    await clearRoomAuction(roomId)
    await sysMsg(roomId, `😔 입찰자 없음 — ${player.name} 선수는 다음 기회에!`)
    return {}
  }

  // 낙찰 처리
  await supabase.from('players').update({
    status: 'SOLD',
    team_id: topBid.team_id,
    sold_price: topBid.amount,
  }).eq('id', playerId)

  // 팀 포인트 차감
  const { data: team } = await supabase
    .from('teams').select('point_balance, name').eq('id', topBid.team_id).single()
  if (team) {
    await supabase.from('teams')
      .update({ point_balance: team.point_balance - topBid.amount })
      .eq('id', topBid.team_id)
    await sysMsg(roomId, `🏆 ${player.name} → ${team.name} (${topBid.amount.toLocaleString()}P 낙찰!)`)
  }

  await clearRoomAuction(roomId)
  return {}
}

/** 현재 경매 선수를 건너뛰고 WAITING 복귀 */
export async function skipPlayer(
  roomId: string,
  playerId: string,
): Promise<{ error?: string }> {
  const { data: player } = await supabase
    .from('players').select('name').eq('id', playerId).single()

  await supabase.from('players').update({ status: 'WAITING' }).eq('id', playerId)
  await clearRoomAuction(roomId)
  if (player) await sysMsg(roomId, `⏭️ ${player.name} 선수 건너뜀`)
  return {}
}

async function clearRoomAuction(roomId: string) {
  await supabase.from('rooms')
    .update({ timer_ends_at: null, current_player_id: null })
    .eq('id', roomId)
}
