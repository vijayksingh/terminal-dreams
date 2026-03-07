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
    beginner: "#7FA548",
    intermediate: "#E8B339",
    advanced: "#D64933",
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
        className="block rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] p-4 transition-all hover:border-[var(--color-border-hover)] hover:shadow-md"
      >
        <h3 className="mb-2 font-semibold text-[var(--color-text)]">
          {recipe.title}
        </h3>

        <p className="mb-3 line-clamp-2 text-sm text-[var(--color-text-secondary)]">
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
            <span className="rounded-full bg-[var(--color-surface-secondary)] px-2 py-1 text-[var(--color-text-secondary)]">
              {recipe.meta.cuisine}
            </span>
          )}

          {/* Servings */}
          <span className="text-[var(--color-text-secondary)]">
            👥 {recipe.meta.servings}
          </span>
        </div>

        {/* Tags */}
        {recipe.meta.tags && recipe.meta.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {recipe.meta.tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-xs text-[var(--color-text-secondary)]"
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
