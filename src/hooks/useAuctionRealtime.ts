import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuctionStore } from '@/store/useAuctionStore'

export function useAuctionRealtime(roomId: string | null) {
  const setRealtimeData = useAuctionStore(s => s.setRealtimeData)
  const addBid          = useAuctionStore(s => s.addBid)
  const addMessage      = useAuctionStore(s => s.addMessage)
  const role            = useAuctionStore(s => s.role)
  const teamId          = useAuctionStore(s => s.teamId)

  // 모든 데이터를 DB에서 새로 불러오는 함수 (안정적인 레퍼런스)
  const fetchAll = useCallback(async () => {
    if (!roomId) return

    const [roomRes, teamsRes, playersRes, bidsRes, messagesRes] = await Promise.all([
      supabase.from('rooms').select('*').eq('id', roomId).single(),
      supabase.from('teams').select('*').eq('room_id', roomId),
      supabase.from('players').select('*').eq('room_id', roomId),
      supabase.from('bids').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
      supabase.from('messages').select('*').eq('room_id', roomId).order('created_at', { ascending: true }),
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
          addBid(payload.new)
        }
      )
      // messages INSERT → 즉시 추가
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          addMessage(payload.new)
        }
      )
      .subscribe((status) => {
        // 구독 성공 시 한 번 더 최신 데이터 패치
        if (status === 'SUBSCRIBED') fetchAll()
      })

    return () => { supabase.removeChannel(channel) }
  }, [roomId, fetchAll, setRealtimeData, addBid, addMessage])

  // ── 3초 폴링 fallback (realtime이 누락될 경우 보완) ──
  useEffect(() => {
    if (!roomId) return
    const interval = setInterval(fetchAll, 3000)
    return () => clearInterval(interval)
  }, [roomId, fetchAll])

  // ── Presence tracking ──
  useEffect(() => {
    if (!roomId || !role) return

    const presenceChannel = supabase.channel(`presence:${roomId}`)

    presenceChannel
      .on('presence', { event: 'sync' }, () => {
        const state = presenceChannel.presenceState()
        const presences = Object.values(state).flat() as any[]
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
