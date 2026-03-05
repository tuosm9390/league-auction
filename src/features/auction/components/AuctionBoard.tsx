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
  실버: "text-gray-400",
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
  Silver: "text-gray-400",
  Bronze: "text-amber-700",
  Iron: "text-gray-500",
  Unranked: "text-black",
};

/** 한글 티어명을 영문 파일명으로 매핑 */
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

/** 한글/영문 포지션을 영문 파일명으로 매핑 */
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
  return "/main_position_fill.png"; // 무관, 상관없음
};

const NoticeBanner = memo(function NoticeBanner({ msg }: { msg: Message }) {
  return (
    <div className="bg-accent text-accent-foreground border-b border-border px-4 py-2 flex items-center gap-2 shrink-0">
      <span className="text-xl shrink-0">📢</span>
      <p className="text-[11px] font-bold text-foreground truncate">
        <span className="text-xl opacity-50 mr-1.5">공지:</span>
        <span className="text-xl">{msg.content}</span>
      </p>
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
    // timerEndsAt 변경(또는 최초 마운트) 시 항상 initialDuration 설정
    initialDuration.current = target - Date.now();
  }, [target]);
  const timeLeftMs = Math.max(0, target - now);
  const timeLeftSec = Math.max(0, (timeLeftMs - 100) / 1000);
  const displayTime = Math.ceil(timeLeftSec);
  const progress = initialDuration.current
    ? (timeLeftMs / initialDuration.current) * 100
    : 0;
  const pad = (n: number) => String(n).padStart(2, "0");
  const isUrgent = displayTime > 0 && displayTime <= 5;
  return (
    <div className="flex flex-col items-center">
      <div
        className={`relative flex items-center justify-center gap-1.5 lg:gap-2 rounded-lg px-3 py-1.5 sm:px-4 lg:px-6 lg:py-2.5 font-mono font-bold text-2xl sm:text-3xl lg:text-4xl transition-all duration-300 overflow-hidden ${isUrgent ? "bg-destructive text-destructive-foreground animate-shake shadow-md" : displayTime === 0 ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground shadow-sm"}`}
      >
        <span className="text-lg sm:text-xl lg:text-2xl">⏱</span>
        <span className="z-10 tracking-tighter">
          {isUrgent
            ? timeLeftSec.toFixed(1)
            : `${pad(Math.floor(displayTime / 60))}:${pad(displayTime % 60)}`}
        </span>
        {displayTime > 0 && (
          <div
            className={`absolute bottom-0 left-0 h-1.5 transition-all duration-100 ${isUrgent ? "bg-destructive-foreground/40" : "bg-primary-foreground/20"}`}
            style={{ width: `${progress}%` }}
          />
        )}
      </div>
    </div>
  );
}

