"use client";

import styles from "./retro.module.css";

interface RetroSidebarProps {
  recentPosts: string[];
  categories: string[];
}

export function RetroSidebar({ recentPosts, categories }: RetroSidebarProps) {
  return (
    <aside className={styles.sidebar}>
      <div className={styles.widget}>
        <h3 className={`${styles.widgetTitle} ${styles.pulseAnimation}`}>
          <span style={{ color: "#606060" }}>{">"}</span> Recent Posts
        </h3>
        <ul className={styles.list}>
          {recentPosts.map((post, i) => (
            <li key={i} className={styles.listItem}>
              <a href="#" className={styles.listLink}>
                {post}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.widget}>
        <h3 className={`${styles.widgetTitle} ${styles.pulseAnimation}`}>
          <span style={{ color: "#606060" }}>{">"}</span> Categories
        </h3>
        <ul className={styles.list}>
          {categories.map((category, i) => (
            <li key={i} className={styles.listItem}>
              <a href="#" className={styles.listLink}>
                {category}
              </a>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.widget}>
        <h3 className={`${styles.widgetTitle} ${styles.pulseAnimation}`}>
          <span style={{ color: "#606060" }}>{">"}</span> System Status
        </h3>
        <div className={styles.statsGrid}>
          {[
            { number: "1337", label: "Visitors" },
            { number: "42", label: "Posts" },
            { number: "∞", label: "Dreams" },
            { number: "90s", label: "Forever" },
          ].map((stat, i) => (
            <div key={i} className={styles.statCard}>
              <div className={styles.statNumber}>{stat.number}</div>
              <div className={styles.statLabel}>{stat.label}</div>
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}

export default RetroSidebar;


