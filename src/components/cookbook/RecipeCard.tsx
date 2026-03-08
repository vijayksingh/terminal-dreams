"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import type { CookbookRecipe } from "@/lib/cookbook-types";

interface RecipeCardProps {
  recipe: CookbookRecipe;
  accentColor: string;
}

export function RecipeCard({ recipe, accentColor }: RecipeCardProps) {
  const difficultyColors = {
    beginner: "#a89379",
    intermediate: "#b8a690",
    advanced: "#9d8b72",
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      transition={{ duration: 0.2 }}
    >
      <Link
        href={`/cookbook/${recipe.slug}`}
        className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--accent-weak)] hover:shadow-md"
      >
        <h3 className="mb-2 font-semibold text-[var(--color-text)]">
          {recipe.title}
        </h3>

        <p className="mb-3 line-clamp-2 text-sm text-[var(--color-muted)]">
          {recipe.description}
        </p>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Time badge */}
          <span
            className="rounded-full px-2 py-1"
            style={{
              backgroundColor: `${accentColor}15`,
              color: accentColor,
            }}
          >
            ⏱ {recipe.meta.totalTime} min
          </span>

          {/* Difficulty badge */}
          <span
            className="rounded-full px-2 py-1"
            style={{
              backgroundColor: `${difficultyColors[recipe.meta.difficulty]}15`,
              color: difficultyColors[recipe.meta.difficulty],
            }}
          >
            {recipe.meta.difficulty}
          </span>

          {/* Cuisine badge */}
          {recipe.meta.cuisine && (
            <span className="rounded-full bg-[var(--color-surface-2)] px-2 py-1 text-[var(--color-muted)]">
              {recipe.meta.cuisine}
            </span>
          )}

          {/* Servings */}
          <span className="text-[var(--color-muted)]">
            👥 {recipe.meta.servings}
          </span>
        </div>

        {/* Tags */}
        {recipe.meta.tags && recipe.meta.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {recipe.meta.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs text-[var(--color-muted)]"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </Link>
    </motion.div>
  );
}
