// ── Frontend Design Lesson Plan ────────────────────────────────
//
// Every stop maps to a lesson with specific interactive mechanics.
// Agents building content import `getLessonMeta(stopId)` to know
// exactly what to scaffold.
//
// DESIGN PHILOSOPHY:
// 1. The interactive IS the lesson, not a supplement to prose.
// 2. Scrollytelling is the primary narrative device — sticky visual
//    that transforms as the reader scrolls through explanation steps.
// 3. Readers discover concepts through manipulation, not reading.
// 4. Each interaction should produce an "aha moment" that couldn't
//    happen through text alone.

import type { FdStopKind } from "./frontend-design-types";

// ── Format definitions ─────────────────────────────────────────

export type LessonFormat =
  | "scrollytelling"
  | "explorable"
  | "challenge-chain"
  | "build-along"
  | "battle"
  | "anatomy"
  | "playground"
  | "system-design";

export type Effort = "small" | "medium" | "large" | "xl";

export type ScrollStep = {
  /** What the sticky visual shows at this scroll position */
  visual: string;
  /** The prose paragraph the reader sees (1-3 sentences max) */
  narrative: string;
  /** Any reader interaction available at this step */
  interaction?: string;
};

export type DiscoveryMechanic = {
  /** What the reader does */
  action: string;
  /** What they see happen */
  reaction: string;
  /** The concept this teaches (the aha) */
  teaches: string;
};

export type InteractiveSpec = {
  component: string;
  description: string;
  reuses?: string[];
};

export type LessonMeta = {
  stopId: string;
  format: LessonFormat;
  effort: Effort;
  /** Max prose — scrollytelling steps count, not separate article text */
  proseTarget: [number, number];
  /** Interactive components to build */
  interactives: InteractiveSpec[];
  /** Scroll steps for scrollytelling lessons */
  scrollSteps?: ScrollStep[];
  /** Discovery mechanics — how interaction teaches */
  discoveries: DiscoveryMechanic[];
  learningOutcome: string;
  agentNotes: string;
};

// ── Format guide (for agents) ──────────────────────────────────
//
// scrollytelling
//   THE primary format. Two-column layout:
//   - Sticky side (60% width): interactive visualization that
//     transforms at each scroll trigger point.
//   - Scroll side (40% width): short narrative steps (2-4 sentences
//     each) that the reader scrolls through.
//   The visual NEVER resets — it builds cumulatively. By the end of
//   the scroll, the reader has watched the full concept construct
//   itself piece by piece.
//   Technical: IntersectionObserver on step markers triggers state
//   changes on the sticky visual. Each step = a state index.
//   Reduced motion: all transitions instant, scroll still works.
//   Examples: Rendering Pipeline, Event Loop, CORS, OAuth, ISR
//
// explorable
//   No guided narrative. Reader is dropped into an interactive
//   environment with a goal/question. They discover the answer
//   through experimentation. Small "nudge" hints appear if stuck.
//   Think: Nicky Case's Explorable Explanations.
//   Layout: full-width interactive with thin instruction bar.
//   Prose: question/challenge framing (50-100 words), then the
//   interactive IS the content. Summary insight at the end.
//   Examples: Box Model, Stacking Context, Formatting Context
//
// challenge-chain
//   Sequence of 4-8 micro-challenges that build on each other.
//   Each challenge: small code editor or interactive puzzle.
//   Complete one → unlock next → concepts compound.
//   Failed attempts get specific feedback (not just "wrong").
//   Layout: single challenge visible at a time, progress bar at top.
//   Prose: challenge description (1-2 sentences), then the editor/puzzle.
//   Examples: Coding Assignments, XSS (try to bypass sanitization)
//
// build-along
//   Scroll-driven code evolution. As reader scrolls, code changes
//   appear as diffs AND the live preview updates simultaneously.
//   Reader CAN edit any step and see their change cascade forward.
//   Layout: scrollytelling variant — sticky code+preview, scroll
//   narration explains each diff.
//   Key: FPS/perf counter visible throughout, showing impact of
//   each addition.
//   Examples: Virtual Scroll Implementation
//
// battle
//   Two (or three) approaches compete on the same task with
//   shared controls. Reader configures the scenario (data size,
//   network speed, etc.) and watches approaches handle it live.
//   Animated metrics: FPS, latency, bytes, DOM nodes, memory.
//   The reader discovers which approach wins WHERE — not a static
//   comparison but a dynamic "race."
//   Layout: side-by-side panels with shared control bar above,
//   live metric dashboard below.
//   Examples: Canvas vs DOM, HTTP/1.1 vs 2 vs 3, CSR vs SSR vs SSG
//
// anatomy
//   A complex artifact (HTTP request, OAuth flow, browser DevTools
//   panel, component tree) is rendered at full fidelity. Reader
//   hovers/clicks regions to "dissect" them — each region expands
//   into an explanation with mini-interactive.
//   Like a medical anatomy atlas but for web concepts.
//   Layout: full-width diagram, click regions expand inline.
//   Prose: only appears on interaction (tooltip + expandable detail).
//   Examples: DOM API Refresher, Observer Overview, Browser Storage
//
// playground
//   Completely open-ended tool. Reader builds/configures something
//   and sees the result. No guided flow, no challenges — just a
//   well-designed instrument. Good for "builder" topics.
//   Layout: full-width tool with output panel.
//   Prose: minimal usage instructions only.
//   Examples: CSP Builder, Cookie Lab, srcset Builder
//
// system-design
//   Scrollytelling architecture walkthrough PLUS a working mini-app
//   demo of the core mechanic. Structure:
//   Phase 1: Scrollytelling — requirements → architecture diagram
//     builds up component by component as reader scrolls.
//   Phase 2: Working demo — the "core mechanic" as an interactive
//     you can actually use (infinite scroll, drag-drop, etc.)
//   Phase 3: Scrollytelling — tradeoffs, edge cases, alternatives.
//   Prose: ~1500-2500 words across all scroll steps.
//   Examples: All 12 system design problems

// ── Shared layout primitives to build ──────────────────────────
//
// These are reusable layout components that individual lessons compose:
//
// ScrollytellingShell
//   Props: steps: ScrollStep[], renderVisual: (stepIndex) => ReactNode
//   Handles: IntersectionObserver on step markers, sticky positioning,
//   step index state, scroll progress bar, reduced-motion fallback.
//   Two variants: visual-left (default) or visual-right.
//
// BattleArena
//   Props: approaches: Approach[], sharedControls: Control[],
//          metrics: Metric[]
//   Handles: side-by-side layout, shared input routing, live metric
//   dashboard with animated counters, winner highlighting.
//
// ChallengeRunner
//   Props: challenges: Challenge[], onComplete: () => void
//   Handles: sequential unlock, progress bar, code editor integration,
//   test runner, hint system (3 progressive hints per challenge),
//   solution reveal, failure feedback.
//
// AnatomyViewer
//   Props: regions: Region[], renderDiagram: () => ReactNode
//   Handles: hover/click region detection, inline expansion,
//   tooltip positioning, breadcrumb trail of explored regions.
//
// CodeEvolution
//   Props: steps: CodeStep[], language: string
//   Handles: diff rendering (green/red), step animation on scroll,
//   editable code per step, live preview, metric overlay.

// ── Lesson plan per stop ───────────────────────────────────────

