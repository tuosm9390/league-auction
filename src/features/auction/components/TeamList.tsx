"use client";

import {
  useAuctionStore,
  Team,
  Player,
} from "@/features/auction/store/useAuctionStore";

const TIER_COLOR: Record<string, string> = {
  챌린저: "text-cyan-600",
  그랜드마스터: "text-red-600",
  마스터: "text-purple-600",
  다이아: "text-blue-500",
  에메랄드: "text-emerald-600",
  플래티넘: "text-teal-600",
  골드: "text-yellow-600",
  실버: "text-gray-500",
  브론즈: "text-amber-800",
};

export function UnsoldPanel() {
  const players = useAuctionStore((state) => state.players || []);
  const unsoldPlayers = players.filter((p: Player) => p.status === "UNSOLD");

  if (unsoldPlayers.length === 0)
    return (
      <div className="flex-1 flex justify-center items-center py-6 text-sm text-muted-foreground font-bold italic">
        유찰 선수가 없습니다.
      </div>
    );

  return (
    <div className="flex flex-col gap-1 pb-1 w-full">
      <div className="flex justify-between items-center mb-1 px-0.5">
        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
          Total Unsold
        </span>
        <span className="text-[10px] bg-destructive text-destructive-foreground px-1.5 py-0.5 rounded-full font-black shadow-sm">
          {unsoldPlayers.length}
        </span>
      </div>
      <div className="grid grid-cols-1 gap-1">
        {unsoldPlayers.map((p: Player) => (
          <div
            key={p.id}
            className="flex justify-between items-center bg-destructive/10 hover:bg-destructive/20 p-1.5 rounded-lg border border-destructive/20 transition-colors shadow-sm"
          >
            <span className="font-black text-foreground text-[12px] truncate mr-2">
              {p.name}
            </span>
            <span
              className={`text-[9px] font-black bg-background px-1.5 py-0.5 rounded border border-border ${TIER_COLOR[p.tier] || "text-muted-foreground"}`}
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
      <div className="text-muted-foreground text-sm text-center py-10 font-bold">
        팀 정보가 없습니다.
      </div>
    );

  const sortedTeams = [...teams].sort((a, b) => {
    if (a.id === myTeamId) return -1;
    if (b.id === myTeamId) return 1;
    return a.name.localeCompare(b.name, undefined, { numeric: true });
  });

  return (
    <div className="flex flex-col gap-3">
      {sortedTeams.map((team: Team) => {
        const teamPlayers = players.filter((p) => p.team_id === team.id);
        const isMyTeam = team.id === myTeamId;
        const isTeamComplete = teamPlayers.length === membersPerTeam - 1;

        return (
          <div
            key={team.id}
            className={`p-2.5 rounded-lg border transition-all duration-300 relative overflow-hidden ${isTeamComplete ? "border-primary bg-primary/5 shadow-sm" : isMyTeam ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/20" : "border-border bg-muted/30"}`}
          >
            {isTeamComplete && (
              <div className="absolute top-0 right-0 w-12 h-12 pointer-events-none">
                <div className="absolute top-2 -right-4 origin-center rotate-45 bg-primary text-primary-foreground text-[8px] font-black py-0.5 px-6 shadow-sm">
                  DONE
                </div>
              </div>
            )}
            <div className="flex justify-between items-start mb-2">
              <h3
                className={`font-bold text-sm flex items-center gap-1 ${isTeamComplete ? "text-primary" : isMyTeam ? "text-primary" : "text-foreground"}`}
              >
                {isMyTeam && (
                  <span className="text-primary text-base drop-shadow-sm">
                    ★
                  </span>
                )}
                {team.name}
              </h3>
              <div
                className={`font-mono font-bold px-1.5 py-0.5 rounded-md text-xs shadow-sm border ${isTeamComplete ? "bg-primary/20 text-primary border-primary/30" : "bg-background text-foreground border-border"}`}
              >
                {team.point_balance.toLocaleString()}P
              </div>
            </div>

            <div className="space-y-1">
              <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mb-1 flex justify-between items-center px-0.5">
                <span>Roster</span>
                <span
                  className={
                    isTeamComplete ? "text-primary" : "text-muted-foreground"
                  }
                >
                  {teamPlayers.length} / {membersPerTeam - 1}
                </span>
              </p>
              {teamPlayers.length === 0 ? (
                <div className="text-[11px] text-muted-foreground font-bold italic py-1 px-1">
                  낙찰 받은 선수가 없습니다.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1">
                  {teamPlayers.map((p: Player) => (
                    <div
                      key={p.id}
                      className="flex justify-between items-center text-[12px] bg-background p-1.5 rounded-md border border-border shadow-sm group hover:border-primary/50 transition-colors"
                    >
                      <span className="font-medium text-foreground truncate">
                        {p.name}
                      </span>
                      <span className="font-bold text-primary bg-primary/10 px-1 py-0.5 rounded text-[9px]">
                        {p.sold_price || 0}P
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
