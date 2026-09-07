import Link from "next/link";
import styles from "./RecentPosts.module.css";

export type RecentPostItem = {
    slug: string;
    title: string;
    date: string;
    readTime?: string;
};

function shortDate(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function RecentPosts({ posts }: { posts: RecentPostItem[] }) {
    return (
        <section className={styles.widget} aria-label="Recent posts">
            <h3 className={styles.title}>{">"} recent posts</h3>
            {posts.length === 0 ? (
                <div className={styles.empty}>no posts yet</div>
            ) : (
                <ul className={styles.list}>
                    {posts.map((p) => (
                        <li key={p.slug} className={styles.row}>
                            <Link href={`/blog/${p.slug}`} className={styles.titleLink}>
                                {p.title}
                            </Link>
                            <span className={styles.meta}>
                                {shortDate(p.date)}
                                {p.readTime ? ` • ${p.readTime}` : ""}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default RecentPosts;
