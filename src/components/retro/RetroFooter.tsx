"use client";

import styles from "./retro.module.css";

export function RetroFooter() {
  return (
    <footer className={styles.footer} style={{ padding: "var(--space-3) var(--space-4)" }}>
      <div className={styles.footerInner}>
        <p className="font-mono text-xs" style={{ color: "var(--color-muted)" }}>
          ──────────────── [EOF] // © 2026 ────────────────
        </p>
      </div>
    </footer>
  );
}

export default RetroFooter;
