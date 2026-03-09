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

  const renderFormattedSystemMessage = (content: string) => {
    const regex =
      /(\d+P|[\w가-힣]+팀|[\w가-힣]+(?=\s선수)|[\w가-힣]+(?=\s->)|(?<=->\s)[\w가-힣]+)/g;
    const parts = content.split(regex);
    return parts.map((part, i) => {
      if (part.match(regex)) {
        return (
          <strong key={i} className="font-black text-black not-italic mx-0.5">
            {part}
          </strong>
        );
      }
      return part;
    });
  };

  if (role === "SYSTEM") {
    return (
      <div className="flex items-center gap-2 my-1 px-2">
        <span className="text-[10px] text-gray-400 font-bold tracking-tighter">
          [SYSTEM]
        </span>
        <span className="text-[12px] text-gray-500 font-medium italic">
          {renderFormattedSystemMessage(msg.content)}
        </span>
      </div>
    );
  }

  if (role === "NOTICE") {
    return (
      <div className="bg-yellow-50 border-4 border-black p-3 my-2 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-black text-minion-yellow text-[8px] px-1.5 py-0.5 font-heading uppercase">
            공지사항
          </span>
          <span className="text-[8px] text-gray-400 ml-auto font-mono">
            {new Date(msg.created_at).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
        <p className="text-xs font-black text-black leading-tight">
          {msg.content}
        </p>
      </div>
    );
  }

  const BADGE: Record<string, string> = {
    ORGANIZER: "bg-red-600 text-white",
    LEADER: "bg-minion-blue text-white",
    VIEWER: "bg-gray-200 text-gray-600",
  };
  const label: Record<string, string> = {
    ORGANIZER: "주최자",
    LEADER: "팀장",
    VIEWER: "관전자",
  };

  return (
    <div className="text-[11px] p-2 hover:bg-gray-50 transition-colors border-b border-black/5">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`text-[10px] font-heading px-1 py-0.5 border border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] ${BADGE[role] || ""}`}
        >
          {label[role] || "NPC"}
        </span>
        <span className="font-black text-black">{msg.sender_name}</span>
        <span className="text-[8px] text-gray-600 ml-auto font-mono">
          {new Date(msg.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
      <p className="text-gray-700 font-bold leading-relaxed break-words pl-1 border-l-2 border-black/10">
        {msg.content}
      </p>
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
    setIsSending(true);
    try {
      let senderName = "관전자";
      if (role === "ORGANIZER") senderName = "주최자";
      else if (role === "LEADER") {
        const myTeam = teams.find((t) => t.id === teamId);
        senderName = myTeam?.leader_name || myTeam?.name || "팀장";
      }
      await sendChatMessage(roomId, senderName, role || "VIEWER", input.trim());
      setInput("");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden min-h-0">
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-3 py-2 flex flex-col gap-1 custom-scrollbar"
      >
        {messages.length === 0 ? (
          <div className="text-gray-600 text-[10px] text-center py-10 my-auto font-black italic uppercase">
            No logs recorded
          </div>
        ) : (
          messages.map((msg) => <MessageItem key={msg.id} msg={msg} />)
        )}
      </div>

      <form
        onSubmit={handleSend}
        className="p-3 bg-gray-50 border-t-4 border-black flex flex-col gap-2"
      >
        <div className="flex justify-between items-center px-1">
          <span className="text-[8px] font-black text-gray-400 uppercase">
            Message Input
          </span>
          <span className="text-[8px] font-black text-gray-400">
            {input.length}/{MAX_MESSAGE_LENGTH}
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="입력하세요..."
            maxLength={MAX_MESSAGE_LENGTH}
            className="flex-1 bg-white border-4 border-black px-3 py-2 text-[10px] font-black focus:outline-none placeholder:text-gray-200"
            disabled={isSending}
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="pixel-button bg-black text-white px-4 text-[10px]"
          >
            전송
          </button>
        </div>
      </form>
    </div>
  );
}
