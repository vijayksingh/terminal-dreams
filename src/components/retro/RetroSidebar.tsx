"use client";

import React, { useEffect, useState } from "react";
import styles from "./retro.module.css";

type RetroSidebarProps = {
  postsCount: number;
};

function formatCount(value: number | null): string {
  if (value === null) return "…";
  return value.toLocaleString();
}

export function RetroSidebar({ postsCount }: RetroSidebarProps) {
  const [visitors, setVisitors] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    // POST counts this session once (cookie-gated server-side) and returns
    // the current total in the same response. On failure we silently leave
    // the placeholder — the sidebar is decorative.
    fetch("/api/site/visit", { method: "POST" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled && data && typeof data.visitors === "number") {
          setVisitors(data.visitors);
        }
      })
      .catch(() => {
        /* ignore */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { number: formatCount(visitors), label: "Visitors" },
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
