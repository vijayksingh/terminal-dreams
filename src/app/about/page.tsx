import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import RetroFooter from "@/components/retro/RetroFooter";
import retro from "@/components/retro/retro.module.css";
import styles from "./about.module.css";

import { getBlogListItems } from "@/lib/posts";
import { getAllRecipeSlugs } from "@/lib/cookbook";
import { getServerClient } from "@/lib/pocketbase";
import { readProfile } from "@/lib/site-profile";
import { readCounter } from "@/lib/site-metrics";
import { fetchRecentCommits, fetchRepoSummary } from "@/lib/github-repo";

import { AboutStats } from "@/components/about/AboutStats";
import { GithubHeatmap } from "@/components/about/GithubHeatmap";
import { RecentCommits } from "@/components/about/RecentCommits";
import { RecentPosts } from "@/components/about/RecentPosts";

export const revalidate = 600; // 10 min — page mixes PB live data + cached GitHub

// All server-side fetches are wrapped so a single failure doesn't blank the page.
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
    try {
        return await fn();
    } catch (e) {
        console.error("about page data load failed:", e);
        return fallback;
    }
}

export default async function AboutPage() {
    const [profile, posts, visitors, commits, repo] = await Promise.all([
        safe(async () => {
            const pb = await getServerClient();
            return readProfile(pb);
        }, {} as Record<string, string>),
        safe(getBlogListItems, []),
        safe(async () => {
            const pb = await getServerClient();
            return readCounter(pb, "visitors");
        }, 0),
        safe(() => fetchRecentCommits(5), []),
        safe(fetchRepoSummary, null),
    ]);

    const recipesCount = getAllRecipeSlugs().length;
    const postsCount = posts.length;
    const since = profile.since_year || "2025";
    const bio =
        profile.bio ||
        "I build small web things — interactive blog posts, recipe playgrounds, browser-native IDEs. This site is my workshop.";
    const handle = profile.handle || "~/vijay";
    const name = profile.name || "vijay";

    const stats = [
        { value: visitors, label: "Visitors" },
        { value: postsCount, label: "Posts" },
        { value: recipesCount, label: "Recipes" },
        { value: repo?.stars ?? 0, label: "GitHub Stars" },
        { value: since, label: "Since" },
    ];

    const latestPosts = [...posts]
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 3)
        .map((p) => ({
            slug: p.slug,
            title: p.title,
            date: p.date,
            readTime: p.readTime,
        }));

    return (
        <div className={retro.container}>
            <BreadcrumbBar items={[{ label: "about" }]} />
            <div className={retro.main}>
                <main className={styles.page}>
                    <header className={styles.hero}>
                        <h1 className={retro.title}>About</h1>
                        <p className={retro.subtitle}>{`// ${handle} — ${name}`}</p>
                        <p className={styles.bio}>{bio}</p>
                    </header>

                    <AboutStats stats={stats} />

                    <GithubHeatmap days={91} />

                    <div className={styles.twoColumn}>
                        <RecentCommits commits={commits} />
                        <RecentPosts posts={latestPosts} />
                    </div>
                </main>
            </div>
            <RetroFooter />
        </div>
    );
}
