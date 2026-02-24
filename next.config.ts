import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // X-Frame-Options: DENY는 CSP frame-ancestors와 중복이지만 구형 브라우저 호환을 위해 유지
  { key: 'X-Frame-Options', value: 'DENY' },
  // X-XSS-Protection: '1; mode=block'은 deprecated — 일부 구형 브라우저에서 오히려 취약점 유발
  // 현대 브라우저는 CSP로 XSS 방어. 0으로 명시적 비활성화
  { key: 'X-XSS-Protection', value: '0' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  // HTTPS 강제 (배포 환경에서 HTTPS 사용 시 활성화)
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
  // CSP: Supabase HTTP/WebSocket + Next.js 인라인 스크립트 허용
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "img-src 'self' data:",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  },
]

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ]
  },
}

export default nextConfig;
