작성일: 2026-03-05 15:52:00
작성자: Antigravity

# Security & SEO

이 문서는 League Auction 프로젝트의 보안 설정(CSP, Middleware, 헤더 등)과 SEO 및 디자인 메타데이터에 대해 설명합니다.

## Security (CSP / Middleware)

미들웨어 파일: `src/middleware.ts`

`middleware.ts`에서 각 요청마다 동적 Nonce를 생성합니다. (Next.js 16 deprecated 경고가 있으나 현재 동작함. 향후 `src/proxy.ts`로 파일명 변경 고려 가능):

```text
crypto.randomUUID() → base64 → nonce
CSP 헤더: script-src 'self' 'nonce-{nonce}' 'strict-dynamic' 'unsafe-inline'
         (dev 모드에서는 'unsafe-eval' 추가)
connect-src: 'self' https://*.supabase.co wss://*.supabase.co
frame-ancestors: 'none'
object-src: 'none'
base-uri: 'none'
```

Middleware matcher: `/((?!api|_next/static|_next/image|favicon.ico).*)` + prefetch 요청 제외.

### 기본 보안 헤더 (`next.config.ts`)

`next.config.ts`에 다음과 같은 보안 헤더가 설정되어 있습니다. (CSP는 미들웨어가 전담하므로 제외):

- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 0`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains`

### 렌더링 보안

- `layout.tsx`에서 `headers()`를 호출해 Dynamic Rendering을 강제합니다. (이유: 정적 사이트(SSG)로 캐시될 경우 CSP nonce 값이 불일치하는 에러 방지)

### 외부 의존성 취약점

- **xlsx@0.18.5 known vulns**: Prototype Pollution (CVSS 7.8) + ReDoS (CVSS 7.5). 현재 수정된 npm 버전이 없음. Low risk: 프론트엔드 클라이언트 사이드에서만 실행되며 관리자(Organizer)가 자신이 만든 파일만 업로드하기 때문.

## SEO / 메타데이터

- `src/app/layout.tsx`: Open Graph / Twitter Cards 메타데이터, locale `ko_KR`, `themeColor: #FDE047`
- `src/app/robots.ts`: robots.txt 설정 (검색엔진 로봇 정책)
- `src/app/sitemap.ts`: 사이트맵 자동 생성 (검색엔진 색인 최적화)
- `public/thumbnail.png`: OG 이미지 1200×630 (소셜 미디어 공유 시 썸네일)
- `public/favicon.png` / `public/favicon.ico`: 파비콘
