import type { CSSProperties } from "react";
import { LABEL, COLOR_MAP, type DemoColor } from "./demo-tokens";

const pixelCrisp: CSSProperties = {
  WebkitFontSmoothing: "none",
  MozOsxFontSmoothing: "auto" as CSSProperties["MozOsxFontSmoothing"],
  textRendering: "optimizeSpeed",
};

export function annotationPill(color: DemoColor): CSSProperties {
  const c = COLOR_MAP[color];
  return {
    display: "inline-flex",
    alignItems: "center",
    fontFamily: LABEL.fontFamily,
    fontWeight: LABEL.fontWeight,
    fontSize: LABEL.fontSize,
    lineHeight: LABEL.lineHeight,
    whiteSpace: "nowrap",
    padding: `${LABEL.paddingY}px ${LABEL.paddingX}px`,
    borderRadius: LABEL.borderRadius,
    background: c.bg,
    color: c.text,
    border: `1px solid ${c.border}`,
    ...pixelCrisp,
  };
}

export function formulaPill(color: DemoColor): CSSProperties {
  const c = COLOR_MAP[color];
  return {
    display: "inline-flex",
    alignItems: "center",
    fontFamily: LABEL.fontFamily,
    fontWeight: LABEL.fontWeight,
    fontSize: 12,
    lineHeight: LABEL.lineHeight,
    whiteSpace: "nowrap",
    padding: "4px 10px",
    borderRadius: 6,
    background: "transparent",
    color: c.text,
    border: `1px solid ${c.border}`,
    ...pixelCrisp,
  };
}
