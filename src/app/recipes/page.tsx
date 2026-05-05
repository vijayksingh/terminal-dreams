import Link from "next/link";
import { notFound } from "next/navigation";

import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import { RetroFooter } from "@/components/retro/RetroFooter";
import styles from "@/components/retro/retro.module.css";
import { getAllRecipeSlugs, getRecipeBySlug } from "@/lib/recipes";

export default async function RecipesPage() {
  const slugs = getAllRecipeSlugs();
  const articles = await Promise.all(slugs.map((slug) => getRecipeBySlug(slug)));
  const validArticles = articles.filter((a) => a !== null);

  if (validArticles.length === 0) return notFound();

  return (
    <div className={styles.container}>
      <BreadcrumbBar items={[{ label: "recipes" }]} />

      <main style={{ padding: "var(--space-6) var(--space-4)", maxWidth: "720px", margin: "0 auto" }}>
        <h1 className={styles.title}>{"// Recipes"}</h1>
        <p className="text-sm font-mono mb-6" style={{ color: "var(--color-muted)" }}>
          Interactive walkthroughs — scroll through the steps, watch the code evolve.
        </p>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "var(--space-4)" }}>
          {validArticles.map((article) => (
            <li
              key={article.slug}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                padding: "var(--space-4)",
              }}
            >
              <Link
                href={`/recipes/${article.slug}`}
                className="block group"
              >
                <p
                  className="text-xs font-mono mb-1"
                  style={{ color: "var(--color-muted)" }}
                >
                  {article.date}
                  {article.tags.length > 0 && (
                    <span>{" // "}{article.tags.join(", ")}</span>
                  )}
                </p>
                <h2
                  className="text-base font-semibold mb-2 transition-colors"
                  style={{ color: "var(--color-text)" }}
                >
                  {article.title}
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-muted)" }}
                >
                  {article.summary}
                </p>
                <p
                  className="text-xs font-mono mt-3"
                  style={{ color: "var(--color-muted)" }}
                >
                  {article.steps.length} steps →
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>

      <RetroFooter />
    </div>
  );
}
