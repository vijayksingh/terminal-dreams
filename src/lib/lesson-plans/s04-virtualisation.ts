import type { LessonMeta } from "./types";

export const VIRTUALISATION: Record<string, LessonMeta> = {
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
        visual: "Viewport window highlighted. Only 15 items visible. PREDICTION GATE.",
        narrative: "But look at the viewport. The user can only SEE about 15 items at a time. The other 9,985 are invisible — expensive ghosts wasting layout and memory.",
        interaction: "Prediction: How many DOM nodes do we actually need to render? (a) All 10,000 (b) Only the 15 visible ones (c) About 25 — visible + a buffer. " +
          "WRONG-ANSWER FEEDBACK: (a) 'Rendering all 10,000 is the problem we're solving — 99.85% of them are invisible.' " +
          "(b) 'Close, but exactly 15 means zero buffer. Fast scroll would show blank space before new items mount.'",
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
        interaction: "Drag the scroll handle to control scroll speed. Watch items enter and exit as YOU scroll — the recycling is driven by your drag, not an auto-animation. DOM counter stays at 25 throughout.",
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
        action: "Drag viewport height from 400px to 100px, then to 800px",
        reaction: "At 100px: DOM count drops to 8 (fewer items visible). At 800px: DOM count rises to 45. FPS stays at 60 in both cases",
        teaches: "Virtualization cost scales with VIEWPORT SIZE, not list size — a smaller viewport renders fewer items. Mobile can virtualize even more aggressively",
      },
      {
        action: "Set total items to 50 and check performance",
        reaction: "FPS is 60 without virtualisation. DOM counter shows 50 (all rendered). Label: 'At 50 items, virtualisation adds complexity for zero benefit'",
        teaches: "Virtualisation is unnecessary below ~500 items — the DOM handles small lists fine. Know the threshold before reaching for the tool",
      },
    ],
    learningOutcome: "Understand the windowing technique: viewport + overscan + height spacer = constant DOM cost regardless of list size",
    agentNotes:
      "Scrollytelling building up from the 'problem' (10k nodes) to the 'solution' (25 nodes). " +
      "PREDICTION GATE at step 2: 'How many DOM nodes do we need?' before revealing the 25. " +
      "The FPS counter color-coding (red/yellow/green) is the primary metric. " +
      "Ghost outlines for virtualized items are important — they show that the ILLUSION of 10k " +
      "items exists even though only 25 are real. " +
      "After scrollytelling completes, reader gets full control to experiment with parameters. " +
      "WHEN NOT TO VIRTUALISE: at 50 items, show no benefit. Let the reader find the threshold " +
      "(~500 items) where virtualisation starts mattering. This teaches judgment, not just technique.",
  },

  "virt-fixed-vs-variable": {
    stopId: "virt-fixed-vs-variable",
    format: "battle",
    effort: "medium",
    proseTarget: [300, 500],
    scrollSteps: [
      {
        visual: "PREDICTION GATE before Jump to Index action. Both lists at position 0",
        narrative: "Both lists have 10,000 items. You're about to jump to index 7500. Which side will get there first?",
        interaction: "Prediction: Which list reaches index 7500 first? (a) Fixed height (b) Variable height — then click 'Jump to Index 7500' to verify. " +
          "WRONG-ANSWER FEEDBACK: (b) 'Variable height must SUM all preceding item heights to find the scroll offset — " +
          "7,500 additions vs one multiplication (7500 × 40). The position cache helps for reads, but jump-to-index " +
          "is where fixed height's O(1) advantage is most visible.'",
      },
    ],
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
      {
        action: "PREDICTION: 'Which side will reach index 7500 first?' → Click 'Jump to Index 7500'",
        reaction: "Fixed: instant scroll (7500 × 40 = 300000px). Variable: visible pause as it sums heights up to index 7500",
        teaches: "Jump-to-index is where fixed height's O(1) advantage is most visible — variable must sum all preceding heights",
      },
    ],
    learningOutcome: "Know the tradeoffs: fixed height is simpler and faster for offset calculation, but variable height handles real content",
    agentNotes:
      "Battle format. The getOffset animation is the teaching device — seeing O(1) multiply " +
      "vs O(log n) binary search makes the algorithmic difference tangible. " +
      "The position cache cascade on resize is the advanced insight most people miss. " +
      "PREDICTION GATE before Jump to Index: 'Which side will reach index 7500 first?' " +
      "Binary choice — reader commits before clicking. The prediction makes the pause on the " +
      "variable side feel earned (they predicted it or were surprised). " +
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
          "TIER 1 (MVP): Scroll-through code evolution with CodeEvolution diffs and live preview. " +
          "No user editing BUT with 3 PREDICTION GATES and 3 MICRO-INTERACTIONS embedded: " +
          "PREDICTION before step 2: 'Will adding a scroll container change FPS?' (No — FPS stays at 3). " +
          "PREDICTION before step 4: 'After rendering only visible items, what will FPS be?' " +
          "(This is the most important prediction in the section — the 3→58 jump is the core insight). " +
          "PREDICTION before step 6: 'Will switching to variable heights cost performance?' " +
          "(Yes, slight drop 60→55 — variable heights have real computational cost). " +
          "MICRO-INTERACTION at step 2: Toggle 'show spacer' checkbox — preview shows list " +
          "with and without spacer. Scrollbar size changes. Teaches WHY the spacer exists. " +
          "MICRO-INTERACTION at step 4: 'Replay' button shows before/after side-by-side — " +
          "left panel: 3fps render. Right panel: 58fps render. Same data, same scroll position. " +
          "MICRO-INTERACTION at step 7: Drag resize handle on one item in preview — watch " +
          "position cache update for all items below (reuses cascade animation from virt-fixed-vs-variable). " +
          "FPS counter shows simulated values per step. Shippable standalone. " +
          "PRODUCTION REALITIES sidebar at conclusion: " +
          "(1) Library decision tree (VISIBLE BY DEFAULT — most-wanted content): " +
          "react-window (fixed-height, smallest bundle), react-virtuoso (variable+auto-sizing, " +
          "batteries-included), @tanstack/virtual (headless/framework-agnostic, most flexible). " +
          "Decision flow: 'Fixed heights only? → react-window. Variable heights? → react-virtuoso. " +
          "Non-React or custom rendering? → @tanstack/virtual.' " +
          "(2) Gotchas (collapsible): scroll restoration (virtualised items don't exist in DOM), " +
          "focus loss on unmount, keyboard nav with roving tabindex. " +
          "(3) Virtualisation + data fetching (collapsible): sentinel item at end of visible range triggers fetch. " +
          "TIER 2 (stretch): Steps 3 and 4 become editable. Specific challenges: " +
          "'Change overscan from 5 to 0 — what happens?' and 'Change the visible range formula — " +
          "what breaks?' Scoped editing with targeted challenges, NOT freeform 8-step IDE.",
        reuses: [],
      },
    ],
    scrollSteps: [
      {
        visual: "Full naive list. FPS: 3. Code shows simple list.map(item => <div>{item}</div>)",
        narrative: "Start with the problem: rendering everything. 10,000 items, 3 frames per second.",
      },
      {
        visual: "PREDICTION GATE: 'Will adding a scroll container change FPS?'",
        narrative: "Create the illusion of a full list with a spacer element. Its height = totalItems × itemHeight. The scrollbar will behave correctly.",
        interaction: "Prediction: Will adding a scroll container and height spacer change FPS? (a) Yes, big improvement (b) Slight improvement (c) No change — FPS stays at 3. " +
          "WRONG-ANSWER FEEDBACK: (a) 'A scroll container wraps the existing list — all 10,000 items are still " +
          "in the DOM. The spacer sets the right scrollbar height, but rendering cost hasn't changed.' " +
          "(b) 'The spacer is a single invisible element — it adds no rendering cost, but removes none. " +
          "All 10,000 items are still there.' " +
          "After reveal: TOGGLE 'show spacer' — preview shows scrollbar with vs without spacer.",
      },
      {
        visual: "Range calculation code. startIndex/endIndex formulas highlighted",
        narrative: "From scrollTop and viewport height, calculate which items are visible: startIndex = Math.floor(scrollTop / itemHeight).",
      },
      {
        visual: "PREDICTION GATE: 'What will FPS be after rendering only visible items?'",
        narrative: "The breakthrough: slice the array to only visible items. FPS jumps from 3 to 58 in one line change. This is the core of virtualization.",
        interaction: "Prediction: After this one-line change (render only visible items), what will FPS be? (a) Still around 3 (b) About 30 (c) About 60 (d) No change. " +
          "WRONG-ANSWER FEEDBACK: (a) 'You just removed 9,975 DOM nodes — the browser's layout engine has almost " +
          "nothing to calculate now.' " +
          "(b) 'You underestimate the DOM savings. 25 nodes vs 10,000 is a 400× reduction in layout cost — " +
          "the jump is bigger than you think.' " +
          "(d) 'This IS the optimization. Removing invisible DOM nodes IS virtualization.' " +
          "After reveal: REPLAY button — side-by-side before (3fps) vs after (58fps), same data, same scroll position.",
      },
      {
        visual: "Overscan added. FPS: 60. No blank flashes during fast scroll",
        narrative: "Add a buffer of 5 items above and below the viewport. This prevents blank flashes during fast scrolling.",
        interaction: "MICRO-INTERACTION: Toggle overscan between 0, 2, 5, 10 items. At 0: fast scroll shows blank flashes. At 10: smooth but rendering 10 extra items. Find the sweet spot where flashes disappear without wasting renders.",
      },
      {
        visual: "PREDICTION GATE + variable heights. Position cache shown. Binary search for scroll offset",
        narrative: "Fixed heights are simple but unrealistic. For variable heights, maintain a position cache and use binary search to find the visible range.",
        interaction: "Prediction: Switching from fixed to variable heights — will FPS go (a) up (b) down (c) stay the same? " +
          "WRONG-ANSWER FEEDBACK: (a) 'Variable heights add a position cache lookup (binary search) on every scroll — " +
          "more computation per frame, not less.' " +
          "(c) 'The position cache binary search runs on every scroll event. It's fast (O(log n)), but not free — " +
          "60→55 FPS reflects the real cost.' " +
          "Answer: (b) down slightly (60→55). Variable heights have real computational cost.",
      },
      {
        visual: "ResizeObserver per rendered item. Measured heights update cache",
        narrative: "You can't know heights until items render. Use ResizeObserver to measure each rendered item and update the position cache dynamically.",
        interaction: "MICRO-INTERACTION: Drag resize handle on one item in preview — watch position cache cascade-update for all items below (same animation as virt-fixed-vs-variable).",
      },
      {
        visual: "translateY replaces padding-top. Scroll is silky smooth",
        narrative: "Final polish: use transform:translateY to position the visible window instead of padding-top. This avoids layout recalculation on every scroll event.",
        interaction: "MICRO-INTERACTION: Toggle between padding-top and translateY positioning in the preview. " +
          "With padding-top: Layout panel shows recalculation on every scroll frame. " +
          "With translateY: Layout panel is silent — only Composite fires. The DevTools difference is visible.",
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
      "THREE PREDICTION GATES (even in tier 1): before step 2 (spacer won't help FPS), " +
      "before step 4 (the 3→58 jump — MOST IMPORTANT prediction in S04), " +
      "before step 6 (variable heights cost performance). These require zero sandbox engineering — " +
      "just a prediction modal overlaid on the CodeEvolution scroll. " +
      "THREE MICRO-INTERACTIONS (tier 1): step 2 spacer toggle, step 4 replay (side-by-side " +
      "before/after), step 7 resize handle (reuses cascade animation from virt-fixed-vs-variable). " +
      "PRODUCTION REALITIES sidebar at conclusion: library decision tree, scroll restoration gotchas, " +
      "focus management, infinite-scroll sentinel pattern. Collapsible, not blocking. " +
      "Step 4 celebration animation on the big FPS jump. " +
      "TWO TIERS: Tier 1 (ship first) is scroll-through CodeEvolution with predictions + " +
      "micro-interactions + live preview. Tier 2 (stretch) makes steps 3-4 editable. " +
      "Full 8-step editable IDE is v2+ — do NOT attempt for initial build.",
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
          "A file browser tree (200+ nodes, expandable). STARTS WITH ONLY THE TREE VIEW. " +
          "Reader expands/collapses nodes and scrolls. After a few interactions, a prompt: " +
          "'This tree is virtualised — only visible nodes are rendered. But virtualisation " +
          "works on LISTS, not trees. How?' Reader commits a guess, then the FLATTENED ARRAY " +
          "view reveals on the right side. Now the reader sees the two views side by side. " +
          "When you expand a node, watch the flattened array INSERT child entries in real-time. " +
          "When you collapse, they REMOVE. The virtual window overlay shows which flat items render. " +
          "Discovery: the tree structure is an ILLUSION — it's a flat list with indentation. " +
          "GRID TAB: " +
          "A 1000×1000 spreadsheet-like grid. Viewport window overlaid on a minimap showing " +
          "which cells are actually rendered (colored) vs virtualized (grey). " +
          "Scroll both axes — see the rendered window move across the minimap. " +
          "PREDICTION CHALLENGE for grid: 'Scroll to cell R500C500. How many cells will be " +
          "rendered to get there?' Reader predicts, then scrolls and sees the answer. " +
          "WRONG-ANSWER FEEDBACK: if guess >1000: 'You're thinking about cells BETWEEN here and " +
          "R500C500. Virtualization only renders the viewport — the scroll just changes which 150 cells " +
          "are in view.' If guess <50: 'The viewport is wider than you think — 15 visible rows × 10 " +
          "visible columns = 150, plus overscan buffer.' " +
          "Counter: 'Rendering 150 of 1,000,000 cells'. " +
          "VIEWPORT RESIZE CONTROL: drag the viewport boundary handle to make the viewport " +
          "larger or smaller. As viewport grows, render count increases (the minimap rectangle " +
          "grows). As it shrinks, render count drops. Teaches that virtualisation cost is a " +
          "function of VIEWPORT SIZE, not grid size. " +
          "AXIS OVERSCAN: independent X and Y overscan sliders. Set X overscan to 0 — horizontal " +
          "scroll shows blank columns. Set Y overscan to 0 — vertical scroll shows blank rows. " +
          "Both visible simultaneously on the minimap as a thin colored border around the viewport.",
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
      {
        action: "Drag the viewport boundary handle to double the viewport size",
        reaction: "Render count doubles (150 → 300). Minimap rectangle grows proportionally. FPS dips slightly from the extra cells",
        teaches: "Virtualization cost is a function of VIEWPORT SIZE, not total grid size — a bigger viewport renders more cells regardless of grid dimensions",
      },
      {
        action: "Set X overscan to 0 and scroll horizontally",
        reaction: "Blank columns flash at the leading edge. Set Y overscan to 0 — blank rows flash vertically. Both visible simultaneously on the minimap as a thin border disappearing",
        teaches: "2D grids need overscan on BOTH axes independently — horizontal scroll and vertical scroll each need their own buffer",
      },
    ],
    learningOutcome: "Flatten hierarchical data for virtualization and extend windowing to 2D grids",
    agentNotes:
      "TREE TAB: Start with ONLY the tree view. Let the reader explore for 10-15 seconds. " +
      "Then prompt: 'How does this virtualised tree work? Trees aren't lists.' Reader guesses, " +
      "THEN the flat array view appears on the right. This converts a demonstration into a " +
      "genuine aha moment — the insight is DISCOVERED, not handed to them from the start. " +
      "GRID TAB: Prediction challenge ('how many cells rendered at R500C500?') gives the grid " +
      "tab a purpose beyond scrolling. Two additional controls make the grid tab pedagogically " +
      "rich: (1) VIEWPORT RESIZE HANDLE — drag to see render count change proportionally. " +
      "Minimap rectangle grows/shrinks. Teaches viewport-size-proportional cost. " +
      "(2) AXIS OVERSCAN SLIDERS — independent X and Y. Setting either to 0 shows blank " +
      "rows/columns on fast scroll. Both visible on the minimap as colored border changes. " +
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
          "PREDICTION GATE: 'At what item count will DOM FPS drop below 30?' Number input. " +
          "Reader guesses, then slides to verify. The crossover point becomes a discovery. " +
          "WRONG-ANSWER FEEDBACK: if guess <1000: 'DOM handles hundreds fine — layout cost is linear but fast " +
          "at low counts. The pain starts around 3,000-5,000 animated elements.' " +
          "If guess 1000-3000: 'Close — static elements survive longer, but these are ANIMATED. Each frame " +
          "recalculates position for every element. The threshold is lower than you'd think for animation.' " +
          "If guess 5000-20000: 'Good intuition — 5K is the ballpark. The exact threshold depends on what " +
          "each element does per frame (transforms are cheaper than layout-triggering properties).' " +
          "If guess >20000: 'DOM is slower than you think — each moving element triggers layout recalculation. " +
          "The threshold is typically 3,000-5,000 for animated elements, much lower than static ones.' " +
          "- At 100 items: both are 60fps — no difference " +
          "- At 5,000: DOM drops to 20fps, Canvas still 60fps " +
          "- Click to select: DOM handles it natively (event on element). Canvas requires " +
          "  manual hit testing — show the REAL CODE running: " +
          "  `for (let i = 0; i < circles.length; i++) { if (distance(click, circles[i]) < r) ... }` " +
          "  Highlight each iteration as the search progresses. At 5K items = microseconds (fast). " +
          "  At 50K+ items = perceptible delay (honest). Display comparison count, not fake delay. " +
          "- PROMPTED ACCESSIBILITY TEST: 'Try to select a circle using only your keyboard. " +
          "Press Tab, then Enter.' Canvas: nothing happens. DOM: focus ring, keyboard nav works. " +
          "- Try to select text overlaid on Canvas: impossible. DOM: works naturally " +
          "- HYBRID MODE TOGGLE: Switch between Canvas-only, DOM-only, and Hybrid " +
          "(Canvas shapes + DOM overlay for labels/tooltips). Each mode shows its own FPS and " +
          "accessibility score. Hybrid trades ~10% FPS for full accessibility. " +
          "CROSS-STOP SYNTHESIS CHALLENGE (after battle): 3 scenarios requiring the reader to " +
          "combine insights from ALL section stops: " +
          "(1) '50K data points in a scatter plot with tooltips on hover.' Choose: Canvas + DOM overlay (hybrid). " +
          "Why: Canvas for render perf (from this stop), DOM overlay for accessible tooltips. " +
          "(2) '10K-row table with variable-height rows and inline editing.' Choose: Virtual DOM list " +
          "with variable heights. Why: windowing (stop 1) + variable-height position cache (stop 2) + " +
          "DOM needed for form inputs (from this stop's accessibility discovery). " +
          "(3) 'File browser with 50K nodes, expandable folders, drag-to-rearrange.' Choose: " +
          "Flattened tree virtualization (stop 4). Why: tree → flat array (stop 4), windowing (stop 1), " +
          "DOM for drag events and keyboard nav (this stop). " +
          "Each wrong choice shows WHY it fails — e.g., picking Canvas for inline editing → 'No native " +
          "form inputs in Canvas. Every keystroke needs manual implementation.'",
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
        action: "Click a circle on Canvas and watch the hit-test code execute",
        reaction: "Code highlights iterations: '5,000 comparisons in 0.02ms'. At 50K: '50,000 comparisons in 0.8ms' — real timing, not simulated",
        teaches: "Canvas has no built-in event system — every click requires O(n) manual hit testing. Show real iteration count and real microsecond timing",
      },
      {
        action: "Try to tab-navigate or screen-read the Canvas version",
        reaction: "Nothing happens — Canvas is a black box to assistive technology. DOM version is fully accessible",
        teaches: "Canvas sacrifices the accessibility tree — if your content needs to be accessible, DOM or a hybrid approach is required",
      },
    ],
    learningOutcome: "Choose Canvas for rendering performance, DOM for accessibility/interactivity, or hybrid for both",
    agentNotes:
      "Battle format. PREDICTION GATE: 'At what item count will DOM FPS drop below 30?' " +
      "Number input (not MCQ). Reader guesses, then slides the slider to verify. " +
      "The crossover point becomes a discovery, not a fact they're told. " +
      "Show a real-time graph of FPS as item count increases — the lines diverge at a visible threshold. " +
      "HONEST HIT-TESTING: show actual iteration code highlighting. " +
      "Display REAL timing in microseconds and comparison count. " +
      "PROMPTED ACCESSIBILITY TEST: explicit instruction to try Tab/Enter on Canvas. " +
      "Most readers won't spontaneously try keyboard nav — the prompt ensures the discovery happens. " +
      "HYBRID MODE TOGGLE: three modes (Canvas-only, DOM-only, Hybrid) each showing FPS + " +
      "accessibility score. Makes the tradeoff tangible, not just described. " +
      "CROSS-STOP SYNTHESIS CHALLENGE after the battle: 3 architectural scenarios requiring " +
      "the reader to combine insights from ALL section stops (windowing, fixed/variable, " +
      "build-along, tree/grid, canvas/DOM). Wrong choices show WHY they fail. This is the " +
      "section's only moment testing combined knowledge — fills the biggest remaining gap. " +
      "The hybrid approach is the pragmatic takeaway for real-world apps.",
  },
};
