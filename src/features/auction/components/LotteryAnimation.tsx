import Image from "next/image";
import { useState, useEffect } from "react";
import { Player } from "@/features/auction/store/useAuctionStore";

interface LotteryAnimationProps {
  candidates: Player[];
  targetPlayer: Player;
  onFinished?: () => void;
}

const ITEM_HEIGHT = 180;

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
    언랭: "Iron",
  };
  const englishTier = map[tier] || tier;
  return `/Rank=${englishTier}.png`;
};

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
    return "/main_position_bot.webp";
  if (
    normalized.includes("서폿") ||
    normalized.includes("서포터") ||
    normalized.includes("sup")
  )
    return "/main_position_sup.svg";
  return "/main_position_top.svg";
};

export function LotteryAnimation({
  candidates,
  targetPlayer,
  onFinished,
}: LotteryAnimationProps) {
  const [isSpinning, setIsSpinning] = useState(true);
  const [startRoll, setStartRoll] = useState(false);

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
    const timer1 = setTimeout(() => {
      setStartRoll(true);
    }, 100);

    const timer2 = setTimeout(() => {
      setIsSpinning(false);
      onFinished?.();
    }, 3100);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [targetPlayer, onFinished]);

  const targetTranslateY = -(40 * ITEM_HEIGHT);

  return (
    <div className="w-full flex flex-col items-center justify-center gap-6 animate-in fade-in zoom-in-95 duration-500 py-4">
      <div
        className={`text-lg font-heading tracking-widest transition-all duration-500`}
      >
        {isSpinning ? "🎰 SELECTING..." : "🎉 TARGET LOCKED!"}
      </div>

      <div
        className="w-full max-w-md overflow-hidden bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative mx-auto"
        style={{ height: `${ITEM_HEIGHT}px` }}
      >
        {/* CRT Effect Inner */}
        <div className="absolute inset-0 pointer-events-none z-20 border-inner-4 border-black/5" />

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
                className={`text-3xl font-heading w-full text-center truncate transition-all duration-300`}
                title={p.name}
              >
                {p.name}
              </span>
              <div
                className={`flex items-center justify-center gap-4 transition-all duration-300`}
              >
                <div className="w-12 h-12 relative flex items-center justify-center">
                  <Image
                    src={getTierImage(p.tier)}
                    alt={p.tier}
                    width={48}
                    height={48}
                    className="object-contain drop-shadow-md pixelated"
                  />
                </div>
                <div className="w-10 h-10 relative flex items-center justify-center">
                  <Image
                    src={getPositionImage(p.main_position)}
                    alt={p.main_position}
                    width={40}
                    height={40}
                    className="object-contain drop-shadow-md opacity-90 pixelated"
                  />
                </div>
              </div>
              <span
                className={`text-[10px] font-heading transition-all duration-300`}
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
