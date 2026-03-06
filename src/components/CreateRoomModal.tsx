"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { createRoom as createRoomAction } from "@/features/auction/api/auctionActions";
import { Copy, X, Check, ExternalLink, ArrowRight, Upload } from "lucide-react";
import Image from "next/image";

const TIERS = [
  "ì±Œë¦°?€",
  "ê·¸ëœ?œë§ˆ?¤í„°",
  "ë§ˆìŠ¤??,
  "?¤ì´??,
  "?ë©”?„ë“œ",
  "?Œë˜?°ë„˜",
  "ê³¨ë“œ",
  "?¤ë²„",
  "ë¸Œë¡ ì¦?,
  "?¸ë­",
];
const POSITIONS = ["??, "?•ê?", "ë¯¸ë“œ", "?ë”œ", "?œí¬??, "ë¬´ê?"];
const LS_KEY = "league_auction_rooms";

const LAST_NAMES = [
  "ê¹€",
  "??,
  "ë°?,
  "ìµ?,
  "??,
  "ê°?,
  "ì¡?,
  "??,
  "??,
  "??,
  "??,
  "??,
  "??,
  "??,
  "ê¶?,
  "??,
  "??,
  "??,
  "??,
  "ê³?,
];
const FIRST_NAMES_LIST = [
  "ë¯¼ì?",
  "?œì?",
  "?„ìœ¤",
  "?ˆì?",
  "?œìš°",
  "ì£¼ì›",
  "?˜ì?",
  "ì§€??,
  "ì¤€??,
  "ì¤€??,
  "?„í˜„",
  "ì§€??,
  "ê±´ìš°",
  "?°ì§„",
  "?„ìš°",
  "ë¯¼ì¬",
  "ì¤€??,
  "ë¯¼í˜¸",
  "ì¤€??,
  "ë¯¼ê·œ",
  "ì§€ë¯?,
  "?œì—°",
  "?œìœ¤",
  "ì§€??,
  "?˜ì•„",
  "?˜ìœ¤",
  "?Œìœ¤",
  "?ˆë¦°",
  "ì§€??,
  "ì±„ì›",
  "?˜ë¹ˆ",
  "?¤ì?",
  "ì§€?€",
  "?ˆì›",
  "?˜ì?",
  "?˜í˜„",
  "ì§€??,
  "? ì§„",
  "?¤ì—°",
  "?„ë¦°",
];
const CAPTAIN_INTROS = [
  "?€?ë“¤???´ëŒ???°ìŠ¹??ê°€?¸ê?ê² ìŠµ?ˆë‹¤!",
  "ìµœì„ ???¤í•´ ?€???´ì˜?˜ê² ?µë‹ˆ??",
  "ì¢‹ì? ?€ ë§Œë“¤?´ì„œ ê¼??°ìŠ¹?˜ê² ?µë‹ˆ??",
  "?€?ì„ ??ì±™ê¸°??ë¦¬ë”ê°€ ?˜ê² ?µë‹ˆ??",
  "?„ëµ?ìœ¼ë¡??€???´ëŒê² ìŠµ?ˆë‹¤!",
];
const PLAYER_INTROS = [
  "?´ì‹¬???˜ê² ?µë‹ˆ??",
  "ìµœì„ ???¤í•˜ê² ìŠµ?ˆë‹¤.",
  "??ë¶€?ë“œë¦½ë‹ˆ??",
  "?€??ê¸°ì—¬?˜ëŠ” ? ìˆ˜ê°€ ?˜ê² ?µë‹ˆ??",
  "?¹ë¦¬ë¥??„í•´ ìµœì„ ???¤í•˜ê² ìŠµ?ˆë‹¤!",
  "ë¯¿ê³  ë§¡ê²¨ì£¼ì„¸??",
  "ì¢‹ì? ?€??ë§Œë‚˜???°ìŠ¹?˜ê³  ?¶ìŠµ?ˆë‹¤.",
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

const STEPS = ["ê¸°ë³¸ ?•ë³´", "?€???±ë¡", "? ìˆ˜ ?±ë¡", "ë§í¬ ë°œê¸‰"];

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
  const fallback = `? ìˆ˜${usedNames.size + 1}`;
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
      teamName: `${name}?€`,
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
  C: "ì±Œë¦°?€",
  GM: "ê·¸ëœ?œë§ˆ?¤í„°",
  M: "ë§ˆìŠ¤??,
  D: "?¤ì´??,
  E: "?ë©”?„ë“œ",
  P: "?Œë˜?°ë„˜",
  G: "ê³¨ë“œ",
  S: "?¤ë²„",
  B: "ë¸Œë¡ ì¦?,
};

