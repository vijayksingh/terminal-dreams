"use client";

import styles from "./retro.module.css";

export function RetroFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <pre className={styles.divider}>════════════════════════════════════════════════════════════════</pre>
        <p>© 2025 TERMINAL_DREAMS // Crafted with love in the digital void</p>
        <p>Best viewed in Netscape Navigator 4.0 at 800x600 resolution</p>
        <p>[EOF]</p>
      </div>
    </footer>
  );
}

export default RetroFooter;


