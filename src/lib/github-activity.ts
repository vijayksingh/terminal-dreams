/**
 * GitHub contribution-graph fetcher.
 *
 * GitHub's official REST API doesn't expose the contribution calendar; only
 * the GraphQL API does, and that requires a PAT. To keep the about page
 * deploy-free we proxy through a public community endpoint that scrapes the
 * SVG calendar and returns daily totals as JSON.
 *
 * Endpoint:  https://github-contributions-api.jogruber.de/v4/<user>?y=last
 * Shape:     { total: {...}, contributions: [{ date, count, level }, ...] }
 * Levels:    0..4, matching GitHub's own colour bucketing.
 *
 * If the upstream is down we surface an empty list -- the heatmap renders a
 * blank grid rather than throwing.
 */

export type ActivityLevel = 0 | 1 | 2 | 3 | 4;

export type ActivityDay = {
    date: string; // YYYY-MM-DD
    count: number;
    level: ActivityLevel;
};

const ENDPOINT = "https://github-contributions-api.jogruber.de/v4";

function clampLevel(value: unknown): ActivityLevel {
    const n = typeof value === "number" ? value : 0;
    if (n >= 4) return 4;
    if (n >= 1) return Math.floor(n) as ActivityLevel;
    return 0;
}

function isValidDate(value: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

export async function fetchActivity(
    username: string,
    days: number
): Promise<ActivityDay[]> {
    const safe = username.replace(/[^a-zA-Z0-9-]/g, "");
    if (!safe) return [];

    const url = `${ENDPOINT}/${safe}?y=last`;
    let res: Response;
    try {
        res = await fetch(url, {
            // Tag for Next's data cache; revalidates hourly.
            next: { revalidate: 3600, tags: ["github-activity"] },
            headers: { Accept: "application/json" },
        });
    } catch (e) {
        console.error("github activity fetch failed:", e);
        return [];
    }
    if (!res.ok) {
        console.error(`github activity fetch failed: ${res.status}`);
        return [];
    }

    const data = (await res.json()) as {
        contributions?: Array<{ date: string; count: number; level?: number }>;
    };
    const all = data.contributions ?? [];

    // Sort ascending by date (the upstream returns ascending but defensive).
    const sorted = all
        .filter((d) => isValidDate(d.date))
        .sort((a, b) => a.date.localeCompare(b.date));

    // Trim to the last `days` entries ending today (or the last day reported).
    const tail = sorted.slice(-days);

    return tail.map((d) => ({
        date: d.date,
        count: Math.max(0, Math.floor(d.count ?? 0)),
        level: clampLevel(d.level),
    }));
}
