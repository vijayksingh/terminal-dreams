# React State Without the Re-renders

> A six-post series dissecting how state management libraries solve React's re-render problem. Each post cracks open a different library's source code, extracts a transferable technique, and teaches it through bespoke interactive widgets that make invisible runtime mechanisms visible.

**Status:** Expanded idea doc -- ready for implementation planning
**Created:** 2026-05-14
**Last updated:** 2026-05-15
**Tags:** React, State Management, Source Code Archaeology, Interactive Teaching, Performance
**Series slug:** `react-state-without-rerenders`

---

## Series Philosophy

This is not a "which library should I use" comparison guide. That genre is exhausted and ages within months. Instead, each post answers: **what did this library's authors see about React's rendering model that the rest of us missed?**

The series arc follows the shape of a discovery narrative:
1. Establish the pain (Post 1)
2. Four escape hatches, each revealing a different insight about React's internals (Posts 2-5)
3. Map the territory, synthesize, and look forward (Post 6)

Every widget exists to make an invisible mechanism visible. Re-render cascades, subscription graphs, proxy traps, structural sharing trees, atom dependency invalidation -- these are all runtime behaviors that developers reason about abstractly but never see. The interactives let readers SEE the runtime.

### Source Code Policy

Each technique post includes annotated excerpts from the actual library source. We show the real code (with link to the exact file and commit SHA), not a "simplified version." If the real code is 40 lines, we show 40 lines. If it is 200 lines, we extract the critical path and link to the rest. Annotations use the `CodeAnnotator` component from `src/mdx/shared/CodeAnnotator.tsx`. Every simplification is called out explicitly: `// simplified: real source also handles batching via queueMicrotask`.

---

## Series Overview

| Post | Title | Library | Core Technique | Transferable Insight |
|------|-------|---------|---------------|---------------------|
| 1 | The Re-render Tax | -- | The problem itself | React's rendering model has a specific cost structure. Understanding that structure changes how you design state. |
| 2 | The External Store Escape Hatch | Zustand | `useSyncExternalStore` + selectors | You can opt out of React's tree-based update propagation entirely by moving state outside the tree. The core is ~40 lines. |
| 3 | Atoms All the Way Down | Jotai | Atomic dependency graphs | Bottom-up subscription graphs can replace top-down reconciliation for state-driven updates. No selectors needed -- each atom IS the selection. |
| 4 | Signals Meet React | Legend State | Proxy-based fine-grained tracking | JavaScript Proxies can track property access at arbitrary depth, enabling O(1) subscription granularity without selectors or atoms. |
| 5 | Mutable Outside, Immutable Inside | Valtio | Proxy snapshots + structural sharing | You can give developers mutable ergonomics while maintaining immutable guarantees through copy-on-write snapshots. |
| 6 | Choosing Your Re-render Strategy | -- | Synthesis | The four approaches map to a 2x2 of store topology (centralized vs. distributed) and tracking mechanism (selector vs. proxy vs. graph). |

### Reading Map for the Impatient

- "Just need to choose a library?" -- Post 1 (15 min) + Post 6 Decision Tree (5 min).
- "Want to understand one library deeply?" -- Post 1 + the relevant technique post (2-5).
- "Want the full journey?" -- All 6, in order.
- Posts 2-5 are designed to be independently readable. Each re-establishes enough context from Post 1.

### Series Dependencies

- Post 3 (Jotai) explicitly contrasts with Post 2 (Zustand)'s selector model.
- Post 4 (Legend State) and Post 5 (Valtio) both use proxies but for different purposes -- cross-referencing is essential. Legend State uses proxies for subscription tracking (which components re-render). Valtio uses proxies for mutation detection AND snapshot creation. These are different goals with different implementations.
- Post 6 assumes familiarity with all four approaches.

---

## Shared Primitives

Before designing per-post widgets, identify reusable pieces that appear across multiple posts. These become components in a new `src/mdx/shared/state-series/` directory.

### 1. RenderFlashEffect

**Used in:** Posts 1, 2, 3, 4, 6

A composable animation wrapper that applies a "re-render flash" to any child element. This is the single most important visual in the series -- it must feel identical in every context.

```tsx
interface RenderFlashProps {
  type: 'legitimate' | 'wasted' | 'skipped';
  trigger: number;  // increment to trigger a flash
  children: React.ReactNode;
}
```

**Visual spec:**
- Legitimate render: `var(--diagram-layer-0)` (blue) glow, 0 to 8px to 0 box-shadow spread over `SPRING.gentle` (stiffness 300, damping 20).
- Wasted render: `var(--color-error)` (red) glow, same spring physics but slightly longer hold at peak (add 50ms delay before decay starts).
- Skipped: a small green checkmark icon fades in at `DURATION.fast` (0.2s) with `EASE.out`, holds for 0.4s, fades out.
- The flash should be clearly visible but not jarring. Think "notification badge appeared" not "error alert."
- Reduced motion: glow applies as an instant background-color change (no spring animation, no spread). Checkmark appears instantly.

### 2. ComponentTreeRenderer

**Used in:** Posts 1, 2, 3, 4

A generic React component tree visualizer. Renders a tree of labeled nodes connected by edges. Each node has:
- A label (component name)
- A render counter badge
- A state indicator (what it subscribes to)
- A visual state: idle, rendering, wasted, skipped (driven by RenderFlashEffect)

```tsx
type TreeNode = {
  id: string;
  label: string;
  children?: TreeNode[];
  subscribesTo?: string[];  // which store fields/atoms this component reads
};

type NodeVisualState = 'idle' | 'rendering' | 'wasted' | 'skipped';

interface ComponentTreeRendererProps {
  tree: TreeNode;
  nodeStates: Record<string, NodeVisualState>;
  renderCounts: Record<string, number>;
  onNodeClick?: (nodeId: string) => void;
  highlightSubscriptions?: boolean;
  compact?: boolean;   // flat layout (no nesting) for store subscriber views
}
```

**Layout:** Standard top-down tree layout. Nodes are rounded rectangles with `var(--panel-bg)` background, `var(--panel-border)` border, `var(--panel-radius)` corners. Edges are straight lines with slight curves at corners. Auto-sizes to fit container.

**Animations:**
- Render counter: Digits roll upward like a slot machine. Old digit exits upward, new digit enters from below. `SPRING.snappy` (stiffness 280, damping 22).
- Edge pulse: A small dot (r=3, `var(--color-accent)`) travels along the edge from parent to child when data flows. `DURATION.normal` (0.3s).
- Reduced motion: counter updates without roll animation, edge pulse replaced by static highlight.

### 3. StoreObjectViewer

**Used in:** Posts 2, 4, 5

An interactive JSON-like object viewer showing a state store's contents. Supports nested objects. Fields can be highlighted, edited inline, and annotated.

```tsx
interface StoreObjectViewerProps {
  state: Record<string, unknown>;
  highlightPaths?: string[];
  editablePaths?: string[];
  onValueChange?: (path: string, newValue: unknown) => void;
  annotations?: Record<string, string>;
  showReferences?: boolean;  // for structural sharing (Post 5)
}
```

**Visual:** Monospace font (`var(--font-mono)`), syntax-colored. Nesting shown with indentation. Highlighted paths get a left-border accent in `var(--color-accent)`. Editable fields show a subtle underline on hover. Value changes animate with a typewriter effect at `DURATION.fast`.

### 4. SubscriptionLineAnimator

**Used in:** Posts 2, 3, 4

Draws animated connection lines between a store/atom and subscribing components. SVG paths (quadratic bezier for gentle curves).

```tsx
interface SubscriptionLineProps {
  from: { ref: RefObject<HTMLElement>; label: string };
  to: { ref: RefObject<HTMLElement>; label: string };
  active: boolean;
  pulseDirection?: 'forward' | 'backward';
}
```

- Active lines: `var(--color-accent)`. Inactive: `var(--color-border)`.
- Data pulse: a small circle (r=3) traveling along the path over `DURATION.normal`.
- Transitions between active/inactive: `TRANSITION.crossfade`.
- Reduced motion: line highlights instantly, no traveling dot.

### 5. SideBySideComparison

**Used in:** Posts 1, 3, 4, 6

A generic split-view container. Supports 2 or 3 columns. Shared trigger button centered above. Responsive: stacks on mobile (breakpoint 768px).

```tsx
interface SideBySideProps {
  columns: Array<{ label: string; content: React.ReactNode }>;
  triggerLabel?: string;
  onTrigger?: () => void;
}
```

**Layout:** Panels with `var(--panel-bg)` background, `var(--panel-border)` border, `var(--panel-radius)` corners. Label badge at the top of each panel.

### 6. RenderCountDashboard

**Used in:** Posts 1, 2, 3, 4, 6

A compact scoreboard showing total render counts. Horizontal bar chart. Each bar segmented: blue for legitimate renders, red for wasted. Numbers at end of each bar. Bars animate with `SPRING.snappy`. Wasted segment uses `var(--color-error)` at 60% opacity.

```tsx
interface RenderCountDashboardProps {
  approaches: Array<{
    label: string;
    totalRenders: number;
    wastedRenders: number;
  }>;
}
```

### 7. CodeStepper

**Used in:** Posts 2, 4, 5

A step-through code viewer with synchronized state visualization. Left panel: syntax-highlighted code with line highlighting. Right panel: live visualization of internal state. "Step Forward" / "Step Back" / "Play All" controls.

```tsx
interface CodeStepperProps {
  sourceCode: string;
  language: string;
  steps: Array<{
    id: string;
    label: string;
    highlightLines: [number, number]; // start, end
    stateSnapshot: Record<string, unknown>;
    description: string;
  }>;
  autoPlaySpeed?: number | null;
}
```

**Animations:**
- Code line highlight: background slides in from left with `TRANSITION.enterItem`. Active lines get `var(--color-accent)` at 10% opacity.
- State changes: old value fades out (0.15s), new value fades in from below (0.15s).
- Step transition: highlighted band slides smoothly between line positions with `SPRING.snappy`.
- Reduced motion: highlight jumps between steps, state values swap instantly.

---

## Design Token Additions

Add to `src/styles/tokens.css` for series-wide color consistency:

```css
/* State series tokens */
--color-render-legitimate: var(--diagram-layer-0);  /* blue */
--color-render-wasted: var(--color-error);           /* red */
--color-render-skipped: var(--color-success);         /* green */
--color-store-mutable: var(--diagram-layer-3);        /* orange/warm */
--color-store-immutable: var(--diagram-layer-0);      /* blue/cool */
--color-reference-reused: var(--color-success);       /* green */
--color-reference-new: var(--diagram-layer-3);        /* orange */
```

---

## Animation Consistency Table

All widgets in the series use this canonical animation vocabulary:

| Event | Animation | Timing | Color |
|-------|-----------|--------|-------|
| Component re-renders (legitimate) | Box-shadow glow pulse | `SPRING.gentle` | `var(--color-render-legitimate)` at 20% |
| Component re-renders (wasted) | Box-shadow glow pulse, longer hold | `SPRING.gentle` + 50ms hold | `var(--color-render-wasted)` at 20% |
| Component skipped | Checkmark icon fade-in | `DURATION.fast` (0.2s) | `var(--color-render-skipped)` |
| Value changed | Fade out/in + 4px vertical slide | `DURATION.fast` | `var(--color-warning)` flash |
| Edge/subscription data flow | Traveling dot along SVG path | `DURATION.normal` (0.3s) | `var(--color-accent)` |
| New element entrance | scale 0.95->1.0 + opacity 0->1 | `SPRING.gentle` | Inherits parent |
| Render counter increment | Scale 1.0->1.1->1.0 | `SPRING.quick` | Inherits parent |
| Code line highlight | Left-border + background tint | `TRANSITION.enterItem` (0.2s) | `var(--color-accent)` at 10% |
| Panel/view cross-fade | Opacity swap | `TRANSITION.crossfade` (0.15s) | -- |
| Tooltip/annotation entrance | Slide up + opacity | `TRANSITION.enterCard` (0.3s) | -- |
| List item stagger | Delay between siblings | `STAGGER.fast` (0.06s) | -- |
| Cascade through tree levels | Staggered flash | 0.08s per depth level | -- |

