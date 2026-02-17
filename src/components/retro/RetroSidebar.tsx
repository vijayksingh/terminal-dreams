"use client";

import styles from "./retro.module.css";

type RetroSidebarProps = {
  postsCount: number;
};

export function RetroSidebar({ postsCount }: RetroSidebarProps) {
  const stats = [
    { number: "1337", label: "Visitors" },
    { number: String(postsCount), label: "Posts" },
    { number: "∞", label: "Dreams" },
    { number: "90s", label: "Forever" },
  ];

  return (
    <aside className={`${styles.sidebar} ${styles.sidebarCompact}`}>
      <div className={styles.sidebarDivider} />
      <div className={styles.widget}>
        <h3 className={`${styles.widgetTitle} ${styles.pulseAnimation}`}>
          <span style={{ color: "var(--color-muted)" }}>{">"}</span> System Status
        </h3>
        <div className={styles.statusRow}>
          {stats.map((stat) => (
            <div key={stat.label} className={styles.statusChip}>
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


