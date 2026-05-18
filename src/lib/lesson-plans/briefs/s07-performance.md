# Section 7: Web Application Performance -- Implementation Briefs

> Source: `src/lib/lesson-plans/s07-performance.ts`
> Section color: `--diagram-layer-4` (oklch 65% 0.15 30, orange)
> Motion tokens: `src/lib/motion.ts` | Design tokens: `src/styles/tokens.css`
> Section structure: JS perf -> CSS perf -> Image perf -> Font/asset perf (the four asset types). Then CWV synthesizes into user-facing metrics. Bundle covers the bundler's role. Hints covers browser-level optimization. Arc: "what's slow" -> "how to measure" -> "how to fix".

---

## perf-js -- JavaScript Performance Scrollytelling
**Format**: scrollytelling | **Effort**: large

### Interaction State Machine

```
                     +---------------------+
                     |    SCROLL_IDLE      |
                     | stepIndex: 0        |
                     | mode: "scrolly"     |
                     +---------------------+
                          |  IntersectionObserver fires
                          v
                     +---------------------+
                     |    STEP_ACTIVE      |
                     | stepIndex: 0..3     |
                     | animating: true     |
                     +---------------------+
                          |  step animation completes
                          v
                     +---------------------+
                     |    STEP_SETTLED     |
                     | animating: false    |
                     | (visual holds)      |
                     +---------------------+
                          |  scroll to next step
                          v
                     +---------------------+
                     |    STEP_ACTIVE      |
                     | stepIndex: n+1      |
                     | (visual transforms) |
                     +---------------------+
                          |  reach step 3 (final scroll step)
                          v
                     +---------------------+
                     |  SCROLLY_COMPLETE   |
                     | mode transitions    |
                     | to "interactive"    |
                     +---------------------+
                          |  300ms pause, then mode flips
                          v
                     +---------------------+
                     |    DRAG_IDLE        |
                     | mode: "interactive" |
                     | scripts: Script[]   |
                     | zone assignments    |
                     +---------------------+
                          |  pointerdown on a script block
                          v
                     +---------------------+
                     |    DRAGGING         |
                     | draggedId: string   |
                     | dragPos: {x,y}      |
                     | sourceZone: string  |
                     +---------------------+
                          |  drag over zone boundary
                          v
                     +---------------------+
                     |   ZONE_HOVER        |
                     | targetZone: string  |
                     | (zone highlights)   |
                     +---------------------+
                          |  pointerup inside target zone
                          v
                     +---------------------+
                     |   DROPPED           |
                     | script moves zone   |
                     | TTI recalculates    |
                     | animating: true     |
                     +---------------------+
                          |  metric animation settles (500ms)
                          v
                     +---------------------+
                     |    DRAG_IDLE        |
                     | (ready for next)    |
                     +---------------------+
```

**Data driving each state:**
- `SCROLL_IDLE / STEP_ACTIVE / STEP_SETTLED`: `stepIndex` (0-3), `animating` boolean, derived `flameChartConfig` for the current step
- `SCROLLY_COMPLETE`: `mode === 'scrolly'`, all 4 steps visited
- `DRAG_IDLE`: `scripts: Script[]` with zone assignments, `ttiMs: number` (derived from critical-path scripts)
- `DRAGGING`: `draggedId`, `dragPos: { x: number, y: number }`, `sourceZone: 'critical' | 'deferred' | 'worker'`
- `DROPPED`: prior zone, new zone, `prevTti` and `nextTti` for counter animation

### Visual Choreography

**Sticky visual container**: 680px wide, 440px tall, `var(--color-surface)` background, 1px `var(--color-border)` border, `var(--radius-2)` corners.

**Flame chart layout (steps 0-3)**:
- Thread lane labels: "Main Thread" (left edge, mono `var(--text-xs)`, `var(--color-muted)`), "Worker Thread" (appears step 3).
- Timeline ruler: horizontal, top edge, tick marks every 500ms, labels "0s", "0.5s", "1.0s" ... "4.0s". Color: `var(--color-border)`, labels `var(--color-muted)` mono `var(--text-xs)`.
- Script blocks: rounded rectangles (`var(--radius-1)`) sitting on the main thread lane. Height: 36px. Fill colors by script identity:
  - Main bundle / route-home: `var(--diagram-layer-0)` (blue)
  - Route-dashboard: `var(--diagram-layer-1)` (green)
  - Route-settings: `var(--diagram-layer-2)` (purple)
  - Vendor/charting-lib: `var(--diagram-layer-3)` (yellow)
  - Data-processor (worker candidate): `var(--diagram-layer-4)` (orange)
- Block labels: `var(--font-mono)` `var(--text-xs)`, white, centered. Truncate with ellipsis if block is < 80px wide.
- TTI marker: vertical dashed line, 2px, `var(--color-accent)`, full height. Label above: "TTI: {value}" in mono `var(--text-sm)` bold, `var(--color-accent)`.
- Long Task warnings: small triangle icons (12px) with `var(--color-error)` fill, placed above blocks > 50ms. Tooltip on hover: "Long Task: {duration}ms".

**Step animations:**
1. **Step 0 (single bundle)**: One massive block fills 0ms-2100ms on the main thread. Width: `(2100/4000) * containerWidth`. TTI marker at 3800ms position. 5 Long Task triangles scattered above.
   - Entry: block fades in from left edge, opacity 0 -> 1, width 0 -> full, over 600ms `SPRING.gentle`.

2. **Step 1 (code splitting)**: The single block splits into 3 smaller blocks. Animation: the original block's right edge "tears" -- a 2px gap appears at the split points, then gaps widen to 20px over 500ms `SPRING.snappy`. Three blocks: home (400KB, 0-480ms), dashboard (320KB, 500-860ms), settings (280KB, 880-1180ms). Idle gaps between them: 20ms each, rendered as `var(--color-surface)` gaps. TTI marker slides left from 3800ms to 2100ms over 400ms with `SPRING.gentle`. Long Task triangles reduce from 5 to 2.

3. **Step 2 (defer non-critical)**: The charting library block (yellow, 340ms-wide) physically lifts from its position and moves below a horizontal dashed line labeled "First Paint" (positioned at the 1400ms mark). Animation: block lifts 4px (100ms), translates down 60px (400ms `SPRING.gentle`), settles below the line. TTI marker slides from 2100ms to 1400ms. The "First Paint" line fades in at 200ms with `TRANSITION.enterCard`.

4. **Step 3 (Web Worker)**: A second lane appears below main thread, labeled "Worker Thread" in `var(--color-muted)`. The data-processor block (orange) lifts from main thread, rises 4px (100ms), then translates up to the worker lane (400ms `SPRING.gentle`). On the worker lane it runs in parallel with main thread activity. Main thread is now nearly empty after the first 480ms. TTI marker slides to 900ms. Worker lane label fades in with `TRANSITION.enterCard`.

**TTI counter**: Fixed in the top-right of the sticky container. Background: `var(--color-surface-2)` pill with `var(--radius-2)`. Text: mono `var(--text-base)` bold. Color transitions: > 3s `var(--color-error)`, 2-3s `var(--diagram-layer-3)` (yellow), < 2s `var(--color-success)`. Value animates between old and new via counting spring over 500ms (`SPRING.gentle`).

**Post-scroll interactive (drag zone)**:
- Two zones side by side, each 320px wide, 300px tall:
  - "Critical Path" zone: `var(--color-surface)` bg, 2px solid `var(--color-error)` border when any block is inside, dashed when empty. Label: mono `var(--text-sm)` `var(--color-error)`.
  - "Deferred" zone: `var(--color-surface)` bg, 2px solid `var(--color-success)` border, dashed when empty. Label: mono `var(--text-sm)` `var(--color-success)`.
- Script blocks rendered as draggable 120x48px rounded rectangles (same colors as flame chart). Label + size in KB.
- Drop target highlight: zone border pulses (`LOOP.pulse`) and background tints 5% of the zone color when a draggable hovers over it.
- On drop: block animates to its new position with `SPRING.snappy`. TTI counter recalculates and animates.
- TTI formula visible below zones: `TTI = sum(critical scripts parse+execute time) + overhead`. Mono `var(--text-xs)`.

**Reduced motion**: All transitions instant. Blocks snap to position. Counter value updates without spring. Drag still works (pointer-driven).

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees a flame chart with one enormous blue block spanning most of the timeline. TTI marker far to the right at 3.8s (red). 5 Long Task warning triangles above the block. The chart looks alarming -- lots of red.
2. **3s**: Scroll narration begins: "A single 2MB bundle." Reader scrolls to step 1.
3. **~8s**: The single block tears into 3 smaller blocks with visible gaps. TTI marker slides left to 2.1s. Color changes from red toward yellow. Reader sees idle gaps appear between chunks.
4. **~15s**: Reader scrolls to step 2. The charting library block lifts and moves below the "First Paint" line. TTI drops to 1.4s. The teaching moment: the library still loads, but AFTER the user can interact.
5. **~22s**: Reader scrolls to step 3. A "Worker Thread" lane appears. The orange data-processor block flies up to it. Main thread clears out. TTI hits 0.9s (green). The visual is now dramatically different from step 0 -- mostly empty main thread.
6. **~30s**: Scroll completes. The flame chart crossfades (300ms) into the drag zone view. 6 script blocks appear in the "Critical Path" zone. TTI shows the sum. Reader drags "charting-lib" to "Deferred" -- TTI drops immediately by 340ms.
7. **~45s**: Reader experiments: drags data-processor to Deferred. TTI drops again. Tries dragging route-home to Deferred -- TTI jumps because it's needed for the current page. The formula updates live.
8. **~55s**: Reader has internalized the principle: scripts on the critical path directly delay interactivity. Every drag = a metric change.

### Data & State Shape

```typescript
type ScriptId = string; // 'route-home' | 'route-dashboard' | 'route-settings' | 'charting-lib' | 'data-processor' | 'vendor-react'

interface Script {
  id: ScriptId;
  label: string;
  sizeKB: number;
  parseMs: number;           // simulated parse+compile time
  executeMs: number;         // simulated execution time
  color: string;             // CSS var reference
  isRouteCritical: boolean;  // true = needed for current page
  canWorker: boolean;        // true = can move to Web Worker
}

type Zone = 'critical' | 'deferred' | 'worker';
type ScrollStep = 0 | 1 | 2 | 3;

interface FlameBlock {
  scriptId: ScriptId;
  startMs: number;
  durationMs: number;
  lane: 'main' | 'worker';
}

interface JSPerfState {
  // Scrollytelling phase
  mode: 'scrolly' | 'interactive';
  stepIndex: ScrollStep;
  animating: boolean;

  // Flame chart derived per step
  flameBlocks: FlameBlock[];     // computed from stepIndex
  ttiMs: number;                 // computed from flameBlocks
  longTaskCount: number;         // blocks > 50ms on main thread

  // Interactive phase (post-scroll)
  scripts: Script[];
  zoneAssignments: Map<ScriptId, Zone>;
  dragState: {
    draggedId: ScriptId;
    position: { x: number; y: number };
    sourceZone: Zone;
    hoverZone: Zone | null;
  } | null;
}

// Derived values (not stored):
// - ttiMs in interactive mode = sum of parseMs + executeMs for all scripts in 'critical' zone
// - flameBlocks per step = precomputed layout arrays (one per step 0-3)
// - ttiColor = ttiMs > 3000 ? 'var(--color-error)' : ttiMs > 2000 ? 'var(--diagram-layer-3)' : 'var(--color-success)'
```

### Primitives & Props

**ScrollytellingShell** -- Wraps the entire lesson. Provides sticky left panel + scrollable right narration.
```tsx
<ScrollytellingShell
  steps={scrollSteps}
  renderVisual={(stepIndex) => <FlameChart step={stepIndex} />}
/>
```

**DemoSandbox** -- Wraps the post-scroll interactive drag zone.
```tsx
<DemoSandbox title="Script Priority Sorter">
  <ScriptDragZone scripts={scripts} zones={zoneAssignments} />
</DemoSandbox>
```

**FormulaBar** -- Shows TTI calculation below drag zones.
```tsx
<FormulaBar
  segments={criticalScripts.map(s => ({
    value: s.parseMs + s.executeMs,
    color: s.color,
    label: s.label
  }))}
  operator="+"
  result={{ value: ttiMs, label: 'TTI' }}
  animate={true}
/>
```

