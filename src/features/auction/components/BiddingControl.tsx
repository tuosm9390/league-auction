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
    <div className="pixel-box bg-white p-4 shrink-0 relative z-20">
      {/* Header Area (GM Panel Style) */}
      <div className="bg-black text-white px-3 py-1.5 mb-3 text-[8px] font-heading flex justify-between border-b-4 border-black uppercase">
        <span>LEADER CONTROL PANEL</span>
        <span className="text-minion-yellow">
          대기자: {waitingCount} / 낙찰자: {soldCount}
        </span>
      </div>

      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex flex-col">
          <span className="text-[7px] font-heading text-gray-600 uppercase tracking-tighter">
            잔여 포인트
          </span>
          <span className="text-2xl font-black text-black leading-none tabular-nums">
            {myTeam?.point_balance?.toLocaleString() ?? 0}P
          </span>
        </div>
        {currentPlayer && (
          <div className="flex flex-col items-end">
            <span className="text-[7px] font-heading text-gray-600 uppercase tracking-tighter text-right">
              입찰 최소 금액
            </span>
            <span className="text-xl font-black text-red-600 leading-none tabular-nums">
              {minBid.toLocaleString()}P
            </span>
          </div>
        )}
      </div>

      {bidError && (
        <div className="mb-3 bg-red-50 border-2 border-black text-red-600 text-[10px] py-2 px-3 font-bold text-center animate-pulse uppercase">
          {bidError}
        </div>
      )}

      <div className="flex gap-2 relative h-12">
        {!isAuctionActive && (
          <div className="absolute inset-0 bg-white/95 backdrop-blur-[2px] z-10 flex items-center justify-center border-2 border-black border-dashed">
            <p className="text-[10px] text-gray-500 font-bold flex items-center gap-2 uppercase">
              <span className="text-base animate-bounce">⏳</span>
              {!currentPlayer
                ? "다음 선수 준비중..."
                : !timerEndsAt
                  ? "경매 준비 완료"
                  : "경매 종료"}
            </p>
          </div>
        )}

        <button
          onClick={decrementBid}
          disabled={!canBid || numericBidAmount <= minBid}
          className="pixel-button bg-white text-black w-12 h-full text-xl"
        >
          -
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
            className="w-full h-full bg-yellow-50 border-4 border-black px-4 text-xl font-black text-center focus:outline-none tabular-nums"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-black text-sm pointer-events-none group-focus-within:text-minion-blue transition-colors">
            P
          </div>
        </div>

        <button
          onClick={incrementBid}
          disabled={!canBid}
          className="pixel-button bg-white text-black w-12 h-full text-xl"
        >
          +
        </button>

        <button
          onClick={handleBid}
          disabled={!canBid}
          className={`flex-[1.5] h-full pixel-button font-heading text-[10px] tracking-tighter ${
            isLeading
              ? "bg-minion-yellow text-black border-4 border-black"
              : "bg-minion-blue text-white"
          }`}
        >
          {isLeading
            ? "선두 유지 중! 👑"
            : isBidding
              ? "입찰중..."
              : isTeamFull
                ? "팀이 가득 차서 입찰할 수 없습니다"
                : "입찰하기 🔥"}
        </button>
      </div>

      {isTeamFull && (
        <p className="text-[8px] font-heading text-red-600 mt-3 text-center animate-pulse uppercase">
          팀이 가득 차서 입찰할 수 없습니다
        </p>
      )}
    </div>
  );
}
