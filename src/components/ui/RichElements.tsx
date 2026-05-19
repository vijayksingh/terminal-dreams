"use client";

import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useId,
  type ReactNode,
  type AnchorHTMLAttributes,
  type ComponentType,
} from "react";
import { motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { RichText } from "./RichText";
import { SmartCode } from "./richtext-endpoint";
import {
  StrongMarker,
  BlockquoteMark,
  ExternalLinkIcon,
  DividerVariant,
  DIVIDER_COUNT,
  ListBullet,
} from "./richtext-icons";
import { isChipText } from "./chip-detect";

// ── List type context ──────────────────────────────────────────────
// Parent list (UL/OL) declares its type; RichListItem reads it to
// decide whether to render a custom bullet SVG (UL only).
const ListContext = createContext<"ul" | "ol">("ul");

// ── Shared motion vocabulary for stagger entries ───────────────────
const STAGGER_PARENT = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05, delayChildren: 0.05 } },
};

const BULLET_VARIANTS = {
  hidden: { opacity: 0, x: -6 },
  visible: { opacity: 1, x: 0 },
};

const BULLET_TRANSITION = {
  duration: 0.42,
  ease: [0.16, 1, 0.3, 1] as const,
};

// ─── strong → wavy underline emphasis ────────────
// When the only child is a `<code>` chip (endpoint / type), the chip
// already carries its own emphasis — adding a wavy underline on top
// reads as double-emphasis. Detect that case and render a flat strong.
function strongOnlyContainsChip(children: ReactNode): boolean {
  const items = Children.toArray(children);
  if (items.length !== 1) return false;
  const only = items[0];
  if (!isValidElement(only)) return false;
  // The MDX `code` element will have been routed through SmartCode by
  // the override, but at this point in the tree we see the original
  // `<code>` element with raw text children. Inspect that.
  if (only.type !== "code" && only.type !== SmartCode) return false;
  const inner = Children.toArray(
    (only.props as { children?: ReactNode }).children,
  );
  if (inner.length !== 1 || typeof inner[0] !== "string") return false;
  return isChipText(inner[0]);
}

// Run RichText on string children so patterns inside `**...**` (10×,
// 95%, p99, etc.) get the same chip treatment they would in prose.
// Non-string children pass through untouched.
function processStrongChildren(children: ReactNode): ReactNode {
  if (typeof children === "string") {
    return <RichText>{children}</RichText>;
  }
  const arr = Children.toArray(children);
  return arr.map((child, i) =>
    typeof child === "string" ? <RichText key={i}>{child}</RichText> : child,
  );
}

export function RichStrong({ children }: { children?: ReactNode }) {
  // Chip child carries its own emphasis — flat strong, no leading marker.
  if (strongOnlyContainsChip(children)) {
    return (
      <strong style={{ color: "var(--color-accent)", fontWeight: 600 }}>
        {children}
      </strong>
    );
  }
  return (
    <strong className="rich-strong">
      <span className="rich-strong-marker" aria-hidden>
        <StrongMarker />
      </span>
      {processStrongChildren(children)}
    </strong>
  );
}

