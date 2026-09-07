"use client";

import { useEffect, useMemo, useState } from "react";
import styles from "./GithubHeatmap.module.css";

type ActivityLevel = 0 | 1 | 2 | 3 | 4;
type ActivityDay = { date: string; count: number; level: ActivityLevel };

type Props = {
    /** Days to request; 91 = ~13 weeks. */
    days?: number;
};

// Sunday-first to match GitHub's calendar.
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

type Week = (ActivityDay | null)[];

function buildWeeks(activity: ActivityDay[]): Week[] {
    if (activity.length === 0) return [];
    const first = new Date(activity[0].date + "T00:00:00Z");
    const startCol = first.getUTCDay(); // 0..6 (Sun..Sat)
    const totalCells = startCol + activity.length;
    const numWeeks = Math.ceil(totalCells / 7);

    const weeks: Week[] = Array.from({ length: numWeeks }, () =>
        Array<ActivityDay | null>(7).fill(null)
    );

    activity.forEach((day, i) => {
        const cellIndex = startCol + i;
        const week = Math.floor(cellIndex / 7);
        const row = cellIndex % 7;
        weeks[week][row] = day;
    });

    return weeks;
}

function formatDate(iso: string): string {
    const d = new Date(iso + "T00:00:00Z");
    const month = d.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
    const day = d.getUTCDate();
    return `${month} ${day}`;
}

function pluralize(n: number, singular: string): string {
    return `${n} ${singular}${n === 1 ? "" : "s"}`;
}

export function GithubHeatmap({ days = 91 }: Props) {
    const [state, setState] = useState<
        | { kind: "loading" }
        | { kind: "ready"; activity: ActivityDay[]; username: string }
        | { kind: "error" }
    >({ kind: "loading" });

    useEffect(() => {
        let cancelled = false;
        fetch(`/api/github/activity?days=${days}`)
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
                if (cancelled) return;
                if (data && Array.isArray(data.activity)) {
                    setState({
                        kind: "ready",
                        activity: data.activity,
                        username: data.username ?? "",
                    });
                } else {
                    setState({ kind: "error" });
                }
            })
            .catch(() => {
                if (!cancelled) setState({ kind: "error" });
            });
        return () => {
            cancelled = true;
        };
    }, [days]);

    const total = useMemo(() => {
        if (state.kind !== "ready") return 0;
        return state.activity.reduce((acc, d) => acc + d.count, 0);
    }, [state]);

    const weeks = useMemo(
        () => (state.kind === "ready" ? buildWeeks(state.activity) : []),
        [state]
    );

    return (
        <section className={styles.widget} aria-label="GitHub activity">
            <div className={styles.header}>
                <h3 className={styles.title}>
                    {">"} GitHub activity — last {days} days
                </h3>
                {state.kind === "ready" ? (
                    <span className={styles.total}>
                        <span className={styles.totalNumber}>{total.toLocaleString()}</span>{" "}
                        {pluralize(total, "contribution")}
                    </span>
                ) : null}
            </div>

            {state.kind === "loading" ? (
                <div className={styles.placeholder}>fetching…</div>
            ) : state.kind === "error" || weeks.length === 0 ? (
                <div className={styles.placeholder}>
                    activity unavailable — try again later
                </div>
            ) : (
                <>
                    <div className={styles.scroll}>
                        <div className={styles.grid}>
                            <div className={styles.weekdayLabels} aria-hidden="true">
                                {WEEKDAY_SHORT.map((label, i) => (
                                    <span
                                        key={label}
                                        className={styles.weekdayLabel}
                                        data-show={i === 1 || i === 3 || i === 5 ? "true" : "false"}
                                    >
                                        {label}
                                    </span>
                                ))}
                            </div>
                            <div className={styles.weeks}>
                                {weeks.map((week, wi) => (
                                    <div className={styles.week} key={wi}>
                                        {week.map((day, di) => {
                                            if (!day) {
                                                return (
                                                    <span
                                                        key={di}
                                                        className={styles.cell}
                                                        data-empty="true"
                                                    />
                                                );
                                            }
                                            const tooltip = `${pluralize(
                                                day.count,
                                                "contribution"
                                            )} on ${formatDate(day.date)}`;
                                            return (
                                                <span
                                                    key={di}
                                                    className={styles.cell}
                                                    data-level={day.level}
                                                    title={tooltip}
                                                    aria-label={tooltip}
                                                />
                                            );
                                        })}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className={styles.legend} aria-hidden="true">
                        <span>Less</span>
                        {[0, 1, 2, 3, 4].map((lvl) => (
                            <span
                                key={lvl}
                                className={`${styles.legendSwatch} ${styles.cell}`}
                                data-level={lvl}
                            />
                        ))}
                        <span>More</span>
                    </div>
                </>
            )}
        </section>
    );
}

export default GithubHeatmap;
