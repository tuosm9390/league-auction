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

  // ?€?€ ?œìŠ¤??ë©”ì‹œì§€ ?€?€
  if (role === "SYSTEM") {
    return (
      <div className="flex justify-center my-1">
        <span className="text-[12px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full font-medium italic">
          {msg.content}
        </span>
      </div>
    );
  }

  // ?€?€ ê³µì? ë©”ì‹œì§€ ?€?€
  if (role === "NOTICE") {
    return (
      <div className="bg-minion-yellow/20 border border-minion-yellow rounded-lg px-2 py-1.5 my-0.5">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-sm font-black text-amber-700">?“¢ ê³µì?</span>
          <span className="text-[9px] text-muted-foreground ml-auto font-mono">
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="text-md font-bold text-amber-900 break-words">
          {msg.content}
        </p>
      </div>
    );
  }

  // ?€?€ ?¼ë°˜ ì±„íŒ… ?€?€
  const BADGE: Record<string, React.ReactElement> = {
    ORGANIZER: (
      <span className="text-[9px] bg-destructive/10 text-destructive px-1 py-0.5 rounded border border-destructive/20">
        ì£¼ìµœ
      </span>
    ),
    LEADER: (
      <span className="text-[9px] bg-secondary/10 text-secondary px-1 py-0.5 rounded border border-secondary/20">
        ?€??
      </span>
    ),
    VIEWER: (
      <span className="text-[9px] bg-muted text-muted-foreground px-1 py-0.5 rounded">
        ê´€??
      </span>
    ),
  };
  const badge = BADGE[role] ?? (
    <span className="text-[9px] bg-muted text-muted-foreground px-1 py-0.5 rounded">
      {role}
    </span>
  );

  return (
    <div className="text-sm bg-muted hover:bg-muted/70 p-1.5 rounded-lg transition-colors leading-normal">
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
      <p className="text-foreground pl-0.5 break-words">{msg.content}</p>
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
      let senderName = "ê´€?„ìž";
      if (role === "ORGANIZER") senderName = "ì£¼ìµœ??;
      else if (role === "LEADER") {
        const myTeam = teams.find((t) => t.id === teamId);
        senderName = myTeam?.leader_name || myTeam?.name || "?€??;
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
      <div className="p-2 border-b border-border bg-card shrink-0">
        <h2 className="text-sm font-bold text-primary flex items-center gap-2 uppercase tracking-tighter">
          <span className="text-xl">?’¬</span> ?¤ì‹œê°?ì±„íŒ…
        </h2>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-2 py-1.5 flex flex-col gap-1 custom-scrollbar min-h-0"
      >
        {messages.length === 0 ? (
          <div className="text-muted-foreground text-[11px] text-center py-6 my-auto">
            ?€?”ë? ?œìž‘?˜ì„¸??
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} msg={msg} />)
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="p-2 px-3 border-t bg-muted flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="ë©”ì‹œì§€..."
          maxLength={MAX_MESSAGE_LENGTH}
          className="flex-1 bg-card border border-border px-2.5 py-1.5 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-minion-yellow transition-shadow"
          disabled={isSending}
        />
        <button
          type="submit"
          disabled={isSending || !input.trim()}
          className="bg-minion-blue text-white px-3 py-1.5 rounded-md font-bold text-xs hover:bg-minion-blue-hover transition-colors disabled:opacity-50"
        >
          ?„ì†¡
        </button>
      </form>
    </div>
  );
}
