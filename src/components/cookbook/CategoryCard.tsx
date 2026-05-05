"use client";

import { motion, AnimatePresence } from "framer-motion";
import { RecipeCard } from "./RecipeCard";
import { getCategoryIllustration } from "./CategoryIllustrations";
import type { CategoryInfo, CookbookRecipe } from "@/lib/cookbook-types";
import { TRANSITION } from "@/lib/motion";

interface CategoryCardProps {
  category: CategoryInfo;
  recipeCount: number;
  recipes: CookbookRecipe[];
  isExpanded: boolean;
  onToggle: () => void;
}

export function CategoryCard({ category, recipeCount, recipes, isExpanded, onToggle }: CategoryCardProps) {
  return (
    <motion.div
      className="group relative overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-2)] shadow-sm transition-all hover:border-[var(--color-accent)] hover:shadow-lg"
    >
      <motion.button
        onClick={onToggle}
        className="w-full p-6 text-left"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h2 className="mb-2 text-xl font-bold text-[var(--color-text)]">
              {category.name}
            </h2>
            <p className="mb-3 text-sm text-[var(--color-muted)]">
              {category.description}
            </p>
            <div className="flex items-center gap-2 text-xs">
              <span className="rounded-full border border-[var(--color-border)] px-3 py-1 font-medium text-[var(--color-muted)]">
                {recipeCount} {recipeCount === 1 ? "recipe" : "recipes"}
              </span>
            </div>
          </div>

          <div className="transition-transform group-hover:scale-110">
            {getCategoryIllustration(category.slug, "var(--color-muted)")}
          </div>
        </div>

        <div className="mt-3 text-sm text-[var(--color-muted)] group-hover:text-[var(--color-accent)] transition-colors">
          {isExpanded ? "▲ Collapse" : "▼ Explore recipes"}
        </div>
      </motion.button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={TRANSITION.collapse}
            className="overflow-hidden border-t border-[var(--color-border)]"
          >
            <div className="grid gap-3 p-4 sm:grid-cols-2">
              {recipes.map((recipe) => (
                <RecipeCard key={recipe.slug} recipe={recipe} accentColor="var(--color-accent)" />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