const POSITION_HEADER_KEYWORDS: { keywords: string[]; position: string }[] = [
  { keywords: ["T", "??], position: "?? },
  { keywords: ["J", "?•ê?"], position: "?•ê?" },
  { keywords: ["M", "ë¯¸ë“œ"], position: "ë¯¸ë“œ" },
  { keywords: ["A", "?ë”œ"], position: "?ë”œ" },
  { keywords: ["S", "?œí¬??], position: "?œí¬?? },
];

export function CreateRoomModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ë¯¸ì™„ë£?ë°??Œë¦¼
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

  // ëª¨ë‹¬ ?´ë¦´ ??ë¯¸ì™„ë£?ë°??•ì¸
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
        // ?Œë ˆ?´ì–´ ?íƒœ ì¡°íšŒ ??SOLDê°€ ?„ë‹Œ ? ìˆ˜ê°€ ?ˆê±°?? ?Œë ˆ?´ì–´ê°€ ?†ëŠ” ë°??¸íŒ… ì§í›„)?€ ë¯¸ì™„ë£Œë¡œ ê°„ì£¼
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
            teamName: `?€ ${i + 1}`,
            name: "",
            position: "??,
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
        tier: "ê³¨ë“œ",
        mainPosition: "??,
        subPosition: "ë¬´ê?",
        description: "",
      }));
      return [...prev, ...extra];
    });
  };

  const handleNext = async () => {
    if (step === 0) {
      if (!basic.title.trim()) {
        alert("ê²½ë§¤ ?œëª©???…ë ¥?´ì£¼?¸ìš”.");
        return;
      }
      if (!basic.teamCount || basic.teamCount < 2) {
        alert("?€?€ ìµœì†Œ 2ê°??´ìƒ?´ì–´???©ë‹ˆ??");
        return;
      }
      if (!basic.membersPerTeam || basic.membersPerTeam < 2) {
        alert("?€???¸ì›?€ ìµœì†Œ 2ëª??´ìƒ?´ì–´???©ë‹ˆ??");
        return;
      }
      if (!basic.totalPoints || basic.totalPoints < 100) {
        alert("ì´??¬ì¸?¸ëŠ” ìµœì†Œ 100 ?´ìƒ?´ì–´???©ë‹ˆ??");
        return;
      }
      syncCaptains(basic.teamCount);
      setStep(1);
    } else if (step === 1) {
      const invalid = captains.some(
        (c) => !c.name.trim() || !c.teamName.trim(),
      );
      if (invalid) {
        alert("ëª¨ë“  ?€?¥ì˜ ?€ ?´ë¦„ê³??´ë¦„???…ë ¥?´ì£¼?¸ìš”.");
        return;
      }
      const overPoint = captains.some(
        (c) => c.captainPoints < 0 || c.captainPoints >= basic.totalPoints,
      );
      if (overPoint) {
        alert("?€???¬ì¸?¸ëŠ” 0 ?´ìƒ, ì´??¬ì¸??ë¯¸ë§Œ?´ì–´???©ë‹ˆ??");
        return;
      }
      syncPlayers(basic.teamCount * (basic.membersPerTeam - 1));
      setStep(2);
    } else if (step === 2) {
      const invalidName = players.find((p) => !p.name.trim());
      if (invalidName) {
        alert("ëª¨ë“  ? ìˆ˜???´ë¦„???…ë ¥?´ì£¼?¸ìš”.");
        return;
      }
      setIsLoading(true);
      try {
        await createRoom();
        setStep(3);
      } catch (err) {
        console.error(err);
        alert("ë°??ì„±???¤íŒ¨?ˆìŠµ?ˆë‹¤. ì½˜ì†”???•ì¸?´ì£¼?¸ìš”.");
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
      throw new Error("ë°??ì„± ê²°ê³¼ê°€ ?¬ë°”ë¥´ì? ?ŠìŠµ?ˆë‹¤.");
    }

    const baseUrl = window.location.origin;
    const organizerPath = `/api/room-auth?roomId=${roomId}&role=ORGANIZER&token=${organizerToken}`;

    // localStorage???€??
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
      // xlsx ?¼ì´ë¸ŒëŸ¬ë¦¬ë? ?™ì ?¼ë¡œ ë¡œë“œ (ì´ˆê¸° ë²ˆë“¤ ?¬ì´ì¦?ìµœì ??
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
            if (h.includes("?‰ë„¤??)) nameCol = ci;
            else if (h.includes("?°ì–´")) tierCol = ci;
            else if (h.includes("ì½”ë©˜??) || h.includes("?¤ëª…"))
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
              ["??, 9],
              ["?•ê?", 10],
              ["ë¯¸ë“œ", 11],
              ["?ë”œ", 12],
              ["?œí¬??, 13],
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
            const tier = TIER_MAP[tierRaw] ?? "?¸ë­";
            const description = String(row[commentCol] ?? "").trim();

            let mainPosition = "",
              subPosition = "";
            positionColMap.forEach((posName, colIdx) => {
              const val = String(row[colIdx] ?? "").trim();
              if (val === "?? && !mainPosition) mainPosition = posName;
              else if (val === "?? && !subPosition) subPosition = posName;
            });

            parsed.push({
              name,
              tier,
              mainPosition: mainPosition || "ë¬´ê?",
              subPosition: subPosition || "ë¬´ê?",
              description,
            });
          }

          if (parsed.length === 0) {
            alert("?Œì‹±??? ìˆ˜ê°€ ?†ìŠµ?ˆë‹¤. ?Œì¼ ?•ì‹???•ì¸?´ì£¼?¸ìš”.");
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
                    tier: "ê³¨ë“œ",
                    mainPosition: "??,
                    subPosition: "ë¬´ê?",
                    description: "",
                  })),
                ]
              : trimmed;
          setPlayers(padded);
          alert(
            `${trimmed.length}ëª…ì˜ ? ìˆ˜ ?•ë³´ë¡?ëª©ë¡????–´?¼ìŠµ?ˆë‹¤.${parsed.length > fixed ? `\n(?‘ì???${parsed.length}ëª?ì¤?${fixed}ëª…ë§Œ ?ìš©)` : ""}`,
          );
        } catch (err) {
          console.error("Excel parse error:", err);
          alert("?‘ì? ?Œì¼ ?Œì‹±???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
        } finally {
          setIsUploading(false);
        }
      };
      reader.onerror = () => {
        alert("?Œì¼???½ëŠ” ì¤??¤ë¥˜ê°€ ë°œìƒ?ˆìŠµ?ˆë‹¤.");
        setIsUploading(false);
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error("xlsx load error:", err);
      alert("?¼ì´ë¸ŒëŸ¬ë¦?ë¡œë“œ???¤íŒ¨?ˆìŠµ?ˆë‹¤.");
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
          const defaultName = `?€ ${i + 1}`;
          const prevAutoName = `${c.name}?€`;
          if (
            !c.name ||
            c.teamName === defaultName ||
            c.teamName === prevAutoName
          ) {
            updated.teamName = value ? `${value}?€` : defaultName;
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
        className="bg-minion-yellow hover:bg-minion-yellow-hover text-minion-blue font-bold py-4 px-10 rounded-2xl text-2xl transition-all shadow-[0_6px_0_#D9B310] hover:shadow-[0_4px_0_#D9B310] hover:translate-y-1 active:shadow-none hover:scale-105 active:scale-95"
      >
        ?ˆë¡œ??ê²½ë§¤ë°?ë§Œë“¤ê¸?
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => {
            if (step < 3) close();
          }}
        >
          <div
            className="bg-card rounded-3xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95 duration-200 cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Image
                  src="/favicon.png"
                  alt="Minions Icon"
                  width={28}
                  height={28}
                  className="drop-shadow-sm"
                />
                <h2 className="text-xl font-black text-minion-blue">
                  ê²½ë§¤ë°?ë§Œë“¤ê¸?
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {STEPS[step]} ({step + 1}/{STEPS.length})
                </p>
              </div>
              {step < 3 && (
                <button
                  onClick={close}
                  className="text-muted-foreground hover:text-muted-foreground p-2 rounded-xl hover:bg-muted transition-colors"
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
                        ? "bg-green-500 text-white"
                        : i === step
                          ? "bg-minion-blue text-white"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {i < step ? <Check size={13} /> : i + 1}
                  </div>
                  <span
                    className={`ml-1.5 text-xs font-medium whitespace-nowrap ${i === step ? "text-minion-blue" : "text-muted-foreground"}`}
                  >
                    {label}
                  </span>
                  {i < STEPS.length - 1 && (
                    <div
                      className={`flex-1 h-0.5 mx-2 rounded-full ${i < step ? "bg-green-400" : "bg-muted"}`}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {/* Step 0: ê¸°ë³¸ ?•ë³´ */}
              {step === 0 && (
                <div className="space-y-5">
                  {/* ë¯¸ì™„ë£?ë°??Œë¦¼ ë°°ë„ˆ */}
                  {isCheckingRooms && (
                    <div className="bg-muted border border-border rounded-2xl p-3 text-xs text-muted-foreground text-center">
                      ?´ì „ ê²½ë§¤ë°??•ì¸ ì¤?..
                    </div>
                  )}
                  {!isCheckingRooms && activeRooms.length > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
                      <p className="text-sm font-black text-orange-700 mb-3">
                        ? ï¸ ì§„í–‰ ì¤‘ì¸ ê²½ë§¤ë°©ì´ ?ˆìŠµ?ˆë‹¤
                      </p>
                      <div className="space-y-2">
                        {activeRooms.map((room) => (
                          <div
                            key={room.id}
                            className="bg-card border border-orange-200 rounded-xl p-3 flex items-center justify-between gap-3"
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
                                ?ì„±
                              </p>
                            </div>
                            <button
                              onClick={() => goToRoom(room.organizerPath)}
                              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-600 text-white px-3 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shrink-0"
                            >
                              ??ë°©ìœ¼ë¡??´ë™ <ArrowRight size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-orange-500 mt-2">
                        ?„ë˜ ?‘ì‹???‘ì„±?˜ë©´ ??ê²½ë§¤ë°©ì„ ë§Œë“¤ ???ˆìŠµ?ˆë‹¤.
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-bold text-foreground block mb-1.5">
                      ê²½ë§¤ ?œëª© *
                    </label>
                    <input
                      type="text"
                      data-testid="room-title-input"
                      value={basic.title}
                      onChange={(e) =>
                        setBasic((p) => ({ ...p, title: e.target.value }))
                      }
                      placeholder="?ˆì‹œ) ??14??ë¯¸ë‹ˆ?¸ì¦ˆ ?•ê·œ ë¦¬ê·¸??
                      className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-bold text-foreground block mb-1.5">
                        ?€ ??
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
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-bold text-foreground block mb-1.5">
                        ?€???¸ì› ??
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
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue"
                      />
                      <p className="text-xs text-muted-foreground mt-1">?€???¬í•¨</p>
                    </div>
                    <div>
                      <label className="text-sm font-bold text-foreground block mb-1.5">
                        ?€??ì´??¬ì¸??
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
                        className="w-full border border-border rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-bold text-foreground block mb-1.5">
                      ê²½ë§¤ ì§„í–‰ ë°©ì‹
                    </label>
                    <div className="bg-muted border border-border rounded-2xl p-4 text-xs text-muted-foreground leading-relaxed">
                      ê²½ë§¤??ì£¼ìµœ?ê? ë¬´ì‘?„ë¡œ ? ìˆ˜ë¥?ì¶”ì²¨?˜ì—¬ ?œì‘?©ë‹ˆ??
                      ?€?¥ë“¤?€ ?œì •???¬ì¸?¸ë? ?¬ìš©?˜ì—¬ ?…ì°°?˜ë©°, ê°€???’ì?
                      ê¸ˆì•¡??ë¶€ë¥??€?¥ì´ ? ìˆ˜ë¥??ì…?©ë‹ˆ?? ëª¨ë“  ?€???¸ì›??
                      ëª¨ë‘ ì±„ìš¸ ?Œê¹Œì§€ ê²½ë§¤ê°€ ì§„í–‰?©ë‹ˆ??
                    </div>
                  </div>

                  <div className="bg-blue-50 rounded-2xl p-4 text-sm text-muted-foreground space-y-1">
                    <p className="font-bold text-minion-blue mb-1">?”ì•½</p>
                    <p>
                      Â· ì´?{basic.teamCount}?€, ?€??{basic.membersPerTeam}ëª?
                      (?€???¬í•¨)
                    </p>
                    <p>
                      Â· ê²½ë§¤ ? ìˆ˜{" "}
                      <span className="font-bold text-minion-blue">
                        {minPlayers}ëª?
                      </span>{" "}
                      ê³ ì • ?±ë¡
                    </p>
                    <p>
                      Â· ê°??€ ?œì‘ ?¬ì¸?? {basic.totalPoints}P (?€???¬ì¸??
                      ì°¨ê° ??
                    </p>
                  </div>
                </div>
              )}

              {/* Step 1: ?€???±ë¡ */}
              {step === 1 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-3 gap-3">
                    <p className="text-xs text-muted-foreground">
                      ?€???´ë¦„???…ë ¥?˜ë©´ ?€ëª…ì´ ?ë™?¼ë¡œ ?ì„±?©ë‹ˆ?? ?€??
                      ?¬ì¸?¸ëŠ” ?œì‘ ?¬ì¸?¸ì—??ì°¨ê°?©ë‹ˆ??
                    </p>
                    <button
                      type="button"
                      onClick={openTemplateModal}
                      className="flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors whitespace-nowrap shrink-0"
                    >
                      ?² ?ŒìŠ¤???°ì´???ì„±
                    </button>
                  </div>
                  {captains.map((captain, i) => (
                    <div
                      key={i}
                      className="border border-border rounded-2xl p-4 bg-muted"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <div className="w-7 h-7 bg-minion-blue rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                          {i + 1}
                        </div>
                        <input
                          type="text"
                          value={captain.teamName}
                          onChange={(e) =>
                            updateCaptain(i, "teamName", e.target.value)
                          }
                          placeholder="?€ ?´ë¦„"
                          className="font-bold text-minion-blue bg-transparent border-b-2 border-border focus:border-minion-blue outline-none px-1 py-0.5 text-sm flex-1 min-w-0"
                        />
                        <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">
                          ?œì‘ ?¬ì¸??{" "}
                          <span
                            className={`font-bold ${basic.totalPoints - captain.captainPoints > 0 ? "text-minion-blue" : "text-red-500"}`}
                          >
                            {basic.totalPoints - captain.captainPoints}P
                          </span>
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            ?€???´ë¦„ *
                          </label>
                          <input
                            type="text"
                            value={captain.name}
                            onChange={(e) =>
                              updateCaptain(i, "name", e.target.value)
                            }
                            placeholder="?´ë¦„"
                            className="w-full border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue bg-card"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            ?¬ì???
                          </label>
                          <select
                            value={captain.position}
                            onChange={(e) =>
                              updateCaptain(i, "position", e.target.value)
                            }
                            className="w-full border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue bg-card"
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
                            ?€???¬ì¸??
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
                            className="w-full border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue bg-card"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-muted-foreground block mb-1">
                            ?Œê°œ
                          </label>
                          <input
                            type="text"
                            value={captain.description}
                            onChange={(e) =>
                              updateCaptain(i, "description", e.target.value)
                            }
                            placeholder="ê°„ë‹¨ ?Œê°œ"
                            className="w-full border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue bg-card"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center pt-1">
                    ?€ ?œì‘ ?¬ì¸??= ì´??¬ì¸??{basic.totalPoints}) - ?€??
                    ?¬ì¸??
                  </p>
                </div>
              )}

              {/* Step 2: ? ìˆ˜ ?±ë¡ */}
              {step === 2 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">
                        ê²½ë§¤ ? ìˆ˜ ëª©ë¡
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                          players.filter((p) => p.name.trim()).length ===
                          minPlayers
                            ? "bg-green-100 text-green-600"
                            : "bg-orange-100 text-orange-500"
                        }`}
                      >
                        {players.filter((p) => p.name.trim()).length} /{" "}
                        {minPlayers}ëª?
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={openTemplateModal}
                        className="flex items-center gap-1.5 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-1.5 rounded-xl text-sm font-bold transition-colors whitespace-nowrap"
                      >
                        ?² ?ŒìŠ¤???°ì´???ì„±
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
                        className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Upload size={14} />{" "}
                        {isUploading ? "ì²˜ë¦¬ ì¤?.." : "?‘ì? ?…ë¡œ??}
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
                      <span>?´ë¦„ *</span>
                      <span>?°ì–´</span>
                      <span>ì£??¬ì???/span>
                      <span>ë¶€ ?¬ì???/span>
                      <span>?Œê°œ</span>
                    </div>
                    {players.map((player, i) => (
                      <div
                        key={i}
                        className="grid gap-2 items-center bg-muted rounded-xl px-2 py-1.5"
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
                          placeholder="? ìˆ˜ ?´ë¦„"
                          className="border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue bg-card w-full"
                        />
                        <select
                          value={player.tier}
                          onChange={(e) =>
                            updatePlayer(i, "tier", e.target.value)
                          }
                          className="border border-border rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue bg-card w-full"
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
                          className="border border-border rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue bg-card w-full"
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
                          className="border border-border rounded-lg px-1 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue bg-card w-full"
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
                          placeholder="?Œê°œ (? íƒ)"
                          className="border border-border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-minion-blue bg-card w-full"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 3: ë§í¬ ë°œê¸‰ */}
              {step === 3 && links && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
                    <div className="text-3xl mb-1">?‰</div>
                    <p className="font-black text-green-700 text-lg">
                      ê²½ë§¤ë°©ì´ ?ì„±?˜ì—ˆ?µë‹ˆ??
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      ?„ë˜ ë§í¬ë¥?ê°?ì°¸ê??ì—ê²?ê³µìœ ?˜ì„¸??
                    </p>
                  </div>

                  <LinkCard
                    label="?‘‘ ì£¼ìµœ??ë§í¬"
                    desc="ê²½ë§¤ ì§„í–‰ ë°?ê´€ë¦??„ìš©"
                    link={links.organizerLink}
                    linkKey="organizer"
                    copied={copied}
                    onCopy={copyToClipboard}
                  />

                  <div>
                    <p className="text-sm font-bold text-foreground mb-2">
                      ?›¡ï¸??€??ë§í¬ (?€ë³?ê°œë³„ ê³µìœ )
                    </p>
                    <div className="space-y-2">
                      {links.captainLinks.map((cl, i) => (
                        <LinkCard
                          key={i}
                          label={cl.teamName}
                          desc="?€???„ìš© ???…ì°° ê°€??
                          link={cl.link}
                          linkKey={`captain-${i}`}
                          copied={copied}
                          onCopy={copyToClipboard}
                        />
                      ))}
                    </div>
                  </div>

                  <LinkCard
                    label="?? ê´€?„ì ë§í¬"
                    desc="ê´€???„ìš© ???…ì°° ë¶ˆê?, ?ìœ ë¡?²Œ ê³µìœ  ê°€??
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
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                  >
                    {step === 0 ? "ì·¨ì†Œ" : "???´ì „"}
                  </button>
                  <button
                    onClick={handleNext}
                    disabled={isLoading}
                    data-testid="next-button"
                    className="bg-minion-blue hover:bg-minion-blue-hover text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading
                      ? "?ì„± ì¤?.."
                      : step === 2
                        ? "ë°?ë§Œë“¤ê¸??‰"
                        : "?¤ìŒ ??}
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={close}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
                  >
                    ?«ê¸°
                  </button>
                  {links && (
                    <button
                      onClick={() => {
                        window.location.href = links.organizerPath;
                        close();
                      }}
                      className="bg-minion-yellow hover:bg-minion-yellow-hover text-minion-blue px-6 py-2.5 rounded-xl text-sm font-black transition-colors flex items-center gap-2 shadow-[0_4px_0_#D9B310] hover:shadow-[0_2px_0_#D9B310] hover:translate-y-0.5 active:shadow-none active:translate-y-1"
                    >
                      ê²½ë§¤ ?œì‘?˜ê¸° <ExternalLink size={14} />
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ?œí”Œë¦?ë¯¸ë¦¬ë³´ê¸° ëª¨ë‹¬ */}
      {isTemplateModalOpen && templateData && (
        <div
          className="fixed inset-0 z-[300] bg-black/80 flex items-center justify-center p-4"
          onClick={() => setIsTemplateModalOpen(false)}
        >
          <div
            className="bg-card rounded-3xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* ?¤ë” */}
            <div className="px-6 py-4 border-b border-border flex items-center justify-between shrink-0">
              <div>
                <h3 className="text-lg font-black text-minion-blue">
                  ?² ?ŒìŠ¤???°ì´??ë¯¸ë¦¬ë³´ê¸°
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {basic.teamCount}?€ Â· ?€??{basic.teamCount}ëª?Â· ? ìˆ˜{" "}
                  {basic.teamCount * (basic.membersPerTeam - 1)}ëª?
                </p>
              </div>
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="text-muted-foreground hover:text-muted-foreground p-2 rounded-xl hover:bg-muted transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* ì½˜í…ì¸?*/}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
              {/* ?€???¹ì…˜ */}
              <div>
                <p className="text-sm font-black text-foreground mb-2">
                  ?›¡ï¸??€??({templateData.captains.length}ëª?
                </p>
                <div className="rounded-xl overflow-hidden border border-border">
                  <div
                    className="grid text-xs font-bold text-muted-foreground bg-muted px-3 py-2"
                    style={{ gridTemplateColumns: "2rem 1fr 1fr 4rem 1fr" }}
                  >
                    <span>#</span>
                    <span>?€ ?´ë¦„</span>
                    <span>?€???´ë¦„</span>
                    <span>?¬ì???/span>
                    <span>?Œê°œ</span>
                  </div>
                  {templateData.captains.map((c, i) => (
                    <div
                      key={i}
                      className="grid text-xs text-foreground px-3 py-2 border-t border-gray-50 hover:bg-muted"
                      style={{ gridTemplateColumns: "2rem 1fr 1fr 4rem 1fr" }}
                    >
                      <span className="text-muted-foreground">{i + 1}</span>
                      <span className="font-bold text-minion-blue truncate pr-2">
                        {c.teamName}
                      </span>
                      <span className="truncate pr-2">{c.name}</span>
                      <span className="text-muted-foreground">{c.position}</span>
                      <span className="text-muted-foreground truncate">
                        {c.description}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ? ìˆ˜ ?¹ì…˜ */}
              <div>
                <p className="text-sm font-black text-foreground mb-2">
                  ?”ï¸ ê²½ë§¤ ? ìˆ˜ ({templateData.players.length}ëª?
                </p>
                <div className="rounded-xl overflow-hidden border border-border">
                  <div
                    className="grid text-xs font-bold text-muted-foreground bg-muted px-3 py-2"
                    style={{
                      gridTemplateColumns: "2rem 1fr 4rem 4rem 4rem 1fr",
                    }}
                  >
                    <span>#</span>
                    <span>?´ë¦„</span>
                    <span>?°ì–´</span>
                    <span>ì£??¬ì???/span>
                    <span>ë¶€ ?¬ì???/span>
                    <span>?Œê°œ</span>
                  </div>
                  {templateData.players.map((p, i) => (
                    <div
                      key={i}
                      className="grid text-xs text-foreground px-3 py-2 border-t border-gray-50 hover:bg-muted"
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

            {/* ?¸í„° */}
            <div className="px-6 py-4 border-t border-border flex justify-between items-center shrink-0">
              <button
                onClick={() => setIsTemplateModalOpen(false)}
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:bg-muted transition-colors"
              >
                ì·¨ì†Œ
              </button>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setTemplateData(
                      buildTemplateData(basic.teamCount, basic.membersPerTeam),
                    );
                  }}
                  className="px-4 py-2.5 rounded-xl text-sm font-bold text-purple-600 hover:bg-purple-50 transition-colors border border-purple-200"
                >
                  ?”„ ?¤ì‹œ ?ì„±
                </button>
                <button
                  onClick={applyTemplate}
                  className="bg-minion-blue hover:bg-minion-blue-hover text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-colors"
                >
                  ?œí”Œë¦??ìš© ??
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
    <div className="border border-border rounded-xl p-3 flex items-center gap-3 bg-muted">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
        <p className="text-xs text-blue-500 truncate mt-0.5 font-mono">
          {link}
        </p>
      </div>
      <button
        onClick={() => onCopy(link, linkKey)}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-colors whitespace-nowrap shrink-0 ${
          copied === linkKey
            ? "bg-green-100 text-green-700"
            : "bg-card hover:bg-muted text-muted-foreground border border-border"
        }`}
      >
        {copied === linkKey ? (
          <>
            <Check size={12} /> ë³µì‚¬??
          </>
        ) : (
          <>
            <Copy size={12} /> ë³µì‚¬
          </>
        )}
      </button>
    </div>
  );
}
