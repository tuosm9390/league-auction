import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Player, Role } from '@/features/auction/store/useAuctionStore'
import { awardPlayer, sendLotteryClosedMessage } from '@/features/auction/api/auctionActions'

interface UseAuctionControlProps {
  roomId: string
  effectiveRole: Role
  players: Player[]
  timerEndsAt: string | null
}

export function useAuctionControl({
  roomId,
  effectiveRole,
  players,
  timerEndsAt
}: UseAuctionControlProps) {
  // 1. 추첨 모달 상태 관리
  const [lotteryPlayer, setLotteryPlayer] = useState<Player | null>(null)
  const prevPlayersRef = useRef<Player[]>([])

  useEffect(() => {
    const prev = prevPlayersRef.current
    const curr = players

    if (prev.length > 0 && curr.length > 0) {
      const prevActive = prev.find(p => p.status === 'IN_AUCTION')
      const currActive = curr.find(p => p.status === 'IN_AUCTION')

      if (!prevActive && currActive) {
        setLotteryPlayer(currActive)
      }
    }
    prevPlayersRef.current = curr
  }, [players])

  // 2. 전역 추첨 모달 닫기 동기화
  useEffect(() => {
    if (!roomId) return
    const channel = supabase.channel(`lottery-${roomId}`)
      .on('broadcast', { event: 'CLOSE_LOTTERY' }, () => {
        setLotteryPlayer(null)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [roomId])

  const handleCloseLottery = async () => {
    if (effectiveRole !== 'ORGANIZER') return
    if (lotteryPlayer && roomId) {
      await sendLotteryClosedMessage(roomId, lotteryPlayer.name)
    }
    setLotteryPlayer(null)
    await supabase.channel(`lottery-${roomId}`).send({
      type: 'broadcast',
      event: 'CLOSE_LOTTERY',
      payload: {}
    })
  }

  // 3. 타이머 만료 시 자동 낙찰 처리
  const awardLock = useRef(false)
  const playersRef = useRef(players)
  playersRef.current = players

  useEffect(() => {
    if (effectiveRole !== 'ORGANIZER' || !timerEndsAt || !roomId) return

    const cp = playersRef.current.find(p => p.status === 'IN_AUCTION')
    if (!cp) return

    const playerId = cp.id
    const delay = Math.max(0, new Date(timerEndsAt).getTime() - Date.now()) + 1500

    let cancelled = false
    const t = setTimeout(async () => {
      if (cancelled || awardLock.current) return
      const stillActive = playersRef.current.find(p => p.id === playerId && p.status === 'IN_AUCTION')
      if (!stillActive) return
      awardLock.current = true
      try {
        await awardPlayer(roomId, playerId)
      } finally {
        awardLock.current = false
      }
    }, delay)

    return () => { cancelled = true; clearTimeout(t) }
  }, [timerEndsAt, roomId, effectiveRole])

  return {
    lotteryPlayer,
    setLotteryPlayer,
    handleCloseLottery
  }
}
