import { createClient } from '@supabase/supabase-js'

/**
 * 서버 전용 Supabase 클라이언트 (service_role key 사용).
 * RLS를 우회하므로 Server Actions 내부에서만 호출해야 합니다.
 * 절대 클라이언트 컴포넌트나 브라우저 환경에서 임포트하지 마세요.
 */
export function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      '[Supabase Server] NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다.'
    )
  }
  return createClient(url, key, {
    auth: { persistSession: false },
  })
}

/**
 * Supabase Realtime REST API를 통해 서버 사이드에서 Broadcast 이벤트를 전송합니다.
 * Client-side WebSocket을 거치지 않고 직접 REST API를 호출하므로 지연이 최소화됩니다 (<100ms).
 *
 * Broadcast-primary 아키텍처의 핵심:
 * Server Action → DB write → broadcastEvent → 모든 클라이언트 동시 수신
 */
export async function broadcastEvent(
  roomId: string,
  event: string,
  payload: object,
): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return

  // 3초 타임아웃: fetch에 타임아웃이 없으면 Supabase REST API 지연 시 Server Action 전체가 블로킹됨
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 3000)

  try {
    const res = await fetch(`${url}/realtime/v1/api/broadcast`, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${key}`,
        'apikey': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            // ⚠️ topic은 채널명 그대로 (realtime: 접두사 없음)
            // Supabase REST API가 내부에서 'realtime:' 접두사를 붙임
            topic: `auction-${roomId}`,
            event,
            payload,
          },
        ],
      }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error(`[broadcastEvent] REST API 오류 (${res.status}):`, body)
    }
  } catch (err) {
    if ((err as Error).name === 'AbortError') {
      console.error('[broadcastEvent] 타임아웃 (3s) — 브로드캐스트 실패')
    } else {
      console.error('[broadcastEvent] 브로드캐스트 전송 실패:', err)
    }
  } finally {
    clearTimeout(timeoutId)
  }
}
