"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type ElementDimensions = { width: number; height: number };

export function useDimensions<T extends HTMLElement = HTMLDivElement>(
  ref: React.RefObject<T>
): ElementDimensions {
  const [size, setSize] = useState<ElementDimensions>({ width: 0, height: 0 });
  const observerRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback(() => {
    const node = ref.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    setSize({ width: Math.max(0, rect.width), height: Math.max(0, rect.height) });
  }, [ref]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(node);
    observerRef.current = ro;

    return () => {
      ro.disconnect();
      observerRef.current = null;
    };
  }, [measure, ref]);

  useEffect(() => {
    // Window resize fallback for environments where ResizeObserver may lag
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [measure]);

  return size;
}

export default useDimensions;


