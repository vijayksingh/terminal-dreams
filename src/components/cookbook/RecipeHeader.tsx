import type { CookbookRecipe } from "@/lib/cookbook-types";
import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";

interface RecipeHeaderProps {
  recipe: CookbookRecipe;
}

export function RecipeHeader({ recipe }: RecipeHeaderProps) {
  const { title, description, meta } = recipe;

  const difficultyColors = {
    beginner: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    intermediate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400",
    advanced: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",
  };

  return (
    <>
      <BreadcrumbBar items={[{ label: "cookbook", href: "/cookbook" }, { label: title }]} />

      <div className="border-b border-[var(--color-border)] bg-[var(--color-bg)] px-6 py-6 md:px-8">
        <div className="mx-auto max-w-7xl">
          <h1
            className="font-display text-3xl font-bold text-[var(--color-text)] md:text-4xl lg:text-5xl"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {title}
          </h1>
          <p className="mt-2 text-base text-[var(--color-muted)] md:text-lg">{description}</p>

          <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
            {/* Difficulty badge */}
            <span
              className={`rounded-full px-3 py-1 font-medium capitalize ${difficultyColors[meta.difficulty]}`}
            >
              {meta.difficulty}
            </span>

            {/* Cuisine */}
            {meta.cuisine && (
              <span className="text-[var(--color-muted)]">{meta.cuisine}</span>
            )}

            {/* Time */}
            <span className="flex items-center gap-1 text-[var(--color-muted)]">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              {meta.totalTime} min
            </span>

            {/* Servings */}
            <span className="flex items-center gap-1 text-[var(--color-muted)]">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                />
              </svg>
              {meta.servings} servings
            </span>

            {/* Tags */}
            {meta.tags && meta.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {meta.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded bg-[var(--color-accent)]/10 px-2 py-0.5 text-xs text-[var(--color-accent)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