export function AuctionBoard({
  isLotteryActive = false,
  lotteryPlayer,
  waitingPlayers = [],
  role,
  allConnected = true,
  onCloseLottery,
}: {
  isLotteryActive?: boolean;
  lotteryPlayer?: Player | null;
  waitingPlayers?: Player[];
  role?: Role;
  allConnected?: boolean;
  onCloseLottery?: () => void;
}) {
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
  } = useAuctionBoard({ isLotteryActive, lotteryPlayer, role, allConnected });

  return (
    <div className="bg-card text-card-foreground rounded-2xl shadow-lg border border-border flex-1 flex flex-col relative overflow-hidden animate-in zoom-in-95 duration-500 min-h-[460px]">
      {latestNotice && <NoticeBanner msg={latestNotice} />}
      {!allConnected && isAuctionStarted && !isAuctionComplete && (
        <div className="absolute inset-0 z-[50] flex flex-col items-center justify-center bg-black/70 backdrop-blur-md">
          <div className="bg-card p-6 rounded-xl shadow-lg border-2 border-destructive flex flex-col items-center gap-4 max-w-sm text-center">
            <div className="w-12 h-12 lg:w-14 lg:h-14 bg-destructive/20 rounded-full flex items-center justify-center text-2xl lg:text-3xl animate-pulse">
              ⚠️
            </div>
            <h2 className="text-xl font-bold text-destructive tracking-tight">
              팀장 접속 이탈
            </h2>
            <p className="text-sm text-muted-foreground font-medium leading-tight">
              경매가 일시정지되었습니다.
              <br />
              모든 팀장이 재입장하면 재개됩니다.
            </p>
          </div>
        </div>
      )}
      <div className="absolute top-0 right-0 w-60 h-60 bg-primary/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="z-10 flex flex-col flex-1 p-3 lg:p-4 gap-2 lg:gap-3 min-h-0">
        <div className="flex justify-center min-h-[32px]">
          {currentPlayer ? (
            timerEndsAt ? (
              <span className="bg-destructive text-destructive-foreground font-bold px-4 py-1.5 rounded-md text-xs shadow-sm border border-destructive/50 animate-bounce">
                🔥 경매 진행 중 🔥
              </span>
            ) : (
              <span className="bg-muted text-muted-foreground font-bold px-4 py-1.5 rounded-md text-xs border border-border animate-pulse uppercase tracking-wider">
                경매 준비중...
              </span>
            )
          ) : isLotteryActive ? (
            <span className="bg-primary text-primary-foreground font-bold px-4 py-1.5 rounded-md text-xs shadow-sm shadow-primary/20 animate-pulse">
              🎲 추첨 진행 중
            </span>
          ) : isAuctionFinished ? (
            <span className="bg-secondary text-secondary-foreground font-bold px-4 py-1.5 rounded-md text-xs shadow-sm border border-secondary/50">
              ✅ 경매 종료
            </span>
          ) : (
            <span className="bg-accent text-accent-foreground font-bold px-4 py-1.5 rounded-md text-xs shadow-sm border border-border">
              ⏱️ 추첨 대기
            </span>
          )}
        </div>
        <div className="flex-1 flex flex-col min-h-0">
          {isLotteryActive && lotteryPlayer ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-6">
              <LotteryAnimation
                candidates={waitingPlayers}
                targetPlayer={lotteryPlayer}
                onFinished={() => setLotteryDone(true)}
              />
              <div className="min-h-[70px] flex items-center justify-center">
                {role === "ORGANIZER" && lotteryDone && (
                  <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <button
                      onClick={onCloseLottery}
                      className="w-[180px] bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 rounded-md font-bold text-base shadow-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      경매 준비
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : currentPlayer ? (
            <div className="flex-1 flex flex-col gap-3 min-h-0">
              <div className="flex justify-center min-h-[48px]">
                {timerEndsAt && <CenterTimer timerEndsAt={timerEndsAt} />}
              </div>
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-1.5 lg:gap-2">
                <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground tracking-tight drop-shadow-sm leading-none">
                  {currentPlayer.name}
                </h2>
                <div className="flex gap-4 lg:gap-6 items-center justify-center my-2">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 relative flex items-center justify-center">
                      <Image
                        src={getTierImage(currentPlayer.tier)}
                        alt={currentPlayer.tier}
                        width={64}
                        height={64}
                        className="object-contain drop-shadow-md"
                      />
                    </div>
                    <div
                      className={`text-sm lg:text-lg font-bold bg-background px-3 py-1 lg:px-4 lg:py-1.5 rounded-md border shadow-sm ${TIER_COLOR[currentPlayer.tier] || "text-muted-foreground"}`}
                    >
                      {currentPlayer.tier}
                    </div>
                  </div>

                  <div className="text-border mx-2 text-2xl font-light border border-border h-20" />

                  <div className="flex flex-col items-center gap-1">
                    <div className="w-12 h-12 lg:w-16 lg:h-16 relative flex items-center justify-center">
                      <Image
                        src={getPositionImage(currentPlayer.main_position)}
                        alt={currentPlayer.main_position}
                        width={50}
                        height={50}
                        className="object-contain drop-shadow-md opacity-90"
                      />
                    </div>
                    <div className="text-sm lg:text-lg font-bold bg-background px-3 py-1 lg:px-4 lg:py-1.5 rounded-md border shadow-sm text-foreground">
                      {currentPlayer.main_position}
                    </div>
                  </div>
                </div>
                {currentPlayer.description && (
                  <p className="text-sm text-muted-foreground max-w-md font-bold italic">
                    "{currentPlayer.description}"
                  </p>
                )}
              </div>
              <div
                className={`rounded-lg lg:rounded-xl p-2.5 sm:p-3 lg:p-4 border transition-all ${highestBid > 0 ? "bg-primary/5 border-primary shadow-sm" : "bg-muted/30 border-border"}`}
              >
                {highestBid > 0 ? (
                  <div className="flex items-center justify-between px-1.5 lg:px-3">
                    <div>
                      <p className="text-[8px] sm:text-[9px] lg:text-[10px] text-muted-foreground font-bold mb-0.5 uppercase tracking-wider">
                        최고 입찰가
                      </p>
                      <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-primary tabular-nums">
                        {highestBid.toLocaleString()}
                        <span className="text-sm sm:text-base lg:text-lg ml-0.5">
                          P
                        </span>
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[8px] sm:text-[9px] lg:text-[10px] text-muted-foreground font-bold mb-0.5 uppercase tracking-wider">
                        최고 입찰팀
                      </p>
                      <p className="text-sm sm:text-base lg:text-lg font-bold text-foreground">
                        {leadingTeam?.name || "?"}
                      </p>
                      {leadingTeam?.id === teamId && (
                        <p className="text-xs font-black text-primary animate-pulse mt-1">
                          현재 최고 입찰 중입니다! 👑
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-base text-center text-muted-foreground py-1.5 font-bold italic tracking-tight">
                    입찰을 기다리고 있습니다...
                  </p>
                )}
              </div>
            </div>
          ) : (isAuctionFinished || isAutoDraftMode) && !isRoomComplete ? (
            <div className="flex-1 flex flex-col min-h-0">
              {(() => {
                const effectivePhase = isAutoDraftMode ? "DRAFT" : phase;
                const draftablePlayers = isAutoDraftMode
                  ? waitingPlayersList
                  : unsoldPlayers;
                return (
                  <>
                    <div className="text-center mb-4">
                      <span
                        className={`text-white font-bold px-6 py-2 rounded-lg text-sm border shadow-sm ${effectivePhase === "DRAFT" ? "bg-secondary text-secondary-foreground border-secondary" : "bg-destructive text-destructive-foreground border-destructive"}`}
                      >
                        {effectivePhase === "DRAFT"
                          ? "🤝 유찰 선수 배정 진행 중"
                          : "🔄 유찰 선수 재경매 진행 중"}
                      </span>
                      {effectivePhase === "DRAFT" && currentTurnTeam && (
                        <div className="mt-4 flex flex-col items-center">
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5">
                            배정 순서
                          </span>
                          <span className="text-xl lg:text-2xl font-bold text-primary bg-primary/10 px-4 py-1.5 lg:px-6 lg:py-1.5 rounded-lg border border-primary/20 shadow-sm">
                            {currentTurnTeam.name}{" "}
                            <span className="text-base lg:text-lg text-primary/70 ml-1.5">
                              ({currentTurnTeam.point_balance}P)
                            </span>
                          </span>
                        </div>
                      )}
                      {effectivePhase !== "DRAFT" && role === "ORGANIZER" && (
                        <div className="mt-6">
                          <button
                            onClick={handleRestartAuction}
                            disabled={isRestarting || !allConnected}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 px-8 py-3 rounded-md font-bold text-base shadow-sm ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          >
                            ▶ 재경매 시작하기
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar px-1.5 mt-1.5">
                      <div className="grid grid-cols-2 gap-2 p-0.5">
                        {draftablePlayers.map((p) => (
                          <div
                            key={p.id}
                            className="bg-card border border-border rounded-lg p-3 flex items-center justify-between hover:border-primary transition-colors shadow-sm"
                          >
                            <div className="min-w-0">
                              <p className="font-black text-base text-foreground truncate">
                                {p.name}
                              </p>
                              <p
                                className={`text-xs font-black ${TIER_COLOR[p.tier] || "text-muted-foreground"}`}
                              >
                                {p.tier}{" "}
                                <span className="text-border ml-1">|</span>{" "}
                                <span className="text-muted-foreground ml-1">
                                  {p.main_position}
                                </span>
                              </p>
                            </div>
                            {effectivePhase === "DRAFT" &&
                              role === "ORGANIZER" && (
                                <button
                                  onClick={() => handleDraft(p.id)}
                                  disabled={
                                    isProcessingAction !== null ||
                                    !currentTurnTeam
                                  }
                                  className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-4 py-2 rounded-md text-xs shadow-sm transition-colors"
                                >
                                  배정
                                </button>
                              )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          ) : isAuctionFinished ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 lg:w-20 lg:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-4 border-2 border-primary/20">
                <span className="text-3xl lg:text-4xl animate-bounce">🎉</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-primary mb-3 drop-shadow-sm">
                모든 경매 종료!
              </h1>
              <button
                onClick={() => setShowResultModal(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-6 py-3 lg:px-8 lg:py-3.5 rounded-md text-base lg:text-lg shadow-sm transition-all animate-pulse focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                📋 결과 최종 확인
              </button>
              <AuctionResultModal
                isOpen={showResultModal}
                onClose={() => setShowResultModal(false)}
              />
            </div>
          ) : (
            <div className="flex-1 flex flex-col min-h-0">
              {!allConnected ? (
                <>
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
                      <span className="w-2 h-7 bg-primary rounded-full shadow-sm"></span>
                      팀장 접속 현황
                    </h2>
                    <span className="text-xs font-bold px-3 py-1.5 rounded-md border bg-secondary text-secondary-foreground border-secondary/50 shadow-sm animate-pulse">
                      ⏳ 접속 대기 중 ({connectedLeaderIds.size}/{teams.length})
                    </span>
                  </div>
                  <div className="flex flex-row overflow-x-auto custom-scrollbar gap-3 p-1.5 min-h-0 w-full">
                    {teams.map((team) => {
                      const connected = connectedLeaderIds.has(team.id);
                      return (
                        <div
                          key={team.id}
                          className={`flex-1 min-w-[110px] rounded-xl border-2 p-3 lg:p-4 flex flex-col items-center justify-center text-center gap-2 transition-all duration-500 ${connected ? "border-primary bg-primary/5 shadow-sm scale-[1.01]" : "border-border bg-muted/50 grayscale opacity-60"}`}
                        >
                          <div
                            className={`w-12 h-12 rounded-full flex shrink-0 items-center justify-center text-2xl mb-1 ${connected ? "bg-primary/20" : "bg-muted"}`}
                          >
                            {connected ? "✅" : "⏳"}
                          </div>
                          <div className="w-full min-w-0 flex flex-col items-center">
                            <p className="font-bold text-foreground text-sm w-full truncate mb-0.5">
                              {team.name}
                            </p>
                            <p
                              className={`font-black text-[10px] sm:text-[11px] uppercase tracking-widest ${connected ? "text-primary" : "text-muted-foreground"}`}
                            >
                              {connected ? "Online" : "Offline"}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-700">
                  <div className="w-16 h-16 lg:w-20 lg:h-20 bg-primary/10 rounded-full flex items-center justify-center mb-3 lg:mb-4 border-2 border-dashed border-primary animate-[spin_15s_linear_infinite]">
                    <span className="text-3xl lg:text-4xl animate-bounce">
                      🎰
                    </span>
                  </div>
                  <h3 className="text-2xl font-bold text-foreground mb-2 tracking-tight">
                    모든 준비가 완료되었습니다!
                  </h3>
                  <p className="text-sm text-muted-foreground font-medium max-w-md leading-relaxed">
                    현재{" "}
                    <span className="text-primary-foreground bg-primary px-2 py-0.5 rounded-md shadow-sm">
                      추첨 대기 중
                    </span>
                    입니다.
                    <br />
                    주최자가 선수를 추첨하면 경매가 시작됩니다.
                  </p>
                  <div className="mt-5 flex gap-2">
                    {[0, 0.2, 0.4].map((d) => (
                      <div
                        key={d}
                        className="w-2 h-2 bg-primary rounded-full animate-bounce"
                        style={{ animationDelay: `${d}s` }}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
