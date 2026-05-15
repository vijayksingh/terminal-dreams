import { Children, type ReactNode, type AnchorHTMLAttributes, type ComponentType } from "react";
import { RichText } from "./RichText";

// ─── strong → wavy underline emphasis ────────────
export function RichStrong({ children }: { children?: ReactNode }) {
  return (
    <strong
      style={{
        color: "var(--color-accent)",
        textDecorationLine: "underline",
        textDecorationStyle: "wavy" as const,
        textDecorationColor:
          "color-mix(in srgb, var(--color-accent) 40%, transparent)",
        textDecorationThickness: "1.5px",
        textUnderlineOffset: "3px",
      }}
    >
      {children}
    </strong>
  );
}

// ─── em → display serif italic ───────────────────
export function RichEmphasis({ children }: { children?: ReactNode }) {
  return (
    <em
      style={{
        fontFamily: "var(--font-display)",
        fontStyle: "italic",
        fontSize: "1.01em",
      }}
    >
      {children}
    </em>
  );
}

// ─── a → hover-animated link ─────────────────────
export function RichLink({
  children,
  href,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) {
  return (
    <a className="rich-link" href={href} {...rest}>
      {children}
    </a>
  );
}

// ─── blockquote → pull-quote with accent bar ─────
export function RichBlockquote({ children }: { children?: ReactNode }) {
  return (
    <blockquote className="rich-blockquote">{children}</blockquote>
  );
}

// ─── hr → hand-drawn decorative divider ──────────
export function RichDivider() {
  return (
    <div
      role="separator"
      aria-hidden="true"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        margin: "var(--space-6) 0",
        color: "var(--color-border)",
      }}
    >
      <svg
        viewBox="0 0 200 8"
        preserveAspectRatio="none"
        style={{
          width: "min(100%, 180px)",
          height: "8px",
          overflow: "visible",
        }}
      >
        <path
          d="M0 4 Q 25 1.5, 50 4 T 100 3.5 T 150 4.2 T 200 3.8"
          stroke="currentColor"
          strokeWidth="1.2"
          fill="none"
          strokeLinecap="round"
          opacity="0.4"
        />
        <path
          d="M4 5.2 Q 30 4.2, 55 5.2 T 105 4.8 T 155 5.4 T 198 5.0"
          stroke="currentColor"
          strokeWidth="0.8"
          fill="none"
          strokeLinecap="round"
          opacity="0.2"
        />
      </svg>
    </div>
  );
}

// ─── ul → accent-colored markers ─────────────────
export function RichList({ children }: { children?: ReactNode }) {
  return <ul className="rich-list">{children}</ul>;
}

// ─── ol → mono-styled numbered markers ───────────
export function RichOrderedList({ children }: { children?: ReactNode }) {
  return <ol className="rich-ordered-list">{children}</ol>;
}

// ─── Spreadable map for recipe pages ─────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

export const richTextOverrides: Record<string, AnyComponent> = {
  strong: RichStrong,
  em: RichEmphasis,
  a: RichLink,
  blockquote: RichBlockquote,
  hr: RichDivider,
  ul: RichList,
  ol: RichOrderedList,
  li: RichListItem,
};

// ─── li → RichText processing on list items ──────
export function RichListItem({ children }: { children?: ReactNode }) {
  if (typeof children === "string") {
    return (
      <li className="rich-list-item">
        <RichText>{children}</RichText>
      </li>
    );
  }

  const items = Children.toArray(children);
  const hasStrings = items.some((child) => typeof child === "string");

  if (!hasStrings) return <li className="rich-list-item">{children}</li>;

  return (
    <li className="rich-list-item">
      {items.map((child, i) =>
        typeof child === "string" ? (
          <RichText key={i}>{child}</RichText>
        ) : (
          child
        ),
      )}
    </li>
  );
}
