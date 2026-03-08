import CommandPalette from "@/components/CommandPalette/CommandPalette";
import { getCommandPalettePosts } from "@/lib/posts";
import type { Metadata } from "next";
import Script from "next/script";
import { Fraunces, Geist, Geist_Mono, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
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
  const posts = await getCommandPalettePosts();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${jetbrainsMono.variable} ${fraunces.variable} antialiased`}
      >
        {process.env.NODE_ENV === "development" && (
          <Script
            src="//unpkg.com/react-grab/dist/index.global.js"
            crossOrigin="anonymous"
            strategy="beforeInteractive"
          />
        )}
        <CommandPalette posts={posts} />
        {children}
      </body>
    </html>
  );
}
