"use client";

import { X, LogOut, AlertCircle } from "lucide-react";

interface LeaveRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LeaveRoomModal({
  isOpen,
  onClose,
  onConfirm,
}: LeaveRoomModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-xl w-full max-w-sm shadow-md animate-in zoom-in-95 duration-200 cursor-default border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/50 rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-secondary rounded-lg flex items-center justify-center border border-border text-foreground">
              <LogOut size={16} />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">방 나가기</h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="px-4 py-5">
          <div className="bg-secondary/50 border border-border rounded-lg p-3 flex gap-2">
            <AlertCircle size={16} className="text-primary shrink-0 mt-0.5" />
            <div className="text-xs text-foreground space-y-0.5">
              <p className="font-bold">메인 화면으로 돌아가시겠습니까?</p>
              <p className="text-muted-foreground leading-tight">
                경매방에 다시 접속하려면 초대 링크나 방 번호가 필요합니다.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className="w-full py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-md font-bold transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
          >
            <LogOut size={14} />방 나가기
          </button>
          <button
            onClick={onClose}
            className="w-full py-2.5 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors border border-transparent shadow-sm"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}
