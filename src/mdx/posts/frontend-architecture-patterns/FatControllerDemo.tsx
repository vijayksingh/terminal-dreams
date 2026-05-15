"use client";

import { useCallback, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { SPRING, TRANSITION, STAGGER } from "@/lib/motion";
import { CONTROLLER_FEATURES } from "./pattern-data";
import type { ControllerFeature } from "./pattern-data";

export function FatControllerDemo() {
  const [addedIds, setAddedIds] = useState<string[]>(["basic"]);
  const reducedMotion = usePrefersReducedMotion();

  const addFeature = useCallback((id: string) => {
    setAddedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }, []);

  const reset = useCallback(() => {
    setAddedIds(["basic"]);
  }, []);

  const addedFeatures = useMemo(
    () => CONTROLLER_FEATURES.filter((f) => addedIds.includes(f.id)),
    [addedIds],
  );

  const availableFeatures = useMemo(
    () => CONTROLLER_FEATURES.filter((f) => !addedIds.includes(f.id)),
    [addedIds],
  );

  const totalLines = addedFeatures.reduce((sum, f) => sum + f.linesAdded, 0);
  const lastAdded = addedFeatures[addedFeatures.length - 1];
  const mocksNeeded = addedIds.length;

  const severity =
    totalLines < 100 ? "healthy" : totalLines < 200 ? "warning" : "danger";

  const severityColor =
    severity === "healthy"
      ? "#98c379"
      : severity === "warning"
        ? "#e5c07b"
        : "#e06c75";

  const severityLabel =
    severity === "healthy"
      ? "Manageable"
      : severity === "warning"
        ? "Getting bloated..."
        : "Fat Controller";

  return (
    <div
      className="my-6 overflow-hidden rounded-lg"
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        boxShadow: "var(--shadow-1)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          borderBottom: "1px solid var(--color-border)",
          background: "var(--color-surface-2)",
        }}
      >
        <div className="flex items-center gap-3">
          <span
            className="inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wider"
            style={{
              fontFamily: "var(--font-mono)",
              color: severityColor,
              background: `${severityColor}15`,
              border: `1px solid ${severityColor}`,
              fontSize: 10,
              transition: "all 0.3s",
            }}
          >
            {severityLabel}
          </span>
          <span
            className="text-xs"
            style={{ color: "var(--color-muted)", fontFamily: "var(--font-mono)" }}
          >
            ProductList.tsx — {totalLines} lines
          </span>
        </div>
        {addedIds.length > 1 && (
          <button
            type="button"
            onClick={reset}
            className="cursor-pointer rounded px-2 py-1 text-xs"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-muted)",
              background: "transparent",
              border: "1px solid var(--color-border)",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--color-accent)";
              e.currentTarget.style.color = "var(--color-accent)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--color-border)";
              e.currentTarget.style.color = "var(--color-muted)";
            }}
          >
            Reset
          </button>
        )}
      </div>

      {/* Progress bar */}
      <div style={{ height: 3, background: "var(--color-bg)" }}>
        {reducedMotion ? (
          <div
            style={{
              height: "100%",
              width: `${Math.min(100, (totalLines / 290) * 100)}%`,
              background: severityColor,
              transition: "width 0.3s, background 0.3s",
            }}
          />
        ) : (
          <motion.div
            style={{ height: "100%", background: severityColor }}
            animate={{ width: `${Math.min(100, (totalLines / 290) * 100)}%` }}
            transition={TRANSITION.progress}
          />
        )}
      </div>

      {/* Accumulated features strip */}
      {addedFeatures.length > 0 && (
        <div
          className="flex flex-wrap items-center gap-1.5 px-4 py-2.5"
          style={{ borderBottom: "1px solid var(--color-border)" }}
        >
          <span
            className="text-xs uppercase tracking-wider"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-muted)",
              fontSize: 9,
              marginRight: 4,
            }}
          >
            In the controller:
          </span>
          {addedFeatures.map((f, i) => {
            const isLatest = i === addedFeatures.length - 1 && addedFeatures.length > 1;
            const pill = (
              <span
                key={f.id}
                className="inline-flex rounded-full px-2 py-0.5 text-xs"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: isLatest ? severityColor : "var(--color-muted)",
                  background: isLatest ? `${severityColor}15` : "var(--color-bg)",
                  border: `1px solid ${isLatest ? severityColor : "var(--color-border)"}`,
                  whiteSpace: "nowrap",
                  transition: "all 0.3s",
                }}
              >
                {f.name}
              </span>
            );

            if (reducedMotion || !isLatest) return pill;

            return (
              <motion.span
                key={f.id}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SPRING.snappy}
                className="inline-flex rounded-full px-2 py-0.5 text-xs"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 9,
                  color: severityColor,
                  background: `${severityColor}15`,
                  border: `1px solid ${severityColor}`,
                  whiteSpace: "nowrap",
                }}
              >
                {f.name}
              </motion.span>
            );
          })}
        </div>
      )}

      {/* Code preview + Consequence split */}
      <div
        className="grid gap-0"
        style={{
          gridTemplateColumns: "1fr 1fr",
          borderBottom: "1px solid var(--color-border)",
        }}
      >
        {/* Code panel */}
        <div
          style={{
            borderRight: "1px solid var(--color-border)",
            overflow: "hidden",
          }}
        >
          <div
            className="px-3 py-1.5"
            style={{
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
            }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--color-muted)",
                fontSize: 9,
              }}
            >
              Latest code change
            </span>
          </div>
          <AnimatePresence mode="wait">
            <CodePreview
              key={lastAdded.id}
              code={lastAdded.code}
              reducedMotion={reducedMotion}
            />
          </AnimatePresence>
        </div>

        {/* Consequence panel */}
        <div>
          <div
            className="px-3 py-1.5"
            style={{
              borderBottom: "1px solid var(--color-border)",
              background: "var(--color-surface-2)",
            }}
          >
            <span
              className="text-xs font-semibold uppercase tracking-wider"
              style={{
                fontFamily: "var(--font-mono)",
                color: "var(--color-muted)",
                fontSize: 9,
              }}
            >
              What this means
            </span>
          </div>
          <AnimatePresence mode="wait">
            <ConsequencePanel
              key={lastAdded.id}
              feature={lastAdded}
              mocksNeeded={mocksNeeded}
              totalFeatures={addedIds.length}
              severity={severity}
              severityColor={severityColor}
              reducedMotion={reducedMotion}
            />
          </AnimatePresence>
        </div>
      </div>

      {/* Add feature buttons */}
      {availableFeatures.length > 0 && (
        <div className="px-4 py-3">
          <div
            className="text-xs font-semibold uppercase tracking-wider"
            style={{
              color: "var(--color-muted)",
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              marginBottom: 8,
            }}
          >
            Add a feature to the controller
          </div>
          <div className="flex flex-wrap gap-2">
            {availableFeatures.map((feature) => (
              <FeatureButton
                key={feature.id}
                feature={feature}
                onClick={() => addFeature(feature.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Final lesson when all features added */}
      {availableFeatures.length === 0 && (
        <div
          className="px-4 py-3"
          style={{
            background: "#e06c7510",
          }}
        >
          <div
            className="text-xs leading-relaxed"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--color-text)",
            }}
          >
            <strong style={{ color: "#e06c75" }}>
              One component. {totalLines} lines. {mocksNeeded} mocks to test a
              single render.
            </strong>{" "}
            A junior developer asked to &quot;add wishlist support&quot; now has
            to understand auth, URL sync, WebSockets, analytics, cart state,
            and cross-tab communication before writing a single line. This is
            the God Component — and it&apos;s why custom hooks, composition,
            and architectural patterns exist.
          </div>
        </div>
      )}
    </div>
  );
}

function CodePreview({
  code,
  reducedMotion,
}: {
  code: string;
  reducedMotion: boolean;
}) {
  const inner = (
    <pre
      className="m-0 overflow-auto p-3"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        lineHeight: 1.6,
        color: "var(--color-text)",
        background: "var(--color-bg)",
        height: "100%",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}
    >
      {code}
    </pre>
  );

  if (reducedMotion) return inner;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={TRANSITION.crossfade}
      style={{ height: "100%" }}
    >
      {inner}
    </motion.div>
  );
}

