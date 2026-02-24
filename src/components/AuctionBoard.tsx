'use client'

import { useState, useEffect, useRef } from 'react'
import { useAuctionStore } from '@/store/useAuctionStore'
import { placeBid } from '@/lib/auctionActions'

const TIER_COLOR: Record<string, string> = {
  '챌린저': 'text-cyan-500', '그랜드마스터': 'text-red-500', '마스터': 'text-purple-500',
  '다이아': 'text-blue-400', '에메랄드': 'text-emerald-500', '플래티넘': 'text-teal-400',
  '골드': 'text-yellow-500', '실버': 'text-gray-400', '브론즈': 'text-amber-700', '언랭': 'text-gray-500',
  'Challenger': 'text-cyan-500', 'Grandmaster': 'text-red-500', 'Master': 'text-purple-500',
  'Diamond': 'text-blue-400', 'Emerald': 'text-emerald-500', 'Platinum': 'text-teal-400',
  'Gold': 'text-yellow-500', 'Silver': 'text-gray-400', 'Bronze': 'text-amber-700',
}

/** 공지 배너 (모든 화면에 공통 표시) */
function NoticeBanner({ msg }: { msg: any }) {
  return (
    <div className="bg-minion-yellow border-b-2 border-amber-400 px-5 py-3 flex items-start gap-3">
      <span className="text-xl shrink-0">📢</span>
      <div className="min-w-0">
        <p className="text-xs font-black text-amber-900 mb-0.5">주최자 공지</p>
        <p className="text-sm font-bold text-amber-950 break-words">{msg.content}</p>
      </div>
    </div>
  )
}

/** 중앙 타이머 (경매 중에만 표시) */
function CenterTimer({ timerEndsAt }: { timerEndsAt: string }) {
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    const target = new Date(timerEndsAt).getTime()
    const calc = () => Math.max(0, Math.floor((target - Date.now()) / 1000))
    setTimeLeft(calc())
    const iv = setInterval(() => {
      const t = calc()
      setTimeLeft(t)
      if (t <= 0) clearInterval(iv)
    }, 1000)
    return () => clearInterval(iv)
  }, [timerEndsAt])

  const pad = (n: number) => String(n).padStart(2, '0')
  const warn = timeLeft > 0 && timeLeft <= 5

  return (
    <div className={`flex items-center justify-center gap-2 rounded-2xl px-6 py-3 font-mono font-black text-4xl transition-colors ${
      warn
        ? 'bg-red-500 text-white animate-pulse shadow-lg shadow-red-200'
        : timeLeft === 0
        ? 'bg-gray-100 text-gray-400'
        : 'bg-minion-blue text-white shadow-md'
    }`}>
      ⏱ {pad(Math.floor(timeLeft / 60))}:{pad(timeLeft % 60)}
    </div>
  )
}

