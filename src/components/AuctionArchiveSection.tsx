"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { Trophy, X, RefreshCw } from "lucide-react";
import type { ArchiveTeam } from "@/features/auction/api/auctionActions";

interface AuctionArchiveRow {
  id: string;
  room_id: string;
  room_name: string;
  room_created_at: string;
  closed_at: string;
  result_snapshot: ArchiveTeam[];
}

// ── 상세 결과 모달 ──────────────────────────────────────────────────────────────
function ArchiveDetailModal({
  archive,
  onClose,
}: {
  archive: AuctionArchiveRow;
  onClose: () => void;
}) {
  const sortedTeams = [...archive.result_snapshot].sort((a, b) =>
    a.name.localeCompare(b.name, "ko-KR", { numeric: true }),
  );

  return (
    <div
      className="fixed inset-0 z-[210] bg-black/70 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 cursor-default border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/50 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30">
              <Trophy size={20} className="text-primary drop-shadow-sm" />
            </div>
            <div>
              <h2 className="text-xl font-black text-foreground">
                {archive.room_name}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                {new Date(archive.closed_at).toLocaleDateString("ko-KR", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                종료
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {sortedTeams.map((team) => (
              <div
                key={team.id}
                className="bg-card rounded-xl shadow-sm border border-border overflow-hidden"
              >
                <table className="w-full text-sm border-collapse">
                  <tbody>
                    <tr>
                      <td
                        rowSpan={Math.max(team.players.length, 1) + 2}
                        className="w-1/3 border-r border-b border-border bg-secondary/30 text-center align-middle p-4"
                      >
                        <span className="text-xl font-black text-foreground">
                          {team.leader_name}
                        </span>
                        <div className="text-xs text-muted-foreground mt-1">
                          {team.name}
                        </div>
                        <div className="text-xs text-primary font-bold mt-1">
                          잔여 {team.point_balance.toLocaleString()}P
                        </div>
                      </td>
                      <td className="w-2/3 border-b border-border bg-muted/50 text-center py-2 px-4">
                        <span className="font-bold text-muted-foreground">
                          롤닉
                        </span>
                      </td>
                    </tr>
                    {/* 팀장 행 */}
                    <tr>
                      <td className="w-2/3 border-b border-border/50 text-center py-2.5 px-4 bg-background relative">
                        <span className="text-primary absolute left-4 top-1/2 -translate-y-1/2 text-xs font-black bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                          👑
                        </span>
                        <span className="font-bold text-foreground">
                          {team.leader_name}
                        </span>
                      </td>
                    </tr>
                    {/* 선수 목록 */}
                    {team.players.length > 0 ? (
                      team.players.map((p, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-secondary/30 transition-colors"
                        >
                          <td
                            className={`w-2/3 text-center py-2.5 px-4 font-semibold text-foreground ${idx !== team.players.length - 1 ? "border-b border-border/50" : ""}`}
                          >
                            <span>{p.name}</span>
                            {p.sold_price != null && (
                              <span className="ml-2 text-xs text-muted-foreground">
                                {p.sold_price === 0
                                  ? "(유찰)"
                                  : `${p.sold_price.toLocaleString()}P`}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td className="w-2/3 text-center py-4 text-xs text-muted-foreground italic">
                          낙찰된 선수가 없습니다.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors border border-transparent hover:border-border"
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// ── 아카이브 목록 섹션 모달 ─────────────────────────────────────────────────────────
export function AuctionArchiveSection({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [archives, setArchives] = useState<AuctionArchiveRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AuctionArchiveRow | null>(null);

  const fetchArchives = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("auction_archives")
        .select("*")
        .order("closed_at", { ascending: false })
        .limit(20);

      if (!error && data) setArchives(data as AuctionArchiveRow[]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      void fetchArchives();
    }
  }, [isOpen, fetchArchives]);

  if (!isOpen) return null;

  if (loading)
    return (
      <div className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4">
        <div className="bg-card rounded-3xl p-8 max-w-sm w-full text-center text-muted-foreground text-sm border border-border animate-pulse">
          이전 경매 결과 불러오는 중...
        </div>
      </div>
    );

  return (
    <>
      <div
        className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
        onClick={onClose}
      >
        <div
          className="bg-card border border-border rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 cursor-default overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-6 py-5 border-b border-border flex items-center justify-between shrink-0 bg-muted/50">
            <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
              <Trophy className="text-primary" size={24} />
              이전 경매 결과 모음
            </h2>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setLoading(true);
                  void fetchArchives();
                }}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-xl hover:bg-muted"
              >
                <RefreshCw size={14} /> 새로고침
              </button>
              <button
                onClick={onClose}
                className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X size={22} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6 bg-background">
            {archives.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground font-medium">
                저장된 경매 기록이 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {archives.map((archive) => (
                  <div
                    key={archive.id}
                    className="bg-card rounded-2xl border border-border hover:border-primary/50 p-5 transition-all shadow-sm group hover:-translate-y-1 hover:shadow-md hover:bg-secondary/20 cursor-pointer"
                    onClick={() => setSelected(archive)}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 min-w-0 pr-2">
                          <div className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center shrink-0 border border-primary/30">
                            <span className="text-xl">🏆</span>
                          </div>
                          <div className="min-w-0">
                            <h3 className="font-black text-foreground text-lg truncate group-hover:text-primary transition-colors">
                              {archive.room_name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                              {new Date(archive.closed_at).toLocaleDateString(
                                "ko-KR",
                                {
                                  year: "numeric",
                                  month: "long",
                                  day: "numeric",
                                },
                              )}
                              <span className="w-1 h-1 rounded-full bg-border" />
                              <span className="font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-md">
                                총 {archive.result_snapshot.length}팀
                              </span>
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && (
        <ArchiveDetailModal
          archive={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  );
}
