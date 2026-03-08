import { getCategories, getRecipesByCategory } from "@/lib/cookbook";
import { CategoryGrid } from "@/components/cookbook/CategoryGrid";
import { AmbientCanvas } from "@/components/cookbook/AmbientCanvas";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookbook | Kitchen Recipe Playground",
  description: "Explore recipes across curries, street food, drinks, sweets, and quick meals. Indian-forward cooking with a whimsical twist.",
};

export default async function CookbookIndexPage() {
  const categories = getCategories();

  // Fetch recipes per category for counts
  const recipeCounts = await Promise.all(
    categories.map(async (category) => {
      const recipes = await getRecipesByCategory(category.slug);
      return {
        category: category.slug,
        count: recipes.length,
        recipes,
      };
    })
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--color-surface)]">
      {/* Ambient canvas effects (progressive enhancement) */}
      <AmbientCanvas />

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-12 text-center">
          <h1 className="mb-4 font-serif text-5xl font-bold tracking-tight text-[var(--color-text)] sm:text-6xl lg:text-7xl">
            The Kitchen Cookbook
          </h1>
          <p className="mx-auto max-w-2xl text-lg text-[var(--color-muted)] sm:text-xl">
            Indian-forward recipes that sing. From curries to cocktails, street food to sweets —
            cooking as a performance, not a chore.
          </p>
        </header>

        {/* Category Grid */}
        <CategoryGrid categories={categories} recipeCounts={recipeCounts} />

        {/* Food Trivia Footer */}
        <footer className="mt-16 border-t border-[var(--color-border)] pt-8 text-center">
          <p className="text-sm italic text-[var(--color-muted)]">
            &ldquo;Cooking is like love. It should be entered into with abandon or not at all.&rdquo;
            <span className="block mt-1">— Harriet Van Horne</span>
          </p>
        </footer>
      </div>
    </div>
  );
}
