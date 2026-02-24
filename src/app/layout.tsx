import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "League Auction 🍌",
  description: "미니언즈 테마의 리그오브레전드 5인1조 경매 내전 플랫폼",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className="antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
