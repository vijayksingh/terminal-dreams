"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { TRANSITION, STAGGER } from "@/lib/motion";
import type { PrincipleListItem } from "@/lib/principle-types";
import { CategoryChip } from "./CategoryChip";
import styles from "./principles.module.css";

export function RelatedPrincipleCards({
  principles,
}: {
  principles: PrincipleListItem[];
}) {
  const prefersReducedMotion = usePrefersReducedMotion();

  if (principles.length === 0) return null;

  return (
    <section className={styles.relatedSection}>
      <h2 className={styles.relatedTitle}>Related Principles</h2>
      <div className={styles.relatedGrid}>
        {principles.map((p, i) =>
          prefersReducedMotion ? (
            <Link
              key={p.slug}
              href={`/principles/${p.slug}`}
              className={styles.relatedCard}
            >
              <CardContent principle={p} />
            </Link>
          ) : (
            <motion.div
              key={p.slug}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{
                ...TRANSITION.enterCard,
                delay: i * STAGGER.fast,
              }}
            >
              <Link
                href={`/principles/${p.slug}`}
                className={styles.relatedCard}
              >
                <CardContent principle={p} />
              </Link>
            </motion.div>
          )
        )}
      </div>
    </section>
  );
}

function CardContent({ principle }: { principle: PrincipleListItem }) {
  return (
    <>
      <h3 className={styles.relatedCardTitle}>{principle.title}</h3>
      <p className={styles.relatedCardSummary}>{principle.summary}</p>
      <div style={{ marginTop: "var(--space-2)", display: "flex", gap: "var(--space-1)", flexWrap: "wrap" }}>
        {principle.categories.map((cat) => (
          <CategoryChip key={cat} category={cat} linked={false} />
        ))}
      </div>
    </>
  );
}
