'use client'

import React, { useState, useRef, useEffect } from 'react'
import { useAuctionStore, Message } from '@/features/auction/store/useAuctionStore'
import { sendChatMessage } from '@/features/auction/api/auctionActions'

const MAX_MESSAGE_LENGTH = 200

function MessageItem({ msg }: { msg: Message }) {
  const role = msg.sender_role

  // ── 시스템 메시지 ──
  if (role === 'SYSTEM') {
    return (
      <div className="flex justify-center my-1">
        <span className="text-[12px] text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium italic">
          {msg.content}
        </span>
      </div>
    )
  }

  // ── 공지 메시지 ──
  if (role === 'NOTICE') {
    return (
      <div className="bg-minion-yellow/20 border border-minion-yellow rounded-lg px-2 py-1.5 my-0.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-black text-amber-700">📢 공지</span>
          <span className="text-[9px] text-gray-400 ml-auto font-mono">
            {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <p className="text-md font-bold text-amber-900 break-words">{msg.content}</p>
      </div>
    )
  }

  // ── 일반 채팅 ──
  const BADGE: Record<string, React.ReactElement> = {
    ORGANIZER: <span className="text-[9px] bg-red-100 text-red-600 px-1 py-0.5 rounded border border-red-200">주최</span>,
    LEADER: <span className="text-[9px] bg-blue-100 text-blue-600 px-1 py-0.5 rounded border border-blue-200">팀장</span>,
    VIEWER: <span className="text-[9px] bg-gray-100 text-gray-500 px-1 py-0.5 rounded">관전</span>,
  }
  const badge = BADGE[role] ?? <span className="text-[9px] bg-gray-100 text-gray-400 px-1 py-0.5 rounded">{role}</span>

  return (
    <div className="text-sm bg-gray-50 hover:bg-gray-100/70 p-1.5 rounded-lg transition-colors leading-normal">
      <div className="flex items-center gap-1 mb-0.5">
        {badge}
        <span className="font-bold text-gray-800 text-[11px]">{msg.sender_name}</span>
        <span className="text-[9px] text-gray-400 ml-auto font-mono">
          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      <p className="text-gray-700 pl-0.5 break-words">{msg.content}</p>
    </div>
  )
}

export function ChatPanel() {
  const roomId = useAuctionStore(s => s.roomId)
  const messages = useAuctionStore(s => s.messages)

  const [input, setInput] = useState('')
  const [isSending, setIsSending] = useState(false)
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const lastMsgIdRef = useRef<string | null>(null)

  useEffect(() => {
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg) return
    if (lastMsg.id !== lastMsgIdRef.current) {
      lastMsgIdRef.current = lastMsg.id
      const el = scrollContainerRef.current
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages])

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || !roomId || isSending) return
    if (input.trim().length > MAX_MESSAGE_LENGTH) return

    setIsSending(true)
    try {
      const { error } = await sendChatMessage(roomId, input.trim())
      if (error) { console.error('Failed to send message:', error); return }
      setInput('')
    } catch (err) {
      console.error('Failed to send message:', err)
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="p-2 border-b border-border bg-card shrink-0">
        <h2 className="text-sm font-bold text-minion-blue flex items-center gap-2 uppercase tracking-tighter">
          <span className="text-xl">💬</span> 실시간 채팅
        </h2>
      </div>

      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-2 py-1.5 flex flex-col gap-1 custom-scrollbar min-h-0">
        {messages.length === 0 ? (
          <div className="text-muted-foreground text-[11px] text-center py-6 my-auto">
            대화를 시작하세요.
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} msg={msg} />)
        )}
      </div>

      <form onSubmit={handleSend} className="p-2 px-6 border-t bg-gray-50 flex gap-3">
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="메시지..."
          maxLength={MAX_MESSAGE_LENGTH}
          className="flex-1 bg-white border border-gray-200 px-2.5 py-1.5 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-minion-yellow transition-shadow"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="bg-minion-blue text-white px-3 py-1.5 rounded-md font-bold text-xs hover:bg-minion-blue-hover transition-colors disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </div>
  )
}
