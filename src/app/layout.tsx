import CommandPalette from "@/components/CommandPalette/CommandPalette";
import { getCommandPaletteFdArticles } from "@/lib/frontend-design";
import { getCommandPalettePosts } from "@/lib/posts";
import { getCommandPalettePrinciples } from "@/lib/principles";
import type { Metadata } from "next";
import Script from "next/script";
import { Fraunces, Inter, Fira_Code } from "next/font/google";
import { GeistMono } from "geist/font/mono";
import { GeistPixelSquare } from "geist/font/pixel";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "TERMINAL_DREAMS",
  description: "Nostalgic bytes from the digital underground",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [posts, principles, frontendDesign] = await Promise.all([
    getCommandPalettePosts(),
    getCommandPalettePrinciples(),
    getCommandPaletteFdArticles(),
  ]);
  return (
    <html lang="en" suppressHydrationWarning>
      {/* react-grab (dev-only) injects data-locator-hook-* attrs on <head>
          between SSR and hydration — suppress the mismatch on this node. */}
      <head suppressHydrationWarning>
        {/* Theme init — must run before first paint to prevent flash. */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            async
          />
        )}
      </head>
      <body
        className={`${inter.variable} ${firaCode.variable} ${fraunces.variable} ${GeistMono.variable} ${GeistPixelSquare.variable} antialiased`}
      >
        <CommandPalette posts={posts} principles={principles} frontendDesign={frontendDesign} />
        {children}
      </body>
    </html>
  );
}