function ConsequencePanel({
  feature,
  mocksNeeded,
  totalFeatures,
  severity,
  severityColor,
  reducedMotion,
}: {
  feature: ControllerFeature;
  mocksNeeded: number;
  totalFeatures: number;
  severity: string;
  severityColor: string;
  reducedMotion: boolean;
}) {
  const inner = (
    <div className="flex flex-col gap-3 p-3">
      <div>
        <div
          className="text-xs font-semibold"
          style={{
            fontFamily: "var(--font-mono)",
            color: severityColor,
            fontSize: 11,
          }}
        >
          + {feature.name}
        </div>
        <div
          className="text-xs leading-relaxed"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--color-text)",
            fontSize: 11,
          }}
        >
          {feature.consequence}
        </div>
      </div>

      {/* Test complexity indicator */}
      <div
        className="rounded px-3 py-2"
        style={{
          background: "var(--color-bg)",
          border: `1px solid ${severity === "danger" ? severityColor : "var(--color-border)"}`,
        }}
      >
        <div
          className="text-xs"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--color-muted)",
            fontSize: 9,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 4,
          }}
        >
          To test &quot;render products&quot; you need
        </div>
        <div className="flex gap-1">
          {Array.from({ length: totalFeatures }).map((_, i) => {
            const f = CONTROLLER_FEATURES[i];
            const mockLabel = f
              ? f.name.split(" ")[0]
              : `Mock ${i + 1}`;

            const block = (
              <span
                key={i}
                className="rounded px-1.5 py-0.5 text-xs"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8,
                  color: i >= totalFeatures - 1 ? severityColor : "var(--color-muted)",
                  background: `${severityColor}15`,
                  border: `1px solid ${i >= totalFeatures - 1 ? severityColor : "var(--color-border)"}`,
                  whiteSpace: "nowrap",
                }}
              >
                {mockLabel}
              </span>
            );

            if (reducedMotion || i < totalFeatures - 1) return block;

            return (
              <motion.span
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={SPRING.snappy}
                className="rounded px-1.5 py-0.5 text-xs"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 8,
                  color: severityColor,
                  background: `${severityColor}15`,
                  border: `1px solid ${severityColor}`,
                  whiteSpace: "nowrap",
                }}
              >
                {mockLabel}
              </motion.span>
            );
          })}
          <span
            className="text-xs"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 8,
              color: "var(--color-muted)",
              alignSelf: "center",
            }}
          >
            {mocksNeeded === 1 ? "mock" : "mocks"}
          </span>
        </div>
      </div>
    </div>
  );

  if (reducedMotion) return inner;

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -8 }}
      transition={TRANSITION.enterItem}
    >
      {inner}
    </motion.div>
  );
}

function FeatureButton({
  feature,
  onClick,
}: {
  feature: ControllerFeature;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="cursor-pointer rounded px-3 py-1.5 text-xs"
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 11,
        color: hovered ? "var(--color-accent)" : "var(--color-text)",
        background: hovered ? "color-mix(in srgb, var(--color-accent) 10%, transparent)" : "var(--color-bg)",
        border: `1px solid ${hovered ? "var(--color-accent)" : "var(--color-border)"}`,
        transition: "all 0.2s",
      }}
    >
      + {feature.name}
      <span
        style={{
          color: "var(--color-muted)",
          marginLeft: 6,
          fontSize: 10,
        }}
      >
        +{feature.linesAdded} lines
      </span>
    </button>
  );
}

export default FatControllerDemo;
