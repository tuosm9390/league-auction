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
