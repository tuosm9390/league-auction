# Shared: Tech Stack

이 문서는 프로젝트가 사용하는 기술 스택과 환경 구성, 구동 명령어를 명시합니다.

## 핵심 스택

- **프레임워크**: Next.js 16 (App Router) + React 19 + TypeScript
- **스타일링**: Tailwind CSS v4 (커스텀 `@theme` 컬러 `globals.css` 정의)
- **전역 상태**: Zustand v5
- **백엔드/DB/실시간통신**: Supabase (PostgreSQL, Realtime, Presence)
- **애니메이션 및 시각효과**: Framer Motion
- **기타 라이브러리**: xlsx@0.18.5 (경매 명단 엑셀 임포트), Lucide React (아이콘)

## 구동 및 테스트 명령어

```bash
npm run dev           # 개발 서버 구동 (http://localhost:3000)
npm run build         # 프로덕션 빌드 (type-check 포함)
npm run lint          # ESLint
npm run test          # Vitest (단위 테스트)
npm run test:watch    # Vitest 워치 모드
npm run test:coverage # Vitest 커버리지 리포트
```

단위 테스트는 `__tests__/` 폴더 하위에 위치하며 Vitest + Testing Library + jsdom 기반으로 작동합니다.

## 시스템 환경 설정

로컬 테스트시 `.env.local` 에 다음 정보를 필요로 합니다:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

> `SUPABASE_SERVICE_ROLE_KEY`는 Server Actions (`auctionActions.ts`)내에서 서버사이드 권한 검증에 필수로 사용되며 배포 환경 변수에도 반드시 세팅되어야 합니다.
