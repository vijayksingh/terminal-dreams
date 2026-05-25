"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StepBar } from "../_shared/StepBar";
import {
  CanvasDomProvider,
  useCanvasDomContext,
  STEP_LABELS,
} from "./canvas-dom-context";
import styles from "./CanvasDomLab.module.css";
import { useState } from "react";

export function CanvasDomLab({ activeStep }: { activeStep: number }) {
  return (
    <CanvasDomProvider activeStep={activeStep}>
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
    </CanvasDomProvider>
  );
}

function StepWidget() {
  const { activeStep } = useCanvasDomContext();
  switch (activeStep) {
    case 1: return <PipelinesOverview />;
    case 2: return <DomPipelineView />;
    case 3: return <DomAdvantagesView />;
    case 4: return <CanvasPipelineView />;
    case 5: return <CrossoverView />;
    case 6: return <HybridView />;
    case 7: return <ExamplesView />;
    default: return null;
  }
}

function PipelinesOverview() {
  const domSteps = ["HTML", "Style", "Layout", "Paint", "Composite"];
  const canvasSteps = ["JS", "Draw", "Composite"];

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Rendering Pipelines</div>
        <p className={styles.widgetNote}>
          The browser offers two rendering paths. The DOM pipeline runs five stages for every frame. Canvas skips layout entirely and draws pixels directly.
        </p>
      </div>

      <div className={styles.pipelinesGrid}>
        <div className={styles.pipelineCard}>
          <div className={styles.pipelineLabel}>
            DOM <span className={styles.pipelineStepCount}>{domSteps.length} stages</span>
          </div>
          <div className={styles.pipelineFlow}>
            {domSteps.map((step, i) => (
              <span key={step} style={{ display: "contents" }}>
                <span className={styles.pipelineStep}>{step}</span>
                {i < domSteps.length - 1 && <span className={styles.pipelineArrow}>&rarr;</span>}
              </span>
            ))}
          </div>
        </div>

        <div className={styles.pipelineCard}>
          <div className={styles.pipelineLabel}>
            Canvas <span className={styles.pipelineStepCount}>{canvasSteps.length} stages</span>
          </div>
          <div className={styles.pipelineFlow}>
            {canvasSteps.map((step, i) => (
              <span key={step} style={{ display: "contents" }}>
                <span className={styles.pipelineStep}>{step}</span>
                {i < canvasSteps.length - 1 && <span className={styles.pipelineArrow}>&rarr;</span>}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.widgetPanel}>
        <p className={styles.widgetNote}>
          DOM gives you layout, accessibility, and CSS for free. Canvas gives you raw drawing speed but you manage everything yourself.
        </p>
      </div>
    </>
  );
}

function DomPipelineView() {
  const stages = [
    { title: "Style Calc", cost: "N elements", desc: "Resolve CSS rules for every node in the subtree" },
    { title: "Layout", cost: "N boxes", desc: "Compute position, size, and overflow for each box" },
    { title: "Paint", cost: "N regions", desc: "Record draw commands for visible layers" },
  ];

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>DOM Rendering Cost</div>
        <p className={styles.widgetNote}>
          Each DOM mutation triggers style, layout, and paint. Cost scales with element count — every stage walks the tree.
        </p>
      </div>

      <div className={styles.costGrid}>
        {stages.map((stage) => (
          <div key={stage.title} className={styles.costCell}>
            <div className={styles.costCellTitle}>{stage.title}</div>
            <div className={styles.costCellValue}>{stage.cost}</div>
            <div className={styles.costCellNote}>{stage.desc}</div>
          </div>
        ))}
      </div>

      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Per-Element Overhead</div>
        <p className={styles.widgetNote}>
          Adding 1,000 DOM nodes means 1,000 style resolutions, 1,000 layout calculations, and 1,000 paint entries. The browser cannot skip intermediate steps — the cascade must resolve fully before layout begins.
        </p>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <span className={styles.badge}>O(n) style</span>
          <span className={styles.badge}>O(n) layout</span>
          <span className={styles.badge}>O(n) paint</span>
        </div>
      </div>
    </>
  );
}

