import {
  useAuctionStore,
  Team,
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
  const rosterSlots = Math.max((membersPerTeam ?? 5) - 1, 1);

  if (!isOpen) return null;

  const sortedTeams = [...teams].sort((a, b) =>
    a.name.localeCompare(b.name, "ko-KR", { numeric: true }),
  );

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-popover rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200 cursor-default border border-border overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-border flex items-center justify-between shrink-0 bg-popover/95 z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center border border-primary/30">
              <Trophy size={16} className="text-primary" />
            </div>
            <h2 className="text-base font-bold text-foreground tracking-tight">
              최종 경매 결과
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors border border-border shadow-sm bg-popover"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5 z-10 bg-muted/30 custom-scrollbar">
          {sortedTeams.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground font-medium text-sm border border-dashed border-border rounded-lg">
              표시할 팀 데이터가 없습니다.
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {sortedTeams.map((team: Team) => {
                const teamPlayers = players.filter((p) => p.team_id === team.id);
                const slots = Array.from({ length: rosterSlots }, (_, i) => teamPlayers[i] ?? null);

                return (
                  <div
                    key={team.id}
                    className="bg-popover rounded-lg shadow-sm border border-border overflow-hidden flex flex-col group hover:border-secondary/50 transition-colors h-full"
                  >
                    <table className="w-full text-xs border-collapse h-full">
                      <tbody>
                        <tr>
                          <td
                            rowSpan={rosterSlots + 2}
                            className="w-[35%] border-r border-b border-border bg-muted/50 text-center align-middle p-3"
                          >
                            <span className="text-base font-bold text-foreground">
                              {team.leader_name}
                            </span>
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {team.name}
                            </div>
                            <div className="mt-2 inline-flex border border-primary/20 bg-primary/10 text-primary font-mono text-[9px] font-bold px-1.5 py-0.5 rounded leading-none">
                              {team.point_balance}P 남음
                            </div>
                          </td>
                          <td className="w-[65%] border-b border-border bg-muted/30 text-center py-1.5 px-3">
                            <span className="font-semibold text-muted-foreground text-[10px] uppercase tracking-wider">
                              소속 선수
                            </span>
                          </td>
                        </tr>

                        <tr>
                          <td className="w-[65%] border-b border-border text-center py-2 px-3 bg-popover relative">
                            <span className="text-secondary absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-secondary/10 px-1 py-0.5 rounded leading-none border border-secondary/20">
                              👑 팀장
                            </span>
                            <span className="font-bold text-foreground">
                              {team.leader_name}
                            </span>
                          </td>
                        </tr>

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
                                  {player.sold_price != null && (
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-secondary bg-secondary/10 px-1 py-0.5 rounded border border-secondary/20">
                                      {player.sold_price}P
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-[11px] text-muted-foreground/30 italic">
                                  -
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
  );
}
