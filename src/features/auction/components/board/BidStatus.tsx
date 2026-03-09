"use client";

import { Team } from "@/features/auction/store/useAuctionStore";

interface BidStatusProps {
  highestBid: number;
  leadingTeam: Team | null | undefined;
  teamId: string | null;
}

export function BidStatus({ highestBid, leadingTeam, teamId }: BidStatusProps) {
  return (
    <div
      className={`pixel-box p-4 transition-all ${highestBid > 0 ? "bg-minion-yellow/10" : "bg-gray-100 opacity-50"}`}
    >
      {highestBid > 0 ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-3xl">💰</span>
            <div>
              <p className="text-[10px] font-bold uppercase text-gray-500">
                CURRENT BID
              </p>
              <p className="text-3xl font-black text-minion-blue">
                {highestBid.toLocaleString()} P
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold uppercase text-gray-500">
              LEADING TEAM
            </p>
            <p className="text-xl font-black">
              {leadingTeam?.name || "?"}
            </p>
            {leadingTeam?.id === teamId && teamId && (
              <span className="text-[10px] bg-green-500 text-white px-2 py-0.5 font-bold">
                선두입니다!
              </span>
            )}
          </div>
        </div>
      ) : (
        <p className="text-center font-bold text-gray-600 py-2 animate-pulse">
          경매 대기중...
        </p>
      )}
    </div>
  );
}
