"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StepBar } from "../_shared/StepBar";
import {
  ScrollProvider,
  useScrollContext,
  STEP_LABELS,
  STEP_TITLES,
  TOTAL_ITEMS,
  VISIBLE_COUNT,
  OVERSCAN,
} from "./scroll-context";
import styles from "./VirtualScrollLab.module.css";
import { useState } from "react";

export function VirtualScrollLab({ activeStep }: { activeStep: number }) {
  return (
    <ScrollProvider activeStep={activeStep}>
      <div className={styles.labRoot}>
        <StepBar activeStep={activeStep} labels={[...STEP_LABELS]} />
        <div className={styles.scrollArea}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`step-${activeStep}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={TRANSITION.enterCard}
            >
              <StepWidget />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </ScrollProvider>
  );
}

function StepWidget() {
  const { activeStep } = useScrollContext();
  switch (activeStep) {
    case 1: return <NaiveView />;
    case 2: return <WindowedView />;
    case 3: return <TransformView />;
    case 4: return <OverscanView />;
    case 5: return <CombinedView />;
    case 6: return <CodeView />;
    case 7: return <LibrariesView />;
    default: return null;
  }
}

function NaiveView() {
  const { domCount } = useScrollContext();

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[0]}</div>
        <p className={styles.widgetNote}>
          Rendering all {TOTAL_ITEMS} items creates {TOTAL_ITEMS} DOM nodes. The browser must lay out, paint, and composite every one — even those thousands of pixels off-screen.
        </p>
      </div>

      <div className={styles.widgetPanel}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
          <span className={styles.widgetTitle}>DOM Nodes</span>
          <span className={styles.domBadge} data-severity="high">{domCount}</span>
        </div>
        <div className={styles.nodeGrid}>
          {Array.from({ length: Math.min(domCount, 500) }, (_, i) => (
            <div key={i} className={styles.nodeCell} />
          ))}
        </div>
        <p className={styles.widgetNote}>
          Each cell represents one DOM node. At {TOTAL_ITEMS} nodes, initial render takes 200-400ms and scrolling janks on mid-range devices.
        </p>
      </div>
    </>
  );
}

function WindowedView() {
  const { domCount } = useScrollContext();

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[1]}</div>
        <p className={styles.widgetNote}>
          Only render items inside the visible viewport. A spacer element preserves total scroll height so the scrollbar behaves correctly.
        </p>
      </div>

      <div className={styles.viewportContainer}>
        <div className={styles.spacer} style={{ height: TOTAL_ITEMS * 40 * 0.04 }} />
        <div className={styles.viewport} style={{ top: 60, height: VISIBLE_COUNT * 30 + 8 }}>
          <span className={styles.viewportLabel}>viewport</span>
          {Array.from({ length: VISIBLE_COUNT }, (_, i) => (
            <div key={i} className={styles.visibleItem}>
              Item {i + 15}
            </div>
          ))}
        </div>
      </div>

      <div className={styles.formula}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}>
          <span>DOM Nodes:</span>
          <span className={styles.domBadge} data-severity="low">{domCount}</span>
          <span style={{ fontSize: "0.58rem", color: "var(--color-muted)", fontWeight: 400 }}>
            (was {TOTAL_ITEMS})
          </span>
        </div>
      </div>
    </>
  );
}

function TransformView() {
  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[2]}</div>
        <p className={styles.widgetNote}>
          How you position visible items matters. <code>top: Npx</code> triggers layout recalculation on every scroll. <code>transform: translateY(Npx)</code> runs on the compositor thread — no layout, no paint.
        </p>
      </div>

      <div className={styles.comparison}>
        <div className={styles.compCard}>
          <div className={styles.compTitle}>
            top: Npx
          </div>
          <div className={styles.codeBlock}>
            {`.item {\n  position: absolute;\n  `}<span className={styles.codeHighlight}>top: 600px;</span>{`\n  width: 100%;\n}`}
          </div>
          <div style={{ textAlign: "center" }}>
            <span className={styles.pipelineBadge} data-type="layout">Layout</span>
          </div>
          <p className={styles.compNote}>
            Triggers layout → paint → composite on every frame
          </p>
        </div>

        <div className={styles.compCard} data-active="true">
          <div className={styles.compTitle}>
            transform: translateY
          </div>
          <div className={styles.codeBlock}>
            {`.item {\n  position: absolute;\n  top: 0;\n  `}<span className={styles.codeHighlight}>transform: translateY(600px);</span>{`\n}`}
          </div>
          <div style={{ textAlign: "center" }}>
            <span className={styles.pipelineBadge} data-type="compositor">Compositor</span>
          </div>
          <p className={styles.compNote}>
            Skips layout and paint — compositor-only, 60fps
          </p>
        </div>
      </div>
    </>
  );
}

function OverscanView() {
  const { domCount } = useScrollContext();

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[3]}</div>
        <p className={styles.widgetNote}>
          Render a few extra items above and below the viewport. This prevents blank flashes during fast scrolling — items are ready before they enter view.
        </p>
      </div>

      <div className={styles.viewportContainer}>
        <div className={styles.spacer} style={{ height: TOTAL_ITEMS * 40 * 0.04 }} />
        <div style={{ position: "absolute", left: 0, right: 0, top: 26, display: "flex", flexDirection: "column", gap: 2, padding: "var(--space-1)" }}>
          <span className={styles.overscanLabel}>+{OVERSCAN} overscan above</span>
          {Array.from({ length: OVERSCAN }, (_, i) => (
            <div key={`above-${i}`} className={styles.overscanItem}>
              Item {12 + i}
            </div>
          ))}
          <div className={styles.viewport} style={{ position: "relative", top: 0 }}>
            <span className={styles.viewportLabel}>viewport</span>
            {Array.from({ length: VISIBLE_COUNT }, (_, i) => (
              <div key={i} className={styles.visibleItem}>
                Item {15 + i}
              </div>
            ))}
          </div>
          {Array.from({ length: OVERSCAN }, (_, i) => (
            <div key={`below-${i}`} className={styles.overscanItem}>
              Item {27 + i}
            </div>
          ))}
          <span className={styles.overscanLabel}>+{OVERSCAN} overscan below</span>
        </div>
      </div>

      <div className={styles.formula}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--space-2)" }}>
          <span>DOM Nodes:</span>
          <span className={styles.domBadge} data-severity="low">{domCount}</span>
          <span style={{ fontSize: "0.58rem", color: "var(--color-muted)", fontWeight: 400 }}>
            ({VISIBLE_COUNT} visible + {OVERSCAN * 2} overscan)
          </span>
        </div>
      </div>
    </>
  );
}

function CombinedView() {
  const [activePhase, setActivePhase] = useState(1);

  const phases = [
    { title: "Window", stat: `${VISIBLE_COUNT} nodes`, desc: "Calculate which items fall within the scroll viewport. Only these get rendered." },
    { title: "Overscan", stat: `+${OVERSCAN * 2} buffer`, desc: "Add extra items above and below to prevent blank flashes during fast scrolling." },
    { title: "Transform", stat: "GPU layer", desc: "Position items with translateY instead of top. Runs on compositor thread at 60fps." },
    { title: "Recycle", stat: "0 GC", desc: "Reuse DOM nodes as items scroll out. Update content and transform — no create/destroy." },
  ];

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[4]}</div>
        <p className={styles.widgetNote}>
          A production virtual scroller combines all four optimizations into a single pipeline. Each phase builds on the previous.
        </p>
      </div>

      <div className={styles.pipelineGrid}>
        {phases.map((p, i) => (
          <div
            key={i}
            className={styles.pipelineCard}
            data-active={i + 1 === activePhase ? "true" : undefined}
            onClick={() => setActivePhase(i + 1)}
          >
            <div className={styles.pipelineTitle}>
              <span className={styles.pipelineNum}>{i + 1}</span>
              {p.title}
            </div>
            <div className={styles.pipelineStat}>{p.stat}</div>
            <div className={styles.pipelineDesc}>{p.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}

function CodeView() {
  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[5]}</div>
        <p className={styles.widgetNote}>
          The core algorithm: given a scroll position, compute the visible range, slice the data, and position items with transforms.
        </p>
      </div>

      <div className={styles.codeBlock}>
        <span className={styles.codeComment}>{"// Core virtual scroll calculation"}</span>{"\n"}
        {"function "}<span className={styles.codeHighlight}>getVisibleRange</span>{"(scrollTop, viewportHeight, itemHeight, totalItems) {"}{"\n"}
        {"  const "}<span className={styles.codeHighlight}>startIndex</span>{" = Math.floor(scrollTop / itemHeight);"}{"\n"}
        {"  const visibleCount = Math.ceil(viewportHeight / itemHeight);"}{"\n"}
        {"  const "}<span className={styles.codeHighlight}>overscan</span>{` = ${OVERSCAN};`}{"\n"}
        {"\n"}
        {"  const start = Math.max(0, startIndex - overscan);"}{"\n"}
        {"  const end = Math.min(totalItems, startIndex + visibleCount + overscan);"}{"\n"}
        {"\n"}
        {"  return { start, end };"}{"\n"}
        {"}"}{"\n"}
        {"\n"}
        <span className={styles.codeComment}>{"// Render loop"}</span>{"\n"}
        {"function "}<span className={styles.codeHighlight}>renderItems</span>{"(range, items, container) {"}{"\n"}
        {"  "}<span className={styles.codeComment}>{"// Set total height for scrollbar"}</span>{"\n"}
        {"  container.style.height = `${items.length * itemHeight}px`;"}{"\n"}
        {"\n"}
        {"  for (let i = range.start; i < range.end; i++) {"}{"\n"}
        {"    const node = pool.acquire();"}{"\n"}
        {"    node.textContent = items[i];"}{"\n"}
        {"    node.style."}<span className={styles.codeHighlight}>transform</span>{" = `translateY(${i * itemHeight}px)`;"}{"\n"}
        {"  }"}{"\n"}
        {"}"}
      </div>
    </>
  );
}

function LibrariesView() {
  const features = [
    { feature: "Fixed height", rw: true, tv: true },
    { feature: "Variable height", rw: false, tv: true },
    { feature: "Dynamic measurement", rw: false, tv: true },
    { feature: "Horizontal scroll", rw: true, tv: true },
    { feature: "Grid layout", rw: true, tv: true },
    { feature: "Infinite scroll", rw: false, tv: true },
    { feature: "SSR support", rw: false, tv: true },
    { feature: "Framework agnostic", rw: false, tv: true },
    { feature: "Bundle size", rw: "6.2 kB", tv: "2.8 kB" },
    { feature: "Maintained", rw: "Legacy", tv: "Active" },
  ];

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>{STEP_TITLES[6]}</div>
        <p className={styles.widgetNote}>
          <code>react-window</code> is the established choice for fixed-height lists. <code>@tanstack/virtual</code> handles variable heights, dynamic measurement, and works with any framework.
        </p>
      </div>

      <div className={styles.widgetPanel}>
        <table className={styles.featureTable}>
          <thead>
            <tr>
              <th>Feature</th>
              <th>react-window</th>
              <th>@tanstack/virtual</th>
            </tr>
          </thead>
          <tbody>
            {features.map((f) => (
              <tr key={f.feature}>
                <td>{f.feature}</td>
                <td>{typeof f.rw === "boolean" ? (
                  f.rw ? <span className={styles.checkMark}>Yes</span> : <span className={styles.crossMark}>No</span>
                ) : f.rw}</td>
                <td>{typeof f.tv === "boolean" ? (
                  f.tv ? <span className={styles.checkMark}>Yes</span> : <span className={styles.crossMark}>No</span>
                ) : f.tv}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
