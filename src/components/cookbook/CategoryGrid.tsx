"use client";

import { CategoryCard } from "./CategoryCard";
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
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {categories.map((category) => {
        const data = recipeCounts.find((rc) => rc.category === category.slug);
        return (
          <CategoryCard
            key={category.slug}
            category={category}
            recipeCount={data?.count ?? 0}
            recipes={data?.recipes ?? []}
          />
        );
      })}
    </div>
  );
}
