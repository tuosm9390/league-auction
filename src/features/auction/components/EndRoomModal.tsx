"use client";

import { useState } from "react";
import { X, Trash2, AlertTriangle, Save } from "lucide-react";

interface EndRoomModalProps {
  isOpen: boolean;
  isCompleted: boolean;
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (saveResult: boolean) => void;
}

export function EndRoomModal({
  isOpen,
  isCompleted,
  isDeleting,
  onClose,
  onConfirm,
}: EndRoomModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    if (isDeleting) return;
    setConfirmed(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleClose}
    >
      <div
        className="bg-popover rounded-xl w-full max-w-sm shadow-md animate-in zoom-in-95 duration-200 cursor-default border border-border"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-border flex items-center justify-between bg-muted/50 rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center border border-red-500/20">
              <Trash2 size={16} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">방 종료</h2>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
          </div>
          {!isDeleting && (
            <button
              onClick={handleClose}
              className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-500 space-y-0.5">
              <p className="font-bold">경매방과 모든 데이터를 삭제합니다.</p>
              <p className="opacity-90 leading-tight">
                입찰 기록, 채팅, 팀 정보, 선수 정보 등 관련 데이터가 모두
                삭제되며 복구할 수 없습니다.
              </p>
            </div>
          </div>

          {!isCompleted && (
            <label className="flex items-start gap-2.5 cursor-pointer select-none group mt-1">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 accent-red-500 cursor-pointer rounded-sm"
              />
              <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors leading-tight">
                위 내용을 확인했으며, 방을 종료하고 모든 데이터를 삭제합니다.
              </span>
            </label>
          )}

          {isCompleted && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 text-xs text-green-500">
              <p className="font-bold mb-0.5">🏆 경매가 정상 종료되었습니다.</p>
              <p className="opacity-90">
                결과를 저장하면 메인 화면에서 나중에 다시 확인할 수 있습니다.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex flex-col gap-2">
          {isCompleted ? (
            <>
              <button
                onClick={() => onConfirm(true)}
                disabled={isDeleting}
                className="w-full py-2.5 bg-secondary hover:bg-secondary/90 text-secondary-foreground rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
              >
                {isDeleting ? (
                  <span className="animate-spin text-base">⏳</span>
                ) : (
                  <Save size={14} />
                )}
                {isDeleting ? "처리 중..." : "결과 저장하고 방 종료"}
              </button>
              <button
                onClick={() => onConfirm(false)}
                disabled={isDeleting}
                className="w-full py-2 bg-popover hover:bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                저장 없이 방 종료 (데이터 삭제)
              </button>
            </>
          ) : (
            <button
              onClick={() => onConfirm(false)}
              disabled={isDeleting || !confirmed}
              className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
            >
              {isDeleting ? (
                <span className="animate-spin text-base">⏳</span>
              ) : (
                <Trash2 size={14} />
              )}
              {isDeleting ? "삭제 중..." : "방 종료 및 데이터 삭제"}
            </button>
          )}
          {!isDeleting && (
            <button
              onClick={handleClose}
              className="w-full py-2 text-xs font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors border border-transparent"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
