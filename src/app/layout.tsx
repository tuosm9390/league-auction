import type { Metadata } from \"next\";
import { headers } from \"next/headers\";
import { Cinzel } from \"next/font/google\";
import { ThemeProvider } from \"@/features/theme/ThemeContext\";
import \"./globals.css\";

const cinzel = Cinzel({
  subsets: [\"latin\"],
  weight: [\"400\", \"700\", \"900\"],
  variable: \"--font-cinzel\",
  display: \"swap\",
});

export const metadata: Metadata = {
  title: \"Minions Bid\",
  description: \"미니언즈 테마의 리그오브레전드 5인1조 경매 내전 플랫폼\",
  keywords: [\"리그오브레전드\", \"LoL\", \"경매\", \"내전\", \"미니언즈\", \"팀구성\"],
  authors: [{ name: \"Antigravity\" }],
  openGraph: {
    title: \"Minions Bid ??\",
    description: \"미니언즈 테마의 리그오브레전드 5인1조 경매 내전 플랫폼\",
    url: \"https://minionsbid.vercel.app\",
    siteName: \"Minions Bid\",
    images: [
      {
        url: \"/thumbnail.png\",
        width: 1200,
        height: 630,
        alt: \"Minions Bid Thumbnail\",
      },
    ],
    locale: \"ko_KR\",
    type: \"website\",
  },
  twitter: {
    card: \"summary_large_image\",
    title: \"Minions Bid\",
    description: \"미니언즈 테마의 리그오브레전드 5인1조 경매 내전 플랫폼\",
    images: [\"/thumbnail.png\"],
  },
};

export const viewport = {
  width: \"device-width\",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: \"#FDE047\",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const headersList = await headers();
  const nonce = headersList.get(\"x-nonce\") || undefined;

  return (
    <html lang=\"ko\">
      <head>
        <meta
          name=\"google-site-verification\"
          content=\"MDjk5WdTY8Pl_7kx3O84WmAebWeKmh2-1BK39ZzeGWA\"
        />
      </head>
      <body className={\`antialiased min-h-screen \${cinzel.variable}\`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}

