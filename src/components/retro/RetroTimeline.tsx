import Link from "next/link";
import { groupByMonth, shortDateLabel } from "../../../public/utils/helper";
import styles from "./retro.module.css";

export type TimelinePostItem = {
  slug: string;
  title: string;
  date: string; // ISO-like string e.g. 2025-09-01
  category?: string;
  readTime?: string;
};

export function RetroTimeline({ posts }: { posts: TimelinePostItem[] }) {
  const groups = groupByMonth(posts);
  return (
    <div className={styles.timeline}>
      <div className={styles.timelineGrid}>
        <div className={styles.timelineLeft}>
          <span className={styles.timelinePill}>/archive — timeline</span>
        </div>
        <div className={styles.timelineRight}>
          {groups.map((g) => (
            <section key={g.key} className={styles.timelineMonth}>
              <div className={styles.timelineMonthHeader}>
                <span className={styles.timelineRule} />
                <h3 className={styles.timelineMonthTitle}>{g.label}</h3>
                <span className={styles.timelineRule} />
              </div>
              <ul className={styles.timelineList}>
                {g.items.map((p) => (
                  <li key={p.slug} className={styles.timelineRow}>
                    <span className={styles.timelineBadge}>
                      {(p.category ?? "post").toUpperCase()}
                    </span>
                    <Link href={`/blog/${p.slug}`} className={styles.timelineTitle}>
                      {p.title}
                    </Link>
                    <span className={styles.timelineDate}>{shortDateLabel(p.date)}</span>
                    <span className={styles.timelineRead}>{p.readTime ?? ""}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default RetroTimeline;


