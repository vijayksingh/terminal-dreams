import styles from "@/components/retro/retro.module.css";
import fdStyles from "@/components/frontend-design/frontend-design.module.css";
import { BreadcrumbBar } from "@/components/retro/BreadcrumbBar";
import { RetroFooter } from "@/components/retro/RetroFooter";
import { SECTIONS, getStopsForSection } from "@/lib/frontend-design-data";
import type { FdSectionSlug } from "@/lib/frontend-design-types";
import Link from "next/link";
import { notFound } from "next/navigation";

export async function generateStaticParams() {
  return SECTIONS.map((s) => ({ section: s.slug }));
}

export default async function SectionPage({
  params,
}: {
  params: Promise<{ section: string }>;
}) {
  const { section: sectionSlug } = await params;
  const section = SECTIONS.find((s) => s.slug === sectionSlug);
  if (!section) return notFound();

  const stops = getStopsForSection(sectionSlug as FdSectionSlug);

  return (
    <div className={`${styles.container} readingView`}>
      <BreadcrumbBar
        items={[
          { label: "frontend-design", href: "/frontend-design" },
          { label: section.name },
        ]}
      />

      <div className={styles.headerInner} style={{ paddingTop: "2rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", marginBottom: "var(--space-2)" }}>
          <span
            style={{
              display: "inline-block",
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: `var(${section.colorToken})`,
            }}
          />
          <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-muted)" }}>
            Line {String(section.order).padStart(2, "0")}
          </span>
        </div>
        <h1 className={fdStyles.articleTitle}>{section.name}</h1>
        <p className={fdStyles.articleSummary}>{section.description}</p>
      </div>

      <div className={styles.headerInner}>
        {/* Mini metro line visualization */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, margin: "var(--space-4) 0 var(--space-6)" }}>
          {stops.map((stop, i) => (
            <div key={stop.id} style={{ display: "flex", alignItems: "center" }}>
              <Link
                href={`/frontend-design/${stop.slug}`}
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: "50%",
                  border: `2px solid var(${section.colorToken})`,
                  background: "var(--color-bg)",
                  display: "block",
                  flexShrink: 0,
                }}
                title={stop.label}
              />
              {i < stops.length - 1 && (
                <div
                  style={{
                    width: 24,
                    height: 3,
                    background: `var(${section.colorToken})`,
                  }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Stop list */}
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
          {stops.map((stop) => (
            <Link
              key={stop.id}
              href={`/frontend-design/${stop.slug}`}
              className={fdStyles.sectionCard}
              style={{ borderLeftColor: `var(${section.colorToken})`, borderLeftWidth: 3 }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: "var(--space-2)" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: "var(--text-xs)", color: "var(--color-muted)", minWidth: "1.5em" }}>
                  {String(stop.order).padStart(2, "0")}
                </span>
                <span className={fdStyles.sectionCardTitle}>{stop.label}</span>
              </div>
              <span style={{ fontFamily: "var(--font-mono)", fontSize: "10px", color: "var(--color-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {stop.kind.replace(/-/g, " ")}
              </span>
            </Link>
          ))}
        </div>
      </div>

      <RetroFooter />
    </div>
  );
}
