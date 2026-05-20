"use client";

import { DemoSandbox } from "@/components/principles/demo-primitives/DemoSandbox";
import { useState, useRef, useCallback, useEffect } from "react";

type Point = { x: number; y: number };
type Stroke = { points: Point[]; color: string };

const COLORS = [
  "var(--diagram-layer-1)",
  "var(--diagram-layer-2)",
  "var(--diagram-layer-4)",
  "var(--diagram-layer-8)",
  "var(--color-fg)",
];

export function WhiteboardDemo() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[] | null>(null);
  const [colorIdx, setColorIdx] = useState(0);
  const drawing = useRef(false);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid
    ctx.strokeStyle = "color-mix(in srgb, var(--color-border) 40%, transparent)";
    ctx.lineWidth = 0.5;
    for (let x = 0; x < canvas.width; x += 20) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 20) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    const drawStroke = (pts: Point[], color: string) => {
      if (pts.length < 2) return;
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.moveTo(pts[0]!.x, pts[0]!.y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i]!.x, pts[i]!.y);
      }
      ctx.stroke();
    };

    for (const s of strokes) {
      drawStroke(s.points, s.color);
    }
    if (currentStroke) {
      drawStroke(currentStroke, COLORS[colorIdx]!);
    }
  }, [strokes, currentStroke, colorIdx]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  const getPos = (e: React.PointerEvent): Point => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvasRef.current!.width / rect.width),
      y: (e.clientY - rect.top) * (canvasRef.current!.height / rect.height),
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    drawing.current = true;
    canvasRef.current?.setPointerCapture(e.pointerId);
    setCurrentStroke([getPos(e)]);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const coalesced = e.nativeEvent.getCoalescedEvents?.() ?? [e.nativeEvent];
    const rect = canvasRef.current!.getBoundingClientRect();
    const scale = canvasRef.current!.width / rect.width;
    const points = coalesced.map((ce) => ({
      x: (ce.clientX - rect.left) * scale,
      y: (ce.clientY - rect.top) * scale,
    }));
    setCurrentStroke((prev) => (prev ? [...prev, ...points] : points));
  };

  const onPointerUp = () => {
    if (!drawing.current) return;
    drawing.current = false;
    if (currentStroke && currentStroke.length > 1) {
      setStrokes((prev) => [...prev, { points: currentStroke, color: COLORS[colorIdx]! }]);
    }
    setCurrentStroke(null);
  };

  return (
    <DemoSandbox title="Mini Whiteboard — draw with your pointer">
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <canvas
          ref={canvasRef}
          width={480}
          height={280}
          style={{
            width: "100%",
            maxWidth: 480,
            border: "2px solid var(--color-border)",
            borderRadius: "var(--radius-2)",
            cursor: "crosshair",
            touchAction: "none",
          }}
          role="application"
          aria-label="Drawing canvas — use pointer to draw freehand strokes"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        />
        <div
          style={{
            display: "flex",
            gap: 8,
            alignItems: "center",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--color-muted)",
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {COLORS.map((c, i) => (
              <button
                key={i}
                onClick={() => setColorIdx(i)}
                aria-label={`Color ${i + 1}`}
                aria-pressed={i === colorIdx}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  border: i === colorIdx ? "3px solid var(--color-fg)" : "2px solid var(--color-border)",
                  background: c,
                  cursor: "pointer",
                  minHeight: 28,
                }}
              />
            ))}
          </div>
          <span style={{ marginLeft: "auto" }}>
            Strokes: {strokes.length}
          </span>
          <button
            onClick={() => { setStrokes([]); setCurrentStroke(null); }}
            style={{
              padding: "4px 12px",
              minHeight: 32,
              border: "1px solid var(--color-border)",
              borderRadius: "var(--radius-1)",
              background: "var(--color-surface)",
              color: "var(--color-fg)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              cursor: "pointer",
            }}
          >
            Clear
          </button>
        </div>
      </div>
    </DemoSandbox>
  );
}
