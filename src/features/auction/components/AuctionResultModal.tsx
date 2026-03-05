import {
  useAuctionStore,
  Team,
  Player,
} from "@/features/auction/store/useAuctionStore";
import { X, Trophy } from "lucide-react";

export function AuctionResultModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const teams = useAuctionStore((state) => state.teams || []);
  const players = useAuctionStore((state) => state.players || []);

  const membersPerTeam = useAuctionStore((state) => state.membersPerTeam);
  // 팀장을 제외한 팀원 슬롯 수
  const rosterSlots = Math.max((membersPerTeam ?? 5) - 1, 1);

  if (!isOpen) return null;

  // 1팀부터 정렬 (이름 기준 오름차순 정도)
  const sortedTeams = [...teams].sort((a, b) =>
    a.name.localeCompare(b.name, "ko-KR", { numeric: true }),
  );

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Content */}
        <div className="bg-card rounded-xl w-full shadow-md overflow-hidden border border-border relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/50 rounded-t-xl z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center border border-border">
                <Trophy size={16} className="text-foreground" />
              </div>
              <h2 className="text-base font-bold text-foreground tracking-tight">
                최종 경매 결과
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-5 z-10 bg-background/50 custom-scrollbar">
            {sortedTeams.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground font-medium text-sm border border-dashed border-border rounded-lg">
                표시할 팀 데이터가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sortedTeams.map((team: Team) => {
                  const teamPlayers = players.filter(
                    (p) => p.team_id === team.id,
                  );

                  // rosterSlots 개수의 고정 행 생성 (선수가 있으면 채우고, 없으면 빈 슬롯)
                  const slots = Array.from(
                    { length: rosterSlots },
                    (_, i) => teamPlayers[i] ?? null,
                  );

                  return (
                    <div
                      key={team.id}
                      className="bg-card rounded-lg shadow-sm border border-border overflow-hidden flex flex-col group hover:border-primary/50 transition-colors h-full"
                    >
                      <table className="w-full text-xs border-collapse h-full">
                        <tbody>
                          {/* 헤더 행 */}
                          <tr>
                            <td
                              rowSpan={rosterSlots + 2}
                              className="w-[35%] border-r border-b border-border bg-secondary/50 text-center align-middle p-3"
                            >
                              <span className="text-base font-bold text-foreground">
                                {team.leader_name}
                              </span>
                              <div className="text-[10px] text-muted-foreground mt-0.5">
                                {team.name}
                              </div>
                              <div className="mt-2 inline-flex border border-border bg-secondary text-foreground font-mono text-[9px] font-bold px-1.5 py-0.5 rounded leading-none">
                                {team.point_balance}P 남음
                              </div>
                            </td>
                            <td className="w-[65%] border-b border-border bg-secondary/20 text-center py-1.5 px-3">
                              <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                                소속 선수
                              </span>
                            </td>
                          </tr>

                          {/* 팀장 행 */}
                          <tr>
                            <td className="w-[65%] border-b border-border text-center py-2 px-3 bg-card relative">
                              <span className="text-primary-foreground absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-primary px-1 py-0.5 rounded leading-none border border-border">
                                👑 팀장
                              </span>
                              <span className="font-bold text-foreground">
                                {team.leader_name}
                              </span>
                            </td>
                          </tr>

                          {/* 팀원 고정 슬롯 */}
                          {slots.map((player, idx) => (
                            <tr key={player?.id ?? `empty-${idx}`}>
                              <td
                                className={`w-[65%] text-center py-2 px-3 relative ${idx !== rosterSlots - 1 ? "border-b border-border/50" : ""}`}
                              >
                                {player ? (
                                  <>
                                    <span className="font-medium text-foreground">
                                      {player.name}
                                    </span>
                                    {player.sold_price && (
                                      <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-secondary-foreground bg-secondary px-1 py-0.5 rounded border border-border">
                                        {player.sold_price}P
                                      </span>
                                    )}
                                  </>
                                ) : (
                                  <span className="text-[11px] text-muted-foreground/50 italic">
                                    —
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