**AnimatedCounter** -- TTI counter in top-right (build new or extract from FormulaBar). Counts between values with spring.
```tsx
<AnimatedCounter value={ttiMs} format={(v) => `${(v/1000).toFixed(1)}s`} color={ttiColor} />
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Scroll backward** | stepIndex decrements. Flame chart reverses its transformation: blocks merge back, TTI marker slides right. All animations play in reverse at 1.5x speed. |
| **Rapid scrolling through all steps** | Debounce step changes by 100ms. If stepIndex jumps from 0 to 3, play a compressed animation (all intermediate states flash for 150ms each). |
| **Drag script to same zone** | No-op. Block snaps back to original position with `SPRING.quick`. No TTI change. |
| **Drag route-critical script to deferred** | Allow it, but show a warning annotation: "This script is needed for the current page -- deferring it means users see a loading state." TTI still updates (it gets faster, but the page is broken). |
| **Window resize during drag** | Cancel active drag (fire synthetic pointercancel). Recompute zone positions. Zones are `max-width: 320px; width: 48%` each. |
| **Touch devices** | Script blocks have 48x56px touch targets. Use `touch-action: none` on the drag surface. Long press (300ms) to initiate drag on mobile. |
| **Reduced motion** | Flame chart blocks snap to position. TTI counter updates instantly. Drag still works. Step transitions are instant cuts. |
| **Scroll during post-scroll interactive** | The interactive anchors to the end of the scroll sequence. Scrolling back up returns to scrollytelling steps -- the interactive fades out and the flame chart reappears. |

### Cross-Lesson Connections

- **Foundational stop**: Introduces the flame chart visual metaphor and TTI metric. Both concepts are assumed knowledge in perf-bundle (which shows the same scripts as treemap rectangles instead of flame blocks).
- **perf-css complement**: JS blocks main thread execution; CSS blocks rendering. Together they cover the two primary bottlenecks. The TTI concept here connects to FCP in perf-css.
- **perf-cwv synthesis**: The TTI improvements demonstrated here directly feed into the INP metric in perf-cwv. A reader who moved scripts to "deferred" here will understand why the INP fix in perf-cwv works.
- **perf-bundle upstream**: perf-bundle explains HOW the bundler creates the chunks shown in step 1. This stop takes those chunks as given and focuses on load-time behavior.

---

## perf-css -- CSS Performance Explorable
**Format**: explorable | **Effort**: medium

### Interaction State Machine

```
                     +---------------------+
                     |    TAB_SELECT       |
                     | activeTab: 0        |
                     | (specificity tab)   |
                     +---------------------+
                          |  click tab 1, 2, or 3
                          v
             +-----------+-----------+
             |           |           |
             v           v           v
     +-----------+ +-----------+ +-----------+
     | TAB_0:    | | TAB_1:    | | TAB_2:    |
     | SPECIFICITY| | CRITICAL | | UNUSED   |
     +-----------+ +-----------+ +-----------+


=== TAB 0: SPECIFICITY CALCULATOR ===

     +-----------+
     |   EMPTY   |  (two selector inputs blank)
     +-----+-----+
           |  keydown in either input
           v
     +-----------+
     |  TYPING   |  (parse selector on each keystroke)
     +-----+-----+
           |  valid selector parsed
           v
     +-----------+
     | COMPUTED  |  (specificity columns animate to values)
     +-----+-----+
           |  both selectors have values
           v
     +-----------+
     | COMPARED  |  (winner highlighted, "WINS" badge)
     +-----------+
           |  edit either selector
           v
     +-----------+
     |  TYPING   |  (reparse, recompute)
     +-----------+


=== TAB 1: CRITICAL CSS EXTRACTOR ===

     +-----------+
     |  VIEWING  |  (mock page + full stylesheet visible)
     +-----+-----+
           |  reader observes above/below fold coloring
           v
     +-----------+
     |  READY    |  (fold line visible, rules colored)
     +-----+-----+
           |  click "Extract Critical CSS"
           v
     +-----------+
     | EXTRACTING|  (animation: green rules copy to <style> tag)
     +-----+-----+  400ms per rule, staggered
           |  extraction complete
           v
     +-----------+
     | EXTRACTED |  (only green rules in inline style, rest deferred)
     +-----+-----+  FCP metric animates from 1.8s to 0.6s
           |  click "Reset"
           v
     +-----------+
     |  VIEWING  |
     +-----------+


=== TAB 2: UNUSED CSS DETECTOR ===

     +-----------+
     |  LOADED   |  (stylesheet with all rules visible)
     +-----+-----+
           |  click "Scan for unused"
           v
     +-----------+
     | SCANNING  |  (rules highlight red one by one, 100ms each)
     +-----+-----+
           |  scan complete
           v
     +-----------+
     | SCANNED   |  (unused rules red, coverage % visible)
     +-----+-----+
           |  click "Remove unused"
           v
     +-----------+
     | REMOVING  |  (red rules shrink height to 0, 200ms staggered)
     +-----+-----+
           |  removal animation complete
           v
     +-----------+
     | CLEANED   |  (bytes saved counter, remaining rules only)
     +-----------+
           |  click "Reset"
           v
     +-----------+
     |  LOADED   |
     +-----------+
```

**Data driving each state:**
- Tab 0: `selectorA: string`, `selectorB: string`, `specA: [number, number, number]`, `specB: [number, number, number]`, `winner: 'a' | 'b' | null`
- Tab 1: `extractionState: 'viewing' | 'ready' | 'extracting' | 'extracted'`, `rules: CSSRule[]` each with `aboveFold: boolean`, `fcpMs: number`
- Tab 2: `scanState: 'loaded' | 'scanning' | 'scanned' | 'removing' | 'cleaned'`, `rules: CSSRule[]` each with `matchCount: number`, `scanIndex: number`, `bytesSaved: number`

### Visual Choreography

**Tab bar**: Full width across the top. Three tabs: "Specificity", "Critical CSS", "Unused CSS". Uses `DemoSandbox.Tabs`. Active tab: `var(--color-accent)` underline. Transition between tabs: content crossfades 200ms `TRANSITION.crossfade`.

**TAB 0 -- Specificity Calculator (540px wide, 360px tall)**:
- Two side-by-side input panels, each 250px wide, separated by a 40px "VS" divider.
- Each panel:
  - Input field: full width, mono font `var(--font-mono)` `var(--text-sm)`, 40px height, `var(--color-surface-2)` bg, `var(--color-border)` border, `var(--radius-1)`. Placeholder: "type a selector...".
  - Three-column specificity counter below input: three 60px-wide boxes in a row.
    - Column headers: "ID", "Class", "Element" in `var(--text-xs)` `var(--color-muted)`.
    - Column values: large mono `var(--text-2xl)` bold. Default "0".
    - Column fill animation: background color fills from bottom to top proportional to the value. ID column: `var(--diagram-layer-6)` (red-pink, hue 350) at 20% opacity. Class column: `var(--diagram-layer-1)` (green) at 20% opacity. Element column: `var(--diagram-layer-0)` (blue) at 20% opacity.
    - On value change: number scales 1 -> 1.15 -> 1 over 200ms `SPRING.snappy`. Column fill height animates with `SPRING.gentle`.
  - Parsed selector tokens rendered below the counter: each token pill-shaped, colored by type (IDs red-pink, classes green, elements blue, combinators `var(--color-muted)`). Tokens appear as the reader types, 60ms stagger per token.
- "VS" divider: 40px wide, centered. Text "VS" in `var(--text-lg)` bold `var(--color-muted)`.
- Winner highlight: when both selectors have values, the panel with higher specificity gets a 2px `var(--color-success)` border and a "WINS" badge -- a pill in the top-right corner, `var(--color-success)` bg, white text, mono `var(--text-xs)`. Badge pops in with `SPRING.snappy` scale 0 -> 1. Loser panel: border becomes `var(--color-error)` at 40% opacity. If tied: both get `var(--diagram-layer-3)` (yellow) border, "TIE" badge on both.

**TAB 1 -- Critical CSS Extractor (680px wide, 440px tall)**:
- Left half (55%): Mock webpage rendering. A simplified page with visible elements:
  - Navigation bar (40px tall, `var(--color-surface-2)`)
  - Hero heading ("Welcome", `var(--text-2xl)`)
  - Hero image placeholder (200x120px, `var(--diagram-layer-0)` at 15% with image icon)
  - Paragraph text block (4 lines of grey bars, simulated text)
  - Horizontal dashed line across full width: the FOLD LINE. Label: "--- fold ---" centered, `var(--color-muted)` mono `var(--text-xs)`.
  - Below fold: card grid (3 cards), footer. These are dimmed at 40% opacity.
- Right half (45%): CSS rules list. Each rule is a row:
  - Selector text in mono `var(--text-xs)`: e.g., `.nav { ... }`, `.hero-img { ... }`, `.card { ... }`
  - Color dot: left edge, 8px circle. Above-fold rules: `var(--color-success)`. Below-fold rules: `var(--color-error)`.
  - Rule content truncated to 1 line, `var(--color-muted)`.
  - Total: ~15 rules, 8 above-fold, 7 below-fold.
- "Extract Critical CSS" button: centered below, `var(--color-accent)` bg, white text, `var(--radius-2)`. Hover: brightness 110%.
- Extraction animation: green rules slide right one-by-one (60ms stagger, `SPRING.snappy`) into a `<style>` tag visual that grows on the left side of the mock page (a small code block overlay in the top-left). Red rules fade to 30% opacity and get a strikethrough line.
- FCP metric: pill in bottom-left of the mock page. Before extraction: "FCP: 1.8s" in `var(--color-error)`. After: animates to "FCP: 0.6s" in `var(--color-success)`. Counting spring 500ms.

**TAB 2 -- Unused CSS Detector (680px wide, 400px tall)**:
- Full-width rule list, similar to Tab 1 but taller. ~20 rules displayed.
- Each rule row: selector (mono `var(--text-xs)`), match count badge on right ("0 matches" in `var(--color-error)`, "14 matches" in `var(--color-muted)`).
- "Scan for unused" button: `var(--color-accent)` bg.
- Scan animation: a horizontal highlight bar (4px tall, `var(--color-accent)`) sweeps down the list, 80ms per rule. As it passes each rule, the match count badge appears. Rules with 0 matches: entire row tints `var(--color-error)` at 8% opacity, text goes `var(--color-error)`.
- Coverage bar: appears after scan. Full width, 24px tall. Left portion green (used %), right portion red (unused %). Labels: "58% used (22KB)" and "42% unused (38KB)". Fills animate from left with `SPRING.gentle`.
- "Remove unused" button appears after scan.
- Remove animation: red-tinted rows shrink height 0 over 200ms each, staggered 40ms. As each disappears, a running counter in the top-right adds its bytes to "Saved: {N}KB".

**Reduced motion**: Counter values update instantly. Scan highlight jumps instead of sweeping. Rows appear/disappear without height animation. Tab crossfade is instant.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees Tab 0 (Specificity) active. Two blank inputs side by side with "VS" between them. Three "0" columns under each.
2. **5s**: Reader types `.card` in the left input. As they type each character, the parser re-evaluates. When `.card` is complete: the "Class" column animates from 0 to 1. A green pill token ".card" appears below.
3. **12s**: Reader types `.card.active` in the right input. Class column shows 2. The right panel now has higher specificity [0, 2, 0] vs [0, 1, 0]. "WINS" badge pops onto the right panel.
4. **20s**: Reader tries `#main .card` in the left input. The ID column lights up to 1, Class stays 1. Specificity: [1, 1, 0]. Left panel now wins. The "WINS" badge jumps to the left side.
5. **28s**: Reader switches to Tab 1 (Critical CSS). Sees a mock page with a fold line. Rules are color-coded green and red.
6. **35s**: Reader clicks "Extract Critical CSS". Green rules fly into the inline `<style>` tag one by one. Red rules get crossed out. FCP counter drops from 1.8s to 0.6s. The mock page above the fold looks identical -- proving only 8 rules were needed.
7. **45s**: Reader switches to Tab 2 (Unused CSS). Clicks "Scan". The highlight bar sweeps down, revealing match counts. 8 rules show "0 matches" and turn red. Coverage bar fills: 42% unused.
8. **55s**: Reader clicks "Remove unused". Red rules shrink away. "Saved: 38KB" counter ticks up. The stylesheet is now lean.

### Data & State Shape

