"use client";

import React from "react";
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
        <dl className={styles.statusRow} role="list">
          {stats.map((stat) => (
            <React.Fragment key={stat.label}>
              <dt className={styles.statusLabelSm}>{stat.label}</dt>
              <dd className={styles.statusNumberSm}>{stat.number}</dd>
            </React.Fragment>
          ))}
        </dl>
      </div>
    </aside>
  );
}

export default RetroSidebar;


