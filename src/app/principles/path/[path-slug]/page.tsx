import Link from "next/link";
import { notFound } from "next/navigation";
import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import { RetroFooter } from "@/components/retro/RetroFooter";
import styles from "@/components/retro/retro.module.css";
import {
  LEARNING_PATHS,
  getLearningPathBySlug,
  getPrincipleBySlug,
} from "@/lib/principles";

export async function generateStaticParams() {
  return LEARNING_PATHS.map((p) => ({ "path-slug": p.slug }));
}

export default async function LearningPathPage({
  params,
}: {
  params: Promise<{ "path-slug": string }>;
}) {
  const { "path-slug": pathSlug } = await params;
  const learningPath = getLearningPathBySlug(pathSlug);
  if (!learningPath) return notFound();

  const principles = (
    await Promise.all(
      learningPath.principles.map((slug) => getPrincipleBySlug(slug))
    )
  ).filter((p) => p !== null);

  return (
    <div className={styles.container}>
      <BreadcrumbBar
        items={[
          { label: "principles", href: "/principles" },
          { label: learningPath.name },
        ]}
      />

      <main
        style={{
          padding: "var(--space-6) var(--space-4)",
          maxWidth: "720px",
          margin: "0 auto",
        }}
      >
        <h1 className={styles.title}>{"// "}{learningPath.name}</h1>
        <p
          className="text-sm font-mono mb-6"
          style={{ color: "var(--color-muted)" }}
        >
          {learningPath.description}
        </p>

        <ol
          style={{
            listStyle: "none",
            padding: 0,
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-4)",
            counterReset: "path-step",
          }}
        >
          {principles.map((p, i) => (
            <li
              key={p.slug}
              style={{
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
                padding: "var(--space-4)",
                display: "grid",
                gridTemplateColumns: "2.5rem 1fr",
                gap: "var(--space-3)",
                alignItems: "start",
              }}
            >
              <span
                className="text-sm font-mono"
                style={{
                  color: "var(--color-muted)",
                  paddingTop: "2px",
                }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <Link href={`/principles/${p.slug}`} className="block group">
                <h2
                  className="text-base font-semibold mb-1 transition-colors"
                  style={{ color: "var(--color-text)" }}
                >
                  {p.frontmatter.title}
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-muted)" }}
                >
                  {p.frontmatter.summary}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      </main>

      <RetroFooter />
    </div>
  );
}
