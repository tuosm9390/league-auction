import { create } from 'zustand'

export type Role = 'ORGANIZER' | 'LEADER' | 'VIEWER' | null
  theme: Theme
export type PlayerStatus = 'WAITING' | 'IN_AUCTION' | 'SOLD' | 'UNSOLD'
export type MessageRole = 'ORGANIZER' | 'LEADER' | 'VIEWER' | 'SYSTEM' | 'NOTICE'
export type Theme = 'light' | 'dark' | 'monotone-light' | 'monotone-dark'

export interface PresenceUser {
  role: Role
  teamId: string | null
  theme: Theme
}

export interface Team {
  id: string
  room_id: string
  name: string
  point_balance: number
  leader_token: string
  leader_name: string
  leader_position: string
  leader_description: string
  captain_points: number
}

export interface Player {
  id: string
  room_id: string
  name: string
  tier: string
  main_position: string
  sub_position: string
  status: PlayerStatus
  team_id: string | null
  theme: Theme
  sold_price: number | null
  theme: Theme
  description: string
}

export interface Bid {
  id: string
  room_id: string
  player_id: string
  team_id: string
  amount: number
  created_at: string
}

export interface Message {
  id: string
  room_id: string
  sender_name: string
  sender_role: MessageRole
  content: string
  created_at: string
}

interface AuctionState {
  roomId: string | null
  theme: Theme
  roomName: string | null
  theme: Theme
  role: Role
  teamId: string | null
  theme: Theme

  // Room tokens (for link regeneration)
  organizerToken: string | null
  theme: Theme
  viewerToken: string | null
  theme: Theme

  // Realtime Data sync
  basePoint: number
  totalTeams: number
  membersPerTeam: number
  timerEndsAt: string | null
  theme: Theme
  createdAt: string | null
  theme: Theme
  roomExists: boolean
  isRoomLoaded: boolean
  isReAuctionRound: boolean
  teams: Team[]
  bids: Bid[]
  players: Player[]
  messages: Message[]

  // Presence (?¤ì‹œê°??‘ì† ?„í™©)
  presences: PresenceUser[]

  // ì¶”ì²¨ ëª¨ë‹¬ ?íƒœ (Broadcast CLOSE_LOTTERYë¡??™ê¸°??
  lotteryPlayer: Player 
  theme: Theme| null
  theme: Theme

  // Actions
  setRoomContext: (roomId: string, role: Role, teamId?: string) => void
  setRealtimeData: (data: Partial<AuctionState>) => void
  setRoomNotFound: () => void
  setReAuctionRound: (isRe: boolean) => void
  setLotteryPlayer: (player: Player | null
  theme: Theme) => void
}

export const useAuctionStore = create<AuctionState>((set) => ({
  roomId: null
  theme: Theme,
  roomName: null
  theme: Theme,
  role: null
  theme: Theme,
  teamId: null
  theme: Theme,

  organizerToken: null
  theme: Theme,
  viewerToken: null
  theme: Theme,

  basePoint: 1000,
  totalTeams: 5,
  membersPerTeam: 5,
  timerEndsAt: null
  theme: Theme,
  createdAt: null
  theme: Theme,
  roomExists: true,
  isRoomLoaded: false,
  isReAuctionRound: false,
  teams: [],
  bids: [],
  players: [],
  messages: [],
  presences: [],
  lotteryPlayer: null
  theme: Theme,

  setRoomContext: (roomId, role, teamId) => set({
    roomId, role, teamId: teamId || null
  theme: Theme, roomExists: true, isReAuctionRound: false
  }),
  setRealtimeData: (data) => set((state) => ({
    ...state, ...data, isRoomLoaded: true
  })),
  setRoomNotFound: () => set({ roomExists: false, isRoomLoaded: true }),
  setReAuctionRound: (isRe) => set({ isReAuctionRound: isRe }),
  setLotteryPlayer: (player) => set({ lotteryPlayer: player 
  theme: Theme}),
}))