function DomAdvantagesView() {
  const advantages = [
    {
      icon: "Ev",
      title: "Native Events",
      desc: "Click, hover, focus, keyboard — the browser handles hit testing, event bubbling, and delegation. No manual coordinate math.",
    },
    {
      icon: "A11y",
      title: "Accessibility",
      desc: "Screen readers traverse the DOM tree. Tabindex, aria-labels, roles, and focus management come built-in.",
    },
    {
      icon: "CSS",
      title: "Text & CSS",
      desc: "Text wrapping, selection, copy-paste, CSS inheritance, media queries, and responsive layout are all free with DOM nodes.",
    },
  ];

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>DOM Advantages</div>
        <p className={styles.widgetNote}>
          The DOM pipeline is slower per element, but it provides foundational features that Canvas cannot replicate without significant effort.
        </p>
      </div>

      {advantages.map((adv) => (
        <div key={adv.title} className={styles.advantageCard}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)" }}>
            <div className={styles.advantageIcon}>{adv.icon}</div>
            <div className={styles.advantageTitle}>{adv.title}</div>
          </div>
          <p className={styles.widgetNote}>{adv.desc}</p>
        </div>
      ))}
    </>
  );
}

function CanvasPipelineView() {
  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Canvas Rendering</div>
        <p className={styles.widgetNote}>
          Canvas provides an immediate-mode drawing API. You issue draw commands directly to a pixel buffer — no layout engine, no style resolution, no DOM tree.
        </p>
        <span className={styles.badge}>direct to pixel buffer</span>
      </div>

      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Core API Calls</div>
        <div className={styles.codeSample}>
{`const ctx = canvas.getContext("2d");

ctx.fillStyle = "#3b82f6";
ctx.fillRect(10, 10, 200, 40);

ctx.beginPath();
ctx.arc(120, 120, 50, 0, Math.PI * 2);
ctx.fill();

ctx.drawImage(sprite, 0, 0, 64, 64);`}
        </div>
      </div>

      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Trade-offs</div>
        <div style={{ display: "flex", gap: "var(--space-2)", flexWrap: "wrap" }}>
          <span className={styles.badge}>no hit testing</span>
          <span className={styles.badge}>no text selection</span>
          <span className={styles.badge}>no a11y tree</span>
          <span className={styles.badge}>manual redraw</span>
        </div>
        <p className={styles.widgetNote}>
          You own the render loop. Every frame, you clear and redraw. Hit testing requires manual coordinate checks. Accessibility needs a parallel DOM structure.
        </p>
      </div>
    </>
  );
}

function CrossoverView() {
  const { elementCount, setElementCount } = useCanvasDomContext();

  const domCost = elementCount * 0.08;
  const canvasCost = 2 + elementCount * 0.005;
  const maxCost = Math.max(domCost, canvasCost, 1);
  const domPct = Math.min((domCost / maxCost) * 100, 100);
  const canvasPct = Math.min((canvasCost / maxCost) * 100, 100);
  const crossover = elementCount >= 1000 && elementCount <= 5000;

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Performance Crossover</div>
        <p className={styles.widgetNote}>
          DOM cost grows linearly with element count. Canvas has fixed overhead but scales much slower. The crossover point typically falls between 1,000 and 5,000 elements.
        </p>
      </div>

      <div className={styles.widgetPanel}>
        <label className={styles.widgetNote}>
          <strong>Elements:</strong> {elementCount.toLocaleString()}
          <input
            type="range"
            min={50}
            max={20000}
            step={50}
            value={elementCount}
            onChange={(e) => setElementCount(Number(e.target.value))}
            style={{ width: "100%", accentColor: "var(--diagram-layer-3)" }}
          />
        </label>
      </div>

      <div className={styles.perfChart}>
        <div className={styles.perfBar}>
          <span className={styles.perfLabel}>DOM</span>
          <div className={styles.perfBarTrack}>
            <div className={`${styles.perfBarFill} ${styles.perfBarFillDom}`} style={{ width: `${domPct}%` }} />
          </div>
          <span className={styles.perfValue}>{domCost.toFixed(1)}ms</span>
        </div>
        <div className={styles.perfBar}>
          <span className={styles.perfLabel}>Canvas</span>
          <div className={styles.perfBarTrack}>
            <div className={`${styles.perfBarFill} ${styles.perfBarFillCanvas}`} style={{ width: `${canvasPct}%` }} />
          </div>
          <span className={styles.perfValue}>{canvasCost.toFixed(1)}ms</span>
        </div>
      </div>

      <div className={styles.widgetPanel} style={{ textAlign: "center" }}>
        {crossover ? (
          <p className={styles.widgetNote}>
            <span className={styles.crossoverBadge}>crossover zone</span> At {elementCount.toLocaleString()} elements, DOM and Canvas costs are converging. This is where the rendering strategy decision matters most.
          </p>
        ) : elementCount < 1000 ? (
          <p className={styles.widgetNote}>
            At {elementCount.toLocaleString()} elements, DOM is fast enough. You get events, accessibility, and CSS for free.
          </p>
        ) : (
          <p className={styles.widgetNote}>
            At {elementCount.toLocaleString()} elements, Canvas is significantly faster. DOM overhead dominates the frame budget.
          </p>
        )}
      </div>
    </>
  );
}