```typescript
type SpecificityTuple = [id: number, cls: number, el: number];

interface SelectorToken {
  text: string;
  type: 'id' | 'class' | 'element' | 'pseudo-class' | 'pseudo-element' | 'combinator' | 'universal';
}

interface CSSRuleMock {
  id: string;
  selector: string;
  bodyPreview: string;        // truncated rule body for display
  sizeBytes: number;
  aboveFold: boolean;         // tab 1
  matchCount: number;         // tab 2
}

type ActiveTab = 'specificity' | 'critical' | 'unused';

interface CSSPerfState {
  activeTab: ActiveTab;

  // Tab 0: Specificity
  selectorA: string;
  selectorB: string;
  specA: SpecificityTuple;        // derived from selectorA
  specB: SpecificityTuple;        // derived from selectorB
  tokensA: SelectorToken[];       // derived
  tokensB: SelectorToken[];       // derived
  winner: 'a' | 'b' | 'tie' | null; // derived

  // Tab 1: Critical CSS
  rules: CSSRuleMock[];           // 15 mock rules
  extractionState: 'viewing' | 'extracting' | 'extracted';
  extractionIndex: number;        // current rule being animated (0..N)
  fcpMs: number;                  // 1800 -> 600 after extraction

  // Tab 2: Unused CSS
  unusedRules: CSSRuleMock[];     // 20 mock rules
  scanState: 'loaded' | 'scanning' | 'scanned' | 'removing' | 'cleaned';
  scanIndex: number;              // current rule being scanned (0..N)
  bytesSaved: number;             // cumulative during removal
}

// Derived:
// - specA = computeSpecificity(selectorA) -- parser function
// - winner = compareSpecificity(specA, specB)
// - coveragePercent = rules.filter(r => r.matchCount > 0).length / rules.length
```

### Primitives & Props

**DemoSandbox** -- Wraps the entire explorable.
```tsx
<DemoSandbox title="CSS Performance">
  <DemoSandbox.Tabs options={['specificity', 'critical', 'unused']} value={activeTab} onChange={setActiveTab} />
  {activeTab === 'specificity' && <SpecificityCalculator />}
  {activeTab === 'critical' && <CriticalCSSExtractor />}
  {activeTab === 'unused' && <UnusedCSSDetector />}
</DemoSandbox>
```

**AnimatedCounter** -- FCP metric display and bytes-saved counter.
```tsx
<AnimatedCounter value={fcpMs} format={(v) => `${(v/1000).toFixed(1)}s`} color={fcpColor} />
```

**Annotation** -- Nudge hints if reader hasn't interacted with a tab after 5s.
```tsx
<Annotation target={inputRef} text="type a CSS selector" position="below" delay={5000} />
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Invalid CSS selector typed** | Show `var(--color-error)` border on input. Specificity columns show "--" instead of numbers. No winner comparison. Clear error on next valid keystroke. |
| **Empty selector** | Columns show 0. No winner badge. |
| **Very long selector** | Input scrolls horizontally. Token display wraps to second row. Specificity still computes correctly. Max display: 120 characters before truncation with "...". |
| **Click "Extract" while already extracted** | Button changes to "Reset". Clicking it reverses: rules fly back, FCP returns to 1.8s. |
| **Click "Scan" while already scanned** | Button changes to "Reset". Clicking resets all match counts and colors. |
| **Switch tabs mid-animation** | Cancel any running animation (clear timeouts/intervals). New tab appears in its initial state. Previous tab's state is preserved for when the reader switches back. |
| **Window resize** | Tab content is `max-width: 680px; width: 100%`. Below 600px, Tab 0 stacks the two selector panels vertically instead of side by side. |
| **Keyboard navigation** | Tab key moves between selector inputs (Tab 0) and buttons (Tabs 1-2). Enter triggers buttons. |

### Cross-Lesson Connections

- **Parallel to perf-js**: JS blocks the main thread; CSS blocks rendering. The FCP metric introduced here (Tab 1) complements the TTI metric from perf-js. Together they cover the two halves of "time to usable page."
- **Feeds into perf-cwv**: The LCP metric in perf-cwv is directly impacted by CSS blocking. A reader who extracted critical CSS here will understand why render-blocking CSS worsens LCP.
- **perf-bundle downstream**: Tree shaking (perf-bundle step 2) applies to CSS too. The unused CSS detector here teaches the concept; perf-bundle shows how bundlers automate it.
- **Specificity calculator standalone value**: This tab is useful beyond performance -- it teaches a CSS fundamental. It could be referenced from other sections.

---

## perf-images -- Image Performance Explorable
**Format**: explorable | **Effort**: medium

### Interaction State Machine

```
                     +---------------------+
                     |    ZONE_SELECT      |
                     | activeZone: 0       |
                     +---------------------+
                          |  click zone tab or scroll to zone
                          v
             +-----------+-----------+
             |           |           |
             v           v           v
     +-----------+ +-----------+ +-----------+
     | ZONE_0:   | | ZONE_1:   | | ZONE_2:   |
     | FORMAT    | | SRCSET    | | LAZY      |
     +-----------+ +-----------+ +-----------+


=== ZONE 0: FORMAT COMPARISON ===

     +-----------+
     | COMPARING |  (4 formats shown, quality at 80%)
     +-----+-----+
           |  drag quality slider
           v
     +-----------+
     | ADJUSTING |  (all 4 sizes recalculate)
     +-----+-----+
           |  slider settles
           v
     +-----------+
     | COMPARED  |  (bars updated, savings % visible)
     +-----------+


=== ZONE 1: SRCSET BUILDER ===

     +-----------+
     |  INITIAL  |  (viewport slider at 1200px, no breakpoints)
     +-----+-----+
           |  click "Add breakpoint"
           v
     +-----------+
     | EDITING   |  (breakpoint markers on viewport slider)
     +-----+-----+
           |  drag breakpoint or set image width
           v
     +-----------+
     | BUILDING  |  (srcset output updates live)
     +-----+-----+
           |  drag viewport resize handle
           v
     +-----------+
     | PREVIEWING|  (active source highlights in output)
     +-----------+


=== ZONE 2: LAZY LOADING RACE ===

     +-----------+
     |   READY   |  (two side-by-side pages, not yet loaded)
     +-----+-----+
           |  click "Load Page"
           v
     +-----------+
     |  LOADING  |  (waterfall charts populate)
     +-----+-----+
           |  all eager images done; lazy = only viewport images done
           v
     +-----------+
     | COMPARING |  (byte counters visible, waterfall complete for eager)
     +-----+-----+
           |  scroll the lazy page
           v
     +-----------+
     | SCROLLING |  (lazy images load on demand, waterfall extends)
     +-----------+
```

**Data driving each state:**
- Zone 0: `quality: number` (1-100), `formatSizes: Record<Format, number>` (derived from quality)
- Zone 1: `breakpoints: Breakpoint[]`, `viewportWidth: number`, `activeSourceIndex: number` (derived)
- Zone 2: `loadState: 'ready' | 'loading' | 'comparing' | 'scrolling'`, `eagerLoaded: number`, `lazyLoaded: number`, `scrollPosition: number`

### Visual Choreography

**Zone layout**: Three stacked zones, each in its own bordered section. A small zone navigation at the top (3 pills: "Formats", "srcset", "Lazy Loading"). Each zone is 680px wide. Scroll-to-zone on click, or reader scrolls naturally.

**ZONE 0 -- Format Comparison (680x320px)**:
- Sample image: a 200x150px photograph placeholder (gradient fill simulating a photo -- `linear-gradient(135deg, var(--diagram-layer-0), var(--diagram-layer-2))`). Shown once, centered above the comparison.
- Four format cards in a row, each 150x180px:
  - Card header: format name in mono `var(--text-sm)` bold. AVIF: `var(--diagram-layer-1)` (green). WebP: `var(--diagram-layer-0)` (blue). JPEG: `var(--diagram-layer-3)` (yellow). PNG: `var(--diagram-layer-4)` (orange).
  - Size bar: horizontal, fills proportionally to file size. Max width: 130px (PNG at quality 100 is the max). Bar color matches the format header color, 60% opacity. Height: 20px, `var(--radius-1)`.
  - Size label below bar: mono `var(--text-xs)`, e.g., "42KB".
  - Savings badge (on AVIF and WebP): small pill below size, `var(--color-success)` text, e.g., "-45% vs JPEG".
- Quality slider: full width below the cards. Uses the `Dial` component.
  ```tsx
  <Dial label="Quality" value={quality} min={1} max={100} step={1} format={(v) => `${v}%`} onChange={setQuality} />
  ```
- On quality change: all four size bars animate width simultaneously with `SPRING.snappy` (200ms). Size labels count to new values. Savings badges recalculate.

**Pre-computed size data** (since we cannot transcode in browser):
```
Quality 100: PNG=680KB, JPEG=320KB, WebP=210KB, AVIF=180KB
Quality  80: PNG=680KB, JPEG=180KB, WebP=120KB, AVIF= 95KB
Quality  60: PNG=680KB, JPEG=140KB, WebP= 88KB, AVIF= 72KB
Quality  40: PNG=680KB, JPEG=110KB, WebP= 68KB, AVIF= 52KB
Quality  20: PNG=680KB, JPEG= 75KB, WebP= 45KB, AVIF= 32KB
```
Interpolate linearly between these breakpoints.

**ZONE 1 -- Srcset Builder (680x360px)**:
- Viewport slider: full width, 48px tall. A rectangular outline represents the viewport. Width visually maps to viewport width (320px-1920px). Two drag handles on left and right edges. Current width label centered: mono `var(--text-sm)`.
- Breakpoint markers: small triangles (12px) on the bottom edge of the slider, `var(--color-accent)`. Draggable left/right. Add breakpoint button: small "+" pill below the slider.
- For each breakpoint, an input row appears:
  - Breakpoint label: mono `var(--text-xs)`, e.g., "@ 768px".
  - Image width input: number input, 80px wide, mono.
  - Delete button: small "x", `var(--color-muted)`.
- Output panel below: a code block (`var(--color-surface-2)` bg, mono `var(--text-xs)`, `var(--radius-2)`) showing the generated `<img>` tag:
  ```html
  <img
    src="photo-800.jpg"
    srcset="photo-480.jpg 480w, photo-800.jpg 800w, photo-1200.jpg 1200w"
    sizes="(max-width: 768px) 480px, (max-width: 1200px) 800px, 1200px"
    alt="..."
  />
  ```
  Active source (based on current viewport width): the matching `srcset` entry highlights with `var(--color-accent)` background. Highlight transitions with `TRANSITION.crossfade` as viewport resizes.
- "Copy" button: top-right of code block. Copies HTML to clipboard. Brief "Copied!" feedback (1s).

**ZONE 2 -- Lazy Loading Race (680x400px)**:
- Two side-by-side panels, each 320px wide:
  - Left: "Eager Loading". Right: "Lazy Loading". Headers in mono `var(--text-sm)` bold.
  - Each panel contains a mini scrollable page with 20 image placeholders (60x40px grey rectangles, 10px gap).
  - Viewport window: a highlighted rectangle (180px tall) showing which images are "visible".
- Waterfall chart below each panel: 200px tall. Each image is a horizontal bar:
  - Bar width proportional to load time (simulated: 80-200ms each).
  - Color: `var(--diagram-layer-0)` for loaded, `var(--color-border)` for pending.
  - Eager: all 20 bars appear and fill simultaneously.
  - Lazy: only 4 bars (viewport images) appear initially. Remaining bars appear as the reader scrolls.
- "Load Page" button: centered between panels, `var(--color-accent)`.
- Load animation (eager): all 20 bars grow from left simultaneously, staggered 30ms, over 600ms total. Byte counter ticks up to 4.2MB.
- Load animation (lazy): first 4 bars grow (staggered 30ms), counter reaches 0.8MB. Remaining bars stay grey.
- Scroll interaction on lazy panel: reader scrolls the mini page down. As each image enters the viewport highlight, its waterfall bar activates and fills. Counter ticks up.
- Byte counter: bottom of each panel. Mono `var(--text-base)` bold. Eager: `var(--color-error)` "4.2MB". Lazy: `var(--color-success)` "0.8MB". Savings callout between them: "80% less on initial load" in `var(--color-success)`.

**Reduced motion**: Bar widths snap. Counters update instantly. Waterfall bars appear without left-to-right fill animation.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees Zone 0 (Format Comparison). Four format cards with size bars at quality 80%. AVIF bar is noticeably shorter. Savings badge: "-45% vs JPEG" on AVIF.
2. **8s**: Reader drags the quality slider to 60%. All four bars resize. PNG stays the same (lossless). JPEG shrinks. AVIF shrinks even more. The gap between AVIF and JPEG widens.
3. **15s**: Reader drags to 20%. AVIF is 32KB vs JPEG 75KB -- "less than half!" The visual is unmistakable: modern formats compress dramatically better.
4. **22s**: Reader scrolls to Zone 1 (Srcset Builder). Clicks "Add breakpoint" twice, setting breakpoints at 768px and 1200px. The `<img>` tag in the output updates live.
5. **32s**: Reader drags the viewport slider. As it crosses 768px, the highlighted srcset entry changes from `photo-480.jpg` to `photo-800.jpg`. The connection clicks: the browser picks the right image.
6. **40s**: Reader scrolls to Zone 2 (Lazy Loading). Clicks "Load Page". The eager side erupts with 20 simultaneous requests, counter racing to 4.2MB. The lazy side loads 4 images, counter stops at 0.8MB. The visual contrast is stark.
7. **50s**: Reader scrolls the lazy mini-page. Images load on demand. Waterfall bars extend one by one. The reader understands: lazy loading defers what isn't visible.

### Data & State Shape

```typescript
type ImageFormat = 'avif' | 'webp' | 'jpeg' | 'png';

