"use client";

import {
  useAuctionStore,
  Team,
  Player,
} from "@/features/auction/store/useAuctionStore";

const TIER_COLOR: Record<string, string> = {
  챌린저: "text-cyan-400",
  그랜드마스터: "text-red-500",
  마스터: "text-purple-400",
  다이아: "text-blue-400",
  에메랄드: "text-emerald-400",
  플래티넘: "text-teal-400",
  골드: "text-yellow-400",
  실버: "text-gray-600",
  브론즈: "text-amber-600",
};

export function UnsoldPanel() {
  const players = useAuctionStore((state) => state.players || []);
  const unsoldPlayers = players.filter((p: Player) => p.status === "UNSOLD");

  if (unsoldPlayers.length === 0)
    return (
      <div className="flex-1 flex justify-center items-center py-6 text-[10px] text-gray-600 font-bold italic tracking-tighter">
        유찰 인원이 없습니다.
      </div>
    );

  return (
    <div className="flex flex-col gap-1 pb-1 w-full">
      <div className="grid grid-cols-1 gap-1">
        {unsoldPlayers.map((p: Player) => (
          <div
            key={p.id}
            className="flex justify-between items-center bg-gray-50 border-2 border-black p-1.5 hover:bg-red-50 transition-colors shadow-sm"
          >
            <span className="font-black text-gray-800 text-[10px] truncate">
              {p.name}
            </span>
            <span
              className={`text-[7px] font-heading ${TIER_COLOR[p.tier] || "text-gray-600"}`}
            >
              {p.tier}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export function TeamList() {
  const teams = useAuctionStore((state) => state.teams || []);
  const players = useAuctionStore((state) => state.players || []);
  const myTeamId = useAuctionStore((state) => state.teamId);
  const membersPerTeam = useAuctionStore((state) => state.membersPerTeam);

  if (teams.length === 0)
    return (
      <div className="text-gray-600 text-xs text-center py-10 font-bold">
        NO PARTY DATA FOUND
      </div>
    );

  const sortedTeams = [...teams].sort((a, b) => {
    if (a.id === myTeamId) return -1;
    if (b.id === myTeamId) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

  return (
    <div className="flex flex-col gap-4">
      {sortedTeams.map((team: Team) => {
        const teamPlayers = players.filter(
          (p) => p.team_id === team.id && p.status === "SOLD",
        );
        const isMyTeam = team.id === myTeamId;
        const totalSlots = membersPerTeam - 1;
        const isTeamComplete = teamPlayers.length === totalSlots;

        return (
          <div
            key={team.id}
            className={`p-3 border-4 border-black relative overflow-hidden transition-all ${isTeamComplete ? "bg-green-50 opacity-80" : isMyTeam ? "bg-blue-50 ring-2 ring-minion-blue ring-inset shadow-[4px_4px_0px_0px_rgba(35,88,164,1)]" : "bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"}`}
          >
            <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-1">
              <h3
                className={`font-black text-xs flex items-center gap-1 ${isMyTeam ? "text-minion-blue" : "text-black"}`}
              >
                {isMyTeam && <span className="animate-bounce">▶</span>}{" "}
                {team.name}
              </h3>
              <div className="bg-black text-white px-2 py-0.5 text-[10px] font-bold">
                {team.point_balance.toLocaleString()} P
              </div>
            </div>

            <div className="grid grid-cols-1 gap-1.5">
              {/* 실제 낙찰된 선수 슬롯 */}
              {teamPlayers.map((p: Player) => (
                <div
                  key={p.id}
                  className="flex justify-between items-center bg-white border-2 border-black p-1.5 shadow-sm group"
                >
                  <div className="flex flex-col">
                    <span className="font-black text-[11px] text-gray-900 leading-none">
                      {p.name}
                    </span>
                    <span
                      className={`text-[8px] font-bold uppercase ${TIER_COLOR[p.tier]}`}
                    >
                      {p.tier}
                    </span>
                  </div>
                  <span className="font-black text-minion-blue text-[10px] bg-minion-yellow px-1.5 py-0.5 border border-black">
                    {p.sold_price || 0} P
                  </span>
                </div>
              ))}

              {/* 빈 슬롯 표시 */}
              {Array.from({ length: totalSlots - teamPlayers.length }).map(
                (_, i) => (
                  <div
                    key={`empty-${i}`}
                    className="border-2 border-black border-dashed p-2 flex items-center justify-center bg-gray-50/50"
                  >
                    <span className="text-[7px] font-heading text-gray-500 uppercase tracking-widest">
                      --- EMPTY SLOT ---
                    </span>
                  </div>
                ),
              )}
            </div>

            {isTeamComplete && (
              <div className="absolute -bottom-1 -right-6 bg-green-500 text-white text-[7px] font-heading px-8 py-1 rotate-[-15deg] border-2 border-black shadow-lg">
                FULL PARTY
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
