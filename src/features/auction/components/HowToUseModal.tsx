"use client";

import { useState } from "react";
import { X, HelpCircle } from "lucide-react";

const HOW_TO_USE = [
  {
    step: "01",
    icon: "🍌",
    title: "경매방 만들기",
    desc: "팀 수, 인원, 포인트를 설정하고 팀장과 경매 선수를 등록해 방을 생성합니다.",
  },
  {
    step: "02",
    icon: "🔗",
    title: "링크 공유",
    desc: "생성된 팀장별 링크를 각 팀장에게 공유합니다. 관전자 링크도 자유롭게 배포할 수 있습니다.",
  },
  {
    step: "03",
    icon: "✅",
    title: "팀장 접속 확인",
    desc: "경매 화면에서 팀장들의 실시간 접속 여부를 확인합니다. 모두 접속되면 경매를 시작하세요.",
  },
  {
    step: "04",
    icon: "🔥",
    title: "경매 진행",
    desc: "주최자가 선수를 하나씩 경매에 올리면 각 팀장이 포인트로 입찰합니다. 타이머 종료 시 최고 입찰 팀이 낙찰됩니다.",
  },
  {
    step: "05",
    icon: "🏆",
    title: "팀 확정",
    desc: "모든 선수가 낙찰되면 최종 팀 구성과 사용 포인트가 확정됩니다.",
  },
];

const TIPS = [
  "팀장 링크와 주최자 링크는 다른 주소입니다. 혼동하지 않도록 주의해주세요.",
  "팀장 포인트는 팀 시작 포인트에서 차감됩니다 (팀 예산 = 총 포인트 − 팀장 포인트).",
  '방 페이지 헤더의 "링크 확인" 버튼으로 언제든지 공유 링크를 다시 확인할 수 있습니다.',
  '경매가 종료되면 "방 종료" 버튼을 통해 결과를 저장하고, 메인 페이지의 "이전 경기 결과 조회" 버튼을 통해 언제든지 확인 할 수 있습니다.',
];

export function HowToUseModal({
  variant = "default",
}: {
  variant?: "default" | "header";
}) {
  const [isOpen, setIsOpen] = useState(false);

  const renderTriggerButton = () => {
    if (variant === "header") {
      return (
        <button
          onClick={() => setIsOpen(true)}
          className="bg-secondary hover:bg-secondary/80 text-secondary-foreground border border-border px-4 py-1.5 rounded-md text-xs font-bold shadow-sm transition-all flex items-center gap-1.5"
        >
          <span className="text-sm">❓</span> 사용법
        </button>
      );
    }

    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground py-3 rounded-md font-bold text-base mt-4 transition-colors shadow-sm active:translate-y-0.5"
      >
        사용법 보기
      </button>
    );
  };
  return (
    <>
      {renderTriggerButton()}

      {isOpen && (
        <div
          className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          {/* Modal Content */}
          <div
            className="bg-card rounded-xl w-full max-w-2xl shadow-md overflow-hidden border border-border relative animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header - Fixed */}
            <div className="bg-muted/50 border-b border-border px-4 py-3 flex items-center justify-between shrink-0 top-0 z-10 rounded-t-xl">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
                <span className="text-xl pb-1">💡</span>
                이렇게 진행됩니다!
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="text-muted-foreground hover:text-foreground p-1.5 rounded-md hover:bg-muted transition-colors"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Body - Scrollable */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {HOW_TO_USE.map((item) => (
                <div
                  key={item.step}
                  className="flex gap-3 bg-card rounded-lg p-3 border border-border shadow-sm"
                >
                  <div className="text-xl shrink-0 mt-0.5">{item.icon}</div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-primary-foreground bg-primary px-2 py-0.5 rounded-full">
                        STEP {item.step}
                      </span>
                      <h3 className="font-bold text-foreground">
                        {item.title}
                      </h3>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </div>
              ))}

              <div className="bg-secondary/50 border border-border rounded-xl p-4">
                <p className="text-sm font-bold text-foreground mb-2">
                  💡 알아두면 좋은 점
                </p>
                <ul className="text-sm text-muted-foreground space-y-1.5">
                  {TIPS.map((tip, i) => (
                    <li key={i}>· {tip}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="px-4 py-4 border-t border-border bg-muted/50 shrink-0">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-2.5 text-sm font-bold text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors border border-transparent shadow-sm"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
