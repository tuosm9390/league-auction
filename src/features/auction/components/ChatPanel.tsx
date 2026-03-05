"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  useAuctionStore,
  Message,
} from "@/features/auction/store/useAuctionStore";
import { sendChatMessage } from "@/features/auction/api/auctionActions";

const MAX_MESSAGE_LENGTH = 200;

function MessageItem({ msg }: { msg: Message }) {
  const role = msg.sender_role;

  // ── 시스템 메시지 ──
  if (role === "SYSTEM") {
    return (
      <div className="flex justify-center my-1">
        <span className="text-[12px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium italic">
          {msg.content}
        </span>
      </div>
    );
  }

  // ── 공지 메시지 ──
  if (role === "NOTICE") {
    return (
      <div className="bg-primary/10 border border-primary/20 rounded-lg px-2 py-1.5 my-0.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-black text-primary">📢 공지</span>
          <span className="text-[9px] text-muted-foreground ml-auto font-mono">
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="text-md font-bold text-foreground break-words">
          {msg.content}
        </p>
      </div>
    );
  }

  const BADGE: Record<string, React.ReactElement> = {
    ORGANIZER: (
      <span className="text-[9px] bg-destructive/10 text-destructive px-1 py-0.5 rounded border border-destructive/20">
        주최
      </span>
    ),
    LEADER: (
      <span className="text-[9px] bg-primary/10 text-primary px-1 py-0.5 rounded border border-primary/20">
        팀장
      </span>
    ),
    VIEWER: (
      <span className="text-[9px] bg-muted text-muted-foreground px-1 py-0.5 rounded">
        관전
      </span>
    ),
  };
  const badge = BADGE[role] ?? (
    <span className="text-[9px] bg-muted text-muted-foreground px-1 py-0.5 rounded">
      {role}
    </span>
  );

  return (
    <div className="text-sm bg-muted/30 hover:bg-muted/50 p-1.5 rounded-lg transition-colors leading-normal border border-transparent hover:border-border">
      <div className="flex items-center gap-1 mb-0.5">
        {badge}
        <span className="font-bold text-foreground text-[11px]">
          {msg.sender_name}
        </span>
        <span className="text-[9px] text-muted-foreground ml-auto font-mono">
          {new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <p className="text-foreground/90 pl-0.5 break-words">{msg.content}</p>
    </div>
  );
}

export function ChatPanel() {
  const roomId = useAuctionStore((s) => s.roomId);
  const role = useAuctionStore((s) => s.role);
  const messages = useAuctionStore((s) => s.messages);
  const teams = useAuctionStore((s) => s.teams);
  const teamId = useAuctionStore((s) => s.teamId);

  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const lastSentAtRef = useRef(0);
  const lastMsgIdRef = useRef<string | null>(null);

  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (!lastMsg) return;
    if (lastMsg.id !== lastMsgIdRef.current) {
      lastMsgIdRef.current = lastMsg.id;
      const el = scrollContainerRef.current;
      if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !roomId || isSending) return;
    if (input.trim().length > MAX_MESSAGE_LENGTH) return;
    const now = Date.now();
    if (now - lastSentAtRef.current < 1000) return;
    lastSentAtRef.current = now;

    setIsSending(true);
    try {
      let senderName = "관전자";
      if (role === "ORGANIZER") senderName = "주최자";
      else if (role === "LEADER") {
        const myTeam = teams.find((t) => t.id === teamId);
        senderName = myTeam?.leader_name || myTeam?.name || "팀장";
      }

      const { error } = await sendChatMessage(
        roomId,
        senderName,
        role || "VIEWER",
        input.trim(),
      );
      if (error) {
        console.error("Failed to send message:", error);
        return;
      }
      setInput("");
    } catch (err) {
      console.error("Failed to send message:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div className="p-2 border-b border-border bg-muted/50 shrink-0">
        <h2 className="text-sm font-bold text-foreground flex items-center gap-2 uppercase tracking-tighter">
          <span className="text-xl">💬</span> 실시간 채팅
        </h2>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-2 py-1.5 flex flex-col gap-1 custom-scrollbar min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-muted-foreground text-[11px] text-center py-6 my-auto">
            대화를 시작하세요.
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} msg={msg} />)
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="p-2 px-3 border-t border-border bg-muted/30 flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="메시지..."
          maxLength={MAX_MESSAGE_LENGTH}
          className="flex-1 bg-background border border-input px-2.5 py-1.5 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-ring transition-shadow text-foreground"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="bg-primary text-primary-foreground px-3 py-1.5 rounded-md font-bold text-xs hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </div>
  );
}
