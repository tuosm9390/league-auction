import type { Metadata } from "next";
import { headers } from "next/headers";
import { VT323, Press_Start_2P, Pixelify_Sans } from "next/font/google";
import "./globals.css";

const vt323 = VT323({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-vt323",
  display: "swap",
});

const pressStart2P = Press_Start_2P({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-press-start",
  display: "swap",
});

const pixelifySans = Pixelify_Sans({
  subsets: ["latin"],
  variable: "--font-pixelify",
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
  themeColor: "#FDE047",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") || undefined;

  return (
    <html lang="ko">
      <head>
        <meta
          name="google-site-verification"
          content="MDjk5WdTY8Pl_7kx3O84WmAebWeKmh2-1BK39ZzeGWA"
        />
      </head>
      <body className={"antialiased min-h-screen"}>{children}</body>
    </html>
  );
}
