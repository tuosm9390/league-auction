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
    <div className="pixel-box bg-black px-4 py-1 text-[12px] text-minion-yellow flex gap-2 items-center font-heading">
      <span className="animate-pulse">●</span> PLAY TIME{" "}
      <b className="text-black">{elapsed}</b>
    </div>
  );
}

export function RoomClient({ roomId, roleParam, teamIdParam }: any) {
  const { fetchAll } = useAuctionRealtime(roomId);
  const players = useAuctionStore((s) => s.players);
  const teams = useAuctionStore((s) => s.teams);
  const roomName = useAuctionStore((s) => s.roomName);
  const createdAt = useAuctionStore((s) => s.createdAt);
  const roomExists = useAuctionStore((s) => s.roomExists);
  const isRoomLoaded = useAuctionStore((s) => s.isRoomLoaded);
  const [isLeaveRoomOpen, setIsLeaveRoomOpen] = useState(false);
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
    presences.filter((p: any) => p.role === "LEADER").map((p: any) => p.teamId),
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
    const update = () => {
      const remain = new Date(timerEndsAt).getTime() - Date.now();
      setIsExpired(remain <= 0);
    };
    update();
    const t = setInterval(update, 100);
    return () => clearInterval(t);
  }, [timerEndsAt]);

  const isAuctionActive = !!timerEndsAt && !isExpired;
  const myTeam = teams.find((t) => t.id === storeTeamId);
  const isTeamFull = myTeam
    ? players.filter((p) => p.team_id === myTeam.id && p.status === "SOLD")
        .length >=
      membersPerTeam - 1
    : false;
  const lotteryPlayer = useAuctionStore((s) => s.lotteryPlayer);

  const { handleCloseLottery } = useAuctionControl({
    roomId,
    effectiveRole: effectiveRole ?? "VIEWER",
    players,
    timerEndsAt,
    fetchAll,
  });

  const [isDrawing, setIsDrawing] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const router = useRouter();
  const [isEndRoomOpen, setIsEndRoomOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showResultModal, setShowResultModal] = useState(false);
  const [noticeText, setNoticeText] = useState("");
  const [isSendingNotice, setIsSendingNotice] = useState(false);

  const handleNotice = async () => {
    if (!noticeText.trim() || !roomId || isSendingNotice) return;
    setIsSendingNotice(true);
    try {
      await sendNotice(roomId, noticeText.trim());
      setNoticeText("");
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
      const res = await startAuction(roomId, isReAuctionRound ? 5000 : 10000);
      if (res.timerEndsAt) setRealtimeData({ timerEndsAt: res.timerEndsAt });
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
      await deleteRoom(roomId);
      router.push("/");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isRoomLoaded)
    return (
      <div className="h-screen flex items-center justify-center font-black text-3xl animate-pulse">
        LOADING INSTANCE...
      </div>
    );
  if (!roomExists)
    return (
      <div className="h-screen flex flex-col items-center justify-center p-6 text-center gap-6">
        <div className="pixel-box bg-white p-10 font-black">
          <p className="text-2xl mb-6">ERROR: ROOM NOT FOUND</p>
          <button
            onClick={() => router.push("/")}
            className="pixel-button bg-minion-yellow px-8 py-3"
          >
            RETURN TO MENU
          </button>
        </div>
      </div>
    );

  return (
    <div className="flex flex-col h-screen overflow-hidden relative crt-overlay">
      <header className="h-14 shrink-0 bg-black border-b-4 border-black text-white relative z-[110]">
        <div className="max-w-7xl mx-auto px-4 h-full flex justify-between items-center">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Image
                src="/favicon.png"
                alt="Icon"
                width={24}
                height={24}
                className="pixelated shadow-lg"
              />
              <span className="font-black text-minion-yellow tracking-tighter">
                MINIONS_BID
              </span>
            </div>
            <div className="flex gap-2">
              <div className="pixel-box bg-black font-black text-black text-[12px] px-3 py-1 font-heading uppercase border-white/20">
                {effectiveRole === "ORGANIZER"
                  ? "주최자"
                  : effectiveRole === "LEADER"
                    ? "팀장"
                    : "관전자"}
              </div>
              <ElapsedTimer createdAt={createdAt || ""} />
            </div>
          </div>
          <div className="flex gap-3">
            {effectiveRole === "ORGANIZER" && <LinksModal />}
            <button
              onClick={() => setIsLeaveRoomOpen(true)}
              className="flex items-center gap-1.5 bg-white/50 hover:bg-white/20 text-white px-4 py-1.5 border-2 border-white/20 shadow-[2px_2px_0px_0px_rgba(0,0,0,0.2)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all text-[10px] font-heading uppercase"
            >
              EXIT
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 flex flex-col lg:grid lg:grid-cols-12 gap-4 p-4 overflow-y-auto lg:overflow-hidden w-full max-w-7xl mx-auto">
        <aside className="lg:col-span-3 flex flex-col min-h-0 order-3 lg:order-1 h-[300px] lg:h-auto shrink-0">
          <div className="pixel-box bg-white flex-1 flex flex-col overflow-hidden min-h-0">
            <div className="bg-black text-white px-3 py-1.5 font-heading text-[8px] uppercase flex justify-between">
              <span>Team Roster</span>
              <span className="text-minion-yellow animate-pulse">ACTIVE</span>
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-3 min-h-0">
              <TeamList />
            </div>
          </div>
        </aside>

        <section className="lg:col-span-6 flex flex-col gap-4 min-h-0 order-1 lg:order-2 lg:h-full shrink-0">
          <div className="pixel-box bg-black p-3 flex items-center justify-between overflow-hidden">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏰</span>
              <h2 className="text-xl font-black text-black truncate uppercase">
                {roomName}
              </h2>
            </div>
            <div className="flex gap-2">
              <HowToUseModal variant="header" />
              {effectiveRole === "ORGANIZER" && (
                <button
                  onClick={() => setIsEndRoomOpen(true)}
                  className="flex items-center gap-1.5 bg-red-600 text-white px-4 py-1.5 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-0.5 active:translate-y-0.5 transition-all text-[10px] font-heading uppercase"
                >
                  END
                </button>
              )}
            </div>
          </div>

          <AuctionBoard
            isLotteryActive={!!lotteryPlayer}
            lotteryPlayer={lotteryPlayer}
            waitingPlayers={waitingPlayers}
            role={effectiveRole}
            allConnected={allConnected}
            onCloseLottery={handleCloseLottery}
          />

          {effectiveRole === "ORGANIZER" && (
            <div className="pixel-box bg-white p-4 shrink-0 relative z-20">
              <div className="bg-black px-3 py-1.5 mb-3 text-[8px] font-heading flex justify-between border-b-4 border-black text-white uppercase">
                <span>GM CONTROL PANEL</span>
                <span className="text-minion-yellow">
                  대기자: {waitingPlayers.length} / 낙찰자:
                  {soldPlayers.length}
                </span>
              </div>
              <div className="flex gap-2 mb-4">
                <input
                  type="text"
                  value={noticeText}
                  onChange={(e) => setNoticeText(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNotice()}
                  placeholder="공지를 작성해주세요..."
                  className="flex-1 border-4 border-black px-4 py-2 text-xs font-black focus:outline-none bg-yellow-50"
                />
                <button
                  onClick={handleNotice}
                  className="pixel-button bg-black text-white px-6 text-xs"
                >
                  선포
                </button>
              </div>
              {allDone ? (
                <button
                  onClick={() => setShowResultModal(true)}
                  className="w-full pixel-button bg-green-500 text-white h-12 text-lg animate-bounce"
                >
                  경매 결과 확인
                </button>
              ) : !currentPlayer ? (
                <button
                  onClick={handleDraw}
                  disabled={
                    isDrawing || waitingPlayers.length === 0 || !allConnected
                  }
                  className="w-full pixel-button bg-minion-blue text-white h-14 text-lg"
                >
                  {isDrawing
                    ? "추첨중..."
                    : `다음 선수 추첨 (${waitingPlayers.length}명)`}
                </button>
              ) : !timerEndsAt && !lotteryPlayer ? (
                <button
                  onClick={handleStart}
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

        <aside className="lg:col-span-3 flex flex-col gap-4 min-h-0 order-2 lg:order-3 h-[400px] lg:h-auto shrink-0">
          <div className="pixel-box bg-black flex-none max-h-[150px] flex flex-col overflow-hidden">
            <div className="bg-red-600 text-white px-3 py-1.5 font-heading text-[8px] uppercase">
              유찰명단 (Unsold)
            </div>
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 min-h-0">
              <UnsoldPanel />
            </div>
          </div>
          <div className="pixel-box bg-white flex-1 flex flex-col overflow-hidden">
            <div className="bg-minion-blue text-white px-3 py-1 font-heading text-[8px] uppercase flex justify-between">
              <span>채팅 로그</span>
              <span className="animate-pulse">● ONLINE</span>
            </div>
            <ChatPanel />
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
