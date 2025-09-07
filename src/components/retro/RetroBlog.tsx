"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import styles from "./retro.module.css";
import { RetroAboutCard } from "./RetroAboutCard";
import { CursorGlow, ScanlineOverlay } from "./RetroDecor";
import { RetroFooter } from "./RetroFooter";
import { RetroSidebar } from "./RetroSidebar";

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
  const [glitchIndex, setGlitchIndex] = useState<number | null>(null);

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
            <nav style={{ marginTop: "2rem" }}>
              <ul className={styles.navList}>
                {[
                  { label: "Home", href: "/" },
                  { label: "Archives", href: "/blog" },
                  { label: "About", href: "#" },
                  { label: "Guestbook", href: "#" },
                  { label: "Webring", href: "#" },
                ].map((item) => (
                  <li key={item.label}>
                    <a
                      href={item.href}
                      className={styles.navLink}
                      onMouseEnter={(e) => {
                        const target = e.currentTarget as HTMLAnchorElement;
                        target.style.color = "#e0e0e0";
                        target.textContent = `[ ${item.label} ]`;
                      }}
                      onMouseLeave={(e) => {
                        const target = e.currentTarget as HTMLAnchorElement;
                        target.style.color = "#a0a0a0";
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
          {posts.map((post, index) => (
            <article key={post.slug} className={styles.article}>
              <div className={styles.meta}>
                <span>{"// "}{post.date}</span>
                {post.category ? <span>{"// "}{post.category}</span> : null}
                <span>{"// "}{post.readTime}</span>
              </div>
              <h2
                className={`${styles.postTitle} ${glitchIndex === index ? styles.glitchShadow : ""
                  }`}
              >
                <Link href={`/blog/${post.slug}`}>{post.title}</Link>
              </h2>
              <div className={styles.content}>
                {post.summary ? (
                  <p style={{ marginBottom: "1rem" }}>{post.summary}</p>
                ) : null}
              </div>
              <Link
                href={`/blog/${post.slug}`}
                className={styles.readMore}
                onMouseEnter={(e) => {
                  const target = e.currentTarget as HTMLAnchorElement;
                  target.textContent = "Continue Reading >>>";
                }}
                onMouseLeave={(e) => {
                  const target = e.currentTarget as HTMLAnchorElement;
                  target.textContent = "Continue Reading";
                }}
              >
                Continue Reading
              </Link>
            </article>
          ))}
        </main>
        <RetroSidebar />
      </div>

      <RetroFooter />
    </div>
  );
}

export default RetroBlog;


