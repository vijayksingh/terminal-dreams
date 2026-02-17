"use client";

import { useEffect, useState } from "react";
import styles from "./ToC.module.css";

type TocItem = { id: string; text: string; level: number };
const TOC_HEADING_SELECTOR = "h1, h2, h3";
const TOC_ROOT_MARGIN = "-20% 0px -70% 0px";
const TOC_THRESHOLD: [number, number] = [0, 1];
const INDENT_PER_LEVEL_PX = 12;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function collectHeadings(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(TOC_HEADING_SELECTOR));
}

function ensureHeadingIds(elements: HTMLElement[]) {
  elements.forEach((element) => {
    if (!element.id) {
      element.id = slugify(element.innerText);
    }
  });
}

function buildTocItems(elements: HTMLElement[]): TocItem[] {
  return elements.map((element) => ({
    id: element.id,
    text: element.innerText,
    level: Number(element.tagName.charAt(1)),
  }));
}

export function ToC({ variant = "plain" as "side" | "bottom" | "plain" }) {
  const [activeId, setActiveId] = useState<string>("");
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const headings = collectHeadings();
    ensureHeadingIds(headings);
    const list = buildTocItems(headings);
    setItems(list);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target) setActiveId((visible[0].target as HTMLElement).id);
      },
      { rootMargin: TOC_ROOT_MARGIN, threshold: TOC_THRESHOLD }
    );

    headings.forEach((heading) => observer.observe(heading));
    return () => observer.disconnect();
  }, []);

  const indent = (level: number) => ({ paddingLeft: `${(level - 1) * INDENT_PER_LEVEL_PX}px` });

  if (items.length === 0) return null;
  const variantClass = variant === "side" ? styles.side : variant === "bottom" ? styles.bottom : "";
  return (
    <nav className={`${styles.toc} ${variantClass}`} aria-label="Table of Contents">
      <div className={styles.tocTitle}>On this page</div>
      <ul className={styles.tocList}>
        {items.map((item) => (
          <li key={item.id} className={styles.tocItem} style={indent(item.level)}>
            <a
              href={`#${item.id}`}
              className={`${styles.tocLink} ${activeId === item.id ? styles.tocActive : ""}`}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export default ToC;


