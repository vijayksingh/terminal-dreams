"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { getCategoryIllustration } from "./CategoryIllustrations";
import { TRANSITION } from "@/lib/motion";
import type { CategoryInfo, CookbookRecipe } from "@/lib/cookbook-types";

interface CategoryGridProps {
  categories: CategoryInfo[];
  recipeCounts: Array<{
    category: string;
    count: number;
    recipes: CookbookRecipe[];
  }>;
}

export function CategoryGrid({ categories, recipeCounts }: CategoryGridProps) {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const expandedData = expandedCategory
    ? recipeCounts.find((rc) => rc.category === expandedCategory)
    : null;

  const expandedInfo = expandedCategory
    ? categories.find((c) => c.slug === expandedCategory)
    : null;

  return (
    <div>
      {/* Category cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const data = recipeCounts.find((rc) => rc.category === category.slug);
          const isExpanded = expandedCategory === category.slug;
          return (
            <button
              key={category.slug}
              onClick={() => setExpandedCategory(isExpanded ? null : category.slug)}
              className={`group relative w-full rounded-lg border p-4 text-left transition-all ${
                isExpanded
                  ? "border-[var(--color-muted)] bg-[var(--color-surface)]"
                  : "border-[var(--color-border)] bg-[var(--color-surface-2)] hover:border-[var(--color-muted)]"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="mb-1 font-bold text-[var(--color-text)]">
                    {category.name}
                  </h2>
                  <p className="mb-2 text-xs leading-relaxed text-[var(--color-muted)]">
                    {category.description}
                  </p>
                  <span className="text-xs text-[var(--color-muted)]">
                    {data?.count ?? 0} recipes
                  </span>
                </div>
                <div className="flex-shrink-0 opacity-30 transition-opacity group-hover:opacity-50">
                  {getCategoryIllustration(category.slug, "var(--color-muted)")}
                </div>
              </div>

              {isExpanded && (
                <div className="absolute -bottom-[7px] left-1/2 -translate-x-1/2">
                  <div
                    className="h-3 w-3 rotate-45 border-b border-r"
                    style={{
                      borderColor: "var(--color-muted)",
                      backgroundColor: "var(--color-surface-2)",
                    }}
                  />
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Expanded recipe list — compact rows, not cards */}
      <AnimatePresence mode="wait">
        {expandedCategory && expandedData && expandedInfo && (
          <motion.div
            key={expandedCategory}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={TRANSITION.collapse}
            className="overflow-hidden"
          >
            <div
              className="mt-2 rounded-lg border"
              style={{
                borderColor: "var(--color-muted)",
                backgroundColor: "var(--color-surface-2)",
              }}
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-[var(--color-border)] px-5 py-3">
                <h3
                  className="text-xs uppercase tracking-widest text-[var(--color-muted)]"
                  style={{ fontFamily: "var(--font-mono)" }}
                >
                  {expandedInfo.name} — {expandedData.count} recipes
                </h3>
                <button
                  onClick={() => setExpandedCategory(null)}
                  className="text-xs text-[var(--color-muted)] transition-colors hover:text-[var(--color-text)]"
                >
                  ✕
                </button>
              </div>

              {/* Recipe rows */}
              <div className="divide-y divide-[var(--color-border)]">
                {expandedData.recipes.map((recipe) => (
                  <Link
                    key={recipe.slug}
                    href={`/cookbook/${recipe.slug}`}
                    className="flex items-center gap-4 px-5 py-3 transition-colors hover:bg-[var(--color-surface)]"
                  >
                    <span className="flex-1 font-medium text-sm text-[var(--color-text)]">
                      {recipe.title}
                    </span>
                    <span className="text-xs text-[var(--color-muted)] whitespace-nowrap">
                      {recipe.meta.totalTime} min
                    </span>
                    <span className="text-xs text-[var(--color-muted)] whitespace-nowrap w-20 text-right">
                      {recipe.meta.difficulty}
                    </span>
                    <span className="text-[var(--color-muted)]">→</span>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
