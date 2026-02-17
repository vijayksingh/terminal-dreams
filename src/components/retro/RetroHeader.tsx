"use client";

import ScrambleHover from "@/components/fancy/text/scramble-hover";
import { PixelTrail } from "@/components/interactions/PixelTrail";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import Link from "next/link";
import { RetroAboutCard } from "./RetroAboutCard";
import styles from "./retro.module.css";

type RetroHeaderProps = {
  showAboutCard?: boolean;
};

export function RetroHeader({ showAboutCard = false }: RetroHeaderProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const items = [
    { label: "~/archive", href: "/blog" },
    { label: "~/playground", href: "/playground" },
    { label: "~/about", href: "/about" },
    { label: "~/guestbook", href: "/guestbook" },
    { label: "~/webring", href: "/webring" },
  ];
  const headerInnerClassName = showAboutCard
    ? `${styles.headerInner} ${styles.headerGrid}`
    : styles.headerInner;

  return (
    <header className={styles.header}>
      <div className={styles.headerOverlay}>
        {!prefersReducedMotion ? (
          <PixelTrail pixelSize={8} fadeDuration={300} delay={0} pixelClassName="bg-white/20" />
        ) : null}
      </div>
      <div className={headerInnerClassName}>
        <div>
          <pre className={`${styles.ascii} ${styles.flickerAnimation}`}>{`╔═══════════════════════════════════════════════════════════════╗\n║  ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗ ║\n║  ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║ ║\n║     ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║ ║\n║     ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║ ║\n║     ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███╗║\n║     ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══╝║\n╚═══════════════════════════════════════════════════════════════╝`}</pre>
          <h1 className={`${styles.title} ${styles.glitchAnimation} ${styles.blinkCursor}`}>
            TERMINAL_DREAMS
          </h1>
          <p className={styles.subtitle}>{"// Nostalgic bytes from the digital underground"}</p>
          <nav style={{ marginTop: "var(--space-6)" }}>
            <ul className={styles.navList}>
              {items.map((item) => (
                <li key={item.label}>
                  <Link href={item.href} className={styles.navLink}>
                    <ScrambleHover text={item.label} scrambleSpeed={40} maxIterations={8} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>
        {showAboutCard ? (
          <div>
            <RetroAboutCard />
          </div>
        ) : null}
      </div>
    </header>
  );
}

export default RetroHeader;


