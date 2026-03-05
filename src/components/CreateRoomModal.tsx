"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createRoom as createRoomAction } from "@/features/auction/api/auctionActions";
import { Copy, X, Check, ExternalLink, ArrowRight, Upload } from "lucide-react";
import Image from "next/image";

const TIERS = [
  "챌린저",
  "그랜드마스터",
  "마스터",
  "다이아",
  "에메랄드",
  "플래티넘",
  "골드",
  "실버",
  "브론즈",
  "언랭",
];
const POSITIONS = ["탑", "정글", "미드", "원딜", "서포터", "무관"];
const LS_KEY = "league_auction_rooms";

const LAST_NAMES = [
  "김",
  "이",
  "박",
  "최",
  "정",
  "강",
  "조",
  "윤",
  "장",
  "임",
  "한",
  "오",
  "서",
  "신",
  "권",
  "황",
  "안",
  "송",
  "홍",
  "고",
];
const FIRST_NAMES_LIST = [
  "민준",
  "서준",
  "도윤",
  "예준",
  "시우",
  "주원",
  "하준",
  "지호",
  "준서",
  "준혁",
  "도현",
  "지훈",
  "건우",
  "우진",
  "현우",
  "민재",
  "준우",
  "민호",
  "준영",
  "민규",
  "지민",
  "서연",
  "서윤",
  "지윤",
  "수아",
  "하윤",
  "소윤",
  "예린",
  "지아",
  "채원",
  "수빈",
  "다은",
  "지은",
  "예원",
  "나은",
  "수현",
  "지현",
  "유진",
  "다연",
  "아린",
];
const CAPTAIN_INTROS = [
  "팀원들을 이끌어 우승을 가져가겠습니다!",
  "최선을 다해 팀을 운영하겠습니다.",
  "좋은 팀 만들어서 꼭 우승하겠습니다!",
  "팀원을 잘 챙기는 리더가 되겠습니다.",
  "전략적으로 팀을 이끌겠습니다!",
];
const PLAYER_INTROS = [
  "열심히 하겠습니다!",
  "최선을 다하겠습니다.",
  "잘 부탁드립니다!",
  "팀에 기여하는 선수가 되겠습니다.",
  "승리를 위해 최선을 다하겠습니다!",
  "믿고 맡겨주세요!",
  "좋은 팀원 만나서 우승하고 싶습니다.",
];

interface BasicInfo {
  title: string;
  teamCount: number;
  membersPerTeam: number;
  totalPoints: number;
}

interface CaptainInfo {
  teamName: string;
  name: string;
  position: string;
  description: string;
  captainPoints: number;
}

interface PlayerInfo {
  name: string;
  tier: string;
  mainPosition: string;
  subPosition: string;
  description: string;
}

interface GeneratedLinks {
  roomId: string;
  organizerPath: string;
  organizerLink: string;
  captainLinks: { teamName: string; link: string }[];
  viewerLink: string;
}

interface StoredRoom {
  id: string;
  name: string;
  organizerPath: string;
  createdAt: string;
}

const STEPS = ["기본 정보", "팀장 등록", "선수 등록", "링크 발급"];

function generateKoreanName(usedNames: Set<string>): string {
  for (let i = 0; i < 100; i++) {
    const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
    const first =
      FIRST_NAMES_LIST[Math.floor(Math.random() * FIRST_NAMES_LIST.length)];
    const name = `${last}${first}`;
    if (!usedNames.has(name)) {
      usedNames.add(name);
      return name;
    }
  }
  const fallback = `선수${usedNames.size + 1}`;
  usedNames.add(fallback);
  return fallback;
}

function buildTemplateData(
  teamCount: number,
  membersPerTeam: number,
): { captains: CaptainInfo[]; players: PlayerInfo[] } {
  const usedNames = new Set<string>();

  const captains: CaptainInfo[] = Array.from({ length: teamCount }, (_, i) => {
    const name = generateKoreanName(usedNames);
    return {
      teamName: `${name}팀`,
      name,
      position: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
      description: CAPTAIN_INTROS[i % CAPTAIN_INTROS.length],
      captainPoints: 0,
    };
  });

  const playerCount = teamCount * (membersPerTeam - 1);
  const players: PlayerInfo[] = Array.from({ length: playerCount }, (_, i) => {
    const name = generateKoreanName(usedNames);
    return {
      name,
      tier: TIERS[Math.floor(Math.random() * TIERS.length)],
      mainPosition: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
      subPosition: POSITIONS[Math.floor(Math.random() * POSITIONS.length)],
      description: PLAYER_INTROS[i % PLAYER_INTROS.length],
    };
  });

  return { captains, players };
}

