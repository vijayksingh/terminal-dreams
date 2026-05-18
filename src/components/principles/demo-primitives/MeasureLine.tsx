"use client";

import { useRef, useEffect, useState } from "react";
import { LABEL, MEASURE, COLOR_MAP, type DemoColor } from "./demo-tokens";

type MeasureLineProps = {
  direction: "horizontal" | "vertical";
  length: number;
  label: string;
  color?: DemoColor;
};

function useTextWidth(text: string, fontSize: number): number {
  const [width, setWidth] = useState(text.length * fontSize * 0.65);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!canvasRef.current) {
      canvasRef.current = document.createElement("canvas");
    }
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    ctx.font = `${LABEL.fontWeight} ${fontSize}px monospace`;
    setWidth(ctx.measureText(text).width);
  }, [text, fontSize]);

  return width;
}

export function MeasureLine({
  direction,
  length,
  label,
  color = "accent",
}: MeasureLineProps) {
  const c = COLOR_MAP[color];
  const cap = MEASURE.capHeight;
  const textW = useTextWidth(label, LABEL.fontSize);
  const pillW = textW + LABEL.paddingX * 2 + 2;
  const pillH = LABEL.fontSize + LABEL.paddingY * 2 + 2;

  if (direction === "horizontal") {
    const svgH = Math.max(pillH + 4, 24);
    const cy = svgH / 2;
    const pillStart = (length - pillW) / 2;
    const pillEnd = (length + pillW) / 2;

    return (
      <svg
        width={length}
        height={svgH}
        viewBox={`0 0 ${length} ${svgH}`}
        style={{ display: "block", overflow: "visible" }}
        aria-label={`${label} horizontal`}
        role="img"
      >
        <line
          x1={0} y1={cy} x2={pillStart} y2={cy}
          stroke={c.dot}
          strokeWidth={MEASURE.strokeWidth}
        />
        <line
          x1={pillEnd} y1={cy} x2={length} y2={cy}
          stroke={c.dot}
          strokeWidth={MEASURE.strokeWidth}
        />
        <line
          x1={0} y1={cy - cap / 2} x2={0} y2={cy + cap / 2}
          stroke={c.dot}
          strokeWidth={MEASURE.strokeWidth}
        />
        <line
          x1={length} y1={cy - cap / 2} x2={length} y2={cy + cap / 2}
          stroke={c.dot}
          strokeWidth={MEASURE.strokeWidth}
        />
        <rect
          x={pillStart}
          y={cy - pillH / 2}
          width={pillW}
          height={pillH}
          rx={LABEL.borderRadius}
          fill={c.bg}
          stroke={c.border}
          strokeWidth={0.5}
        />
        <text
          x={length / 2}
          y={cy + 0.5}
          textAnchor="middle"
          dominantBaseline="central"
          fill={c.text}
          fontFamily={LABEL.fontFamily}
          fontSize={LABEL.fontSize}
          fontWeight={LABEL.fontWeight}
        >
          {label}
        </text>
      </svg>
    );
  }

  // Vertical
  const svgW = Math.max(pillW + 4, 24);
  const cx = svgW / 2;
  const pillTop = (length - pillH) / 2;
  const pillBottom = (length + pillH) / 2;

  return (
    <svg
      width={svgW}
      height={length}
      viewBox={`0 0 ${svgW} ${length}`}
      style={{ display: "block", overflow: "visible" }}
      aria-label={`${label} vertical`}
      role="img"
    >
      <line
        x1={cx} y1={0} x2={cx} y2={pillTop}
        stroke={c.dot}
        strokeWidth={MEASURE.strokeWidth}
      />
      <line
        x1={cx} y1={pillBottom} x2={cx} y2={length}
        stroke={c.dot}
        strokeWidth={MEASURE.strokeWidth}
      />
      <line
        x1={cx - cap / 2} y1={0} x2={cx + cap / 2} y2={0}
        stroke={c.dot}
        strokeWidth={MEASURE.strokeWidth}
      />
      <line
        x1={cx - cap / 2} y1={length} x2={cx + cap / 2} y2={length}
        stroke={c.dot}
        strokeWidth={MEASURE.strokeWidth}
      />
      <rect
        x={(svgW - pillW) / 2}
        y={pillTop}
        width={pillW}
        height={pillH}
        rx={LABEL.borderRadius}
        fill={c.bg}
        stroke={c.border}
        strokeWidth={0.5}
      />
      <text
        x={cx}
        y={length / 2 + 0.5}
        textAnchor="middle"
        dominantBaseline="central"
        fill={c.text}
        fontFamily={LABEL.fontFamily}
        fontSize={LABEL.fontSize}
        fontWeight={LABEL.fontWeight}
      >
        {label}
      </text>
    </svg>
  );
}
