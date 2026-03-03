import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const roomId = searchParams.get('roomId')
  const role = searchParams.get('role')
  let teamId = searchParams.get('teamId')
  if (teamId === 'undefined' || teamId === 'null' || teamId === '') {
    teamId = null
  }

  if (!roomId || !role) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // 역할+팀ID별 고유 쿠키 이름 — 같은 브라우저에서 여러 팀장이 열어도 덮어쓰지 않음
  const cookieSuffix = role === 'LEADER' && teamId ? `LEADER_${teamId}` : role.toUpperCase()
  const cookieName = `room_auth_${roomId}_${cookieSuffix}`

  const authData = JSON.stringify({ role, teamId: teamId || null })

  const cookieStore = await cookies()
  cookieStore.set(cookieName, authData, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: `/room/${roomId}`,
    maxAge: 60 * 60 * 8, // 8시간
  })

  // 리다이렉트 URL에 role/teamId 포함 → page.tsx가 올바른 쿠키를 조회할 수 있음
  const redirectUrl = new URL(`/room/${roomId}`, request.url)
  redirectUrl.searchParams.set('role', role)
  if (role === 'LEADER' && teamId) {
    redirectUrl.searchParams.set('teamId', teamId)
  }

  return NextResponse.redirect(redirectUrl)
}