### Reduced Motion Contract

Every widget respects `usePrefersReducedMotion()`. The contract:
- Glow pulses become instant background-color changes (no spring, no spread).
- Traveling dots become instant full-line highlights.
- Code step transitions become instant swaps (no slide).
- Value changes are immediate (no counting animation, no slide).
- Counters still increment (data, not decoration).
- Expand/collapse panels apply instantly with no height transition.

---

## Post 1: The Re-render Tax

### Thesis

React's rendering model is not broken -- it makes a deliberate tradeoff. It re-renders top-down because that model is simple, predictable, and correct. But simplicity has a cost, and that cost scales non-linearly with component tree depth and interaction frequency. Before reaching for any library, you need to understand exactly where the cost comes from and why React's built-in escape hatches (`memo`, `useMemo`, `useCallback`) are structural band-aids that shift cognitive load rather than eliminating it.

### Narrative Arc

This post has one job: make the reader FEEL the re-render problem before we solve it. No library code. No solutions. Just the problem, made visceral through interactive components that let the reader trigger unnecessary re-renders and watch the cost accumulate.

By the end, the reader should be slightly uncomfortable -- they should understand that Context API "works" the same way a garden hose "works" for firefighting. It delivers water. It does not solve the problem at scale.

### Content Outline

1. **React's rendering contract** -- `setState` triggers reconciliation from the component downward. This is a feature, not a bug. It makes React predictable. But predictability has a cost. Walk through the three phases: render (your function runs), reconcile (React diffs old vs. new VDOM), commit (React applies DOM mutations).

2. **What a re-render actually costs** -- Not just "the component function runs again." Also: closures re-created, effects re-evaluated for dependency changes, child props compared, context consumers checked. Each cost is tiny in isolation. They compound multiplicatively.

3. **Context API: the sledgehammer** -- Provider value changes, ALL consumers re-render, regardless of which part of the value they use. Walk through why: context uses `Object.is()` on the value object. `{ ...old, theme: 'light' }` is a new object. All consumers notified. This is specified behavior, not a bug. Show the abandoned `changedBits` RFC -- React considered and rejected selector-based context.

4. **The 16ms frame budget** -- One component re-rendering in 0.1ms is invisible. 100 components at 10 state changes per second is 100ms/frame -- six frames of jank at 60fps. Show the math. Show the tipping point.

5. **Why memo/useMemo/useCallback are band-aids** -- They don't reduce renders, they reduce render WORK. `React.memo` still needs to compare props. `useMemo` avoids recomputing inside a render that still happened. These are defensive measures that spread cognitive load across the codebase. Every component becomes a performance decision.

6. **The four escape hatches preview** -- Brief preview of the four approaches (external stores, atomic graphs, proxy tracking, proxy snapshots). Just enough to set up the series arc.

### Source Code Excerpts to Annotate

- React's context propagation: the `Object.is` check in `useContext` subscriber notification (~5 lines, from react-reconciler)
- A simplified fiber traversal loop showing the top-down walk (~10 lines)

---

### Widget 1: Re-render Cascade Visualizer

**What it shows:** A component tree of 15 nodes across 4 levels, representing a realistic small app: `App` -> [`Header`, `Main`, `Sidebar`] -> [`NavBar`, `Content`, `UserPanel`] -> [`SearchBox`, `ArticleList`, `NotificationBell`, `Avatar`, `ThemeToggle`]. Some branches go deeper than others (realistic, not perfectly balanced). State lives at the `App` level in a Context provider holding `{ theme: 'dark', user: { name: 'Alice' }, notifications: 3 }`. Each node is rendered using `ComponentTreeRenderer` with a render counter badge.

**Layout:** Full-width, ~400px tall. Tree centered. Below the tree: a `RenderCountDashboard`. Above the tree: mode switcher (tabs) and trigger buttons.

**How it works, step by step:**

1. **Context API mode (default):** Reader clicks "Change Theme." The context value object gets a new reference. React propagates the change to ALL context consumers. Every node in the tree flashes red -- even `NotificationBell` which only reads `notifications`. The dashboard increments ALL consumer counts. The cascade flows top-down with `STAGGER.fast` (0.08s per level) so the reader sees the wave of red descending through the tree.

2. **Split Contexts mode:** Reader clicks a tab. The single context visually splits into `ThemeContext`, `UserContext`, `NotificationsContext`. Now "Change Theme" only flashes nodes consuming `ThemeContext` (Header, NavBar, ThemeToggle). Dashboard shows dramatically fewer renders. But a callout note appears: "You now have 3 Providers, 3 `useContext` calls, and the responsibility to decide what goes in which context. This works for 3 fields. What about 30?"

3. **Zustand mode:** State moves outside the tree. Only nodes with explicit selectors flash on theme change. Dashboard shows the lowest count. This previews Post 2 without explaining the mechanism.

