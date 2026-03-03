import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuctionStore, PresenceUser, Bid, Message, Player, Team } from '@/features/auction/store/useAuctionStore'

export function useAuctionRealtime(roomId: string | null) {
  const setRealtimeData = useAuctionStore(s => s.setRealtimeData)
  const setRoomNotFound = useAuctionStore(s => s.setRoomNotFound)
  const updatePlayer = useAuctionStore(s => s.updatePlayer)
  const updateTeam = useAuctionStore(s => s.updateTeam)
  const addBid = useAuctionStore(s => s.addBid)
  const addMessage = useAuctionStore(s => s.addMessage)
  const role = useAuctionStore(s => s.role)
  const teamId = useAuctionStore(s => s.teamId)

  // 동시 fetch 방지: fetchAll 진행 중일 때 중복 요청 스킵
  const fetchingRef = useRef(false)

  // 전체 데이터 로드 — 초기 로드 및 특정 상황(INSERT/DELETE 등)에서 사용
  const fetchAll = useCallback(async () => {
    if (!roomId) return
    if (fetchingRef.current) return  // 이미 fetch 중이면 스킵 (dedup)
    fetchingRef.current = true
    try {
      // bids는 current_player_id 기준으로만 필요 — rooms를 먼저 받아 이후 조건부 조회
      const [roomRes, teamsRes, playersRes, messagesRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
        supabase.from('teams').select('*').eq('room_id', roomId),
        supabase.from('players').select('*').eq('room_id', roomId),
        supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(200),
      ])

      if (!roomRes.data) {
        setRoomNotFound()
        return
      }

      // bids: 현재 경매 중인 선수의 입찰만 조회 — 방 전체 조회 대신 player 기준 필터
      const currentPlayerId = roomRes.data.current_player_id
      const bidsRes = currentPlayerId
        ? await supabase.from('bids').select('*')
            .eq('player_id', currentPlayerId)
            .eq('room_id', roomId)
            .order('created_at', { ascending: true })
        : { data: [] }

      // 단일 setRealtimeData 호출로 통합 — 중간 렌더 및 깜빡임 방지
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
      console.error('fetchAll error:', err)
    } finally {
      fetchingRef.current = false
    }
  }, [roomId, setRealtimeData, setRoomNotFound])

  // 폴링 함수 — rooms + teams + players + bids 조회 (realtime 이벤트 누락 시 복구)
  const fetchPoll = useCallback(async () => {
    if (!roomId) return
    if (fetchingRef.current) return  // fetchAll 진행 중이면 스킵
    fetchingRef.current = true
    try {
      const [roomRes, teamsRes, playersRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).maybeSingle(),
        supabase.from('teams').select('*').eq('room_id', roomId),
        supabase.from('players').select('*').eq('room_id', roomId),
      ])

      if (!roomRes.data) return  // 일시적 오류 허용, setRoomNotFound 호출 안 함

      // bids: realtime INSERT 누락 대비 — current_player_id 기준 조건부 조회
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
        roomName: roomRes.data.name,
        organizerToken: roomRes.data.organizer_token,
        viewerToken: roomRes.data.viewer_token,
        teams: teamsRes.data || [],
        players: playersRes.data || [],
        bids: bidsRes.data || [],
      })
    } catch (err) {
      console.error('fetchPoll error:', err)
    } finally {
      fetchingRef.current = false
    }
  }, [roomId, setRealtimeData])

  // ── 실시간 구독 ──
  useEffect(() => {
    if (!roomId) return

    fetchAll()

    const channel = supabase
      .channel(`room-data:${roomId}`)
      // rooms 변경: 타이머·토큰 등 필요한 필드만 즉시 반영
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setRealtimeData({
            timerEndsAt: payload.new.timer_ends_at,
            organizerToken: payload.new.organizer_token,
            viewerToken: payload.new.viewer_token,
            roomName: payload.new.name,
            basePoint: payload.new.base_point,
            membersPerTeam: payload.new.members_per_team ?? 5,
            totalTeams: payload.new.total_teams,
          })
        }
      )
      // players 변경 → UPDATE 시 점진적 반영, 그 외(INSERT/DELETE)는 fetchAll
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            updatePlayer(payload.new as Player)
          } else {
            fetchAll()
          }
        }
      )
      // teams 변경 → UPDATE 시 점진적 반영
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `room_id=eq.${roomId}` },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            updateTeam(payload.new as Team)
          } else {
            fetchAll()
          }
        }
      )
      // bids INSERT → 즉시 추가 (빠른 반응) + 전체 리프레시
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids', filter: `room_id=eq.${roomId}` },
        (payload) => {
          addBid(payload.new as Bid)
        }
      )
      // messages INSERT → 즉시 추가
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          addMessage(payload.new as Message)
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.info(`[Realtime] ✅ 채널 구독 성공: room-data:${roomId}`)
        } else if (status === 'CHANNEL_ERROR') {
          console.error(`[Realtime] ❌ 채널 오류: room-data:${roomId}`, err)
        } else if (status === 'TIMED_OUT') {
          console.warn(`[Realtime] ⏱ 채널 타임아웃: room-data:${roomId}`)
        } else if (status === 'CLOSED') {
          console.info(`[Realtime] 🔌 채널 닫힘: room-data:${roomId}`)
        }
      })

    // 3초 폴링 fallback — realtime 이벤트 누락 시 stale 상태 방지
    const pollInterval = setInterval(fetchPoll, 3000)

    return () => {
      clearInterval(pollInterval)
      supabase.removeChannel(channel)
    }
  }, [roomId, fetchAll, fetchPoll, setRealtimeData, addBid, addMessage, setRoomNotFound])

  // ── Presence tracking ──
  useEffect(() => {
    if (!roomId || !role) return

    const presenceChannel = supabase.channel(`presence:${roomId}`)

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const presences = Object.values(state).flat() as unknown as PresenceUser[]
        setRealtimeData({ presences })
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await presenceChannel.track({ role, teamId })
        }
      })

    return () => { supabase.removeChannel(presenceChannel) }
  }, [roomId, role, teamId, setRealtimeData])
}
