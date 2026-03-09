"use client";

import { useState } from "react";
import {
  useAuctionStore,
  Team,
} from "@/features/auction/store/useAuctionStore";
import { Copy, Check, X, Link } from "lucide-react";

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
        className="flex items-center gap-1.5 bg-background/10 hover:bg-secondary/50 text-background px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors border border-background/30 shadow-inner"
      >
        <Link size={14} className="text-primary" /> 링크 확인
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-popover rounded-xl w-full max-w-md shadow-md animate-in zoom-in-95 duration-200 cursor-default border border-border overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/50">
              <h2 className="text-base font-bold text-foreground flex items-center gap-1.5">
                <Link size={16} className="text-secondary" /> 경매방 링크
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {organizerLink && (
                <LinkRow
                  label="👑 주최자 링크"
                  desc="경매 진행 및 관리 전용"
                  link={organizerLink}
                  linkKey="organizer"
                  copied={copied}
                  onCopy={copyToClipboard}
                />
              )}

              <div>
                <p className="text-sm font-bold text-muted-foreground mb-2.5 flex items-center gap-1.5">
                  <span className="text-base">🛡️</span> 팀장 링크
                </p>
                <div className="space-y-2.5">
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
                <div>
                  <p className="text-sm font-bold text-muted-foreground mb-2.5 mt-3 flex items-center gap-1.5">
                    <span className="text-base">👀</span> 관전자 링크
                  </p>
                  <LinkRow
                    label="관전자"
                    desc="관전 전용 — 자유롭게 공유 가능"
                    link={viewerLink}
                    linkKey="viewer"
                    copied={copied}
                    onCopy={copyToClipboard}
                  />
                </div>
              )}
            </div>

            <div className="px-5 py-4 border-t border-border bg-muted/50">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 rounded-lg text-base font-bold text-muted-foreground hover:bg-muted hover:text-foreground transition-colors border border-border shadow-sm bg-popover"
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
    <div className="border border-border rounded-lg p-3 flex items-center gap-3 bg-popover shadow-sm relative group hover:border-secondary/30 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground flex items-center gap-1">
          {label}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
        <div className="mt-1.5 bg-muted px-2 py-1 rounded border border-border overflow-hidden">
          <p className="text-xs text-blue-500/80 font-mono leading-tight truncate">
            {link}
          </p>
        </div>
      </div>
      <button
        onClick={() => onCopy(link, linkKey)}
        className={`flex items-center justify-center w-10 h-10 rounded-md transition-colors shrink-0 ${
          copied === linkKey
            ? "bg-green-500/10 text-green-500 border border-green-500/20"
            : "bg-muted hover:bg-muted text-muted-foreground border border-border hover:text-foreground"
        }`}
        title="복사하기"
      >
        {copied === linkKey ? <Check size={18} /> : <Copy size={18} />}
      </button>
    </div>
  );
}
