import { create } from 'zustand'

export type Role = 'ORGANIZER' | 'LEADER' | 'VIEWER' | null

export interface PresenceUser {
  role: Role
  teamId: string | null
}

interface AuctionState {
  roomId: string | null
  role: Role
  teamId: string | null

  // Room tokens (for link regeneration)
  organizerToken: string | null
  viewerToken: string | null

  // Realtime Data sync
  basePoint: number
  totalTeams: number
  membersPerTeam: number
  orderPublic: boolean
  timerEndsAt: string | null
  teams: any[]
  bids: any[]
  players: any[]
  messages: any[]

  // Presence (실시간 접속 현황)
  presences: PresenceUser[]

  // Actions
  setRoomContext: (roomId: string, role: Role, teamId?: string) => void
  setRealtimeData: (data: Partial<AuctionState>) => void
  addBid: (bid: any) => void
  addMessage: (message: any) => void
}

export const useAuctionStore = create<AuctionState>((set) => ({
  roomId: null,
  role: null,
  teamId: null,

  organizerToken: null,
  viewerToken: null,

  basePoint: 1000,
  totalTeams: 5,
  membersPerTeam: 5,
  orderPublic: true,
  timerEndsAt: null,
  teams: [],
  bids: [],
  players: [],
  messages: [],
  presences: [],

  setRoomContext: (roomId, role, teamId) => set({ roomId, role, teamId: teamId || null }),
  setRealtimeData: (data) => set((state) => ({ ...state, ...data })),
  addBid: (bid) => set((state) => ({ bids: [...state.bids, bid] })),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
}))