export function AuctionBoard() {
  const players     = useAuctionStore(s => s.players)
  const bids        = useAuctionStore(s => s.bids)
  const teams       = useAuctionStore(s => s.teams)
  const presences   = useAuctionStore(s => s.presences)
  const messages    = useAuctionStore(s => s.messages)
  const role        = useAuctionStore(s => s.role)
  const teamId      = useAuctionStore(s => s.teamId)
  const roomId      = useAuctionStore(s => s.roomId)
  const timerEndsAt = useAuctionStore(s => s.timerEndsAt)

  const currentPlayer = players.find(p => p.status === 'IN_AUCTION')

  // 최신 공지 메시지
  const latestNotice = [...messages].reverse().find(m => m.sender_role === 'NOTICE')

  // 현재 선수 입찰 데이터
  const playerBids   = bids.filter(b => b.player_id === currentPlayer?.id)
  const highestBid   = playerBids.length > 0 ? Math.max(...playerBids.map(b => b.amount)) : 0
  const topBid       = playerBids.find(b => b.amount === highestBid)
  const leadingTeam  = teams.find(t => t.id === topBid?.team_id)
  const myTeam       = teams.find(t => t.id === teamId)
  const minBid       = highestBid > 0 ? highestBid + 10 : 10

  // 입찰 UI 상태
  const [bidAmount, setBidAmount] = useState(minBid)
  const [isBidding, setIsBidding] = useState(false)
  const [bidError, setBidError]   = useState<string | null>(null)

  // 타이머 활성 여부 (1초마다 갱신)
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(iv)
  }, [])
  const isAuctionActive = !!timerEndsAt && new Date(timerEndsAt).getTime() > now

  // 최소 입찰 변동 시 입력값 자동 조정
  const prevMinRef = useRef(minBid)
  useEffect(() => {
    if (minBid !== prevMinRef.current) {
      setBidAmount(prev => Math.max(prev, minBid))
      prevMinRef.current = minBid
    }
  }, [minBid])

  // 선수 바뀔 때 초기화
  useEffect(() => {
    setBidAmount(10)
    setBidError(null)
  }, [currentPlayer?.id])

  const handleBid = async () => {
    if (!currentPlayer || !roomId || !teamId) return
    const amount = Math.max(bidAmount, minBid)
    setBidError(null)
    setIsBidding(true)
    try {
      const res = await placeBid(roomId, currentPlayer.id, teamId, amount)
      if (res.error) setBidError(res.error)
      else setBidAmount(amount + 10)
    } finally {
      setIsBidding(false)
    }
  }

  const canBid = role === 'LEADER' && isAuctionActive && !isBidding && !!currentPlayer

  // ── 경매 대기 화면 (팀장 접속 현황) ──
  if (!currentPlayer) {
    const connectedLeaderIds = new Set(
      presences.filter((p: any) => p.role === 'LEADER').map((p: any) => p.teamId)
    )
    const allConnected = teams.length > 0 && teams.every(t => connectedLeaderIds.has(t.id))

    return (
      <div className="bg-white rounded-3xl shadow-xl border-4 border-minion-yellow flex-1 flex flex-col relative overflow-hidden">
        {latestNotice && <NoticeBanner msg={latestNotice} />}
        <div className="flex-1 flex flex-col p-6">
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-minion-yellow/10 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-5 z-10">
            <h2 className="text-xl font-black text-minion-blue">팀장 접속 현황</h2>
            <span className={`text-xs font-bold px-3 py-1 rounded-full ${
              allConnected ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-600'
            }`}>
              {allConnected ? '✅ 모두 접속' : `⏳ ${connectedLeaderIds.size}/${teams.length}명 접속`}
            </span>
          </div>

          {teams.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400 z-10">
              <p className="text-4xl mb-2">⏳</p>
              <p className="text-sm">팀 정보 로딩 중...</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 z-10 overflow-y-auto">
              {teams.map((team: any) => {
                const connected = connectedLeaderIds.has(team.id)
                return (
                  <div key={team.id} className={`rounded-2xl border-2 p-4 flex items-center gap-3 ${
                    connected ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl shrink-0 ${connected ? 'bg-green-100' : 'bg-gray-100'}`}>
                      {connected ? '✅' : '⏳'}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 text-sm truncate">{team.name}</p>
                      <p className="text-xs text-gray-500">팀장: {team.leader_name || '미설정'}</p>
                      <p className={`text-xs font-bold mt-0.5 ${connected ? 'text-green-600' : 'text-gray-400'}`}>
                        {connected ? '접속 중' : '대기 중'}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="mt-4 pt-3 border-t border-gray-100 z-10">
            <p className="text-xs text-center text-gray-400">
              {allConnected
                ? '모든 팀장 접속 완료. 주최자가 경매를 시작할 수 있습니다.'
                : '팀장 링크를 각 팀장에게 공유해 접속을 안내하세요.'}
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── 경매 진행 화면 ──
  return (
    <div className="bg-white rounded-3xl shadow-xl border-4 border-minion-blue flex-1 flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-500">
      {latestNotice && <NoticeBanner msg={latestNotice} />}

      <div className="absolute top-0 right-0 w-96 h-96 bg-minion-yellow/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-minion-blue/10 rounded-full blur-[80px] pointer-events-none" />

      <div className="z-10 flex flex-col h-full p-6 gap-3">
        {/* 경매 배지 */}
        <div className="flex justify-center">
          <span className="bg-red-500 text-white font-black px-6 py-2 rounded-full text-base shadow-lg border-2 border-red-600 animate-bounce">
            🔥 현재 경매 중 🔥
          </span>
        </div>

        {/* 중앙 타이머 */}
        {timerEndsAt && (
          <div className="flex justify-center">
            <CenterTimer timerEndsAt={timerEndsAt} />
          </div>
        )}

        {/* 선수 정보 */}
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-2">
          <h2 className="text-5xl font-black text-gray-900 tracking-tight">{currentPlayer.name}</h2>
          <div className="flex gap-3 items-center justify-center flex-wrap">
            <div className={`text-xl font-bold bg-gray-100 px-4 py-1.5 rounded-xl border border-gray-200 ${TIER_COLOR[currentPlayer.tier] || 'text-gray-600'}`}>
              {currentPlayer.tier}
            </div>
            <div className="text-xl font-bold bg-gray-100 px-4 py-1.5 rounded-xl border border-gray-200 text-gray-700">
              {currentPlayer.main_position}
              {currentPlayer.sub_position && currentPlayer.sub_position !== '무관'
                ? ` / ${currentPlayer.sub_position}` : ''}
            </div>
          </div>
          {currentPlayer.description && (
            <p className="text-sm text-gray-400 max-w-xs">{currentPlayer.description}</p>
          )}
        </div>

        {/* 현재 입찰 현황 */}
        <div className={`rounded-2xl p-4 border-2 ${
          highestBid > 0
            ? 'bg-minion-yellow/10 border-minion-yellow'
            : 'bg-gray-50 border-gray-200'
        }`}>
          {highestBid > 0 ? (
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">현재 최고 입찰</p>
                <p className="text-3xl font-black text-minion-blue">{highestBid.toLocaleString()}P</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 mb-0.5">선두 팀</p>
                <p className="text-lg font-black text-gray-800">{leadingTeam?.name || '?'}</p>
                {leadingTeam?.id === teamId && (
                  <p className="text-xs font-bold text-green-600">내 팀 리드 중 👑</p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-center text-gray-500 py-1">아직 입찰 없음 — 먼저 입찰하세요!</p>
          )}
        </div>

        {/* 팀장 입찰 UI */}
        {role === 'LEADER' && (
          <div>
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1.5">
              <span>보유: <span className="font-bold text-minion-blue">{myTeam?.point_balance?.toLocaleString() ?? 0}P</span></span>
              <span>최소: <span className="font-bold">{minBid.toLocaleString()}P</span></span>
            </div>
            {bidError && (
              <p className="text-xs text-red-500 mb-1.5 text-center font-bold">{bidError}</p>
            )}
            {!isAuctionActive && (
              <p className="text-xs text-gray-400 text-center mb-1.5">⏱️ 경매 시간 종료</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => setBidAmount(v => Math.max(minBid, v - 10))}
                disabled={!canBid || bidAmount <= minBid}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-3 rounded-xl font-black text-sm transition-colors disabled:opacity-30"
              >−10</button>
              <input
                type="number"
                value={bidAmount}
                min={minBid}
                step={10}
                onChange={e => setBidAmount(Math.max(minBid, parseInt(e.target.value) || minBid))}
                disabled={!canBid}
                className="flex-1 border-2 border-gray-200 focus:border-red-400 rounded-xl px-2 py-3 text-xl font-black text-center focus:outline-none disabled:opacity-50 disabled:bg-gray-50"
              />
              <button
                onClick={() => setBidAmount(v => v + 10)}
                disabled={!canBid}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-3 rounded-xl font-black text-sm transition-colors disabled:opacity-30"
              >+10</button>
              <button
                onClick={handleBid}
                disabled={!canBid}
                className="bg-red-500 hover:bg-red-600 text-white px-5 py-3 rounded-xl font-black text-lg transition-all shadow-[0_4px_0_#991B1B] hover:shadow-[0_2px_0_#991B1B] hover:translate-y-0.5 active:translate-y-1 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed disabled:translate-y-0 disabled:shadow-none whitespace-nowrap"
              >
                {isBidding ? '입찰 중...' : '입찰 🔥'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
