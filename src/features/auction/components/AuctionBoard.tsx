"use client";

import Image from "next/image";
import { useState, useEffect, useRef, memo } from "react";
import {
  type Message,
  type Player,
  type Role,
} from "@/features/auction/store/useAuctionStore";
import { useAuctionBoard } from "@/features/auction/hooks/useAuctionBoard";
import { AuctionResultModal } from "./AuctionResultModal";
import { LotteryAnimation } from "./LotteryAnimation";

const TIER_COLOR: Record<string, string> = {
  챌린저: "text-cyan-500",
  그랜드마스터: "text-red-500",
  마스터: "text-purple-500",
  다이아: "text-blue-400",
  에메랄드: "text-emerald-500",
  플래티넘: "text-teal-400",
  골드: "text-yellow-500",
  실버: "text-gray-600",
  브론즈: "text-amber-700",
  아이언: "text-gray-500",
  언랭: "text-black",
  Challenger: "text-cyan-500",
  Grandmaster: "text-red-500",
  Master: "text-purple-500",
  Diamond: "text-blue-400",
  Emerald: "text-emerald-500",
  Platinum: "text-teal-400",
  Gold: "text-yellow-500",
  Silver: "text-gray-600",
  Bronze: "text-amber-700",
  Iron: "text-gray-500",
  Unranked: "text-black",
};

export const getTierImage = (tier: string) => {
  const map: Record<string, string> = {
    챌린저: "Challenger",
    그랜드마스터: "Grandmaster",
    마스터: "Master",
    다이아: "Diamond",
    에메랄드: "Emerald",
    플래티넘: "Platinum",
    골드: "Gold",
    실버: "Silver",
    브론즈: "Bronze",
    아이언: "Iron",
    언랭: "Iron",
  };
  const englishTier = map[tier] || tier;
  return `/Rank=${englishTier}.png`;
};

export const getPositionImage = (pos: string) => {
  const normalized = pos.trim().toLowerCase();
  if (normalized.includes("탑") || normalized.includes("top"))
    return "/main_position_top.svg";
  if (
    normalized.includes("정글") ||
    normalized.includes("jg") ||
    normalized.includes("jungle")
  )
    return "/main_position_jg.svg";
  if (normalized.includes("미드") || normalized.includes("mid"))
    return "/main_position_mid.svg";
  if (
    normalized.includes("원딜") ||
    normalized.includes("bot") ||
    normalized.includes("ad") ||
    normalized.includes("adc")
  )
    return "/main_position_bot.webp";
  if (
    normalized.includes("서폿") ||
    normalized.includes("서포터") ||
    normalized.includes("sup")
  )
    return "/main_position_sup.svg";
  return "/main_position_top.svg"; // 예비용
};

const NoticeBanner = memo(function NoticeBanner({ msg }: { msg: Message }) {
  return (
    <div className="bg-black border-b-4 border-minion-yellow px-5 py-2 flex items-center gap-3 shrink-0">
      <span className="text-minion-yellow animate-pulse text-lg">[SYSTEM]</span>
      <p className="text-sm font-bold text-white truncate">{msg.content}</p>
    </div>
  );
});

