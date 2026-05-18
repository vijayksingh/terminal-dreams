"use client";

import { ScanlineOverlay } from "@/components/retro/RetroDecor";
import type { FdMetroMapData, FdSectionSlug } from "@/lib/frontend-design-types";
import { SECTIONS, getStopsForSection } from "@/lib/frontend-design-data";
import { useFdProgress } from "@/hooks/use-fd-progress";
import Link from "next/link";
import styles from "./frontend-design.module.css";

type Props = {
  mapData: FdMetroMapData;
};

function col(token: string): string {
  return `var(${token})`;
}

const KIND_PREFIX: Record<string, string> = {
  overview: "○ ",
  "coding-assignment": "</> ",
  "live-coding": "▶ ",
  "system-design-problem": "✦ ",
};

export function FrontendDesignLanding({ mapData }: Props) {
  const { isComplete, completedStops, progressForSection } = useFdProgress();
  const totalStops = mapData.stops.length;
  const totalDone = completedStops.length;

  return (
    <div className={styles.page}>
      <ScanlineOverlay />

      <nav className={styles.breadcrumb}>
        <Link href="/" className={styles.breadcrumbLink}>~/</Link>
        <span className={styles.breadcrumbSlash}>/</span>
        <span className={styles.breadcrumbCurrent}>frontend-design</span>
      </nav>

      <header className={styles.hero}>
        <h1 className={styles.heroTitle}>
          Frontend<br />System Design
        </h1>
        <p className={styles.heroSub}>
          {SECTIONS.length} sections &middot; {totalStops} topics &middot; from box model to system architecture
        </p>
        <div className={styles.heroDots}>
          {SECTIONS.map((sec) => (
            <a key={sec.slug} href={`#${sec.slug}`} className={styles.heroDot}>
              <span
                className={styles.heroDotCircle}
                style={{ backgroundColor: col(sec.colorToken) }}
              />
              <span className={styles.heroDotLabel}>{sec.shortName}</span>
            </a>
          ))}
        </div>
        {totalDone > 0 && (
          <div className={styles.heroProgress}>
            <span className={styles.heroProgressBar}>
              <span
                className={styles.heroProgressFill}
                style={{ width: `${(totalDone / totalStops) * 100}%` }}
              />
            </span>
            <span className={styles.heroProgressText}>{totalDone}/{totalStops} completed</span>
          </div>
        )}
      </header>

      <div className={styles.sectionsList}>
        {SECTIONS.map((sec) => {
          const stops = getStopsForSection(sec.slug);
          const progress = progressForSection(sec.slug);
          return (
            <section
              key={sec.slug}
              id={sec.slug}
              className={styles.sectionCard}
              style={{ borderLeftColor: col(sec.colorToken) }}
            >
              <div className={styles.sectionHead}>
                <span
                  className={styles.sectionNumber}
                  style={{ color: col(sec.colorToken) }}
                >
                  {String(sec.order).padStart(2, "0")}
                </span>
                <div>
                  <h2 className={styles.sectionName}>{sec.name}</h2>
                  <p className={styles.sectionDesc}>{sec.description}</p>
                </div>
              </div>

              <div className={styles.stopGrid}>
                {stops.map((stop) => {
                  const done = isComplete(stop.id);
                  const prefix = KIND_PREFIX[stop.kind] ?? "";
                  return (
                    <Link
                      key={stop.id}
                      href={`/frontend-design/${stop.slug}`}
                      className={`${styles.stopLink} ${done ? styles.stopDone : ""}`}
                      style={{
                        "--stop-color": col(sec.colorToken),
                      } as React.CSSProperties}
                    >
                      {done && <span className={styles.stopCheck}>✓</span>}
                      {!done && prefix && (
                        <span className={styles.stopKindPrefix}>{prefix}</span>
                      )}
                      {stop.label}
                    </Link>
                  );
                })}
              </div>

              {progress.total > 0 && (
                <div className={styles.sectionProgress}>
                  <span
                    className={styles.sectionProgressBar}
                    style={{
                      "--bar-color": col(sec.colorToken),
                    } as React.CSSProperties}
                  >
                    <span
                      className={styles.sectionProgressFill}
                      style={{ width: `${(progress.completed / progress.total) * 100}%` }}
                    />
                  </span>
                  <span className={styles.sectionProgressText}>
                    {progress.completed}/{progress.total}
                  </span>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
