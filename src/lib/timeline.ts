export type TimelinePost = {
  slug: string;
  title: string;
  date: string;
  category?: string;
  readTime?: string;
  kind: "post" | "recipe";
  series?: string;
  part?: number;
};

export type TimelineGroup = {
  key: string;
  label: string;
  items: TimelinePost[];
};

function parseDate(dateStr: string): Date | null {
  const parsed = new Date(dateStr);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatMonthLabel(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return "Unknown Date";

  const month = date.toLocaleString("en-US", { month: "long" });
  const year = date.getFullYear();
  return `${month} ${year}`;
}

export function shortDateLabel(dateStr: string): string {
  const date = parseDate(dateStr);
  if (!date) return "-- --";

  const month = date.toLocaleString("en-US", { month: "short" });
  const day = date.getDate().toString().padStart(2, "0");
  return `${month} ${day}`;
}

export function groupByMonth(posts: TimelinePost[]): TimelineGroup[] {
  const groupsByKey: Record<string, TimelineGroup> = {};

  posts.forEach((post) => {
    const parsedDate = parseDate(post.date);
    const key = parsedDate
      ? `${parsedDate.getFullYear()}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`
      : "unknown-date";

    if (!groupsByKey[key]) {
      groupsByKey[key] = { key, label: formatMonthLabel(post.date), items: [] };
    }

    groupsByKey[key].items.push(post);
  });

  return Object.values(groupsByKey)
    .sort((a, b) => (a.key > b.key ? -1 : 1))
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => {
        const aDate = parseDate(a.date)?.getTime() ?? 0;
        const bDate = parseDate(b.date)?.getTime() ?? 0;
        return bDate - aDate;
      }),
    }));
}
