import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { RoomClient } from './RoomClient'
import { Role } from '@/features/auction/store/useAuctionStore'

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>
type Params = Promise<{ id: string }>

export default async function RoomPage(props: {
  params: Params
  searchParams: SearchParams
}) {
  const resolvedParams = await props.params
  const resolvedSearchParams = await props.searchParams
  const roomId = resolvedParams.id
  
  const cookieStore = await cookies()
  const cookieName = `room_auth_${roomId}`

  const roleParam = (resolvedSearchParams.role as Role) || null
  const teamIdParam = (resolvedSearchParams.teamId as string) || null
  const tokenParam = (resolvedSearchParams.token as string) || null

  // URL 파라미터로 인증 정보가 넘어오면 HttpOnly 쿠키에 저장 후 URL 정리 (Redirect)
  if (tokenParam && roleParam) {
    const authData = JSON.stringify({ role: roleParam, teamId: teamIdParam, token: tokenParam })
    cookieStore.set(cookieName, authData, { 
      httpOnly: true, 
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'lax', 
      path: '/' 
    })
    redirect(`/room/${roomId}`)
  }

  // URL 파라미터가 없으면 쿠키에서 인증 정보 확인
  const authCookie = cookieStore.get(cookieName)
  let role: Role | null = null
  let teamId: string | null = null
  let token: string | null = null

  if (authCookie) {
    try {
      const parsed = JSON.parse(authCookie.value)
      role = parsed.role || null
      teamId = parsed.teamId || null
      token = parsed.token || null
    } catch (e) {
      console.error('Failed to parse auth cookie', e)
    }
  }

  return (
    <RoomClient
      roomId={roomId}
      roleParam={role}
      teamIdParam={teamId}
      tokenParam={token}
    />
  )
}
