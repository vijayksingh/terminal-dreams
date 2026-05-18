"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

type AnnotationContextValue = { visible: boolean };

const AnnotationContext = createContext<AnnotationContextValue | null>(null);

export function useAnnotationVisibility(): boolean {
  const ctx = useContext(AnnotationContext);
  return ctx?.visible ?? true;
}

export function AnnotationGroup({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}) {
  const value = useMemo(() => ({ visible }), [visible]);
  return (
    <AnnotationContext.Provider value={value}>
      {children}
    </AnnotationContext.Provider>
  );
}
