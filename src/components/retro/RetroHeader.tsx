"use client";

import { PixelTrail } from "@/components/interactions/PixelTrail";
import styles from "./retro.module.css";

export function RetroHeader() {
  const items = [
    { label: "~/archive", href: "/blog" },
    { label: "~/about", href: "/about" },
    { label: "~/guestbook", href: "/guestbook" },
    { label: "~/webring", href: "/webring" },
  ];
  return (
    <header className={styles.header}>
      <div className={styles.headerOverlay}>
        <PixelTrail pixelSize={8} fadeDuration={300} delay={0} pixelClassName="bg-white/20" />
      </div>
      <div className={styles.headerInner}>
        <pre className={`${styles.ascii} ${styles.flickerAnimation}`}>{`╔═══════════════════════════════════════════════════════════════╗\n║  ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗ ║\n║  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║ ║\n║     ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║ ║\n║     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║ ║\n║     ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███╗║\n║     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══╝║\n╚═══════════════════════════════════════════════════════════════╝`}</pre>
        <h1 className={`${styles.title} ${styles.glitchAnimation} ${styles.blinkCursor}`}>
          TERMINAL_DREAMS
        </h1>
        <p className={styles.subtitle}>{"// Nostalgic bytes from the digital underground"}</p>
        <nav style={{ marginTop: "var(--space-6)" }}>
          <ul className={styles.navList}>
            {items.map((item) => (
              <li key={item.label}>
                <a href={item.href} className={styles.navLink}>{item.label}</a>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}

export default RetroHeader;


