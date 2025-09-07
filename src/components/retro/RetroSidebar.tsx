"use client";

import styles from "./retro.module.css";

export function RetroSidebar() {
  return (
    <aside className={`${styles.sidebar} ${styles.sidebarCompact}`}>
      <div className={styles.sidebarDivider} />
      <div className={styles.widget}>
        <h3 className={`${styles.widgetTitle} ${styles.pulseAnimation}`}>
          <span style={{ color: "var(--color-muted)" }}>{">"}</span> System Status
        </h3>
        <div className={styles.statusRow}>
          {[
            { number: "1337", label: "Visitors" },
            { number: "42", label: "Posts" },
            { number: "∞", label: "Dreams" },
            { number: "90s", label: "Forever" },
          ].map((stat, i) => (
            <div key={i} className={styles.statusChip}>
              <div className={styles.statusNumberSm}>{stat.number}</div>
              <div className={styles.statusLabelSm}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default RetroSidebar;


