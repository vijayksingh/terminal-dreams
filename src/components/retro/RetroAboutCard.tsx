"use client";

import styles from "./retro.module.css";

type RetroAboutCardProps = {
  name?: string;
  handle?: string;
  tagline?: string;
  nowText?: string;
  usesText?: string;
  webringText?: string;
  lastCommit?: string;
  branch?: string;
  readmePath?: string;
};

export function RetroAboutCard({
  name = "vijay",
  handle = "~/vijay",
  tagline = "tinkers with the web, one commit at a time",
  nowText = "~/now — building small web tools",
  usesText = "~/uses — editor, theme, dotfiles",
  webringText = "~/webring — prev • random • next",
  lastCommit = "b7f4e9",
  branch = "main",
  readmePath = "/colophon",
}: RetroAboutCardProps) {
  const initials = name
    .split(/\s+/)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join("") || "VS";

  return (
    <aside className={styles.aboutCard} aria-label="About the author">
      <div className={styles.aboutHeaderRow}>
        <div className={styles.aboutAvatar}>{initials}</div>
        <div>
          <div className={styles.aboutHandle}>{handle}</div>
          <div className={styles.aboutTagline}>{tagline}</div>
        </div>
      </div>

      <ul className={styles.aboutList}>
        <li className={styles.aboutListItem}>
          <a className={styles.aboutLink} href="#">{nowText}</a>
        </li>
        <li className={styles.aboutListItem}>
          <a className={styles.aboutLink} href="#">{usesText}</a>
        </li>
        <li className={styles.aboutListItem}>
          <a className={styles.aboutLink} href="#">{webringText}</a>
        </li>
      </ul>

      <pre className={styles.divider}>══════════════════════════════════════════════════════════════</pre>

      <div className={styles.aboutMeta}>
        <div>last commit: <span className={styles.aboutMono}>{lastCommit}</span> • {branch}</div>
        <div>readme: <span className={styles.aboutMono}>{readmePath}</span></div>
      </div>
    </aside>
  );
}

export default RetroAboutCard;


