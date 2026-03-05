import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cinzel } from "next/font/google";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const cinzel = Cinzel({
  subsets: ["latin"],
  weight: ["400", "700", "900"],
  variable: "--font-cinzel",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Minions Bid",
  description: "미니언즈 테마의 리그오브레전드 5인1조 경매 내전 플랫폼",
  keywords: ["리그오브레전드", "LoL", "경매", "내전", "미니언즈", "팀구성"],
  authors: [{ name: "Antigravity" }],
  openGraph: {
    title: "Minions Bid 🍌",
    description: "미니언즈 테마의 리그오브레전드 5인1조 경매 내전 플랫폼",
    url: "https://minionsbid.vercel.app", // 실제 도메인에 맞춰 수정 필요
    siteName: "Minions Bid",
    images: [
      {
        url: "/thumbnail.png",
        width: 1200,
        height: 630,
        alt: "Minions Bid Thumbnail",
      },
    ],
    locale: "ko_KR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Minions Bid",
    description: "미니언즈 테마의 리그오브레전드 5인1조 경매 내전 플랫폼",
    images: ["/thumbnail.png"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#09090b", // Zinc background color
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // headers()를 호출하여 RootLayout을 동적 렌더링(Dynamic Rendering)으로 강제 전환합니다.
  // 이를 통해 Middleware에서 생성한 동적 CSP Nonce가 정적 캐시에 묻히지 않고
  // Next.js에서 생성하는 모든 <script> 태그에 정상적으로 주입됩니다.
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || undefined;

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta
          name="google-site-verification"
          content="MDjk5WdTY8Pl_7kx3O84WmAebWeKmh2-1BK39ZzeGWA"
        />
      </head>
      <body className={`antialiased min-h-screen ${cinzel.variable}`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