export const LESSON_PLAN: Record<string, LessonMeta> = {
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Section 1: Core Fundamentals
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "core-box-model": {
    stopId: "core-box-model",
    format: "explorable",
    effort: "medium",
    proseTarget: [100, 200],
    interactives: [
      {
        component: "BoxModelExplorable",
        description:
          "A single div rendered large on screen. Reader can DRAG the edges of each " +
          "layer (content, padding, border, margin) to resize them. As they drag: " +
          "computed values update live, a FormulaBar at bottom recalculates total width. " +
          "A toggle switches box-sizing — the outer dimensions SNAP to stay the same while " +
          "the content area shrinks/grows (animated). The aha: 'oh, border-box means the " +
          "box stays the same size but the content adapts.' " +
          "Second discovery: set margin to negative → watch the element overlap its neighbor. " +
          "Third: set margin to 'auto' on a block element → watch it center itself.",
        reuses: ["DemoSandbox", "MeasureLine", "FormulaBar", "Annotation"],
      },
    ],
    discoveries: [
      {
        action: "Drag padding outward",
        reaction: "Total box size grows (content-box) or content area shrinks (border-box)",
        teaches: "box-sizing controls whether padding eats into content or expands the box",
      },
      {
        action: "Toggle content-box ↔ border-box",
        reaction: "In content-box, outer size jumps. In border-box, inner content shrinks but outer stays fixed",
        teaches: "border-box makes width/height refer to the TOTAL box, not just content",
      },
      {
        action: "Set left/right margin to auto on a block element",
        reaction: "Element smoothly centers within its container",
        teaches: "margin:auto distributes remaining space equally — the classic centering trick",
      },
      {
        action: "Drag margin to negative values",
        reaction: "Element overlaps its neighbor",
        teaches: "Negative margins pull elements toward or past their boundaries",
      },
    ],
    learningOutcome: "Intuitively predict element size under both box-sizing modes by dragging, not reading",
    agentNotes:
      "No explanation text up front. Drop the reader into the draggable box. A tiny 'try dragging the edges' " +
      "nudge fades after 3 seconds. The FormulaBar formula changes shape when toggling box-sizing — " +
      "that visual formula change IS the explanation. " +
      "Color layers: content (blue, --diagram-layer-0), padding (green, --diagram-layer-1), " +
      "border (purple, --diagram-layer-2), margin (orange/transparent, --diagram-layer-4). " +
      "After the reader has explored, a 'what you discovered' summary fades in at the bottom.",
  },

  "core-positioning": {
    stopId: "core-positioning",
    format: "explorable",
    effort: "large",
    proseTarget: [100, 200],
    interactives: [
      {
        component: "PositioningExplorable",
        description:
          "A page mock-up with 5 colored elements in a document flow. " +
          "Reader selects an element (click), then chooses a position mode from a toolbar. " +
          "The element ANIMATES to its new position. Crucially: " +
          "- A ghost outline stays where the element WAS in normal flow (for relative/absolute/fixed). " +
          "- The 'containing block' gets a glowing dashed border so you SEE what it's relative to. " +
          "- Offset handles (top/right/bottom/left) appear as draggable sliders on the edges. " +
          "- For 'sticky': a scroll container activates — scroll it and watch the element " +
          "  flow normally until it hits the threshold, then STICK. " +
          "Discovery: make a parent relative, then a child absolute — watch the containing " +
          "block shift from viewport to parent. THIS is the aha.",
        reuses: ["DemoSandbox", "Annotation"],
      },
    ],
    discoveries: [
      {
        action: "Set element to 'absolute' without a positioned parent",
        reaction: "Element jumps to position relative to viewport/initial containing block; ghost shows where it was",
        teaches: "Absolute removes from flow and positions relative to nearest positioned ancestor (or viewport)",
      },
      {
        action: "Set parent to 'relative', then child to 'absolute'",
        reaction: "Containing block border moves from viewport to parent — child repositions relative to parent",
        teaches: "The 'relative parent + absolute child' pattern: relative creates a containing block",
      },
      {
        action: "Scroll with a 'sticky' element",
        reaction: "Element scrolls normally, then locks in place when it hits the threshold",
        teaches: "Sticky is a hybrid: relative until a scroll threshold, then fixed within its scroll container",
      },
      {
        action: "Set 'fixed' and scroll the page",
        reaction: "Element stays locked to the viewport while everything else scrolls",
        teaches: "Fixed is always relative to the viewport, ignoring all parent positioning",
      },
    ],
    learningOutcome: "Predict where any element will render given its position mode and ancestor chain",
    agentNotes:
      "The ghost outline is CRITICAL — it shows what the element is 'relative' to. Without it, " +
      "people can't see the connection between normal flow position and offset position. " +
      "Containing block glow: animate the dashed border appearing when a positioned ancestor exists. " +
      "Sticky needs a real scrollable container embedded in the demo — not the page scroll.",
  },

  "core-formatting-ctx": {
    stopId: "core-formatting-ctx",
    format: "explorable",
    effort: "medium",
    proseTarget: [150, 250],
    interactives: [
      {
        component: "BFCExplorable",
        description:
          "Three mini-scenarios the reader cycles through (tabs or scroll): " +
          "Scenario 1 — MARGIN COLLAPSE: Two blocks with 20px margin stacked. " +
          "  The 40px gap you'd expect is only 20px. Reader toggles 'overflow:hidden' on " +
          "  a parent wrapper → margins STOP collapsing → gap jumps to 40px. " +
          "  Animated margin arrows show the overlap resolving. " +
          "Scenario 2 — FLOAT CLEARING: A container with a floated child. Container " +
          "  height collapses to 0 (the float escapes). Reader toggles BFC triggers: " +
          "  overflow:auto, display:flow-root, contain:layout — container snaps to " +
          "  contain the float. Show height value animating. " +
          "Scenario 3 — FLOAT EXCLUSION: Text wrapping around a float. Reader adds " +
          "  a BFC to the text container → text STOPS wrapping and forms its own column. " +
          "Each scenario: a 'WHY?' reveal button that shows the BFC boundary as a glowing border.",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs", "Annotation", "StatusDot"],
      },
    ],
    discoveries: [
      {
        action: "Toggle overflow:hidden on a parent between two margin-collapsed blocks",
        reaction: "Margins stop collapsing — the gap between elements doubles",
        teaches: "A BFC prevents margin collapse across its boundary",
      },
      {
        action: "Toggle display:flow-root on a container with a floated child",
        reaction: "Container height snaps from 0 to enclosing the float",
        teaches: "A BFC contains its floats — the classic clearfix replacement",
      },
      {
        action: "Click 'WHY?' to see BFC boundary",
        reaction: "A glowing dashed border appears showing where the formatting context begins/ends",
        teaches: "BFC is an invisible boundary that changes how children interact with the outside",
      },
    ],
    learningOutcome: "Identify when a BFC is created and predict how it affects margin collapse, float clearing, and layout isolation",
    agentNotes:
      "The animated margin arrows are the key visual device for Scenario 1 — two arrows approaching " +
      "each other and OVERLAPPING (collapse) vs stopping at the BFC boundary (no collapse). " +
      "The 'WHY?' button exists because BFC is invisible — you need to SHOW the boundary " +
      "to make the concept tangible. Use --color-accent for the BFC boundary glow.",
  },

  "core-stacking-ctx": {
    stopId: "core-stacking-ctx",
    format: "explorable",
    effort: "large",
    proseTarget: [100, 200],
    interactives: [
      {
        component: "StackingExplorable",
        description:
          "3D perspective view of 6 overlapping elements. The page is tilted ~30° on X axis " +
          "to show depth. Each element is a colored card with a z-index label. " +
          "Reader can: " +
          "1. DRAG elements up/down in the z-axis (changes z-index, animates layer position) " +
          "2. Toggle properties that CREATE stacking contexts: opacity(<1), transform, filter, " +
          "   will-change, isolation:isolate " +
          "3. Nest elements (drag one card INTO another as a child) " +
          "THE AHA MOMENT: create a stacking context on a z-index:1 parent, then set " +
          "its child to z-index:9999 — the child STILL renders below a z-index:2 sibling " +
          "of the parent. The 3D view makes this VISCERALLY clear: the child is trapped " +
          "inside its parent's layer. " +
          "Each stacking context gets a colored border that wraps its children.",
        reuses: ["DemoSandbox", "Annotation"],
      },
    ],
    discoveries: [
      {
        action: "Set child z-index to 9999 while parent has z-index:1",
        reaction: "Child stays below a sibling with z-index:2 — it's trapped in its parent's context",
        teaches: "z-index only competes within the SAME stacking context, not globally",
      },
      {
        action: "Toggle opacity:0.99 on an element",
        reaction: "A new stacking context forms (shown as colored border), all children regroup inside it",
        teaches: "Opacity < 1 creates a stacking context — a common accidental trap",
      },
      {
        action: "Drag a z-index:5 element into a z-index:1 parent",
        reaction: "Element drops below elements it was previously above — its effective z-index is now bounded by parent",
        teaches: "Nesting inside a stacking context resets the z-index competition scope",
      },
    ],
    learningOutcome: "Debug z-index issues by identifying stacking context boundaries through 3D mental model",
    agentNotes:
      "The 3D tilt view is EVERYTHING. Use CSS perspective + rotateX on a container. " +
      "translateZ for z-axis positioning (proportional to z-index). " +
      "When a stacking context forms, animate its children GROUPING together and the " +
      "context border appearing. The 'trapped z-index' demo should be the first suggested " +
      "experiment (via a nudge: 'try making the red card a child of the blue card').",
  },

  "core-render-cycle": {
    stopId: "core-render-cycle",
    format: "scrollytelling",
    effort: "xl",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "RenderPipelineScrolly",
        description:
          "Sticky visual: horizontal pipeline diagram — 5 connected stages as wide boxes. " +
          "DOM → Style → Layout → Paint → Composite. Starts empty/dim. " +
          "As reader scrolls through steps: " +
          "1. DOM stage lights up — show HTML parsing into DOM tree " +
          "2. Style stage — show CSS rules matching to DOM nodes (arrows connecting rules to elements) " +
          "3. Layout stage — show boxes being sized and positioned (animated box dimensions appearing) " +
          "4. Paint stage — show rasterization (elements filling with color, left→right wipe) " +
          "5. Composite stage — show layers stacking (3D exploded view, then flatten) " +
          "THEN the interactive part: a 'trigger panel' appears. Reader clicks CSS properties " +
          "(color, width, transform, opacity) and the pipeline HIGHLIGHTS which stages re-run. " +
          "width → Layout+Paint+Composite all glow (expensive!). " +
          "transform → only Composite glows (cheap!). " +
          "FORCED REFLOW: reader clicks 'read offsetHeight between writes' — show the pipeline " +
          "running TWICE in one frame (red warning pulse).",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Pipeline empty, all stages dim/outlined",
        narrative: "Every time something changes on a web page, the browser runs a pipeline to figure out what to show. Let's walk through each stage.",
      },
      {
        visual: "DOM stage lights up. Show HTML tags → tree structure animation",
        narrative: "First, the browser parses HTML into a DOM tree — a hierarchy of nodes. This tree is the browser's internal model of your page.",
      },
      {
        visual: "Style stage lights up. CSS rules fly in from the left, arrows connect to matching DOM nodes",
        narrative: "Next, it resolves every CSS rule to compute the final styles for each element. Selector specificity, cascade, inheritance — all resolved here.",
      },
      {
        visual: "Layout stage lights up. Boxes appear around elements with dimension labels animating in",
        narrative: "Now the browser calculates the exact position and size of every element. This is where your flexbox gaps, grid columns, and block flows become pixel coordinates.",
      },
      {
        visual: "Paint stage lights up. Elements fill with color in a left-to-right wipe",
        narrative: "The browser rasterizes each layer into pixels — drawing backgrounds, borders, text, shadows. This is the most visually intuitive stage: it literally paints.",
      },
      {
        visual: "Composite stage lights up. Layers shown in 3D, then flatten together",
        narrative: "Finally, painted layers are composited together in the right order. This is the only stage that can run on the GPU, which is why it's fast.",
      },
      {
        visual: "Trigger panel appears below pipeline. 'width' is highlighted, Layout+Paint+Composite glow red",
        narrative: "Not all changes are equal. Changing 'width' forces the browser to re-run Layout, Paint, AND Composite — the most expensive path.",
        interaction: "Click different CSS properties to see which stages they trigger",
      },
      {
        visual: "'transform' highlighted, only Composite glows green",
        narrative: "But 'transform' skips straight to Composite — no layout recalculation, no repaint. This is why transform animations are silky smooth.",
        interaction: "Try: color (Paint+Composite), opacity (Composite only), font-size (Layout+Paint+Composite)",
      },
      {
        visual: "Forced reflow: pipeline runs twice rapidly, red warning pulses",
        narrative: "The trap: reading layout properties (offsetHeight) between DOM writes forces a synchronous layout — the pipeline runs MID-FRAME. Do this in a loop and you get layout thrashing.",
        interaction: "Toggle 'read between writes' to see the pipeline double-fire",
      },
    ],
    discoveries: [
      {
        action: "Click 'transform' in the trigger panel",
        reaction: "Only the Composite stage glows — all others stay dim",
        teaches: "transform/opacity changes skip Layout and Paint entirely, handled by the GPU compositor",
      },
      {
        action: "Click 'width' in the trigger panel",
        reaction: "Layout + Paint + Composite all glow red — the full expensive path",
        teaches: "Geometry changes (width, height, margin, padding) trigger the entire pipeline from Layout onward",
      },
      {
        action: "Toggle 'read between writes' mode",
        reaction: "Pipeline runs TWICE in rapid succession with red warning flash",
        teaches: "Interleaving DOM reads and writes forces synchronous layout — the #1 cause of jank",
      },
    ],
    learningOutcome: "Predict which pipeline stages a CSS change triggers and avoid layout thrashing",
    agentNotes:
      "ScrollytellingShell format. The pipeline should be the FULL width of the sticky panel. " +
      "Each stage is a wide colored box with an icon. Connections between stages are thick arrows " +
      "with animated data-flow particles when active. The trigger panel is the explorable part " +
      "that appears AFTER scrollytelling completes — so the reader first learns what the pipeline " +
      "IS (scroll), then experiments with what TRIGGERS it (interact). " +
      "Property-to-stage mapping: use csstriggers.com data.",
  },

  "core-composition": {
    stopId: "core-composition",
    format: "scrollytelling",
    effort: "medium",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "CompositionLayerScrolly",
        description:
          "Sticky visual: a mock webpage (header, hero image, sidebar, content, footer). " +
          "Initially flat (all one layer). As reader scrolls: " +
          "1. Show the page as a single paint layer " +
          "2. Add 'will-change: transform' to a sidebar — it SEPARATES into its own layer " +
          "   (3D exploded view, sidebar floats above) " +
          "3. Add a CSS animation to the hero — it promotes to GPU layer " +
          "4. Add 5 more layers — show VRAM counter climbing " +
          "5. VRAM counter goes red — 'layer explosion' warning " +
          "After scroll: interactive where reader toggles properties on elements and watches " +
          "layers form/merge. Layer tree panel (like Chrome DevTools) on the side.",
        reuses: ["DemoSandbox", "Annotation"],
      },
    ],
    scrollSteps: [
      {
        visual: "Flat webpage, all elements in one paint layer. Label: '1 layer, 2MB VRAM'",
        narrative: "By default, the browser paints your entire page into a single layer. Simple, memory-efficient, but any change repaints everything.",
      },
      {
        visual: "Sidebar separates upward in 3D view, gets its own colored border. '2 layers, 2.4MB'",
        narrative: "When you add will-change:transform, the browser promotes that element to its own compositor layer. Now it can be moved independently without repainting its neighbors.",
      },
      {
        visual: "Hero image also separates. Animated opacity pulse on it. '3 layers, 4.1MB'",
        narrative: "CSS animations automatically promote elements too. The hero's opacity animation now runs entirely on the GPU — main thread is free.",
      },
      {
        visual: "5 more elements promote. VRAM counter climbs quickly. Turns yellow at 12MB, red at 20MB",
        narrative: "But every layer costs GPU memory. Promote too many elements and you get 'layer explosion' — more memory overhead than the performance you gained.",
      },
    ],
    discoveries: [
      {
        action: "Toggle will-change:transform on an element",
        reaction: "Element lifts into its own layer in 3D view, VRAM counter increases",
        teaches: "Layer promotion trades memory for compositing performance — use it intentionally",
      },
      {
        action: "Promote 8+ elements and watch VRAM counter go red",
        reaction: "Performance actually degrades — too many layers to composite efficiently",
        teaches: "Layer explosion: over-promotion is worse than no promotion",
      },
    ],
    learningOutcome: "Understand layer promotion triggers and the memory cost of over-promoting",
    agentNotes:
      "The 3D exploded view of layers is a well-known DevTools feature — replicate it in miniature. " +
      "VRAM counter is the key constraint visualization. It should feel like a resource meter in a game. " +
      "The post-scroll interactive lets readers experiment freely with promotion.",
  },

  "core-gpu": {
    stopId: "core-gpu",
    format: "battle",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "GPUBattle",
        description:
          "Two identical animations side by side: a ball bouncing across the screen. " +
          "Left: animated with top/left (main thread, CPU). " +
          "Right: animated with transform:translateX (GPU compositor). " +
          "Both run at 60fps initially. Then: a 'STRESS' slider that adds heavy JS work " +
          "to the main thread (blocking loop). As stress increases: " +
          "Left animation JITTERS (frames drop, ball stutters). " +
          "Right animation stays SMOOTH (GPU doesn't care about main thread). " +
          "Live metrics: FPS counter, main thread busy %, frame time bar chart. " +
          "The divergence under stress is the entire lesson.",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Crank the stress slider to 80%",
        reaction: "Left animation drops to 15fps and stutters; right animation stays at 60fps smooth",
        teaches: "GPU-composited animations (transform, opacity) are immune to main thread blocking",
      },
      {
        action: "Reduce stress back to 0%",
        reaction: "Both animations look identical — the difference is only visible under load",
        teaches: "The performance gap only matters when the main thread is busy — which it always is in real apps",
      },
    ],
    learningOutcome: "Choose GPU-composited properties for animations and understand why main-thread animations jank under load",
    agentNotes:
      "Battle format. The stress slider is the teaching device — it reveals a truth that's " +
      "invisible under ideal conditions. Frame time bar chart should show spikes on the " +
      "left side and flat bars on the right. Use requestAnimationFrame for both, but the " +
      "left one reads/writes layout properties (triggering layout per frame) while " +
      "the right uses transform (compositor only).",
  },

  "core-event-loop": {
    stopId: "core-event-loop",
    format: "scrollytelling",
    effort: "xl",
    proseTarget: [600, 900],
    interactives: [
      {
        component: "EventLoopScrolly",
        description:
          "FLAGSHIP LESSON. Sticky visual: the event loop machine. " +
          "Components: call stack (vertical), task queue (horizontal), microtask queue " +
          "(horizontal, distinct color), Web API area (timers, fetch), render steps area. " +
          "Scrollytelling Phase 1 — 'Meet the Machine': scroll through to learn each part. " +
          "Each component highlights and labels itself as reader scrolls. " +
          "Scrollytelling Phase 2 — 'Watch It Run': a code example appears, and the reader " +
          "scrolls to step through execution. Each scroll step = one operation: " +
          "  - push to call stack " +
          "  - setTimeout registers in Web API area (timer counting down) " +
          "  - Promise.resolve() goes to microtask queue " +
          "  - function returns, pop from call stack " +
          "  - stack empty → microtask queue drains FIRST " +
          "  - then task queue processes " +
          "Phase 3 — INTERACTIVE: reader gets 4-5 scenarios. For each, they PREDICT the " +
          "output order by dragging numbered blocks. Then they click 'run' and watch the " +
          "event loop execute. Right answer = green. Wrong = the loop replays with " +
          "their wrong prediction highlighted vs actual. " +
          "Scenarios: setTimeout(0) vs Promise, nested microtasks, rAF timing, " +
          "async/await desugaring, queueMicrotask starvation.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Empty event loop machine, all areas dim",
        narrative: "JavaScript is single-threaded. One call stack, one thread. But it handles async operations through a clever machine: the event loop.",
      },
      {
        visual: "Call stack highlights with glowing border",
        narrative: "The call stack tracks what's executing RIGHT NOW. Functions push on when called, pop off when they return. Only the top frame runs.",
      },
      {
        visual: "Task queue highlights. Show 'setTimeout callback' and 'click handler' as example items",
        narrative: "The task queue (or 'macrotask queue') holds callbacks from timers, events, and I/O. These wait their turn — one runs per loop iteration.",
      },
      {
        visual: "Microtask queue highlights in distinct color. Show 'Promise.then' as example",
        narrative: "The microtask queue is special: it drains COMPLETELY between tasks. Every Promise .then(), MutationObserver callback, and queueMicrotask() goes here.",
      },
      {
        visual: "Web API area highlights. Timers counting down, fetch in-flight",
        narrative: "Web APIs (setTimeout, fetch, DOM events) run OUTSIDE JavaScript. They register callbacks that land in the task or microtask queue when ready.",
      },
      {
        visual: "Render steps area highlights between task and microtask processing",
        narrative: "Between tasks, the browser may run rendering: style → layout → paint. If the microtask queue keeps filling, rendering gets blocked — that's how you freeze the UI.",
      },
      {
        visual: "Code example appears. First line highlights. 'console.log(1)' pushes to call stack",
        narrative: "Let's trace a real example. Synchronous code runs first — it goes straight to the call stack.",
        interaction: "Scroll slowly to step through each operation",
      },
      {
        visual: "setTimeout(fn, 0) — timer icon appears in Web API area, timer starts counting",
        narrative: "setTimeout(fn, 0) doesn't mean 'run immediately.' It means 'schedule this task for the NEXT loop iteration, after the current script finishes.'",
      },
      {
        visual: "Promise.resolve().then(fn) — callback slides into microtask queue",
        narrative: "Promise.then goes to the microtask queue. This queue has priority — it drains BEFORE any macrotask runs.",
      },
      {
        visual: "Call stack empties. Microtask queue drains first (promise callback executes). Then timeout fires",
        narrative: "Stack empties → microtasks drain first → then the setTimeout callback runs. This is why Promise.then always fires before setTimeout(0).",
      },
      {
        visual: "Prediction game UI appears: 'What's the output order?' with draggable blocks",
        narrative: "Your turn. Predict the execution order, then run it to check. The event loop is clockwork — once you internalize the rules, you'll never be surprised by async behavior again.",
        interaction: "Drag the output blocks into the order you think they'll execute, then click 'Run'",
      },
    ],
    discoveries: [
      {
        action: "Predict that setTimeout(0) runs before Promise.then",
        reaction: "Wrong — the loop replays showing microtask queue draining before task queue",
        teaches: "Microtasks always run before the next macrotask, regardless of registration order",
      },
      {
        action: "Watch a nested microtask chain execute",
        reaction: "All microtasks drain before any render step — the 'rendering blocked' indicator flashes",
        teaches: "Microtask chains can starve rendering — each microtask that schedules another extends the drain",
      },
      {
        action: "Get a prediction right",
        reaction: "Green confirmation + the loop replays to reinforce the correct mental model",
        teaches: "Positive reinforcement of the event loop rules through active prediction",
      },
    ],
    learningOutcome: "Predict the execution order of any mix of sync code, promises, timeouts, and rAF callbacks",
    agentNotes:
      "This is the FLAGSHIP. Two-phase approach: scrollytelling teaches the machine, then interactive " +
      "prediction game tests understanding. The prediction game is what makes this sticky — reading about " +
      "the event loop doesn't stick, but getting predictions WRONG and seeing the replay does. " +
      "5 scenarios, increasing difficulty: " +
      "1. console.log vs setTimeout(0) — warmup " +
      "2. setTimeout vs Promise.then — the classic " +
      "3. Promise.then inside Promise.then (nested microtasks) " +
      "4. async/await (show desugaring to Promise chain) " +
      "5. setTimeout + queueMicrotask + rAF — the full gauntlet " +
      "Color code: sync (white), microtask (accent), macrotask (layer-0), render (layer-2).",
  },

  "core-microtasks": {
    stopId: "core-microtasks",
    format: "explorable",
    effort: "medium",
    proseTarget: [200, 300],
    interactives: [
      {
        component: "MicrotaskExplorable",
        description:
          "Focused zoom into the microtask checkpoint from the event loop lesson. " +
          "Reader has a code editor where they can write microtask-producing code " +
          "(Promise.resolve().then(), queueMicrotask(), MutationObserver). " +
          "A live visualization shows the microtask queue filling and draining. " +
          "THE STARVATION DEMO: a button 'start infinite microtask loop' — click it " +
          "and a UI counter STOPS updating (frozen). The microtask queue shows items " +
          "endlessly re-enqueuing. A 'render blocked' indicator screams. " +
          "Reader must figure out how to fix it (hint: use setTimeout to yield). " +
          "Second demo: show that microtasks run between EACH macrotask — queue 3 " +
          "setTimeouts with a Promise.then inside each. Show the interleaving.",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs"],
      },
    ],
    discoveries: [
      {
        action: "Click 'start infinite microtask loop'",
        reaction: "UI completely freezes — counter stops, buttons unresponsive, 'render blocked' indicator screams",
        teaches: "Microtask queue drains completely before yielding — infinite microtasks = infinite blocking",
      },
      {
        action: "Replace recursive queueMicrotask with setTimeout",
        reaction: "UI unfreezes — each iteration yields to the render step",
        teaches: "setTimeout yields to the browser between iterations; queueMicrotask does not",
      },
      {
        action: "Queue 3 setTimeouts each containing a Promise.then",
        reaction: "Execution: task1 → micro1 → task2 → micro2 → task3 → micro3 (interleaved)",
        teaches: "The microtask checkpoint runs after EACH macrotask, not just once",
      },
    ],
    learningOutcome: "Understand microtask checkpoints, starvation risk, and when to yield to the browser",
    agentNotes:
      "The starvation demo is the lesson. The reader should physically experience the frozen UI — " +
      "try clicking buttons that don't respond, see the counter stuck. That visceral freeze teaches " +
      "more than any explanation. The fix (setTimeout to yield) should be discoverable through " +
      "the hint system, not stated up front.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Section 2: DOM API
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "dom-refresher": {
    stopId: "dom-refresher",
    format: "anatomy",
    effort: "medium",
    proseTarget: [200, 400],
    interactives: [
      {
        component: "DOMAnatomyViewer",
        description:
          "A rendered DOM tree visualization (15-20 nodes, looks like DevTools Elements panel). " +
          "Each node is clickable. Clicking reveals all available DOM methods for that node type " +
          "in a slide-out panel: query, traverse, mutate, create, remove. " +
          "Each method in the panel is RUNNABLE — click it to see it execute on the tree " +
          "(nodes highlight, new nodes slide in, removed nodes fade out). " +
          "Categories: Create (green), Read (blue), Update (yellow), Delete (red). " +
          "A search bar: type a method name, tree highlights what it would return. " +
          "E.g., type 'querySelectorAll(\".card\")' → all .card nodes glow.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Click a node and then click 'parentNode' traversal",
        reaction: "Parent node highlights, showing the relationship in the tree",
        teaches: "DOM traversal methods navigate the tree by relationship — parent, child, sibling",
      },
      {
        action: "Type querySelector('.card') in the search bar",
        reaction: "First matching .card node glows — only the first one",
        teaches: "querySelector returns the FIRST match, querySelectorAll returns all",
      },
      {
        action: "Click 'removeChild' on a node",
        reaction: "Node fades out with animation, children disappear too, tree reflows",
        teaches: "Removing a node removes its entire subtree from the document",
      },
    ],
    learningOutcome: "Navigate the DOM API by trying methods on a live tree instead of reading documentation",
    agentNotes:
      "Anatomy format. The tree IS the documentation — every method is a runnable experiment. " +
      "The search bar is the 'try before you read' device. Make the tree respond to every method " +
      "with visible animation so the reader sees the effect immediately. " +
      "Group methods by CRUD colors in the slide-out panel.",
  },

  "dom-querying": {
    stopId: "dom-querying",
    format: "battle",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "QueryMethodBattle",
        description:
          "A DOM tree with 50 nodes. Four query methods race to find elements: " +
          "getElementById, querySelector, getElementsByClassName, querySelectorAll. " +
          "Reader types a query target (e.g., 'all elements with class .card'). " +
          "Each method: shows its syntax, runs with animated traversal through the tree " +
          "(nodes light up as they're checked), returns result with timing. " +
          "KEY DISCOVERY: 'Live vs Static' demo — run getElementsByClassName, then ADD " +
          "a matching element to the DOM. The live HTMLCollection updates automatically. " +
          "Run querySelectorAll — it does NOT update (static NodeList). " +
          "Show the collection object with a live item count that does/doesn't change.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Query getElementsByClassName, then add a matching element",
        reaction: "The returned HTMLCollection length increases automatically — it's alive",
        teaches: "getElementsBy* returns a LIVE collection that auto-updates when the DOM changes",
      },
      {
        action: "Query querySelectorAll, then add a matching element",
        reaction: "The returned NodeList length stays the same — frozen at query time",
        teaches: "querySelectorAll returns a STATIC snapshot — safe to iterate, won't change",
      },
      {
        action: "Compare traversal animations for getElementById vs querySelector('.class .nested')",
        reaction: "getElementById jumps instantly (hash map), querySelector walks the tree",
        teaches: "getElementById is O(1) via hash map; complex selectors require tree traversal",
      },
    ],
    learningOutcome: "Choose query methods based on live vs static needs and performance characteristics",
    agentNotes:
      "Battle format with animated traversal. The tree nodes lighting up one-by-one during a " +
      "querySelector run vs the instant jump of getElementById is a powerful visual. " +
      "The live/static collection demo is the one thing most devs don't know — give it " +
      "a prominent 'add element' button that makes the difference visceral.",
  },

  "dom-query-perf": {
    stopId: "dom-query-perf",
    format: "scrollytelling",
    effort: "medium",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "QueryPerfScrolly",
        description:
          "Sticky visual: a large DOM tree (100+ nodes visualized as a tree graph). " +
          "Scroll steps reveal optimization strategies one at a time: " +
          "1. Naive: document.querySelector on every action → tree fully traversed each time (all nodes glow) " +
          "2. Scope narrowing: cache a parent, query from it → only subtree traversed (fraction of nodes glow) " +
          "3. ID caching: getElementById once, store reference → zero traversal (instant green) " +
          "4. Batch reads/writes: show layout thrashing (read-write-read-write) vs batched (read-read-write-write) " +
          "After scrollytelling: interactive where reader refactors a 'bad' code snippet " +
          "to apply each optimization, seeing the tree traversal animation improve each time.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Large DOM tree. Every query lights up ALL nodes (full traversal)",
        narrative: "Querying from 'document' scans the entire tree every time. With a few queries this is fine — but in a scroll handler firing 60x/second, it adds up fast.",
      },
      {
        visual: "Parent cached. Query from subtree — only 12 of 100 nodes light up",
        narrative: "Scope your queries. Cache a reference to the closest parent and query from there. The browser traverses 12 nodes instead of 100.",
      },
      {
        visual: "getElementById — instant single-node highlight, zero traversal",
        narrative: "IDs are hash-map lookups. One operation, regardless of tree size. Cache the result and you never even do that.",
      },
      {
        visual: "Layout thrashing demo: pipeline running 6 times in one frame. Then batched: pipeline runs once",
        narrative: "The worst query perf issue isn't the query itself — it's reading layout values between DOM writes. Batch all reads, then all writes.",
        interaction: "Toggle between 'interleaved' and 'batched' to see the pipeline impact",
      },
    ],
    discoveries: [
      {
        action: "Watch the tree traversal animation shrink from 100 to 12 nodes",
        reaction: "The query time bar drops proportionally — visual proof of scope narrowing",
        teaches: "Querying from a cached parent is proportional to SUBTREE size, not document size",
      },
      {
        action: "Toggle between interleaved and batched read/write patterns",
        reaction: "Pipeline runs drop from 6 to 1 — forced reflows eliminated",
        teaches: "Layout thrashing from interleaved reads/writes is usually worse than the query cost itself",
      },
    ],
    learningOutcome: "Scope queries to the smallest subtree, cache references, and batch DOM reads/writes",
    agentNotes:
      "Scrollytelling where the visual is a DOM tree that literally shows fewer nodes lighting up " +
      "at each optimization step. The visual shrinkage IS the performance lesson. " +
      "The layout thrashing demo should reuse the pipeline from core-render-cycle — " +
      "show it running multiple times per frame.",
  },

  "dom-assignment-1": {
    stopId: "dom-assignment-1",
    format: "challenge-chain",
    effort: "large",
    proseTarget: [200, 400],
    interactives: [
      {
        component: "DOMChallengeChain",
        description:
          "6 progressive challenges building a filterable/sortable list with raw DOM API: " +
          "Challenge 1: Render a list from data array (createElement + appendChild) " +
          "Challenge 2: Add a 'delete' button to each item (event delegation vs per-element) " +
          "Challenge 3: Add a search input that filters items (live filtering as you type) " +
          "Challenge 4: Add sort buttons (A-Z, Z-A) without re-querying the DOM " +
          "Challenge 5: Add keyboard navigation (arrow keys move focus between items) " +
          "Challenge 6: Add drag-to-reorder (pointer events, no library) " +
          "Each challenge: starter code + editable section + live preview + 3-4 tests. " +
          "Failed tests show SPECIFIC feedback ('you forgot to remove the element from the DOM, " +
          "not just hide it'). " +
          "Each completed challenge unlocks the next. Progress bar at top. " +
          "Solution reveals have DIFF view showing optimal implementation.",
        reuses: [],
      },
    ],
    discoveries: [
      {
        action: "Complete challenge 2 with per-element click handlers",
        reaction: "Test passes but a hint says 'try event delegation — add one handler to the parent instead'",
        teaches: "Event delegation: one handler on a parent is more efficient than N handlers on children",
      },
      {
        action: "Try sorting by clearing innerHTML and re-rendering",
        reaction: "Test passes but a hint says 'you destroyed all DOM state (focus, scroll position). Try moving existing nodes instead'",
        teaches: "appendChild on an existing node MOVES it — no need to recreate elements for reordering",
      },
    ],
    learningOutcome: "Fluently build interactive DOM features without any framework, using efficient patterns",
    agentNotes:
      "Challenge-chain format. Each challenge builds on the previous (code carries forward). " +
      "The FEEDBACK on suboptimal solutions is what teaches — not just pass/fail but 'you did it, " +
      "but here's the better way.' The diff view for solutions should show both the reader's " +
      "approach and the optimal one side by side.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Section 3: Web APIs for Complex UI
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "api-observer-overview": {
    stopId: "api-observer-overview",
    format: "anatomy",
    effort: "small",
    proseTarget: [200, 400],
    interactives: [
      {
        component: "ObserverAnatomyViewer",
        description:
          "Four Observer cards arranged in a grid: Intersection, Mutation, Resize, Performance. " +
          "Each card shows: the observer name, what it watches (with icon), and a 40px-tall " +
          "MINI LIVE DEMO showing the observer firing in real-time. " +
          "IntersectionObserver: tiny scroll area with element entering/leaving viewport. " +
          "MutationObserver: DOM tree with nodes being added/removed, observer logging. " +
          "ResizeObserver: resizable box reporting dimensions. " +
          "PerformanceObserver: paint timing entries appearing. " +
          "Click any card to expand: shows constructor, observe(), disconnect(), " +
          "callback signature, and 3 use cases. " +
          "A 'which observer?' quiz: describe a scenario, reader picks the right observer.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Click each observer card and see its live mini-demo firing",
        reaction: "Each observer watches something different and fires at different times",
        teaches: "Observer APIs share the same pattern (construct, observe, callback) but watch fundamentally different things",
      },
      {
        action: "Take the 'which observer?' quiz",
        reaction: "Scenario: 'Detect when a sidebar resizes' → wrong answer 'IntersectionObserver' gets specific feedback: 'IO tracks visibility, not size — you want ResizeObserver'",
        teaches: "Each observer has a narrow, specific purpose — know which matches which use case",
      },
    ],
    learningOutcome: "Know which Observer API to reach for given any UI requirement",
    agentNotes:
      "Anatomy format with mini live demos. The mini demos should be 40-50px tall — just enough " +
      "to show the observer firing. They run automatically, no reader interaction needed. " +
      "The 'which observer?' quiz at the bottom (5 scenarios) is what makes this sticky " +
      "instead of a forgettable reference card. Expand each card with smooth animation.",
  },

  "api-intersection": {
    stopId: "api-intersection",
    format: "explorable",
    effort: "large",
    proseTarget: [200, 300],
    interactives: [
      {
        component: "IntersectionExplorable",
        description:
          "A 300px-tall viewport container with 5 colored blocks below it (scroll to see them). " +
          "Reader scrolls the container and sees: " +
          "- Threshold lines overlaid on each element (dashed horizontals at configured thresholds) " +
          "- Intersection ratio bar per element (0-100%, fills as element enters) " +
          "- isIntersecting badge flipping green/red per element " +
          "- A callback log that prints entries as they fire (with timestamp) " +
          "ROOTMARGIN VISUALIZATION: a translucent colored border around the viewport showing " +
          "the rootMargin expanding/contracting the observation zone. Drag the margin handles " +
          "to change rootMargin — watch callbacks fire EARLIER (positive margin) or LATER (negative). " +
          "THRESHOLD BUILDER: click to place threshold lines on an element. Each threshold = " +
          "a horizontal dashed line. Callback fires when element crosses each line. " +
          "Reader discovers: rootMargin=100px means 'start loading 100px before it's visible.'",
        reuses: ["DemoSandbox", "Dial", "Annotation"],
      },
    ],
    discoveries: [
      {
        action: "Set rootMargin to 200px and scroll slowly",
        reaction: "Elements trigger callbacks while still 200px BELOW the visible area — the observation zone is bigger than the viewport",
        teaches: "rootMargin expands the invisible observation area — perfect for lazy-loading ahead of scroll",
      },
      {
        action: "Place thresholds at 0, 0.5, and 1.0 on an element",
        reaction: "Three separate callbacks fire as the element enters, reaches halfway, and is fully visible",
        teaches: "Multiple thresholds give you granular scroll-linked feedback without a scroll listener",
      },
      {
        action: "Scroll fast vs slow through the same element",
        reaction: "Fast scrolling might skip intermediate thresholds — callback fires with the final ratio, not every threshold",
        teaches: "IntersectionObserver is not synchronous — fast scroll can skip intermediate thresholds",
      },
    ],
    learningOutcome: "Configure IntersectionObserver thresholds and rootMargin for lazy loading, infinite scroll, and scroll-triggered animations",
    agentNotes:
      "Explorable format. The rootMargin visualization as a draggable colored border is the " +
      "key interaction. Most tutorials just describe rootMargin in text — SHOWING the observation " +
      "zone expanding as you drag is the breakthrough. " +
      "Threshold lines ON the elements (not as abstract numbers) make the concept physical. " +
      "The callback log should look like a console — timestamped, color-coded per element.",
  },

  "api-assignment-2": {
    stopId: "api-assignment-2",
    format: "challenge-chain",
    effort: "medium",
    proseTarget: [150, 300],
    interactives: [
      {
        component: "IOChallengeChain",
        description:
          "4 progressive challenges: " +
          "1. Basic IO: observe 5 elements, log when they enter viewport " +
          "2. Lazy images: set src only when element intersects (with rootMargin=200px) " +
          "3. Infinite scroll: observe a sentinel element at the bottom, load more items on intersect " +
          "4. Scroll-triggered animations: add a CSS class when elements enter, creating a stagger effect " +
          "Each challenge: starter HTML + editable JS + scrollable preview. " +
          "Tests verify: correct threshold, rootMargin used, unobserve called after load, " +
          "animation classes applied at the right time.",
        reuses: [],
      },
    ],
    discoveries: [
      {
        action: "Forget to unobserve after lazy-loading an image",
        reaction: "Test warns: 'observer is still watching loaded images — unnecessary callbacks on every scroll'",
        teaches: "Always unobserve elements after their one-time callback (lazy loading, entrance animations)",
      },
    ],
    learningOutcome: "Implement lazy loading, infinite scroll, and scroll animations with IntersectionObserver",
    agentNotes:
      "4 challenges, each ~15 min. The preview panel MUST be scrollable so the reader can verify " +
      "their IO is actually working. Test for unobserve() — it's the most common omission.",
  },

  "api-mutation": {
    stopId: "api-mutation",
    format: "explorable",
    effort: "medium",
    proseTarget: [200, 300],
    interactives: [
      {
        component: "MutationExplorable",
        description:
          "Left: an interactive DOM tree (click to expand/collapse nodes). " +
          "Action buttons: 'Add child', 'Remove child', 'Change attribute', 'Edit text'. " +
          "Right: MutationRecord live log showing type, target, addedNodes, etc. " +
          "THE TEACHING MECHANIC: config toggles at the top. " +
          "childList / attributes / characterData / subtree / attributeOldValue " +
          "Start with ALL toggles OFF. Reader tries adding a child → nothing logged. " +
          "They discover they need to turn on 'childList' to see it. " +
          "Then they edit a nested child → still nothing. They discover 'subtree'. " +
          "Then they change an attribute but oldValue is 'undefined' → they discover attributeOldValue. " +
          "Each toggle teaches a specific MO config option through NEED, not instruction.",
        reuses: ["DemoSandbox", "DialToggle"],
      },
    ],
    discoveries: [
      {
        action: "Add a child with all config toggles off",
        reaction: "Nothing logged. Nudge appears: 'The observer isn't watching for this — which config option would catch child changes?'",
        teaches: "MutationObserver only watches what you explicitly configure — childList for child changes",
      },
      {
        action: "Turn on childList but mutate a deeply nested child",
        reaction: "Nothing logged. Nudge: 'childList only watches direct children by default'",
        teaches: "subtree:true is needed to observe the entire descendant tree, not just direct children",
      },
      {
        action: "Check an attribute change with attributeOldValue off, then on",
        reaction: "First: oldValue is null. After toggle: oldValue shows the previous attribute value",
        teaches: "attributeOldValue must be explicitly opted into — MO doesn't track previous values by default",
      },
    ],
    learningOutcome: "Configure MutationObserver by discovering what each option does through trial and error",
    agentNotes:
      "Start with everything OFF. The reader discovers what each toggle does by needing it. " +
      "The nudges should be soft ('which config would catch this?') not prescriptive ('turn on childList'). " +
      "The MutationRecord log should format like Chrome DevTools — expandable objects with " +
      "colored property names. Show the full record object, not just a summary.",
  },

  "api-assignment-3": {
    stopId: "api-assignment-3",
    format: "challenge-chain",
    effort: "medium",
    proseTarget: [150, 300],
    interactives: [
      {
        component: "MOChallengeChain",
        description:
          "4 progressive challenges: " +
          "1. Watch for class changes on an element (attributeFilter: ['class']) " +
          "2. Auto-link URLs in a contenteditable div (characterData + subtree) " +
          "3. Prevent infinite loops: disconnect before modifying, reconnect after " +
          "4. Build a DOM change undo system: record MutationRecords, replay in reverse " +
          "Challenge 3 is THE hard challenge — most readers will trigger an infinite loop " +
          "and see the browser tab freeze. Then they discover the disconnect pattern. " +
          "Challenge 4 is the boss: reverting mutations requires understanding the record fields.",
        reuses: [],
      },
    ],
    discoveries: [
      {
        action: "Trigger an infinite loop by modifying DOM inside the MO callback",
        reaction: "Preview freezes, error message: 'Infinite mutation loop detected — your callback is triggering itself'",
        teaches: "MO callbacks that modify the DOM can trigger themselves — always disconnect before modifying",
      },
    ],
    learningOutcome: "Use MutationObserver for DOM augmentation without infinite loops, including undo functionality",
    agentNotes:
      "The infinite loop in challenge 3 should be SAFELY caught (max iterations) with a clear " +
      "error message, not an actual browser freeze. The undo system in challenge 4 is ambitious " +
      "but deeply teaches MutationRecord structure — reverting an addedNodes means removing them, " +
      "reverting a removedNodes means re-inserting them.",
  },

  "api-resize": {
    stopId: "api-resize",
    format: "explorable",
    effort: "medium",
    proseTarget: [200, 300],
    interactives: [
      {
        component: "ResizeExplorable",
        description:
          "A large resizable container (CSS resize: both, with a big drag handle). " +
          "Inside: a card component that CHANGES LAYOUT based on its own width: " +
          "- > 600px: horizontal layout with image left, text right " +
          "- 300-600px: vertical layout, image top, text bottom " +
          "- < 300px: compact mode (image hidden, only title visible) " +
          "NO MEDIA QUERIES used — purely ResizeObserver driven. " +
          "A counter shows how many resize callbacks fire (debounce needed?). " +
          "Side panel: live contentRect/borderBoxSize/contentBoxSize values updating. " +
          "THE COMPARISON: drag a media query-based version alongside. Resize the PAGE " +
          "(not the container) — media query version changes. Resize just the CONTAINER — " +
          "only the RO version responds. " +
          "Aha: 'element queries are real and they don't need CSS container queries.'",
        reuses: ["DemoSandbox", "MeasureLine", "Annotation"],
      },
    ],
    discoveries: [
      {
        action: "Resize just the container (not the browser window)",
        reaction: "RO-based component adapts perfectly; media query-based component doesn't respond at all",
        teaches: "ResizeObserver responds to ELEMENT size, not viewport — true component-level responsiveness",
      },
      {
        action: "Resize rapidly and watch callback counter",
        reaction: "Counter fires for every single pixel of change — potentially hundreds of calls",
        teaches: "RO fires on every size change — debouncing or threshold-checking may be needed for expensive callbacks",
      },
      {
        action: "Check contentBoxSize vs borderBoxSize with padding/border set",
        reaction: "contentBoxSize is smaller by exactly the padding+border amount",
        teaches: "RO gives you both content and border box measurements — choose based on what you're sizing",
      },
    ],
    learningOutcome: "Use ResizeObserver for element-level responsive behavior that media queries can't achieve",
    agentNotes:
      "The side-by-side comparison (RO vs media query) is the core aha. The reader drags " +
      "the container's resize handle and sees ONLY the RO version respond. Then they resize " +
      "the browser window and see both respond. That difference is the whole lesson. " +
      "The card layout changing (horizontal → vertical → compact) should be smooth with transitions.",
  },

  "api-assignment-4": {
    stopId: "api-assignment-4",
    format: "challenge-chain",
    effort: "medium",
    proseTarget: [150, 300],
    interactives: [
      {
        component: "ROChallengeChain",
        description:
          "4 challenges: " +
          "1. Observe a container and set a data-columns attribute (1/2/3) based on width " +
          "2. Build an auto-truncating text component (measure, truncate with '...', add tooltip) " +
          "3. Build a responsive chart that redraws on container resize (canvas redraw) " +
          "4. Build a container-query polyfill: observe parents, apply child styles from JS " +
          "Preview panel is RESIZABLE so reader can test their RO at different sizes.",
        reuses: [],
      },
    ],
    discoveries: [
      {
        action: "Forget to handle the initial size (before any resize)",
        reaction: "Test fails: 'Component has wrong layout on first render — RO doesn't fire until a resize happens'",
        teaches: "RO fires on observe() for the initial size — but you might need to handle the case before observe is called",
      },
    ],
    learningOutcome: "Implement element-responsive layouts, auto-truncation, and responsive canvas with ResizeObserver",
    agentNotes:
      "The resizable preview panel is essential — reader drags it to test their RO code at " +
      "different sizes. Challenge 4 (container query polyfill) is a great boss challenge that " +
      "ties together everything about RO.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Section 4: Virtualisation
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "virt-windowing": {
    stopId: "virt-windowing",
    format: "scrollytelling",
    effort: "large",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "WindowingScrolly",
        description:
          "Sticky visual: a virtual list with 10,000 items. Visual overlays show: " +
          "viewport bounds, overscan zone, rendered items (solid) vs virtualized (ghost). " +
          "Scrollytelling builds up the concept: " +
          "1. Show 10,000 DOM nodes → FPS drops to 3fps (red FPS counter) " +
          "2. Show the windowing insight: 'only 15 are visible — why render 10,000?' " +
          "3. Show the window: viewport + overscan = ~25 rendered items " +
          "4. Show the spacer: total height maintained for correct scrollbar " +
          "5. Scroll the list — items recycle (enter/exit animated) " +
          "6. Show DOM node count: constant 25 regardless of scroll position " +
          "After scrollytelling: the list becomes freely scrollable. Reader sees items " +
          "recycling live. A DOM counter shows the constant node count. " +
          "Controls: change total items (100 → 1M), change overscan (0-20), change viewport height.",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    scrollSteps: [
      {
        visual: "10,000 DOM nodes rendered. FPS counter: 3fps (red). Browser visibly struggling",
        narrative: "10,000 DOM elements. The browser is choking on layout calculations for every single one. This is what happens when you render a large list naively.",
      },
      {
        visual: "Viewport window highlighted. Only 15 items visible. Label: 'only 15 are visible'",
        narrative: "But look at the viewport. The user can only SEE about 15 items at a time. The other 9,985 are invisible — expensive ghosts wasting layout and memory.",
      },
      {
        visual: "Viewport + overscan zone shown. 25 items rendered (solid). Rest are ghost outlines",
        narrative: "The windowing trick: only render what's visible, plus a few overscan items above and below for smooth scrolling. 25 DOM nodes instead of 10,000.",
      },
      {
        visual: "Total height spacer shown as translucent tall block. Scrollbar appears at correct size",
        narrative: "A spacer element with the TOTAL list height (10,000 × item height) tricks the scrollbar into behaving correctly. The user sees a normal scrollbar — the illusion is complete.",
      },
      {
        visual: "List scrolls. Items at top fade out, items at bottom fade in. 'Recycling' label",
        narrative: "As the user scrolls, items leaving the window are unmounted and new items entering are mounted. The DOM nodes recycle — the same 25 slots, different data.",
      },
      {
        visual: "DOM node counter: constant 25. Total items: 10,000. FPS: 60 (green)",
        narrative: "Result: 60fps with 10,000 items, using only 25 DOM nodes. This is virtualization — the same trick used by every performant list, grid, and table.",
        interaction: "Try scrolling freely. Change the item count to 1,000,000. Watch the DOM counter stay at 25.",
      },
    ],
    discoveries: [
      {
        action: "Set item count to 1,000,000 and scroll",
        reaction: "FPS stays at 60, DOM node count stays at 25 — no difference from 10,000",
        teaches: "Virtualization makes list performance independent of total item count — O(viewport) not O(n)",
      },
      {
        action: "Set overscan to 0 and scroll fast",
        reaction: "Blank flashes at the edges of the viewport (items not rendered fast enough)",
        teaches: "Overscan items act as a buffer — they prevent blank flashes during fast scrolling",
      },
    ],
    learningOutcome: "Understand the windowing technique: viewport + overscan + height spacer = constant DOM cost regardless of list size",
    agentNotes:
      "Scrollytelling building up from the 'problem' (10k nodes) to the 'solution' (25 nodes). " +
      "The FPS counter color-coding (red/yellow/green) is the primary metric. " +
      "Ghost outlines for virtualized items are important — they show that the ILLUSION of 10k " +
      "items exists even though only 25 are real. " +
      "After scrollytelling completes, reader gets full control to experiment with parameters.",
  },

  "virt-fixed-vs-variable": {
    stopId: "virt-fixed-vs-variable",
    format: "battle",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "FixedVsVariableBattle",
        description:
          "Two virtual lists side by side. Left: fixed height (40px/row). Right: variable " +
          "(content-dependent, 30-120px). Shared controls: scroll position, add items, jump to index. " +
          "THE VISUAL DIFFERENCE: " +
          "- Fixed: hover over 'getOffset(index)' shows animation: 'index × 40 = 4000' (instant, one multiply) " +
          "- Variable: hover over 'getOffset(index)' shows animation: binary search through " +
          "  position cache (tree traversal, 7 steps for 10k items) " +
          "FormulaBar shows the calculation for each approach in real-time. " +
          "Performance meter: fixed is always fast. Variable is fast for READS (binary search) " +
          "but slow for INSERTS (cache rebuild). " +
          "Discovery: resize a variable-height item → watch the position cache cascade-update " +
          "for all items below it (animated chain reaction).",
        reuses: ["DemoSandbox", "FormulaBar"],
      },
    ],
    discoveries: [
      {
        action: "Hover 'getOffset(5000)' on fixed vs variable",
        reaction: "Fixed: instant '5000 × 40 = 200000'. Variable: animated binary search through 13 steps",
        teaches: "Fixed height = O(1) offset calculation. Variable height = O(log n) via position cache",
      },
      {
        action: "Resize a variable-height item mid-list",
        reaction: "Position cache cascade-updates for ALL items below (animated chain reaction, hundreds of updates)",
        teaches: "Variable height insertion/resize has cascading cost — every subsequent item's position must update",
      },
      {
        action: "Scroll both lists simultaneously on 100k items",
        reaction: "Both maintain 60fps — the difference is in COMPUTATION cost, not perceived performance",
        teaches: "For most use cases, variable height works fine — the computational overhead is negligible at normal list sizes",
      },
    ],
    learningOutcome: "Know the tradeoffs: fixed height is simpler and faster for offset calculation, but variable height handles real content",
    agentNotes:
      "Battle format. The getOffset animation is the teaching device — seeing O(1) multiply " +
      "vs O(log n) binary search makes the algorithmic difference tangible. " +
      "The position cache cascade on resize is the advanced insight most people miss. " +
      "Don't make variable height look BAD — show that it's plenty fast for normal sizes, " +
      "just computationally more complex.",
  },

  "virt-variable-height": {
    stopId: "virt-variable-height",
    format: "build-along",
    effort: "xl",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "VirtualScrollBuildAlong",
        description:
          "Scroll-driven code evolution building a virtual scroller from scratch. " +
          "Sticky panel: code editor (top 60%) + live preview (bottom 40%). " +
          "As reader scrolls through steps, code diffs appear (green additions, red removals) " +
          "and the preview UPDATES with each step. " +
          "FPS COUNTER visible throughout — the reader watches performance IMPROVE with each step. " +
          "Step 1: Naive render (10k items) — FPS: 3 " +
          "Step 2: Add scroll container + total height spacer — FPS: 3 (nothing visible yet) " +
          "Step 3: Calculate visible range (startIndex/endIndex) — FPS: 3 (still rendering all) " +
          "Step 4: Render only visible items — FPS: 58 (THE BIG JUMP) " +
          "Step 5: Add overscan buffer — FPS: 60 (no more blank flashes) " +
          "Step 6: Switch to variable heights — FPS: 55 (slight cost) " +
          "Step 7: Add ResizeObserver for dynamic measurement — FPS: 60 " +
          "Step 8: Use translateY instead of padding-top — FPS: 60 (smoother scroll) " +
          "Reader CAN EDIT any step and see their change affect all subsequent steps.",
        reuses: [],
      },
    ],
    scrollSteps: [
      {
        visual: "Full naive list. FPS: 3. Code shows simple list.map(item => <div>{item}</div>)",
        narrative: "Start with the problem: rendering everything. 10,000 items, 3 frames per second.",
      },
      {
        visual: "Scroll container added. Height spacer element. Code diff shows container setup",
        narrative: "Create the illusion of a full list with a spacer element. Its height = totalItems × itemHeight. The scrollbar will behave correctly.",
      },
      {
        visual: "Range calculation code. startIndex/endIndex formulas highlighted",
        narrative: "From scrollTop and viewport height, calculate which items are visible: startIndex = Math.floor(scrollTop / itemHeight).",
      },
      {
        visual: "Only visible items render. FPS jumps to 58 (green). DOM counter: 25",
        narrative: "The breakthrough: slice the array to only visible items. FPS jumps from 3 to 58 in one line change. This is the core of virtualization.",
      },
      {
        visual: "Overscan added. FPS: 60. No blank flashes during fast scroll",
        narrative: "Add a buffer of 5 items above and below the viewport. This prevents blank flashes during fast scrolling.",
      },
      {
        visual: "Variable heights. Position cache shown. Binary search for scroll offset",
        narrative: "Fixed heights are simple but unrealistic. For variable heights, maintain a position cache and use binary search to find the visible range.",
      },
      {
        visual: "ResizeObserver per rendered item. Measured heights update cache",
        narrative: "You can't know heights until items render. Use ResizeObserver to measure each rendered item and update the position cache dynamically.",
      },
      {
        visual: "translateY replaces padding-top. Scroll is silky smooth",
        narrative: "Final polish: use transform:translateY to position the visible window instead of padding-top. This avoids layout recalculation on every scroll event.",
        interaction: "Try editing any step's code and see the preview update",
      },
    ],
    discoveries: [
      {
        action: "See FPS jump from 3 to 58 at step 4",
        reaction: "A single code change (rendering only visible items) fixes 95% of the performance problem",
        teaches: "Virtualization's core is deceptively simple — the rest is polish and edge cases",
      },
      {
        action: "Remove the overscan at step 5 and scroll fast",
        reaction: "Blank flashes appear at viewport edges — items can't mount fast enough",
        teaches: "Overscan is essential for perceived smoothness — it's the buffer between viewport and reality",
      },
      {
        action: "Edit the itemHeight in step 3 to be wrong",
        reaction: "Scrollbar size becomes wrong and items don't align — the math falls apart",
        teaches: "Accurate height information is the foundation — everything else builds on correct offset calculations",
      },
    ],
    learningOutcome: "Build a variable-height virtual scroller from scratch, understanding how each layer contributes to performance",
    agentNotes:
      "Build-along format (scrollytelling variant). THE FPS COUNTER IS THE STORY. " +
      "The reader watches performance improve with each code addition. " +
      "Step 4 (the big FPS jump from 3 → 58) should be dramatic — add a celebration animation. " +
      "The ability to EDIT any step and see cascading changes is what separates this from " +
      "a video tutorial. Use CodeEvolution primitive with diff highlighting.",
  },

  "virt-tree-grid": {
    stopId: "virt-tree-grid",
    format: "explorable",
    effort: "large",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "VirtualTreeGridExplorable",
        description:
          "Two tabs: Tree Virtualization and 2D Grid Virtualization. " +
          "TREE TAB: " +
          "A file browser tree (200+ nodes, expandable). TWO VIEWS side by side: " +
          "Left: the rendered tree. Right: the FLATTENED array that virtualization sees. " +
          "When you expand a node, watch the flattened array INSERT child entries in real-time. " +
          "When you collapse, they REMOVE. The virtual window overlay shows which flat items render. " +
          "Discovery: the tree structure is an ILLUSION — it's a flat list with indentation. " +
          "GRID TAB: " +
          "A 1000×1000 spreadsheet-like grid. Viewport window overlaid on a minimap showing " +
          "which cells are actually rendered (colored) vs virtualized (grey). " +
          "Scroll both axes — see the rendered window move across the minimap. " +
          "Counter: 'Rendering 150 of 1,000,000 cells'",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs"],
      },
    ],
    discoveries: [
      {
        action: "Expand a tree node and watch the flattened array",
        reaction: "Children INSERT into the flat array at the correct position — the tree is a flat list with indentation data",
        teaches: "Virtualized trees work by flattening the hierarchy into a list — expand/collapse is just inserting/removing from the flat array",
      },
      {
        action: "Scroll the 2D grid and watch the minimap",
        reaction: "A small colored window moves across the minimap — showing the tiny fraction of cells that are actually rendered",
        teaches: "2D virtualization uses the same windowing concept on BOTH axes — startRow/endRow AND startCol/endCol",
      },
    ],
    learningOutcome: "Flatten hierarchical data for virtualization and extend windowing to 2D grids",
    agentNotes:
      "The side-by-side tree + flattened array is the core visual. The flattened array should " +
      "animate insertions/removals in real-time as the reader expands/collapses nodes. " +
      "The 2D grid minimap should be small (200px wide) showing the FULL grid as tiny dots, " +
      "with the rendered viewport as a colored rectangle moving across it.",
  },

  "virt-canvas-dom": {
    stopId: "virt-canvas-dom",
    format: "battle",
    effort: "large",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "CanvasVsDOMBattle",
        description:
          "5,000 colored circles rendered two ways. Left: DOM (divs). Right: Canvas (drawArc). " +
          "Shared controls: " +
          "- Item count slider (100 → 50,000) " +
          "- Animation: all circles moving randomly " +
          "- Click to select (highlight a circle) " +
          "Live metrics: FPS, DOM node count (left only), render time per frame, memory. " +
          "THE INTERESTING PARTS: " +
          "- At 100 items: both are 60fps — no difference " +
          "- At 5,000: DOM drops to 20fps, Canvas still 60fps " +
          "- Click to select: DOM handles it natively (event on element). Canvas requires " +
          "  manual hit testing (show the math: iterate all circles, check distance) " +
          "- Try to select text overlaid on Canvas: impossible. DOM: works naturally " +
          "- Show a HYBRID approach: Canvas for the circles, DOM overlay for labels/tooltips",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Slide item count from 100 to 10,000",
        reaction: "DOM FPS collapses below 10. Canvas FPS stays at 60. The divergence point is visible on the graph",
        teaches: "Canvas rendering cost scales with DRAW calls, not DOM node overhead — it handles thousands of elements that would destroy DOM performance",
      },
      {
        action: "Click a circle on each side",
        reaction: "DOM: instant click handler on the element. Canvas: visible delay as hit-testing iterates all 5000 circles",
        teaches: "Canvas has no built-in event system — every click requires manual hit testing against all shapes",
      },
      {
        action: "Try to tab-navigate or screen-read the Canvas version",
        reaction: "Nothing happens — Canvas is a black box to assistive technology. DOM version is fully accessible",
        teaches: "Canvas sacrifices the accessibility tree — if your content needs to be accessible, DOM or a hybrid approach is required",
      },
    ],
    learningOutcome: "Choose Canvas for rendering performance, DOM for accessibility/interactivity, or hybrid for both",
    agentNotes:
      "Battle format. The crossover point (where Canvas starts winning) is the key insight. " +
      "Show a real-time graph of FPS as item count increases — the lines diverge at a visible " +
      "threshold. The accessibility discovery (tab/screen reader failing on Canvas) is the " +
      "critical counterpoint to Canvas's speed advantage. " +
      "The hybrid demo (Canvas shapes + DOM overlay for interactive labels) is the pragmatic takeaway.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Section 5: Application State Design
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "state-search": {
    stopId: "state-search",
    format: "battle",
    effort: "large",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "DataStructureBattle",
        description:
          "Three data structures racing: Array, Map/Object, Trie. " +
          "Reader types a search query (e.g., 'java'). All three structures search simultaneously " +
          "with ANIMATED TRAVERSAL: " +
          "- Array: linear scan, elements lighting up one-by-one (slow, visible O(n)) " +
          "- Map: hash function animation → instant bucket jump → result (O(1)) " +
          "- Trie: character-by-character tree descent: j→a→v→a→... (O(k) where k=word length) " +
          "Speed bars racing across the screen. Trie wins for PREFIX search (type 'jav' and " +
          "it returns all words starting with 'jav' while Map can't do this at all). " +
          "INSERT and DELETE races too — different winners. " +
          "Dataset size slider: at small sizes, Array wins (cache locality). At large sizes, Map wins. " +
          "Trie always wins for autocomplete-style prefix queries.",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Type a prefix query 'jav' and watch all three search",
        reaction: "Trie returns all 'jav*' matches instantly. Map returns nothing (no prefix support). Array does full scan",
        teaches: "Tries are purpose-built for prefix search — Maps can't do this, and Arrays are linear",
      },
      {
        action: "Switch to exact lookup and try Map vs Array on 100k items",
        reaction: "Map: instant (O(1) hash jump). Array: visible 2-second linear scan",
        teaches: "For exact key lookups, Map/Object is O(1) — use it for any lookup-heavy access pattern",
      },
      {
        action: "Try small dataset (20 items) where Array beats Map",
        reaction: "Array is faster due to cache locality and no hash overhead",
        teaches: "Data structure choice depends on dataset size — small arrays outperform hashmaps due to CPU cache effects",
      },
    ],
    learningOutcome: "Choose Array vs Map vs Trie based on access pattern (exact lookup, prefix search, ordered iteration) and dataset size",
    agentNotes:
      "The animated traversal is EVERYTHING. Seeing the Array scan light up hundreds of elements " +
      "one-by-one while the Map jumps instantly is visceral. The Trie tree-descent animation " +
      "(character by character) is beautiful and teaches the data structure simultaneously. " +
      "The small-dataset-Array-wins discovery prevents cargo-culting 'always use Map.'",
  },

  "state-storage": {
    stopId: "state-storage",
    format: "anatomy",
    effort: "medium",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "StorageAnatomyViewer",
        description:
          "Five storage 'drawers' arranged like a filing cabinet: localStorage, sessionStorage, " +
          "IndexedDB, Cookies, Cache API. Each drawer has a size meter and actual content viewer. " +
          "Click a drawer to open it and: " +
          "- See actual stored data (reads from real browser APIs) " +
          "- Write test data (see it appear in the drawer) " +
          "- See size limit visualization (bar filling toward max) " +
          "- See sync vs async indicator (localStorage blocks; IndexedDB doesn't) " +
          "A 'which storage?' quiz: scenario cards (offline cache, auth token, temp form data, " +
          "large dataset, cross-tab communication) — reader drags each to the right drawer. " +
          "Wrong answers get specific feedback explaining why that storage type is wrong for that use case.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Write 4MB to localStorage, then try to write 2MB more",
        reaction: "QuotaExceededError — the 5MB limit is hit. IndexedDB drawer blinks: 'I can handle this'",
        teaches: "localStorage is limited to ~5MB — use IndexedDB for anything larger",
      },
      {
        action: "Write to localStorage in the quiz drawer and open a 'second tab' preview",
        reaction: "Data appears in the second tab immediately — localStorage is shared across tabs",
        teaches: "localStorage is shared across all same-origin tabs — useful for cross-tab communication",
      },
      {
        action: "Drag 'auth token' to the cookies drawer in the quiz",
        reaction: "Correct — with feedback: 'HttpOnly cookies are the most secure storage for auth tokens because JavaScript can't access them'",
        teaches: "Auth tokens belong in HttpOnly cookies, not localStorage (which is vulnerable to XSS)",
      },
    ],
    learningOutcome: "Pick the right browser storage API based on data size, persistence, security, and access pattern",
    agentNotes:
      "Anatomy format with a filing cabinet metaphor. The real-browser-API integration is key — " +
      "the reader sees ACTUAL data stored in their browser, not mock data. " +
      "The drag-to-drawer quiz is what makes this stick. 8 scenarios, each with specific " +
      "feedback on wrong answers that teaches the constraints of each storage type.",
  },

  "state-memory": {
    stopId: "state-memory",
    format: "scrollytelling",
    effort: "medium",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "MemoryOffloadingScrolly",
        description:
          "Sticky visual: three memory layers as horizontal bars: " +
          "Main Thread (small, fast), Web Worker (medium, parallel), IndexedDB (large, persistent). " +
          "Scrollytelling builds up the offloading strategy: " +
          "1. All data in main thread — memory bar fills and turns red " +
          "2. Move computation to Web Worker — show postMessage animation (serialization cost!) " +
          "3. Move cold data to IndexedDB — main thread memory drops " +
          "4. LRU cache: hot data stays in main thread, evicted to IndexedDB " +
          "5. SharedArrayBuffer: zero-copy sharing (no serialization cost) — show the speed difference " +
          "After scroll: interactive where reader allocates data to different tiers " +
          "and sees memory pressure meter respond.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Main Thread memory bar at 100% (red). Other bars empty",
        narrative: "All data living in main thread memory. Garbage collector runs frequently, long tasks block the UI. Sound familiar?",
      },
      {
        visual: "Data blob animates from Main Thread to Web Worker. Serialization cost counter: '12ms'",
        narrative: "Web Workers run on a separate thread — great for heavy computation. But data must be serialized (structured clone) to cross the boundary. That 12ms copy isn't free.",
      },
      {
        visual: "Cold data slides down to IndexedDB. Main Thread bar shrinks to 40% (green)",
        narrative: "Cold data (rarely accessed) belongs in IndexedDB. Async reads, unlimited storage, survives page reload. Main thread breathes again.",
      },
      {
        visual: "LRU cache visualization: hot items in Main Thread, eviction arrows to IndexedDB",
        narrative: "An LRU cache keeps the most-accessed data in fast main thread memory. When the cache is full, the least-recently-used item gets evicted to IndexedDB.",
      },
      {
        visual: "SharedArrayBuffer: data shared with zero-copy. Serialization counter: '0ms'",
        narrative: "SharedArrayBuffer lets workers access the same memory without copying. Zero serialization cost — but you need Atomics for synchronization. It's powerful but complex.",
        interaction: "Try allocating different amounts of data to each tier",
      },
    ],
    discoveries: [
      {
        action: "Compare postMessage (12ms) vs SharedArrayBuffer (0ms) on a large dataset",
        reaction: "postMessage shows visible serialization delay; SharedArrayBuffer is instant",
        teaches: "Structured clone serialization is the hidden cost of Web Workers — SharedArrayBuffer eliminates it",
      },
      {
        action: "Allocate too much to main thread",
        reaction: "Memory pressure meter goes red, simulated GC pauses appear",
        teaches: "Main thread memory pressure causes GC pauses that directly impact frame rate",
      },
    ],
    learningOutcome: "Design a multi-tier memory strategy: main thread for hot data, Worker for computation, IndexedDB for cold storage",
    agentNotes:
      "The three-bar visualization (main thread / worker / indexeddb) with data blobs moving " +
      "between them is the core visual. The serialization cost counter when data crosses " +
      "thread boundaries is the non-obvious insight — most tutorials hand-wave the postMessage cost.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Section 6: Network
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "net-intro": {
    stopId: "net-intro",
    format: "scrollytelling",
    effort: "medium",
    proseTarget: [600, 800],
    interactives: [
      {
        component: "RequestLifecycleScrolly",
        description:
          "Sticky visual: animated request journey from browser to server. " +
          "Left: browser icon. Right: server icon. Between them: animated pipeline stages. " +
          "As reader scrolls, each stage lights up and expands with detail: " +
          "DNS (lookup animation with cache check), TCP (3-way handshake packets), " +
          "TLS (certificate exchange animation), HTTP (request/response with headers), " +
          "Server processing (gear spinning), Response (bytes streaming back). " +
          "Each stage has a timing bar showing typical latency (DNS: 20ms, TCP: 30ms, etc.). " +
          "After scroll: interactive waterfall chart showing 6 resources loading. " +
          "Toggle: cold start (no caches) vs warm (DNS cached, connections reused) — " +
          "show how subsequent requests skip stages.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Browser and server icons, empty space between them",
        narrative: "You type a URL and press Enter. What happens in the next 200 milliseconds?",
      },
      {
        visual: "DNS stage expands: domain name → IP address. Cache check first (miss), then recursive lookup",
        narrative: "DNS resolves the domain name to an IP address. The browser checks its cache first, then the OS cache, then asks a DNS resolver. Typically 20-120ms.",
      },
      {
        visual: "TCP handshake: SYN → SYN-ACK → ACK packets animate between browser and server",
        narrative: "TCP three-way handshake establishes a reliable connection. Three round trips worth of packets. Another 30-100ms depending on distance.",
      },
      {
        visual: "TLS handshake: certificate exchange, key agreement animated",
        narrative: "For HTTPS: the TLS handshake exchanges certificates and establishes encryption. One more round trip. These handshakes are why the first request is slow.",
      },
      {
        visual: "HTTP request and response with expandable header sections",
        narrative: "Finally: the actual HTTP request. Headers, method, body. The server processes it and sends back a response. This is the part most developers think about — but it's often the fastest stage.",
      },
      {
        visual: "Waterfall chart with cold vs warm toggle. Cold: all stages. Warm: only HTTP",
        narrative: "Subsequent requests skip DNS, TCP, and TLS (connection reuse). That's why the first request is slow and subsequent ones are fast. The browser optimizes aggressively.",
        interaction: "Toggle between cold start and warm to see which stages get eliminated",
      },
    ],
    discoveries: [
      {
        action: "Toggle from cold start to warm",
        reaction: "DNS, TCP, and TLS stages disappear — request goes straight to HTTP. Total time drops by 60-80%",
        teaches: "Connection reuse eliminates most of the request overhead — the first request is uniquely expensive",
      },
    ],
    learningOutcome: "Trace a request from URL to pixels and identify where latency hides in the connection setup stages",
    agentNotes:
      "The animated packet journey between browser and server is the hero visual. Each packet " +
      "should be a small colored shape that physically travels across the screen. " +
      "The cold/warm toggle dramatically removes stages — the visual difference is the lesson.",
  },

  "net-protocols": {
    stopId: "net-protocols",
    format: "battle",
    effort: "medium",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "ProtocolBattle",
        description:
          "Three protocol lanes: HTTP/1.1, HTTP/2, HTTP/3. Each loads the same 6 resources. " +
          "ANIMATED WATERFALL per protocol: " +
          "- HTTP/1.1: sequential requests, head-of-line blocking visible (requests queued behind slow one) " +
          "- HTTP/2: multiplexed streams, all 6 in parallel over single connection. " +
          "  BUT: simulate TCP packet loss → ALL streams stall (TCP HOL blocking) " +
          "- HTTP/3: QUIC, per-stream flow control. Same packet loss → only affected stream stalls, " +
          "  others continue. " +
          "Controls: simulate packet loss (0-10%), resource count (1-20), resource sizes. " +
          "The packet loss slider is the teaching device — at 0% loss, HTTP/2 and /3 look identical. " +
          "At 5% loss, the difference becomes dramatic.",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Set packet loss to 5% and watch HTTP/2 vs HTTP/3",
        reaction: "HTTP/2: ALL streams freeze when one packet is lost. HTTP/3: only the affected stream pauses",
        teaches: "HTTP/2 over TCP has head-of-line blocking at the transport layer — HTTP/3's QUIC eliminates this",
      },
      {
        action: "Set resource count to 20 on HTTP/1.1",
        reaction: "Resources queue in batches of 6 (browser connection limit), taking 4x longer than HTTP/2",
        teaches: "HTTP/1.1 opens max 6 connections per origin — multiplexing eliminates this limit",
      },
    ],
    learningOutcome: "Explain multiplexing and HOL-blocking differences between HTTP/1.1, HTTP/2, and HTTP/3",
    agentNotes:
      "Battle format. The waterfall animations should run simultaneously so the reader can see " +
      "the three approaches racing. The packet loss slider is THE differentiator between HTTP/2 and /3 — " +
      "without loss, they look the same. With loss, HTTP/3's per-stream resilience is visible.",
  },

  "net-long-polling": {
    stopId: "net-long-polling",
    format: "battle",
    effort: "large",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "RealtimeBattle",
        description:
          "Three lanes: Long Polling, WebSocket, SSE. Simulated server sending messages. " +
          "Each lane shows ANIMATED SEQUENCE DIAGRAM: client←→server with message arrows. " +
          "Long Polling: request → wait → response → immediately re-request (overhead visible). " +
          "WebSocket: single connection, bidirectional arrows, full-duplex. " +
          "SSE: single connection, server→client only arrows. " +
          "FREQUENCY TOGGLE: " +
          "- Low frequency (1 msg/5s): all three look similar. Long polling overhead is small " +
          "- Medium frequency (1 msg/s): long polling overhead becomes visible (constant re-requesting) " +
          "- High frequency (10 msg/s): long polling drowns in overhead, WS and SSE are efficient " +
          "RECONNECTION DEMO: simulate disconnect. Show each approach's reconnection behavior. " +
          "SSE auto-reconnects (built-in). WebSocket needs manual reconnection logic. " +
          "Long polling reconnects naturally on next request.",
        reuses: ["DemoSandbox", "DialSegment"],
      },
    ],
    discoveries: [
      {
        action: "Switch frequency from low (1/5s) to high (10/s)",
        reaction: "Long polling lane fills with overhead arrows — most bandwidth is connection setup, not data",
        teaches: "Long polling overhead is proportional to message frequency — at high frequency, most traffic is connection overhead",
      },
      {
        action: "Simulate disconnect on all three",
        reaction: "SSE: auto-reconnects in ~3s (EventSource built-in). WebSocket: stays disconnected until manual reconnection. Long polling: reconnects naturally on next request",
        teaches: "SSE has built-in reconnection; WebSocket requires manual reconnection logic — a common production gotcha",
      },
      {
        action: "Try to send a message client→server on SSE",
        reaction: "SSE lane shows 'server→client only' — can't send. WebSocket lane shows bidirectional arrow",
        teaches: "SSE is unidirectional (server→client). For bidirectional communication, use WebSocket",
      },
    ],
    learningOutcome: "Choose between long polling, WebSocket, and SSE based on frequency, direction, and reconnection needs",
    agentNotes:
      "Battle format with animated sequence diagrams. The frequency toggle is the key teaching " +
      "device — it reveals the truth that all three work fine at low frequency but diverge dramatically " +
      "at high frequency. The reconnection demo covers the most common production issue.",
  },

  "net-rest-graphql": {
    stopId: "net-rest-graphql",
    format: "explorable",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "RESTvsGraphQLExplorable",
        description:
          "A mock API for a 'user profile page' (user info + posts + followers + notifications). " +
          "Left: REST approach. Right: GraphQL approach. " +
          "Reader specifies WHAT DATA THEY NEED for the page (checkboxes: name, avatar, posts, " +
          "follower count, notification count). " +
          "REST: shows the requests that fire (GET /user, GET /user/posts, GET /user/followers, " +
          "GET /user/notifications) and highlights WASTED bytes (fields fetched but not needed). " +
          "GraphQL: shows a single query with exactly the requested fields. Zero waste. " +
          "OVER-FETCHING VISUALIZER: the response JSON with unused fields highlighted in red. " +
          "N+1 PROBLEM: request posts, then for each post request author info → " +
          "show 11 requests (REST) vs 1 (GraphQL). " +
          "TRADEOFF PANEL: show GraphQL's downsides (caching complexity, schema overhead, " +
          "tooling required, error handling differences).",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Request only 'name' and 'avatar' — check the REST response",
        reaction: "REST returns 20+ fields including email, bio, created_at — 80% of the response is wasted",
        teaches: "REST endpoints return fixed shapes — you can't request only the fields you need (over-fetching)",
      },
      {
        action: "Request 'posts with author info' — compare request count",
        reaction: "REST: 1 request for posts + N requests for each author = 11 requests. GraphQL: 1 request with nested resolution",
        teaches: "The N+1 problem: REST requires separate requests for each relationship. GraphQL resolves nested data in a single query",
      },
      {
        action: "Open the tradeoff panel after seeing GraphQL's advantages",
        reaction: "Caching is much harder (no URL-based cache), schema maintenance is real work, tooling overhead is significant",
        teaches: "GraphQL trades endpoint simplicity for query flexibility — it solves over/under-fetching but adds complexity elsewhere",
      },
    ],
    learningOutcome: "Identify when REST's simplicity wins vs when GraphQL's flexibility is worth the tooling cost",
    agentNotes:
      "Explorable format. The response JSON with wasted fields highlighted in RED is the " +
      "most visceral way to show over-fetching. Not a chart — the actual JSON with red stripes " +
      "through unused fields. The N+1 request visualization (11 requests flying vs 1) is equally powerful. " +
      "The tradeoff panel prevents GraphQL evangelism — show real downsides.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Section 7: Web Application Performance
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "perf-js": {
    stopId: "perf-js",
    format: "scrollytelling",
    effort: "large",
    proseTarget: [600, 800],
    interactives: [
      {
        component: "JSPerfScrolly",
        description:
          "Sticky visual: mock Chrome DevTools Performance flame chart. " +
          "Scrollytelling walks through a page load's JS execution: " +
          "1. Single 2MB bundle: one HUGE block in the flame chart, blocking everything " +
          "2. Code-split by route: 3 smaller blocks, with idle gaps between them " +
          "3. Defer non-critical: heavy libraries load AFTER first paint (shown below the fold) " +
          "4. Web Worker: computation moves to separate thread (parallel bar above main thread) " +
          "Each step: time-to-interactive marker moves LEFT (earlier), main thread blocked time shrinks. " +
          "After scroll: interactive where reader drags script blocks between 'critical path' and " +
          "'deferred' zones, watching TTI change in real-time.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Flame chart: one massive 2.1s JS block. TTI marker at 3.8s. Long Task warnings everywhere",
        narrative: "A single 2MB bundle. The browser parses, compiles, and executes it all before anything is interactive. 2.1 seconds of main thread blockage.",
      },
      {
        visual: "Bundle splits into 3 chunks. Gaps appear between them. TTI moves to 2.1s",
        narrative: "Route-based code splitting: only load the current page's JavaScript. The initial chunk is 400KB instead of 2MB. TTI drops by 45%.",
      },
      {
        visual: "Heavy library chunk moves below a 'first paint' line. TTI moves to 1.4s",
        narrative: "Defer non-critical scripts. That charting library isn't needed until the user scrolls to the dashboard. Load it after first paint, not before.",
      },
      {
        visual: "Computation block moves to a parallel 'Worker thread' lane. Main thread is nearly empty. TTI: 0.9s",
        narrative: "Web Workers run JavaScript on a separate thread. Move data processing, parsing, and heavy computation off the main thread entirely.",
        interaction: "Drag script blocks between 'critical' and 'deferred' zones to see TTI change",
      },
    ],
    discoveries: [
      {
        action: "Drag a non-critical script back to 'critical'",
        reaction: "TTI jumps by the exact parse+execute time of that script — direct cause and effect",
        teaches: "Every script on the critical path directly delays interactivity — the relationship is linear",
      },
    ],
    learningOutcome: "Reduce JavaScript's TTI impact through splitting, deferring, and offloading",
    agentNotes:
      "The flame chart should look like actual DevTools — developers will recognize it instantly. " +
      "The 'drag scripts between zones' interactive is the key teaching tool — it makes the " +
      "abstract concept of 'defer loading' into a tactile action with immediate metric feedback.",
  },

  "perf-css": {
    stopId: "perf-css",
    format: "explorable",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "CSSPerfExplorable",
        description:
          "Three tabbed explorations: " +
          "TAB 1 — SPECIFICITY CALCULATOR: type any CSS selector and watch specificity " +
          "compute in real-time as a three-column counter [ID, Class, Element]. " +
          "Two selectors side by side — the higher specificity one wins (highlighted). " +
          "Discovery: '.card.active' beats '.card' but '#main .card' beats both. " +
          "TAB 2 — CRITICAL CSS EXTRACTOR: a mock page split at the fold line. " +
          "Full stylesheet shown with rules. Rules that apply to above-fold elements are GREEN, " +
          "below-fold are RED. Reader clicks 'extract critical CSS' and sees ONLY the green rules " +
          "copied into a <style> tag, the rest deferred. FCP metric improves visibly. " +
          "TAB 3 — UNUSED CSS DETECTOR: load a stylesheet for a page. Rules that match " +
          "ZERO elements are highlighted red with coverage percentage. 'Remove unused' button " +
          "strips them and shows bytes saved.",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs"],
      },
    ],
    discoveries: [
      {
        action: "Type '#hero .card.featured' and see the specificity breakdown",
        reaction: "[1, 2, 0] — one ID, two classes, zero elements. Compare against '.hero-card' at [0, 1, 0]",
        teaches: "Specificity is a three-column weight system: IDs >> Classes >> Elements. One ID outweighs any number of classes",
      },
      {
        action: "Click 'extract critical CSS' and watch the FCP metric",
        reaction: "FCP drops from 1.8s to 0.6s — only 20% of the CSS was needed for first paint",
        teaches: "Loading only critical CSS inline eliminates render-blocking — the browser can paint without waiting for the full stylesheet",
      },
      {
        action: "Run unused CSS detection on the mock stylesheet",
        reaction: "42% of CSS rules match zero elements — 38KB of dead code",
        teaches: "CSS accumulates dead rules over time — auditing unused CSS can cut stylesheet size nearly in half",
      },
    ],
    learningOutcome: "Audit CSS performance through specificity analysis, critical CSS extraction, and dead code removal",
    agentNotes:
      "Three tabs, each a self-contained exploration. The specificity calculator should animate " +
      "the three columns filling in as the reader types. Side-by-side selector comparison " +
      "with 'WINS' label on the higher specificity. Critical CSS: the fold line on the mock page " +
      "is the visual divider between green and red rules.",
  },

  "perf-images": {
    stopId: "perf-images",
    format: "explorable",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "ImagePerfExplorable",
        description:
          "Three exploration zones: " +
          "ZONE 1 — FORMAT COMPARISON: a sample image shown in 4 formats (AVIF, WebP, JPEG, PNG) " +
          "with file size bars. Quality slider: drag it and watch all 4 sizes change proportionally. " +
          "Discovery: AVIF is 30-50% smaller than JPEG at the same perceived quality. " +
          "ZONE 2 — SRCSET BUILDER: drag breakpoints on a responsive viewport slider. " +
          "For each breakpoint, set an image width. Output: the generated <img> srcset attribute, " +
          "live. As you resize the viewport, the ACTIVE source highlights. " +
          "ZONE 3 — LAZY LOADING RACE: a page with 20 images. Left: all load eagerly (waterfall " +
          "chart shows 20 parallel requests). Right: lazy-loaded (only 4 load initially, " +
          "others load on scroll). Show total bytes loaded on initial page load.",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Drag quality to 60% and compare AVIF vs JPEG file sizes",
        reaction: "AVIF is 45% smaller while looking perceptually identical to JPEG",
        teaches: "Modern formats (AVIF, WebP) achieve dramatically better compression at equivalent visual quality",
      },
      {
        action: "Set srcset breakpoints and resize the viewport",
        reaction: "The browser loads DIFFERENT image sizes at different viewport widths — the active source highlights",
        teaches: "srcset lets the browser choose the right image size, saving bandwidth on small screens",
      },
      {
        action: "Compare eager vs lazy waterfall charts",
        reaction: "Eager: 20 requests, 4.2MB on load. Lazy: 4 requests, 0.8MB on load. Rest loads on scroll",
        teaches: "Lazy loading defers below-fold images — reducing initial page weight by 80% in this example",
      },
    ],
    learningOutcome: "Choose the right image format, implement srcset for responsive images, and lazy-load below-fold images",
    agentNotes:
      "Three zones, each teaching one optimization. The format comparison should use " +
      "pre-computed data (can't transcode in browser). The srcset builder outputs REAL HTML " +
      "that the reader can copy. The lazy loading waterfall chart should have a prominent " +
      "'bytes saved on initial load' counter.",
  },

  "perf-assets": {
    stopId: "perf-assets",
    format: "scrollytelling",
    effort: "medium",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "FontLoadingScrolly",
        description:
          "Sticky visual: a mock page with text that demonstrates font loading behavior. " +
          "Scrollytelling walks through font-display strategies: " +
          "1. Default (FOIT): text is INVISIBLE while font loads → appears all at once " +
          "2. font-display: swap (FOUT): system font shown immediately → swaps to custom font " +
          "3. font-display: fallback: system font → swap if fast, stay system if slow " +
          "4. font-display: optional: system font → swap only on repeat visits (cached) " +
          "5. Size-adjusted fallback: system font with size-adjust → minimal layout shift on swap " +
          "Each step ANIMATES the text through its loading behavior. " +
          "After scroll: interactive where reader picks a strategy and watches the page load. " +
          "CLS counter shows layout shift for each approach.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Mock page with invisible text (blank lines). Then text pops in all at once after 1.5s",
        narrative: "Default behavior: Flash of Invisible Text (FOIT). The browser hides text until the font loads. Users see a blank page for 1-3 seconds.",
      },
      {
        visual: "System font appears immediately. After 1s, text swaps to custom font (size jumps slightly)",
        narrative: "font-display: swap. Show text immediately in a system font, then swap when the custom font arrives. Fast first paint, but the swap causes a visible layout shift.",
      },
      {
        visual: "System font appears. Custom font loads fast → swap. Slow load → stay with system font",
        narrative: "font-display: fallback. Like swap, but with a timeout. If the custom font takes too long, the system font stays. No late swaps, no jarring shifts.",
      },
      {
        visual: "System font shows. No swap happens (first visit). Second visit: custom font from cache",
        narrative: "font-display: optional. The most conservative: never swap on first visit. Cache the font for next time. Zero layout shift, guaranteed.",
      },
      {
        visual: "System font with size-adjust matches custom font metrics. Swap happens but zero layout shift",
        narrative: "The pro move: use size-adjust and ascent-override on your fallback to match the custom font's metrics. The swap still happens, but nothing moves.",
        interaction: "Try each strategy and watch the CLS counter",
      },
    ],
    discoveries: [
      {
        action: "Watch the text swap from system to custom font with size-adjust",
        reaction: "The text content stays in exactly the same position — zero layout shift",
        teaches: "size-adjust on fallback fonts eliminates the layout shift from font swapping",
      },
    ],
    learningOutcome: "Optimize font loading to minimize layout shift and invisible text using font-display and size-adjust",
    agentNotes:
      "The text LITERALLY loading in different ways at each scroll step is the teaching. " +
      "Each strategy should play its loading animation when scrolled into view. " +
      "CLS counter is the comparative metric across approaches.",
  },

  "perf-cwv": {
    stopId: "perf-cwv",
    format: "explorable",
    effort: "large",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "CoreWebVitalsExplorable",
        description:
          "A mock webpage that 'loads' with configurable issues. Three gauges: LCP, INP, CLS. " +
          "THE MECHANIC: the page has deliberate performance issues. Reader must DIAGNOSE " +
          "and FIX each one by toggling options. It's a detective game. " +
          "LCP issue: hero image is lazy-loaded (bad) → toggle to eager → LCP drops from 4.2s to 1.8s. " +
          "  Reader discovers which element IS the LCP element (it highlights with a blue border). " +
          "INP issue: click handler runs heavy sync JS (200ms) → toggle to async/yield → INP drops. " +
          "  Reader clicks the button and FEELS the delay, then sees it disappear after fix. " +
          "CLS issue: images without dimensions → toggle dimensions → CLS drops from 0.42 to 0.01. " +
          "  Reader watches the page layout JUMP when images load (before fix) vs stay stable (after). " +
          "Each fix: gauge animates from red/yellow to green. All three green = 'passing Core Web Vitals' celebration.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Click the slow button and FEEL the 200ms delay",
        reaction: "The button visibly lags. INP gauge reads 240ms (red). Toggle the fix → button responds instantly",
        teaches: "INP measures the worst interaction delay — users physically feel anything over 100ms",
      },
      {
        action: "Watch the page load without image dimensions",
        reaction: "Content jumps down when images load. CLS gauge reads 0.42 (red). With dimensions: zero shift",
        teaches: "CLS is caused by elements that change size after initial render — always set explicit dimensions on images and embeds",
      },
      {
        action: "Find the LCP element by hovering elements on the mock page",
        reaction: "The hero image highlights — it's the LCP element. Its lazy-load attribute is the problem",
        teaches: "LCP tracks the largest visible element — usually a hero image or heading. It should NEVER be lazy-loaded",
      },
    ],
    learningOutcome: "Diagnose and fix LCP, INP, and CLS issues by understanding what triggers each metric and what the fix is",
    agentNotes:
      "Detective game format. The reader doesn't read about CWV — they DIAGNOSE issues on " +
      "a broken page. Each fix is a toggle that immediately updates the gauge. The goal: " +
      "turn all three gauges green. Use Google's actual thresholds: LCP <2.5s, INP <200ms, CLS <0.1. " +
      "The 'feel the delay' on INP is the most powerful teaching moment.",
  },

  "perf-bundle": {
    stopId: "perf-bundle",
    format: "scrollytelling",
    effort: "large",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "BundleOptScrolly",
        description:
          "Sticky visual: bundle treemap (rectangles sized by bytes, like webpack-bundle-analyzer). " +
          "Scrollytelling applies optimizations step by step: " +
          "1. Single bundle: one giant treemap. Total: 1.2MB. Initial load waterfall shows 1 request " +
          "2. Route splitting: treemap splits into 4 chunks. Current route chunk highlighted. Total same, initial load: 340KB " +
          "3. Tree shaking: unused exports fade out and shrink. Chunks get smaller " +
          "4. Dynamic import for heavy lib: large rectangle separates into 'loaded on demand' zone " +
          "5. Common chunk extraction: shared code moves to vendor chunk (loaded once, cached) " +
          "A running counter: Initial Load Size dropping from 1.2MB → 340KB → 280KB → 190KB → 165KB. " +
          "After scroll: interactive treemap where reader can drag modules between chunks " +
          "and see the impact on initial load size and caching.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Single massive treemap rectangle. 1.2MB. One request in waterfall",
        narrative: "Every import, every dependency, every route — all in one file. The user downloads 1.2MB before seeing anything.",
      },
      {
        visual: "Treemap splits into 4 colored chunks. Only one (340KB) is highlighted as 'initial load'",
        narrative: "Route-based code splitting. Each page gets its own chunk. Users only download the code for the page they're visiting. 72% reduction in initial load.",
      },
      {
        visual: "Unused export rectangles fade to ghost outlines and shrink. Chunks visibly smaller",
        narrative: "Tree shaking: bundlers detect and remove unused exports. That utility library you imported for one function? Only that function ships.",
      },
      {
        visual: "Large library rectangle animates to a separate 'on-demand' zone. Initial load counter drops",
        narrative: "Dynamic import: heavy libraries (chart, editor, PDF renderer) load only when the user navigates to the feature that needs them.",
      },
      {
        visual: "Shared code rectangles migrate to a 'vendor' chunk. Cache icon appears on it",
        narrative: "Shared dependencies (React, utilities) extracted to a common chunk. It's cached independently — when you deploy new feature code, the vendor chunk stays cached.",
        interaction: "Drag modules between chunks and watch initial load size change",
      },
    ],
    discoveries: [
      {
        action: "Watch the treemap shrink at each optimization step",
        reaction: "Initial load drops from 1.2MB → 165KB — a 7x reduction through cumulative optimizations",
        teaches: "Bundle optimization is cumulative: each technique compounds. The order matters less than doing all of them",
      },
      {
        action: "Drag a large library back to the initial chunk",
        reaction: "Initial load size jumps by exactly that library's size — direct cause and effect",
        teaches: "Every byte in the initial bundle is a byte the user waits for — keep it minimal",
      },
    ],
    learningOutcome: "Apply code splitting, tree shaking, dynamic import, and chunk extraction to reduce initial bundle size",
    agentNotes:
      "The treemap is the hero visual. Use actual rectangle-packing layout (like a real bundle " +
      "analyzer). The shrinking animation at each step should be smooth — rectangles physically " +
      "getting smaller. The running counter is always visible. " +
      "The post-scroll drag-to-reorganize interactive lets readers experiment freely.",
  },

  "perf-hints": {
    stopId: "perf-hints",
    format: "explorable",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "ResourceHintsExplorable",
        description:
          "A timeline visualization of a page load. Resources appear as bars on the timeline. " +
          "For each resource hint, reader can TOGGLE it on and watch the timeline shift: " +
          "- dns-prefetch: DNS bar starts earlier (overlaps with previous page) " +
          "- preconnect: DNS + TCP + TLS bars all start early " +
          "- preload: resource bar moves to high priority and starts with parser " +
          "- prefetch: resource bar appears at idle time (low priority, for next navigation) " +
          "- modulepreload: like preload but also parses/compiles the module early " +
          "Each toggle: show 'time saved' as a colored gap between 'without hint' and 'with hint' " +
          "on the timeline. The gap IS the time saved — visually obvious. " +
          "Common mistakes: preload without 'as' attribute → browser can't set priority (show warning). " +
          "Preloading everything → defeating the purpose (priority inversion).",
        reuses: ["DemoSandbox", "DialToggle"],
      },
    ],
    discoveries: [
      {
        action: "Toggle preconnect for a cross-origin font",
        reaction: "DNS+TCP+TLS time shifts to overlap with HTML parsing — font starts loading 200ms earlier",
        teaches: "preconnect eliminates connection setup latency for known cross-origin resources",
      },
      {
        action: "Preload EVERYTHING (toggle all resources to preload)",
        reaction: "Warning: 'Priority inversion — when everything is high priority, nothing is'. Page load actually gets SLOWER",
        teaches: "Preload is for critical resources only. Over-preloading saturates bandwidth and delays the truly important resources",
      },
      {
        action: "Use prefetch for a resource needed on the NEXT page",
        reaction: "Resource loads at idle time (low priority). When user navigates, it's already cached — instant load",
        teaches: "prefetch is for anticipated future navigations — it loads during idle time without competing with current page resources",
      },
    ],
    learningOutcome: "Use resource hints to eliminate connection overhead and strategically preload/prefetch resources",
    agentNotes:
      "The timeline with toggleable hints is the core interaction. The 'time saved' gap " +
      "visualization (colored space between where the resource WOULD have loaded vs where " +
      "it actually loads with the hint) makes the benefit tangible. " +
      "The 'preload everything → priority inversion' discovery is the advanced insight.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Section 8: Rendering Strategies
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "render-csr-ssr-ssg": {
    stopId: "render-csr-ssr-ssg",
    format: "battle",
    effort: "large",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "RenderStrategyBattle",
        description:
          "Three mock pages loading simultaneously: CSR, SSR, SSG. " +
          "Each shows an ANIMATED LOADING SEQUENCE: " +
          "CSR: blank white → spinner → JS downloads → content pops in → interactive " +
          "SSR: content appears quickly (from server HTML) → hydration period (clicks don't work!) → interactive " +
          "SSG: content appears INSTANTLY (from CDN) → hydration → interactive " +
          "Key metrics racing: TTFB, FCP, LCP, TTI — shown as horizontal bars racing across. " +
          "SCENARIO TOGGLES (this is the teaching device): " +
          "- Slow network: CSR suffers most (big JS download). SSG barely affected (CDN) " +
          "- Slow server: SSR suffers (server render time). CSR/SSG unaffected " +
          "- Dynamic content: SSG shows stale data (updated 1hr ago). Others show fresh " +
          "- SEO crawler: CSR shows blank page (no JS execution). SSR/SSG show full content " +
          "Reader discovers: there's no 'best' strategy. Each scenario has a different winner.",
        reuses: ["DemoSandbox", "DialSegment"],
      },
    ],
    discoveries: [
      {
        action: "Toggle 'slow network' and watch CSR vs SSG",
        reaction: "CSR takes 8s to show anything (big JS download). SSG shows content in 200ms (from CDN edge)",
        teaches: "CSR performance is gated by JavaScript download — on slow networks, the blank page persists for seconds",
      },
      {
        action: "Toggle 'dynamic content' and watch SSG",
        reaction: "SSG shows a '1 hour ago' timestamp while SSR shows 'just now' — the data is stale",
        teaches: "SSG trades freshness for speed — content is frozen at build time. Not suitable for highly dynamic data",
      },
      {
        action: "Click a button during SSR's hydration period",
        reaction: "Nothing happens. A 'hydrating...' indicator shows. After hydration completes, the click works",
        teaches: "SSR has a 'uncanny valley': content is visible but NOT interactive until hydration completes",
      },
    ],
    learningOutcome: "Choose between CSR, SSR, and SSG based on network conditions, content dynamism, and interactivity requirements",
    agentNotes:
      "Battle format. The scenario toggles are everything — without them, it's just a " +
      "comparison table. The reader DISCOVERS that each approach wins in different scenarios. " +
      "The hydration uncanny valley (click doesn't work during hydration) is a powerful " +
      "physical experience. Show the button depressing but nothing happening.",
  },

  "render-isr": {
    stopId: "render-isr",
    format: "scrollytelling",
    effort: "medium",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "ISRScrolly",
        description:
          "Sticky visual: a timeline with visitors (dots) arriving at a page. " +
          "A 'cache' box between visitors and the server shows: fresh/stale/rebuilding state. " +
          "Scrollytelling walks through ISR lifecycle: " +
          "1. Visitor 1: cache empty → server builds page → slow response → cache stores (green) " +
          "2. Visitor 2 (within revalidation window): cache serves instantly → green, fast " +
          "3. Cache goes stale (timer expires) → turns yellow " +
          "4. Visitor 3: cache serves stale (still fast!) → triggers background rebuild " +
          "5. Cache updates → turns green again " +
          "6. Visitor 4: gets fresh page instantly " +
          "After scroll: interactive timeline. Reader generates visitors at different times. " +
          "Adjust revalidation window (10s-3600s). See how it affects freshness vs cache hit rate.",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    scrollSteps: [
      {
        visual: "Cache box: empty (grey). Visitor 1 arrives → request goes through to server (slow, 2s). Cache fills (green)",
        narrative: "First visitor pays the full cost: the page builds from scratch. But the result is cached with a revalidation window.",
      },
      {
        visual: "Visitor 2 arrives, cache box is green. Response: instant (20ms)",
        narrative: "Second visitor gets the cached page instantly. No server work at all. This is SSG-level speed.",
      },
      {
        visual: "Timer on cache expires. Green → yellow (stale). Label: 'stale-while-revalidate'",
        narrative: "The revalidation window expires. The cache is now 'stale' — still usable, but should be refreshed.",
      },
      {
        visual: "Visitor 3 arrives, gets yellow (stale) response instantly. Background: server rebuilds",
        narrative: "Visitor 3 STILL gets an instant response (the stale page). But in the background, the server rebuilds a fresh version. No visitor ever waits for a build.",
      },
      {
        visual: "Background rebuild completes. Cache: yellow → green. Fresh page stored",
        narrative: "Rebuild complete. The cache is fresh again. The next visitor gets updated content — and the cycle repeats.",
      },
    ],
    discoveries: [
      {
        action: "Generate many visitors during the revalidation window",
        reaction: "All get instant responses from cache — zero server load regardless of traffic",
        teaches: "ISR absorbs traffic spikes: all visitors within the window hit the cache, only ONE rebuild happens in the background",
      },
      {
        action: "Set revalidation window to 10s and check content freshness",
        reaction: "Content is never more than ~10s stale, but rebuilds happen frequently",
        teaches: "The revalidation window is the freshness-vs-cost tradeoff: shorter = fresher but more rebuilds",
      },
    ],
    learningOutcome: "Implement ISR to get SSG speed with near-real-time content freshness, and tune the revalidation window",
    agentNotes:
      "The cache state color changes (grey → green → yellow → green) are the visual story. " +
      "The key insight: NO visitor ever waits for a build except the very first. " +
      "The interactive timeline after scrollytelling should let readers stress-test with " +
      "different visitor patterns and revalidation windows.",
  },

  "render-ssr-streaming": {
    stopId: "render-ssr-streaming",
    format: "scrollytelling",
    effort: "large",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "StreamingSSRScrolly",
        description:
          "Sticky visual: a mock page with 4 Suspense-wrapped sections. " +
          "COMPARISON MODE: left half shows traditional SSR, right shows streaming. " +
          "Scrollytelling: " +
          "1. Traditional: blank → wait 3s → EVERYTHING appears at once " +
          "2. Streaming: shell (header/nav) appears immediately → fast sections render → " +
          "   slow sections show spinner → then replace with content (one by one) " +
          "3. Selective hydration: click a not-yet-hydrated section → it PRIORITIZES " +
          "   hydrating that section first (other sections wait) " +
          "After scroll: interactive where reader configures section load times (fast/medium/slow) " +
          "and watches the page build with streaming. They can click during hydration to see " +
          "selective hydration in action.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Traditional SSR: blank page for 3 seconds, then everything appears at once",
        narrative: "Traditional SSR waits for EVERY component to render on the server before sending ANY HTML. The slowest component gates the entire page.",
      },
      {
        visual: "Streaming: shell appears instantly. Fast sections fill in after 0.5s",
        narrative: "Streaming SSR sends the shell (header, nav, layout) immediately. Fast components stream in as they finish. The browser starts rendering before the server is done.",
      },
      {
        visual: "Slow sections show spinners, then content replaces spinners one by one",
        narrative: "Slow components (recommendations, reviews) show Suspense fallbacks first. As each finishes on the server, its content streams in and replaces the spinner.",
      },
      {
        visual: "Reader clicks an unhydrated section → hydration priority shifts to it",
        narrative: "Selective hydration: if the user clicks a section that hasn't hydrated yet, React prioritizes hydrating THAT section. The user's intent drives the hydration order.",
        interaction: "Click sections during hydration to see priority re-ordering",
      },
    ],
    discoveries: [
      {
        action: "Set one section to 'slow' (3s) and compare traditional vs streaming",
        reaction: "Traditional: 3s blank page. Streaming: shell + fast content in 0.3s, slow section in 3s",
        teaches: "Streaming decouples fast components from slow ones — users see SOMETHING immediately",
      },
      {
        action: "Click a section during hydration that hasn't hydrated yet",
        reaction: "React prioritizes hydrating the clicked section. Its spinner resolves first, even if other sections were queued before it",
        teaches: "Selective hydration responds to user intent — the browser hydrates what the user is interacting with first",
      },
    ],
    learningOutcome: "Use Suspense boundaries for progressive streaming and understand selective hydration's prioritization",
    agentNotes:
      "The side-by-side comparison (traditional vs streaming) running simultaneously is the " +
      "hero visual. Traditional side is painfully blank while streaming side is already usable. " +
      "The click-during-hydration interaction is the advanced insight.",
  },

  "render-rsc": {
    stopId: "render-rsc",
    format: "scrollytelling",
    effort: "large",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "RSCScrolly",
        description:
          "Sticky visual: component tree (like React DevTools). " +
          "Nodes tagged as 'Server' (blue) or 'Client' (orange). " +
          "Scrollytelling builds understanding: " +
          "1. Traditional: all components are client. Bundle size: 420KB. Show full tree in orange " +
          "2. RSC: most components become server (blue). Only interactive ones stay client (orange) " +
          "3. Show what 'server component' means: rendered on server → serialized to RSC payload → sent " +
          "4. Show bundle size: only client components ship JS. Blue components = zero JS " +
          "5. Data fetching: server components fetch directly (no waterfall). Show DB query inside component " +
          "After scroll: interactive tree where reader TOGGLES individual components server↔client " +
          "and watches bundle size meter change. Discovery: moving a component to server removes " +
          "its entire subtree's JS from the bundle (if no client components below it).",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Full component tree in orange (all client). Bundle size meter: 420KB",
        narrative: "Traditional React: every component is a client component. Every component's code ships to the browser. 420KB of JavaScript.",
      },
      {
        visual: "Most nodes turn blue (server). Only interactive ones stay orange. Bundle: 120KB",
        narrative: "React Server Components: components that don't need interactivity render on the server. Their code never reaches the browser. Bundle drops to 120KB.",
      },
      {
        visual: "Zoom into a server component: it renders, serializes to JSON-like payload, streams to client",
        narrative: "Server components render into a serialized payload — not HTML, not JavaScript. The client stitches this payload into the component tree without executing any code.",
      },
      {
        visual: "A server component with `const data = await db.query()` — no fetch, no loading state",
        narrative: "Server components can access databases, file systems, and APIs directly. No fetch() calls, no loading states, no client-server waterfall.",
      },
    ],
    discoveries: [
      {
        action: "Toggle a large subtree root from client to server",
        reaction: "Bundle size drops dramatically — the entire subtree's JS is eliminated",
        teaches: "Moving a component to server removes ALL its children's JS too (unless a child is explicitly client)",
      },
      {
        action: "Try to add useState to a server component",
        reaction: "Error: 'Server components cannot use state or effects — they render once on the server'",
        teaches: "Server components have no lifecycle — no state, no effects, no event handlers. The 'use client' boundary marks where interactivity begins",
      },
    ],
    learningOutcome: "Design component trees with server/client boundaries that minimize shipped JavaScript while preserving interactivity",
    agentNotes:
      "The component tree with toggleable server/client tags is the core interactive. " +
      "Bundle size meter should update in real-time as reader toggles components. " +
      "The 'move to server removes subtree JS' discovery is the cascade insight.",
  },

  "render-edge": {
    stopId: "render-edge",
    format: "scrollytelling",
    effort: "medium",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "EdgeRenderingScrolly",
        description:
          "Sticky visual: simplified world map with CDN edge nodes (dots) and a central origin server. " +
          "Scrollytelling: " +
          "1. Origin-only: user in Tokyo, server in Virginia. Show request line traveling across the world " +
          "2. CDN for static assets: CSS/JS served from Tokyo edge (fast), API still goes to Virginia " +
          "3. Edge rendering: HTML rendered at Tokyo edge node. Much shorter request line " +
          "4. The catch: edge has limited runtime (no full Node.js), cold starts, stale data " +
          "After scroll: interactive where reader picks their location and sees latency for each approach. " +
          "Toggle: personalized content (edge wins) vs database-heavy (origin wins).",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Tokyo user → Virginia server. Long line across Pacific. Latency: 280ms",
        narrative: "Your user in Tokyo. Your server in Virginia. Every request crosses the Pacific Ocean. Physics is the bottleneck — 280ms round trip minimum.",
      },
      {
        visual: "Static assets served from Tokyo edge (short line). API still goes to Virginia",
        narrative: "CDN for static assets: CSS, JavaScript, and images served from the nearest edge node. But HTML and API calls still travel to the origin server.",
      },
      {
        visual: "Edge node renders HTML. Tokyo user → Tokyo edge (20ms). Short line. Fast",
        narrative: "Edge rendering: the HTML is rendered at the edge node closest to the user. 20ms instead of 280ms. The page loads 14x faster.",
      },
      {
        visual: "Edge node: limited runtime icons, cold start clock, stale data warning",
        narrative: "But edge has constraints: limited runtime (no native modules, restricted APIs), cold starts on first request, and stale data if the edge cache isn't fresh.",
        interaction: "Pick your location on the map and see latency for each approach",
      },
    ],
    discoveries: [
      {
        action: "Select a location far from the origin server",
        reaction: "Origin latency: 300ms+. Edge latency: 20-40ms. The difference grows with distance",
        teaches: "Edge rendering benefits are proportional to distance from origin — the farther your users, the bigger the win",
      },
      {
        action: "Toggle 'database-heavy page' mode",
        reaction: "Edge rendering becomes SLOWER than origin — the edge must make its own cross-ocean DB call",
        teaches: "Edge rendering only helps when the rendering doesn't need origin data. Database-heavy pages should stay on origin (near the database)",
      },
    ],
    learningOutcome: "Decide when edge rendering reduces latency vs when it adds complexity without benefit",
    agentNotes:
      "The world map with animated request lines is a simple but effective visual. The line " +
      "LENGTH represents latency — physically longer line = more latency. Keep the map simplified " +
      "(just dots and lines, not a full geographic rendering). " +
      "The database-heavy toggle is the critical counter-insight — prevents cargo-culting edge.",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Section 9: Security & Auth
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  "sec-xss": {
    stopId: "sec-xss",
    format: "challenge-chain",
    effort: "large",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "XSSChallengeChain",
        description:
          "ATTACK/DEFEND game. Two phases per challenge: " +
          "Phase 1 (ATTACK): reader is given a vulnerable input and must craft an XSS payload " +
          "that 'executes' (mock execution — highlights the vulnerability, doesn't actually run). " +
          "Phase 2 (DEFEND): reader must apply the correct defense to block the attack. " +
          "6 challenges, escalating difficulty: " +
          "1. Reflected XSS: inject <script> via URL parameter. Defense: HTML entity encoding " +
          "2. Stored XSS: inject via form input. Defense: output encoding " +
          "3. DOM XSS via innerHTML. Defense: use textContent instead " +
          "4. Attribute injection: break out of an attribute. Defense: attribute encoding " +
          "5. Event handler injection: onmouseover='alert(1)'. Defense: CSP + sanitization " +
          "6. Mutation XSS: payload that's safe statically but becomes dangerous after DOM mutation. " +
          "   Defense: DOMPurify with strict config " +
          "SANDBOXED: everything runs in an iframe with sandbox attribute. No real code execution.",
        reuses: [],
      },
    ],
    discoveries: [
      {
        action: "Craft a <script> tag payload in the reflected XSS challenge",
        reaction: "Payload 'executes' — vulnerable code path highlighted in red. Then: apply encoding and try again → payload renders as harmless text",
        teaches: "XSS happens when user input is interpreted as code. Output encoding converts code characters to display characters",
      },
      {
        action: "Use textContent instead of innerHTML in challenge 3",
        reaction: "The <script> tag renders as literal text instead of executing — defense succeeds",
        teaches: "textContent is inherently safe — it can never inject HTML. innerHTML parses and executes its content",
      },
      {
        action: "Encounter mutation XSS in challenge 6",
        reaction: "A payload that passes initial sanitization becomes dangerous after DOM mutation — even DOMPurify with default config misses it",
        teaches: "Mutation XSS exploits the browser's HTML parser normalization — even 'safe' HTML can become dangerous after parsing",
      },
    ],
    learningOutcome: "Both CRAFT and DEFEND against XSS attacks — understanding the attack is the best defense",
    agentNotes:
      "Attack/defend format. Reader learns to THINK like an attacker first, then builds defenses. " +
      "This dual perspective is more effective than just showing defenses. " +
      "CRITICAL: all execution is mocked. Use visual indicators (red glow for 'executed', " +
      "green shield for 'blocked') instead of actual script execution. " +
      "Sandbox iframe with no script execution is mandatory.",
  },

  "sec-csrf": {
    stopId: "sec-csrf",
    format: "scrollytelling",
    effort: "medium",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "CSRFScrolly",
        description:
          "Sticky visual: three actors as boxes — User (laptop), Bank (server), Evil Site (red server). " +
          "Animated arrows (HTTP requests) flow between them. " +
          "Scrollytelling walks through the attack: " +
          "1. User logs into bank → session cookie set (cookie icon on User box) " +
          "2. User visits evil.com (separate tab) " +
          "3. Evil site renders hidden form targeting bank.com/transfer " +
          "4. Form auto-submits → browser attaches bank's cookie → bank processes transfer " +
          "5. Show the problem: browser ALWAYS attaches cookies for the target domain " +
          "Then DEFENSE scrollytelling: " +
          "6. CSRF token: evil site can't include it → bank rejects the request " +
          "7. SameSite=Strict: browser doesn't send cookies on cross-site request " +
          "8. Origin header check: request from evil.com, bank sees wrong origin " +
          "After scroll: reader toggles defenses on/off and watches the attack succeed/fail.",
        reuses: ["DemoSandbox", "DialToggle"],
      },
    ],
    scrollSteps: [
      {
        visual: "User box → Bank box. Login request with credentials. Session cookie appears on User box",
        narrative: "You log into your bank. The server sets a session cookie. This cookie will be sent with every request to bank.com — the browser does this automatically.",
      },
      {
        visual: "User opens second tab. Evil site box appears. User visits it",
        narrative: "You visit a seemingly harmless website in another tab. Meanwhile, your bank cookie is still active.",
      },
      {
        visual: "Evil site renders invisible form. Arrow: evil.com → bank.com. Cookie attaches automatically",
        narrative: "Evil site's hidden form submits a transfer request TO your bank. The browser helpfully attaches your session cookie — it can't tell the user didn't intend this.",
      },
      {
        visual: "Bank processes the request. Money transferred. Red warning flash",
        narrative: "The bank sees a valid session cookie and processes the transfer. From the bank's perspective, it's a legitimate request — same cookie, same session.",
      },
      {
        visual: "CSRF token flow. Evil site's form is missing the token. Bank rejects → red X on arrow",
        narrative: "Defense: CSRF tokens. The bank includes a random token in each form. Evil site can't read this token (same-origin policy) — so its forged form is rejected.",
      },
      {
        visual: "SameSite=Strict. Cookie has badge 'SameSite'. Arrow from evil.com has no cookie attached",
        narrative: "Defense: SameSite cookies. With SameSite=Strict, the browser simply doesn't send the cookie on cross-origin requests. Evil site's form arrives cookieless — rejected.",
        interaction: "Toggle defenses on/off to watch the attack succeed or get blocked at different stages",
      },
    ],
    discoveries: [
      {
        action: "Turn off CSRF token defense but keep SameSite=Strict on",
        reaction: "Attack still blocked — SameSite prevents the cookie from being sent at all",
        teaches: "SameSite cookies are a browser-level defense — they don't require server-side token infrastructure",
      },
      {
        action: "Turn off all defenses",
        reaction: "Attack succeeds — the full sequence plays out with money transferred",
        teaches: "Without defenses, CSRF is trivially exploitable — any website can make authenticated requests on your behalf",
      },
    ],
    learningOutcome: "Explain the CSRF attack flow and implement defenses: tokens, SameSite cookies, and origin verification",
    agentNotes:
      "The three-actor diagram with animated HTTP arrows is the core visual. Each arrow should be " +
      "a labeled packet that physically travels between boxes. When a defense blocks an attack, " +
      "the arrow hits a SHIELD and bounces back (red X). The toggle-defenses interactive lets " +
      "readers verify which defense blocks which part of the attack.",
  },

  "sec-csp": {
    stopId: "sec-csp",
    format: "playground",
    effort: "medium",
    proseTarget: [200, 300],
    interactives: [
      {
        component: "CSPPlayground",
        description:
          "Interactive CSP header builder. " +
          "LEFT: directive toggles (default-src, script-src, style-src, img-src, connect-src, " +
          "font-src, frame-src). For each directive: source selector (self, specific domains, " +
          "unsafe-inline, unsafe-eval, nonce-based, hash-based). " +
          "RIGHT: mock page that ATTEMPTS to load various resources. Each resource shows " +
          "a status: ALLOWED (green) or BLOCKED (red) based on current CSP. " +
          "The mock page has: inline script, external script, inline style, external stylesheet, " +
          "cross-origin image, iframe, XHR to API. " +
          "OUTPUT: the complete Content-Security-Policy header string (copyable). " +
          "VIOLATION LOG at bottom: shows what a real browser would report in the console. " +
          "PRESET SCENARIOS: 'Strict', 'Common', 'Permissive' — click to see a pre-configured CSP " +
          "and understand why each directive is set that way.",
        reuses: ["DemoSandbox", "StatusDot"],
      },
    ],
    discoveries: [
      {
        action: "Start with a strict CSP (default-src 'none') and watch everything break",
        reaction: "All resources blocked — entire page is red. Progressively whitelist to see what each directive allows",
        teaches: "Start strict and loosen — it's safer to whitelist than to blacklist. Each directive you add is an explicit trust boundary",
      },
      {
        action: "Add unsafe-inline to script-src",
        reaction: "Warning: 'unsafe-inline defeats most of CSP's XSS protection. Consider nonce-based or hash-based instead'",
        teaches: "unsafe-inline is the most dangerous CSP escape hatch — it allows any inline script, including injected XSS",
      },
      {
        action: "Forget connect-src and try to make an API call",
        reaction: "API call blocked. Violation log: 'Refused to connect to api.example.com (violates connect-src)'",
        teaches: "connect-src controls fetch/XHR/WebSocket destinations — forgetting it breaks API calls even if script-src allows the JS",
      },
    ],
    learningOutcome: "Build a Content-Security-Policy header by experimentation, understanding what each directive protects",
    agentNotes:
      "Playground format — no guided narrative. Reader experiments with directives and sees " +
      "what breaks. The violation log should look like Chrome DevTools console errors. " +
      "The 'start strict, loosen gradually' approach is the recommended workflow. " +
      "Preset scenarios help readers understand common CSP configurations.",
  },

  "sec-cors": {
    stopId: "sec-cors",
    format: "scrollytelling",
    effort: "large",
    proseTarget: [500, 700],
    interactives: [
      {
        component: "CORSScrolly",
        description:
          "Sticky visual: two boxes (Browser, Server) with HTTP request/response arrows. " +
          "A 'header inspector' panel showing each header and its value. " +
          "Scrollytelling phase 1 — Simple request: " +
          "1. GET with standard headers → browser sends directly " +
          "2. Server responds with Access-Control-Allow-Origin → browser checks → allows " +
          "3. Server omits ACAO → browser BLOCKS the response (it arrived! but JS can't read it) " +
          "Scrollytelling phase 2 — Preflight: " +
          "4. POST with Content-Type: application/json → triggers preflight " +
          "5. Browser sends OPTIONS request first " +
          "6. Server responds with allowed methods/headers " +
          "7. If OPTIONS passes → actual request follows " +
          "After scroll: INTERACTIVE request builder. Reader configures method, headers, " +
          "and server CORS settings. Watch in real-time: does it preflight? Does it pass? " +
          "Each header in the inspector explains itself on hover.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Browser → Server: simple GET request. Arrow travels to server",
        narrative: "A simple GET request with standard headers. The browser sends it directly — no questions asked.",
      },
      {
        visual: "Server responds with 'Access-Control-Allow-Origin: *'. Browser checks → green checkmark",
        narrative: "The server includes Access-Control-Allow-Origin in the response. The browser checks this header — if the origin matches, JavaScript can read the response.",
      },
      {
        visual: "Server omits the CORS header. Response arrives but browser BLOCKS JavaScript from reading it",
        narrative: "Without the CORS header, the browser blocks JavaScript from reading the response. The request SUCCEEDED — the server saw it and responded. But the browser protects the response data.",
      },
      {
        visual: "POST + Content-Type: application/json. Warning: 'triggers preflight'. OPTIONS request fires first",
        narrative: "Non-simple requests (custom headers, non-standard content types, PUT/DELETE) trigger a preflight. The browser asks permission BEFORE sending the actual request.",
      },
      {
        visual: "OPTIONS → Server: 'Can I POST with application/json?' Server: 'Yes, here are allowed methods'",
        narrative: "The OPTIONS preflight asks: 'Is this method allowed? Are these headers allowed?' The server responds with its CORS policy.",
      },
      {
        visual: "Interactive request builder appears with method/header/CORS config controls",
        narrative: "Your turn. Configure a request and server CORS policy. Does it preflight? Does it pass? Every header is inspectable.",
        interaction: "Build requests and watch the CORS flow play out — try triggering (and fixing) common CORS errors",
      },
    ],
    discoveries: [
      {
        action: "Set Content-Type to application/json and see the preflight trigger",
        reaction: "An OPTIONS request fires before the actual request — the browser is asking permission first",
        teaches: "application/json triggers preflight because it's not a 'simple' content type. multipart/form-data and text/plain don't.",
      },
      {
        action: "See that a CORS-blocked response was actually received (status 200)",
        reaction: "The response ARRIVED with status 200 — the server processed it. But the browser won't let JS read it",
        teaches: "CORS is a BROWSER restriction, not a server restriction. The server always processes the request — CORS only controls whether JavaScript can read the response",
      },
      {
        action: "Set Access-Control-Allow-Origin to '*' with credentials: true",
        reaction: "Error: 'Cannot use wildcard origin with credentials. Must specify exact origin'",
        teaches: "Credentials (cookies) require an exact origin — wildcard doesn't work. This is a deliberate security constraint",
      },
    ],
    learningOutcome: "Predict when CORS preflights occur, configure server CORS headers, and debug common CORS errors",
    agentNotes:
      "The scrollytelling builds from simple request to preflight. The interactive request builder " +
      "is where real learning happens — reader configures method, headers, and server CORS policy, " +
      "then watches the full flow (with or without preflight) play out. " +
      "CRITICAL insight: the response ARRIVES but browser blocks it. This is the most misunderstood aspect of CORS.",
  },

  "sec-cookies": {
    stopId: "sec-cookies",
    format: "playground",
    effort: "medium",
    proseTarget: [200, 300],
    interactives: [
      {
        component: "CookiePlayground",
        description:
          "A cookie jar visualization. Each cookie is a card with all attributes visible. " +
          "Cookie builder: form to create cookies with name, value, domain, path, expires, " +
          "HttpOnly, Secure, SameSite (Strict/Lax/None). " +
          "ATTACK SCENARIOS: " +
          "1. XSS tries document.cookie → shows which cookies are accessible (HttpOnly blocks it) " +
          "2. HTTP request on non-HTTPS → shows which cookies are sent (Secure blocks it) " +
          "3. Cross-site form submission → shows which cookies are sent (SameSite blocks it) " +
          "Each cookie card gets a SECURITY SCORE: green shields for security attributes, " +
          "red warnings for missing ones. A 'best practices' cookie appears as a template: " +
          "HttpOnly + Secure + SameSite=Strict.",
        reuses: ["DemoSandbox", "StatusDot"],
      },
    ],
    discoveries: [
      {
        action: "Create a cookie without HttpOnly and run the XSS scenario",
        reaction: "XSS reads the cookie value! Red alert. Toggle HttpOnly on → XSS returns empty",
        teaches: "HttpOnly prevents JavaScript from reading the cookie — the #1 defense against cookie theft via XSS",
      },
      {
        action: "Set SameSite=None without Secure flag",
        reaction: "Browser rejects the cookie entirely — SameSite=None requires Secure",
        teaches: "SameSite=None (allow cross-site) REQUIRES Secure — browsers enforce this to prevent insecure cross-site cookies",
      },
    ],
    learningOutcome: "Set cookie security attributes that prevent XSS theft, CSRF, and insecure transmission",
    agentNotes:
      "Playground format. The attack scenarios are pre-built buttons that simulate attacks " +
      "against the reader's cookies. Green shields / red warnings on each cookie card make " +
      "security posture instantly visible. The template 'best practices' cookie is the takeaway.",
  },

  "sec-oauth": {
    stopId: "sec-oauth",
    format: "scrollytelling",
    effort: "large",
    proseTarget: [600, 800],
    interactives: [
      {
        component: "OAuthScrolly",
        description:
          "Four tabs, one per OAuth flow. Each tab is a scrollytelling sequence diagram. " +
          "TAB 1 — Authorization Code + PKCE (the recommended flow): " +
          "Actors: User, Browser, Auth Server, API Server. " +
          "Scrollytelling steps: " +
          "1. Browser generates code_verifier + code_challenge (PKCE) " +
          "2. Redirect to auth server with code_challenge " +
          "3. User authenticates → auth server returns authorization code " +
          "4. Browser exchanges code + code_verifier for access token " +
          "5. Access token stored in memory, refresh token in HttpOnly cookie " +
          "Each step: arrows between actors, data labels showing exactly what's transmitted. " +
          "Color code: public data (green), secrets (red), tokens (accent). " +
          "TAB 2: Client Credentials (server-to-server, simpler) " +
          "TAB 3: Authorization Code (server-side, no PKCE needed) " +
          "TAB 4: Implicit (DEPRECATED — show why it's insecure: token in URL fragment!)",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs"],
      },
    ],
    scrollSteps: [
      {
        visual: "Browser generates code_verifier (random string) and code_challenge (SHA256 hash)",
        narrative: "PKCE (Proof Key for Code Exchange): the browser generates a random secret (verifier) and its hash (challenge). The verifier stays in the browser — only the hash is sent initially.",
      },
      {
        visual: "Arrow: Browser → Auth Server. Carries: client_id + redirect_uri + code_challenge",
        narrative: "The browser redirects to the authorization server, carrying the client ID and the code challenge hash. The code verifier is NOT sent yet.",
      },
      {
        visual: "User authenticates (login form). Auth server sends back authorization code via redirect",
        narrative: "The user authenticates with the auth server. On success, the server redirects back to your app with an authorization code — a one-time-use code.",
      },
      {
        visual: "Arrow: Browser → Auth Server. Carries: authorization_code + code_verifier. Returns: access_token + refresh_token",
        narrative: "The browser exchanges the authorization code AND the original code verifier for tokens. The auth server checks the verifier against the stored challenge — proof that the same browser started and finished the flow.",
      },
      {
        visual: "Access token in memory (green shield). Refresh token in HttpOnly cookie (green shield). Token in URL: red X",
        narrative: "Store the access token in memory (not localStorage — XSS could steal it). Refresh token goes in an HttpOnly cookie. Never store tokens in URLs.",
      },
    ],
    discoveries: [
      {
        action: "Switch to the Implicit flow tab",
        reaction: "Token appears directly in the URL fragment (#access_token=...). Red warning: 'DEPRECATED — token exposed in URL, browser history, referrer headers'",
        teaches: "Implicit flow puts the access token in the URL — visible in browser history, logs, and referrer headers. Always use Authorization Code + PKCE instead",
      },
      {
        action: "Follow the PKCE flow and see the verifier/challenge mechanism",
        reaction: "The verifier and challenge match — proving the token exchange was initiated by the same browser that started the flow",
        teaches: "PKCE prevents authorization code interception: even if an attacker steals the code, they can't exchange it without the verifier",
      },
    ],
    learningOutcome: "Implement Authorization Code + PKCE for SPAs and understand why Implicit flow is deprecated",
    agentNotes:
      "Scrollytelling sequence diagram per tab. The PKCE flow in Tab 1 is the most important. " +
      "Step-through is essential — auto-play is too fast for OAuth. " +
      "Color coding: public (green), secret (red), token (accent). " +
      "Tab 4 (Implicit) should have a prominent DEPRECATED banner and explain exactly why " +
      "(token in URL fragment is accessible via document.location.hash).",
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Section 10: System Design Problems
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //
  // All 12 system design problems follow the same structure:
  //
  // Phase 1 — SCROLLYTELLING ARCHITECTURE:
  //   Requirements → component diagram builds up step by step →
  //   data flow → API shape. Each scroll step adds one component/arrow.
  //
  // Phase 2 — WORKING DEMO:
  //   The core mechanic as a real interactive. Reader uses it, breaks it,
  //   understands the constraints that drive the architecture.
  //
  // Phase 3 — SCROLLYTELLING TRADEOFFS:
  //   Edge cases → failure modes → alternative approaches. Each scroll
  //   step reveals a new constraint or tradeoff.

  "sdp-news-feed": {
    stopId: "sdp-news-feed",
    format: "system-design",
    effort: "xl",
    proseTarget: [1800, 2500],
    interactives: [
      {
        component: "NewsFeedDemo",
        description:
          "Working mini news feed with: " +
          "- Virtualized infinite scroll (DOM counter visible: constant ~20 nodes) " +
          "- 'New posts' banner at top (click to prepend without scroll jump) " +
          "- Optimistic like button (instant UI → simulated server confirm/rollback) " +
          "- Pull-to-refresh gesture (mobile) " +
          "Architecture diagram builds via scrollytelling: Feed component → VirtualList → " +
          "PostCard → LikeButton → WebSocket for new post notifications → Optimistic update layer.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Scroll the feed and watch the DOM counter",
        reaction: "Counter stays at ~20 regardless of how far you scroll — virtualization at work",
        teaches: "Infinite feeds are virtualized lists — only rendering visible items makes infinite scroll feasible",
      },
      {
        action: "Like a post and immediately see the count increment, then see the server confirm 500ms later",
        reaction: "The UI updated instantly (optimistic) and the server confirmed (no visual change). Rollback only happens on failure",
        teaches: "Optimistic UI gives instant feedback — reconcile with server state asynchronously",
      },
      {
        action: "Click 'new posts' banner while mid-scroll",
        reaction: "New posts prepend WITHOUT jumping the scroll position — existing content stays in place",
        teaches: "New content insertion must compensate scroll position to prevent jarring jumps",
      },
    ],
    learningOutcome: "Design a news feed with infinite scroll, real-time updates, and optimistic UI",
    agentNotes:
      "The working demo should FEEL like a real social feed. Scroll, like, see new posts. " +
      "The DOM counter and optimistic update reveal are teaching moments embedded in real usage. " +
      "Architecture scrollytelling should reference sections 4 (virtualization), 6 (WebSocket), 7 (performance).",
  },

  "sdp-autocomplete": {
    stopId: "sdp-autocomplete",
    format: "system-design",
    effort: "xl",
    proseTarget: [1800, 2500],
    interactives: [
      {
        component: "AutocompleteDemo",
        description:
          "Working autocomplete with a visible 'network panel' showing: " +
          "- Debounce timer (visualized as a filling bar that resets on each keystroke) " +
          "- Requests in flight (animated dots) " +
          "- AbortController cancellation (request dot turns red and fades) " +
          "- Trie cache hits (green flash: 'cache hit, no request needed') " +
          "- Keyboard nav (up/down/enter, active item highlighted) " +
          "Type 'javascript' and watch: without debounce (10 requests), with debounce (2 requests), " +
          "with cache (0 requests on second search for same prefix).",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Type 'javascript' quickly and watch the network panel",
        reaction: "With debounce: only 2 requests fire instead of 10. Cancelled requests shown as red dots",
        teaches: "Debounce prevents request spam — wait for the user to pause before querying",
      },
      {
        action: "Search 'java' → results load. Then search 'javascript'",
        reaction: "'java' results come from network. 'javascript' results come from trie cache (green flash, zero requests)",
        teaches: "Client-side trie caching eliminates repeat network calls for previously-seen prefixes",
      },
    ],
    learningOutcome: "Design autocomplete with debouncing, request cancellation, trie caching, and keyboard navigation",
    agentNotes:
      "The network panel visualization is the hero — seeing requests being created, cancelled, " +
      "and cached makes the optimization strategies tangible. The debounce timer bar should " +
      "visibly reset on each keystroke and fire when it reaches full.",
  },

  "sdp-spreadsheet": {
    stopId: "sdp-spreadsheet",
    format: "system-design",
    effort: "xl",
    proseTarget: [2000, 2800],
    interactives: [
      {
        component: "SpreadsheetDemo",
        description:
          "Mini spreadsheet (20×50 visible, virtualized from 1000×1000). " +
          "Features: cell editing, formula support (=A1+B1, =SUM(A1:A10)). " +
          "THE TEACHING VISUAL: dependency graph. Click a cell with a formula → " +
          "see arrows showing its dependencies. Edit a dependency → watch the UPDATE CASCADE: " +
          "cells highlight in topological order as they recalculate. " +
          "Type a circular dependency (=A1 in B1, =B1 in A1) → see the cycle detected and error shown. " +
          "Architecture scrollytelling: cell grid → formula parser → dependency DAG → " +
          "topological sort → change propagation → virtual grid renderer.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Edit cell A1 and watch dependent cells update in cascade order",
        reaction: "Cells highlight one by one in topological order: A1 → B1 (=A1+1) → C1 (=B1*2) → D1 (=SUM(A1:C1))",
        teaches: "Change propagation follows the dependency DAG in topological order — each cell updates only after its dependencies",
      },
      {
        action: "Create a circular dependency",
        reaction: "Cycle detected immediately. Both cells show #CIRCULAR! error. Dependency graph shows the cycle highlighted in red",
        teaches: "Circular dependency detection is essential — without it, the update cascade would loop infinitely",
      },
    ],
    learningOutcome: "Design a spreadsheet with formula dependency DAG, topological update ordering, and 2D virtualization",
    agentNotes:
      "The dependency graph visualization (click a cell, see arrows to its dependencies) is " +
      "THE teaching element. The cascade animation (cells updating in order) makes topological " +
      "sort tangible. This is the hardest system design problem — expect XL effort.",
  },

  "sdp-chat": {
    stopId: "sdp-chat",
    format: "system-design",
    effort: "large",
    proseTarget: [1500, 2200],
    interactives: [
      {
        component: "ChatDemo",
        description:
          "Two-panel chat (you + simulated other user). " +
          "Features: message send → optimistic insert → server confirm. " +
          "Typing indicator ('Alice is typing...'). " +
          "Message status: sent (✓), delivered (✓✓), read (✓✓ blue). " +
          "THE TEACHING MOMENT: disconnect simulation. Click 'go offline' → " +
          "messages queue locally (shown in orange). Click 'reconnect' → " +
          "queued messages flush to server with retry animation. " +
          "Network panel shows WebSocket frames flowing.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Send messages while 'offline' then reconnect",
        reaction: "Messages queue (orange) → on reconnect, flush in order → server confirms each one → status updates",
        teaches: "Offline resilience requires a message queue with ordered replay on reconnection",
      },
      {
        action: "Watch the typing indicator appear when simulated user types",
        reaction: "Typing indicator uses WebSocket presence — lightweight 'typing' events, not full messages",
        teaches: "Presence features (typing, online status) use separate lightweight WebSocket events",
      },
    ],
    learningOutcome: "Design real-time chat with WebSocket lifecycle, optimistic UI, offline queueing, and presence",
    agentNotes:
      "The disconnect/reconnect flow is the core teaching moment. The queued messages " +
      "shown in orange is a visual that makes offline-first design concrete.",
  },

  "sdp-whiteboard": {
    stopId: "sdp-whiteboard",
    format: "system-design",
    effort: "xl",
    proseTarget: [2000, 2800],
    interactives: [
      {
        component: "WhiteboardDemo",
        description:
          "Collaborative Canvas drawing surface. " +
          "Features: draw shapes (rect, circle, freehand), pan/zoom, color picker. " +
          "A simulated 'other cursor' drawing simultaneously. " +
          "THE TEACHING MOMENTS: " +
          "1. CRDT conflict: both users move the same shape → show merge resolution animation " +
          "2. Pointer coalescing: toggle getCoalescedEvents — show smoother freehand strokes " +
          "3. Canvas vs SVG: toggle renderer — show FPS difference with 500+ shapes " +
          "Architecture: CRDT state → WebRTC data channel → Canvas render loop → Pointer coalescing.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Draw a shape and watch the simulated user move it simultaneously",
        reaction: "Both movements apply — CRDT merges them into a final position. No conflict, no overwrite",
        teaches: "CRDTs enable conflict-free collaboration: concurrent edits merge automatically without coordination",
      },
      {
        action: "Toggle pointer coalescing off and draw a freehand line",
        reaction: "Line is jaggy/segmented. Toggle on → same drawing is smooth with more control points",
        teaches: "getCoalescedEvents() provides intermediate pointer positions between frames — essential for smooth drawing",
      },
    ],
    learningOutcome: "Design a collaborative whiteboard using Canvas, CRDT for sync, and pointer event coalescing",
    agentNotes:
      "The most visually impressive system design problem. The CRDT merge animation is the " +
      "advanced teaching moment. The pointer coalescing toggle has an immediate visible difference.",
  },

  "sdp-offline-first": {
    stopId: "sdp-offline-first",
    format: "system-design",
    effort: "large",
    proseTarget: [1500, 2200],
    interactives: [
      {
        component: "OfflineFirstDemo",
        description:
          "Todo app with offline toggle. " +
          "Go offline → add/edit/delete todos → all changes stored in IndexedDB. " +
          "A 'sync queue' visualization shows pending changes stacking up. " +
          "Go online → queue flushes with animation → server confirms each change. " +
          "CONFLICT: edit a todo while offline, simulate server also changing it → " +
          "on reconnect, show conflict resolution UI (last-write-wins, merge, user-picks). " +
          "Service Worker cache strategy visualized: cache-first for assets, network-first for API.",
        reuses: ["DemoSandbox", "DialToggle"],
      },
    ],
    discoveries: [
      {
        action: "Toggle offline, make changes, toggle online",
        reaction: "Sync queue drains — each change animates from queue to server with confirmation",
        teaches: "Offline-first requires a sync queue that stores changes locally and replays them on reconnection",
      },
      {
        action: "Create a conflict (edit same todo offline and on server)",
        reaction: "Conflict UI appears: shows local version, server version, asks user to choose or merge",
        teaches: "Conflicts are inevitable in offline-first — the resolution strategy must be explicit, not hidden",
      },
    ],
    learningOutcome: "Design an offline-first app with IndexedDB, sync queue, conflict resolution, and Service Worker caching",
    agentNotes:
      "The offline toggle is the entire teaching device. Everything else follows from " +
      "'what happens when you lose connectivity.' The sync queue visualization makes " +
      "the abstract concept of 'eventual consistency' concrete.",
  },

  "sdp-multi-tab": {
    stopId: "sdp-multi-tab",
    format: "system-design",
    effort: "large",
    proseTarget: [1500, 2000],
    interactives: [
      {
        component: "MultiTabDemo",
        description:
          "2-3 simulated 'tab' panels side by side. Shared state: a counter and a todo list. " +
          "Tabbed sync mechanisms: " +
          "1. BroadcastChannel: message animations between tabs " +
          "2. localStorage events: write in one, storage event fires in others " +
          "3. SharedWorker: single worker bubble in the center, tabs connected to it " +
          "4. Leader election: one tab gets a crown icon. Close it → election animation → new leader " +
          "Change state in any tab → see it propagate to others with the chosen mechanism visible.",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs"],
      },
    ],
    discoveries: [
      {
        action: "Close the 'leader' tab",
        reaction: "Crown icon disappears → election animation runs → new leader tab gets the crown",
        teaches: "Leader election ensures only one tab makes API calls — preventing duplicate requests across tabs",
      },
      {
        action: "Compare BroadcastChannel vs localStorage propagation speed",
        reaction: "BroadcastChannel is near-instant. localStorage event has a slight delay",
        teaches: "BroadcastChannel is purpose-built for cross-tab messaging; localStorage events are a hack but universally supported",
      },
    ],
    learningOutcome: "Synchronize state across tabs using BroadcastChannel, SharedWorker, or leader election",
    agentNotes:
      "The side-by-side 'tabs' with visible state propagation is the core visual. " +
      "Leader election with the crown animation is memorable and teaches a non-obvious pattern.",
  },

  "sdp-video-streaming": {
    stopId: "sdp-video-streaming",
    format: "system-design",
    effort: "large",
    proseTarget: [1500, 2200],
    interactives: [
      {
        component: "VideoStreamingDemo",
        description:
          "Mock video player with: " +
          "- Buffer bar showing loaded segments (colored chunks in progress bar) " +
          "- Quality indicator (144p → 4K) " +
          "- ABR mode: simulate bandwidth fluctuations → watch quality auto-adjust " +
          "- Bandwidth + quality overlay graph (the key visualization) " +
          "Simulate network throttle → quality drops → buffer absorbs → playback continues. " +
          "Without ABR: quality stays high → buffer underruns → playback STALLS. " +
          "With ABR: quality drops smoothly → continuous playback.",
        reuses: ["DemoSandbox", "DialSegment"],
      },
    ],
    discoveries: [
      {
        action: "Simulate bandwidth drop without ABR",
        reaction: "Buffer drains, playback stalls. Viewer sees a spinner",
        teaches: "Without adaptive bitrate, bandwidth drops cause playback interruption — the worst UX",
      },
      {
        action: "Simulate same bandwidth drop with ABR enabled",
        reaction: "Quality drops from 1080p to 480p but playback continues without interruption",
        teaches: "ABR trades quality for continuity — better to show a lower quality video than to stall playback",
      },
    ],
    learningOutcome: "Design adaptive video streaming with buffer management and bandwidth-based quality switching",
    agentNotes:
      "The bandwidth/quality overlay graph is the hero visualization. The ABR on/off toggle " +
      "shows the dramatic difference: stall vs smooth quality reduction.",
  },

  "sdp-drag-drop": {
    stopId: "sdp-drag-drop",
    format: "system-design",
    effort: "large",
    proseTarget: [1500, 2200],
    interactives: [
      {
        component: "DragDropDemo",
        description:
          "Sortable list with smooth drag-and-drop. " +
          "Features: pick up item (pointer events), other items animate to make room, " +
          "drop to reorder, keyboard alternative (arrow keys + enter). " +
          "THE TEACHING PANEL: pointer event timeline running alongside the demo. " +
          "Shows: pointerdown → pointermove (many) → pointerup with coordinates and timestamps. " +
          "Hit testing visualization: during drag, drop zones highlight as pointer enters them. " +
          "Accessibility: toggle 'keyboard only' mode → same reordering via arrow keys.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Drag an item and watch the pointer event timeline",
        reaction: "pointerdown, then rapid pointermove events (30+), then pointerup. Each with coordinates",
        teaches: "Drag is just three pointer events: down starts it, move tracks it, up ends it. The implementation is coordinate math",
      },
      {
        action: "Toggle keyboard mode and reorder with arrow keys",
        reaction: "Same smooth reordering animation, no pointer events needed",
        teaches: "Accessible drag-and-drop must have a keyboard alternative — both paths should produce the same result",
      },
    ],
    learningOutcome: "Implement drag-and-drop with pointer events, hit testing, animation, and keyboard accessibility",
    agentNotes:
      "The pointer event timeline alongside the demo is the teaching device. " +
      "The keyboard accessibility mode is a hard requirement, not a nice-to-have.",
  },

  "sdp-notifications": {
    stopId: "sdp-notifications",
    format: "system-design",
    effort: "large",
    proseTarget: [1500, 2200],
    interactives: [
      {
        component: "NotificationDemo",
        description:
          "Notification center + toast system. " +
          "Features: multiple types (info/warn/error/success), priority-based queueing, " +
          "max 3 toasts visible (overflow queued). " +
          "THE TEACHING MECHANIC: rapid-fire notification generator. Hit 'spam' → " +
          "10 notifications with different priorities. Watch: high priority jumps the queue, " +
          "low priority waits, expired toasts auto-dismiss. " +
          "Notification center panel: grouped by time, read/unread, dismiss. " +
          "Push API permission flow visualization.",
        reuses: ["DemoSandbox", "DialSegment"],
      },
    ],
    discoveries: [
      {
        action: "Spam notifications and watch the priority queue",
        reaction: "Error notifications jump ahead of info notifications in the queue — priority ordering visible",
        teaches: "Toast systems need priority queuing — an error should never wait behind 3 info toasts",
      },
      {
        action: "Click 'request push permission' and see the flow",
        reaction: "Permission dialog mock → grant → Service Worker registration → push subscription → server storage",
        teaches: "Push notification setup requires: permission grant → SW registration → push subscription → server-side storage of the subscription",
      },
    ],
    learningOutcome: "Design a notification system with priority queuing, toast management, and Push API integration",
    agentNotes:
      "The rapid-fire 'spam' button with priority queue visualization is the core teaching tool. " +
      "The reader sees high-priority notifications jump the queue in real-time.",
  },

  "sdp-microfrontend": {
    stopId: "sdp-microfrontend",
    format: "system-design",
    effort: "xl",
    proseTarget: [2000, 2800],
    interactives: [
      {
        component: "MicrofrontendDemo",
        description:
          "App shell loading 3 micro-frontends (Team A header, Team B product list, Team C cart). " +
          "Features: " +
          "- Each MFE loads independently (show loading states) " +
          "- Shared dependency dedup (React loaded once, visualized as shared package) " +
          "- Event bus: MFE communication shown as animated messages between panels " +
          "- Isolation comparison tabs: iframe (full isolation), Web Component (medium), Module Federation (minimal) " +
          "Architecture scrollytelling: app shell → remote containers → shared deps → event bus → routing.",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs"],
      },
    ],
    discoveries: [
      {
        action: "Watch shared dependencies load once and be reused by all 3 MFEs",
        reaction: "React bundle loads once (shown as single download) → shared by all 3 panels. Without sharing: 3x the download",
        teaches: "Module Federation enables shared singleton dependencies — critical for avoiding bundle duplication across micro-frontends",
      },
      {
        action: "Add an item from Team B's product list and see Team C's cart update",
        reaction: "Event bus message animates from product panel to cart panel — loose coupling, no direct imports",
        teaches: "Micro-frontends communicate through an event bus, not direct imports — maintaining team independence",
      },
    ],
    learningOutcome: "Architect micro-frontends with independent deployment, shared dependencies, and event-based communication",
    agentNotes:
      "The app shell with 3 independently-loading MFE panels is the hero visual. " +
      "Event bus messages animating between panels makes the communication pattern visible.",
  },

  "sdp-image-gallery": {
    stopId: "sdp-image-gallery",
    format: "system-design",
    effort: "large",
    proseTarget: [1500, 2200],
    interactives: [
      {
        component: "ImageGalleryDemo",
        description:
          "Image gallery with: " +
          "- BlurHash placeholders → sharp image transition (the satisfying part) " +
          "- Lazy loading via IO (network panel shows deferred loads) " +
          "- Responsive masonry grid " +
          "- Virtual grid for 500+ images (only visible rendered) " +
          "- Lightbox with focus trap and keyboard navigation (esc/arrow keys) " +
          "THE TEACHING VISUAL: network panel showing which images have loaded vs deferred. " +
          "Counter: 'Loaded 8 of 500 images (saving 4.2MB)'.",
        reuses: ["DemoSandbox"],
      },
    ],
    discoveries: [
      {
        action: "Scroll down and watch BlurHash placeholders resolve to images",
        reaction: "Blurred colorful placeholders sharpen into full images — smooth, no layout shift",
        teaches: "BlurHash/LQIP provides a meaningful preview that prevents layout shift and feels intentional, not broken",
      },
      {
        action: "Check the 'bytes saved' counter after scrolling only halfway",
        reaction: "'Loaded 20 of 500 — saving 3.8MB'. Most images haven't loaded because they're not visible",
        teaches: "Combining lazy loading with virtualization means you only pay for what the user actually sees",
      },
    ],
    learningOutcome: "Design an image gallery combining lazy loading, virtualization, responsive images, and progressive enhancement",
    agentNotes:
      "The BlurHash → sharp transition is the most visually satisfying element. Use placeholder " +
      "colored rectangles since we can't generate real BlurHash in the browser. " +
      "The bytes-saved counter makes the optimization tangible.",
  },
};

// ── Helpers ────────────────────────────────────────────────────

export function getLessonMeta(stopId: string): LessonMeta | undefined {
  return LESSON_PLAN[stopId];
}

export function getLessonsByFormat(format: LessonFormat): LessonMeta[] {
  return Object.values(LESSON_PLAN).filter((l) => l.format === format);
}

export function getLessonsByEffort(effort: Effort): LessonMeta[] {
  return Object.values(LESSON_PLAN).filter((l) => l.effort === effort);
}

export function getLessonPlanStats() {
  const lessons = Object.values(LESSON_PLAN);
  const byFormat = new Map<LessonFormat, number>();
  const byEffort = new Map<Effort, number>();
  let totalComponents = 0;

  for (const l of lessons) {
    byFormat.set(l.format, (byFormat.get(l.format) ?? 0) + 1);
    byEffort.set(l.effort, (byEffort.get(l.effort) ?? 0) + 1);
    totalComponents += l.interactives.length;
  }

  return { total: lessons.length, byFormat, byEffort, totalComponents };
}
