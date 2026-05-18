"use client";

import type { CSSProperties } from "react";
import { LABEL, type DemoColor } from "./demo-tokens";
import { formulaPill } from "./pill-style";

type FormulaTerm = {
  label: string;
  color?: DemoColor;
};

type FormulaToken = FormulaTerm | string;

type FormulaBarProps = {
  tokens: FormulaToken[];
  className?: string;
  style?: CSSProperties;
};

function isFormulaTerm(token: FormulaToken): token is FormulaTerm {
  return typeof token === "object" && "label" in token;
}

const operatorStyle: CSSProperties = {
  fontFamily: LABEL.fontFamily,
  fontWeight: LABEL.fontWeight,
  fontSize: 12,
  color: "var(--color-muted)",
};

export function FormulaBar({ tokens, className, style }: FormulaBarProps) {
  return (
    <div
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 6,
        ...style,
      }}
      role="math"
      aria-label={tokens
        .map((t) => (isFormulaTerm(t) ? t.label : t))
        .join(" ")}
    >
      {tokens.map((token, i) =>
        isFormulaTerm(token) ? (
          <span key={i} style={formulaPill(token.color ?? "neutral")}>
            {token.label}
          </span>
        ) : (
          <span key={i} style={operatorStyle}>
            {token}
          </span>
        )
      )}
    </div>
  );
}
