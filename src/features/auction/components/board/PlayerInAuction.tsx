"use client";

import Image from "next/image";
import { Player } from "@/features/auction/store/useAuctionStore";
import { getTierImage, getPositionImage } from "../../utils/display";
import { TIER_COLOR } from "../../constants/room";

interface PlayerInAuctionProps {
  player: Player;
}

export function PlayerInAuction({ player }: PlayerInAuctionProps) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-white border-4 border-black p-6 shadow-inner">
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <h2 className="text-3xl lg:text-4xl font-heading tracking-tighter mb-2">
            {player.name}
          </h2>
        </div>

        <div className="flex gap-10 items-center justify-center border-y-4 border-black border-double py-4 w-full">
          <div className="flex flex-col items-center gap-2">
            <Image
              src={getTierImage(player.tier)}
              alt="Tier"
              width={60}
              height={60}
              className="pixelated"
            />
            <span
              className={`text-lg font-black uppercase ${TIER_COLOR[player.tier] || "text-black"}`}
            >
              {player.tier}
            </span>
          </div>
          <div className="w-1 h-12 bg-black" />
          <div className="flex flex-col items-center gap-2 text-gray-700">
            <Image
              src={getPositionImage(player.main_position)}
              alt="Pos"
              width={50}
              height={50}
              className="pixelated"
            />
            <span className="text-lg font-black uppercase">
              {player.main_position}
            </span>
          </div>
        </div>
        {player.description && (
          <p className="mt-4 text-sm font-bold text-gray-600 italic">
            "{player.description}"
          </p>
        )}
      </div>
    </div>
  );
}