interface FormatSize {
  format: ImageFormat;
  sizeKB: number;          // computed from quality
  color: string;           // CSS var
}

interface Breakpoint {
  id: string;
  viewportWidth: number;   // px
  imageWidth: number;      // px
}

interface WaterfallBar {
  imageIndex: number;      // 0..19
  loadTimeMs: number;      // simulated
  loaded: boolean;
  startMs: number;         // stagger offset
}

interface ImagePerfState {
  activeZone: 'formats' | 'srcset' | 'lazy';

  // Zone 0
  quality: number;                    // 1-100
  formatSizes: FormatSize[];          // derived from quality

  // Zone 1
  breakpoints: Breakpoint[];          // user-defined, max 5
  viewportWidth: number;              // 320-1920
  activeSourceIndex: number;          // derived from viewport + breakpoints
  generatedHTML: string;              // derived

  // Zone 2
  loadState: 'ready' | 'loading' | 'comparing' | 'scrolling';
  eagerWaterfall: WaterfallBar[];     // 20 items
  lazyWaterfall: WaterfallBar[];      // 20 items, loaded based on scroll
  lazyScrollTop: number;              // scroll position of lazy mini-page
  eagerBytesLoaded: number;           // cumulative
  lazyBytesLoaded: number;            // cumulative
}
```

### Primitives & Props

**DemoSandbox** -- Wraps the entire explorable with zone tabs.
```tsx
<DemoSandbox title="Image Performance">
  <DemoSandbox.Tabs options={['formats', 'srcset', 'lazy']} value={activeZone} onChange={setActiveZone} />
  {/* zone content */}
</DemoSandbox>
```

**Dial** -- Quality slider in Zone 0, viewport width slider in Zone 1.
```tsx
<Dial label="Quality" value={quality} min={1} max={100} step={1} format={(v) => `${v}%`} onChange={setQuality} />
<Dial label="Viewport" value={viewportWidth} min={320} max={1920} step={10} format={(v) => `${v}px`} onChange={setViewportWidth} />
```

**AnimatedCounter** -- Byte counters in Zone 2.
```tsx
<AnimatedCounter value={bytesLoaded} format={(v) => `${(v / 1024).toFixed(1)}MB`} color={counterColor} />
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Quality at extremes (1 or 100)** | Size data interpolates to min/max. At quality 1, AVIF may be smaller than the image header -- clamp to realistic minimums (8KB AVIF, 12KB WebP, 20KB JPEG). |
| **Too many breakpoints** | Max 5 breakpoints. "+" button disables at limit with tooltip "max 5 breakpoints". |
| **Breakpoints out of order** | Auto-sort breakpoints by viewport width. Dragging past another breakpoint swaps their order. |
| **Viewport narrower than smallest breakpoint** | The smallest source is always active. Highlight the first srcset entry. |
| **Scroll lazy page past all images** | All 20 bars fill. Lazy counter reaches same total as eager (4.2MB). But the WATERFALL shows the difference: eager loaded all at once, lazy loaded on demand. Time-to-complete is similar, but initial load was 80% less. |
| **Click "Load" while already loaded** | Button changes to "Reset". Clears waterfall, resets counters. |
| **Copy srcset with no breakpoints** | Generates a simple `<img src="photo.jpg">` without srcset/sizes. A note appears: "Add breakpoints to generate srcset". |

### Cross-Lesson Connections

- **perf-css parallel**: CSS covers render-blocking stylesheets; this stop covers render-blocking images. Both are asset types that impact load performance.
- **perf-cwv direct link**: The LCP metric in perf-cwv is often an image. The lazy-loading race here explains why lazy-loading a hero image (above the fold) hurts LCP -- the exact issue readers diagnose in perf-cwv.
- **perf-assets complement**: This stop covers raster images; perf-assets covers fonts. Together they span the non-code assets that dominate page weight.
- **perf-hints connection**: The srcset builder here teaches responsive images; perf-hints teaches preloading those images for even faster delivery.

---

## perf-assets -- Font & Asset Loading Scrollytelling
**Format**: scrollytelling | **Effort**: medium

### Interaction State Machine

```
                     +---------------------+
                     |    SCROLL_IDLE      |
                     | stepIndex: 0        |
                     | mode: "scrolly"     |
                     +---------------------+
                          |  IntersectionObserver fires
                          v
                     +---------------------+
                     |    STEP_ACTIVE      |
                     | stepIndex: 0..4     |
                     | animating: true     |
                     +---------------------+
                          |  font-loading animation plays
                          v
                     +---------------------+
                     |   STEP_PLAYING      |
                     | playbackMs: 0..N    |
                     | (font load sim)     |
                     +---------------------+
                          |  playback complete (1500-2000ms)
                          v
                     +---------------------+
                     |    STEP_SETTLED     |
                     | clsValue: number    |
                     | animating: false    |
                     +---------------------+
                          |  scroll to next step
                          v
                          (repeat for steps 0-4)
                          |  step 4 settled + scroll past
                          v
                     +---------------------+
                     |  SCROLLY_COMPLETE   |
                     | mode: "interactive" |
                     +---------------------+
                          |  300ms transition
                          v
                     +---------------------+
                     |   STRATEGY_SELECT   |
                     | selectedStrategy: 0 |
                     +---------------------+
                          |  click a strategy button
                          v
                     +---------------------+
                     |   REPLAYING         |
                     | playbackMs: 0..N    |
                     | (replay animation)  |
                     +---------------------+
                          |  replay complete
                          v
                     +---------------------+
                     |   STRATEGY_RESULT   |
                     | clsValue: number    |
                     | comparison visible  |
                     +---------------------+
                          |  click different strategy
                          v
                     +---------------------+
                     |   REPLAYING         |
                     +---------------------+
```

**Data driving each state:**
- `STEP_ACTIVE / STEP_PLAYING`: `stepIndex` (0-4), `playbackMs` (elapsed simulation time), `fontLoaded` boolean
- `STEP_SETTLED`: `clsValue` for the current strategy, `textVisible` boolean, `fontSwapped` boolean
- `STRATEGY_SELECT / REPLAYING`: `selectedStrategy: FontDisplayStrategy`, `playbackMs`, per-strategy CLS comparison array

### Visual Choreography

**Sticky visual container**: 680px wide, 400px tall. Represents a mock webpage focused on text content.

**Mock page elements (consistent across all steps)**:
- Nav bar: 40px tall, `var(--color-surface-2)`, with 3 text items (simulated nav links).
- Heading area: 48px tall. Text: "Performance Matters" in `var(--text-2xl)`.
- Body text: 4 lines of paragraph text, each 14px tall, spaced 24px apart. The actual text is rendered as rounded rectangles (text simulation bars) when font is not loaded, then replaced with real text when loaded.
- Sidebar: right 30%, with 2 small text blocks.

**Text rendering states (the core visual)**:
- **Invisible (FOIT)**: text lines are completely invisible -- the space is there but nothing renders. Just blank gaps where text should be.
- **System font**: text renders in `system-ui` at `var(--text-base)`. Slightly different metrics than custom font (line height differs by ~3px).
- **Custom font**: text renders in a visibly different font (e.g., use `var(--font-display)` or a serif-like font to make the swap obvious). Metrics shift: heading is 2px taller, body lines are 1px shorter.
- **Size-adjusted system font**: text renders in `system-ui` but with `size-adjust: 108%` simulation -- metrics match the custom font exactly. No shift on swap.

**Step animations (each plays on scroll-into-view)**:

1. **Step 0 (FOIT -- default)**: Text areas start invisible (opacity 0). A simulated loading spinner (16px, `var(--color-muted)`, rotating) appears where the heading would be. After 1500ms, ALL text pops in at once (opacity 0 -> 1, 80ms, no easing -- sudden). CLS counter: `0.00` (no shift since text was invisible, but the page was blank for 1.5s). A "blank for 1.5s" annotation pulses in `var(--color-error)`.

2. **Step 1 (font-display: swap / FOUT)**: System font text appears immediately (opacity 0 -> 1 over 100ms). After 1000ms, text swaps to custom font: each line physically shifts position (heading grows 2px, body lines shift down by 1-2px cumulatively). Shift animation: 80ms, `SPRING.quick`. CLS counter animates to `0.08`. The shift is visually noticeable -- content below the heading jumps.

3. **Step 2 (font-display: fallback)**: System font appears immediately. Two sub-scenarios play sequentially:
   - Scenario A (fast load, 400ms): custom font loads within timeout -> swap happens, small CLS `0.04`.
   - Scenario B (slow load, 3000ms): timeout expires -> system font stays. No swap. CLS `0.00`. A label: "font stayed system -- no swap" in `var(--color-success)`.
   Both scenarios play within the step's scroll position, A first (2s), then B (2s), with a "fast network / slow network" label switching between them.

4. **Step 3 (font-display: optional)**: System font appears immediately. No swap happens (first visit). CLS: `0.00`. A "cached for next visit" icon (small disk icon, `var(--color-success)`) appears. Then the animation replays as "second visit": custom font loads from cache instantly, appears on load. CLS still `0.00`.

5. **Step 4 (size-adjusted fallback)**: System font appears with size-adjust applied -- the metrics match the custom font. After 800ms, font swaps. Text stays in EXACTLY the same position. No visible shift. CLS: `0.00`. A side-by-side comparison flashes briefly: "without size-adjust" (content jumps) vs "with size-adjust" (content stays). Flash lasts 1.5s.

**CLS counter**: Fixed bottom-left of sticky visual. Pill shape, mono `var(--text-sm)` bold.
- CLS 0: `var(--color-success)` text and border.
- CLS 0.01-0.09: `var(--diagram-layer-3)` (yellow).
- CLS 0.1+: `var(--color-error)`.
- Value animates with counting spring 400ms `SPRING.gentle`.

**Strategy label**: Fixed top-left. Shows current strategy name in mono `var(--text-sm)`. E.g., "font-display: swap". Background: `var(--color-surface-2)` pill. Changes at each step with `TRANSITION.crossfade`.

**Post-scroll interactive**:
- 5 strategy buttons in a row (pill-shaped, same as the 5 scroll steps). Active: `var(--color-accent)` bg.
- Below: the same mock page, which replays the font-loading animation for the selected strategy.
- CLS comparison bar: all 5 strategies shown as horizontal bars, sorted by CLS value. The selected one is highlighted.

