import type { RepoCommit } from "@/lib/github-repo";
import styles from "./RecentCommits.module.css";

function shortDate(iso: string): string {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
    });
}

export function RecentCommits({ commits }: { commits: RepoCommit[] }) {
    return (
        <section className={styles.widget} aria-label="Recent commits">
            <h3 className={styles.title}>{">"} recent commits</h3>
            {commits.length === 0 ? (
                <div className={styles.empty}>commits unavailable</div>
            ) : (
                <ul className={styles.list}>
                    {commits.map((c) => (
                        <li key={c.sha} className={styles.row}>
                            <a
                                href={c.url}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.sha}
                                aria-label={`commit ${c.short}`}
                            >
                                {c.short}
                            </a>
                            <a
                                href={c.url}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.message}
                                title={c.message}
                            >
                                {c.message}
                            </a>
                            <span className={styles.date}>{shortDate(c.date)}</span>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

export default RecentCommits;
