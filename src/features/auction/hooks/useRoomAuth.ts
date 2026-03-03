import { useEffect } from 'react'
import { Role } from '@/features/auction/store/useAuctionStore'

interface UseRoomAuthProps {
  role: Role
  teamId?: string
  roomId: string
  setRoomContext: (roomId: string, role: Role, teamId?: string) => void
}

export function useRoomAuth({ role, teamId, roomId, setRoomContext }: UseRoomAuthProps) {
  useEffect(() => {
    setRoomContext(roomId, role, teamId)
  }, [roomId, role, teamId, setRoomContext])

  return { effectiveRole: role, isTokenChecked: true }
}
