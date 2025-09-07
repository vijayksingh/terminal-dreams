"use client";

// import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./retro.module.css";
import { RetroAboutCard } from "./RetroAboutCard";
import { CursorGlow, ScanlineOverlay } from "./RetroDecor";
import { RetroFooter } from "./RetroFooter";
import { RetroSidebar } from "./RetroSidebar";
import { RetroTimeline } from "./RetroTimeline";

declare global {
  interface Window {
    hack: () => string;
  }
}

export type BlogListItem = {
  slug: string;
  title: string;
  date: string;
  category?: string;
  readTime: string;
  summary?: string;
};

// Sidebar cards for recent posts/categories removed per design update.

//

export function RetroBlog({ posts }: { posts: BlogListItem[] }) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [/*glitchIndex*/, setGlitchIndex] = useState<number | null>(null);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    document.addEventListener("mousemove", handleMouseMove);

    const glitchInterval = window.setInterval(() => {
      setGlitchIndex(Math.floor(Math.random() * 3));
      window.setTimeout(() => setGlitchIndex(null), 100);
    }, 5000);

    // Console easter egg
    window.hack = () => {
      console.log(
        "%cACCESS GRANTED",
        "color: #00ff00; font-size: 20px; font-family: monospace;"
      );
      console.log(
        "%cYou are now part of the resistance.",
        "color: #00ff00; font-family: monospace;"
      );
      return "1337";
    };
    console.log(
      "%c" +
      `\n` +
      `Welcome to the Underground, Hacker\n` +
      `The Gibson awaits your commands...\n` +
      `Type: hack() to begin` +
      `\n`,
      "color: #00ff00; font-family: monospace;"
    );

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      window.clearInterval(glitchInterval);
    };
  }, []);

  return (
    <div className={styles.container}>
      <ScanlineOverlay />
      <CursorGlow x={mousePosition.x} y={mousePosition.y} />

      {/* Header extracted for reuse */}
      <header className={styles.header}>
        <div className={`${styles.headerInner} ${styles.headerGrid}`}>
          <div>
            <pre className={`${styles.ascii} ${styles.flickerAnimation}`}>{`╔═══════════════════════════════════════════════════════════════╗\n║  ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗ ║\n║  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║ ║\n║     ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║ ║\n║     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║ ║\n║     ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███╗║\n║     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══╝║\n╚═══════════════════════════════════════════════════════════════╝`}</pre>
            <h1 className={`${styles.title} ${styles.glitchAnimation} ${styles.blinkCursor}`}>
              TERMINAL_DREAMS
            </h1>
            <p className={styles.subtitle}>{"// Nostalgic bytes from the digital underground"}</p>
            <nav style={{ marginTop: "var(--space-6)" }}>
              <ul className={styles.navList}>
                {[
                  { label: "Home", href: "/" },
                  { label: "Archives", href: "/blog" },
                  { label: "About", href: "/about" },
                  { label: "Guestbook", href: "/guestbook" },
                  { label: "Webring", href: "/webring" },
                ].map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className={styles.navLink}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLAnchorElement;
                        target.textContent = `[ ${item.label} ]`;
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLAnchorElement;
                        target.textContent = item.label;
                      }}
                    >
                      {item.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
          <div>
            {/* About card on the right side */}
            <RetroAboutCard />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className={styles.main}>
        <main>
          <RetroTimeline
            posts={posts.map((p) => ({
              slug: p.slug,
              title: p.title,
              date: p.date,
              category: p.category,
              readTime: p.readTime,
            }))}
          />
          <RetroSidebar />
        </main>
      </div>

      <RetroFooter />
    </div>
  );
}

export default RetroBlog;


