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
        className="bg-white rounded-3xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl relative animate-in zoom-in-95 duration-200 cursor-default"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Content */}
        <div className="bg-white rounded-xl w-full max-w-3xl shadow-md overflow-hidden border border-gray-200 relative animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between shrink-0 bg-white/95 rounded-t-xl z-10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-minion-yellow/20 rounded-lg flex items-center justify-center border border-amber-200">
                <Trophy size={16} className="text-orange-500" />
              </div>
              <h2 className="text-base font-bold text-gray-800 tracking-tight">
                최종 경매 결과
              </h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-700 p-1.5 rounded-md hover:bg-gray-100 transition-colors bg-white shadow-sm border border-gray-200"
            >
              <X size={16} />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 lg:p-5 z-10 bg-gray-50/30 custom-scrollbar">
            {sortedTeams.length === 0 ? (
              <div className="text-center py-10 text-gray-400 font-medium text-sm border border-dashed border-gray-200 rounded-lg">
                표시할 팀 데이터가 없습니다.
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {sortedTeams.map((team: Team) => {
                  const teamPlayers = players.filter(
                    (p) => p.team_id === team.id,
                  );

                  return (
                    <div
                      key={team.id}
                      className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden flex flex-col group hover:border-minion-blue/50 transition-colors h-full"
                    >
                      <table className="w-full text-xs border-collapse h-full">
                        <tbody>
                          {/* 헤더 행 */}
                          <tr>
                            <td
                              rowSpan={Math.max(teamPlayers.length, 1) + 2}
                              className="w-[35%] border-r border-b border-gray-200 bg-gray-50 text-center align-middle p-3"
                            >
                              <span className="text-base font-bold text-gray-800">
                                {team.leader_name}
                              </span>
                              <div className="text-[10px] text-gray-500 mt-0.5">
                                {team.name}
                              </div>
                              <div className="mt-2 inline-flex border border-amber-200 bg-amber-50 text-amber-700 font-mono text-[9px] font-bold px-1.5 py-0.5 rounded leading-none">
                                {team.point_balance}P 남음
                              </div>
                            </td>
                            <td className="w-[65%] border-b border-gray-200 bg-blue-50/50 text-center py-1.5 px-3">
                              <span className="font-semibold text-gray-500 text-[10px] uppercase tracking-wider">
                                소속 선수
                              </span>
                            </td>
                          </tr>

                          {/* 팀장 행 */}
                          <tr>
                            <td className="w-[65%] border-b border-gray-100 text-center py-2 px-3 bg-white relative">
                              <span className="text-indigo-500 absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold bg-indigo-50 px-1 py-0.5 rounded leading-none border border-indigo-100">
                                👑 팀장
                              </span>
                              <span className="font-bold text-gray-800">
                                {team.leader_name}
                              </span>
                            </td>
                          </tr>

                          {/* 팀원 행렬 */}
                          {teamPlayers.length > 0 ? (
                            teamPlayers.map((p: Player, idx: number) => (
                              <tr key={p.id}>
                                <td
                                  className={`w-[65%] text-center py-2 px-3 font-medium text-gray-700 relative ${idx !== teamPlayers.length - 1 ? "border-b border-gray-50" : ""}`}
                                >
                                  {p.name}
                                  {p.sold_price && (
                                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-blue-500 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">
                                      {p.sold_price}P
                                    </span>
                                  )}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td className="w-[65%] text-center py-3 text-[11px] text-gray-400 italic">
                                빈 로스터
                              </td>
                            </tr>
                          )}
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
