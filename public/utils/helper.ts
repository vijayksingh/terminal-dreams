import { TimelinePostItem } from "@/components/retro/RetroTimeline";

export type Group = {
  key: string;
  label: string;
  items: TimelinePostItem[];
};

function formatMonthLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.toLocaleString("en-US", { month: "long" });
  const year = d.getFullYear();
  return `${month} ${year}`;
}

export function dayFromDate(dateStr: string): string {
  const d = new Date(dateStr);
  const day = d.getDate();
  return day.toString().padStart(2, "0");
}

export function shortDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const month = d.toLocaleString("en-US", { month: "short" });
  const day = d.getDate().toString().padStart(2, "0");
  return `${month} ${day}`;
}

export function groupByMonth(posts: TimelinePostItem[]): Group[] {
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
