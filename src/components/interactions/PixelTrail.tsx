"use client";

import { motion, useAnimationControls } from "framer-motion";
import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { v4 as uuidv4 } from "uuid";

import { useDimensions } from "@/hooks/use-dimensions";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/utils";

export interface PixelTrailProps {
  pixelSize?: number; // px
  fadeDuration?: number; // ms
  delay?: number; // ms
  className?: string;
  pixelClassName?: string;
}

type PixelDotNode = HTMLDivElement & { __animatePixel?: () => void };

export const PixelTrail: React.FC<PixelTrailProps> = ({
  pixelSize = 12,
  fadeDuration = 400,
  delay = 0,
  className,
  pixelClassName,
}) => {
  const prefersReducedMotion = usePrefersReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const dimensions = useDimensions(containerRef);
  const trailId = useRef(uuidv4());
  const cachedRect = useRef<DOMRect | null>(null);

  const handleMouseMoveWindow = useCallback(
    (e: MouseEvent) => {
      const node = containerRef.current;
      if (!node) return;
      if (!cachedRect.current) cachedRect.current = node.getBoundingClientRect();
      const rect = cachedRect.current;

      if (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      ) {
        return;
      }

      const x = Math.floor((e.clientX - rect.left) / pixelSize);
      const y = Math.floor((e.clientY - rect.top) / pixelSize);

      const pixelElement = document.getElementById(
        `${trailId.current}-pixel-${x}-${y}`
      ) as PixelDotNode | null;
      if (pixelElement) {
        const animatePixel = pixelElement.__animatePixel;
        if (animatePixel) animatePixel();
      }
    },
    [pixelSize]
  );

  useEffect(() => {
    if (prefersReducedMotion) return;

    const invalidateRect = () => { cachedRect.current = null; };
    window.addEventListener("mousemove", handleMouseMoveWindow, { passive: true });
    window.addEventListener("resize", invalidateRect);
    return () => {
      window.removeEventListener("mousemove", handleMouseMoveWindow);
      window.removeEventListener("resize", invalidateRect);
    };
  }, [handleMouseMoveWindow, prefersReducedMotion]);

  const columns = useMemo(
    () => Math.max(0, Math.ceil(dimensions.width / pixelSize)),
    [dimensions.width, pixelSize]
  );
  const rows = useMemo(
    () => Math.max(0, Math.ceil(dimensions.height / pixelSize)),
    [dimensions.height, pixelSize]
  );

  if (prefersReducedMotion) return null;

  return (
    <div
      ref={containerRef}
      className={cn("absolute inset-0 w-full h-full pointer-events-none", className)}
      aria-hidden
    >
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <PixelDot
              key={`${colIndex}-${rowIndex}`}
              id={`${trailId.current}-pixel-${colIndex}-${rowIndex}`}
              size={pixelSize}
              fadeDuration={fadeDuration}
              delay={delay}
              className={pixelClassName}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

interface PixelDotProps {
  id: string;
  size: number;
  fadeDuration: number;
  delay: number;
  className?: string;
}

const PixelDot: React.FC<PixelDotProps> = React.memo(
  ({ id, size, fadeDuration, delay, className }) => {
    const controls = useAnimationControls();

    const animatePixel = useCallback(() => {
      controls.start({
        opacity: [1, 0],
        transition: { duration: fadeDuration / 1000, delay: delay / 1000 },
      });
    }, [controls, fadeDuration, delay]);

    const ref = useCallback(
      (node: HTMLDivElement | null) => {
        const pixelNode = node as PixelDotNode | null;
        if (pixelNode) {
          pixelNode.__animatePixel = animatePixel;
        }
      },
      [animatePixel]
    );

    return (
      <motion.div
        id={id}
        ref={ref}
        className={cn("bg-white", className)}
        style={{ width: `${size}px`, height: `${size}px` }}
        initial={{ opacity: 0 }}
        animate={controls}
        exit={{ opacity: 0 }}
      />
    );
  }
);

PixelDot.displayName = "PixelDot";

export default PixelTrail;


