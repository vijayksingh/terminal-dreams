"use client";

import { Breadcrumb, type BreadcrumbItem } from "./Breadcrumb";
import { ThemeToggle } from "./ThemeToggle";

type BreadcrumbBarProps = {
  items: BreadcrumbItem[];
  className?: string;
};

export function BreadcrumbBar({ items, className }: BreadcrumbBarProps) {
  return (
    <header
      className={`shrink-0 flex items-center px-4 h-9${className ? ` ${className}` : ""}`}
      style={{ borderBottom: "1px solid var(--color-border)" }}
    >
      <Breadcrumb items={items} />
      <div className="ml-auto">
        <ThemeToggle />
      </div>
    </header>
  );
}