**Reduced motion**: Font swap is an instant cut. CLS counter updates instantly. No simulated loading delays -- just show the end state with labels.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees the mock page with the heading "Performance Matters" visible. Strategy label: "default (FOIT)". The page looks normal.
2. **4s**: Reader scrolls into step 0. The text DISAPPEARS (simulating a fresh load). For 1.5 seconds, the page shows blank spaces where text should be. Then text pops in all at once. The reader felt the delay.
3. **12s**: Reader scrolls to step 1 (swap). System font text appears IMMEDIATELY -- the page is readable right away. After 1 second, the text visibly shifts as the custom font loads. Heading gets slightly bigger, content below jumps down. CLS counter ticks to 0.08.
4. **22s**: Reader scrolls to step 2 (fallback). Same immediate system text. Two scenarios play: fast load swaps with small CLS, slow load stays system font with zero CLS. The reader sees the tradeoff: fallback is a timeout safety net.
5. **32s**: Reader scrolls to step 3 (optional). System font shows, no swap on first visit. Then "second visit" plays: custom font appears from cache. Zero CLS both times. The most conservative approach.
6. **40s**: Reader scrolls to step 4 (size-adjusted). System font appears, looks almost identical to custom font. Swap happens -- NOTHING MOVES. CLS: 0.00. The side-by-side comparison drives it home: this is the pro move.
7. **50s**: Scroll completes. Strategy picker appears. Reader clicks between strategies, watching the mock page replay each behavior. The CLS comparison bar makes the differences quantitative.

### Data & State Shape

```typescript
type FontDisplayStrategy = 'default' | 'swap' | 'fallback' | 'optional' | 'size-adjusted';

interface FontLoadSimulation {
  strategy: FontDisplayStrategy;
  textVisibleAtMs: number;          // when text first appears
  fontSwapAtMs: number | null;      // when custom font replaces system (null = no swap)
  clsValue: number;                 // cumulative layout shift
  totalDurationMs: number;          // how long the simulation runs
}

// Pre-defined simulation data
const SIMULATIONS: Record<FontDisplayStrategy, FontLoadSimulation> = {
  default:       { strategy: 'default',       textVisibleAtMs: 1500, fontSwapAtMs: 1500, clsValue: 0.00, totalDurationMs: 2000 },
  swap:          { strategy: 'swap',          textVisibleAtMs: 0,    fontSwapAtMs: 1000, clsValue: 0.08, totalDurationMs: 1500 },
  fallback:      { strategy: 'fallback',      textVisibleAtMs: 0,    fontSwapAtMs: 400,  clsValue: 0.04, totalDurationMs: 1200 },
  optional:      { strategy: 'optional',      textVisibleAtMs: 0,    fontSwapAtMs: null,  clsValue: 0.00, totalDurationMs: 1500 },
  'size-adjusted': { strategy: 'size-adjusted', textVisibleAtMs: 0,  fontSwapAtMs: 800,  clsValue: 0.00, totalDurationMs: 1200 },
};

interface FontLoadState {
  mode: 'scrolly' | 'interactive';
  stepIndex: number;                    // 0-4
  animating: boolean;

  // Playback state
  playbackMs: number;                   // current time in simulation
  textVisible: boolean;                 // derived from playbackMs + strategy
  fontLoaded: boolean;                  // derived
  currentFont: 'invisible' | 'system' | 'custom' | 'size-adjusted-system';

  // CLS tracking
  clsValue: number;                     // current CLS
  clsHistory: { strategy: FontDisplayStrategy; cls: number }[]; // for comparison bar

  // Post-scroll interactive
  selectedStrategy: FontDisplayStrategy;
  replayActive: boolean;
}
```

### Primitives & Props

**ScrollytellingShell** -- Wraps the entire lesson.
```tsx
<ScrollytellingShell
  steps={fontDisplaySteps}
  renderVisual={(stepIndex) => <FontLoadVisual step={stepIndex} />}
/>
```

**DemoSandbox** -- Wraps the post-scroll strategy picker.
```tsx
<DemoSandbox title="Font Loading Strategies">
  <DemoSandbox.Controls>
    <DialSegment label="Strategy" options={strategies} value={selected} onChange={setSelected} />
  </DemoSandbox.Controls>
  <FontLoadReplay strategy={selected} />
</DemoSandbox>
```

**AnimatedCounter** -- CLS counter.
```tsx
<AnimatedCounter value={clsValue} format={(v) => v.toFixed(2)} color={clsColor} />
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Scroll backward** | Replay the previous step's animation. Each step is self-contained and replays from the beginning when scrolled back into view. |
| **Rapid scroll through all 5 steps** | Each step plays a compressed version (all timings / 3) if the reader scrolls through in < 2s. Full animation only when step is held for > 1s. |
| **Resize during text simulation** | Mock page uses relative units (% widths). Text bars reflow. CLS values remain constant (they're pre-computed, not measured). |
| **Strategy picker: rapid clicking** | Debounce 200ms. Cancel previous replay animation. New strategy starts fresh. |
| **Step 2 (fallback) two-scenario playback** | If reader scrolls away before both scenarios play, mark step as "partially seen." On re-scroll, restart from scenario A. |
| **Reduced motion + text animations** | Instead of simulated delays, show a static before/after split: left half shows system font, right half shows custom font, with CLS value labeled. |

### Cross-Lesson Connections

- **perf-images complement**: This stop covers fonts; perf-images covers raster images. Together: all non-code asset optimization.
- **perf-cwv direct input**: CLS is one of the three Core Web Vitals in perf-cwv. The CLS numbers demonstrated here (0.00 to 0.08) directly appear as the CLS gauge values in the CWV detective game.
- **perf-hints connection**: `preload` for fonts is a common optimization. Readers learn about font-display here, then learn about preloading fonts in perf-hints.
- **perf-bundle indirect**: Fonts are assets that the bundler can inline (woff2 base64) or keep external. perf-bundle's "assets" could reference font loading strategies.

---

## perf-cwv -- Core Web Vitals Detective Game
**Format**: explorable | **Effort**: large

### Interaction State Machine

```
                     +---------------------+
                     |    INITIAL_LOAD     |
                     | page loading...     |
                     | gauges animating in |
                     +---------------------+
                          |  page "loads" (2s simulated)
                          v
                     +---------------------+
                     |    PAGE_BROKEN      |
                     | lcpFixed: false     |
                     | inpFixed: false     |
                     | clsFixed: false     |
                     | gauges: all red     |
                     +---------------------+
                          |
           +--------------+--------------+
           |              |              |
           v              v              v
     +-----------+  +-----------+  +-----------+
     | HOVER_LCP |  | CLICK_INP |  | WATCH_CLS |
     | (element  |  | (feel the |  | (see the  |
     |  hunt)    |  |  delay)   |  |  shift)   |
     +-----------+  +-----------+  +-----------+
           |              |              |
           v              v              v
     +-----------+  +-----------+  +-----------+
     | FOUND_LCP |  | FELT_INP  |  | SAW_CLS   |
     | (element  |  | (delay    |  | (shift    |
     |  highlighted) |  felt)   |  |  visible) |
     +-----------+  +-----------+  +-----------+
           |              |              |
           v              v              v
     +-----------+  +-----------+  +-----------+
     | FIX_LCP   |  | FIX_INP   |  | FIX_CLS   |
     | toggle on |  | toggle on |  | toggle on |
     | gauge     |  | gauge     |  | gauge     |
     | animates  |  | animates  |  | animates  |
     +-----------+  +-----------+  +-----------+
           |              |              |
           +-------+------+------+------+
                   |             |
                   v             v
           (any 2 fixed)  (all 3 fixed)
                   |             |
                   v             v
          +-----------+   +-----------+
          | PROGRESS  |   | ALL_PASS  |
          | (partial  |   | celebration|
          | fixes)    |   | confetti  |
          +-----------+   +-----------+
```

**Data driving each state:**
- `PAGE_BROKEN`: all three `*Fixed` booleans false, gauge values at broken levels
- `HOVER_LCP`: `hoveredElement: string | null`, `lcpElement: 'hero-image'` (the correct answer)
- `FELT_INP`: `inpClicked: boolean` (reader has clicked the slow button at least once)
- `SAW_CLS`: `clsTriggered: boolean` (page has loaded and shift was visible)
- `FIX_*`: respective `*Fixed` boolean flips true, gauge animates
- `ALL_PASS`: all three true, celebration state active

### Visual Choreography

**Layout**: Two regions. Top 60%: mock webpage. Bottom 40%: diagnostic panel with gauges and toggles.

**Mock webpage (680x300px)**:
- `var(--color-surface)` bg, 1px `var(--color-border)` border, `var(--radius-2)`.
- Navigation: 36px tall, `var(--color-surface-2)`, 3 nav text items.
- Hero image: 400x180px placeholder. Initially shows a loading spinner (when lazy-loaded, pre-fix). After LCP fix: shows a gradient image immediately (simulating eager load).
  - Before fix: spinner for 2.5s, then image fades in over 300ms.
  - After fix: image present on load, no spinner.
  - LCP element highlight: when reader hovers it, a 2px `var(--diagram-layer-0)` (blue) dashed border appears with label "LCP Element" in a small floating badge.
- Slow button: below the hero. Styled as a primary CTA: "Load Dashboard" text, `var(--color-accent)` bg, `var(--radius-2)`. 160x44px.
  - Before INP fix: clicking triggers a 200ms freeze (use `setTimeout` to simulate). Button doesn't depress immediately. Reader FEELS the lag.
  - After INP fix: button responds instantly (< 16ms visual feedback).
  - Visual feedback: button depresses (scale 0.97) and a loading spinner appears. Before fix: 200ms delay before depress. After fix: depress is instant.
- Image grid below button: 3 images (120x80px each) in a row.
  - Before CLS fix: images have no width/height attributes. When they "load" (staggered 300ms, 600ms, 900ms), the content below them jumps down. Each jump is ~80px.
  - After CLS fix: images have explicit dimensions. Space is pre-reserved. No jumps.
- Text paragraph below images: 3 lines, shifts down with CLS issues.

**Three gauges (diagnostic panel, bottom 40%)**:
- Three circular gauges in a row, each 120x120px, spaced evenly.
- Each gauge: SVG circle with a colored arc (stroke-dasharray animation).
  - LCP gauge: label "LCP" above. Center value: "4.2s" (broken) / "1.8s" (fixed). Arc color: `var(--color-error)` when > 2.5s, `var(--diagram-layer-3)` when 2.5-4s, `var(--color-success)` when < 2.5s.
  - INP gauge: label "INP". Center: "240ms" / "45ms". Thresholds: > 200ms red, 100-200ms yellow, < 100ms green.
  - CLS gauge: label "CLS". Center: "0.42" / "0.01". Thresholds: > 0.1 red, 0.05-0.1 yellow, < 0.05 green.
- Arc animation on fix: the arc sweeps from the broken angle to the fixed angle over 800ms with `SPRING.gentle`. The center value counts down with a spring counter. Color transitions at threshold boundaries.
- Pulse: when the reader triggers a metric issue (clicks slow button, sees shift), the corresponding gauge pulses once: scale 1 -> 1.08 -> 1 over 400ms, border glows `var(--color-error)` with `LOOP.glow` for 2 cycles.

**Fix toggles**: Below each gauge. Uses `DialToggle` component.
- LCP toggle: "Fix LCP: eager load hero". Off: `loading="lazy"`. On: `loading="eager"`.
- INP toggle: "Fix INP: async handler". Off: sync 200ms. On: yielded async.
- CLS toggle: "Fix CLS: explicit dimensions". Off: no width/height. On: width/height set.

**Celebration (all three green)**:
- All three gauges simultaneously pulse `var(--color-success)` (scale 1 -> 1.1 -> 1, 400ms).
- A banner slides down from the top of the mock page: "Passing Core Web Vitals" in `var(--color-success)`, mono `var(--text-lg)` bold, `var(--color-surface-2)` bg, `var(--radius-2)`. Entry: translateY -40px -> 0, `SPRING.snappy`.
- Subtle confetti: 12 small circles (4px each, assorted `--diagram-layer-*` colors) scatter from center, gravity-pulled downward over 1.5s, opacity 1 -> 0. Reduced motion: banner only, no confetti.

**Reduced motion**: Gauges snap to values. No pulse animations. Button delay is still simulated (the teaching requires feeling it). CLS jumps are shown as a before/after split view instead of animation.

### Teaching Flow (First 60 Seconds)

1. **0s**: The mock page "loads." Hero image shows a spinner. Three gauges at the bottom are filling to their broken values: LCP 4.2s (red arc), INP 240ms (red), CLS 0.42 (red). The page looks broken.
2. **5s**: Reader hovers elements on the mock page. When they hover the hero image, a blue dashed border appears with "LCP Element" badge. The connection: the hero image IS the LCP element.
3. **12s**: Reader notices the hero image is still loading (spinner). They look at the LCP gauge: 4.2s. They see the "Fix LCP" toggle: "eager load hero." They toggle it ON. The spinner disappears, the image appears instantly. The LCP gauge sweeps from 4.2s to 1.8s, arc turning green. First fix.
4. **22s**: Reader clicks the "Load Dashboard" button. There's a noticeable ~200ms delay before the button depresses. The INP gauge pulses red. They FELT the delay. They toggle "Fix INP." Click again -- instant response. INP gauge sweeps from 240ms to 45ms (green).
5. **35s**: Reader watches the image grid load. Without the CLS fix, each image pops in and pushes the paragraph down. Three visible jumps. CLS gauge pulses at each jump. They toggle "Fix CLS." The page reloads -- images have reserved space, nothing jumps. CLS sweeps from 0.42 to 0.01 (green).
6. **48s**: All three gauges are green. The "Passing Core Web Vitals" banner slides in. Confetti bursts. The reader has diagnosed and fixed all three issues through direct experimentation.

### Data & State Shape

```typescript
interface GaugeConfig {
  metric: 'lcp' | 'inp' | 'cls';
  label: string;
  brokenValue: number;
  fixedValue: number;
  unit: string;              // 's', 'ms', '' (unitless for CLS)
  thresholds: {
    good: number;            // below this = green
    needsImprovement: number; // below this = yellow, above = red
  };
}

