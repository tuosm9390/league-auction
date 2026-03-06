"use client";

import {
  type Player,
  type Team,
} from "@/features/auction/store/useAuctionStore";
import { useBiddingControl } from "@/features/auction/hooks/useBiddingControl";

interface BiddingControlProps {
  roomId: string;
  teamId: string;
  currentPlayer: Player | null;
  myTeam: Team | null;
  isAuctionActive: boolean;
  timerEndsAt: string | null;
  minBid: number;
  isTeamFull: boolean;
}

export function BiddingControl(props: BiddingControlProps) {
  const {
    bidAmount,
    setBidAmount,
    bidError,
    isLeading,
    numericBidAmount,
    canBid,
    waitingCount,
    soldCount,
    isBidding,
    handleBid,
    incrementBid,
    decrementBid,
  } = useBiddingControl(props);

  const {
    currentPlayer,
    isAuctionActive,
    timerEndsAt,
    minBid,
    isTeamFull,
    myTeam,
  } = props;

  return (
    <div className="bg-card rounded-xl shadow-md border border-border p-3 lg:p-4 shrink-0">
      <div className="flex items-start justify-between mb-3 pb-3 border-b border-border">
        <h3 className="text-xs lg:text-sm font-semibold text-minion-blue uppercase tracking-wider flex items-center gap-1.5 mt-1">
          <span className="text-base lg:text-lg">?”¨</span> ?€??ì»¨íŠ¸ë¡?ë°•ìŠ¤
        </h3>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-md border border-border">
            ?€ê¸°ì: {waitingCount}ëª?/ ?™ì°°?? {soldCount}ëª?
          </span>
          <div className="flex items-center gap-3 lg:gap-4 mt-0.5">
            <div className="flex flex-col items-end">
              <span className="text-[8px] lg:text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                ?¨ì? ?¬ì¸??
              </span>
              <span className="text-base lg:text-lg font-bold text-minion-blue tabular-nums leading-none">
                {myTeam?.point_balance?.toLocaleString() ?? 0}P
              </span>
            </div>
            {currentPlayer && (
              <div className="flex flex-col items-end">
                <span className="text-[9px] lg:text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                  ìµœì†Œ ?…ì°°ê°€
                </span>
                <span className="text-base lg:text-lg font-bold text-red-500 tabular-nums leading-none">
                  {minBid.toLocaleString()}P
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {bidError && (
        <div className="mb-3 bg-red-50 border border-red-100 text-red-600 text-[12px] py-2 px-3 rounded-lg font-bold text-center animate-pulse">
          {bidError}
        </div>
      )}

      <div className="flex gap-1.5 lg:gap-3 relative h-10 md:h-11 lg:h-12">
        {!isAuctionActive && (
          <div className="absolute inset-0 bg-card/95 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-lg border border-dashed border-border">
            <p className="text-xs lg:text-sm text-muted-foreground font-medium flex items-center gap-1.5 lg:gap-2">
              <span className="text-base lg:text-lg animate-bounce">?±ï¸</span>
              {!currentPlayer
                ? "? ìˆ˜ê°€ ì¶”ì²¨?˜ë©´ ?…ì°° ì°½ì´ ?œì„±?”ë©?ˆë‹¤."
                : !timerEndsAt
                  ? "ì£¼ìµœ?ê? ê²½ë§¤ë¥??œì‘?˜ë©´ ?…ì°°?????ˆìŠµ?ˆë‹¤."
                  : "ê²½ë§¤ ?œê°„??ì¢…ë£Œ?˜ì—ˆ?µë‹ˆ??"}
            </p>
          </div>
        )}

        <button
          onClick={decrementBid}
          disabled={!canBid || numericBidAmount <= minBid}
          className="bg-card hover:bg-muted text-foreground w-10 lg:w-12 h-full rounded-lg font-bold text-xl lg:text-2xl border border-border transition-all active:scale-90 disabled:opacity-20 shadow-sm"
        >
          ï¼?
        </button>

        <div className="relative flex-1 group">
          <input
            type="number"
            value={bidAmount}
            min={minBid}
            step={10}
            onChange={(e) => setBidAmount(e.target.value)}
            onFocus={(e) => e.target.select()}
            disabled={!canBid}
            className="w-full h-full bg-card border-2 lg:border-2 border-border focus:border-minion-blue rounded-lg px-2 sm:px-3 lg:px-4 text-lg sm:text-xl md:text-2xl lg:text-2xl font-bold text-center focus:outline-none focus:ring-1 focus:ring-minion-blue/20 transition-all disabled:opacity-50 tabular-nums"
          />
          <div className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm lg:text-base pointer-events-none group-focus-within:text-minion-blue transition-colors">
            P
          </div>
        </div>

        <button
          onClick={incrementBid}
          disabled={!canBid}
          className="bg-card hover:bg-muted text-foreground w-10 lg:w-12 h-full rounded-lg font-bold text-xl lg:text-2xl border border-border transition-all active:scale-90 disabled:opacity-20 shadow-sm"
        >
          ï¼?
        </button>

        <button
          onClick={handleBid}
          disabled={!canBid}
          className={`flex-[1.3] h-full rounded-lg font-bold text-xs md:text-sm lg:text-base tracking-tight transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
            isLeading
              ? "bg-minion-yellow text-minion-blue border border-amber-300"
              : "bg-red-500 hover:bg-red-600 text-white"
          }`}
        >
          {isLeading
            ? "?™ì°° ? ë ¥ ?„ë³´! ?‘‘"
            : isBidding
              ? "?…ì°° ì¤?.."
              : isTeamFull
                ? "?š« ?•ì› ì´ˆê³¼"
                : "?…ì°° ?˜ê¸° ?”¥"}
        </button>
      </div>

      {isTeamFull && (
        <p className="text-[10px] text-red-500 mt-3 text-center font-bold animate-pulse">
          ???„ì¬ ?€??ëª¨ë“  ?ë¦¬ê°€ ê°€??ì°¼ìŠµ?ˆë‹¤.
        </p>
      )}
    </div>
  );
}
