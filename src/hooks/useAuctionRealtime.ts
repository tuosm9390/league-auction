import { useEffect, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuctionStore, PresenceUser, Bid, Message } from '@/store/useAuctionStore'

export function useAuctionRealtime(roomId: string | null) {
  const setRealtimeData = useAuctionStore(s => s.setRealtimeData)
  const addBid          = useAuctionStore(s => s.addBid)
  const addMessage      = useAuctionStore(s => s.addMessage)
  const role            = useAuctionStore(s => s.role)
  const teamId          = useAuctionStore(s => s.teamId)

  // 동시 fetch 방지: fetchAll 진행 중일 때 중복 요청 스킵
  const fetchingRef = useRef(false)

  // 전체 데이터 로드 — 초기 로드 및 realtime 이벤트 트리거 시 사용
  const fetchAll = useCallback(async () => {
    if (!roomId) return
    if (fetchingRef.current) return  // 이미 fetch 중이면 스킵 (dedup)
    fetchingRef.current = true
    try {
      const [roomRes, teamsRes, playersRes, bidsRes, messagesRes] = await Promise.all([
        supabase.from('rooms').select('*').eq('id', roomId).single(),
        supabase.from('teams').select('*').eq('room_id', roomId),
        supabase.from('players').select('*').eq('room_id', roomId),
        supabase.from('bids').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
        supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }).limit(200),
      ])

      if (roomRes.data) {
        setRealtimeData({
          basePoint:      roomRes.data.base_point,
          totalTeams:     roomRes.data.total_teams,
          membersPerTeam: roomRes.data.members_per_team ?? 5,
          orderPublic:    roomRes.data.order_public ?? true,
          timerEndsAt:    roomRes.data.timer_ends_at,
          organizerToken: roomRes.data.organizer_token,
          viewerToken:    roomRes.data.viewer_token,
        })
      }

      setRealtimeData({
        teams:    teamsRes.data    || [],
        bids:     bidsRes.data     || [],
        players:  playersRes.data  || [],
        messages: messagesRes.data || [],
      })
    } catch (err) {
      console.error('fetchAll error:', err)
    } finally {
      fetchingRef.current = false
    }
  }, [roomId, setRealtimeData])

  // 폴링용 경량 fetch — 변동 가능한 필드만 조회
  // bids·messages는 realtime INSERT 핸들러(addBid·addMessage)가 증분 처리하므로 제외
  // 정적 설정(base_point, total_teams, members_per_team, order_public)은 방 생성 후 불변이므로 제외
  const fetchPoll = useCallback(async () => {
    if (!roomId) return
    if (fetchingRef.current) return  // 전체 fetch 진행 중이면 스킵
    try {
      const [roomRes, teamsRes, playersRes] = await Promise.all([
        supabase.from('rooms')
          .select('timer_ends_at, organizer_token, viewer_token')
          .eq('id', roomId).single(),
        supabase.from('teams').select('*').eq('room_id', roomId),
        supabase.from('players').select('*').eq('room_id', roomId),
      ])
      if (roomRes.data) {
        setRealtimeData({
          timerEndsAt:    roomRes.data.timer_ends_at,
          organizerToken: roomRes.data.organizer_token,
          viewerToken:    roomRes.data.viewer_token,
        })
      }
      setRealtimeData({
        teams:   teamsRes.data   || [],
        players: playersRes.data || [],
      })
    } catch (err) {
      console.error('fetchPoll error:', err)
    }
  }, [roomId, setRealtimeData])

  // ── 실시간 구독 ──
  useEffect(() => {
    if (!roomId) return

    fetchAll()

    const channel = supabase
      .channel(`room-data:${roomId}`)
      // rooms 변경: 타이머·현재선수 업데이트 + 전체 리프레시
      .on('postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
        (payload) => {
          setRealtimeData({
            timerEndsAt:    payload.new.timer_ends_at,
            organizerToken: payload.new.organizer_token,
            viewerToken:    payload.new.viewer_token,
          })
          // 전체 리프레시로 current_player_id 변경도 반영
          fetchAll()
        }
      )
      // players 변경 → 전체 리프레시
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'players', filter: `room_id=eq.${roomId}` },
        () => fetchAll()
      )
      // teams 변경 → 전체 리프레시
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'teams', filter: `room_id=eq.${roomId}` },
        () => fetchAll()
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
      .subscribe((status) => {
        // 구독 성공 시 한 번 더 최신 데이터 패치
        if (status === 'SUBSCRIBED') fetchAll()
      })

    return () => { supabase.removeChannel(channel) }
  }, [roomId, fetchAll, setRealtimeData, addBid, addMessage])

  // ── 3초 폴링 fallback (realtime이 누락될 경우 보완) — 경량 버전 ──
  useEffect(() => {
    if (!roomId) return
    const interval = setInterval(fetchPoll, 3000)
    return () => clearInterval(interval)
  }, [roomId, fetchPoll])

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
