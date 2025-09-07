"use client";

import { useEffect, useState } from "react";
import styles from "./ToC.module.css";

type TocItem = { id: string; text: string; level: number };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-");
}

function extractTocFromDocument(): { items: TocItem[]; elements: HTMLElement[] } {
  const headings = Array.from(document.querySelectorAll<HTMLElement>("h1, h2, h3"));
  const elements: HTMLElement[] = [];
  const items: TocItem[] = headings.map((el) => {
    const text = el.innerText;
    const id = el.id || slugify(text);
    if (!el.id) el.id = id;
    elements.push(el);
    return { id, text, level: Number(el.tagName.charAt(1)) };
  });
  return { items, elements };
}

export function ToC({ variant = "plain" as "side" | "bottom" | "plain" }) {
  const [activeId, setActiveId] = useState<string>("");
  const [items, setItems] = useState<TocItem[]>([]);

  useEffect(() => {
    const { items: list, elements } = extractTocFromDocument();
    setItems(list);

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (a.boundingClientRect.top > b.boundingClientRect.top ? 1 : -1));
        if (visible[0]?.target) setActiveId((visible[0].target as HTMLElement).id);
      },
      { rootMargin: "-20% 0px -70% 0px", threshold: [0, 1] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const indent = (level: number) => ({ paddingLeft: `${(level - 1) * 12}px` });

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