function HybridView() {
  const canvasItems = ["Grid cells", "Shape fills", "Connection lines", "Data points", "Background grid"];
  const domItems = ["Selection handles", "Tooltips", "Text inputs", "Context menus", "Toolbar controls"];

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Hybrid Architecture</div>
        <p className={styles.widgetNote}>
          Production apps rarely use pure Canvas or pure DOM. They layer a Canvas for bulk rendering underneath a DOM overlay for interactive controls. The two layers are position-synchronized.
        </p>
      </div>

      <div className={styles.layerStack}>
        <div className={styles.domLayer}>
          <div className={`${styles.layerTitle} ${styles.layerTitleDom}`}>DOM Overlay (top)</div>
          <div className={styles.layerItems}>
            {domItems.map((item) => (
              <span key={item} className={styles.layerItem}>{item}</span>
            ))}
          </div>
        </div>
        <div className={styles.canvasLayer}>
          <div className={`${styles.layerTitle} ${styles.layerTitleCanvas}`}>Canvas Layer (bottom)</div>
          <div className={styles.layerItems}>
            {canvasItems.map((item) => (
              <span key={item} className={styles.layerItem}>{item}</span>
            ))}
          </div>
        </div>
      </div>

      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Synchronization</div>
        <p className={styles.widgetNote}>
          The DOM overlay uses <code>position: absolute</code> over the canvas. On pan/zoom, both layers transform together. Canvas redraws on <code>requestAnimationFrame</code>; DOM elements update via React state.
        </p>
      </div>
    </>
  );
}

function ExamplesView() {
  const examples = [
    {
      title: "Figma",
      canvas: ["Vector shapes", "Frame fills", "Boolean operations", "Pen tool paths"],
      dom: ["Property panels", "Layer list", "Text editing", "Toolbar", "Menus"],
    },
    {
      title: "Google Sheets",
      canvas: ["Cell grid", "Cell values", "Borders", "Selection highlight", "Frozen rows/cols"],
      dom: ["Formula bar", "Column headers", "Cell editor", "Menus", "Scrollbars"],
    },
    {
      title: "Excalidraw",
      canvas: ["Shapes", "Arrows", "Freehand strokes", "Background grid"],
      dom: ["Toolbar", "Color picker", "Text editing", "Export dialog", "Context menu"],
    },
  ];

  return (
    <>
      <div className={styles.widgetPanel}>
        <div className={styles.widgetTitle}>Real-World Examples</div>
        <p className={styles.widgetNote}>
          Each of these apps uses a hybrid Canvas + DOM approach. Canvas handles the bulk of visible elements; DOM handles interaction surfaces.
        </p>
      </div>

      {examples.map((ex) => (
        <div key={ex.title} className={styles.exampleCard}>
          <div className={styles.exampleTitle}>{ex.title}</div>
          <div className={styles.exampleSplit}>
            <div className={styles.exampleColumn}>
              <div className={`${styles.exampleColumnTitle} ${styles.exampleColumnTitleCanvas}`}>Canvas</div>
              {ex.canvas.map((item) => (
                <div key={item} className={styles.exampleItem}>{item}</div>
              ))}
            </div>
            <div className={styles.exampleColumn}>
              <div className={`${styles.exampleColumnTitle} ${styles.exampleColumnTitleDom}`}>DOM</div>
              {ex.dom.map((item) => (
                <div key={item} className={styles.exampleItem}>{item}</div>
              ))}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