// ─── mark → hand-drawn highlight pen ─────────────
// Felt-tip marker effect: the highlight gradient is in CSS, but the
// "draw-in" animation is driven by framer-motion's whileInView so the
// stroke only animates when the mark scrolls into view (once).
export function RichMark({ children }: { children?: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();
  if (reducedMotion) {
    return (
      <mark className="rich-mark" style={{ backgroundSize: "100% 100%" }}>
        {children}
      </mark>
    );
  }
  return (
    <motion.mark
      className="rich-mark"
      initial={{ backgroundSize: "0% 100%" }}
      whileInView={{ backgroundSize: "100% 100%" }}
      viewport={{ once: true, margin: "-20px" }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
    >
      {children}
    </motion.mark>
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

// ─── a → hover-animated link, with external arrow ────
function isExternalHref(href?: string): boolean {
  if (!href) return false;
  return /^(https?:|\/\/)/.test(href);
}

export function RichLink({
  children,
  href,
  ...rest
}: AnchorHTMLAttributes<HTMLAnchorElement> & { children?: ReactNode }) {
  const external = isExternalHref(href);
  return (
    <a className="rich-link" href={href} {...rest}>
      {children}
      {external && (
        <span className="rich-link-external" aria-hidden>
          <ExternalLinkIcon />
        </span>
      )}
    </a>
  );
}

// ─── blockquote → pull-quote with editorial quote mark ─────
export function RichBlockquote({ children }: { children?: ReactNode }) {
  return (
    <blockquote className="rich-blockquote">
      <span className="rich-blockquote-mark" aria-hidden>
        <BlockquoteMark />
      </span>
      {children}
    </blockquote>
  );
}

// ─── hr → hand-drawn decorative divider ──────────
// Picks one of N motifs via a stable hash of `useId()` — different
// dividers on the same page get different variants, but the choice
// is deterministic across SSR + hydration (no Math.random()).
export function RichDivider() {
  const id = useId();
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i)) | 0;
  const variant = Math.abs(h) % DIVIDER_COUNT;

  return (
    <div role="separator" aria-hidden="true" className="rich-divider">
      <DividerVariant index={variant} />
    </div>
  );
}

// ─── ul → motion-driven stagger entrance + custom bullet ─────────
// motion.ul orchestrates child stagger via `staggerChildren`. Items
// below the fold don't animate until they scroll in (lazy via viewport).
export function RichList({ children }: { children?: ReactNode }) {
  const reducedMotion = usePrefersReducedMotion();
  if (reducedMotion) {
    return (
      <ListContext.Provider value="ul">
        <ul className="rich-list">{children}</ul>
      </ListContext.Provider>
    );
  }
  return (
    <ListContext.Provider value="ul">
      <motion.ul
        className="rich-list"
        variants={STAGGER_PARENT}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-20px" }}
      >
        {children}
      </motion.ul>
    </ListContext.Provider>
  );
}

// ─── ol → mono-styled numbered markers ───────────
// No motion on ordered lists — numbers carry their own visual rhythm.
export function RichOrderedList({ children }: { children?: ReactNode }) {
  return (
    <ListContext.Provider value="ol">
      <ol className="rich-ordered-list">{children}</ol>
    </ListContext.Provider>
  );
}

// ─── Spreadable map for recipe pages ─────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyComponent = ComponentType<any>;

export const richTextOverrides: Record<string, AnyComponent> = {
  strong: RichStrong,
  em: RichEmphasis,
  mark: RichMark,
  a: RichLink,
  blockquote: RichBlockquote,
  hr: RichDivider,
  ul: RichList,
  ol: RichOrderedList,
  li: RichListItem,
  code: SmartCode,
};

// ─── li → RichText on string children + UL bullet via motion ──────
// UL items render a custom inline-SVG bullet whose opacity/x is driven
// by the parent motion.ul's staggerChildren. OL items pass through —
// the monospace ::marker number handles their visual rhythm.
function renderListItemBody(children: ReactNode): ReactNode {
  if (typeof children === "string") return <RichText>{children}</RichText>;
  const arr = Children.toArray(children);
  const hasStrings = arr.some((c) => typeof c === "string");
  if (!hasStrings) return children;
  return arr.map((child, i) =>
    typeof child === "string" ? <RichText key={i}>{child}</RichText> : child,
  );
}

export function RichListItem({ children }: { children?: ReactNode }) {
  const listType = useContext(ListContext);
  const reducedMotion = usePrefersReducedMotion();
  const body = renderListItemBody(children);

  if (listType === "ol") {
    return <li className="rich-list-item">{body}</li>;
  }

  if (reducedMotion) {
    return (
      <li className="rich-list-item">
        <span className="rich-list-bullet" aria-hidden>
          <ListBullet />
        </span>
        {body}
      </li>
    );
  }

  return (
    <motion.li
      className="rich-list-item"
      variants={BULLET_VARIANTS}
      transition={BULLET_TRANSITION}
    >
      <span className="rich-list-bullet" aria-hidden>
        <ListBullet />
      </span>
      {body}
    </motion.li>
  );
}
