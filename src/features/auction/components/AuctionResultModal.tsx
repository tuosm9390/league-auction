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
        className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-full max-w-5xl max-h-[90vh] flex flex-col relative animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b-4 border-black flex items-center justify-between shrink-0 bg-minion-yellow">
          <div className="flex items-center gap-2.5">
            <Trophy size={18} className="text-black" />
            <h2 className="font-black text-lg font-heading text-black uppercase">
              경매 결과
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-black hover:bg-black/10 p-1 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6 bg-gray-50 custom-scrollbar">
          {sortedTeams.length === 0 ? (
            <div className="text-center py-10 text-gray-400 font-heading text-[10px] border-4 border-dashed border-gray-200">
              NO DATA FOUND
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {sortedTeams.map((team: Team) => {
                const teamPlayers = players.filter(
                  (p) => p.team_id === team.id,
                );
                const slots = Array.from(
                  { length: rosterSlots },
                  (_, i) => teamPlayers[i] ?? null,
                );

                return (
                  <div
                    key={team.id}
                    className="bg-white border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col"
                  >
                    <table className="w-full text-[10px] border-collapse h-full">
                      <tbody>
                        <tr>
                          <td
                            rowSpan={rosterSlots + 2}
                            className="w-[35%] border-r-4 border-black bg-gray-100 text-center align-middle p-4"
                          >
                            <span className="text-sm font-black text-black block mb-1">
                              {team.leader_name}
                            </span>
                            <div className="text-[8px] font-heading text-minion-blue mb-3">
                              {team.name}
                            </div>
                            <div className="inline-block border-2 border-black bg-minion-yellow text-black font-heading text-[7px] px-2 py-1 uppercase">
                              {team.point_balance}P LEFT
                            </div>
                          </td>
                          <td className="w-[65%] border-b-4 border-black bg-minion-blue text-white text-center py-2 px-3">
                            <span className="font-heading text-[10px] uppercase tracking-tighter">
                              ROSTER
                            </span>
                          </td>
                        </tr>

                        <tr>
                          <td className="w-[65%] border-b-2 border-black text-center py-2.5 px-3 bg-blue-50 relative">
                            <span className="text-indigo-600 absolute left-2 top-1/2 -translate-y-1/2 text-[10px] font-heading">
                              Leader
                            </span>
                            <span className="font-black text-[14px] text-gray-900">
                              {team.leader_name}
                            </span>
                          </td>
                        </tr>

                        {slots.map((player, idx) => (
                          <tr key={player?.id ?? `empty-${idx}`}>
                            <td
                              className={`w-[65%] text-center py-2.5 px-3 relative ${idx !== slots.length - 1 ? "border-b border-gray-300" : ""}`}
                            >
                              {player ? (
                                <>
                                  <span className="font-black text-[14px] text-gray-800">
                                    {player.name}
                                  </span>
                                  {typeof player.sold_price === "number" && (
                                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[12px] font-black text-red-500">
                                      {player.sold_price}P
                                    </span>
                                  )}
                                </>
                              ) : (
                                <span className="text-[8px] font-heading text-gray-300">
                                  --- EMPTY ---
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
        <div className="px-6 py-4 border-t-4 border-black bg-white shrink-0">
          <button
            onClick={onClose}
            className="pixel-button w-full py-3 bg-black text-white text-[10px] font-heading"
          >
            CLOSE
          </button>
        </div>
      </div>
    </div>
  );
}
