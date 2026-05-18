"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { Annotation } from "./Annotation";

type DemoTargetProps = {
  children: ReactNode;
  className?: string;
};

export function DemoTarget({ children, className }: DemoTargetProps) {
  const content: ReactNode[] = [];
  const annotations: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === Annotation) {
      annotations.push(child);
    } else {
      content.push(child);
    }
  });

  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        position: "relative",
        overflow: "visible",
      }}
    >
      {content}
      {annotations.length > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: 1,
          }}
        >
          {annotations}
        </div>
      )}
    </div>
  );
}
