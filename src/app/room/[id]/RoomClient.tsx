"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  useAuctionStore,
  Role,
  PresenceUser,
} from "@/features/auction/store/useAuctionStore";
import { useAuctionRealtime } from "@/features/auction/hooks/useAuctionRealtime";
import { useRoomAuth } from "@/features/auction/hooks/useRoomAuth";
import { useAuctionControl } from "@/features/auction/hooks/useAuctionControl";
import {
  startAuction,
  deleteRoom,
  drawNextPlayer,
  saveAuctionArchive,
  pauseAuction,
  sendNotice,
} from "@/features/auction/api/auctionActions";
import { AuctionBoard } from "@/features/auction/components/AuctionBoard";
import { TeamList, UnsoldPanel } from "@/features/auction/components/TeamList";
import { ChatPanel } from "@/features/auction/components/ChatPanel";
import { BiddingControl } from "@/features/auction/components/BiddingControl";
import { LinksModal } from "@/features/auction/components/LinksModal";
import { HowToUseModal } from "@/features/auction/components/HowToUseModal";
import { EndRoomModal } from "@/features/auction/components/EndRoomModal";
import { AuctionResultModal } from "@/features/auction/components/AuctionResultModal";
import { LeaveRoomModal } from "@/features/auction/components/LeaveRoomModal";
import { ThemeToggle } from "@/components/ThemeToggle";

function ElapsedTimer({ createdAt }: { createdAt: string }) {
  const [elapsed, setElapsed] = useState("");
  useEffect(() => {
    const start = new Date(createdAt).getTime();
    const iv = setInterval(() => {
      const sec = Math.floor((Date.now() - start) / 1000);
      const h = Math.floor(sec / 3600);
      const m = Math.floor((sec % 3600) / 60);
      const s = sec % 60;
      setElapsed(
        `${h > 0 ? `${h}:` : ""}${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`,
      );
    }, 1000);
    return () => clearInterval(iv);
  }, [createdAt]);
  return (
    <div className="text-[10px] font-mono font-semibold text-primary-foreground/80 bg-primary/20 px-3 py-1 rounded-md border border-primary-foreground/20 tracking-widest">
      경과 시간 <b className="text-minion-yellow/70 text-xs">{elapsed}</b>
    </div>
  );
}

interface RoomClientProps {
  roomId: string;
  roleParam: Role | null;
  teamIdParam: string | null;
}

