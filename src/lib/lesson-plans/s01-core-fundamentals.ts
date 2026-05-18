import type { LessonMeta } from "./types";

export const CORE_FUNDAMENTALS: Record<string, LessonMeta> = {
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
          "KEY SCENARIO: A parent container is visible. Set child to width:100% + add " +
          "padding. PREDICTION GATE before box-sizing toggle: 'The child is width:100% with " +
          "20px padding. The parent is 300px wide. Will the child fit? " +
          "(a) Yes — padding is included in 100% " +
          "(b) No — it will overflow by 40px " +
          "(c) No — it will overflow by 20px' " +
          "WRONG-ANSWER FEEDBACK: " +
          "(a) 'In content-box, width:100% means the CONTENT is 300px. Padding adds ON TOP — total box is 340px.' " +
          "(c) 'Close — but padding applies to BOTH left AND right: 20px + 20px = 40px overflow.' " +
          "Then toggle to border-box — it fits. The toggle VERIFIES the committed prediction. " +
          "Third discovery: set margin to 'auto' on a block element → watch it center itself.",
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
        action: "Set child to width:100% and add padding in content-box mode",
        reaction: "Child overflows parent (red indicator). Toggle to border-box — fits perfectly",
        teaches: "width:100% + padding overflows in content-box — the real reason developers use * { box-sizing: border-box }",
      },
      {
        action: "Set left/right margin to auto on a block element",
        reaction: "Element smoothly centers within its container",
        teaches: "margin:auto distributes remaining space equally — the classic centering trick",
      },
    ],
    learningOutcome: "Intuitively predict element size under both box-sizing modes by dragging, not reading",
    agentNotes:
      "No explanation text up front. Drop the reader into the draggable box. A tiny 'try dragging the edges' " +
      "nudge fades after 3 seconds. The FormulaBar formula changes shape when toggling box-sizing — " +
      "that visual formula change IS the explanation. " +
      "PREDICTION GATE before box-sizing toggle: 'Will the child fit?' with per-option wrong-answer " +
      "feedback. The toggle becomes verification of a committed belief, not a passive reveal. " +
      "Color layers: content (blue, --diagram-layer-0), padding (green, --diagram-layer-1), " +
      "border (purple, --diagram-layer-2), margin (orange/transparent, --diagram-layer-4). " +
      "The width:100% + padding scenario replaces negative-margin (niche, confusing). " +
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
          "SCOPED START: 2 elements (A and B) in a parent container, 3 position modes " +
          "(static, relative, absolute). Reader selects an element, chooses a mode. " +
          "Ghost outline stays where the element WAS in normal flow. " +
          "The 'containing block' gets a glowing dashed border so you SEE what it's relative to. " +
          "Offset handles (top/right/bottom/left) appear as draggable sliders. " +
          "PREDICTION GATE before containing-block shift: 'Parent is position:static. You set " +
          "child A to position:absolute with top:0, left:0. Where will it appear? " +
          "(a) Top-left of the parent (b) Top-left of the viewport (c) Where it was in normal flow' " +
          "WRONG-ANSWER FEEDBACK: " +
          "(a) 'The parent is static — it doesn't create a containing block. Absolute positions " +
          "relative to the nearest POSITIONED ancestor.' " +
          "(c) 'That would be position:relative with no offsets. Absolute removes the element from flow entirely.' " +
          "KEY AHA: set parent to relative, then child A to absolute — watch the containing " +
          "block shift from viewport to parent. " +
          "ADVANCED TAB: unlocks fixed and sticky modes. " +
          "For sticky: a scroll-simulation SLIDER replaces embedded scroll container. " +
          "Reader drags the slider and the element responds as if the page scrolled — " +
          "it flows normally until hitting the threshold, then sticks. " +
          "This removes the nested-scroll UX ambiguity entirely. " +
          "CONTAINING BLOCK GOTCHA: add transform to a parent → position:fixed child " +
          "breaks (stops being relative to viewport). This is one of the most-Googled " +
          "CSS debugging scenarios.",
        reuses: ["DemoSandbox", "Annotation"],
      },
    ],
    discoveries: [
      {
        action: "Set element A to 'absolute' without a positioned parent",
        reaction: "Element jumps to position relative to viewport; ghost shows where it was",
        teaches: "Absolute removes from flow and positions relative to nearest positioned ancestor (or viewport)",
      },
      {
        action: "Set parent to 'relative', then child A to 'absolute'",
        reaction: "Containing block border moves from viewport to parent — child repositions",
        teaches: "The 'relative parent + absolute child' pattern: relative creates a containing block",
      },
      {
        action: "Drag the scroll-simulation slider with a 'sticky' element (Advanced tab)",
        reaction: "Element scrolls normally, then locks in place when it hits the threshold",
        teaches: "Sticky is a hybrid: relative until a scroll threshold, then fixed within its scroll container",
      },
      {
        action: "Add transform to a parent, then set child to 'fixed'",
        reaction: "Fixed child stops being relative to viewport — it's trapped inside the transformed parent",
        teaches: "transform establishes a containing block — position:fixed breaks inside a transformed parent (common gotcha)",
      },
    ],
    learningOutcome: "Predict where any element will render given its position mode, ancestor chain, and containing block gotchas",
    agentNotes:
      "Start with 2 elements + 3 modes. Don't overwhelm with 5x5 matrix. " +
      "PREDICTION GATE before containing-block shift: 'Where will the absolute child appear?' " +
      "with per-option wrong-answer feedback. Turns the aha into a prediction-then-verification. " +
      "The ghost outline is CRITICAL — it shows what the element is 'relative' to. " +
      "Advanced tab unlocks fixed + sticky. Sticky uses a SLIDER (not embedded scroll) " +
      "to avoid nested-scroll confusion. " +
      "The transform → fixed gotcha plugs the coverage gap between positioning and stacking context. " +
      "This is the most-Googled CSS layout bug.",
  },

  "core-formatting-ctx": {
    stopId: "core-formatting-ctx",
    format: "challenge-chain",
    effort: "medium",
    proseTarget: [150, 250],
    interactives: [
      {
        component: "BFCBugHunt",
        description:
          "FORMAT CHANGED from explorable to challenge-chain. 'CSS Bug Hunt' — " +
          "three broken card layouts the reader must diagnose and fix. " +
          "BUG 1 — MARGIN COLLAPSE: A card component has mysterious 20px spacing above " +
          "the heading (margin collapsing through the card border). Toolbox: 8 CSS " +
          "properties to try (overflow:hidden, display:flow-root, border-top:1px solid " +
          "transparent, contain:layout, padding-top:1px, plus 3 decoys that don't fix it). " +
          "Reader must DISCOVER which properties fix it. Multiple correct answers. " +
          "After fixing: 'Why do overflow, display, and contain all fix the same bug?' " +
          "BUG 2 — FLOAT CONTAINMENT: A sidebar card collapses to 0px height because it " +
          "contains a floated avatar. Same toolbox approach. " +
          "BUG 3 — ADJACENT ELEMENT EXCLUSION: Text wraps awkwardly under a floated pull-quote. " +
          "Reader applies BFC to the text container to stop wrapping. " +
          "REVEAL: After all three bugs, the summary: 'All three fixes worked because they " +
          "created a Block Formatting Context.' The concept name appears AFTER the experience. " +
          "Then a compact BFC trigger reference card appears.",
        reuses: ["DemoSandbox", "DemoSandbox.Tabs", "Annotation", "StatusDot"],
      },
    ],
    discoveries: [
      {
        action: "Try overflow:hidden on the margin collapse bug",
        reaction: "Gap disappears! But also try display:flow-root — it also works. And border-top:1px solid transparent — also works",
        teaches: "Multiple 'unrelated' CSS properties all fix the same bug — they share a hidden mechanism (BFC)",
      },
      {
        action: "Try a decoy property on any bug",
        reaction:
          "Nothing changes — targeted rejection per decoy: " +
          "position:relative → 'Creates a containing block for absolute children, not a formatting context — different mechanism.' " +
          "z-index:1 → 'Creates a stacking context for paint order, not a formatting context — different boundary.' " +
          "transform:none → 'Transform values can create a containing block, but none is the default — no effect.'",
        teaches: "Not every CSS property creates a BFC — only specific triggers. Each decoy rejection explains WHAT the property actually does, building CSS mental models even from wrong answers",
      },
      {
        action: "Fix all three bugs and see the summary reveal",
        reaction: "'All three fixes created a Block Formatting Context' — the concept name appears AFTER the experience",
        teaches: "BFC is an invisible boundary that prevents margin collapse, contains floats, and isolates layout",
      },
    ],
    learningOutcome: "Diagnose BFC-related layout bugs by recognizing symptoms and applying the right trigger",
    agentNotes:
      "CHALLENGE-CHAIN format, not explorable. The reader DISCOVERS BFC through bug-fixing, " +
      "not through toggling labeled controls. The concept name comes LAST, after the experience. " +
      "The toolbox of 8 properties (5 real BFC triggers + 3 decoys) forces genuine problem-solving. " +
      "DECOY REJECTIONS are per-property, not generic: position:relative → 'containing block, not formatting context', " +
      "z-index:1 → 'stacking context, not formatting context', transform:none → 'no effect (default value)'. " +
      "Each rejection teaches what the property ACTUALLY does, building CSS mental models from wrong answers. " +
      "Bug 1 (margin collapse) is modern and relevant. Bug 2 (float containment) is included " +
      "because it still appears in legacy codebases. Bug 3 (exclusion) teaches the general principle. " +
      "Color: use --color-accent for BFC boundary glow when revealing the concept.",
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
          "3D perspective view of 6 overlapping elements. Page tilted ~30° on X axis " +
          "to show depth. Each element is a colored card with a z-index label. " +
          "PRESET HIERARCHY: Card E starts as a child of Card A (z-index:1). " +
          "Reader can: " +
          "1. DRAG elements up/down in the z-axis (changes z-index, animates layer position) " +
          "2. Toggle properties that CREATE stacking contexts: opacity(<1), transform, filter, " +
          "   will-change, isolation:isolate " +
          "3. Click 'Reparent' button to move Card E between root level and Card A " +
          "PREDICTION GATE before the aha: 'Card E is inside Card A (z-index:1). Card B is at " +
          "the root (z-index:2). If you set Card E to z-index:9999, where will it render? " +
          "(a) Above everything — 9999 beats 2 (b) Below Card B — trapped in Card A's layer " +
          "(c) Between Card A and Card B' " +
          "WRONG-ANSWER FEEDBACK: " +
          "(a) 'z-index only competes within the SAME stacking context. Card E is inside Card A's " +
          "context, so 9999 only matters relative to Card A's other children.' " +
          "THE AHA MOMENT: Card E starts inside Card A (z-index:1). Set Card E to " +
          "z-index:9999 — it STILL renders below Card B (z-index:2). The 3D view makes " +
          "this VISCERALLY clear: Card E is trapped inside Card A's layer. " +
          "Click 'Reparent to root' → Card E jumps above everything. " +
          "Each stacking context gets a colored border wrapping its children. " +
          "NO DRAG-TO-NEST — z-axis drag is the only drag gesture. Reparent is a button.",
        reuses: ["DemoSandbox", "Annotation"],
      },
    ],
    discoveries: [
      {
        action: "Set child Card E z-index to 9999 while parent Card A has z-index:1",
        reaction: "Card E stays below Card B (z-index:2) — trapped in parent's context. 3D view shows it clearly",
        teaches: "z-index only competes within the SAME stacking context, not globally",
      },
      {
        action: "Click 'Reparent to root' on Card E",
        reaction: "Card E jumps from inside Card A to root level — now z-index:9999 puts it on top of everything",
        teaches: "Stacking context scope determines z-index competition — reparenting changes the scope",
      },
      {
        action: "Toggle opacity:0.99 on an element",
        reaction: "A new stacking context forms (colored border appears), all children regroup inside it",
        teaches: "Opacity < 1 creates a stacking context — a common accidental trap",
      },
    ],
    learningOutcome: "Debug z-index issues by identifying stacking context boundaries through 3D mental model",
    agentNotes:
      "NO DRAG-TO-NEST. This was the biggest feasibility risk from the critique. " +
      "Z-axis drag is the only drag gesture. Reparenting uses a button — simpler, no UX ambiguity. " +
      "PREDICTION GATE before the trapped-z-index aha: 'Set Card E to 9999 — where will it render?' " +
      "The prediction commits the reader to the wrong mental model (9999 beats 2) before the surprise. " +
      "The trapped-z-index aha works because the preset hierarchy already has E inside A. " +
      "Use CSS perspective + rotateX on container. translateZ proportional to z-index. " +
      "When a stacking context forms, animate children GROUPING and context border appearing.",
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
          "CONSEQUENCE-PREDICTION GATES before each stage reveal: " +
          "Before Layout: 'You just changed this element's width from 200px to 300px. " +
          "What does the browser need to recalculate?' (a) Only colors (b) Positions and sizes " +
          "of this element AND its neighbors (c) Just this element's size) " +
          "Before Paint: 'The layout changed. What needs to happen next?' (a) Draw the new pixels " +
          "(b) Send new positions to GPU (c) Nothing — layout is enough) " +
          "Before Composite: 'Paint produced new layer textures. Who assembles them?' " +
          "(a) CPU only (b) GPU when layers are promoted (c) Always GPU) " +
          "Wrong answer: brief red flash, correct highlights. Right: green confirmation. " +
          "Then the stage animation plays. " +
          "After all stages: the trigger panel appears. Reader clicks CSS properties " +
          "(color, width, transform, opacity) and the pipeline HIGHLIGHTS which stages re-run. " +
          "FORCED REFLOW: reader clicks 'read offsetHeight between writes' — pipeline " +
          "runs TWICE in one frame (red warning pulse). " +
          "STAGE ILLUSTRATIONS SIMPLIFIED: just colored boxes with icons and labels, " +
          "not elaborate internal animations (DOM tree, CSS arrows). The prediction gates " +
          "replace passive visual complexity with active engagement.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Pipeline empty, all stages dim/outlined",
        narrative: "Every time something changes on a web page, the browser runs a pipeline to figure out what to show. You've learned how CSS defines size, position, stacking, and isolation. Now: what does the browser actually DO with all that?",
      },
      {
        visual: "DOM stage lights up with icon. Two HTML snippets shown side by side",
        narrative: "First, the browser parses HTML into a DOM tree — a hierarchy of nodes.",
        interaction: "Micro-interaction: 'Which snippet creates more DOM nodes?' (a) <div><ul><li>A</li><li>B</li></ul></div> (b) <div><span>A</span><span>B</span></div>. Answer: (a) — ul + 2 li = 3 extra nodes vs 2 spans",
      },
      {
        visual: "Style stage lights up. Two CSS selectors shown targeting the same element",
        narrative: "Next, it resolves every CSS rule to compute the final styles for each element. Selector specificity, cascade, inheritance — all resolved here.",
        interaction: "Micro-interaction: 'Which rule wins?' (a) #header .nav a (b) .nav-link. " +
          "WRONG: (b) 'IDs score higher than classes in specificity. The cascade resolves conflicts like this at the Style stage.' " +
          "This also addresses the specificity coverage gap.",
      },
      {
        visual: "Layout stage lights up. CONSEQUENCE PREDICTION.",
        narrative: "Now the browser calculates the exact position and size of every element. This is where your flexbox gaps, grid columns, and block flows become pixel coordinates.",
        interaction: "Prediction: You changed this element's width from 200px to 300px. What does the browser recalculate? (a) Only colors (b) Positions and sizes of this element AND neighbors (c) Just this element's size",
      },
      {
        visual: "Paint stage lights up. CONSEQUENCE PREDICTION.",
        narrative: "The browser rasterizes each layer into pixels — drawing backgrounds, borders, text, shadows.",
        interaction:
          "Prediction: You changed background-color from blue to red. What does the browser redo? " +
          "(a) Layout + Paint + Composite (b) Paint + Composite only (c) Composite only. " +
          "WRONG-ANSWER FEEDBACK: " +
          "(a) 'Color doesn't affect size or position — Layout has nothing to recalculate. Only the pixels need repainting.' " +
          "(c) 'The GPU assembles existing layer textures, but the texture content changed — the new color needs to be drawn (painted) first.'",
      },
      {
        visual: "Composite stage lights up. CONSEQUENCE PREDICTION.",
        narrative: "Painted layers are composited together in the right order. This is the only stage that can run on the GPU.",
        interaction: "Prediction: Paint produced new layer textures. Who assembles the final frame? (a) CPU only (b) GPU when layers are promoted (c) Always GPU",
      },
      {
        visual: "Trigger panel appears. 'width' highlighted, Layout+Paint+Composite glow red",
        narrative: "Not all changes are equal. Changing 'width' forces Layout, Paint, AND Composite — the most expensive path.",
        interaction: "Click different CSS properties to see which pipeline stages they trigger",
      },
      {
        visual: "'transform' highlighted, only Composite glows green",
        narrative: "But 'transform' skips straight to Composite — no layout recalculation, no repaint. This is why transform animations are silky smooth.",
        interaction: "Try: color (Paint+Composite), opacity (Composite only), font-size (Layout+Paint+Composite)",
      },
      {
        visual: "Forced reflow: pipeline runs twice rapidly, red warning pulses",
        narrative: "The trap: reading layout properties (offsetHeight) between DOM writes forces a synchronous layout — the pipeline runs MID-FRAME.",
        interaction: "Toggle 'read between writes' to see the pipeline double-fire",
      },
    ],
    discoveries: [
      {
        action: "Get a prediction gate wrong (e.g., say Layout calculates colors)",
        reaction: "Brief red flash, correct answer highlights, then stage animation plays with the right answer reinforced",
        teaches: "Prediction gates transform passive scrolling into active recall — wrong answers make corrections stick",
      },
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
      "CONSEQUENCE-PREDICTION GATES replace knowledge-recall questions. Each gate names a SPECIFIC " +
      "CSS property change: Layout = 'width 200→300px, what recalculates?', " +
      "Paint = 'background-color blue→red, what does the browser redo?' (answer: Paint+Composite only — " +
      "wrong answers get targeted feedback explaining why color skips Layout, why Composite alone isn't enough). " +
      "Composite = 'Paint produced new textures, who assembles?' The property-specific framing tests " +
      "understanding of how the pipeline connects to CSS properties, not just stage vocabulary. " +
      "This transforms 5 passive scroll steps into 3 active consequence-prediction moments + 2 intro. " +
      "The trigger panel is the explorable part after scrollytelling. " +
      "Stage visuals are simplified: colored box + icon + label. No internal mini-animations. " +
      "Property-to-stage mapping: use csstriggers.com data. " +
      "The bridge from S01 stops 1-4: first scroll step explicitly connects CSS concepts to browser pipeline.",
  },

  "core-composition": {
    stopId: "core-composition",
    format: "explorable",
    effort: "medium",
    proseTarget: [300, 500],
    interactives: [
      {
        component: "LayerBudgetChallenge",
        description:
          "FORMAT CHANGED from scrollytelling to explorable 'Layer Budget Challenge.' " +
          "The reader is given a JANKY mock page and a VRAM budget of 8MB. " +
          "The page has: a CSS animation causing full-page repaint (visible jank), " +
          "a fixed header, a parallax background, a sidebar with hover effects, " +
          "and several static content blocks. " +
          "FPS counter shows the page at 24fps (janky). VRAM meter at 2MB. " +
          "Reader must choose which elements to promote to GPU layers by toggling " +
          "will-change:transform on each. Each promotion has a VRAM cost shown upfront: " +
          "hero animation (4MB), fixed header (0.5MB), parallax bg (3MB), sidebar (1.5MB), etc. " +
          "Goal: hit 60fps without exceeding 8MB VRAM budget. " +
          "KEY TENSION: promoting the hero animation (biggest jank source) costs 4MB — " +
          "half the budget. The reader must make TRADEOFF decisions, not just promote everything. " +
          "PREDICTION GATE before 'promote all': 'All 7 elements are about to get " +
          "will-change:transform. What happens to FPS? " +
          "(a) Jumps to 60 — more GPU layers = better " +
          "(b) Drops below current — the GPU has limits too " +
          "(c) Stays roughly the same' " +
          "WRONG-ANSWER FEEDBACK: " +
          "(a) 'Each promoted layer costs VRAM. When the GPU has too many layers to composite, " +
          "it actually slows DOWN. More layers is not always better.' " +
          "LAYER EXPLOSION MODE: the 'promote all' button blows past 8MB — " +
          "FPS actually DROPS because the GPU is overwhelmed with too many layers. " +
          "The prediction makes this surprise twice as powerful. " +
          "3D exploded view toggle shows layers separating (reuses Stacking Context visual).",
        reuses: ["DemoSandbox", "Annotation", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Promote the hero animation to a GPU layer",
        reaction: "FPS jumps from 24 to 55 but VRAM jumps from 2MB to 6MB — half the budget consumed by one element",
        teaches: "Layer promotion trades memory for compositing performance — the biggest jank source may also be the most expensive to promote",
      },
      {
        action: "Click 'promote all' and watch VRAM spike past budget",
        reaction: "VRAM hits 14MB, FPS drops to 20 — WORSE than before. Layer explosion in action",
        teaches: "Layer explosion: over-promotion overwhelms the GPU compositor — more layers ≠ better performance",
      },
      {
        action: "Find the optimal combination that hits 60fps under 8MB",
        reaction: "Promote hero (4MB) + fixed header (0.5MB) + sidebar (1.5MB) = 8MB exactly, 60fps. Parallax must stay on CPU",
        teaches: "GPU layer promotion requires a budget mindset — promote the high-impact elements first, leave low-impact ones on CPU",
      },
    ],
    learningOutcome: "Make strategic layer promotion decisions within a VRAM budget to eliminate jank without over-promoting",
    agentNotes:
      "FORMAT CHANGED from scrollytelling to explorable. No passive scroll phase. " +
      "Reader starts with the janky page and must FIX it within constraints. " +
      "PREDICTION GATE before 'promote all': commits reader to 'more layers = better' belief, " +
      "then the layer explosion shatters it. " +
      "The VRAM budget is the key teaching device — it forces tradeoffs instead of 'promote everything.' " +
      "The 'promote all → performance drops' moment is the equivalent of GPU Battle's stress slider " +
      "but for the memory axis. This gives the stop its own identity separate from Render Cycle.",
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
          "THREE animation columns side by side (was two), each with PIPELINE STAGE BADGES " +
          "above the column showing which Render Cycle stages it triggers: " +
          "Left: animated with top/left — badges: [Layout][Paint][Composite] (full pipeline). " +
          "Middle: animated with background-color — badges: [Paint][Composite] (skips Layout). " +
          "Right: animated with transform:translateX — badges: [Composite] (GPU only). " +
          "The badges reuse Render Cycle's stage colors, making the cross-lesson connection VISIBLE. " +
          "All three run at 60fps initially. A 'STRESS' slider adds heavy JS work " +
          "to the main thread. As stress increases: " +
          "Left jitters FIRST (most expensive). Middle jitters NEXT. Right stays SMOOTH. " +
          "PREDICTION GATE before first stress test: 'Which animation will jank first?' " +
          "WRONG-ANSWER FEEDBACK: " +
          "If reader picks middle (background-color): 'Color changes skip Layout but still need Paint — " +
          "they are mid-tier. The most expensive animations trigger the FULL pipeline.' " +
          "If reader picks right (transform): 'Transform runs entirely on the GPU compositor. It never " +
          "touches the main thread. That is why it janks LAST (or never).' " +
          "Reader commits, then cranks the slider. " +
          "Three performance tiers map directly to the Render Cycle trigger panel: " +
          "full pipeline (most expensive) → paint+composite → composite only (cheapest). " +
          "Live metrics: FPS counter per column, main thread busy %. " +
          "CALIBRATION: on mount, a calibration loop measures how many blocking-work " +
          "iterations fit in 16ms on this device, then scales the stress slider accordingly. " +
          "This prevents cross-device inconsistency.",
        reuses: ["DemoSandbox", "Dial"],
      },
    ],
    discoveries: [
      {
        action: "Predict which animation janks first, then crank stress to 60%",
        reaction: "Left (top/left) drops to 25fps first. Middle (background-color) drops to 40fps. Right (transform) stays at 60fps",
        teaches: "Three performance tiers: Layout-triggering properties jank first, paint-only next, compositor-only is immune",
      },
      {
        action: "Crank the stress slider to 90%",
        reaction: "Left at 8fps, middle at 22fps, right still at 58fps — the gap is massive",
        teaches: "GPU-composited animations (transform, opacity) are immune to main thread blocking",
      },
      {
        action: "Reduce stress back to 0%",
        reaction: "All three animations look identical at 60fps — the difference is invisible under ideal conditions",
        teaches: "The performance gap only matters when the main thread is busy — which it always is in real apps",
      },
    ],
    learningOutcome: "Choose GPU-composited properties for animations and predict which property types jank first under load",
    agentNotes:
      "Battle format. THREE columns with PIPELINE STAGE BADGES above each column. The badges reuse " +
      "Render Cycle's stage colors (same CSS variables) — a reader who remembers the pipeline stages " +
      "will recognize them instantly. This makes the cross-lesson connection explicit, not implied. " +
      "CALIBRATION on mount: measure device frame budget, scale blocking loop accordingly. " +
      "This prevents the 'works on MacBook, freezes on Chromebook' problem. " +
      "PREDICTION GATE before first stress: 'Which janks first?' makes the reveal a teaching moment.",
  },

  "core-event-loop": {
    stopId: "core-event-loop",
    format: "scrollytelling",
    effort: "xl",
    proseTarget: [400, 600],
    interactives: [
      {
        component: "EventLoopScrolly",
        description:
          "FLAGSHIP LESSON. TWO phases (was three — Phase 2 'Watch It Run' CUT). " +
          "Phase 1 — 'Meet the Machine' (scrollytelling): " +
          "Sticky visual: the event loop machine. Components: call stack (vertical), " +
          "task queue (horizontal), microtask queue (distinct color), Web API area, render steps. " +
          "PREDICTION GATES during scroll: " +
          "After task queue introduced: 'Where does a Promise.then callback go?' (3 options) " +
          "After Web API area: 'When does a setTimeout(fn, 0) callback run?' (3 options) " +
          "After render steps: 'What blocks rendering?' (3 options) " +
          "Phase 2 — 'Predict the Output' (interactive — was Phase 3): " +
          "5 scenarios, increasing difficulty. For each, reader PREDICTS output order by " +
          "dragging numbered blocks. Click 'run' → event loop executes with animation. " +
          "Right = green. Wrong = replay with wrong prediction highlighted vs actual. " +
          "Scenarios: " +
          "1. console.log vs setTimeout(0) — warmup " +
          "2. setTimeout vs Promise.then — the classic " +
          "3. Nested microtasks (Promise.then inside Promise.then) " +
          "4. async/await (show desugaring to Promise chain) " +
          "5. setTimeout + queueMicrotask + Promise + sync — the gauntlet " +
          "STARVATION DEMO (was separate stop, now Phase 3 here): " +
          "After prediction game, 'The Consequences' button. Click → run actual infinite " +
          "microtask loop for 300ms with performance.now() kill switch. The page ACTUALLY " +
          "freezes for 300ms (short enough to be safe, long enough to be visceral). " +
          "UI counter stops, buttons unresponsive. Then the kill switch fires and a " +
          "'render blocked' indicator shows what happened. " +
          "Fix challenge: a SINGLE EDITABLE LINE (not a full Monaco editor — just a styled " +
          "contentEditable span within the starvation code block, with the queueMicrotask call " +
          "highlighted as the editable region). Reader replaces queueMicrotask with setTimeout to yield. " +
          "This is genuine code authoring scoped to ONE line — no file navigation, no syntax features. " +
          "The editor runs the modified code with the same 300ms kill switch. " +
          "If the fix is correct, the UI stays responsive. " +
          "rAF REMOVED from gauntlet scenario to avoid browser-dependent ordering confusion.",
        reuses: ["DemoSandbox"],
      },
    ],
    scrollSteps: [
      {
        visual: "Empty event loop machine, all areas dim",
        narrative: "JavaScript is single-threaded. One call stack, one thread. But it handles async through the event loop.",
      },
      {
        visual: "Call stack highlights with glowing border",
        narrative: "The call stack tracks what's executing RIGHT NOW. Functions push on when called, pop off when they return.",
      },
      {
        visual: "Task queue highlights. 'setTimeout callback' and 'click handler' as examples",
        narrative: "The task queue holds callbacks from timers, events, and I/O. One runs per loop iteration.",
      },
      {
        visual: "Microtask queue highlights in distinct color. PREDICTION GATE.",
        narrative: "The microtask queue drains COMPLETELY between tasks. Promise .then(), MutationObserver, queueMicrotask all go here.",
        interaction: "Prediction: Where does a Promise.then callback go? (a) Task queue (b) Microtask queue (c) Call stack directly. " +
          "WRONG-ANSWER FEEDBACK: " +
          "(a) 'Promises have their own queue — the microtask queue. It drains COMPLETELY between each macrotask. " +
          "That is why Promise.then always runs before the next setTimeout callback.' " +
          "(c) 'Promise callbacks are not synchronous. They wait for the current execution to finish, " +
          "then run from the microtask queue before any macrotask.'",
      },
      {
        visual: "Web API area highlights. PREDICTION GATE.",
        narrative: "Web APIs (setTimeout, fetch, DOM events) run OUTSIDE JavaScript. They register callbacks that land in queues when ready.",
        interaction: "Prediction: When does setTimeout(fn, 0) actually run? (a) Immediately (b) After current script + microtasks (c) After 4ms minimum. " +
          "WRONG-ANSWER FEEDBACK: " +
          "(a) 'The 0 means as-soon-as-possible, not now. The callback goes to the task queue and waits " +
          "until the current script finishes AND all microtasks drain.' " +
          "(c) 'The 4ms minimum is real in deeply nested timers (spec clamps after depth 5), but for a " +
          "top-level setTimeout(fn, 0), the main delay is waiting for script + microtask queue.'",
      },
      {
        visual: "Render steps area highlights. PREDICTION GATE.",
        narrative: "Between tasks, the browser may run rendering. If the microtask queue keeps filling, rendering gets blocked.",
        interaction: "Prediction: What blocks the browser from rendering? (a) Long macrotasks only (b) Infinite microtask chains only (c) Both. " +
          "WRONG-ANSWER FEEDBACK: " +
          "(a) 'Microtask chains are worse — they drain completely before the browser can render. " +
          "An infinite microtask chain blocks rendering forever. Long macrotasks at least end.' " +
          "(b) 'Both block rendering. A 2-second synchronous computation (macrotask) freezes the page " +
          "just as effectively as an infinite microtask chain.'",
      },
      {
        visual: "Prediction game UI: 'What's the output order?' with draggable blocks",
        narrative: "Your turn. Predict the execution order, then run it to check. Five scenarios, increasing difficulty.",
        interaction: "Drag output blocks into predicted order, then click 'Run'",
      },
    ],
    discoveries: [
      {
        action: "Predict that setTimeout(0) runs before Promise.then",
        reaction: "Wrong — replay shows microtask queue draining before task queue",
        teaches: "Microtasks always run before the next macrotask, regardless of registration order",
      },
      {
        action: "Watch nested microtasks execute in scenario 3",
        reaction: "All microtasks drain before any render step — 'rendering blocked' indicator flashes",
        teaches: "Microtask chains can starve rendering — each microtask that schedules another extends the drain",
      },
      {
        action: "Click 'The Consequences' and watch the page actually freeze for 300ms",
        reaction: "UI counter stops, buttons unresponsive, then kill switch fires. Viscerally experience microtask starvation",
        teaches: "Infinite microtask loops block EVERYTHING — this is why you yield to the browser with setTimeout",
      },
      {
        action: "Edit the starvation code in the inline editor: change queueMicrotask to setTimeout",
        reaction: "Run the modified code — UI stays responsive. Each iteration yields to the render step",
        teaches: "setTimeout yields to the browser between iterations; queueMicrotask does not. Writing the fix in code makes the lesson tactile",
      },
    ],
    learningOutcome: "Predict execution order of any mix of sync code, promises, and timeouts, and avoid microtask starvation",
    agentNotes:
      "Phase 2 'Watch It Run' CUT entirely — it was a passive version of what the prediction game " +
      "does actively. Go from Phase 1 (learn the parts) directly to the prediction game. " +
      "This saves 4 scroll steps and puts the reader into active mode 60 seconds sooner. " +
      "MICROTASK STARVATION absorbed here as Phase 3, replacing standalone core-microtasks stop. " +
      "Run the ACTUAL infinite loop for 300ms with performance.now() kill switch — " +
      "not a simulation. The real freeze is safe at 300ms and far more visceral. " +
      "rAF removed from gauntlet (scenario 5) to avoid browser-dependent ordering. " +
      "Color code: sync (white), microtask (accent), macrotask (layer-0), render (layer-2). " +
      "5 prediction scenarios, NOT rAF-dependent.",
  },
};
