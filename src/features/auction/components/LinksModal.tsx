"use client";

import { useState } from "react";
import {
  useAuctionStore,
  Team,
} from "@/features/auction/store/useAuctionStore";
import { Copy, Check, X, Link as LinkIcon } from "lucide-react";

export function LinksModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const roomId = useAuctionStore((state) => state.roomId);
  const teams = useAuctionStore((state) => state.teams);
  const organizerToken = useAuctionStore((state) => state.organizerToken);
  const viewerToken = useAuctionStore((state) => state.viewerToken);

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  if (!roomId) return null;

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const organizerLink = organizerToken
    ? `${baseUrl}/api/room-auth?roomId=${roomId}&role=ORGANIZER&token=${organizerToken}`
    : null;
  const viewerLink = viewerToken
    ? `${baseUrl}/api/room-auth?roomId=${roomId}&role=VIEWER&token=${viewerToken}`
    : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-4 py-1.5 border-2 border-white/20 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all text-[10px] font-heading"
      >
        <LinkIcon size={12} /> LINKS
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-md flex flex-col max-h-[80vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b-4 border-black flex items-center justify-between bg-minion-blue text-white">
              <h2 className="text-sm font-black flex items-center gap-2">
                📡 접속 링크
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:text-minion-yellow transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-6 overflow-y-auto custom-scrollbar bg-gray-50">
              {organizerLink && (
                <LinkRow
                  label="👑 MASTER"
                  desc="주최자 전용 컨트롤 패널"
                  link={organizerLink}
                  linkKey="organizer"
                  copied={copied}
                  onCopy={copyToClipboard}
                />
              )}

              <div className="space-y-3">
                <p className="text-[10px] font-heading text-gray-500 uppercase tracking-tighter flex items-center gap-2">
                  🛡️ TEAM LEADERS
                </p>
                <div className="space-y-3">
                  {[...teams]
                    .sort((a, b) =>
                      a.name.localeCompare(b.name, undefined, {
                        numeric: true,
                      }),
                    )
                    .map((team: Team, i: number) => {
                      const link = team.leader_token
                        ? `${baseUrl}/api/room-auth?roomId=${roomId}&role=LEADER&teamId=${team.id}&token=${team.leader_token}`
                        : null;
                      if (!link) return null;
                      return (
                        <LinkRow
                          key={team.id}
                          label={team.name}
                          desc={`팀장: ${team.leader_name || "(미설정)"} · 입찰 가능`}
                          link={link}
                          linkKey={`captain-${i}`}
                          copied={copied}
                          onCopy={copyToClipboard}
                        />
                      );
                    })}
                </div>
              </div>

              {viewerLink && (
                <div className="space-y-3">
                  <p className="text-[10px] font-heading text-gray-500 uppercase tracking-tighter">
                    👀 OBSERVERS
                  </p>
                  <LinkRow
                    label="관전자"
                    desc="누구나 관전 가능"
                    link={viewerLink}
                    linkKey="viewer"
                    copied={copied}
                    onCopy={copyToClipboard}
                  />
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t-4 border-black bg-white">
              <button
                onClick={() => setIsOpen(false)}
                className="pixel-button w-full py-3 bg-black text-white text-[10px] font-heading"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LinkRow({
  label,
  desc,
  link,
  linkKey,
  copied,
  onCopy,
}: {
  label: string;
  desc: string;
  link: string;
  linkKey: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="border-2 border-black bg-white p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] relative flex items-center gap-3">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-black text-black uppercase">{label}</p>
        <p className="text-[10px] text-gray-400 font-bold">{desc}</p>
        <div className="mt-2 bg-gray-100 p-1 border border-black overflow-hidden">
          <p className="text-[9px] text-minion-blue font-mono truncate">
            {link}
          </p>
        </div>
      </div>
      <button
        onClick={() => onCopy(link, linkKey)}
        className={`pixel-button w-10 h-10 shrink-0 ${
          copied === linkKey
            ? "bg-green-500/10 text-green-500 border border-green-500/20"
            : "bg-muted hover:bg-muted text-muted-foreground border border-border hover:text-foreground"
        }`}
        title="복사하기"
      >
        {copied === linkKey ? <Check size={16} /> : <Copy size={16} />}
      </button>
    </div>
  );
}