export function CenterTimer({ timerEndsAt }: { timerEndsAt: string }) {
  const [now, setNow] = useState(Date.now());
  const initialDuration = useRef<number | null>(null);
  useEffect(() => {
    const iv = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(iv);
  }, []);
  const target = new Date(timerEndsAt).getTime();
  useEffect(() => {
    initialDuration.current = target - Date.now();
  }, [target]);
  const timeLeftMs = Math.max(0, target - now);
  const timeLeftSec = Math.max(0, (timeLeftMs - 100) / 1000);
  const displayTime = Math.ceil(timeLeftSec);
  const progress = initialDuration.current
    ? (timeLeftMs / initialDuration.current) * 100
    : 0;
  const isUrgent = displayTime > 0 && displayTime <= 5;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="w-full flex flex-col items-center gap-2">
      <div
        className={`pixel-box px-6 py-2 flex items-center gap-3 ${isUrgent ? "bg-white !border-red-600 text-red-600 animate-shake" : "bg-black border-black text-minion-yellow"}`}
      >
        <span className="text-xl">⏳</span>
        <span className="text-3xl lg:text-4xl font-black tracking-widest">
          {isUrgent
            ? timeLeftSec.toFixed(1)
            : `${pad(Math.floor(displayTime / 60))}:${pad(displayTime % 60)}`}
        </span>
      </div>
      <div className="w-48 h-4 bg-gray-800 border-2 border-black overflow-hidden">
        <div
          className={`h-full transition-all duration-100 ${isUrgent ? "bg-red-500" : "bg-minion-yellow"}`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

export function AuctionBoard(props: any) {
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
    isProcessingAction,
    isRestarting,
    lotteryDone,
    setLotteryDone,
    handleDraft,
    handleRestartAuction,
  } = useAuctionBoard(props);

  return (
    <div className="pixel-box bg-[#f8f8f8] flex-1 flex flex-col relative overflow-hidden min-h-[500px]">
      {latestNotice && <NoticeBanner msg={latestNotice} />}

      {!props.allConnected && isAuctionStarted && !isAuctionComplete && (
        <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="pixel-box bg-white p-8 border-red-600 flex flex-col items-center gap-4 text-center">
            <div className="text-4xl animate-bounce">🚫</div>
            <h2 className="text-xl font-heading text-red-600">
              CONNECTION LOST
            </h2>
            <p className="text-sm font-bold">
              팀장의 연결이 끊겨 경매가 일시정지되었습니다.
            </p>
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

              <div className="flex-1 flex flex-col items-center justify-center bg-white border-4 border-black p-6 shadow-inner">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <h2 className="text-3xl lg:text-4xl font-heading tracking-tighter mb-2">
                      {currentPlayer.name}
                    </h2>
                  </div>

                  <div className="flex gap-10 items-center justify-center border-y-4 border-black border-double py-4 w-full">
                    <div className="flex flex-col items-center gap-2">
                      <Image
                        src={getTierImage(currentPlayer.tier)}
                        alt="Tier"
                        width={60}
                        height={60}
                        className="pixelated"
                      />
                      <span
                        className={`text-lg font-black uppercase ${TIER_COLOR[currentPlayer.tier]}`}
                      >
                        {currentPlayer.tier}
                      </span>
                    </div>
                    <div className="w-1 h-12 bg-black" />
                    <div className="flex flex-col items-center gap-2 text-gray-700">
                      <Image
                        src={getPositionImage(currentPlayer.main_position)}
                        alt="Pos"
                        width={50}
                        height={50}
                        className="pixelated"
                      />
                      <span className="text-lg font-black uppercase">
                        {currentPlayer.main_position}
                      </span>
                    </div>
                  </div>
                  {currentPlayer.description && (
                    <p className="mt-4 text-sm font-bold text-gray-600 italic">
                      "{currentPlayer.description}"
                    </p>
                  )}
                </div>
              </div>

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
                      {leadingTeam?.id === teamId && (
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
            </div>
          ) : (isAuctionFinished || isAutoDraftMode) && !isRoomComplete ? (
            <div className="flex-1 flex flex-col">
              <div className="text-center mb-6">
                <div className="pixel-box bg-black text-black inline-block px-6 py-2 font-bold mb-4">
                  {phase === "DRAFT" || isAutoDraftMode
                    ? "유찰 선수 배정"
                    : "재경매 진행"}
                </div>
                {phase === "DRAFT" && currentTurnTeam && (
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-gray-600">
                      CURRENT TURN
                    </span>
                    <div className="pixel-box bg-purple-100 px-6 py-2 font-black text-purple-700">
                      {currentTurnTeam.name} ({currentTurnTeam.point_balance}P)
                    </div>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 overflow-y-auto max-h-[300px] p-2">
                {(isAutoDraftMode ? waitingPlayersList : unsoldPlayers).map(
                  (p: any) => (
                    <div
                      key={p.id}
                      className="pixel-box bg-white p-3 flex justify-between items-center"
                    >
                      <div>
                        <p className="font-black">{p.name}</p>
                        <p
                          className={`text-[10px] font-bold ${TIER_COLOR[p.tier]}`}
                        >
                          {p.tier} | {p.main_position}
                        </p>
                      </div>
                      {phase === "DRAFT" && props.role === "ORGANIZER" && (
                        <button
                          onClick={() => handleDraft(p.id)}
                          className="pixel-button bg-purple-600 text-white px-3 py-1 text-[10px]"
                        >
                          배정
                        </button>
                      )}
                    </div>
                  ),
                )}
              </div>
            </div>
          ) : isAuctionFinished ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
              <div className="text-6xl">🏆</div>
              <h1 className="text-2xl font-heading text-green-600">
                모든 경매가 종료되었습니다!
              </h1>
              <button
                onClick={() => setShowResultModal(true)}
                className="pixel-button bg-minion-blue text-white px-10 py-4 text-xl"
              >
                팀 결과를 확인해주세요
              </button>
              <AuctionResultModal
                isOpen={showResultModal}
                onClose={() => setShowResultModal(false)}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center gap-6">
              {!props.allConnected ? (
                <div className="w-full space-y-6">
                  <h2 className="text-xl font-black text-minion-blue">
                    TEAM LEADERS CONNECTING...
                  </h2>
                  <div className="flex flex-wrap justify-center gap-4">
                    {teams.map((team: any) => (
                      <div
                        key={team.id}
                        className={`pixel-box p-4 min-w-[120px] ${connectedLeaderIds.has(team.id) ? "bg-green-50" : "bg-gray-100 grayscale opacity-50"}`}
                      >
                        <div className="text-2xl mb-2">
                          {connectedLeaderIds.has(team.id) ? "✅" : "💤"}
                        </div>
                        <p className="font-bold text-xs truncate">
                          {team.name}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="animate-in zoom-in-95 duration-700 space-y-6">
                  <div className="text-6xl animate-bounce">⏳</div>
                  <h3 className="text-2xl font-black text-minion-blue">
                    ARE YOU READY?
                  </h3>
                  <p className="font-bold text-gray-500">
                    방장이 추첨을 시작하면 경매가 개시됩니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
