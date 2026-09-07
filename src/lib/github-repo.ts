/**
 * Tiny wrapper over GitHub's public REST API for the about page widgets.
 *
 * We use the unauthenticated endpoints and rely on Next's fetch cache to
 * keep requests well below the 60/hour anonymous rate limit -- one fetch
 * per hour per data point is plenty for a personal site.
 */

const API = "https://api.github.com";
const DEFAULT_REPO = "vijayksingh/terminal-dreams";

export type RepoCommit = {
    sha: string;
    short: string;
    message: string;
    date: string;
    url: string;
};

export type RepoSummary = {
    stars: number;
    forks: number;
    pushedAt: string;
};

function resolveRepo(): string {
    if (process.env.GITHUB_REPO) return process.env.GITHUB_REPO;
    return DEFAULT_REPO;
}

function firstLine(s: string): string {
    const idx = s.indexOf("\n");
    return idx >= 0 ? s.slice(0, idx) : s;
}

export async function fetchRecentCommits(limit = 5): Promise<RepoCommit[]> {
    const repo = resolveRepo();
    const url = `${API}/repos/${repo}/commits?per_page=${Math.max(1, Math.min(20, limit))}`;
    try {
        const res = await fetch(url, {
            next: { revalidate: 3600, tags: ["github-repo"] },
            headers: { Accept: "application/vnd.github+json" },
        });
        if (!res.ok) return [];
        const data = (await res.json()) as Array<{
            sha: string;
            html_url: string;
            commit: { message: string; author?: { date?: string } };
        }>;
        return data.map((c) => ({
            sha: c.sha,
            short: c.sha.slice(0, 7),
            message: firstLine(c.commit.message ?? ""),
            date: c.commit.author?.date ?? "",
            url: c.html_url,
        }));
    } catch (e) {
        console.error("github commits fetch failed:", e);
        return [];
    }
}

export async function fetchRepoSummary(): Promise<RepoSummary | null> {
    const repo = resolveRepo();
    const url = `${API}/repos/${repo}`;
    try {
        const res = await fetch(url, {
            next: { revalidate: 3600, tags: ["github-repo"] },
            headers: { Accept: "application/vnd.github+json" },
        });
        if (!res.ok) return null;
        const data = (await res.json()) as {
            stargazers_count?: number;
            forks_count?: number;
            pushed_at?: string;
        };
        return {
            stars: data.stargazers_count ?? 0,
            forks: data.forks_count ?? 0,
            pushedAt: data.pushed_at ?? "",
        };
    } catch (e) {
        console.error("github repo fetch failed:", e);
        return null;
    }
}
