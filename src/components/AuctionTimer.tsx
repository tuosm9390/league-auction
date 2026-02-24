'use client'

import { useEffect, useState } from 'react'
import { useAuctionStore } from '@/store/useAuctionStore'

export function AuctionTimer() {
  const timerEndsAt = useAuctionStore((state) => state.timerEndsAt)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (!timerEndsAt) {
      setTimeLeft(0)
      return
    }

    const targetDate = new Date(timerEndsAt).getTime()

    const calculateTimeLeft = () => {
      const now = new Date().getTime()
      const difference = targetDate - now
      return difference > 0 ? Math.floor(difference / 1000) : 0
    }

    // 초기 계산
    setTimeLeft(calculateTimeLeft())

    // 1초마다 갱신
    const timer = setInterval(() => {
      const remaining = calculateTimeLeft()
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timer)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [timerEndsAt])

  // 포맷팅 (mm:ss)
  const pad = (num: number) => num.toString().padStart(2, '0')
  const minutes = Math.floor(timeLeft / 60)
  const seconds = timeLeft % 60

  const isWarning = timeLeft > 0 && timeLeft <= 5 // 5초 이하시 경고색상

  return (
    <div className={`text-xl font-bold px-6 py-2 rounded-full font-mono shadow-inner border transition-colors duration-300 ${isWarning
        ? 'bg-red-500/20 border-red-500/50 text-white animate-pulse'
        : 'bg-black/30 border-black/10 text-white'
      }`}>
      남은 시간: <span className={isWarning ? 'text-red-400' : 'text-minion-yellow'}>
        {pad(minutes)}:{pad(seconds)}
      </span>
    </div>
  )
}
