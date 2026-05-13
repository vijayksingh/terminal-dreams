"use client";

import { useEffect, useRef } from "react";
import styles from "./retro.module.css";

export function ScanlineOverlay() {
  return <div className={styles.scanline} />;
}

export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onMove = (e: MouseEvent) => {
      el.style.transform = `translate(${e.clientX - 200}px, ${e.clientY - 200}px)`;
    };

    document.addEventListener("mousemove", onMove, { passive: true });
    return () => document.removeEventListener("mousemove", onMove);
  }, []);

  return <div ref={ref} className={styles.cursorGlow} />;
}


