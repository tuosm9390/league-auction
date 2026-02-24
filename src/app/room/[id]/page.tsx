'use client'

import { useEffect, use, useRef, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useAuctionStore, Role } from '@/store/useAuctionStore'
import { useAuctionRealtime } from '@/hooks/useAuctionRealtime'
import { drawNextPlayer, awardPlayer, skipPlayer } from '@/lib/auctionActions'
import { supabase } from '@/lib/supabase'
import { AuctionTimer } from '@/components/AuctionTimer'
import { AuctionBoard } from '@/components/AuctionBoard'
import { TeamList } from '@/components/TeamList'
import { ChatPanel } from '@/components/ChatPanel'
import { LinksModal } from '@/components/LinksModal'
import { HowToUseModal } from '@/components/HowToUseModal'

export default function RoomPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params)
  const roomId = resolvedParams.id
  const searchParams = useSearchParams()
  const role = searchParams.get('role') as Role
  const teamId = searchParams.get('teamId') || undefined

  const setRoomContext = useAuctionStore(s => s.setRoomContext)
  const players       = useAuctionStore(s => s.players)
  const timerEndsAt   = useAuctionStore(s => s.timerEndsAt)

  useEffect(() => {
    setRoomContext(roomId, role, teamId)
  }, [roomId, role, teamId, setRoomContext])

  useAuctionRealtime(roomId)

  const currentPlayer  = players.find(p => p.status === 'IN_AUCTION')
  const waitingPlayers = players.filter(p => p.status === 'WAITING')
  const soldPlayers    = players.filter(p => p.status === 'SOLD')

  // 버튼 로딩 상태
  const [isDrawing, setIsDrawing]   = useState(false)
  const [isAwarding, setIsAwarding] = useState(false)
  const [isSkipping, setIsSkipping] = useState(false)

  // 공지 상태
  const [noticeText, setNoticeText]     = useState('')
  const [isSendingNotice, setIsSendingNotice] = useState(false)

  const handleNotice = async () => {
    if (!noticeText.trim() || !roomId || isSendingNotice) return
    setIsSendingNotice(true)
    try {
      await supabase.from('messages').insert([{
        room_id:     roomId,
        sender_name: '주최자',
        sender_role: 'NOTICE',
        content:     noticeText.trim(),
      }])
      setNoticeText('')
    } finally {
      setIsSendingNotice(false)
    }
  }

  const handleDraw = async () => {
    setIsDrawing(true)
    const res = await drawNextPlayer(roomId)
    if (res.error) alert(res.error)
    setIsDrawing(false)
  }

  const handleAward = async () => {
    if (!currentPlayer) return
    setIsAwarding(true)
    await awardPlayer(roomId, currentPlayer.id)
    setIsAwarding(false)
  }

  const handleSkip = async () => {
    if (!currentPlayer) return
    setIsSkipping(true)
    await skipPlayer(roomId, currentPlayer.id)
    setIsSkipping(false)
  }

  // ── 타이머 만료 시 자동 낙찰 (주최자 클라이언트) ──
  const awardLock = useRef(false)
  const playersRef = useRef(players)
  playersRef.current = players

  useEffect(() => {
    if (role !== 'ORGANIZER' || !timerEndsAt || !roomId) return

    const cp = playersRef.current.find(p => p.status === 'IN_AUCTION')
    if (!cp) return

    const playerId = cp.id
    const delay = Math.max(0, new Date(timerEndsAt).getTime() - Date.now()) + 800 // 800ms 여유

    let cancelled = false
    const t = setTimeout(async () => {
      if (cancelled || awardLock.current) return
      const stillActive = playersRef.current.find(p => p.id === playerId && p.status === 'IN_AUCTION')
      if (!stillActive) return
      awardLock.current = true
      await awardPlayer(roomId, playerId)
      awardLock.current = false
    }, delay)

    return () => { cancelled = true; clearTimeout(t) }
  }, [timerEndsAt, role, roomId])

  const allDone = waitingPlayers.length === 0 && !currentPlayer && soldPlayers.length > 0

  return (
    <div className="min-h-screen bg-blue-50 text-foreground flex flex-col font-sans">

      {/* Header */}
      <header className="bg-minion-blue text-white p-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-black text-minion-yellow tracking-tight">League Auction 🍌</h1>
          <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold border border-white/30">
            {role === 'ORGANIZER' && '👑 주최자 모드'}
            {role === 'LEADER'    && '🛡️ 팀장 모드'}
            {role === 'VIEWER'    && '👀 관전자 모드'}
          </span>
          {role === 'ORGANIZER' && <LinksModal />}
          <HowToUseModal variant="header" />
        </div>
        {/* 헤더 타이머: 중앙 화면에 타이머가 없을 때(대기 중)만 표시 */}
        {!currentPlayer && <AuctionTimer />}
      </header>

      {/* Main Grid */}
      <main className="flex-1 grid grid-cols-12 gap-6 p-6 overflow-hidden">

        {/* Left: 팀 현황 */}
        <aside className="col-span-3 flex flex-col gap-4">
          <div className="bg-card rounded-2xl shadow-sm border border-border p-4 flex-1 overflow-y-auto">
            <h2 className="text-lg font-bold text-minion-blue mb-4 flex items-center gap-2 sticky top-0 bg-card py-2 z-10">
              <span className="text-2xl">👥</span> 참가 팀 현황
            </h2>
            <TeamList />
          </div>
        </aside>

        {/* Center: 경매 보드 + 컨트롤 패널 */}
        <section className="col-span-6 flex flex-col gap-4">
          <AuctionBoard />

          {/* 주최자 컨트롤 패널 */}
          {role === 'ORGANIZER' && (
            <div className="bg-card rounded-2xl shadow-sm border border-border p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-muted-foreground">🎛️ 주최자 컨트롤</h3>
                <span className="text-xs text-gray-400">
                  대기 {waitingPlayers.length}명 · 낙찰 {soldPlayers.length}명
                  {players.length > 0 && ` / 총 ${players.length}명`}
                </span>
              </div>

              {/* 공지사항 입력 */}
              <div className="mb-3 pb-3 border-b border-gray-100">
                <p className="text-xs font-bold text-gray-500 mb-1.5">📢 공지사항</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={noticeText}
                    onChange={e => setNoticeText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleNotice()}
                    placeholder="모든 참가자에게 공지..."
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-minion-yellow"
                    disabled={isSendingNotice}
                  />
                  <button
                    onClick={handleNotice}
                    disabled={!noticeText.trim() || isSendingNotice}
                    className="bg-minion-yellow hover:bg-minion-yellow-hover text-minion-blue px-4 py-2 rounded-xl text-sm font-black transition-colors disabled:opacity-50 whitespace-nowrap"
                  >
                    공지
                  </button>
                </div>
              </div>

              {allDone ? (
                <div className="text-center py-4">
                  <p className="text-2xl mb-1">🏆</p>
                  <p className="font-black text-minion-blue">모든 선수 경매 완료!</p>
                  <p className="text-sm text-gray-400 mt-1">왼쪽 팀 현황에서 최종 결과를 확인하세요.</p>
                </div>
              ) : !currentPlayer ? (
                // 경매 대기 상태
                <button
                  onClick={handleDraw}
                  disabled={isDrawing || waitingPlayers.length === 0}
                  className="w-full bg-minion-blue hover:bg-minion-blue-hover text-white py-3.5 rounded-xl font-black text-lg transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isDrawing
                    ? '추첨 중...'
                    : waitingPlayers.length === 0
                    ? '대기 중인 선수 없음'
                    : `🎲 다음 선수 추첨 (${waitingPlayers.length}명 대기)`}
                </button>
              ) : (
                // 경매 진행 중
                <div className="flex gap-2">
                  <button
                    onClick={handleAward}
                    disabled={isAwarding}
                    className="flex-1 bg-minion-yellow hover:bg-minion-yellow-hover text-minion-blue py-3 rounded-xl font-black transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50 shadow-[0_3px_0_#D9B310]"
                  >
                    {isAwarding ? '처리 중...' : '🏆 낙찰 처리'}
                  </button>
                  <button
                    onClick={handleSkip}
                    disabled={isSkipping}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 py-3 rounded-xl font-bold transition-all hover:scale-[1.01] active:scale-95 disabled:opacity-50"
                  >
                    {isSkipping ? '처리 중...' : '⏭️ 건너뛰기'}
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Right: 채팅 */}
        <aside className="col-span-3 flex flex-col gap-4">
          <ChatPanel />
        </aside>

      </main>
    </div>
  )
}
