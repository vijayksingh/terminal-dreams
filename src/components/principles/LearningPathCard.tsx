import Link from "next/link";
import type { LearningPath } from "@/lib/principle-types";
import styles from "./principles.module.css";

export function LearningPathCard({ path }: { path: LearningPath }) {
  return (
    <Link
      href={`/principles/path/${path.slug}`}
      className={styles.relatedCard}
    >
      <h3 className={styles.relatedCardTitle}>{path.name}</h3>
      <p className={styles.relatedCardSummary}>
        {path.description}
      </p>
      <p
        style={{
          margin: "var(--space-2) 0 0",
          fontFamily: "var(--font-mono)",
          fontSize: "var(--text-xs)",
          color: "var(--color-muted)",
        }}
      >
        {path.principles.length} principle{path.principles.length !== 1 ? "s" : ""} →
      </p>
    </Link>
  );
}