const GAUGES: GaugeConfig[] = [
  { metric: 'lcp', label: 'LCP', brokenValue: 4.2,  fixedValue: 1.8,  unit: 's',  thresholds: { good: 2.5, needsImprovement: 4.0 } },
  { metric: 'inp', label: 'INP', brokenValue: 240,  fixedValue: 45,   unit: 'ms', thresholds: { good: 200, needsImprovement: 500 } },
  { metric: 'cls', label: 'CLS', brokenValue: 0.42, fixedValue: 0.01, unit: '',   thresholds: { good: 0.1, needsImprovement: 0.25 } },
];

interface CWVState {
  // Page state
  pageLoaded: boolean;              // initial load complete
  hoveredElement: string | null;    // element under pointer
  inpClicked: boolean;              // reader has clicked the slow button
  clsTriggered: boolean;           // reader has seen the layout shift

  // Fix toggles
  lcpFixed: boolean;
  inpFixed: boolean;
  clsFixed: boolean;

  // Gauge animation
  lcpValue: number;                 // current animated value (4.2 -> 1.8)
  inpValue: number;                 // 240 -> 45
  clsValue: number;                 // 0.42 -> 0.01
  pulsingGauge: 'lcp' | 'inp' | 'cls' | null;

  // Celebration
  allPassing: boolean;              // derived: all three fixed
  celebrationPlayed: boolean;       // only play once
}

// Derived:
// - gaugeColor(value, thresholds) = value < good ? 'var(--color-success)' : value < needsImprovement ? 'var(--diagram-layer-3)' : 'var(--color-error)'
// - arcAngle(value, min, max) = (value - min) / (max - min) * 270 (degrees, starting from 135)
// - allPassing = lcpFixed && inpFixed && clsFixed
```

### Primitives & Props

**DemoSandbox** -- Wraps the entire detective game.
```tsx
<DemoSandbox title="Core Web Vitals Lab" minHeight={600}>
  <MockWebpage {...pageState} />
  <GaugeDashboard gauges={gauges} />
</DemoSandbox>
```

**DialToggle** -- Three fix toggles below gauges.
```tsx
<DialToggle label="Fix LCP" value={lcpFixed} onChange={setLcpFixed} />
<DialToggle label="Fix INP" value={inpFixed} onChange={setInpFixed} />
<DialToggle label="Fix CLS" value={clsFixed} onChange={setClsFixed} />
```

**CircularGauge** -- New primitive needed. SVG arc gauge with animated value.
```tsx
<CircularGauge
  label="LCP"
  value={lcpValue}
  min={0}
  max={6}
  unit="s"
  thresholds={{ good: 2.5, needsImprovement: 4.0 }}
  pulsing={pulsingGauge === 'lcp'}
  size={120}
/>
```
Implementation: SVG `<circle>` with `stroke-dasharray` and `stroke-dashoffset` for the arc. `framer-motion` animates `stroke-dashoffset` on value change. Center text uses `AnimatedCounter`. Arc color derived from thresholds.

**AnimatedCounter** -- Center values inside each gauge.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Fixes applied in any order** | Each fix is independent. Gauges animate individually. Celebration only fires when all three are green, regardless of order. |
| **Toggle fix off after applying** | Gauge animates BACK to broken value. Page reverts. If all three were green, celebration banner slides out (reverse animation). Confetti does not replay on re-achieving all green (unless page is refreshed). |
| **Rapid toggle on/off** | Debounce gauge animation by 100ms. If toggled off before animation completes, reverse immediately from current position (don't finish going to fixed then reverse). |
| **Click slow button after INP fix** | Button responds instantly. No gauge pulse. This is the intended "feel the fix" moment. |
| **Hover LCP element after LCP fix** | Blue border still appears with "LCP Element" badge, but now also shows "loading=eager" annotation. Educational even after fix. |
| **CLS images load while reader is scrolled away** | Images always "load" fresh when the component mounts or when CLS toggle changes. The shift is replayed each time for teaching purposes. |
| **Mobile / narrow viewport** | Gauges stack vertically (1 column) below 500px. Mock page scales to `width: 100%`. Toggles go full width. Minimum touch target: 44x44px. |
| **Screen reader** | Gauges use `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label`. Toggles are proper switches. INP delay simulation includes `aria-busy="true"` during the 200ms. |

### Cross-Lesson Connections

- **Synthesis stop**: This is the capstone of the performance section. It combines LCP (from perf-images lazy loading + perf-css critical CSS), INP (from perf-js main thread blocking), and CLS (from perf-assets font loading).
- **perf-js provides INP context**: The "200ms delay" on the button directly mirrors the "heavy sync JS" concept from perf-js. A reader who dragged scripts to "deferred" in perf-js understands why this fix works.
- **perf-images provides LCP context**: The hero image lazy-loading issue mirrors Zone 2 of perf-images. A reader who saw the eager/lazy waterfall comparison knows why eager loading fixes LCP.
- **perf-assets provides CLS context**: The layout shift from images without dimensions echoes the font-swap CLS from perf-assets. Both are CLS causes.
- **Uses Google's real thresholds**: LCP < 2.5s, INP < 200ms, CLS < 0.1. These are production-relevant numbers that readers will see in Lighthouse and CrUX reports.

---

## perf-bundle -- Bundle Optimization Scrollytelling
**Format**: scrollytelling | **Effort**: large

### Interaction State Machine

```
                     +---------------------+
                     |    SCROLL_IDLE      |
                     | stepIndex: 0        |
                     | mode: "scrolly"     |
                     +---------------------+
                          |  IntersectionObserver fires
                          v
                     +---------------------+
                     |    STEP_ACTIVE      |
                     | stepIndex: 0..4     |
                     | animating: true     |
                     +---------------------+
                          |  treemap animation completes
                          v
                     +---------------------+
                     |    STEP_SETTLED     |
                     | treemapConfig: {...}|
                     | loadSize: number    |
                     +---------------------+
                          |  scroll to next step
                          v
                          (repeat for steps 0-4)
                          |  reach step 4 settled
                          v
                     +---------------------+
                     |  SCROLLY_COMPLETE   |
                     | mode: "interactive" |
                     +---------------------+
                          |  300ms transition
                          v
                     +---------------------+
                     |   TREEMAP_IDLE      |
                     | mode: "interactive" |
                     | modules: Module[]   |
                     | chunks: Chunk[]     |
                     +---------------------+
                          |  pointerdown on a module
                          v
                     +---------------------+
                     |   MODULE_DRAGGING   |
                     | draggedModule: id   |
                     | dragPos: {x,y}      |
                     | sourceChunk: id     |
                     +---------------------+
                          |  drag over a chunk
                          v
                     +---------------------+
                     |   CHUNK_HOVER       |
                     | targetChunk: id     |
                     | (chunk highlights)  |
                     +---------------------+
                          |  drop
                          v
                     +---------------------+
                     |   MODULE_DROPPED    |
                     | module moves chunk  |
                     | treemap reflows     |
                     | counter animates    |
                     +---------------------+
                          |  reflow settles (600ms)
                          v
                     +---------------------+
                     |   TREEMAP_IDLE      |
                     +---------------------+
```

**Data driving each state:**
- `STEP_ACTIVE`: `stepIndex` (0-4), `animating`, derived treemap layout from step config
- `STEP_SETTLED`: `loadSizeKB` (1200 -> 340 -> 280 -> 190 -> 165), `treemapRects: TreemapRect[]`
- `MODULE_DRAGGING`: `draggedModule: ModuleId`, `dragPos`, `sourceChunk: ChunkId`
- `MODULE_DROPPED`: `targetChunk`, `prevLoadSize`, `nextLoadSize` (for counter animation)

### Visual Choreography

**Sticky visual container**: 680px wide, 460px tall. `var(--color-surface)` bg.

**Treemap layout (squarified algorithm)**:
- Container: 640x340px, centered, 1px `var(--color-border)` border.
- Rectangles: each module is a rectangle, area proportional to byte size. Use squarified treemap algorithm (Bruls, Huizing, van Wijk) for near-square aspect ratios.
- Rectangle fill colors by chunk:
  - Route-home (initial): `var(--diagram-layer-0)` (blue)
  - Route-dashboard: `var(--diagram-layer-1)` (green)
  - Route-settings: `var(--diagram-layer-2)` (purple)
  - Vendor (react, utilities): `var(--diagram-layer-4)` (orange)
  - On-demand (dynamic import): `var(--diagram-layer-3)` (yellow)
- Rectangle styling: 1px gap between siblings (`var(--color-surface)` gap). `var(--radius-1)` corners. Fill at 80% opacity.
- Labels: inside each rectangle, mono `var(--text-xs)`, white, centered. Show module name + size: "react 42KB". If rectangle < 60px in either dimension, show only name. If < 30px, hide label.
- "Initial load" highlight: a 3px dashed `var(--color-accent)` border around rectangles that are part of the initial load. Non-initial rectangles have 40% opacity.

**Step animations:**

1. **Step 0 (single bundle, 1.2MB)**: One massive rectangle fills the entire treemap container. It contains sub-rectangles for all modules, all the same color (`var(--diagram-layer-0)`). Labels: "react", "dashboard", "settings", "charting-lib", "utils", etc. Waterfall indicator: a single bar below the treemap, full width, `var(--diagram-layer-0)`. Label: "1 request, 1.2MB".
   - Entry: rectangle fades in and scales from 0.95 to 1.0 over 400ms `SPRING.gentle`.

2. **Step 1 (route splitting)**: The single rectangle cracks along module boundaries. Animation sequence:
   - Hairline fracture lines (1px `var(--color-surface)`) appear at chunk boundaries, 200ms.
   - Chunks physically separate: 8px gap grows between chunks over 500ms `SPRING.snappy`.
   - Chunks recolor: each chunk gets its own color (blue, green, purple, orange).
   - Layout recomputes: squarified algorithm runs for each chunk independently.
   - "Initial load" highlight box wraps only the blue chunk (route-home, 340KB).
   - Non-initial chunks: opacity drops to 40%.
   - Waterfall: single bar splits into 4 shorter bars (staggered 200ms). Only first bar highlighted. Counter: 1.2MB -> 340KB.

3. **Step 2 (tree shaking)**: Within each chunk, unused export rectangles are identified:
   - Target rectangles: opacity fades from 80% to 15% over 400ms.
   - Then: height/width shrinks to 0 over 300ms (other rectangles expand to fill the space, squarified recompute).
   - A strikethrough line sweeps across each fading rectangle.
   - Total of ~60KB removed. Counter: 340KB -> 280KB.
   - Small "shaken" particles: 3-4 tiny 3px squares in the fading color drift downward and disappear (2px/frame for 500ms). Reduced motion: skip particles.

4. **Step 3 (dynamic import)**: The charting library rectangle (largest yellow rectangle, ~90KB):
   - Lifts 6px off the treemap surface (box-shadow intensifies).
   - Slides right and down to a separate "Loaded on Demand" zone (dashed outline box, 200px wide, positioned right of the main treemap).
   - The on-demand zone has a lazy-load icon (clock with arrow) in `var(--color-muted)`.
   - Animation: lift 150ms, slide 500ms `SPRING.gentle`, settle 100ms.
   - Main treemap reflows to fill the gap, 400ms `SPRING.snappy`.
   - Counter: 280KB -> 190KB.

5. **Step 4 (common chunk extraction)**: Shared dependencies (react, utils -- appearing in multiple chunks) glow briefly (border 2px `var(--color-accent)`, 300ms), then slide together into a new "Vendor" chunk in the bottom-right of the treemap.
   - Migration animation: each shared module rectangle lifts, slides to the vendor area, 400ms `SPRING.gentle`, staggered 100ms per module.
   - Vendor chunk gets a cache icon (small circle with checkmark) in the top-right corner.
   - Counter: 190KB -> 165KB.
   - Waterfall below: vendor bar gets a cache icon. Label: "cached independently."

**Running counter**: Fixed top-right of sticky container. Large mono `var(--text-lg)` bold. Format: "Initial Load: {value}KB". Background: `var(--color-surface-2)` pill. Value counting spring 500ms. Color: > 500KB `var(--color-error)`, 200-500KB `var(--diagram-layer-3)`, < 200KB `var(--color-success)`.

**Waterfall mini-chart**: Below the treemap, 60px tall. Horizontal bars showing requests. Each bar: chunk color, width proportional to size, 16px tall, `var(--radius-1)`. Highlighted bar (initial load): full opacity + `var(--color-accent)` left border 3px. Non-initial: 30% opacity.

**Post-scroll interactive (drag-to-reorganize treemap)**:
- Same treemap as step 4 final state, but all rectangles are draggable.
- Chunks are labeled drop zones. Modules can be dragged between chunks.
- On drop: treemap reflows with `SPRING.snappy`. Counter recalculates.
- "Initial load" label marks which chunks load initially.
- Moving a module INTO the initial chunk: counter goes UP. Moving OUT: counter goes DOWN.

**Reduced motion**: Chunks snap to position. No lift/slide animations. Fracture lines appear instantly. Counter values update immediately. Treemap reflows are instant.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees one massive rectangle filling the treemap. Every module crammed inside. Counter: "Initial Load: 1,200KB" in red. Waterfall: single bar spanning the full width.
2. **6s**: Reader scrolls to step 1. Fracture lines appear. Chunks physically separate and recolor. The route-home chunk (blue) gets the "initial load" highlight. Everything else dims. Counter drops to 340KB. Waterfall splits into 4 bars with only the first highlighted.
3. **16s**: Step 2. Inside the blue chunk, some rectangles fade to ghost outlines and shrink away. Tree shaking in action. Counter: 280KB. The visual is satisfying -- dead code literally disappearing.
4. **24s**: Step 3. The charting library (big yellow rectangle) lifts off the treemap and floats to the "on-demand" zone. The main treemap closes the gap. Counter: 190KB. The reader sees that heavy libraries don't need to load upfront.
5. **34s**: Step 4. React and utils modules glow, then migrate to a "Vendor" chunk with a cache icon. Counter: 165KB. The vendor chunk is clearly labeled "cached independently" -- the reader understands caching strategy.
6. **42s**: Scroll completes. The treemap becomes interactive. Reader drags "charting-lib" back into the initial chunk. Counter jumps from 165KB to 255KB instantly. They drag it back to on-demand -- 165KB again. Direct cause and effect.
7. **52s**: Reader tries dragging React out of the vendor chunk and into route-home. Counter increases slightly (React is no longer shared/cached separately). The teaching: common dependencies should be extracted, not duplicated.

### Data & State Shape

```typescript
type ModuleId = string; // 'react' | 'react-dom' | 'utils' | 'charting-lib' | 'route-home' | 'route-dashboard' | ...
type ChunkId = string;  // 'initial' | 'dashboard' | 'settings' | 'vendor' | 'on-demand'

