import Link from "next/link";

/**
 * ~/craft section on the homepage — links to the playground.
 */
export function CraftSection() {
  return (
    <section style={{ marginTop: "var(--space-8)" }}>
      <h2
        className="mb-6 text-sm uppercase tracking-widest"
        style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)", letterSpacing: "0.15em" }}
      >
        ~/craft
      </h2>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Playground card */}
        <Link
          href="/playground"
          className="group rounded-xl border p-6 transition-all hover:shadow-lg"
          style={{
            borderColor: "var(--color-border)",
            backgroundColor: "var(--color-surface)",
          }}
        >
          <div className="mb-4">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="10" width="32" height="24" rx="3" stroke="var(--color-accent)" strokeWidth="1.5" fill="none" opacity="0.4" />
              <rect x="8" y="10" width="32" height="6" fill="var(--color-accent)" opacity="0.15" rx="3" />
              <circle cx="13" cy="13" r="1.5" fill="var(--color-accent)" opacity="0.6" />
              <circle cx="18" cy="13" r="1.5" fill="var(--color-accent)" opacity="0.6" />
              <circle cx="23" cy="13" r="1.5" fill="var(--color-accent)" opacity="0.6" />
              <path d="M14 22 L18 25 L14 28" stroke="var(--color-link)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.7" />
              <line x1="21" y1="28" x2="30" y2="28" stroke="var(--color-muted)" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
            </svg>
          </div>
          <h3
            className="mb-1 text-lg font-bold group-hover:underline"
            style={{ color: "var(--color-text)", fontFamily: "var(--font-mono)" }}
          >
            playground
          </h3>
          <p className="text-sm" style={{ color: "var(--color-muted)" }}>
            A browser-native React/TypeScript IDE. Write, transpile, and preview — no backend required.
          </p>
        </Link>
      </div>
    </section>
  );
}