export function RoomClient({
  roomId,
  roleParam,
  teamIdParam,
}: RoomClientProps) {
  const { fetchAll } = useAuctionRealtime(roomId);
  const players = useAuctionStore((s) => s.players);
  const teams = useAuctionStore((s) => s.teams);
  const roomName = useAuctionStore((s) => s.roomName);
  const createdAt = useAuctionStore((s) => s.createdAt);
  const roomExists = useAuctionStore((s) => s.roomExists);
  const isRoomLoaded = useAuctionStore((s) => s.isRoomLoaded);
  const timerEndsAt = useAuctionStore((s) => s.timerEndsAt);
  const membersPerTeam = useAuctionStore((s) => s.membersPerTeam);
  const presences = useAuctionStore((s) => s.presences);
  const storeTeamId = useAuctionStore((s) => s.teamId);
  const isReAuctionRound = useAuctionStore((s) => s.isReAuctionRound);
  const setRoomContext = useAuctionStore((s) => s.setRoomContext);
  const setRealtimeData = useAuctionStore((s) => s.setRealtimeData);
  const { effectiveRole } = useRoomAuth({
    role: roleParam,
    teamId: teamIdParam || undefined,
    roomId,
    setRoomContext,
  });
  const connectedLeaderIds = new Set(
    presences
      .filter((p: PresenceUser) => p.role === "LEADER")
      .map((p: PresenceUser) => p.teamId),
  );
  const allConnected =
    teams.length > 0 && connectedLeaderIds.size >= teams.length;
  const currentPlayer = players.find((p) => p.status === "IN_AUCTION");
  const waitingPlayers = players.filter((p) => p.status === "WAITING");
  const soldPlayers = players.filter((p) => p.status === "SOLD");
  const unsoldPlayers = players.filter((p) => p.status === "UNSOLD");
  const biddableTeams = teams.filter(
    (t) =>
      players.filter((p) => p.team_id === t.id && p.status === "SOLD").length <
        membersPerTeam - 1 && t.point_balance >= 10,
  );
  const isAutoDraftMode =
    !currentPlayer &&
    waitingPlayers.length > 0 &&
    unsoldPlayers.length === 0 &&
    biddableTeams.length <= 1;
  const bids = useAuctionStore((s) => s.bids);
  const playerBids = bids.filter((b) => b.player_id === currentPlayer?.id);
  const highestBid =
    playerBids.length > 0 ? Math.max(...playerBids.map((b) => b.amount)) : 0;
  const minBid = highestBid > 0 ? highestBid + 10 : 10;
  const [isExpired, setIsExpired] = useState(false);
  useEffect(() => {
    if (!timerEndsAt) {
      setIsExpired(false);
      return;
    }
    const remain = new Date(timerEndsAt).getTime() - Date.now();
    if (remain <= 0) {
      setIsExpired(true);
      return;
    }
    setIsExpired(false);
    const t = setTimeout(() => setIsExpired(true), remain);
    return () => clearTimeout(t);
  }, [timerEndsAt]);
  const isAuctionActive = !!timerEndsAt && !isExpired;
  // storeTeamId: useRoomAuth를 통해 쿠키에서 검증된 teamId (route.ts 토큰 검증 완료)
  const myTeam = teams.find((t) => t.id === storeTeamId);
  let isTeamFull = false;
  if (myTeam)
    isTeamFull =
      players.filter((p) => p.team_id === myTeam.id && p.status === "SOLD")
        .length >=
      membersPerTeam - 1;
  const lotteryPlayer = useAuctionStore((s) => s.lotteryPlayer);
  const { handleCloseLottery } = useAuctionControl({
    roomId,
    effectiveRole: effectiveRole ?? "VIEWER",
    players,
    timerEndsAt,
    fetchAll,
  });

  // Pause/resume auction on team leader disconnect/reconnect (ORGANIZER only)
  const prevAllConnectedRef = useRef<boolean | null>(null);
  const wasPausedByDisconnectRef = useRef(false);
  const timerEndsAtRef = useRef(timerEndsAt);
  const currentPlayerRef = useRef(currentPlayer);
  timerEndsAtRef.current = timerEndsAt;
  currentPlayerRef.current = currentPlayer;
  useEffect(() => {
    if (!roomId || effectiveRole !== "ORGANIZER") return;
    const prev = prevAllConnectedRef.current;
    prevAllConnectedRef.current = allConnected;
    if (prev === null) return;
    if (!allConnected && prev === true) {
      if (timerEndsAtRef.current) {
        wasPausedByDisconnectRef.current = true;
        pauseAuction(roomId);
      }
    }
    // allConnected 복귀 시 자동 재개하지 않음 — 방장이 수동으로 "▶ 경매 시작" 버튼을 눌러야 재개
  }, [allConnected, roomId, effectiveRole]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const router = useRouter();
  const [isEndRoomOpen, setIsEndRoomOpen] = useState(false);
  const [isLeaveRoomOpen, setIsLeaveRoomOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [noticeText, setNoticeText] = useState("");
  const [isSendingNotice, setIsSendingNotice] = useState(false);
  const handleNotice = async () => {
    if (!noticeText.trim() || !roomId || isSendingNotice) return;
    setIsSendingNotice(true);
    try {
      const res = await sendNotice(roomId, noticeText.trim());
      if (!res.error) setNoticeText("");
    } finally {
      setIsSendingNotice(false);
    }
  };
  const handleDraw = async () => {
    setIsDrawing(true);
    try {
      const res = await drawNextPlayer(roomId);
      if (res.error) alert(res.error);
    } finally {
      setIsDrawing(false);
    }
  };
  const handleStart = async () => {
    setIsStarting(true);
    try {
      const duration =
        isReAuctionRound || wasPausedByDisconnectRef.current ? 5000 : 10000;
      wasPausedByDisconnectRef.current = false;
      const res = await startAuction(roomId, duration);
      if (res.error) {
        alert(res.error);
      } else if (res.timerEndsAt) {
        // 실시간 이벤트 대기 없이 즉시 타이머 반영 (Optimistic Update)
        setRealtimeData({ timerEndsAt: res.timerEndsAt });
      }
    } finally {
      setIsStarting(false);
    }
  };
  const isRoomComplete =
    teams.length > 0 &&
    teams.every(
      (t) =>
        players.filter((p) => p.team_id === t.id && p.status === "SOLD")
          .length ===
        membersPerTeam - 1,
    );
  const allDone =
    waitingPlayers.length === 0 &&
    !currentPlayer &&
    soldPlayers.length > 0 &&
    isRoomComplete;
  const handleEndRoom = async (saveResult: boolean) => {
    if (!roomId) return;
    setIsDeleting(true);
    try {
      if (saveResult && allDone) {
        await saveAuctionArchive({
          roomId,
          roomName: roomName ?? "경매방",
          roomCreatedAt: createdAt ?? new Date().toISOString(),
          teams: teams.map((t) => ({
            id: t.id,
            name: t.name,
            leader_name: t.leader_name,
            point_balance: t.point_balance,
            players: players
              .filter((p) => p.team_id === t.id)
              .map((p) => ({ name: p.name, sold_price: p.sold_price })),
          })),
        });
      }
      const result = await deleteRoom(roomId);
      if (!result.error) router.push("/");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isRoomLoaded)
    return (
      <div className="h-screen bg-background flex items-center justify-center font-bold text-foreground text-lg animate-pulse tracking-tighter uppercase">
        데이터 로딩 중...
      </div>
    );
  if (!roomExists)
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4 border border-destructive/20">
          <span className="text-3xl">🚫</span>
        </div>
        <h2 className="text-xl font-bold text-foreground mb-4">
          경매가 종료된 방이거나, 유효하지 않은 접근입니다.
        </h2>
        <button
          onClick={() => router.push("/")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 py-2.5 rounded-md shadow-sm text-sm uppercase transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    );

  if (effectiveRole === null)
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mb-4 border border-destructive/20">
          <span className="text-3xl">🚫</span>
        </div>
        <h2 className="text-xl font-bold text-destructive mb-2">
          유효하지 않은 접근
        </h2>
        <p className="text-sm text-muted-foreground font-medium mb-6 max-w-sm leading-relaxed">
          유효한 인증 정보가 없습니다.
          <br />
          초대 링크를 통해 다시 접속해 주세요.
        </p>
        <button
          onClick={() => router.push("/")}
          className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold px-8 py-2.5 rounded-md shadow-sm text-sm uppercase transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    );

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background font-pretendard">
      <header className="h-16 shrink-0 bg-card text-card-foreground shadow-sm relative z-[110] border-b border-border">
        <div className="max-w-7xl mx-auto px-6 w-full h-full flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <h1 className="text-base md:text-xl font-bold text-foreground tracking-tight drop-shadow-sm">
                MINIONS
              </h1>
              <Image
                src="/favicon.png"
                alt="Minions Icon"
                width={28}
                height={28}
                className="drop-shadow-sm"
              />
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 bg-secondary text-secondary-foreground px-3.5 py-1.5 rounded-md text-xs font-bold border border-border shadow-sm">
                {effectiveRole === "ORGANIZER" ? (
                  <>
                    <span className="text-sm">👑</span> 주최자
                  </>
                ) : effectiveRole === "LEADER" ? (
                  <>
                    <span className="text-sm">🛡️</span> 팀장
                  </>
                ) : (
                  <>
                    <span className="text-sm">👀</span> 관전자
                  </>
                )}
              </div>
              <div className="h-5 w-px bg-border mx-1.5" />
              <div className="flex gap-2">
                {effectiveRole === "ORGANIZER" && <LinksModal />}
                <HowToUseModal variant="header" />
                {soldPlayers.length > 0 && (
                  <button
                    onClick={() => setShowResultModal(true)}
                    className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border px-4 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
                  >
                    <span className="text-sm">📋</span> 결과
                  </button>
                )}
                {effectiveRole === "ORGANIZER" && (
                  <button
                    onClick={() => setIsEndRoomOpen(true)}
                    className="bg-destructive hover:bg-destructive/90 text-destructive-foreground px-4 py-1.5 rounded-md text-xs font-bold shadow-sm flex items-center gap-1.5 transition-colors"
                  >
                    <span className="text-sm">🚪</span> 종료
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {createdAt && <ElapsedTimer createdAt={createdAt} />}
            <button
              onClick={() => setIsLeaveRoomOpen(true)}
              className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border px-3.5 py-1.5 rounded-md text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5"
              title="메인 홈으로 이동"
            >
              <span className="text-sm">🏠</span> 나가기
            </button>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-3 lg:gap-4 p-2 sm:p-3 lg:px-6 overflow-y-auto lg:overflow-hidden min-h-0 max-h-[950px] w-full max-w-7xl mx-auto py-3">
        <aside className="lg:col-span-3 flex flex-col min-h-0 order-3 lg:order-1 h-[300px] sm:h-[400px] lg:h-auto lg:self-stretch shrink-0">
          <div className="bg-card rounded-xl shadow-sm border border-border flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="px-3 py-2.5 border-b border-border bg-muted/50 shrink-0">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-1.5 uppercase tracking-tight">
                👥 팀 현황
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 pr-2 mr-0.5 min-h-0 bg-card">
              <TeamList />
            </div>
          </div>
        </aside>

        <section className="lg:col-span-6 flex flex-col gap-2 min-h-0 order-1 lg:order-2 lg:h-full shrink-0">
          {roomName && (
            <div className="shrink-0 bg-primary/5 rounded-xl shadow-sm px-5 py-3 flex items-center gap-3 border border-border relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-transparent to-primary/5 pointer-events-none" />
              <span className="text-3xl shrink-0 drop-shadow">🏆</span>
              <h2
                className="text-2xl font-bold truncate tracking-[0.15em] uppercase relative text-foreground"
                style={{
                  fontFamily: "var(--font-cinzel, 'Georgia', serif)",
                }}
              >
                {roomName}
              </h2>
            </div>
          )}
          <AuctionBoard
            isLotteryActive={!!lotteryPlayer}
            lotteryPlayer={lotteryPlayer}
            waitingPlayers={waitingPlayers}
            role={effectiveRole}
            allConnected={allConnected}
            onCloseLottery={handleCloseLottery}
          />
          {effectiveRole === "ORGANIZER" && (
            <div className="bg-card rounded-xl shadow-sm border border-border p-3 lg:p-5 shrink-0">
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
                  🎛️ 주최자 컨트롤 박스
                </h3>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-semibold text-muted-foreground bg-muted px-3 py-1 rounded-md border border-border">
                    대기자: {waitingPlayers.length}명 / 낙찰자:{" "}
                    {soldPlayers.length}명
                  </span>
                </div>
              </div>
              <div className="flex gap-2 mb-3 pb-3 border-b border-border">
                <input
                  type="text"
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNotice()}
                  placeholder="공지 내용 입력..."
                  className="flex-1 border border-input bg-background rounded-md px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
                  disabled={isSendingNotice}
                />
                <button
                  onClick={handleNotice}
                  disabled={!noticeText.trim() || isSendingNotice}
                  className="bg-minion-yellow/60 text-secondary-foreground border border-border hover:bg-minion-yellow/80 px-5 py-2.5 rounded-md text-sm font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  선포
                </button>
              </div>
              {allDone ? (
                <div className="text-center py-4 bg-muted rounded-md border border-border">
                  <p className="font-bold text-foreground text-lg tracking-tight">
                    🏆 경매 완료!
                  </p>
                </div>
              ) : !currentPlayer ? (
                isAutoDraftMode ? (
                  <div className="bg-secondary border border-border text-secondary-foreground py-4 rounded-md font-bold text-center text-base animate-pulse shadow-sm">
                    ⚡ 자동 드래프트 진행 중
                  </div>
                ) : (
                  <button
                    onClick={handleDraw}
                    disabled={
                      isDrawing || waitingPlayers.length === 0 || !allConnected
                    }
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 lg:h-14 rounded-md font-bold text-sm md:text-base lg:text-lg shadow-sm transition-colors disabled:opacity-50"
                  >
                    🎲 다음 선수 추첨 (남은 인원 : {waitingPlayers.length}명)
                  </button>
                )
              ) : !timerEndsAt && !lotteryPlayer ? (
                <button
                  onClick={handleStart}
                  disabled={isStarting || !allConnected}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 lg:h-14 rounded-md font-bold text-lg lg:text-xl shadow-sm transition-colors disabled:opacity-50"
                >
                  ▶ 경매 시작
                </button>
              ) : !timerEndsAt ? (
                <div className="bg-accent border border-border text-accent-foreground py-4 rounded-md font-bold text-center text-lg animate-pulse uppercase tracking-wider">
                  🎰 추첨 진행 중
                </div>
              ) : (
                <div className="bg-destructive/10 border border-destructive/30 text-destructive py-4 rounded-md font-bold text-center text-lg animate-pulse uppercase tracking-wider">
                  🔥 경매 진행 중 🔥
                </div>
              )}
            </div>
          )}
          {effectiveRole === "LEADER" && roomId && storeTeamId && (
            <BiddingControl
              roomId={roomId}
              teamId={storeTeamId}
              currentPlayer={currentPlayer || null}
              myTeam={myTeam || null}
              isAuctionActive={isAuctionActive}
              timerEndsAt={timerEndsAt}
              minBid={minBid}
              isTeamFull={isTeamFull}
            />
          )}
        </section>

        <aside className="lg:col-span-3 flex flex-col gap-2 lg:gap-3 min-h-0 order-2 lg:order-3 h-[400px] sm:h-[500px] lg:h-auto lg:self-stretch shrink-0">
          <div className="bg-card rounded-xl shadow-sm border border-border flex-none max-h-[140px] flex flex-col overflow-hidden min-h-0 relative">
            <div className="px-3 py-2 border-b border-border bg-muted/50 shrink-0">
              <h2 className="text-xs font-semibold text-destructive flex items-center gap-1.5 uppercase px-0.5">
                👻 유찰 대기석
              </h2>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 pr-2 mr-0.5 min-h-0">
              <UnsoldPanel />
            </div>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col min-h-0 bg-card rounded-xl shadow-sm border border-border relative">
            <div className="flex-1 flex flex-col min-h-0 mr-0.5 overflow-hidden">
              <ChatPanel />
            </div>
          </div>
        </aside>
      </main>

      <LeaveRoomModal
        isOpen={isLeaveRoomOpen}
        onClose={() => setIsLeaveRoomOpen(false)}
        onConfirm={() => router.push("/")}
      />
      <EndRoomModal
        isOpen={isEndRoomOpen}
        isCompleted={allDone}
        isDeleting={isDeleting}
        onClose={() => setIsEndRoomOpen(false)}
        onConfirm={handleEndRoom}
      />
      <AuctionResultModal
        isOpen={showResultModal}
        onClose={() => setShowResultModal(false)}
      />
    </div>
  );
}