interface Module {
  id: ModuleId;
  label: string;
  sizeKB: number;
  isShared: boolean;      // appears in multiple routes
  isUsedExport: boolean;  // survives tree shaking (false = removed in step 2)
  canDynamicImport: boolean; // can be moved to on-demand
}

interface Chunk {
  id: ChunkId;
  label: string;
  color: string;          // CSS var
  isInitial: boolean;     // loads on page load
  isCached: boolean;      // independently cached (vendor chunk)
}

interface TreemapRect {
  moduleId: ModuleId;
  chunkId: ChunkId;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface BundleOptState {
  mode: 'scrolly' | 'interactive';
  stepIndex: number;                  // 0-4
  animating: boolean;

  // Treemap
  modules: Module[];                  // ~20 modules
  chunks: Chunk[];                    // 1 in step 0, 5 by step 4
  chunkAssignments: Map<ModuleId, ChunkId>;
  treemapRects: TreemapRect[];        // computed by squarified algorithm

  // Running counter
  initialLoadKB: number;              // sum of modules in initial chunks

  // Drag state (interactive mode)
  dragState: {
    moduleId: ModuleId;
    position: { x: number; y: number };
    sourceChunk: ChunkId;
    hoverChunk: ChunkId | null;
  } | null;
}

// Module data (~20 entries):
const MODULES: Module[] = [
  { id: 'react',         label: 'react',         sizeKB: 42,  isShared: true,  isUsedExport: true,  canDynamicImport: false },
  { id: 'react-dom',     label: 'react-dom',     sizeKB: 130, isShared: true,  isUsedExport: true,  canDynamicImport: false },
  { id: 'route-home',    label: 'route-home',    sizeKB: 65,  isShared: false, isUsedExport: true,  canDynamicImport: false },
  { id: 'route-dash',    label: 'route-dashboard',sizeKB: 85, isShared: false, isUsedExport: true,  canDynamicImport: false },
  { id: 'route-settings',label: 'route-settings', sizeKB: 55, isShared: false, isUsedExport: true,  canDynamicImport: false },
  { id: 'charting-lib',  label: 'charting-lib',  sizeKB: 90,  isShared: false, isUsedExport: true,  canDynamicImport: true },
  { id: 'utils',         label: 'utils',         sizeKB: 28,  isShared: true,  isUsedExport: true,  canDynamicImport: false },
  { id: 'date-fns',      label: 'date-fns',      sizeKB: 35,  isShared: true,  isUsedExport: false, canDynamicImport: false }, // tree-shaken
  { id: 'lodash-full',   label: 'lodash',        sizeKB: 72,  isShared: false, isUsedExport: false, canDynamicImport: false }, // tree-shaken (only used 2 fns)
  { id: 'lodash-used',   label: 'lodash/pick',   sizeKB: 4,   isShared: false, isUsedExport: true,  canDynamicImport: false }, // what survives
  // ... ~10 more small modules
];

// Derived:
// - initialLoadKB = sum of sizeKB for modules in chunks where chunk.isInitial
// - treemapRects = squarify(modules grouped by chunk, containerWidth, containerHeight)
// - counterColor = initialLoadKB > 500 ? 'var(--color-error)' : initialLoadKB > 200 ? 'var(--diagram-layer-3)' : 'var(--color-success)'
```

### Primitives & Props

**ScrollytellingShell** -- Wraps the entire lesson.
```tsx
<ScrollytellingShell
  steps={bundleSteps}
  renderVisual={(stepIndex) => <BundleTreemap step={stepIndex} />}
/>
```

**DemoSandbox** -- Wraps the post-scroll interactive treemap.
```tsx
<DemoSandbox title="Bundle Explorer">
  <InteractiveTreemap modules={modules} chunks={chunks} onModuleMove={handleMove} />
</DemoSandbox>
```

**AnimatedCounter** -- Running load size counter.
```tsx
<AnimatedCounter value={initialLoadKB} format={(v) => `${v.toLocaleString()}KB`} color={counterColor} />
```

**Treemap** -- New primitive needed. Implements squarified treemap layout.
```tsx
<Treemap
  data={treemapRects}
  width={640}
  height={340}
  onModuleDrag={handleDrag}         // only in interactive mode
  highlightChunks={initialChunkIds} // dashed accent border
  dimChunks={nonInitialChunkIds}    // 40% opacity
/>
```
Implementation: compute layout with squarify algorithm, render SVG `<rect>` elements with framer-motion `layout` for smooth reflow on data change.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Scroll backward through steps** | Reverse the animation: chunks merge back, colors unify, modules un-shake. Play reverse at 1.5x speed. The counter increases back to previous values. |
| **Rapid scroll** | Same as perf-js: debounce 100ms, compressed intermediate states. |
| **Drag module to non-existent chunk** | Not possible -- modules can only drop on labeled chunk zones. If dropped outside any zone, snap back to source chunk. |
| **Drag React to on-demand** | Allow it but show warning: "React is needed for initial render -- making it on-demand means a blank page." Counter updates, but the mock waterfall shows a loading state. |
| **Very small modules (< 2KB)** | Treemap squares may be < 10px. Group modules < 5KB into an "other" aggregate rectangle. On hover, expand to show contents. |
| **Window resize** | Treemap is `max-width: 640px; width: 100%`. Squarified layout recomputes on resize. Module positions animate to new layout with `SPRING.quick`. |
| **Touch drag** | Same as perf-js: 48px touch targets, `touch-action: none`, long-press to initiate. |
| **Treemap reflow during drag** | Freeze treemap layout during active drag. Reflow only after drop settles. |

### Cross-Lesson Connections

- **Upstream from perf-js**: This stop explains HOW the bundler creates the chunks that perf-js shows on the flame chart. The route-home chunk here IS the "400KB route chunk" in perf-js step 1. A reader seeing both stops understands the full pipeline: bundler splits code -> browser loads it.
- **perf-css parallel**: Tree shaking (step 2) applies to both JS and CSS. The "unused CSS" detector in perf-css is the same concept applied to stylesheets.
- **perf-hints downstream**: After the bundler creates chunks, resource hints (preload, prefetch) control HOW the browser prioritizes them. perf-bundle creates the chunks; perf-hints tells the browser which ones to prioritize.
- **perf-cwv indirect**: Smaller initial bundles -> faster TTI -> better INP. The 1.2MB -> 165KB reduction here directly explains why the "slow button" in perf-cwv has a 200ms delay (too much JS).

---

## perf-hints -- Resource Hints Explorable
**Format**: explorable | **Effort**: medium

### Interaction State Machine

```
                     +---------------------+
                     |    TIMELINE_IDLE    |
                     | hints: all off      |
                     | resources loaded    |
                     +---------------------+
                          |  toggle any hint
                          v
                     +---------------------+
                     |   HINT_TOGGLED      |
                     | hintType + resource |
                     | timeline shifting   |
                     +---------------------+
                          |  shift animation completes (400ms)
                          v
                     +---------------------+
                     |   TIMELINE_UPDATED  |
                     | timeSaved visible   |
                     | (colored gap)       |
                     +---------------------+
                          |  toggle another hint
                          v
                     (repeat HINT_TOGGLED -> TIMELINE_UPDATED)
                          |
                          |  toggle preload on ALL resources
                          v
                     +---------------------+
                     |  PRIORITY_INVERSION |
                     | warning visible     |
                     | page SLOWER         |
                     +---------------------+
                          |  toggle some preloads off
                          v
                     +---------------------+
                     |   TIMELINE_UPDATED  |
                     | (recovers)          |
                     +---------------------+
```

**Data driving each state:**
- `TIMELINE_IDLE`: `resources: Resource[]` each with `hints: Set<HintType>` (initially empty), `phases: Phase[]` (DNS, TCP, TLS, download)
- `HINT_TOGGLED`: `lastToggledHint: { resource: ResourceId, hint: HintType }`, `animating: true`
- `TIMELINE_UPDATED`: `timeSavedPerResource: Map<ResourceId, number>`, each resource has `withHint` and `withoutHint` timing
- `PRIORITY_INVERSION`: `preloadCount` exceeds threshold (> 4 preloads active), `warningVisible: true`, `totalLoadTime` INCREASED

### Visual Choreography

**Layout**: 680px wide, 520px tall. Timeline occupies top 380px. Controls occupy bottom 140px.

**Timeline (680x380px)**:
- Horizontal axis: time, 0ms to 2000ms. Tick marks every 200ms. Labels in mono `var(--text-xs)` `var(--color-muted)`.
- Vertical axis: resources stacked. Each resource is a row, 40px tall, 8px gap between rows. 8 resources total.
- Resource label: left side, 120px wide, mono `var(--text-xs)`, truncated. E.g., "style.css", "hero.jpg", "font.woff2", "app.js", "analytics.js", "next-page.js", "chart-lib.js", "icon-sprite.svg".

**Resource bars**: Each resource is a series of phase bars:
- DNS: `var(--diagram-layer-0)` (blue), typically 40-80ms wide.
- TCP: `var(--diagram-layer-1)` (green), 30-60ms.
- TLS: `var(--diagram-layer-2)` (purple), 40-80ms.
- Download: `var(--diagram-layer-4)` (orange), width proportional to file size. Range: 20ms (tiny file) to 400ms (large image).
- Phase bars are contiguous (no gaps), each has `var(--radius-1)` on exposed ends.
- Total bar label: right end, mono `var(--text-xs)`, total time in ms.

**"Without hint" ghost bar**: When a hint is active, the original timing is shown as a ghost bar -- 2px outline, `var(--color-muted)` at 30%, dashed. Positioned at the resource's ORIGINAL timeline position.

**"Time saved" gap**: The colored space between where the resource WAS and where it IS with the hint. Fill: diagonal hatching at 10% of the hint's color. Label centered in the gap: mono `var(--text-xs)` bold, e.g., "-120ms". Color: `var(--color-success)`.

**Hint effects on timeline (specific per hint type)**:

1. **dns-prefetch**: DNS phase bar starts earlier (overlaps with the previous page's load time, shown as extending LEFT of 0ms by up to 80ms). The DNS bar physically slides left. Other phases follow.
   - Visual: DNS bar color intensifies (opacity 80% -> 100%). An arrow from "previous page" zone points to the early-starting DNS.

2. **preconnect**: DNS + TCP + TLS phase bars ALL start early (overlap with HTML parse). All three slide left together. Bigger savings than dns-prefetch alone.
   - Visual: all three connection phases slide left as a group, 400ms `SPRING.gentle`. Combined savings: 120-180ms.

3. **preload**: Entire resource bar moves to high priority -- starts at the same time as the HTML parser (near 0ms). Download begins immediately, parallel with parsing.
   - Visual: bar lifts 4px, slides left to the 0ms mark (or close to it), 500ms `SPRING.gentle`, settles down. Priority badge appears: small "HIGH" pill in `var(--color-accent)`.

4. **prefetch**: Resource bar moves to AFTER all other resources (right side of timeline), at low priority. Loads during browser idle time. Bar color becomes 50% opacity. "IDLE" badge in `var(--color-muted)`.
   - Visual: bar slides right to idle zone, 400ms. If the resource was already loading early, it moves later.

5. **modulepreload**: Like preload (moves early) but an additional "parse" phase bar appears (10px tall, `var(--diagram-layer-5)` teal) OVERLAPPING the download phase. Shows that the module is parsed during download, not after.
   - Visual: preload slide + parse overlay fades in over 200ms.

**Priority inversion warning**:
- Triggered when > 4 resources have `preload` active.
- Warning banner: slides down from top of timeline. `var(--color-error)` bg at 10%, `var(--color-error)` 1px border, `var(--radius-2)`. Text: "Priority inversion: when everything is high priority, nothing is" in mono `var(--text-sm)`.
- Timeline effect: all bars become congested -- they overlap and total page load time INCREASES (bars extend right past the normal endpoint). The "total page load" marker moves RIGHT (slower).
- Total load time counter: top-right, shows "Page Load: {N}ms". When priority inversion happens, this counter goes UP and turns `var(--color-error)`.

**Controls panel (bottom 140px)**:
- Grid of hint toggles: 8 rows (one per resource) x 5 columns (one per hint type).
- Each cell: a small toggle (uses `DialToggle` component, compact variant).
- Column headers: "dns-prefetch", "preconnect", "preload", "prefetch", "modulepreload".
- Row headers: resource names (matching timeline).
- Some cells disabled (greyed out): e.g., `modulepreload` only available for .js files, `dns-prefetch` only for cross-origin resources.
- Active toggles: cell background tints with the hint type's color at 8%.

**Reduced motion**: Bars snap to new positions. Ghost bars and gaps appear instantly. Warning slides in without animation.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees a timeline with 8 resource bars, all loading in default order. DNS -> TCP -> TLS -> Download for each. Some resources start after others (dependency chain). Total page load: ~1800ms. All hint toggles are off.
2. **8s**: Reader toggles "preconnect" on "font.woff2" (a cross-origin resource). The font's DNS+TCP+TLS bars slide left, overlapping with HTML parse. A ghost bar shows where it USED to be. The gap reads "-160ms". Total page load drops to ~1640ms.
3. **18s**: Reader toggles "preload" on "hero.jpg". The hero image bar jumps to high priority, starting near 0ms. Ghost bar, gap: "-200ms". Total: ~1440ms. The hero image now loads in parallel with everything else.
4. **28s**: Reader toggles "prefetch" on "next-page.js" (for the next navigation). The bar slides to the idle zone, far right, dimmed. It's loading without competing for bandwidth. Current page isn't affected.
5. **38s**: Reader gets curious and toggles "preload" on EVERYTHING. As the 5th preload activates, the warning banner appears: "Priority inversion." All bars congest. Total page load goes UP to 2100ms -- worse than the start. The reader laughs and understands: preload is not free.
6. **48s**: Reader disables all but 2 preloads (hero.jpg and app.js). Page load recovers to ~1350ms. The lesson clicks: resource hints are surgical tools, not blanket solutions.

### Data & State Shape

```typescript
type HintType = 'dns-prefetch' | 'preconnect' | 'preload' | 'prefetch' | 'modulepreload';
type ResourceId = string;
type Phase = 'dns' | 'tcp' | 'tls' | 'download' | 'parse';

interface ResourcePhase {
  phase: Phase;
  startMs: number;
  durationMs: number;
  color: string;
}

interface Resource {
  id: ResourceId;
  label: string;
  type: 'css' | 'js' | 'image' | 'font' | 'other';
  sizeKB: number;
  crossOrigin: boolean;
  phases: ResourcePhase[];          // default (no hint) timing
  hintedPhases: ResourcePhase[];    // computed from active hints
  applicableHints: HintType[];      // which hints this resource supports
}

interface HintState {
  resourceId: ResourceId;
  hintType: HintType;
  active: boolean;
}

interface ResourceHintsState {
  resources: Resource[];
  hints: HintState[];                // 8 resources x 5 hint types = 40 cells (some disabled)
  animating: boolean;
  lastToggled: { resourceId: ResourceId; hintType: HintType } | null;

