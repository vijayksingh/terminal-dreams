import CommandPalette from "@/components/CommandPalette/CommandPalette";
import { getCommandPalettePosts } from "@/lib/posts";
import type { Metadata } from "next";
import Script from "next/script";
import { Fraunces, Inter, Fira_Code } from "next/font/google";
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
  const posts = await getCommandPalettePosts();
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${firaCode.variable} ${fraunces.variable} antialiased`}
      >
        {/* Theme init — must run before first paint to prevent flash */}
        <Script src="/theme-init.js" strategy="beforeInteractive" />
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
