"use client";

import { useAuctionBoard } from "@/features/auction/hooks/useAuctionBoard";
import { AuctionResultModal } from "./AuctionResultModal";
import { LotteryAnimation } from "./LotteryAnimation";
import { NoticeBanner } from "./board/NoticeBanner";
import { CenterTimer } from "./board/CenterTimer";
import { PlayerInAuction } from "./board/PlayerInAuction";
import { BidStatus } from "./board/BidStatus";
import { DraftPanel } from "./board/DraftPanel";
import { AuctionWaitingState } from "./board/AuctionWaitingState";
import { Player, Team } from "../store/useAuctionStore";

interface AuctionBoardProps {
  isLotteryActive: boolean;
  lotteryPlayer: Player | null;
  waitingPlayers: Player[];
  role: string | null;
  allConnected: boolean;
  onCloseLottery: () => void;
  // useAuctionBoard hook needs these from props, but hook also takes props.
  // We'll define the essential ones.
  roomId: string;
}

export function AuctionBoard(props: AuctionBoardProps) {
  const {
    teams,
    teamId,
    timerEndsAt,
    connectedLeaderIds,
    currentPlayer,
    latestNotice,
    highestBid,
    leadingTeam,
    unsoldPlayers,
    waitingPlayersList,
    isRoomComplete,
    isAuctionFinished,
    isAuctionStarted,
    isAuctionComplete,
    isAutoDraftMode,
    phase,
    currentTurnTeam,
    showResultModal,
    setShowResultModal,
    lotteryDone,
    setLotteryDone,
    handleDraft,
  } = useAuctionBoard(props as any);

  return (
    <div className="pixel-box bg-[#f8f8f8] flex-1 flex flex-col relative overflow-hidden min-h-[500px]">
      {latestNotice && <NoticeBanner msg={latestNotice} />}

      {!props.allConnected && isAuctionStarted && !isAuctionComplete && (
        <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="pixel-box bg-white p-8 border-red-600 flex flex-col items-center gap-4 text-center">
            <div className="text-4xl animate-bounce">🚫</div>
            <h2 className="text-xl font-heading text-red-600">CONNECTION LOST</h2>
            <p className="text-sm font-bold">팀장의 연결이 끊겨 경매가 일시정지되었습니다.</p>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col p-6 lg:p-10">
        <div className="flex-1 flex flex-col">
          {props.isLotteryActive && props.lotteryPlayer ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-10">
              <LotteryAnimation
                candidates={props.waitingPlayers}
                targetPlayer={props.lotteryPlayer}
                onFinished={() => setLotteryDone(true)}
              />
              {props.role === "ORGANIZER" && lotteryDone && (
                <button
                  onClick={props.onCloseLottery}
                  className="pixel-button bg-black text-white px-10 py-4 text-lg"
                >
                  경매 시작하기
                </button>
              )}
            </div>
          ) : currentPlayer ? (
            <div className="flex-1 flex flex-col gap-6">
              <div className="flex justify-center">
                {timerEndsAt && <CenterTimer timerEndsAt={timerEndsAt} />}
              </div>
              <PlayerInAuction player={currentPlayer} />
              <BidStatus highestBid={highestBid} leadingTeam={leadingTeam} teamId={teamId} />
            </div>
          ) : (isAuctionFinished || isAutoDraftMode) && !isRoomComplete ? (
            <DraftPanel
              phase={phase} isAutoDraftMode={isAutoDraftMode}
              currentTurnTeam={currentTurnTeam}
              playersList={isAutoDraftMode ? waitingPlayersList : unsoldPlayers}
              role={props.role} onDraft={handleDraft}
            />
          ) : isAuctionFinished ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
              <div className="text-6xl">🏆</div>
              <h1 className="text-2xl font-heading text-green-600">모든 경매가 종료되었습니다!</h1>
              <button onClick={() => setShowResultModal(true)} className="pixel-button bg-minion-blue text-white px-10 py-4 text-xl">
                팀 결과를 확인해주세요
              </button>
              <AuctionResultModal isOpen={showResultModal} onClose={() => setShowResultModal(false)} />
            </div>
          ) : (
            <AuctionWaitingState allConnected={props.allConnected} teams={teams} connectedLeaderIds={connectedLeaderIds} />
          )}
        </div>
      </div>
    </div>
  );
}
