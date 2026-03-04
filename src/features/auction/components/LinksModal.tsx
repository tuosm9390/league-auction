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
        className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-colors border border-white/20 shadow-inner"
      >
        <Link size={14} /> 링크 확인
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="bg-white rounded-xl w-full max-w-sm shadow-md animate-in zoom-in-95 duration-200 cursor-default border border-gray-200 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h2 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
                <Link size={14} className="text-minion-blue" /> 경매방 링크
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="p-4 space-y-3 max-h-[70vh] overflow-y-auto custom-scrollbar">
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
                <p className="text-xs font-bold text-gray-600 mb-2 flex items-center gap-1">
                  <span className="text-sm">🛡️</span> 팀장 링크
                </p>
                <div className="space-y-2">
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
                  <p className="text-xs font-bold text-gray-600 mb-2 mt-2 flex items-center gap-1">
                    <span className="text-sm">👀</span> 관전자 링크
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

            <div className="px-4 py-3 border-t border-gray-100 bg-gray-50/50">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2 rounded-lg text-sm font-bold text-gray-600 hover:bg-white hover:text-gray-800 transition-colors border border-gray-200 shadow-sm bg-white"
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
    <div className="border border-gray-200 rounded-lg p-2.5 flex items-center gap-2.5 bg-white shadow-sm relative group hover:border-minion-blue/30 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-800 flex items-center gap-1">
          {label}
        </p>
        <p className="text-[10px] text-gray-500">{desc}</p>
        <div className="mt-0.5 bg-blue-50/50 px-1.5 py-0.5 rounded border border-blue-100/50 overflow-hidden">
          <p className="text-[10px] text-blue-500/80 font-mono leading-tight truncate">
            {link}
          </p>
        </div>
      </div>
      <button
        onClick={() => onCopy(link, linkKey)}
        className={`flex items-center justify-center w-8 h-8 rounded-md transition-colors shrink-0 ${
          copied === linkKey
            ? "bg-green-50 text-green-600 border border-green-200"
            : "bg-gray-50 hover:bg-gray-100 text-gray-500 border border-gray-200 hover:text-gray-700"
        }`}
        title="복사하기"
      >
        {copied === linkKey ? <Check size={14} /> : <Copy size={14} />}
      </button>
    </div>
  );
}
