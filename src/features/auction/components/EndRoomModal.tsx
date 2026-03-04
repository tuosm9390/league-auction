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
        className="bg-white rounded-xl w-full max-w-sm shadow-md animate-in zoom-in-95 duration-200 cursor-default border border-gray-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-red-50 rounded-lg flex items-center justify-center border border-red-100">
              <Trash2 size={16} className="text-red-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-800">방 종료</h2>
              <p className="text-[10px] text-gray-500 mt-0.5">
                이 작업은 되돌릴 수 없습니다.
              </p>
            </div>
          </div>
          {!isDeleting && (
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 p-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="px-4 py-4 space-y-3">
          <div className="bg-red-50 border border-red-100 rounded-lg p-3 flex gap-2">
            <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
            <div className="text-xs text-red-700 space-y-0.5">
              <p className="font-bold">경매방과 모든 데이터를 삭제합니다.</p>
              <p className="text-red-600/90 leading-tight">
                입찰 기록, 채팅, 팀 정보, 선수 정보 등 관련 데이터가 모두
                삭제되며 복구할 수 없습니다.
              </p>
            </div>
          </div>

          {/* 체크박스 확인 */}
          {!isCompleted && (
            <label className="flex items-start gap-2.5 cursor-pointer select-none group mt-1">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
                className="mt-0.5 w-3.5 h-3.5 accent-red-500 cursor-pointer rounded-sm border-gray-300"
              />
              <span className="text-xs text-gray-600 group-hover:text-gray-800 transition-colors leading-tight">
                위 내용을 확인했으며, 방을 종료하고 모든 데이터를 삭제합니다.
              </span>
            </label>
          )}

          {/* 경매 완료 상태 안내 */}
          {isCompleted && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3 text-xs text-green-700">
              <p className="font-bold mb-0.5">🏆 경매가 정상 종료되었습니다!</p>
              <p className="text-green-600/90">
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
                className="w-full py-2.5 bg-minion-blue hover:bg-minion-blue-hover text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm shadow-sm"
              >
                {isDeleting ? (
                  <span className="animate-spin text-base">⏳</span>
                ) : (
                  <Save size={14} />
                )}
                {isDeleting ? "처리 중..." : "결과 저장 후 방 종료"}
              </button>
              <button
                onClick={() => onConfirm(false)}
                disabled={isDeleting}
                className="w-full py-2 bg-white hover:bg-red-50 text-red-600 border border-red-200 rounded-lg text-xs font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
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
              className="w-full py-2 text-xs font-bold text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors border border-transparent hover:border-gray-200 shadow-sm"
            >
              취소
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
