"use client";

import { Player } from "@/features/auction/store/useAuctionStore";

interface OrganizerControlPanelProps {
  noticeText: string;
  setNoticeText: (val: string) => void;
  onSendNotice: () => void;
  waitingPlayersCount: number;
  soldPlayersCount: number;
  allDone: boolean;
  currentPlayer: Player | null;
  timerEndsAt: string | null;
  lotteryPlayer: Player | null;
  isDrawing: boolean;
  allConnected: boolean;
  onShowResult: () => void;
  onDraw: () => void;
  onStart: () => void;
}

export function OrganizerControlPanel({
  noticeText,
  setNoticeText,
  onSendNotice,
  waitingPlayersCount,
  soldPlayersCount,
  allDone,
  currentPlayer,
  timerEndsAt,
  lotteryPlayer,
  isDrawing,
  allConnected,
  onShowResult,
  onDraw,
  onStart,
}: OrganizerControlPanelProps) {
  return (
    <div className="pixel-box bg-white p-4 shrink-0 relative z-20">
      <div className="bg-black px-3 py-1.5 mb-3 text-[8px] font-heading flex justify-between border-b-4 border-black text-white uppercase">
        <span>GM CONTROL PANEL</span>
        <span className="text-minion-yellow">
          대기자: {waitingPlayersCount} / 낙찰자: {soldPlayersCount}
        </span>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={noticeText}
          onChange={(e) => setNoticeText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSendNotice()}
          placeholder="공지를 작성해주세요..."
          className="flex-1 border-4 border-black px-4 py-2 text-xs font-black focus:outline-none bg-yellow-50"
        />
        <button
          onClick={onSendNotice}
          className="pixel-button bg-black text-white px-6 text-xs"
        >
          선포
        </button>
      </div>
      {allDone ? (
        <button
          onClick={onShowResult}
          className="w-full pixel-button bg-green-500 text-white h-12 text-lg animate-bounce"
        >
          경매 결과 확인
        </button>
      ) : !currentPlayer ? (
        <button
          onClick={onDraw}
          disabled={isDrawing || waitingPlayersCount === 0 || !allConnected}
          className="w-full pixel-button bg-minion-blue text-white h-14 text-lg"
        >
          {isDrawing
            ? "추첨중..."
            : `다음 선수 추첨 (${waitingPlayersCount}명)`}
        </button>
      ) : !timerEndsAt && !lotteryPlayer ? (
        <button
          onClick={onStart}
          className="w-full pixel-button bg-lime-500 text-white h-14 text-xl"
        >
          경매 시작!
        </button>
      ) : (
        <div className="pixel-box bg-red-600 text-black py-4 font-heading text-center text-sm animate-pulse uppercase">
          선수 추첨중!
        </div>
      )}
    </div>
  );
}
