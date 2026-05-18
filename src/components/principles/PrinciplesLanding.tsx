"use client";

import { useState } from "react";
import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import { ScanlineOverlay } from "@/components/retro/RetroDecor";
import { RetroFooter } from "@/components/retro/RetroFooter";
import styles from "@/components/retro/retro.module.css";
import type { GraphData, LearningPath, PrincipleCategory, CategoryInfo } from "@/lib/principle-types";
import { KnowledgeGraph } from "./KnowledgeGraph";
import { CategoryFilterBar } from "./CategoryFilterBar";
import { LearningPathCard } from "./LearningPathCard";

export function PrinciplesLanding({
  graphData,
  learningPaths,
  categories,
}: {
  graphData: GraphData;
  learningPaths: LearningPath[];
  categories: CategoryInfo[];
}) {
  const [activeCategory, setActiveCategory] =
    useState<PrincipleCategory | null>(null);

  const activePaths = learningPaths.filter((lp) => lp.principles.length > 0);

  return (
    <div className={styles.container}>
      <ScanlineOverlay />
      <BreadcrumbBar items={[{ label: "principles" }]} />

      <main
        style={{
          padding: "var(--space-6) var(--space-4)",
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <h1
          className={styles.title}
          style={{ marginBottom: "var(--space-2)" }}
        >
          {"// Design Principles"}
        </h1>
        <p
          className="text-sm font-mono mb-6"
          style={{ color: "var(--color-muted)" }}
        >
          A living knowledge base — click a node to explore, filter by category.
        </p>

        <KnowledgeGraph
          graphData={graphData}
          activeCategory={activeCategory}
        />

        <CategoryFilterBar
          categories={categories}
          activeCategory={activeCategory}
          onChange={setActiveCategory}
        />

        {activePaths.length > 0 && (
          <section style={{ marginTop: "var(--space-6)" }}>
            <h2
              className="font-mono text-xs uppercase tracking-widest mb-4"
              style={{ color: "var(--color-muted)", letterSpacing: "0.15em" }}
            >
              Learning Paths
            </h2>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: "var(--space-4)",
              }}
            >
              {activePaths.map((lp) => (
                <LearningPathCard key={lp.slug} path={lp} />
              ))}
            </div>
          </section>
        )}
      </main>

      <RetroFooter />
    </div>
  );
}