function saveRoomToStorage(room: StoredRoom) {
  try {
    const prev: StoredRoom[] = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    const updated = [room, ...prev.filter((r) => r.id !== room.id)].slice(0, 5);
    localStorage.setItem(LS_KEY, JSON.stringify(updated));
  } catch {}
}

function removeRoomFromStorage(id: string) {
  try {
    const prev: StoredRoom[] = JSON.parse(localStorage.getItem(LS_KEY) || "[]");
    localStorage.setItem(
      LS_KEY,
      JSON.stringify(prev.filter((r) => r.id !== id)),
    );
  } catch {}
}

const TIER_MAP: Record<string, string> = {
  C: "챌린저",
  GM: "그랜드마스터",
  M: "마스터",
  D: "다이아",
  E: "에메랄드",
  P: "플래티넘",
  G: "골드",
  S: "실버",
  B: "브론즈",
};

const POSITION_HEADER_KEYWORDS: { keywords: string[]; position: string }[] = [
  { keywords: ["T", "탑"], position: "탑" },
  { keywords: ["J", "정글"], position: "정글" },
  { keywords: ["M", "미드"], position: "미드" },
  { keywords: ["A", "원딜"], position: "원딜" },
  { keywords: ["S", "서포터"], position: "서포터" },
];

export function CreateRoomModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 미완료 방 알림
  const [activeRooms, setActiveRooms] = useState<StoredRoom[]>([]);
  const [isCheckingRooms, setIsCheckingRooms] = useState(false);

  const [basic, setBasic] = useState<BasicInfo>({
    title: "",
    teamCount: 2,
    membersPerTeam: 5,
    totalPoints: 1000,
  });
  const [captains, setCaptains] = useState<CaptainInfo[]>([]);
  const [players, setPlayers] = useState<PlayerInfo[]>([]);
  const [links, setLinks] = useState<GeneratedLinks | null>(null);
  const [isTemplateModalOpen, setIsTemplateModalOpen] = useState(false);
  const [templateData, setTemplateData] = useState<{
    captains: CaptainInfo[];
    players: PlayerInfo[];
  } | null>(null);

  // 모달 열릴 때 미완료 방 확인
  useEffect(() => {
    if (!isOpen) return;
    checkActiveRooms();
  }, [isOpen]);

  const checkActiveRooms = async () => {
    setIsCheckingRooms(true);
    try {
      const stored: StoredRoom[] = JSON.parse(
        localStorage.getItem(LS_KEY) || "[]",
      );
      if (stored.length === 0) return;

      const active: StoredRoom[] = [];
      for (const room of stored) {
        // 플레이어 상태 조회 — SOLD가 아닌 선수가 있거나, 플레이어가 없는 방(세팅 직후)은 미완료로 간주
        const { data: roomCheck } = await supabase
          .from("rooms")
          .select("id")
          .eq("id", room.id)
          .maybeSingle();
        if (!roomCheck) {
          removeRoomFromStorage(room.id);
          continue;
        }
        const { data: playerData } = await supabase
          .from("players")
          .select("status")
          .eq("room_id", room.id);
        const allSold =
          playerData &&
          playerData.length > 0 &&
          playerData.every((p) => p.status === "SOLD");
        if (!allSold) active.push(room);
      }
      setActiveRooms(active);
    } catch (err) {
      console.error("checkActiveRooms error:", err);
    } finally {
      setIsCheckingRooms(false);
    }
  };

  const syncCaptains = (count: number) => {
    setCaptains((prev) => {
      const result: CaptainInfo[] = [];
      for (let i = 0; i < count; i++) {
        result.push(
          prev[i] ?? {
            teamName: `팀 ${i + 1}`,
            name: "",
            position: "탑",
            description: "",
            captainPoints: 0,
          },
        );
      }
      return result;
    });
  };

  const syncPlayers = (count: number) => {
    setPlayers((prev) => {
      if (prev.length === count) return prev;
      if (prev.length > count) return prev.slice(0, count);
      const extra = Array.from({ length: count - prev.length }, () => ({
        name: "",
        tier: "골드",
        mainPosition: "탑",
        subPosition: "무관",
        description: "",
      }));
      return [...prev, ...extra];
    });
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!basic.title.trim()) {
        alert("경매 제목을 입력해주세요.");
        return;
      }
      if (!basic.teamCount || basic.teamCount < 2) {
        alert("팀은 최소 2개 이상이어야 합니다.");
        return;
      }
      if (!basic.membersPerTeam || basic.membersPerTeam < 2) {
        alert("팀당 인원은 최소 2명 이상이어야 합니다.");
        return;
      }
      if (!basic.totalPoints || basic.totalPoints < 100) {
        alert("총 포인트는 최소 100 이상이어야 합니다.");
        return;
      }
      syncCaptains(basic.teamCount);
      setStep(1);
    } else if (step === 1) {
      const invalid = captains.some(
        (c) => !c.name.trim() || !c.teamName.trim(),
      );
      if (invalid) {
        alert("모든 팀장의 팀 이름과 이름을 입력해주세요.");
        return;
      }
      const overPoint = captains.some(
        (c) => c.captainPoints < 0 || c.captainPoints >= basic.totalPoints,
      );
      if (overPoint) {
        alert("팀장 포인트는 0 이상, 총 포인트 미만이어야 합니다.");
        return;
      }
      syncPlayers(basic.teamCount * (basic.membersPerTeam - 1));
      setStep(2);
    } else if (step === 2) {
      const invalidName = players.find((p) => !p.name.trim());
      if (invalidName) {
        alert("모든 선수의 이름을 입력해주세요.");
        return;
      }
      setIsLoading(true);
      try {
        await createRoom();
        setStep(3);
      } catch (err) {
        console.error(err);
        alert("방 생성에 실패했습니다. 콘솔을 확인해주세요.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const createRoom = async () => {
    const result = await createRoomAction({
      name: basic.title,
      totalTeams: basic.teamCount,
      basePoint: basic.totalPoints,
      membersPerTeam: basic.membersPerTeam,
      captains,
      players,
    });
    if (result.error) throw new Error(result.error);

    const { roomId, organizerToken, viewerToken, teams: teamsResult } = result;
    if (!roomId || !organizerToken || !viewerToken || !teamsResult) {
      throw new Error("방 생성 결과가 올바르지 않습니다.");
    }

    const baseUrl = window.location.origin;
    const organizerPath = `/api/room-auth?roomId=${roomId}&role=ORGANIZER&token=${organizerToken}`;

    // localStorage에 저장
    saveRoomToStorage({
      id: roomId,
      name: basic.title,
      organizerPath,
      createdAt: new Date().toISOString(),
    });

    setLinks({
      roomId,
      organizerPath,
      organizerLink: `${baseUrl}${organizerPath}`,
      captainLinks: teamsResult.map((team) => ({
        teamName: team.name,
        link: `${baseUrl}/api/room-auth?roomId=${roomId}&role=LEADER&teamId=${team.id}&token=${team.leader_token}`,
      })),
      viewerLink: `${baseUrl}/api/room-auth?roomId=${roomId}&role=VIEWER&token=${viewerToken}`,
    });
  };

  const copyToClipboard = async (text: string, key: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    setIsUploading(true);
    try {
      // xlsx 라이브러리를 동적으로 로드 (초기 번들 사이즈 최적화)
      const XLSX = await import("xlsx");

      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          if (!data || typeof data === "string") {
            return;
          }

          const workbook = XLSX.read(new Uint8Array(data as ArrayBuffer), {
            type: "array",
          });
          const sheetName = workbook.SheetNames.includes("DB")
            ? "DB"
            : workbook.SheetNames[0];
          const sheet = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            raw: false,
          }) as (string | undefined)[][];

          if (rows.length < 2) {
            return;
          }

          const headerRow = Array.from(rows[0], (h) => String(h ?? "").trim());

          // Detect name / tier / comment columns
          let nameCol = 2,
            tierCol = 3,
            commentCol = 6;
          for (let ci = 0; ci < headerRow.length; ci++) {
            const h = headerRow[ci];
            if (h.includes("닉네임")) nameCol = ci;
            else if (h.includes("티어")) tierCol = ci;
            else if (h.includes("코멘트") || h.includes("설명"))
              commentCol = ci;
          }

          // Detect position columns from header; fallback to J~N (index 9~13)
          const positionColMap = new Map<number, string>();
          for (let ci = 0; ci < headerRow.length; ci++) {
            const h = headerRow[ci];
            for (const { keywords, position } of POSITION_HEADER_KEYWORDS) {
              if (keywords.includes(h)) {
                positionColMap.set(ci, position);
                break;
              }
            }
          }
          if (positionColMap.size < 5) {
            positionColMap.clear();
            [
              ["탑", 9],
              ["정글", 10],
              ["미드", 11],
              ["원딜", 12],
              ["서포터", 13],
            ].forEach(([pos, idx]) =>
              positionColMap.set(idx as number, pos as string),
            );
          }

          const parsed: PlayerInfo[] = [];
          for (let ri = 1; ri < rows.length; ri++) {
            const row = rows[ri];
            const name = String(row[nameCol] ?? "").trim();
            if (!name) continue;

            const tierRaw = String(row[tierCol] ?? "").trim();
            const tier = TIER_MAP[tierRaw] ?? "언랭";
            const description = String(row[commentCol] ?? "").trim();

            let mainPosition = "",
              subPosition = "";
            positionColMap.forEach((posName, colIdx) => {
              const val = String(row[colIdx] ?? "").trim();
              if (val === "●" && !mainPosition) mainPosition = posName;
              else if (val === "○" && !subPosition) subPosition = posName;
            });

            parsed.push({
              name,
              tier,
              mainPosition: mainPosition || "무관",
              subPosition: subPosition || "무관",
              description,
            });
          }

          if (parsed.length === 0) {
            alert("파싱된 선수가 없습니다. 파일 형식을 확인해주세요.");
            return;
          }
          const fixed = basic.teamCount * (basic.membersPerTeam - 1);
          const trimmed = parsed.slice(0, fixed);
          const padded: PlayerInfo[] =
            trimmed.length < fixed
              ? [
                  ...trimmed,
                  ...Array.from({ length: fixed - trimmed.length }, () => ({
                    name: "",
                    tier: "골드",
                    mainPosition: "탑",
                    subPosition: "무관",
                    description: "",
                  })),
                ]
              : trimmed;
          setPlayers(padded);
          alert(
            `${trimmed.length}명의 선수 정보로 목록을 덮어썼습니다.${parsed.length > fixed ? `\n(엑셀의 ${parsed.length}명 중 ${fixed}명만 적용)` : ""}`,
          );
        } catch (err) {
          console.error("Excel parse error:", err);
          alert("엑셀 파일 파싱에 실패했습니다.");
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        alert("파일을 읽는 중 오류가 발생했습니다.");
        setIsUploading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("xlsx load error:", err);
      alert("라이브러리 로드에 실패했습니다.");
      setIsUploading(false);
    }
  };

  const updatePlayer = (i: number, field: keyof PlayerInfo, value: string) => {
    setPlayers((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, [field]: value } : p)),
    );
  };

  const updateCaptain = (
    i: number,
    field: keyof CaptainInfo,
    value: string | number,
  ) => {
    setCaptains((prev) =>
      prev.map((c, idx) => {
        if (idx !== i) return c;
        const updated = { ...c, [field]: value };
        if (field === "name" && typeof value === "string") {
          const defaultName = `팀 ${i + 1}`;
          const prevAutoName = `${c.name}팀`;
          if (
            !c.name ||
            c.teamName === defaultName ||
            c.teamName === prevAutoName
          ) {
            updated.teamName = value ? `${value}팀` : defaultName;
          }
        }
        return updated;
      }),
    );
  };

  const openTemplateModal = () => {
    setTemplateData(buildTemplateData(basic.teamCount, basic.membersPerTeam));
    setIsTemplateModalOpen(true);
  };

  const applyTemplate = () => {
    if (!templateData) return;
    setCaptains(templateData.captains);
    setPlayers(templateData.players);
    setIsTemplateModalOpen(false);
  };

  const reset = () => {
    setStep(0);
    setBasic({
      title: "",
      teamCount: 5,
      membersPerTeam: 5,
      totalPoints: 1000,
    });
    setCaptains([]);
    setPlayers([]);
    setLinks(null);
    setCopied(null);
    setActiveRooms([]);
  };

  const close = () => {
    setIsOpen(false);
    reset();
  };

  const goToRoom = (organizerPath: string) => {
    close();
    window.location.href = organizerPath;
  };

  const minPlayers = basic.teamCount * (basic.membersPerTeam - 1);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-4 px-10 rounded-2xl text-2xl transition-all shadow-md hover:shadow-lg hover:-translate-y-1 active:shadow-sm active:translate-y-0.5"
      >
        새로운 경매방 만들기
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => {
            if (step < 3) close();
          }}
        >
          <div
            className="bg-card rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 cursor-default border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/50 rounded-t-3xl">
              <div className="flex items-center gap-2">
                <Image
                  src="/favicon.png"
                  alt="Minions Icon"
                  width={28}
                  height={28}
                  className="drop-shadow-sm opacity-80 mix-blend-luminosity"
                />
                <h2 className="text-xl font-black text-foreground">
                  경매방 만들기
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {STEPS[step]} ({step + 1}/{STEPS.length})
                </p>
              </div>
              {step < 3 && (
                <button
                  onClick={close}
                  className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Step Indicator */}
            <div className="px-6 pt-4 pb-2 flex items-center shrink-0">
              {STEPS.map((label, i) => (
                <div
                  key={i}
                  className="flex items-center"
                  style={{ flex: i < STEPS.length - 1 ? "1" : "initial" }}
                >
                  <div
                    className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold transition-colors shrink-0 ${
                      i < step
                        ? "bg-primary text-primary-foreground"
                        : i === step
                          ? "bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-card"
                          : "bg-secondary text-muted-foreground border border-border"
                    }`}
                  >
                    {i < step ? <Check size={13} /> : i + 1}
                  </div>
                  <span
                    className={`ml-1.5 text-xs font-medium whitespace-nowrap ${i === step ? "text-foreground" : "text-muted-foreground"}`}
                  >
                    {label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded-full ${i < step ? "bg-primary/50" : "bg-border"}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Step 0: 기본 정보 */}
              {step === 0 && (
                <div className="space-y-5">
                  {/* 미완료 방 알림 배너 */}
                  {isCheckingRooms && (
                    <div className="bg-secondary/50 border border-border rounded-2xl p-3 text-xs text-muted-foreground text-center">
                      이전 경매방 확인 중...
                    </div>
                  )}
                  {!isCheckingRooms && activeRooms.length > 0 && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4">
                      <p className="text-sm font-bold text-destructive mb-3">
                        ⚠️ 진행 중인 경매방이 있습니다
                      </p>
                      <div className="space-y-2">
                        {activeRooms.map((room) => (
                          <div
                            key={room.id}
                            className="bg-card border border-border rounded-xl p-3 flex items-center justify-between gap-3"
                          >
                            <div className="min-w-0">
                              <p className="font-bold text-foreground text-sm truncate">
                                {room.name}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {new Date(room.createdAt).toLocaleDateString(
                                  "ko-KR",
                                  {
                                    month: "long",
                                    day: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  },
                                )}{" "}
                                생성
                              </p>
                            </div>
                            <button
                              onClick={() => goToRoom(room.organizerPath)}
                              className="flex items-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                            >
                              이 방으로 이동 <ArrowRight size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        아래 양식을 작성하면 새 경매방을 만들 수 있습니다.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-bold text-foreground block mb-1.5">
                      경매 제목 *
                    </label>
                    <input
                      type="text"
                      data-testid="room-title-input"
                      value={basic.title}
                      onChange={(e) =>
                        setBasic((p) => ({ ...p, title: e.target.value }))
                      }
                      placeholder="예시) 제 14회 미니언즈 정규 리그전"
                      className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-bold text-foreground block mb-1.5">
                        팀 수
                      </label>
                      <input
                        type="number"
                        min={2}
                        max={12}
                        value={basic.teamCount}
                        onChange={(e) =>
                          setBasic((p) => ({
                            ...p,
                            teamCount:
                              e.target.value === ""
                                ? ("" as unknown as number)
                                : parseInt(e.target.value),
                          }))
                        }
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-foreground block mb-1.5">
                        팀당 인원 수
                      </label>
                      <input
                        type="number"
                        min={5}
                        max={5}
                        value={basic.membersPerTeam}
                        onChange={(e) =>
                          setBasic((p) => ({
                            ...p,
                            membersPerTeam:
                              e.target.value === ""
                                ? ("" as unknown as number)
                                : parseInt(e.target.value),
                          }))
                        }
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        팀장 포함
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-foreground block mb-1.5">
                        팀당 총 포인트
                      </label>
                      <input
                        type="number"
                        min={100}
                        step={100}
                        value={basic.totalPoints}
                        onChange={(e) =>
                          setBasic((p) => ({
                            ...p,
                            totalPoints:
                              e.target.value === ""
                                ? ("" as unknown as number)
                                : parseInt(e.target.value),
                          }))
                        }
                        className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-foreground block mb-1.5">
                      경매 진행 방식
                    </label>
                    <div className="bg-secondary/50 border border-border rounded-2xl p-4 text-xs text-muted-foreground leading-relaxed">
                      경매는 주최자가 무작위로 선수를 추첨하여 시작됩니다.
                      팀장들은 한정된 포인트를 사용하여 입찰하며, 가장 높은
                      금액을 부른 팀장이 선수를 영입합니다. 모든 팀이 인원을
                      모두 채울 때까지 경매가 진행됩니다.
                    </div>
                  </div>

                  <div className="bg-secondary/50 border border-border rounded-2xl p-4 text-sm text-muted-foreground space-y-1">
                    <p className="font-bold text-foreground mb-1">요약</p>
                    <p>
                      · 총 {basic.teamCount}팀, 팀당 {basic.membersPerTeam}명
                      (팀장 포함)
                    </p>
                    <p>
                      · 경매 선수{" "}
                      <span className="font-bold text-foreground">
                        {minPlayers}명
                      </span>{" "}
                      고정 등록
                    </p>
                    <p>
                      · 각 팀 시작 포인트: {basic.totalPoints}P (팀장 포인트
                      차감 전)
                    </p>
                  </div>
                </div>
              )}

              {step === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <p className="text-xs text-muted-foreground">
                      팀장 이름을 입력하면 팀명이 자동으로 생성됩니다. 팀장
                      포인트는 시작 포인트에서 차감됩니다.
                    </p>
                    <button
                      type="button"
                      onClick={openTemplateModal}
                      className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-xl text-sm font-bold transition-colors whitespace-nowrap shrink-0 border border-primary/20"
                    >
                      🎲 테스트 데이터 생성
                    </button>
                  </div>
                  {captains.map((captain, i) => (
                    <div
                      key={i}
                      className="border border-border rounded-2xl p-4 bg-secondary/30"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <input
                          type="text"
                          value={captain.teamName}
                          onChange={(e) =>
                            updateCaptain(i, "teamName", e.target.value)
                          }
                          placeholder="팀 이름"
                          className="font-bold text-foreground bg-transparent border-b border-border focus:border-primary outline-none px-1 py-0.5 text-sm flex-1 min-w-0 placeholder:text-muted-foreground"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          시작 포인트:{" "}
                          <span
                            className={`font-bold ${basic.totalPoints - captain.captainPoints > 0 ? "text-foreground" : "text-destructive"}`}
                          >
                            {basic.totalPoints - captain.captainPoints}P
                          </span>
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            팀장 이름 *
                          </label>
                          <input
                            type="text"
                            value={captain.name}
                            onChange={(e) =>
                              updateCaptain(i, "name", e.target.value)
                            }
                            placeholder="이름"
                            className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            포지션
                          </label>
                          <select
                            value={captain.position}
                            onChange={(e) =>
                              updateCaptain(i, "position", e.target.value)
                            }
                            className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                          >
                            {POSITIONS.map((p) => (
                              <option key={p} value={p}>
                                {p}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            팀장 포인트
                          </label>
                          <input
                            type="number"
                            min={0}
                            max={basic.totalPoints - 1}
                            value={captain.captainPoints}
                            onChange={(e) =>
                              updateCaptain(
                                i,
                                "captainPoints",
                                e.target.value === ""
                                  ? ("" as unknown as number)
                                  : parseInt(e.target.value),
                              )
                            }
                            className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            소개
                          </label>
                          <input
                            type="text"
                            value={captain.description}
                            onChange={(e) =>
                              updateCaptain(i, "description", e.target.value)
                            }
                            placeholder="간단 소개"
                            className="w-full bg-background border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    팀 시작 포인트 = 총 포인트({basic.totalPoints}) - 팀장
                    포인트
                  </p>
                </div>
              )}

              {step === 2 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        경매 선수 목록
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          players.filter((p) => p.name.trim()).length ===
                          minPlayers
                            ? "bg-primary/20 text-primary border border-primary/30"
                            : "bg-destructive/20 text-destructive border border-destructive/30"
                        }`}
                      >
                        {players.filter((p) => p.name.trim()).length} /{" "}
                        {minPlayers}명
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={openTemplateModal}
                        className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1.5 rounded-xl text-sm font-bold transition-colors whitespace-nowrap border border-primary/20"
                      >
                        🎲 테스트 데이터 생성
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".xlsx,.xlsm,.xls"
                        className="hidden"
                        onChange={handleExcelUpload}
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploading}
                        data-testid="excel-upload-button"
                        className="flex items-center gap-1.5 bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border px-3 py-1.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload size={14} />{" "}
                        {isUploading ? "처리 중..." : "엑셀 업로드"}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div
                      className="grid gap-2 text-xs font-bold text-muted-foreground px-2 pb-1"
                      style={{
                        gridTemplateColumns: "1.5rem 1fr 5rem 5rem 5rem 1fr",
                      }}
                    >
                      <span className="text-center">#</span>
                      <span>이름 *</span>
                      <span>티어</span>
                      <span>주 포지션</span>
                      <span>부 포지션</span>
                      <span>소개</span>
                    </div>
                    {players.map((player, i) => (
                      <div
                        key={i}
                        className="grid gap-2 items-center bg-secondary/30 rounded-xl px-2 py-1.5 border border-border"
                        style={{
                          gridTemplateColumns: "1.5rem 1fr 5rem 5rem 5rem 1fr",
                        }}
                      >
                        <span className="text-xs text-muted-foreground text-center">
                          {i + 1}
                        </span>
                        <input
                          type="text"
                          value={player.name}
                          onChange={(e) =>
                            updatePlayer(i, "name", e.target.value)
                          }
                          placeholder="선수 이름"
                          className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground w-full"
                        />
                        <select
                          value={player.tier}
                          onChange={(e) =>
                            updatePlayer(i, "tier", e.target.value)
                          }
                          className="bg-background border border-border rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground w-full"
                        >
                          {TIERS.map((t) => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                        <select
                          value={player.mainPosition}
                          onChange={(e) =>
                            updatePlayer(i, "mainPosition", e.target.value)
                          }
                          className="bg-background border border-border rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground w-full"
                        >
                          {POSITIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <select
                          value={player.subPosition}
                          onChange={(e) =>
                            updatePlayer(i, "subPosition", e.target.value)
                          }
                          className="bg-background border border-border rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground w-full"
                        >
                          {POSITIONS.map((p) => (
                            <option key={p} value={p}>
                              {p}
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={player.description}
                          onChange={(e) =>
                            updatePlayer(i, "description", e.target.value)
                          }
                          placeholder="소개 (선택)"
                          className="bg-background border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary text-foreground placeholder:text-muted-foreground w-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && links && (
                <div className="space-y-4">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 text-center">
                    <div className="text-3xl mb-1">🎉</div>
                    <p className="font-bold text-foreground text-lg">
                      경매방이 생성되었습니다!
                    </p>
                    <p className="text-sm text-foreground mt-1">
                      아래 링크를 각 참가자에게 공유하세요.
                    </p>
                  </div>

                  <LinkCard
                    label="👑 주최자 링크"
                    desc="경매 진행 및 관리 전용"
                    link={links.organizerLink}
                    linkKey="organizer"
                    copied={copied}
                    onCopy={copyToClipboard}
                  />

                  <div>
                    <p className="text-sm font-bold text-foreground mb-2">
                      🛡️ 팀장 링크 (팀별 개별 공유)
                    </p>
                    <div className="space-y-2">
                      {links.captainLinks.map((cl, i) => (
                        <LinkCard
                          key={i}
                          label={cl.teamName}
                          desc="팀장 전용 — 입찰 가능"
                          link={cl.link}
                          linkKey={`captain-${i}`}
                          copied={copied}
                          onCopy={copyToClipboard}
                        />
                      ))}
                    </div>
                  </div>

                  <LinkCard
                    label="👀 관전자 링크"
                    desc="관전 전용 — 입찰 불가, 자유롭게 공유 가능"
                    link={links.viewerLink}
                    linkKey="viewer"
                    copied={copied}
                    onCopy={copyToClipboard}
                  />
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border flex justify-between items-center shrink-0">
              {step < 3 ? (
                <>
                  <button
                    onClick={step === 0 ? close : () => setStep((s) => s - 1)}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors border border-transparent hover:border-border"
                  >
                    {step === 0 ? "취소" : "← 이전"}
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={isLoading}
                    data-testid="next-button"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading
                      ? "생성 중..."
                      : step === 2
                        ? "방 만들기 🎉"
                        : "다음 →"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={close}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors border border-transparent hover:border-border"
                  >
                    닫기
                  </button>
                  {links && (
                    <button
                      onClick={() => {
                        window.location.href = links.organizerPath;
                        close();
                      }}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center gap-2 shadow-sm active:translate-y-0.5"
                    >
                      경매 시작하기 <ExternalLink size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 템플릿 미리보기 모달 */}
      {isTemplateModalOpen && templateData && (
        <div
          className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsTemplateModalOpen(false)}
        >
          <div
            className="bg-card rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0 bg-muted/50 rounded-t-3xl">
              <div>
                <h3 className="text-lg font-black text-foreground">
                  🎲 테스트 데이터 미리보기
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {basic.teamCount}팀 · 팀장 {basic.teamCount}명 · 선수{" "}
                  {basic.teamCount * (basic.membersPerTeam - 1)}명
                </p>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-muted-foreground hover:text-foreground p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* 콘텐츠 */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* 팀장 섹션 */}
              <div>
                <p className="text-sm font-bold text-foreground mb-2">
                  🛡️ 팀장 ({templateData.captains.length}명)
                </p>
                <div className="rounded-xl overflow-hidden border border-border">
                  <div
                    className="grid text-xs font-bold text-muted-foreground bg-secondary/50 px-3 py-2 border-b border-border"
                    style={{ gridTemplateColumns: "2rem 1fr 1fr 4rem 1fr" }}
                  >
                    <span>#</span>
                    <span>팀 이름</span>
                    <span>팀장 이름</span>
                    <span>포지션</span>
                    <span>소개</span>
                  </div>
                  {templateData.captains.map((c, i) => (
                    <div
                      key={i}
                      className="grid text-xs text-foreground px-3 py-2 border-t border-border/50 hover:bg-secondary/30 transition-colors"
                      style={{ gridTemplateColumns: "2rem 1fr 1fr 4rem 1fr" }}
                    >
                      <span className="text-muted-foreground">{i + 1}</span>
                      <span className="font-bold text-primary truncate pr-2">
                        {c.teamName}
                      </span>
                      <span className="truncate pr-2 font-medium">{c.name}</span>
                      <span className="text-muted-foreground">{c.position}</span>
                      <span className="text-muted-foreground truncate">
                        {c.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 선수 섹션 */}
              <div>
                <p className="text-sm font-bold text-foreground mb-2">
                  ⚔️ 경매 선수 ({templateData.players.length}명)
                </p>
                <div className="rounded-xl overflow-hidden border border-border">
                  <div
                    className="grid text-xs font-bold text-muted-foreground bg-secondary/50 px-3 py-2 border-b border-border"
                    style={{
                      gridTemplateColumns: "2rem 1fr 4rem 4rem 4rem 1fr",
                    }}
                  >
                    <span>#</span>
                    <span>이름</span>
                    <span>티어</span>
                    <span>주 포지션</span>
                    <span>부 포지션</span>
                    <span>소개</span>
                  </div>
                  {templateData.players.map((p, i) => (
                    <div
                      key={i}
                      className="grid text-xs text-foreground px-3 py-2 border-t border-border/50 hover:bg-secondary/30 transition-colors"
                      style={{
                        gridTemplateColumns: "2rem 1fr 4rem 4rem 4rem 1fr",
                      }}
                    >
                      <span className="text-muted-foreground">{i + 1}</span>
                      <span className="font-bold truncate pr-2">{p.name}</span>
                      <span className="text-muted-foreground">{p.tier}</span>
                      <span className="text-muted-foreground">{p.mainPosition}</span>
                      <span className="text-muted-foreground">{p.subPosition}</span>
                      <span className="text-muted-foreground truncate">
                        {p.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* 푸터 */}
            <div className="px-6 py-4 border-t border-border flex justify-between items-center shrink-0">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors border border-transparent hover:border-border"
              >
                취소
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTemplateData(
                      buildTemplateData(basic.teamCount, basic.membersPerTeam),
                    );
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-primary hover:bg-primary/10 transition-colors border border-primary/20"
                >
                  🔄 다시 생성
                </button>
                <button
                  onClick={applyTemplate}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  템플릿 적용 ✓
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function LinkCard({
  label,
  desc,
  link,
  linkKey,
  copied,
  onCopy,
}: {
  label: string;
  desc: string;
  link: string;
  linkKey: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  return (
    <div className="border border-border rounded-xl p-3 flex items-center gap-3 bg-secondary/50 hover:border-primary/50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
        <p className="text-xs text-secondary-foreground truncate mt-0.5 font-mono">
          {link}
        </p>
      </div>
      <button
        onClick={() => onCopy(link, linkKey)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
          copied === linkKey
            ? "bg-primary text-primary-foreground"
            : "bg-background hover:bg-muted text-foreground border border-border"
        }`}
      >
        {copied === linkKey ? (
          <>
            <Check size={12} /> 복사됨
          </>
        ) : (
          <>
            <Copy size={12} /> 복사
          </>
        )}
      </button>
    </div>
  );
}
