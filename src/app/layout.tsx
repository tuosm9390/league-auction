import type { Metadata } from "next";
import { headers } from "next/headers";
import { Cinzel } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/features/theme/ThemeContext";
import { ThemeToggle } from "@/features/theme/ThemeToggle";

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
    url: "https://minionsbid.vercel.app",
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
  themeColor: "#FDE047", // 미니언즈 노란색
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // headers()를 호출하여 RootLayout을 동적 렌더링으로 강제 전환합니다.
  await headers();

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <meta
          name="google-site-verification"
          content="MDjk5WdTY8Pl_7kx3O84WmAebWeKmh2-1BK39ZzeGWA"
        />
      </head>
      <body className={`antialiased min-h-screen ${cinzel.variable}`}>
        <ThemeProvider>
          {children}
          <ThemeToggle />
        </ThemeProvider>
      </body>
    </html>
  );
}
