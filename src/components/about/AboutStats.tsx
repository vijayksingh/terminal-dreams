import styles from "./AboutStats.module.css";

export type AboutStat = {
    value: string | number;
    label: string;
};

export function AboutStats({ stats }: { stats: AboutStat[] }) {
    return (
        <section className={styles.widget} aria-label="Site statistics">
            <h3 className={styles.title}>{">"} stats</h3>
            <dl className={styles.grid} role="list">
                {stats.map((s) => (
                    <div key={s.label} className={styles.cell}>
                        <dt className={styles.value}>
                            {typeof s.value === "number"
                                ? s.value.toLocaleString()
                                : s.value}
                        </dt>
                        <dd className={styles.label}>{s.label}</dd>
                    </div>
                ))}
            </dl>
        </section>
    );
}

export default AboutStats;
