"use client";

import { useEffect, useState } from "react";
import styles from "./retro.module.css";

type RetroAboutCardProps = {
  // Optional overrides — when supplied they win over the fetched profile.
  // Mostly useful for tests / Storybook-style isolated renders.
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

type ProfileState = {
  name: string;
  handle: string;
  tagline: string;
  now: string;
  uses: string;
  webring: string;
  readme: string;
};

// Defaults shown until /api/site/profile responds. Match the previously
// hardcoded copy so the first paint looks identical even when PB is offline.
const DEFAULTS: ProfileState = {
  name: "vijay",
  handle: "~/vijay",
  tagline: "tinkers with the web, one commit at a time",
  now: "~/now — building small web tools",
  uses: "~/uses — editor, theme, dotfiles",
  webring: "~/webring — prev • random • next",
  readme: "/colophon",
};

function pick(map: Record<string, string>, key: keyof ProfileState): string {
  const value = map[key];
  return typeof value === "string" && value.length > 0 ? value : DEFAULTS[key];
}

export function RetroAboutCard({
  name,
  handle,
  tagline,
  nowText,
  usesText,
  webringText,
  lastCommit,
  branch,
  readmePath,
}: RetroAboutCardProps) {
  const [profile, setProfile] = useState<ProfileState>(DEFAULTS);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/site/profile")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled || !data?.profile) return;
        const map = data.profile as Record<string, string>;
        setProfile({
          name: pick(map, "name"),
          handle: pick(map, "handle"),
          tagline: pick(map, "tagline"),
          now: pick(map, "now"),
          uses: pick(map, "uses"),
          webring: pick(map, "webring"),
          readme: pick(map, "readme"),
        });
      })
      .catch(() => {
        /* keep defaults */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const finalName = name ?? profile.name;
  const finalHandle = handle ?? profile.handle;
  const finalTagline = tagline ?? profile.tagline;
  const finalNow = nowText ?? profile.now;
  const finalUses = usesText ?? profile.uses;
  const finalWebring = webringText ?? profile.webring;
  const finalReadme = readmePath ?? profile.readme;

  const envCommit = process.env.NEXT_PUBLIC_GIT_COMMIT ?? "";
  const envBranch = process.env.NEXT_PUBLIC_GIT_BRANCH ?? "";
  const finalCommit = lastCommit ?? (envCommit || "unknown");
  const finalBranch = branch ?? (envBranch || "main");

  const initials =
    finalName
      .split(/\s+/)
      .map((p) => p[0]?.toUpperCase())
      .slice(0, 2)
      .join("") || "VS";

  return (
    <aside className={styles.aboutCard} aria-label="About the author">
      <div className={styles.aboutHeaderRow}>
        <div className={styles.aboutAvatar}>{initials}</div>
        <div>
          <div className={styles.aboutHandle}>{finalHandle}</div>
          <div className={styles.aboutTagline}>{finalTagline}</div>
        </div>
      </div>

      <ul className={styles.aboutList}>
        <li className={styles.aboutListItem}>
          <span className={styles.aboutLink}>{finalNow}</span>
        </li>
        <li className={styles.aboutListItem}>
          <span className={styles.aboutLink}>{finalUses}</span>
        </li>
        <li className={styles.aboutListItem}>
          <span className={styles.aboutLink}>{finalWebring}</span>
        </li>
      </ul>

      <pre className={styles.divider}>══════════════════════════════════════════════════════════════</pre>

      <div className={styles.aboutMeta}>
        <div>last commit: <span className={styles.aboutMono}>{finalCommit}</span> • {finalBranch}</div>
        <div>readme: <span className={styles.aboutMono}>{finalReadme}</span></div>
      </div>
    </aside>
  );
}

export default RetroAboutCard;
