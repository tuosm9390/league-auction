import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuctionStore, PresenceUser } from '@/features/auction/store/useAuctionStore'

/**
 * Broadcast-primary 실시간 구독 훅.
 *
 * 아키텍처 변경점:
 * - 기존: postgres_changes CDC (300ms~2s 지연) + 3초 폴링 + 3개 채널
 * - 신규: Broadcast STATE_UPDATE (<100ms) + 단일 채널 + 폴링 제거
 *
 * 단일 채널 `auction-${roomId}`에:
 *   1. Broadcast STATE_UPDATE — Server Action이 DB 쓰기 후 즉시 전파
 *   2. Broadcast CLOSE_LOTTERY — 추첨 모달 동기화
 *   3. Presence — 팀장 접속 현황
 */
export function useAuctionRealtime(roomId: string | null) {
  const setRealtimeData = useAuctionStore(s => s.setRealtimeData)
  const setRoomNotFound = useAuctionStore(s => s.setRoomNotFound)
  const setLotteryPlayer = useAuctionStore(s => s.setLotteryPlayer)
  const role = useAuctionStore(s => s.role)
  const teamId = useAuctionStore(s => s.teamId)

  // 동시 fetch 방지
  const fetchingRef = useRef(false)

  /** 초기 로드 및 재연결 시 DB에서 전체 상태 1회 읽기 */
  const fetchAll = useCallback(async () => {
    if (!roomId) return
    if (fetchingRef.current) return
    fetchingRef.current = true
    try {
      const [roomRes, teamsRes, playersRes, messagesRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
        supabase.from('teams').select('*').eq('room_id', roomId),
        supabase.from('players').select('*').eq('room_id', roomId),
        supabase.from('messages').select('*').eq('room_id', roomId)
          .order('created_at', { ascending: true }).limit(200),
      ])

      if (!roomRes.data) {
        setRoomNotFound()
        return
      }

      const currentPlayerId = roomRes.data.current_player_id
      const bidsRes = currentPlayerId
        ? await supabase.from('bids').select('*')
            .eq('player_id', currentPlayerId)
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })
        : { data: [] }

      setRealtimeData({
        basePoint: roomRes.data.base_point,
        totalTeams: roomRes.data.total_teams,
        membersPerTeam: roomRes.data.members_per_team ?? 5,
        timerEndsAt: roomRes.data.timer_ends_at,
        createdAt: roomRes.data.created_at,
        roomName: roomRes.data.name,
        organizerToken: roomRes.data.organizer_token,
        viewerToken: roomRes.data.viewer_token,
        teams: teamsRes.data || [],
        bids: bidsRes.data || [],
        players: playersRes.data || [],
        messages: messagesRes.data || [],
      })
    } catch (err) {
      console.error('[useAuctionRealtime] fetchAll 오류:', err)
    } finally {
      fetchingRef.current = false
    }
  }, [roomId, setRealtimeData, setRoomNotFound])

  // ── 단일 채널 구독 (Broadcast + Presence) ──
  useEffect(() => {
    if (!roomId) return

    // 초기 로드: DB에서 전체 상태 1회 읽기
    fetchAll()

    const channel = supabase
      .channel(`auction-${roomId}`)
      // 1. Broadcast: 실시간 상태 동기화 (Server Action → REST API → 전체 클라이언트)
      .on('broadcast', { event: 'STATE_UPDATE' }, ({ payload }) => {
        if (payload?.roomDeleted) {
          setRoomNotFound()
          return
        }
        setRealtimeData(payload)
      })
      // 2. Broadcast: 추첨 모달 동기화 (ORGANIZER closeLotteryAction 호출 후 전파)
      .on('broadcast', { event: 'CLOSE_LOTTERY' }, () => {
        setLotteryPlayer(null)
      })
      // 3. Presence: 팀장 접속 현황 (heartbeat 30~60s, 이탈 즉시 감지 불가 — 알려진 한계)
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const presences = Object.values(state).flat() as unknown as PresenceUser[]
        setRealtimeData({ presences })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // 재연결 완료 시 fetchAll 1회 — 비연결 구간 동안 놓친 상태 복원
          // Broadcast는 비영속이므로 비연결 구간의 이벤트는 DB로만 복원 가능
          fetchAll()
          if (role) {
            await channel.track({ role, teamId })
          }
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          // Supabase 클라이언트가 자동 재연결 시도 — 별도 처리 불필요
          console.warn(`[useAuctionRealtime] 채널 오류 (${status}), 자동 재연결 대기 중...`)
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId, fetchAll, setRealtimeData, setRoomNotFound, setLotteryPlayer, role, teamId])

  return { fetchAll }
}
