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
        <h3 className="text-xs lg:text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5 mt-1">
          <span className="text-base lg:text-lg">🔨</span> 팀장 컨트롤 박스
        </h3>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-md border border-border">
            대기자: {waitingCount}명 / 낙찰자: {soldCount}명
          </span>
          <div className="flex items-center gap-3 lg:gap-4 mt-0.5">
            <div className="flex flex-col items-end">
              <span className="text-[8px] lg:text-[9px] font-bold text-muted-foreground uppercase tracking-tight">
                남은 포인트
              </span>
              <span className="text-base lg:text-lg font-bold text-primary tabular-nums leading-none">
                {myTeam?.point_balance?.toLocaleString() ?? 0}P
              </span>
            </div>
            {currentPlayer && (
              <div className="flex flex-col items-end">
                <span className="text-[9px] lg:text-[10px] font-black text-muted-foreground uppercase tracking-tighter">
                  최소 입찰가
                </span>
                <span className="text-base lg:text-lg font-bold text-destructive tabular-nums leading-none">
                  {minBid.toLocaleString()}P
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {bidError && (
        <div className="mb-3 bg-destructive/10 border border-destructive/20 text-destructive text-[12px] py-2 px-3 rounded-lg font-bold text-center animate-pulse">
          {bidError}
        </div>
      )}

      <div className="flex gap-1.5 lg:gap-3 relative h-10 md:h-11 lg:h-12">
        {!isAuctionActive && (
          <div className="absolute inset-0 bg-background/95 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-lg border border-dashed border-border">
            <p className="text-xs lg:text-sm text-muted-foreground font-medium flex items-center gap-1.5 lg:gap-2">
              <span className="text-base lg:text-lg animate-bounce">⏱️</span>
              {!currentPlayer
                ? "선수가 추첨되면 입찰 창이 활성화됩니다."
                : !timerEndsAt
                  ? "주최자가 경매를 시작하면 입찰할 수 있습니다."
                  : "경매 시간이 종료되었습니다."}
            </p>
          </div>
        )}

        <button
          onClick={decrementBid}
          disabled={!canBid || numericBidAmount <= minBid}
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground w-10 lg:w-12 h-full rounded-md font-bold text-xl lg:text-2xl border border-border transition-all active:scale-90 disabled:opacity-20 shadow-sm"
        >
          －
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
            className="w-full h-full bg-background border-2 border-input focus:border-primary rounded-md px-2 sm:px-3 lg:px-4 text-lg sm:text-xl md:text-2xl lg:text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-ring transition-all disabled:opacity-50 tabular-nums"
          />
          <div className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-muted-foreground font-bold text-sm lg:text-base pointer-events-none group-focus-within:text-primary transition-colors">
            P
          </div>
        </div>

        <button
          onClick={incrementBid}
          disabled={!canBid}
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground w-10 lg:w-12 h-full rounded-md font-bold text-xl lg:text-2xl border border-border transition-all active:scale-90 disabled:opacity-20 shadow-sm"
        >
          ＋
        </button>

        <button
          onClick={handleBid}
          disabled={!canBid}
          className={`flex-[1.3] h-full rounded-md font-bold text-xs md:text-sm lg:text-base tracking-tight transition-all active:translate-y-0.5 active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed shadow-sm ${
            isLeading
              ? "bg-secondary text-secondary-foreground border border-border"
              : "bg-destructive text-destructive-foreground hover:bg-destructive/90"
          }`}
        >
          {isLeading
            ? "낙찰 유력 후보! 👑"
            : isBidding
              ? "입찰 중..."
              : isTeamFull
                ? "🚫 정원 초과"
                : "입찰 하기 🔥"}
        </button>
      </div>

      {isTeamFull && (
        <p className="text-[10px] text-destructive mt-3 text-center font-bold animate-pulse">
          ※ 현재 팀의 모든 자리가 가득 찼습니다.
        </p>
      )}
    </div>
  );
}
