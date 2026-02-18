"use client";

import { type RefObject, useEffect, useState } from "react";

export function useActiveSection(
  ids: string[],
  containerRef: RefObject<HTMLElement | null>
): string | null {
  const [activeId, setActiveId] = useState<string | null>(ids[0] ?? null);
  const idsKey = ids.join(",");

  useEffect(() => {
    if (ids.length === 0) return;

    const entryMap = new Map<string, IntersectionObserverEntry>();

    const observer = new IntersectionObserver(
      (newEntries) => {
        newEntries.forEach((entry) => {
          entryMap.set(entry.target.id, entry);
        });

        const intersecting = [...entryMap.values()].filter((e) => e.isIntersecting);
        if (intersecting.length === 0) return;

        intersecting.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        setActiveId(intersecting[0].target.id);
      },
      {
        root: containerRef.current,
        rootMargin: "-15% 0px -50% 0px",
        threshold: [0, 0.25],
      }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  return activeId;
}