  // Derived
  totalLoadMs: number;               // max end time across all resources
  timeSavedPerResource: Map<ResourceId, number>; // ms saved vs default
  priorityInversion: boolean;        // preloadCount > 4
  preloadCount: number;
  warningVisible: boolean;
}

// Resource data:
const RESOURCES: Resource[] = [
  { id: 'style',      label: 'style.css',      type: 'css',   sizeKB: 45,  crossOrigin: false, applicableHints: ['preload'] },
  { id: 'hero',       label: 'hero.jpg',       type: 'image', sizeKB: 280, crossOrigin: false, applicableHints: ['preload', 'prefetch'] },
  { id: 'font',       label: 'font.woff2',     type: 'font',  sizeKB: 32,  crossOrigin: true,  applicableHints: ['dns-prefetch', 'preconnect', 'preload'] },
  { id: 'app',        label: 'app.js',         type: 'js',    sizeKB: 120, crossOrigin: false, applicableHints: ['preload', 'modulepreload'] },
  { id: 'analytics',  label: 'analytics.js',   type: 'js',    sizeKB: 35,  crossOrigin: true,  applicableHints: ['dns-prefetch', 'preconnect', 'prefetch'] },
  { id: 'next-page',  label: 'next-page.js',   type: 'js',    sizeKB: 85,  crossOrigin: false, applicableHints: ['prefetch', 'modulepreload'] },
  { id: 'chart',      label: 'chart-lib.js',   type: 'js',    sizeKB: 190, crossOrigin: false, applicableHints: ['prefetch', 'modulepreload'] },
  { id: 'icons',      label: 'icon-sprite.svg', type: 'other', sizeKB: 18, crossOrigin: false, applicableHints: ['preload', 'prefetch'] },
];

// Phase timing computation:
// Default: each resource starts after HTML parse (200ms), then DNS (40-80ms for cross-origin, 0 for same-origin),
// TCP (40ms), TLS (60ms for cross-origin, 0 for same), download (sizeKB * 0.8 ms simulated).
// dns-prefetch: DNS starts at -80ms (overlaps with previous page).
// preconnect: DNS+TCP+TLS start at 0ms (overlaps with HTML parse).
// preload: entire resource starts at 50ms (right after parser discovers it).
// prefetch: resource starts at max(all other resources end) + 100ms (idle time).
// modulepreload: like preload + parse phase overlaps download.
// Priority inversion: when preloadCount > 4, all preloaded resources get a 1.3x download penalty (bandwidth saturation).
```

### Primitives & Props

**DemoSandbox** -- Wraps the entire explorable.
```tsx
<DemoSandbox title="Resource Hints" minHeight={520}>
  <ResourceTimeline resources={resources} />
  <HintControlGrid resources={resources} hints={hints} onToggle={handleToggle} />
</DemoSandbox>
```

**DialToggle** -- Each cell in the hint grid.
```tsx
<DialToggle label={`${hintType} ${resource.label}`} value={active} onChange={(v) => toggle(resourceId, hintType, v)} />
```

**AnimatedCounter** -- Total page load counter, per-resource time saved.
```tsx
<AnimatedCounter value={totalLoadMs} format={(v) => `${v}ms`} color={totalColor} />
```

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Multiple hints on same resource** | Hints stack: preconnect + preload = connection starts early AND download starts early. Compute the best case (minimum start time from all active hints). |
| **Conflicting hints: preload + prefetch** | Preload wins (higher priority). Prefetch is overridden. Show a small note: "preload overrides prefetch." Toggle the prefetch to inactive visually. |
| **Priority inversion threshold** | Exactly 5 preloads triggers the warning. At 4, it's fine. At 5, bandwidth saturation kicks in. Threshold is clearly communicated in the warning text. |
| **All hints disabled** | Timeline returns to default state. Ghost bars and gaps disappear. Total load time returns to baseline. |
| **dns-prefetch on same-origin resource** | Cell is disabled (greyed out). Tooltip: "dns-prefetch is for cross-origin resources only." |
| **modulepreload on non-JS resource** | Cell is disabled. Tooltip: "modulepreload only works with JavaScript modules." |
| **Window resize** | Timeline is `max-width: 680px; width: 100%`. Phase bars scale proportionally. Control grid wraps on narrow screens (hint type columns stack). |
| **Touch devices** | Toggle cells have 44x44px touch targets. Grid cells have 4px gap to prevent mis-taps. |
| **Keyboard navigation** | Grid is navigable with arrow keys (role="grid"). Enter/Space toggles. Disabled cells are skipped. |

### Cross-Lesson Connections

- **Final optimization layer**: After perf-bundle creates the chunks and perf-js defers scripts, perf-hints tells the browser HOW to prioritize the remaining requests. This is the last lever before the network.
- **perf-images srcset complement**: perf-images teaches responsive image selection; perf-hints teaches preloading the selected image for even faster delivery. Readers who built a srcset in perf-images can now preload the LCP image.
- **perf-assets font connection**: Font preloading is one of the most impactful hint uses. Readers who saw FOIT in perf-assets will want to preconnect to the font CDN and preload the woff2.
- **perf-cwv upstream**: Preloading the hero image (taught here) is exactly the LCP fix in perf-cwv. Prefetching the next page's JS enables instant navigation (complementing the INP fix).
- **Priority inversion as advanced insight**: This is the "expert mode" discovery. Beginning developers preload everything; experts are surgical. This teaches restraint.

---

## Section Flow Summary

```
perf-js (what's slow: JS execution)
  |
  v
perf-css (what's slow: CSS rendering)
  |
  v
perf-images (what's slow: image weight)
  |
  v
perf-assets (what's slow: font loading)
  |
  v
perf-cwv (how to MEASURE: LCP + INP + CLS)
  |
  v
perf-bundle (how to FIX at build time: bundler optimizations)
  |
  v
perf-hints (how to FIX at load time: browser resource hints)
```

The first 4 stops identify specific bottlenecks (one per asset type). perf-cwv teaches readers HOW to measure impact with real metrics. perf-bundle and perf-hints provide the fix toolkit -- one at build time, one at load time. A reader completing all 7 stops can diagnose a slow page, identify which asset type is the bottleneck, measure with CWV, optimize the bundle, and hint the browser.
