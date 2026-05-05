import Link from "next/link";
import { groupByMonth, shortDateLabel, type TimelinePost } from "@/lib/timeline";
import styles from "./RetroTimeline.module.css";

export type TimelinePostItem = TimelinePost;

// ── Series grouping ─────────────────────────────────────────────────

type TimelineEntry =
  | { type: "single"; item: TimelinePost }
  | {
      type: "series";
      seriesId: string;
      seriesTitle: string;
      date: string;
      items: TimelinePost[];
    };

function groupSeries(items: TimelinePost[]): TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const seen = new Set<string>();

  const seriesMap = new Map<string, TimelinePost[]>();
  for (const item of items) {
    if (item.series) {
      const list = seriesMap.get(item.series) ?? [];
      list.push(item);
      seriesMap.set(item.series, list);
    }
  }

  for (const item of items) {
    if (item.series) {
      if (seen.has(item.series)) continue;
      seen.add(item.series);
      const parts = seriesMap
        .get(item.series)!
        .sort((a, b) => (a.part ?? 0) - (b.part ?? 0));
      const dashIdx = parts[0].title.indexOf(" — ");
      const seriesTitle =
        dashIdx >= 0 ? parts[0].title.slice(0, dashIdx) : parts[0].title;
      entries.push({
        type: "series",
        seriesId: item.series,
        seriesTitle,
        date: parts[0].date,
        items: parts,
      });
    } else {
      entries.push({ type: "single", item });
    }
  }

  return entries;
}

function partSubtitle(title: string): string {
  const idx = title.indexOf(" — ");
  return idx >= 0 ? title.slice(idx + 3) : title;
}

// ── Component ─────────────────────────────────────────────────────

export function RetroTimeline({ posts }: { posts: TimelinePostItem[] }) {
  const groups = groupByMonth(posts);
  return (
    <div className={styles.timeline}>
      <div className={styles.timelineGrid}>
        <div className={styles.timelineLeft}>
          <span className={styles.timelinePill}>/archive — timeline</span>
        </div>
        <div className={styles.timelineRight}>
          {groups.map((g) => {
            const entries = groupSeries(g.items);
            return (
              <section key={g.key} className={styles.timelineMonth}>
                <div className={styles.timelineMonthHeader}>
                  <span className={styles.timelineRule} />
                  <h3 className={styles.timelineMonthTitle}>{g.label}</h3>
                  <span className={styles.timelineRule} />
                </div>
                <ul className={styles.timelineList}>
                  {entries.map((entry) => {
                    if (entry.type === "single") {
                      const p = entry.item;
                      return (
                        <li key={p.slug} className={styles.timelineRow}>
                          <span className={styles.timelineBadge}>
                            {p.kind === "recipe"
                              ? "RECIPE"
                              : (p.category ?? "post").toUpperCase()}
                          </span>
                          <Link
                            href={
                              p.kind === "recipe"
                                ? `/recipes/${p.slug}`
                                : `/blog/${p.slug}`
                            }
                            className={styles.timelineTitle}
                          >
                            {p.title}
                          </Link>
                          <span className={styles.timelineDate}>
                            {shortDateLabel(p.date)}
                          </span>
                          <span className={styles.timelineRead}>
                            {p.readTime ?? ""}
                          </span>
                        </li>
                      );
                    }

                    return (
                      <li key={entry.seriesId} className={styles.seriesCard}>
                        <div className={styles.seriesHeader}>
                          <span className={styles.seriesBadge}>SERIES</span>
                          <span className={styles.seriesTitle}>
                            {entry.seriesTitle}
                          </span>
                          <span className={styles.timelineDate}>
                            {shortDateLabel(entry.date)}
                          </span>
                          <span className={styles.seriesCount}>
                            {entry.items.length} parts
                          </span>
                        </div>
                        <div className={styles.seriesParts}>
                          {entry.items.map((p) => (
                            <Link
                              key={p.slug}
                              href={`/recipes/${entry.seriesId}#phase-${p.part ?? 1}`}
                              className={styles.seriesPartRow}
                            >
                              <span className={styles.seriesPartNum}>
                                {String(p.part ?? 0).padStart(2, "0")}
                              </span>
                              <span className={styles.seriesPartTitle}>
                                {partSubtitle(p.title)}
                              </span>
                              <span className={styles.seriesPartMeta}>
                                {p.readTime ?? ""}
                              </span>
                            </Link>
                          ))}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default RetroTimeline;