4. **Reader can click any node** to toggle its subscription status (subscribes/doesn't subscribe to a field). This lets them experiment: "What happens if I make Sidebar subscribe to notifications too?" The dashboard updates in real-time.

5. **After 10+ interactions**, the dashboard tells the cumulative story: Context API might show 80+ renders, Split Contexts 30, Zustand 15. The numbers make the argument.

**Animation choreography:**
- Mode switch: tree nodes crossfade between subscription configurations, `TRANSITION.crossfade` (0.15s).
- State change trigger: a pulse emanates from the "State" indicator at root, travels down edges (staggered 0.08s per level). Nodes that re-render flash with `RenderFlashEffect` type='wasted' (red) or type='legitimate' (blue). Nodes that skip get the green checkmark.
- Render count increment: slot-machine digit roll, `SPRING.snappy`.
- First "Split Contexts" click: the single context provider at the top visually splits into three cards with `SPRING.gentle`, each sliding to bracket its consumers.
- Reduced motion: flashes become instant color changes, digit rolls become instant updates, no edge travel animation, no splitting animation.

**Why interactivity is essential (not decorative):** Static diagrams can show "these 8 nodes re-render" but cannot show ACCUMULATION. The core insight is that the cost is per-interaction times app-lifetime. After the reader has clicked 15 times across modes, the dashboard numbers diverge so dramatically that the argument makes itself. You cannot convey cumulative cost in a static image. The mode toggle creates a direct A/B comparison that prose can describe but cannot make the reader feel.

**Simplest version that still teaches:** A tree with 8 nodes (3 levels), only Context vs. Zustand modes (no Split Contexts), no subscription editing. The cascade flash and accumulating counter carry the lesson. Split Contexts and subscription editing are "level 2" enhancements.

**Component API:**

```tsx
interface RerenderCascadeProps {
  modes: Array<{
    id: 'context' | 'split-context' | 'zustand';
    label: string;
    tree: TreeNode;
    subscriptionMap: Record<string, string[]>;
  }>;
  stateFields: Array<{
    key: string;
    label: string;
    affectsAll?: boolean;
  }>;
  showDashboard?: boolean;
  allowSubscriptionEditing?: boolean;
}
```

---

### Widget 2: Frame Budget Pressure Gauge

**What it shows:** A horizontal gauge representing the 16.67ms frame budget. Four colored segments stacked left-to-right: Render (purple, `var(--diagram-layer-2)`), Reconcile (blue, `var(--diagram-layer-0)`), Commit (teal, `var(--diagram-layer-1)`), Paint (green, `var(--color-success)`). A vertical red line marks the 16.67ms deadline. A dashed line marks 8ms (the "comfortable" zone, leaving room for browser work).

Below: a slider "Component count" (10 to 5,000) and a toggle "With React.memo / Without."

**How it works:**

1. Reader adjusts the slider. Segments grow proportionally. At low counts (10-50), everything fits before the 8ms line. Gauge area has a green tint: "smooth."

2. Sliding toward 500+: segments push past the 8ms comfort line. Area between 8ms and 16.67ms turns yellow: "budget pressure."

3. Past ~1,500 (without memo): total bar pushes past 16.67ms. Gauge turns red. "DROPPED FRAME" indicator appears with a jank-simulating horizontal shake (3px, 3 cycles, single-shot `LOOP.wobble`). A small FPS counter drops from 60 to 45, 30, etc.

4. Toggling "With React.memo" reduces the Reconcile segment (fewer children to diff) but does NOT reduce the Render segment (parent still renders). The reader sees memo helps but does not eliminate the cost.

5. Hovering any segment shows a tooltip: Render = "Your function component runs. JSX evaluated. Hooks execute." Reconcile = "React diffs old vs. new virtual DOM." Commit = "React applies DOM mutations." Paint = "Browser composites and paints."

**Animation choreography:**
- Slider drag: segments resize in real-time with no transition (immediate -- the point is direct manipulation, not transition beauty).
- Crossing 16.67ms: gauge shakes horizontally (`LOOP.wobble` played once). "DROPPED FRAME" fades in with `TRANSITION.enterCard`. Border transitions from `var(--color-success)` to `var(--color-error)` over `DURATION.normal`.
- Toggling memo: Reconcile segment shrinks with `SPRING.snappy`, other segments hold.
- Segment hover: tooltip fades in with `TRANSITION.crossfade`. Hovered segment brightens (opacity 1.0 vs. 0.85 default).
- Reduced motion: no shake on threshold crossing, immediate segment resizes, tooltip appears without fade.

**Why interactivity is essential:** "Re-renders are expensive" is vague. This widget gives the reader a physical intuition for the cost curve. They find their own tipping point by dragging a slider. The moment the gauge turns red and shakes, they FEEL the frame drop. That somatic memory persists longer than any paragraph.

**Simplest version that still teaches:** Slider + gauge, no memo toggle, no phase tooltips. The slider-to-red-zone mapping is the core lesson.

**Component API:**

```tsx
interface FrameBudgetGaugeProps {
  minComponents?: number;   // default 10
  maxComponents?: number;   // default 5000
  costModel?: {
    renderPerComponent: number;      // default 0.005ms
    reconcilePerComponent: number;   // default 0.008ms
    commitPerComponent: number;      // default 0.002ms
    paintFixed: number;              // default 1.5ms
  };
  showMemoToggle?: boolean;
  memoSavingsFactor?: number;  // default 0.6
}
```

---

### Widget 3: Context API Anatomy

**What it shows:** A miniature running app with a visible "internals" overlay. Three visual components: ThemeBadge (shows "dark"/"light"), UserGreeting (shows "Hello, Alice"), NotificationCount (shows "3 notifications"). Above them: a Context Provider card showing the value object `{ theme: 'dark', user: { name: 'Alice' }, notifications: 3 }`.

**How it works:**

1. Three trigger buttons: "Change Theme", "Update User", "Add Notification."

2. **The trap:** Reader clicks "Change Theme." Expectation: only ThemeBadge updates. Reality: ALL THREE components flash red. The Provider card shows dotted-line arrows to each consumer labeled "new reference -> re-render." An explanation tooltip appears: "Context checks reference equality on the value object. `{ ...old, theme: 'light' }` is a new object. All consumers re-render."

3. **The reveal:** A "Why?" panel slides up from the bottom. Shows 2-3 lines from React's context propagation code, annotated with `CodeAnnotator`. Key line: context uses `Object.is()` on the value. New object = new reference = all consumers notified.

4. **The fix:** A "Split it" button appears. Clicking it animates the single Provider splitting into three separate providers (ThemeContext, UserContext, NotificationsContext), each wrapping only its consumer. Now triggers only flash the relevant consumer.

5. **The cost of the fix:** A note appears: "You now have 3 Providers, 3 contexts, and the responsibility to decide what goes where. This works for 3 fields. What about 30?" This sets up the motivation for Post 2.

**Animation choreography:**
- Trigger click: the changed field in the Provider card highlights yellow (`DURATION.fast`), then ALL consumer cards flash with `RenderFlashEffect` type='wasted' simultaneously.
- "Why?" panel: slides up from bottom with `SPRING.gentle`, code block fades in with `TRANSITION.enterCard` after `DELAY.short` (0.2s).
- "Split it" transition: original card border turns dashed (0.1s), card divides into three with `SPRING.gentle`, each slides above its consumer, connection lines redraw staggered 0.1s.
- After split: triggers only flash the relevant consumer. Others show green "skipped" checkmark.
- Reduced motion: no slide-up panel (appears instantly), no split animation (instant layout change), flashes become border-color changes.

**Why interactivity is essential:** The Context gotcha is something developers nod along to when reading but don't internalize until they see it. This widget creates a micro-moment of surprise: "Wait, I only changed theme, why did NotificationCount re-render?" That surprise is the teaching moment. A static diagram doesn't create surprise because the reader hasn't formed an expectation first.

**Simplest version that still teaches:** Three consumers, three trigger buttons, the red flash on all. No "Why?" panel, no "Split it." The surprise moment IS the lesson.

**Component API:**

```tsx
interface ContextAnatomyProps {
  initialValue: Record<string, unknown>;
  consumers: Array<{
    name: string;
    reads: string;
    display: (value: unknown) => string;
  }>;
  showSourceExplanation?: boolean;
  enableSplitFix?: boolean;
}
```

### Critical Questions -- Post 1

1. **Profiler flamegraph or simplified visualization?** Simplified. Real profiler flamegraphs are noisy and require DevTools knowledge. Our gauge and tree are pedagogically cleaner. But show one REAL flamegraph screenshot (static image) at the end of the post for credibility, captioned: "Here's what this looks like in React DevTools Profiler."

2. **Real component names or abstract?** Real-ish names (Header, Sidebar, NotificationBell, Avatar). Abstract names (A, B, C) save space but sacrifice the "this is my app" recognition.

3. **How deep on reconciliation?** One well-annotated code block from React source (the fiber traversal), 10-15 lines with CodeAnnotator. Not a full React internals post. Goal: "enough to understand the cost structure."

4. **Virtual DOM prerequisite?** No. One sentence inline: "React maintains a lightweight copy of the DOM and diffs changes." Readers who know more will nod; readers who don't get what they need.

5. **Is Widget 1 doing too much with three modes?** Consider shipping with only Context + Zustand modes initially. Split Contexts can be a separate "playground" toggle. Subscription editing is valuable but optional.

6. **Are we being fair to Context API?** Context is correct for slowly-changing, widely-consumed values like theme and locale. The problem appears for frequently-changing, selectively-consumed state. Widgets dramatize the worst case; prose must be honest about the common case.

---

## Post 2: Zustand -- The External Store Escape Hatch

### Thesis

Zustand's core insight is architectural, not algorithmic: if your state lives outside React's component tree, React's top-down re-render propagation simply does not apply. There is no Provider. There is no Context. Components subscribe directly to the store, and the store notifies only the subscribers whose selected slice actually changed. The entire mechanism rests on `useSyncExternalStore`, a React 18 primitive that most developers have never used directly. The core is ~40 lines of JavaScript.

### Narrative Arc

Zustand is the gentlest departure from React's model. It does not fight React -- it sidesteps it. The store lives outside React's component tree as a module-scoped closure, and components subscribe via `useSyncExternalStore`. This post walks through Zustand's source code (remarkably small, ~400 lines for the core) and shows how each piece solves a specific problem from Post 1.

### Content Outline

1. **The 40-line core** -- Walk through `createStore` line by line. A closure holding a `state` variable, a `Set<Listener>` for subscribers, `setState` that shallow-merges and notifies, `getState` that returns current state. That's it. The sophistication is in how React consumes it.

2. **No Provider needed** -- The store is a module-scoped singleton. `import { useStore } from './store'` works from anywhere. No wrapping, no nesting, no prop drilling. Contrast with Context, which requires a Provider in the tree.

3. **`useSyncExternalStore` deep dive** -- The React 18 primitive that makes external stores safe. Without it, concurrent rendering can cause "tearing" (two components reading different versions of the same store during a single render pass). Walk through the three arguments: `subscribe`, `getSnapshot`, `getServerSnapshot`. Show Zustand's hook implementation.

4. **Selector-based subscriptions** -- `useStore(state => state.count)` means "only re-render me when `state.count` changes." The selector runs on every store update, result compared with `Object.is`. Equal = no notification. Show what happens with object selectors and why `shallow` equality exists.

5. **Middleware composition** -- `persist`, `devtools`, `immer`. Higher-order functions wrapping `createStore`. `persist` wraps `setState` to write to localStorage. They compose because they share the same signature: `(storeCreator) => storeCreator`. Show: `create(devtools(persist(immer(storeCreator))))`.

6. **When Zustand is the wrong choice** -- Derived state requires manual selectors (no automatic dependency tracking). Deeply nested state requires careful selector writing. If you need fine-grained reactivity at the property level, the selector model is too coarse. Set up Post 3 and Post 4.

### Source Code Excerpts to Annotate

- `vanilla.ts`: `createStore` function (~40 lines)
- `react.ts`: `useStore` hook (wraps `useSyncExternalStore` with selector)
- `middleware/persist.ts`: core logic of the persist middleware (~30 lines)

---

### Widget 1: Store Subscription Map

**What it shows:** Two-panel layout. Left: a `StoreObjectViewer` showing the Zustand store:

```
{
  user: { name: "Alice", age: 30, role: "admin" },
  theme: "dark",
  notifications: [
    { id: 1, text: "Welcome!", read: false },
    { id: 2, text: "New feature", read: true }
  ],
  sidebarOpen: true
}
```

Right: four component cards (Header, UserProfile, NotificationBell, Sidebar) rendered using `ComponentTreeRenderer` in flat/compact mode (no tree nesting -- these are independent subscribers). Between panels: `SubscriptionLineAnimator` connecting each component to the specific store paths it selects.

**How it works:**

1. Reader clicks a store field on the left to change its value. Clicking `theme` toggles "dark" to "light."

2. Subscription lines from `theme` to its subscribers (only `Header`) pulse with a traveling dot. `Header` flashes blue (legitimate). Other components stay idle. Their lines stay gray.

3. Reader clicks `user.name` and changes it to "Bob." Line from `user` to `UserProfile` pulses. Teaching moment: `UserProfile`'s selector is `state => state.user`. Since `user` is a new object reference (even though only `name` changed), the component re-renders. Tooltip: "The selector returns the `user` object. New name means new object reference, so `Object.is` returns false."

4. Toggle: "Use shallow equality." Changes the comparator. Now the shallow check compares each field of the returned object individually. If only `name` changed, the component still re-renders (name DID change), but if nothing changed, the shallow check catches it.

5. Reader can drag a new component card from a "+ Add Subscriber" zone and draw a subscription line to any store field, choosing a selector from a dropdown. This lets them experiment: "What if two components subscribe to the same field?"

**Animation choreography:**
- Store field edit: value morphs via typewriter effect (`DURATION.fast`, monospace so layout doesn't shift).
- Subscription line pulse: 4px circle in `var(--color-accent)` travels along SVG path, `DURATION.normal` (0.3s), `EASE.out`.
- Component re-render: `RenderFlashEffect` type='legitimate', `SPRING.gentle`.
- Idle components: brief 50ms gray pulse (opacity 0.85 -> 0.7 -> 0.85) to emphasize "nothing happened."
- Equality check tooltip: fades in with `TRANSITION.enterCard`, positioned near subscription line midpoint.
- Add subscriber: new card springs in with `SPRING.gentle`. Line draws itself via SVG stroke-dashoffset, `DURATION.normal`.
- Reduced motion: no traveling dot (line highlights instantly), no typewriter (value swaps instantly), cards appear without spring.

**Why interactivity is essential:** Zustand's power is invisible -- components that DON'T re-render. You cannot show "nothing happened" in a static diagram. But in an interactive widget, the reader triggers a change and watches three of four components do absolutely nothing. The absence of action IS the lesson.

**Simplest version:** Four fixed subscribers, no drag-to-add, no shallow equality toggle. Click a field, see which components flash. That's enough.

**Component API:**

```tsx
interface StoreSubscriptionMapProps {
  storeState: Record<string, unknown>;
  subscribers: Array<{
    id: string;
    name: string;
    selector: string;                    // display: "state => state.theme"
    selectorPath: string;                // actual path: "theme"
    equalityFn?: 'reference' | 'shallow';
  }>;
  allowAddSubscriber?: boolean;
  showEqualityDetails?: boolean;
  editableFields?: string[];
}
```

---

### Widget 2: useSyncExternalStore Sequence Diagram

**What it shows:** A vertical sequence diagram with four swim lanes: "Your Code" (left), "Zustand Store" (center-left), "useSyncExternalStore" (center-right), "React" (right). Shows the full lifecycle of a store update.

**How it works:**

1. Widget starts paused at step 0. "Step Forward" advances one step. "Play All" auto-advances at 1.5s intervals.

2. **Step 1 -- Mutation:** "Your Code" lane: `store.setState({ count: 1 })`. Message arrow to "Zustand Store."

3. **Step 2 -- Notify:** Store updates internal state, calls every listener. Message arrows fan out to "useSyncExternalStore."

4. **Step 3 -- Selector check:** Two sub-paths appear:
   - **Path A (changed):** `Object.is(prev, next)` returns false. Arrow to "React" labeled "schedule re-render."
   - **Path B (same):** `Object.is(prev, next)` returns true. Arrow terminates with red X, "re-render skipped."

5. **Step 4 -- React renders:** Only Path A components enter React's render phase.

6. **Bonus -- Tearing demo:** Toggle "Show concurrent mode without useSyncExternalStore." Two components render simultaneously, one reading old state, one reading new. A "TORN UI" zigzag line appears between them. Then toggle back to show how `useSyncExternalStore` prevents this by synchronizing snapshot reads.

**Animation choreography:**
- Step advance: glowing horizontal band slides down with `SPRING.snappy`.
- Message arrows: draw left-to-right with stroke-dashoffset, `DURATION.normal`. Leading dot at drawing edge.
- Branch point: path splits vertically. Reader clicks to explore. Unchosen path dims to 30%.
- Tearing scenario: two boxes show different values, zigzag SVG path between them pulses red with `LOOP.pulse`.
- Reduced motion: no sliding marker (jumps), arrows appear fully drawn.

**Why interactivity is essential:** `useSyncExternalStore` is a three-argument function that developers cargo-cult. Stepping through builds a causal chain: mutation -> notification -> selector check -> conditional render. The tearing demo is especially powerful: a bug impossible to reproduce in dev mode but present in production concurrent rendering.

**Simplest version:** The 4-step sequence without the tearing toggle. Step-through alone teaches the mechanism.

**Component API:**

```tsx
interface SyncExternalStoreSequenceProps {
  steps: Array<{
    id: string;
    lane: 'userCode' | 'store' | 'sync' | 'react';
    label: string;
    description: string;
    branches?: Array<{
      condition: string;
      outcome: string;
      continuesTo?: string;
    }>;
  }>;
  showTearingDemo?: boolean;
  autoPlaySpeed?: number | null;
}
```

---

### Widget 3: Middleware Pipeline Builder

**What it shows:** A vertical pipeline of stacked cards. Default: `immer` (top) -> `devtools` (middle) -> `persist` (bottom) -> `core store` (base). Each card: middleware name, one-line description, small icon. A "state update" data packet enters from the top.

**How it works:**

1. Reader clicks "Trigger Update" with action `{ type: 'increment' }`.

2. Data packet descends. At each middleware:
   - **immer:** Packet enters as mutable draft. Card shows `draft.count++`. Exits as immutable next state.
   - **devtools:** Packet passes through. Side-arrow: action logged to a "DevTools" panel on the right.
   - **persist:** Packet passes through. Side-arrow: state written to a "localStorage" panel on the right.
   - **core store:** State updates. Listeners notified (arrows fan out to subscriber indicators).

3. Reader can reorder middleware by dragging cards. Reordering changes behavior: if `persist` above `immer`, persisted state is the pre-immer version (subtle bug). Warning badge appears.

4. Reader can toggle middleware on/off. Disabling `immer` means "mutable draft" step disappears.

5. Clicking a card expands to show 5-10 lines of annotated Zustand middleware source using `CodeAnnotator`.

**Animation choreography:**
- Packet descent: packet card moves down with `SPRING.gentle`, pausing 0.4s at each layer. Layer border highlights `var(--color-accent)`.
- Side effects: smaller packet detaches rightward to side panel, `DURATION.fast`.
- Toggle off: card fades to 40% opacity with `TRANSITION.crossfade`, slides partially out (translateX: -20px).
- Drag reorder: cards reorder with `SPRING.snappy`. Problem order: warning badge pulses with `LOOP.pulse`.
- Card expand: grows vertically with `TRANSITION.collapse` (0.3s, easeInOut).
- Reduced motion: packets jump between layers, no pause, cards reorder instantly.

**Why interactivity is essential:** Middleware composition is order-dependent, but most developers don't think about order because they copy-paste from docs. Dragging middleware into the "wrong" order and seeing the warning creates memorable understanding of why order matters. This concept is nearly impossible to convey in prose alone.

**Simplest version:** Three fixed middlewares, toggle on/off only (no drag reorder). Packet flows through. The pipeline visualization alone teaches composition.

**Component API:**

```tsx
interface MiddlewarePipelineProps {
  layers: Array<{
    id: string;
    name: string;
    description: string;
    icon?: string;
    transform?: (packet: unknown) => { result: unknown; sideEffect?: string };
    sourceCode?: { code: string; language: string; annotations: Annotation[] };
    enabled?: boolean;
  }>;
  allowReorder?: boolean;
  orderWarnings?: Array<{
    condition: (order: string[]) => boolean;
    message: string;
  }>;
}
```

### Critical Questions -- Post 2

1. **Show actual source vs. simplified?** Actual. Zustand's core is famously tiny. Showing the real 40 lines of `vanilla.ts` is a selling point: "This is everything. All of it." Use `CodeAnnotator` with annotations on every significant line.

2. **How deep on `useSyncExternalStore`?** Deep enough to explain tearing. The sequence diagram widget carries this. Key framing: `useSyncExternalStore` is not Zustand magic -- it's a React primitive. Zustand just uses it correctly.

3. **Is the middleware widget teaching Zustand or middleware-as-pattern?** Both, intentionally. The transferable technique is "higher-order function composition." The Zustand-specific detail is the `setState` wrapping convention.

4. **Redux comparison?** Mention once: "If you've used Redux, Zustand will feel familiar but dramatically simpler. We won't compare them directly." Then move on.

5. **Do Widget 1 and Widget 2 overlap?** No. Widget 1 shows the WHAT (which components re-render). Widget 2 shows the HOW (the internal mechanism). User-facing mental model vs. implementation mental model.

6. **Should we show the selector equality trap?** The most common Zustand footgun (selectors returning new object references, defeating `Object.is`). Address it in the shallow equality toggle of Widget 1 and in prose. A dedicated widget would be powerful but may push the post past three widgets. Consider a prose-only treatment with annotated code showing bad selector -> good selector -> `useShallow` fix.

---

## Post 3: Jotai -- Atoms All the Way Down

### Thesis

Jotai inverts React's state model. Instead of a single store that components reach into with selectors (top-down), Jotai has many small atoms that components subscribe to directly (bottom-up). Derived state is expressed as atoms that depend on other atoms, forming a dependency graph that Jotai traverses to determine exactly which atoms need recomputation and which components need re-rendering. There are no selectors because there is nothing to select FROM -- each atom IS the selection.

### Narrative Arc

The key conceptual leap: in Zustand, you define a big store and carve out slices. In Jotai, you define small atoms and compose them. The dependency graph IS the state architecture, and Jotai manages it automatically. Derived atoms compute. Dependent atoms recompute. Components that read changed atoms re-render. Everything else is silent.

### Content Outline

1. **The atom primitive** -- An atom is a unit of state with a read function and optional write function. Primitive atoms are values. Derived atoms compute from other atoms. Async atoms return promises. API surface: `atom()`, `useAtom()`, `useAtomValue()`, `useSetAtom()`.

2. **Bottom-up vs. top-down** -- Zustand: store knows everything, components select slices. Jotai: atoms know nothing about each other at creation time -- dependency graph discovered at runtime as atoms read other atoms. You never over-subscribe.

3. **The dependency graph** -- When a derived atom reads another atom via `get()`, Jotai records the dependency. When a primitive atom changes, Jotai walks the dependency graph upward to find derived atoms needing recomputation. Only atoms whose recomputed value actually CHANGED trigger component re-renders. Walk through `store.ts`: `mountedMap`, `dependenciesMap`, `readAtom`.

4. **Why no selectors?** -- Zustand needs selectors because the store is one big object. Jotai atoms ARE the parts. `useAtomValue(countAtom)` subscribes to `countAtom` and nothing else. No equality check needed.

5. **Async atoms and Suspense** -- Atom read function can return a promise. Suspense catches it. Data fetching, caching, loading states through the same atom abstraction.

6. **Jotai vs. Recoil** -- Same atomic model, different implementation. No string keys (atoms referenced by object identity), no `RecoilRoot` required in newer versions, simpler API, smaller bundle. Recoil introduced the concept; Jotai refined it.

### Source Code Excerpts to Annotate

- `vanilla.ts`: `atom()` factory function
- `store.ts`: `readAtom` -- dependency tracking and graph resolution
- `store.ts`: `writeAtom` -- how writes propagate through the graph
- `react.ts`: `useAtomValue` -- subscription mechanism

---

### Widget 1: Atom Dependency Graph Explorer

**What it shows:** A directed acyclic graph as an SVG node-link diagram. Three layers from bottom to top:

**Bottom (primitive atoms):** `countAtom` (value: 0), `nameAtom` (value: "Alice"), `multiplierAtom` (value: 2). Shown as filled circles with labels and editable values.

**Middle (derived atoms):** `doubledAtom` (depends on `countAtom` and `multiplierAtom`, computes `count * multiplier`), `greetingAtom` (depends on `nameAtom`, computes `"Hello, " + name`). Shown as circles with dashed borders and formula labels.

**Top (components):** `<Display>` reads `doubledAtom`, `<Greeting>` reads `greetingAtom`, `<Counter>` reads and writes `countAtom`. Small component badges attached to their atoms.

Edges flow upward (dependency direction).

**How it works:**

1. Reader clicks a primitive atom to change its value. Click `countAtom`, value increments 0 to 1.

2. **The invalidation wave:** Starting from `countAtom`:
   - `countAtom` flashes yellow (changed: 0 -> 1)
   - Edge from `countAtom` to `doubledAtom` pulses with traveling dot (stagger 0.06s per level)
   - `doubledAtom` recomputes (0 -> 2), flashes yellow, briefly shows formula evaluation: `1 * 2 = 2`
   - Edge from `doubledAtom` to `<Display>` pulses
   - `<Display>` flashes blue (re-renders)
   - `<Counter>` also flashes blue (reads `countAtom` directly)

3. **What DOESN'T happen:** `nameAtom`, `greetingAtom`, `multiplierAtom`, and `<Greeting>` do nothing. No pulse, no flash, no activity. The stillness is the point.

4. Reader clicks `nameAtom`. A different path lights up: `nameAtom` -> `greetingAtom` -> `<Greeting>`. The count branch stays dark.

5. **Build mode:** "Add Atom" button slides in a panel offering:
   - "Primitive atom" -- reader names it and gives it a value
   - "Derived atom" -- reader names it and draws dependency edges by clicking existing atoms
   - "Component" -- reader names it and connects to atoms it reads
   Reader constructs their own graph and triggers changes to see invalidation flow through it.

6. **Hover any atom:** Its entire dependency chain highlights (upward to dependents and downward to dependencies). Tooltip: "Depends on: [list]. Depended on by: [list]."

**Animation choreography:**
- Invalidation wave: nodes flash in sequence, staggered `STAGGER.fast` (0.06s) per graph level. Yellow for recomputed atoms, blue for re-rendered components via `RenderFlashEffect`.
- Edge pulse: dot travels along edge bottom-to-top, `DURATION.normal`. Edge color: `var(--color-border)` to `var(--color-accent)` as dot passes, then fades back.
- Value update: crossfade old to new value, `TRANSITION.crossfade`.
- Build mode panel: slides in from right with `SPRING.gentle`. New atoms pop into graph with `SPRING.snappy` (scale 0 to 1). New edges draw via stroke-dashoffset.
- Hover highlight: dependency chain at opacity 1.0, all others dim to 0.4, `DURATION.fast`.
- Short-circuit: if a derived atom recomputes but produces the SAME value (edge case), it glows blue instead of yellow, and propagation STOPS. A small "=" badge appears for 0.5s. This teaches Jotai's optimization.
- Reduced motion: no traveling dots, no stagger (all affected nodes highlight simultaneously), values update instantly.

**Why interactivity is essential:** The dependency graph is Jotai's core abstraction. Watching the invalidation wave travel through one branch while another stays dark builds the mental model instantly. Build mode lets readers construct their own graph topology and develop intuition for how graph shape affects update propagation. This transfers beyond Jotai to any reactive system.

**Simplest version:** 3 primitive atoms, 2 derived atoms, 3 components. No build mode. Click atoms, watch waves. That's enough.

**Component API:**

```tsx
interface AtomGraphExplorerProps {
  atoms: Array<{
    id: string;
    type: 'primitive' | 'derived';
    label: string;
    initialValue?: unknown;
    dependencies?: string[];
    computeDisplay?: string;
    compute?: (deps: Record<string, unknown>) => unknown;
  }>;
  consumers: Array<{
    id: string;
    name: string;
    reads: string[];
    writes?: string[];
  }>;
  enableBuildMode?: boolean;
  layout?: 'layered' | 'force';
}
```

---

### Widget 2: Top-Down vs. Bottom-Up Mental Model

**What it shows:** A `SideBySideComparison` with Zustand on the left and Jotai on the right. Both manage the same state: `{ count: 0, doubled: 0, label: "Count: 0" }`.

**Left (Zustand):** Single store box at top containing all three fields. Three components below with selector arrows pointing into the store. Selector labels: `s => s.count`, `s => s.doubled`, `s => s.label`.

**Right (Jotai):** Three atoms at bottom: `countAtom(0)`. Derived atom in middle: `doubledAtom (count * 2)`. Another derived: `labelAtom ("Count: " + count)`. Three components at top with direct subscription lines to their atoms.

**How it works:**

1. Shared "Increment Count" button triggers both sides simultaneously.

2. **Zustand side:** Store updates `count: 0 -> 1`. But `doubled` and `label` don't auto-update -- they're stored values. Note: "In Zustand, derived values must be computed in the updater or as selectors. The store doesn't track dependencies." All selectors flash orange ("selector fired"), then components whose selector returned different values re-render.

3. **Jotai side:** `countAtom` updates: 0 -> 1. Dependency graph fires: `doubledAtom` recomputes (0 -> 2), `labelAtom` recomputes ("Count: 0" -> "Count: 1"). Components subscribing to changed atoms re-render. The MECHANISM is different: Jotai automatically discovered which derived values needed updating.

4. "Add State Field" button adds new state to both sides. Zustand: store grows wider. Jotai: graph grows wider (more nodes at the same level). Visual density comparison emerges at 5+ fields.

5. Counters: "Selectors fired: 6/6" (Zustand) vs. "Atoms touched: 3/6" (Jotai).

**Animation choreography:**
- Simultaneous trigger: both animate at once. Shared button pulses `SPRING.quick`.
- Zustand: selector arrows flash orange briefly (0.15s, "running"), resolve to checkmark (changed) or X (same).
- Jotai: invalidation wave travels bottom-to-top through atom graph.
- "Add field": new elements spring in with `SPRING.gentle`. Zustand store box width animates wider. Jotai gets a new atom node with scale-up.
- Reduced motion: all instant, comparison works through static highlighting.

**Why interactivity is essential:** The structural difference between "centralized store with selectors" and "distributed atoms with dependency tracking" is abstract. Showing the same update propagating through both models simultaneously makes the difference undeniable. The "add field" interaction reveals scaling behavior.

**Simplest version:** Fixed state, shared trigger, no "add field." The simultaneous comparison is the lesson.

**Component API:**

```tsx
interface TopDownBottomUpProps {
  initialState: Record<string, unknown>;
  derivedState: Array<{
    key: string;
    dependsOn: string[];
    computeDisplay: string;
    compute: (deps: Record<string, unknown>) => unknown;
  }>;
  allowAddField?: boolean;
  scalingThreshold?: number;
}
```

---

### Widget 3: Async Atom Lifecycle

**What it shows:** Vertical timeline with three swim lanes: "Component" (left), "Atom" (center), "Network" (right). A Suspense boundary as a dashed rectangle around the component.

**How it works:**

1. "Mount Component" -> component appears, calls `useAtomValue(userAtom)`.

2. **Suspend:** Atom read returns a promise. React throws it (Suspense). Component disappears, replaced by loading spinner (fallback). Suspense boundary border glows.

3. **Fetch:** Request arrow travels Atom -> Network. Timer ticks: "200ms, 400ms..." Reader drags a "Latency" slider (100ms to 3000ms).

4. **Resolve:** Response arrow returns. Atom updates from `Promise<User>` to `User`. Fallback dissolves, component fades in with data.

5. **Cache:** "Refetch" click. If cached: instant, no Suspense activation, "CACHED" badge flashes. If not: Suspense cycle repeats.

6. **Error path:** Toggle "Simulate Error." Fetch rejects. Suspense boundary replaced by ErrorBoundary (red border, error message). "Retry" button.

**Animation choreography:**
- Component mount: card springs in with `SPRING.gentle`.
- Suspend: component fades to 0, fallback fades in, crossfade `DURATION.fast`. Boundary border: `var(--color-border)` to `var(--color-accent)`.
- Request/response: traveling dots along SVG paths, `DURATION.slow` for request, `DURATION.fast` for response.
- Timer: monospace counter ticking in real-time.
- Resolve: fallback dissolves with left-to-right opacity ripple, component scales 0.95 to 1.0 with `SPRING.gentle`.
- Cache hit: atom flashes green, "CACHED" badge pops with `SPRING.quick`, component updates instantly.
- Error: boundary border to `var(--color-error)`, error card slides in with `SPRING.snappy`.
- Reduced motion: all instant, no shimmer, no traveling dots.

**Why interactivity is essential:** Async state involves temporal sequences that prose describes but doesn't convey. Watching the component disappear behind a spinner, the request travel across lanes, and the component re-emerge with data is an experience. The latency slider builds intuition for when Suspense helps vs. hurts UX.

**Simplest version:** Mount, suspend, resolve. No cache, no error, no latency slider.

**Component API:**

```tsx
interface AsyncAtomLifecycleProps {
  fetchConfig: {
    label: string;
    responseShape: unknown;
    defaultLatencyMs: number;
  };
  showLatencyControl?: boolean;
  showErrorPath?: boolean;
  showCacheBehavior?: boolean;
  cacheTtlMs?: number;
}
```

### Critical Questions -- Post 3

1. **How much Recoil comparison?** One section, 3-4 paragraphs as historical context. "Recoil introduced the atomic model. Jotai learned and made different tradeoffs." String keys vs. object identity, RecoilRoot vs. none, API surface. Don't bash Recoil.

2. **Max atom count in graph widget?** Cap build mode at 8-10 atoms. Pre-built graph (3 primitive, 2 derived, 3 consumers) is the sweet spot.

3. **Show actual dependency graph source?** Yes, excerpted. `readAtom` in `store.ts` is the critical path. 20-30 lines with `CodeAnnotator`. Link to full file.

4. **Suspense prerequisite?** Teach the minimum inline: "Suspense is React's mechanism for handling async operations. When a component throws a promise, React replaces it with a fallback until the promise resolves." Two sentences. The widget teaches the rest visually.

5. **Is the Zustand-vs-Jotai widget too similar to Post 1's cascade visualizer?** Different focus. Post 1 shows re-render COUNT. Post 3 Widget 2 shows STRUCTURAL differences in how state is organized and how updates propagate. Same primitive, different data, different story.

---

## Post 4: Legend State -- Signals Meet React

### Thesis

Legend State brings signal-like fine-grained reactivity to React without requiring a compiler. It achieves this through JavaScript Proxies that track exactly which properties your component accesses during render. Not "this component uses the user object" but "this component accessed `state.user.name` at path depth 3." This granularity enables O(1) subscription updates: when a property changes, Legend State knows exactly which components read that specific property and notifies only them. No selector functions. No equality checks. No atoms. Just proxies observing your code.

### Narrative Arc

This post is about making the invisible visible. Proxy-based tracking is literally invisible in production code -- you write `state.user.name` and it "just works." The post's job is to show readers what happens beneath every property access: a `get` trap fires, a subscription is recorded, and a notification channel is established for precisely that path.

### Content Outline

1. **The proxy mechanism** -- JavaScript Proxy `get` traps intercept every property access. When your component renders and reads `state.user.name`, three `get` traps fire: one for `user`, one for `name` on the user proxy, one for the value of `name`. Legend State records each access in a tracking set. After render, the tracking set IS the subscription list.

2. **Structural tracking vs. selectors** -- Zustand: "Tell me what you need by writing a selector function." Legend State: "I'll figure out what you need by watching what you access." No selector to write, no equality function to choose, no `shallow` import.

3. **The observable tree** -- Legend State wraps your state in a tree of proxy objects. Each node has a `listeners` set. Access `state.user.name`: listener entries at each level. SET `state.user.name`: fires listeners only at the `name` level (and optionally parent listeners configured for child changes).

4. **O(1) property tracking** -- No selector to run, no object to diff. The proxy trap immediately knows the exact path. Set lookup for listeners is O(1). Compare with Zustand: run selector (O(selector complexity)), compare result (O(comparison)), schedule render (O(1)). For deeply nested state, Legend State wins asymptotically.

5. **The signal connection** -- Signals (SolidJS, Angular, Svelte 5, TC39 proposal) are a general reactive primitive. Legend State brings this to React without JSX compilation changes. Proxies at runtime do what SolidJS's compiler does at build time. Different mechanism, same goal, different tradeoffs (proxy overhead per access vs. build step).

6. **Tradeoffs** -- Proxy overhead on every access (negligible per access, measurable in tight loops). Debugging proxies is confusing (you see the Proxy wrapper, not the raw object). Serialization requires explicit unwrapping. TypeScript inference through proxies can be imperfect.

### Source Code Excerpts to Annotate

- `ObservableObject.ts`: The proxy handler with `get` and `set` traps
- `tracking.ts`: How tracking context records accessed properties during render
- `reactive.ts`: The `observer` HOC / `useObserve` hook

---

### Widget 1: Proxy Access Tracker

**What it shows:** Two-panel layout. Left: nested state object as expandable tree (like browser DevTools object inspector):

```
state = {
  user: {
    name: "Alice",
    age: 30,
    email: "alice@example.com",
    preferences: {
      theme: "dark",
      fontSize: 14
    }
  },
  todos: [
    { text: "Learn Legend State", done: false },
    { text: "Build widget", done: true }
  ],
  notifications: {
    count: 3,
    lastRead: "2024-01-15"
  }
}
```

Right: "Component Render" simulation. A component's render function as syntax-highlighted code (read-only). Below: a "Tracked Properties" list building up as the code "executes."

**How it works:**

1. Reader selects from a dropdown of example components:
   - **UserGreeting:** `return <h1>Hello, {state.user.name}</h1>`
   - **TodoCount:** `return <span>{state.todos.filter(t => !t.done).length} remaining</span>`
   - **ThemeProvider:** `return <div className={state.user.preferences.theme}>...</div>`
   - **FullDump:** `return <pre>{JSON.stringify(state)}</pre>`

2. "Render Component" simulates execution. Code highlights line by line. At each `state.x.y.z` access:
   - Left tree: access path illuminates segment by segment. `state.user.name`: first `state` highlights, then `user` (glow travels down branch), then `name`.
   - Right panel: new entry in "Tracked Properties" list: `state.user.name`.
   - Small "GET" badge flashes near the tree node.

3. After "render" completes, tracked list shows ALL accessed paths. "Legend State will re-render this component if and only if these specific properties change."

4. **The test:** Buttons let the reader change ANY property:
   - Change `state.user.name` -> Component re-renders (tracked property).
   - Change `state.user.age` -> Nothing. "NOT TRACKED" ghost text fades in on the `age` node. The component never accessed `age`.
   - Change `state.notifications.count` -> Nothing.

5. **The FullDump trap:** Selecting "FullDump" shows `JSON.stringify(state)` accesses EVERY property. The entire tree lights up. Tracked list fills with every path. Now changing ANY property triggers a re-render. Lesson: proxy tracking is only as precise as your access patterns. A single `JSON.stringify` destroys the precision.

**Animation choreography:**
- Code line highlight: background band moves down with `SPRING.snappy`, `STAGGER.fast` between lines.
- Tree path illumination: each segment highlights in sequence. Glowing dot travels from parent to child node, 0.1s per segment. Dot color: `var(--diagram-layer-0)`.
- Tracked property list entry: slides in from right with `SPRING.snappy`, subtle scale 0.95 -> 1.0.
- "GET" badge: pops up near tree node with `SPRING.quick`, holds 0.3s, fades out.
- Untracked property change: value changes, semi-transparent "NOT TRACKED" label fades in 0.2s, holds 1s, fades out 0.3s, `var(--color-muted)`.
- Tracked property change: tree node flashes, pulse travels up to "Component" which flashes with `RenderFlashEffect`.
- FullDump: all tree nodes illuminate with cascade wave (top-left to bottom-right, 0.02s per node). "Christmas tree" effect.
- Reduced motion: no traveling dots, no cascade (all at once), code highlighting is instant background color change.

**Why interactivity is essential:** Proxy tracking is literally invisible in production code. This widget makes the invisible mechanism visible. You SEE each property access trigger a trap, SEE the tracking set build up, and SEE that changing an untracked property does nothing. The "FullDump" example is a critical teaching moment impossible in a static diagram -- one line of code destroys the precision proxies provide.

**Simplest version:** Two examples (UserGreeting and FullDump), no dropdown. Pre-baked "render" results. Buttons to change tracked vs. untracked properties. The contrast between the two examples IS the lesson.

**Component API:**

```tsx
interface ProxyAccessTrackerProps {
  state: Record<string, unknown>;
  examples: Array<{
    id: string;
    name: string;
    code: string;
    accessPaths: string[];
    description?: string;
  }>;
  testableProperties: Array<{
    path: string;
    toggleValues: [unknown, unknown];
  }>;
}
```

---

### Widget 2: Granularity Spectrum

**What it shows:** Three-column `SideBySideComparison`: Context API (left), Zustand (center), Legend State (right). Same state shape. Same components. Same update trigger.

All three show 6 components: App, Header, UserName, UserAge, TodoList, NotificationBell.

State: `{ user: { name: "Alice", age: 30 }, todos: [...], notifications: 3 }`.

**How it works:**

1. Reader clicks "Change user.name to Bob."

2. **Context API:** ALL 5 consumers flash red. Render count: +5. Annotation: "Context doesn't know which field changed."

3. **Zustand:** `UserName` and `UserAge` re-render. Both selectors return `state.user`, which has new reference. UserAge didn't need to but does (selector too broad). Render count: +2. Annotation: "Selectors check at object level." A "Fix selector" button appears on UserAge. Clicking it narrows the selector to `s => s.user.age`. Now changing `user.name` doesn't re-render UserAge.

4. **Legend State:** Only `UserName` re-renders. It accessed `state.user.name`. UserAge accessed `state.user.age`. Tracked at leaf level. Render count: +1. Annotation: "Proxy tracking records exact path."

5. Cumulative counters below each column diverge after 20 interactions. Context: ~100. Zustand (broad selectors): ~40. Zustand (fixed): ~20. Legend State: ~20.

6. The insight: Zustand CAN match Legend State's granularity, but requires writing precise selectors for every component. Legend State achieves it automatically.

**Animation choreography:**
- Simultaneous trigger: horizontal wave left-to-right across columns, staggered 0.05s.
- `RenderFlashEffect` for each approach. Red for wasted, blue for legitimate.
- `RenderCountDashboard` at bottom, bars grow with `SPRING.snappy`.
- "Fix selector" button: appears with `SPRING.gentle` (scale 0 to 1). Clicking crossfades selector label.
- Annotation text: fades in below each column with `TRANSITION.enterCard`, `DELAY.short`.
- Reduced motion: no wave, flashes instant, counters update instantly.

**Why interactivity is essential:** The three-column comparison makes granularity difference undeniable. The "fix selector" interaction on Zustand is crucial: it shows Zustand CAN be precise, but it requires explicit work. Legend State's precision is automatic. A static table reduces this to "Legend State: fine-grained. Zustand: medium-grained" -- misleading because Zustand's granularity depends on selector quality.

**Simplest version:** Three columns, one trigger, no "fix selector." The render count difference alone teaches.

**Component API:**

```tsx
interface GranularitySpectrumProps {
  stateShape: Record<string, unknown>;
  components: Array<{
    id: string;
    name: string;
    context: { subscribesTo: 'all' };
    zustand: { selector: string; selectorPath: string; fixedSelector?: string; fixedSelectorPath?: string };
    legendState: { accessPaths: string[] };
  }>;
  mutations: Array<{
    label: string;
    path: string;
    newValue: unknown;
  }>;
}
```

---

### Widget 3: Proxy Trap Inspector

**What it shows:** Split view. Left: code editor (read-only, swappable) showing 6-8 lines of JavaScript reading and writing a Legend State observable. Right: "Proxy Runtime" panel showing every trap invocation as the code executes.

**Code example:**

```js
const state = observable({
  user: { name: "Alice", age: 30 }
});

// Reading
const name = state.user.name;

// Writing
state.user.name = "Bob";
```

**How it works:**

1. Reader clicks "Execute" or steps line by line with "Step."

2. **`const name = state.user.name;`** -- Three `get` traps fire in sequence:
   - Trap 1: `get(target=state, prop="user")` -> Returns proxy wrapping `{ name: "Alice", age: 30 }`
   - Trap 2: `get(target=user, prop="name")` -> Returns `"Alice"`, records access path
   Each trap appears as a card in the Runtime panel: target, property, return value, side effects.

3. **`state.user.name = "Bob";`** -- Two `get` traps (traversal), then one `set` trap:
   - `set(target=user, prop="name", value="Bob")` -> Updates value, fires listeners for path `user.name`
   - Set trap card shows: listeners notified (component names), previous value, new value.

4. **Show all listeners:** Toggle reveals full listener map. Each path -> Set of listeners. Labeled with component names.

5. **Advanced mode:** Editable text area for custom code:
   - `Object.keys(state)` -> `ownKeys` trap
   - `delete state.user.email` -> `deleteProperty` trap
   - `"name" in state.user` -> `has` trap

**Animation choreography:**
- Code line highlight: background band with `SPRING.snappy`.
- Trap card: slides in from right with `SPRING.snappy`, stacking vertically. Icon: eye for `get`, pencil for `set`. Each indented further for chain depth.
- Property access chain: three cards appear in rapid sequence (staggered 0.15s).
- Set trap notification: lines animate from card to listener labels, `DURATION.fast`.
- Advanced mode text area: `TRANSITION.collapse`.
- Reduced motion: cards appear instantly, no stagger, no line animations.

**Why interactivity is essential:** JavaScript Proxies are a language feature 90% of React developers have never used directly. Most understand them as "magic that makes things reactive." This widget strips the magic: every property access is a function call. Every assignment triggers a notification. Stepping through makes Proxies feel concrete and predictable. Advanced mode serves developers wanting edge case understanding.

**Simplest version:** Pre-baked read and write operations (no step-through, no advanced mode). Click "Read" -> see GET traps. Click "Write" -> see SET trap + listener notification.

**Component API:**

```tsx
interface ProxyTrapInspectorProps {
  initialState: Record<string, unknown>;
  examples: Array<{
    label: string;
    code: string;
    traps: Array<{
      type: 'get' | 'set' | 'has' | 'ownKeys' | 'deleteProperty';
      target: string;
      property: string;
      value?: unknown;
      returnValue?: unknown;
      sideEffects?: string[];
    }>;
  }>;
  enableAdvancedMode?: boolean;
}
```

### Critical Questions -- Post 4

1. **Legend State awareness:** Less well-known than Zustand/Jotai. Intro needs 2-3 paragraphs motivating the TECHNIQUE (proxy-based tracking), not the library. Frame: "Even if you never use Legend State, understanding proxy-based tracking helps you understand SolidJS signals, Vue's reactivity, and the TC39 Signals proposal."

2. **Proxy prerequisite:** We ARE teaching Proxies in this post. Widget 3 is dedicated to it. Assume "I've heard of Proxy" level. Widget teaches the rest.

3. **SolidJS comparison:** One section, 3-4 paragraphs. "SolidJS achieves similar fine-grained reactivity through compilation. Legend State achieves it through runtime proxies. Different mechanism, same goal." No widget needed -- context, not a teaching target.

4. **API stability:** "Legend State's API has stabilized significantly since v2. The proxy tracking mechanism is the stable foundation; the React integration API may evolve."

5. **Widget 1 and 2 overlap?** No. Widget 1: MECHANISM (how proxies track access). Widget 2: RESULT (comparison of granularity across approaches). Different lens, same subject. Widget 1 builds the mental model. Widget 2 validates it.

---

## Post 5: Valtio -- Mutable Outside, Immutable Inside

### Thesis

Valtio occupies a unique philosophical position: it gives developers a mutable API (`state.count++`) while maintaining immutable guarantees for React (`useSnapshot()` returns a frozen object). The bridge between worlds is structural sharing -- when you mutate a property, Valtio creates a new snapshot where only the changed branch gets a new reference while unchanged branches reuse the previous snapshot's references. This is the same optimization React uses internally for fiber trees, applied to state.

### Narrative Arc

This is the most radical departure. Zustand asks for immutability. Jotai asks for atoms. Valtio says: "just mutate the object." Write `state.count++` and the right component re-renders. The post explains the mechanism: Proxies for mutation detection, structural sharing for efficient snapshots, and property tracking during render for precise subscriptions.

The intellectual hook: Valtio gives a mutable API but guarantees immutable semantics. The surface is familiar (object mutation), but underneath, every mutation creates a new immutable snapshot.

### Content Outline

1. **The mutable DX promise** -- `state.count++` just works. No dispatch, no actions, no immer, no selectors. Why this is appealing (and why some distrust it).

2. **`proxy()` -- wrapping with change detection** -- Valtio wraps objects with a Proxy intercepting mutations. `set` trap fires, marks path dirty, schedules snapshot computation. Walk through the source.

3. **`snapshot()` -- structural sharing** -- When React needs state, Valtio creates an immutable snapshot by walking the state tree. Unchanged paths reuse previous references. Changed paths get new frozen objects. `Object.is(prevSnapshot.unchanged, nextSnapshot.unchanged) === true`.

4. **`useSnapshot()` -- the bridge hook** -- Combines change detection with property tracking. During render, reads snapshot AND tracks which properties accessed (proxy `get` traps on the snapshot). On next mutation: did tracked properties change in new snapshot? If not, skip re-render.

5. **Valtio vs. Legend State proxy usage** -- Both use proxies, but for different purposes. Legend State: proxies track which components subscribe to which properties. Valtio: proxies detect mutations AND create structurally-shared snapshots AND track property access during render. The `get` trap means different things in each library.

6. **When React actually re-renders** -- Decision chain: (a) mutation detected, (b) snapshot computed with structural sharing, (c) for each subscriber: check if accessed properties have new references in new snapshot, (d) if yes, schedule re-render.

### Source Code Excerpts to Annotate

- `vanilla.ts`: `proxy()` function -- Proxy handler, `set` trap, dirty marking
- `vanilla.ts`: `snapshot()` function -- structural sharing algorithm
- `react.ts`: `useSnapshot()` hook -- `useSyncExternalStore` + property tracking

---

### Widget 1: Mutable/Immutable Bridge

**What it shows:** Three-panel layout (horizontal desktop, stacked mobile).

**Left -- "Mutable World":** Valtio proxy state as editable `StoreObjectViewer`. Warm-toned header (`var(--color-store-mutable)`, orange) labeled "proxy(state)."

**Center -- "The Bridge":** Visual bridge showing `snapshot()` operation. Tree diagram of the structural sharing computation.

**Right -- "Immutable Snapshot":** Frozen snapshot as read-only `StoreObjectViewer`. Cool-toned header (`var(--color-store-immutable)`, blue) labeled "snapshot(state)." Each property node has a reference indicator: green dot = reused from previous snapshot, yellow dot = new reference.

**State:**

```
{
  user: {
    name: "Alice",
    age: 30,
    preferences: { theme: "dark" }
  },
  todos: [
    { text: "Learn Valtio", done: false }
  ],
  settings: { lang: "en", notifications: true }
}
```

**How it works:**

1. Reader changes `user.name` to "Bob" in Mutable World.

2. **Bridge animation:** The bridge shows structural sharing:
   - `user` branch: new reference (name changed inside). Yellow "NEW" badge.
   - `user.name`: new value. Yellow.
   - `user.age`: same value (30). Green "reused" badge. Small "===" indicator.
   - `user.preferences`: untouched subtree. Green. Reference arrow shows same object.
   - `todos` and `settings`: completely untouched. Green. Point to exact same objects.

3. Snapshot panel updates. Reference indicators: `user` and `user.name` yellow, everything else green.

4. **Reuse Rate bar:** Below snapshot panel. For this change: ~85% reused. Green/yellow segmented bar. `SPRING.snappy`.

5. **"Show naive clone" toggle:** Full deep clone. Every indicator turns yellow. Reuse rate: 0%. The cost of not having structural sharing.

6. **Component impact row:** Below all three panels. Components reading only green branches stay idle. Components reading yellow branches re-render. Connects structural sharing to re-render consequences.

**Animation choreography:**
- Inline edit: old value fades out, new fades in, monospace, `TRANSITION.crossfade`.
- Bridge traversal: tree diagram computes top-down, each branch copies (yellow flash) or reuses (green flash), staggered 0.1s per level.
- Reference indicators: dots pop green->yellow (or stay green) with `SPRING.quick`.
- Reuse bar: segments resize with `SPRING.snappy`.
- Naive clone toggle: all indicators simultaneously green->yellow, `DURATION.fast`. Bar drains to 0% with `TRANSITION.progress`.
- Component impact: `RenderFlashEffect` for re-rendering, green check for idle.
- Reduced motion: no traversal animation, indicators instant, bars instant.

**Why interactivity is essential:** Structural sharing is Valtio's key optimization and completely abstract until visualized. Watching 85% of nodes stay green (reused) while 15% turn yellow (new) makes it tangible. The "naive clone" toggle shows what you lose without sharing. The component impact row connects optimization to re-render prevention -- the full causal chain from mutation to render decision.

**Simplest version:** Left (mutable) and right (snapshot) panels only. No bridge animation, no reuse bar. Yellow/green reference indicators on the snapshot. Click to mutate, see which references changed.

**Component API:**

```tsx
interface MutableImmutableBridgeProps {
  initialState: Record<string, unknown>;
  editableFields: string[];
  showNaiveCloneComparison?: boolean;
  showComponentImpact?: boolean;
  components?: Array<{
    name: string;
    accessPaths: string[];
  }>;
}
```

---

### Widget 2: Snapshot Diff Viewer

**What it shows:** Two tree diagrams side by side: "Previous Snapshot" (left, slightly faded) and "Current Snapshot" (right, full brightness). Diff annotations between them.

**How it works:**

1. Mutation buttons: "Change leaf value", "Change nested object", "Push to array", "Replace subtree."

2. "Change leaf value" (e.g., `settings.lang` from "en" to "fr"):
   - Diff view: green solid lines = same reference. Yellow dashed lines = new reference.
   - Only `settings` and `settings.lang` have yellow. Everything else green. Shows: leaf change creates new references only along the path from root to leaf.

3. "Push to array" (add todo):
   - `todos` array: new reference. Existing todo objects: same references. New todo: new object. Array mutations create new array references but don't deep-clone elements.

4. "Replace subtree" (replace `user`):
   - Entire `user` branch yellow. Everything under `user` new. `todos` and `settings` stay green. Structural sharing is per-branch.

5. **Memory diagram toggle:** Boxes representing objects in memory. Green connections = shared references (same box). Yellow boxes = unique to current snapshot. Most direct visualization of structural sharing.

**Animation choreography:**
- Mutation trigger: left tree "freezes" (subtle blue tint overlay) while right tree updates.
- Diff lines: draw between corresponding nodes, `DURATION.normal`. Green solid lines draw smoothly, yellow dashed with stutter (emphasize "different").
- Memory toggle: tree view collapses, memory view expands with `TRANSITION.collapse`.
- Reduced motion: no line drawing, no freeze overlay, diff applied instantly.

**Why interactivity is essential:** Different mutation types affect different amounts of the tree. Trying leaf, nested, array, and subtree mutations builds intuition for HOW MUCH of the snapshot changes. This prevents performance bugs: "If I replace the whole user object, I invalidate every component reading any user field."

**Simplest version:** Two columns (before/after), one mutation type. Green/yellow lines between corresponding nodes. No memory diagram.

**Component API:**

```tsx
interface SnapshotDiffViewerProps {
  initialState: Record<string, unknown>;
  mutations: Array<{
    id: string;
    label: string;
    description: string;
    apply: (state: Record<string, unknown>) => void;
    affectedPaths: string[];
  }>;
  showMemoryDiagram?: boolean;
}
```

---

### Widget 3: Valtio vs. Zustand DX Face-off

**What it shows:** `SideBySideComparison`. Left: "Valtio way." Right: "Zustand way." Both implement the same operation: adding a todo item.

**How it works:**

1. **Code comparison:**

   Left (Valtio):
   ```js
   // Just mutate
   state.todos.push({ text: "New todo", done: false });
   state.todoCount++;
   ```

   Right (Zustand):
   ```js
   // Return new state
   set((prev) => ({
     todos: [...prev.todos, { text: "New todo", done: false }],
     todoCount: prev.todoCount + 1,
   }));
   ```

2. "Run" button executes both. Both produce same result: new todo in a mini todo-list below.

3. **"Under the hood" reveal:** Expandable panel showing runtime steps.
   - Valtio: `push()` triggers proxy `set` trap -> marks dirty -> batches -> new snapshot with structural sharing -> components notified.
   - Zustand: `set()` runs updater -> shallow merge -> new state reference -> selectors run -> re-renders scheduled.

4. **Convergence:** Despite different DX, same outcome: one re-render. Visual "equals" sign between the two mini apps.

5. **Tradeoff panel:** Comparison table:
   - Lines of code: Valtio 2, Zustand 4
   - Mental model: "just mutate" vs. "return new state"
   - Debugging: harder (proxies) vs. easier (explicit transitions)
   - TypeScript: full inference vs. explicit types
   - Testing: mock proxy vs. test updater directly

**Animation choreography:**
- Code: `ShikiCodeViewer` with project syntax theme.
- "Run" button: centered, pulses `SPRING.quick`.
- Todo list: new item slides in with `SPRING.gentle`, identical both sides.
- "Under the hood": slides up with `TRANSITION.collapse`. Steps staggered 0.3s, each with `TRANSITION.enterItem`.
- Equals sign: scales 0 to 1 with `SPRING.gentle`, then gentle `LOOP.breathe`.
- Tradeoff rows: staggered with `STAGGER.fast`.
- Reduced motion: under-the-hood steps appear all at once, no slide-up, no equals animation.

**Why interactivity is essential:** The mutable/immutable philosophical difference is hard to appreciate from code alone because both produce the same result. Running both simultaneously and seeing the "under the hood" panel reveals fundamentally different mechanisms achieving the same outcome. That is the philosophical point made concrete.

**Simplest version:** Code comparison only, shared "Run" button, same visual result. No under-the-hood reveal, no tradeoff table. The code contrast alone teaches the DX difference.

**Component API:**

```tsx
interface DxFaceoffProps {
  operations: Array<{
    id: string;
    label: string;
    valtio: {
      code: string;
      underTheHood: Array<{ step: string; description: string }>;
    };
    zustand: {
      code: string;
      underTheHood: Array<{ step: string; description: string }>;
    };
    result: React.ReactNode;
  }>;
  showTradeoffs?: boolean;
}
```

### Critical Questions -- Post 5

1. **Valtio and Legend State both use proxies -- enough differentiation?** Yes, because PURPOSE differs. Legend State: subscription tracking. Valtio: mutation detection + snapshot creation + render-time property tracking. Widget 1 (bridge) is unique to Valtio. Post 4 Widget 1 (access tracker) is unique to Legend State. No widget overlap.

2. **Mutable vs. immutable philosophical enough for a full post?** Yes. It's not just philosophy -- structural sharing, snapshot computation, batched mutations are concrete engineering with concrete code to annotate.

3. **Performance benchmarks?** No synthetic benchmarks. The structural sharing widget IS the performance argument: "85% reused" is more memorable than "3.2x faster."

4. **Valtio depth:** There IS enough. Structural sharing algorithm alone warrants a deep dive. Add proxy tracking, batching, DX philosophy.

5. **Widget 3 too superficial?** The "under the hood" panel saves it. Without it, the widget is "look, less code!" (shallow). With it, the widget shows different internal machinery producing the same outcome. If build budget is tight, cut this widget before the other two.

---

## Post 6: Choosing Your Re-render Strategy -- Synthesis

### Thesis

The four libraries represent four answers to "How do we give React components access to shared state without paying the re-render tax?" Those answers map to a 2x2 matrix of design decisions. Understanding the matrix is more valuable than understanding any single library, because the matrix helps you evaluate FUTURE libraries and the React Compiler's impact.

### The 2x2 Matrix

|  | **Centralized store** | **Distributed atoms/observables** |
|---|---|---|
| **Selector-based tracking** | **Zustand** -- One store, explicit selectors | (empty -- selectors on atoms is redundant) |
| **Proxy-based tracking** | **Valtio** -- One store, proxy tracks access | **Legend State** -- Observable tree, proxy tracks at leaf level |
| **Dependency-graph tracking** | (n/a -- graphs need distributed nodes) | **Jotai** -- Atoms with dependency edges |

### Content Outline

1. **The matrix explained** -- Why store topology and tracking mechanism capture the essential design space. Why some quadrants are empty.

2. **Decision framework** -- Not "use X" but "ask yourself these questions":
   - How complex is your state? (Simple: Zustand. Graph-like: Jotai.)
   - How nested? (Flat: selectors fine. Deep: proxy tracking wins.)
   - How important is DX? (Mutable: Valtio. Explicit: Zustand.)
   - Team size? (Zustand's simplicity scales. Jotai's atom graph requires shared understanding.)
   - Derived state? (Manual: Zustand. Automatic: Jotai or Legend State.)

3. **Composability** -- Can you mix? Zustand for global state + Jotai for derived. Pragmatism with caveats.

4. **The React Compiler** -- Auto-memoizes components. Prevents unnecessary WORK during re-renders but doesn't prevent re-renders themselves. Libraries that move state outside the tree or track at property level provide fundamentally different optimizations. The Compiler is a safety net, not a replacement.

5. **TC39 Signals proposal** -- Signals as reactive primitives in JavaScript. If adopted, proxy-based approaches have a native alternative. Atomic approaches map closely. Zustand's external store model remains relevant -- it's about architecture, not reactivity.

6. **What we learned about React** -- Its top-down model is a deliberate simplification that works for most apps. Libraries exist for when that simplification breaks down. Understanding WHEN it breaks down matters more than which library to use.

---

### Widget 1: Decision Tree Navigator

**What it shows:** An interactive decision tree as a node-link diagram. Root node asks first question. Branches lead through follow-up questions. Leaf nodes are recommendations.

**Decision tree:**

```
Q1: "How much shared state does your app have?"
  |-- "Minimal (2-3 pieces)" -> "useState/useReducer + prop drilling. No library needed."
  |-- "Moderate (5-15 pieces)" ->
  |   Q2: "Is your state mostly flat or deeply nested?"
  |     |-- "Flat" -> "Zustand. Simple selectors work great."
  |     |-- "Deeply nested" ->
  |         Q3: "Prefer mutable or immutable patterns?"
  |           |-- "Mutable" -> "Valtio. Mutate naturally, snapshots for React."
  |           |-- "Immutable" -> "Zustand + Immer middleware."
  |-- "Extensive (15+, interconnected)" ->
      Q4: "Does state have heavy derived/computed values?"
        |-- "Yes" -> "Jotai. Dependency graph handles derived state automatically."
        |-- "Not much" ->
            Q5: "How critical is render performance?"
              |-- "Very (real-time, animations)" -> "Legend State. Finest granularity."
              |-- "Normal" -> "Zustand. Battle-tested, simple, good enough."
```

**How it works:**

1. Reader starts at Q1, clicks answers. Chosen path expands. Unchosen branches fade to 30%.

2. Each node: 2-sentence explanation of WHY this question matters.

3. Leaf nodes: library name, 1-sentence rationale, "Also consider: [alternative]", link to relevant series post.

4. Breadcrumb trail at top: Q1: Moderate -> Q2: Nested -> Q3: Mutable -> Valtio.

5. "Start Over" resets. "Compare All Paths" shows all leaves simultaneously.

**Animation choreography:**
- Branch selection: chosen path brightens, unchosen dim to 30% with `TRANSITION.crossfade`.
- Node expansion: next node scales 0 to 1 with `SPRING.gentle`. Connecting edge draws via stroke-dashoffset.
- Leaf card: slides in with `SPRING.gentle`, subtle `LOOP.breathe` on border (very gentle).
- Breadcrumb: pills slide in from left with `SPRING.snappy`, `STAGGER.fast`.
- "Compare All Paths": all leaves appear staggered, `SPRING.snappy`.
- Reduced motion: no scaling, opacity instant, breadcrumbs appear without animation.

**Why interactivity is essential:** Decision trees as static images or bullet lists don't let readers MAKE the decision with their own app in mind. Clicking through questions forces the reader to articulate their needs. The path taken is as instructive as the destination. "Compare All Paths" then shows the full landscape.

**Simplest version:** Three questions, four terminal recommendations. No breadcrumb, no "Compare All Paths." Click through -> get recommendation.

**Component API:**

```tsx
type DecisionNode = {
  id: string;
  question: string;
  explanation: string;
  options: Array<{ label: string; leadsTo: string }>;
};

type DecisionLeaf = {
  id: string;
  recommendation: string;
  library: string;
  rationale: string;
  alsoConsider?: { library: string; when: string };
  seriesPostLink?: string;
};

interface DecisionTreeNavigatorProps {
  nodes: DecisionNode[];
  leaves: DecisionLeaf[];
  rootNodeId: string;
}
```

---

### Widget 2: Approach Comparison Matrix

**What it shows:** Data table. Rows: four libraries. Columns: evaluation dimensions.

**Dimensions:**
- Bundle size (KB gzipped)
- Learning curve (low/medium/high)
- TypeScript DX (good/great/excellent)
- Re-render granularity (coarse/medium/fine)
- Derived state (manual/automatic)
- Async support (external/built-in/Suspense)
- Middleware/plugin system (yes/no)

**How it works:**

1. Default: all dimensions visible, rows alphabetical.

2. **Priority sliders** above: "Bundle size matters" (0-10), "Learning curve matters" (0-10), "Render performance matters" (0-10), "DX ergonomics matters" (0-10). Adjusting sliders reorders rows by weighted score. "Best fit" rises to top with spring animation.

3. Column header click sorts by that column.

4. Cell hover: tooltip with detail ("Zustand: ~1.1KB gzipped").

5. "My Stack" toggle: "Using Next.js" (SSR implications), "React Native" (bundle size weight), "Micro-frontend" (store scoping).

**Animation choreography:**
- Row reorder: `SPRING.snappy`. The core delight -- watching rows shuffle as you drag a slider.
- Score badge: count-up animation, `DURATION.fast`.
- Column sort: rows slide, header arrow rotates with `TRANSITION.crossfade`.
- Tooltip: `TRANSITION.crossfade`, Floating UI positioning.
- "My Stack" toggle: affected cells flash yellow, table reorders.
- Reduced motion: rows jump positions, scores update instantly.

**Why interactivity is essential:** Static comparison tables present all dimensions as equally important. Priority sliders let readers project their own values. "Zustand is best FOR YOUR PRIORITIES." The row reorder animation makes prioritization feel tangible.

**Simplest version:** Static table with column sorting. No priority sliders, no "My Stack." Still useful for at-a-glance comparison.

**Component API:**

```tsx
interface ComparisonMatrixProps {
  libraries: Array<{
    id: string;
    name: string;
    dimensions: Record<string, {
      value: string | number;
      detail?: string;
      score?: number;
    }>;
  }>;
  priorities?: Array<{
    id: string;
    label: string;
    dimensionWeights: Record<string, number>;
  }>;
  stackOptions?: Array<{
    id: string;
    label: string;
    adjustments: Record<string, Record<string, number>>;
  }>;
}
```

---

### Widget 3: The 2x2 Quadrant Map

**What it shows:** Visual 2x2 matrix with labeled axes. X-axis: "Store Topology" (Centralized -> Distributed). Y-axis: "Tracking Mechanism" (Selector -> Proxy/Graph). Each library as a dot. React Compiler and TC39 Signals as future-facing dots with dashed borders.

**How it works:**

1. Each dot clickable. Expands info card: library name, one-sentence positioning, key tradeoff, link to series post.

2. Axis labels at each end:
   - Centralized: "One source of truth. Selectors extract slices."
   - Distributed: "Many small state units. Composition over selection."
   - Selector: "You tell the framework what you need."
   - Proxy/Graph: "The framework discovers what you need."

3. **Future dots:** React Compiler (near center -- improves all approaches). TC39 Signals (in proxy/distributed quadrant near Legend State).

4. Quadrant hover: highlights quadrant with 10% accent background, brief description.

5. Toggle "Show React's built-in": Context API dot in bottom-left corner (centralized, no fine-grained tracking -- worst quadrant for re-render efficiency, but simplest to use).

**Animation choreography:**
- Initial render: axes draw via stroke-dashoffset, `DURATION.slow`. Library dots pop in staggered, `SPRING.snappy`, `STAGGER.fast`.
- Dot click: info card expands from dot position with `SPRING.gentle`. Others dim to 50%.
- Quadrant hover: background brightens, `TRANSITION.crossfade`.
- Future dots: dashed border with rotating dash pattern (CSS `stroke-dashoffset` animation).
- Context API toggle: dot appears bottom-left with red flash, gentle bounce settle.
- Reduced motion: no drawing animation, dots appear instantly, no rotating dashes.

**Why interactivity is essential:** The 2x2 is the series thesis compressed into one spatial metaphor. Interactive exploration lets readers see where each library lives relative to others and understand WHY the positioning follows from design decisions. Future dots connect the series to the evolving landscape, making learning durable.

**Simplest version:** Static 2x2 with dots and labels. Hover for tooltips. No future dots, no Context toggle. The spatial metaphor alone teaches.

**Component API:**

```tsx
interface QuadrantMapProps {
  xAxis: { label: string; leftLabel: string; rightLabel: string };
  yAxis: { label: string; bottomLabel: string; topLabel: string };
  libraries: Array<{
    id: string;
    name: string;
    x: number;    // 0-1
    y: number;    // 0-1
    description: string;
    tradeoff: string;
    postLink?: string;
    isFuture?: boolean;
  }>;
  quadrants?: Array<{
    position: 'tl' | 'tr' | 'bl' | 'br';
    label: string;
    description: string;
  }>;
}
```

### Critical Questions -- Post 6

1. **Is synthesis necessary?** Yes. Readers who read 2-3 posts need a map. The decision tree and 2x2 are the most shareable artifacts.

2. **Decision tree too prescriptive?** Mitigate: frame as "starting point for thinking" not "the answer." "Also consider" on each leaf. "Compare All Paths." Disclaimer: "This captures common scenarios. Your specifics might lead differently."

3. **Redux/MobX?** No. Different era. Brief mention: "They solved this in a previous generation and deserve their own analysis."

4. **Aging:** Focus on the AXES of the 2x2 (store topology, tracking mechanism) which are durable conceptual frameworks. Libraries are current implementations of durable patterns. Include "Last reviewed: [date]."

5. **React Compiler depth:** Brief (2-3 paragraphs). Not released as of this writing. Focus on WHAT it does (auto-memoization) and DOESN'T do (prevent re-renders from reaching non-memoized components). The 2x2 placement communicates this better than paragraphs.

---

## Accessibility Checklist

Applies to every widget:

- All re-render flash effects: sufficient color contrast AND non-color indicator (scale change or icon). Red/blue/green flashes are always accompanied by text ("re-rendered", "skipped") or icons (checkmark, X).
- Component trees: navigable with arrow keys, not just mouse.
- All animations: `usePrefersReducedMotion()` with instant-transition fallbacks per the Reduced Motion Contract above.
- Sequence diagrams (Post 2 Widget 2, Post 3 Widget 3): text-based step list for screen readers.
- Color-coded comparisons (green/yellow/red): also use shape (solid/dashed lines), text labels, and icons.
- Slider controls: keyboard accessible with appropriate ARIA labels.
- All interactive elements: visible focus indicators.

---

## Implementation Priority

If building all 18 widgets is infeasible, prioritize by teaching impact:

**Tier 1 (must-build, carry the series thesis):**
1. Post 1, Widget 1 (Re-render Cascade Visualizer) -- Sets up the entire series.
2. Post 3, Widget 1 (Atom Dependency Graph Explorer) -- Jotai's graph is the most novel concept.
3. Post 4, Widget 1 (Proxy Access Tracker) -- Making proxies visible is the unique contribution.
4. Post 5, Widget 1 (Mutable/Immutable Bridge) -- Structural sharing visualization hard to find elsewhere.
5. Post 6, Widget 3 (2x2 Quadrant Map) -- The series thesis in one interactive.

**Tier 2 (significant teaching value):**
6. Post 2, Widget 1 (Store Subscription Map)
7. Post 4, Widget 2 (Granularity Spectrum)
8. Post 2, Widget 2 (useSyncExternalStore Sequence)
9. Post 6, Widget 1 (Decision Tree Navigator)
10. Post 1, Widget 3 (Context API Anatomy)

**Tier 3 (valuable but cuttable):**
11. Post 1, Widget 2 (Frame Budget Gauge)
12. Post 5, Widget 2 (Snapshot Diff Viewer)
13. Post 3, Widget 2 (Top-Down vs. Bottom-Up)
14. Post 2, Widget 3 (Middleware Pipeline)
15. Post 6, Widget 2 (Comparison Matrix)
16. Post 5, Widget 3 (DX Face-off)
17. Post 3, Widget 3 (Async Atom Lifecycle)
18. Post 4, Widget 3 (Proxy Trap Inspector)

### Shared Primitive Build Order

1. `RenderFlashEffect` -- Used in 5 of 6 posts. Foundational.
2. `ComponentTreeRenderer` -- Used in 4 posts. Depends on RenderFlashEffect.
3. `StoreObjectViewer` -- Used in 3 posts.
4. `SubscriptionLineAnimator` -- Used in 3 posts.
5. `SideBySideComparison` -- Generic layout, quick to build.
6. `RenderCountDashboard` -- Simple but impactful.
7. `CodeStepper` -- Used in 3 posts. Most complex primitive.

### Source Code Version Pinning

Pin excerpts to specific commits so they don't drift:
- Zustand: latest stable v5.x tag
- Jotai: latest stable v2.x tag
- Legend State: latest stable v3.x tag
- Valtio: latest stable v2.x tag

Use GitHub permalink format: `github.com/org/repo/blob/COMMIT_SHA/path/to/file.ts#L10-L50`.

### Estimated Scope

| Post | Words | Widgets | Build estimate |
|------|-------|---------|---------------|
| 1 | ~3,000 | 3 | 2 weeks |
| 2 | ~3,500 | 3 | 2 weeks |
| 3 | ~3,500 | 3 | 2.5 weeks (atom graph builder) |
| 4 | ~3,000 | 3 | 2 weeks |
| 5 | ~3,000 | 3 | 2 weeks (structural sharing viz) |
| 6 | ~2,500 | 3 | 1.5 weeks (mostly composition) |
| **Total** | **~18,500** | **18** | **~12 weeks** |

### Recommended Cadence

Build and ship in pairs:
1. Posts 1 + 2 (problem + first solution). Iterate on reader feedback.
2. Posts 3 + 4 (Jotai + Legend State). Strongest contrast pair.
3. Posts 5 + 6 (Valtio + synthesis). Synthesis should be last -- benefits from reader questions on earlier posts.

### Series Navigation

Each post should include:
- A "series progress" indicator at top (all 6 posts, current highlighted).
- "Previous" / "Next" navigation at bottom.
- Frontmatter: `series: react-state-without-rerenders`, `part: N`.
- Series landing page with the Reading Map.
