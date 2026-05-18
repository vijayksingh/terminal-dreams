import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import { RetroFooter } from "@/components/retro/RetroFooter";
import styles from "@/components/retro/retro.module.css";
import {
  CATEGORIES,
  getCategoryBySlug,
  getPrinciplesByCategory,
} from "@/lib/principles";
import type { PrincipleCategory } from "@/lib/principle-types";

export async function generateStaticParams() {
  return CATEGORIES.map((c) => ({ category: c.slug }));
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const info = getCategoryBySlug(category as PrincipleCategory);
  if (!info) return notFound();

  const principles = await getPrinciplesByCategory(info.slug);

  return (
    <div className={styles.container}>
      <BreadcrumbBar
        items={[
          { label: "principles", href: "/principles" },
          { label: info.name },
        ]}
      />

      <main
        style={{
          padding: "var(--space-6) var(--space-4)",
          maxWidth: "720px",
          margin: "0 auto",
        }}
      >
        <h1 className={styles.title}>{"// "}{info.name}</h1>
        <p
          className="text-sm font-mono mb-6"
          style={{ color: "var(--color-muted)" }}
        >
          {info.description}
        </p>

        {principles.length === 0 ? (
          <p
            className="text-sm font-mono"
            style={{ color: "var(--color-muted)" }}
          >
            No principles in this category yet.
          </p>
        ) : (
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              gap: "var(--space-3)",
            }}
          >
            {principles.map((p) => (
              <li
                key={p.slug}
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  padding: "var(--space-4)",
                }}
              >
                <Link href={`/principles/${p.slug}`} className="block group">
                  <h2
                    className="text-base font-semibold mb-1 transition-colors"
                    style={{ color: "var(--color-text)" }}
                  >
                    {p.title}
                  </h2>
                  <p
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--color-muted)" }}
                  >
                    {p.summary}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>

      <RetroFooter />
    </div>
  );
}
