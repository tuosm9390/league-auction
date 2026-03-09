"use client";

import { useState } from "react";
import { AuctionArchiveSection } from "./AuctionArchiveSection";

export function ArchiveModalWrapper() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="pixel-button w-full sm:w-auto bg-white text-minion-blue py-5 px-12 text-xl font-heading shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-x-2 active:translate-y-2 transition-all"
      >
        VIEW ARCHIVES
      </button>

      <AuctionArchiveSection isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
