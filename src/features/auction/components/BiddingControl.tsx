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
    <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-6 lg:p-8 shrink-0">
      <div className="flex items-start justify-between mb-3 pb-3 border-0 pb-4">
        <h3 className="text-xs lg:text-sm font-semibold text-[#1D1D1F] tracking-tight font-bold flex items-center gap-1.5 mt-1">
          <span className="text-base lg:text-lg">🔨</span> 팀장 컨트롤 박스
        </h3>
        <div className="flex flex-col items-end gap-1.5">
          <span className="text-xs font-semibold text-gray-400 bg-[#F5F5F7] text-[#86868B] px-4 py-2 rounded-full border-0">
            대기자: {waitingCount}명 / 낙찰자: {soldCount}명
          </span>
          <div className="flex items-center gap-3 lg:gap-4 mt-0.5">
            <div className="flex flex-col items-end">
              <span className="text-[8px] lg:text-[9px] font-bold text-gray-400 uppercase tracking-tight">
                남은 포인트
              </span>
              <span className="text-xl lg:text-2xl font-bold text-[#1D1D1F] tabular-nums leading-none">
                {myTeam?.point_balance?.toLocaleString() ?? 0}P
              </span>
            </div>
            {currentPlayer && (
              <div className="flex flex-col items-end">
                <span className="text-[9px] lg:text-[10px] font-black text-gray-400 uppercase tracking-tighter">
                  최소 입찰가
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
          <div className="absolute inset-0 bg-white/95 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-lg border border-dashed border-gray-200">
            <p className="text-xs lg:text-sm text-gray-500 font-medium flex items-center gap-1.5 lg:gap-2">
              <span className="text-base lg:text-lg animate-bounce">?�️</span>
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
          className="bg-white hover:bg-gray-50 text-gray-700 w-10 lg:w-12 h-full rounded-2xl font-medium text-2xl border border-gray-200 transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-20 shadow-none"
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
            className="w-full h-full bg-white border border-gray-200 focus:border-minion-blue rounded-2xl bg-[#F5F5F7] px-2 sm:px-3 lg:px-4 text-lg sm:text-xl md:text-2xl lg:text-2xl font-bold text-center focus:outline-none focus:ring-1 focus:ring-minion-blue/20 transition-all disabled:opacity-50 tabular-nums"
          />
          <div className="absolute right-3 lg:right-4 top-1/2 -translate-y-1/2 text-gray-300 font-bold text-sm lg:text-base pointer-events-none group-focus-within:text-minion-blue transition-colors">
            P
          </div>
        </div>

        <button
          onClick={incrementBid}
          disabled={!canBid}
          className="bg-white hover:bg-gray-50 text-gray-700 w-10 lg:w-12 h-full rounded-2xl font-medium text-2xl border border-gray-200 transition-all hover:bg-gray-50 active:scale-95 disabled:opacity-20 shadow-none"
        >
          ＋
        </button>

        <button
          onClick={handleBid}
          disabled={!canBid}
          className={`flex-\[1.5\] h-full rounded-2xl font-bold text-base tracking-tight transition-all active:scale-95 disabled:opacity-30 shadow-none ${
            isLeading
              ? "bg-minion-yellow text-minion-blue border border-amber-300"
              : "bg-[#0071E3] hover:bg-[#0077ED] text-white"
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
        <p className="text-[10px] text-red-500 mt-3 text-center font-bold animate-pulse">
          ※ 현재 팀의 모든 자리가 가득 찼습니다.
        </p>
      )}
    </div>
  );
}
