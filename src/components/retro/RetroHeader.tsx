"use client";

import ScrambleHover from "@/components/fancy/text/scramble-hover";
import FaultyTerminal from "@/components/interactions/FaultyTerminal";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import Link from "next/link";
import { useEffect, useState } from "react";
import { RetroAboutCard } from "./RetroAboutCard";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./retro.module.css";

function useTheme() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const read = () => {
      const val = document.documentElement.getAttribute("data-theme");
      setTheme(val === "light" ? "light" : "dark");
    };
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);
  return theme;
}

type RetroHeaderProps = {
  showAboutCard?: boolean;
};

export function RetroHeader({ showAboutCard = false }: RetroHeaderProps) {
  const prefersReducedMotion = usePrefersReducedMotion();
  const theme = useTheme();
  const items = [
    { label: "~/archive", href: "/blog" },
    { label: "~/principles", href: "/principles" },
    { label: "~/frontend-design", href: "/frontend-design" },
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
          <FaultyTerminal
            key={theme}
            scale={1.5}
            gridMul={[2, 1]}
            digitSize={1.2}
            timeScale={theme === "dark" ? 0.5 : 0.3}
            scanlineIntensity={theme === "dark" ? 0.8 : 0.4}
            glitchAmount={theme === "dark" ? 0.5 : 0.2}
            flickerAmount={theme === "dark" ? 0.5 : 0.2}
            noiseAmp={1}
            curvature={0}
            mouseReact
            mouseStrength={0.3}
            brightness={theme === "dark" ? 0.7 : 0.7}
            tint={theme === "dark" ? "#4a7ce8" : "#2855d6"}
            tintEnd={theme === "dark" ? "#2ec8a0" : "#0fa878"}
            pageLoadAnimation
          />
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
              <li>
                <ThemeToggle />
              </li>
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


