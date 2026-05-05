"use client";

import { motion } from "framer-motion";
import Link from "next/link";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, STAGGER } from "@/lib/motion";

export type BreadcrumbItem = { label: string; href?: string };

type BreadcrumbProps = {
  items: BreadcrumbItem[];
};

export function Breadcrumb({ items }: BreadcrumbProps) {
  const prefersReducedMotion = usePrefersReducedMotion();

  // Always prepend home node
  const crumbs: BreadcrumbItem[] = [{ label: "~/", href: "/" }, ...items];

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 font-mono text-xs">
      {crumbs.map((crumb, i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && (
            <span aria-hidden style={{ color: "var(--color-muted)" }}>{">"}</span>
          )}
          <motion.span
            initial={prefersReducedMotion ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              ...SPRING.snappy,
              delay: i * STAGGER.fast,
            }}
            style={{ display: "inline-block" }}
          >
            {crumb.href ? (
              <motion.span
                whileHover={prefersReducedMotion ? undefined : { x: 2 }}
                transition={SPRING.quick}
                style={{ display: "inline-block" }}
              >
                <Link
                  href={crumb.href}
                  className="hover:underline cursor-pointer"
                  style={{ color: "var(--color-muted)" }}
                >
                  {crumb.label}
                </Link>
              </motion.span>
            ) : (
              <span style={{ color: "var(--color-text)" }}>{crumb.label}</span>
            )}
          </motion.span>
        </span>
      ))}
    </nav>
  );
}
