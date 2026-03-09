export const TIERS = [
  "챌린저",
  "그랜드마스터",
  "마스터",
  "다이아",
  "에메랄드",
  "플래티넘",
  "골드",
  "실버",
  "브론즈",
  "언랭",
];

export const POSITIONS = ["탑", "정글", "미드", "원딜", "서포터", "무관"];

export const TIER_MAP: Record<string, string> = {
  C: "챌린저",
  GM: "그랜드마스터",
  M: "마스터",
  D: "다이아",
  E: "에메랄드",
  P: "플래티넘",
  G: "골드",
  S: "실버",
  B: "브론즈",
};

export const POSITION_HEADER_KEYWORDS = [
  { keywords: ["T", "탑"], position: "탑" },
  { keywords: ["J", "정글"], position: "정글" },
  { keywords: ["M", "미드"], position: "미드" },
  { keywords: ["A", "원딜"], position: "원딜" },
  { keywords: ["S", "서포터"], position: "서포터" },
];

export const TIER_COLOR: Record<string, string> = {
  챌린저: "text-cyan-500",
  그랜드마스터: "text-red-500",
  마스터: "text-purple-500",
  다이아: "text-blue-400",
  에메랄드: "text-emerald-500",
  플래티넘: "text-teal-400",
  골드: "text-yellow-500",
  실버: "text-gray-600",
  브론즈: "text-amber-700",
  아이언: "text-gray-500",
  언랭: "text-black",
  Challenger: "text-cyan-500",
  Grandmaster: "text-red-500",
  Master: "text-purple-500",
  Diamond: "text-blue-400",
  Emerald: "text-emerald-500",
  Platinum: "text-teal-400",
  Gold: "text-yellow-500",
  Silver: "text-gray-600",
  Bronze: "text-amber-700",
  Iron: "text-gray-500",
  Unranked: "text-black",
};

export const LAST_NAMES = [
  "김", "이", "박", "최", "정", "강", "조", "윤", "장", "임",
  "한", "오", "서", "신", "권", "황", "안", "송", "홍", "고",
];

export const FIRST_NAMES_LIST = [
  "민준", "서준", "도윤", "예준", "시우", "주원", "하준", "지호", "준서", "준혁",
  "도현", "지훈", "건우", "우진", "현우", "민재", "준우", "민호", "준영", "민규",
  "지민", "서연", "서윤", "지윤", "수아", "하윤", "소윤", "예린", "지아", "채원",
  "수빈", "다은", "지은", "예원", "나은", "수현", "지현", "유진", "다연", "아린",
];

export const CAPTAIN_INTROS = [
  "팀원들을 이끌어 우승을 가져가겠습니다!",
  "최선을 다해 팀을 운영하겠습니다.",
  "좋은 팀 만들어서 꼭 우승하겠습니다!",
  "팀원을 잘 챙기는 리더가 되겠습니다.",
  "전략적으로 팀을 이끌겠습니다!",
];

export const PLAYER_INTROS = [
  "열심히 하겠습니다!",
  "최선을 다하겠습니다.",
  "잘 부탁드립니다!",
  "팀에 기여하는 선수가 되겠습니다.",
  "승리를 위해 최선을 다하겠습니다!",
  "믿고 맡겨주세요!",
  "좋은 팀원 만나서 우승하고 싶습니다.",
];
