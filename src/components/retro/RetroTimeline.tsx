import Link from "next/link";
import styles from "./retro.module.css";

export type TimelinePostItem = {
  slug: string;
  title: string;
  date: string; // ISO-like string e.g. 2025-09-01
  category?: string;
  readTime?: string;
};

type Group = {
  key: string; // e.g. 2025-09
  label: string; // e.g. September 2025
  items: TimelinePostItem[];
};

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `${month} ${year}`;
}

// kept for potential future use
// function dayFromDate(dateStr: string): string {
//   const d = new Date(dateStr);
//   const day = d.getDate();
//   return day.toString().padStart(2, "0");
// }

function shortDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate().toString().padStart(2, "0");
  return `${month} ${day}`;
}

function groupByMonth(posts: TimelinePostItem[]): Group[] {
  const map: Record<string, Group> = {};
  posts.forEach((p) => {
    const d = new Date(p.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (!map[key]) {
      map[key] = { key, label: formatMonthLabel(p.date), items: [] };
    }
    map[key].items.push(p);
  });
  // Sort groups by date desc and items by date desc
  return Object.values(map)
    .sort((a, b) => (a.key > b.key ? -1 : 1))
    .map((g) => ({
      ...g,
      items: g.items.sort((a, b) => (a.date > b.date ? -1 : 1)),
    }));
}

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


