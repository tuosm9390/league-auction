"use client";

import { memo } from "react";
import { Message } from "@/features/auction/store/useAuctionStore";

interface NoticeBannerProps {
  msg: Message;
}

export const NoticeBanner = memo(function NoticeBanner({
  msg,
}: NoticeBannerProps) {
  return (
    <div className="bg-black border-b-4 border-minion-yellow px-5 py-2 flex items-center gap-3 shrink-0">
      <span className="text-minion-yellow animate-pulse text-lg">
        [공지사항]
      </span>
      <p className="text-sm font-bold text-white truncate">{msg.content}</p>
    </div>
  );
});
