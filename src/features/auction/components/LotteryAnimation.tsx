import Image from "next/image";
import { useState, useEffect } from "react";
import { Player } from "@/features/auction/store/useAuctionStore";

interface LotteryAnimationProps {
  candidates: Player[];
  targetPlayer: Player;
  onFinished?: () => void;
}

const ITEM_HEIGHT = 180; // 이미지 포함으로 인해 높이 축소 대신 확보

/** 한글 티어명을 영문 파일명으로 매핑 */
const getTierImage = (tier: string) => {
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
    언랭: "Iron", // 임시로 언랭은 아이언으로 매칭
  };
  const englishTier = map[tier] || tier;
  return `/Rank=${englishTier}.png`;
};

/** 한글/영문 포지션을 영문 파일명으로 매핑 */
const getPositionImage = (pos: string) => {
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
    return "/main_position_bot.svg";
  if (
    normalized.includes("서폿") ||
    normalized.includes("서포터") ||
    normalized.includes("sup")
  )
    return "/main_position_sup.svg";
  return "/main_position_top.svg"; // 예비용
};

export function LotteryAnimation({
  candidates,
  targetPlayer,
  onFinished,
}: LotteryAnimationProps) {
  const [isSpinning, setIsSpinning] = useState(true);
  const [startRoll, setStartRoll] = useState(false);

  // 40개의 랜덤 선수 목록 생성 + 마지막에 실제 당첨자 배치 (슬롯머신 트랙)
  const [trackItems] = useState<Player[]>(() => {
    const cand = candidates.length > 0 ? candidates : [targetPlayer];
    const items: Player[] = [];
    for (let i = 0; i < 40; i++) {
      items.push(cand[Math.floor(Math.random() * cand.length)]);
    }
    items.push(targetPlayer);
    return items;
  });

  useEffect(() => {
    // 약간의 지연 후 CSS 트랜지션 트리거
    const timer1 = setTimeout(() => {
      setStartRoll(true);
    }, 100);

    // 애니메이션 3초간 진행 후 종료 상태로 변경
    const timer2 = setTimeout(() => {
      setIsSpinning(false);
      onFinished?.();
    }, 3100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [targetPlayer, onFinished]);

  // 40개의 가짜 항목들을 지나서 정확히 41번째(인덱스 40) 아이템으로 translateY 이동
  const targetTranslateY = -(40 * ITEM_HEIGHT);

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95 duration-500 py-4">
      <div
        className={`text-xl font-black tracking-widest transition-all duration-500 ${
          isSpinning
            ? "text-[#1D1D1F] animate-pulse"
            : "text-[#1D1D1F] scale-110"
        }`}
      >
        {isSpinning ? "🎰 추첨 중..." : "🎉 추첨 완료!"}
      </div>

      <div
        className="w-full max-w-md overflow-hidden rounded-2xl bg-[#F5F5F7] border border-gray-200 shadow-xl relative mx-auto"
        style={{ height: `${ITEM_HEIGHT}px` }}
      >
        <div
          className="flex flex-col w-full absolute top-0 left-0 px-4"
          style={{
            transform: startRoll
              ? `translateY(${targetTranslateY}px)`
              : "translateY(0px)",
            transition: startRoll
              ? "transform 4s cubic-bezier(0.1, 0.8, 0.2, 1)"
              : "none",
          }}
        >
          {trackItems.map((p, idx) => (
            <div
              key={idx}
              className="w-full flex flex-col items-center justify-center shrink-0 gap-1"
              style={{ height: `${ITEM_HEIGHT}px` }}
            >
              <span
                className={`text-4xl font-black w-full text-center truncate transition-all duration-300 ${
                  !isSpinning && idx === 40
                    ? "text-[#1D1D1F] scale-110"
                    : "text-gray-300"
                }`}
                title={p.name}
              >
                {p.name}
              </span>
              <div
                className={`flex items-center justify-center gap-4 transition-all duration-300 ${!isSpinning && idx === 40 ? "scale-110" : "scale-90 opacity-70"}`}
              >
                <div className="w-12 h-12 relative flex items-center justify-center">
                  <Image
                    src={getTierImage(p.tier)}
                    alt={p.tier}
                    width={48}
                    height={48}
                    className="object-contain drop-shadow-md"
                  />
                </div>
                <div className="w-10 h-10 relative flex items-center justify-center">
                  <Image
                    src={getPositionImage(p.main_position)}
                    alt={p.main_position}
                    width={40}
                    height={40}
                    className="object-contain drop-shadow-md opacity-90"
                  />
                </div>
              </div>
              <span
                className={`text-xs font-bold transition-all duration-300 ${
                  !isSpinning && idx === 40
                    ? "text-[#1D1D1F]/60 scale-110 mt-1"
                    : "text-gray-300"
                }`}
              >
                {p.tier} / {p.main_position}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
