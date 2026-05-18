# Section 8: Rendering Strategies -- Implementation Briefs

> 5 stops. Each brief is self-contained: an implementing agent should be able to
> build the component without asking any design questions.
>
> **Design tokens** live in `src/styles/tokens.css`.
> **Motion presets** live in `src/lib/motion.ts` (SPRING, TRANSITION, LOOP, DURATION, DELAY, STAGGER).
> **Convention**: CSS Modules for layout, Tailwind for internals, `var(--*)` for every color.
>
> **Section arc**: render-csr-ssr-ssg establishes the landscape (three strategies, no single winner).
> render-isr solves SSG's staleness problem. render-ssr-streaming solves SSR's all-or-nothing
> waterfall. render-rsc is the modern synthesis (server/client boundary). render-edge adds the
> deployment/geography dimension. Each stop builds on the limitations surfaced by the previous one.

---

## render-csr-ssr-ssg -- Rendering Strategy Battle
**Format**: battle | **Effort**: large

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (3 browser frames visible, scenario at "Default")
                          +-----+-----+
                                |
                     [click "Load Page" button]
                                |
                          +-----v-----+
                          |  loading  |  (all 3 frames begin their loading sequences simultaneously)
                          +-----+-----+
                                |
               +----------------+----------------+
               |                |                |
         [CSR frame]      [SSR frame]      [SSG frame]
         blank -> spinner   HTML arrives     HTML arrives
         -> JS downloads    -> renders but    -> renders +
         -> content renders    not interactive   interactive
               |                |                |
               |         [hydration phase]       |
               |           /         \           |
               |    [click during]  [hydration   |
               |    [hydration  ]   completes]   |
               |         |              |        |
               |    swallowed!     interactive   |
               |    (uncanny        (clicks      |
               |     valley)        work)        |
               |         \         /             |
               +----------+-------+------+-------+
                          |              |
                   [all 3 complete]  [user changes scenario mid-load]
                          |              |
                    +-----v-----+  +-----v-----+
                    | complete  |  | restarting |  (cancel current, restart with new scenario)
                    +-----+-----+  +-----+-----+
                          |              |
                   [metric bars     [returns to loading]
                    finish racing]
                          |
                    +-----v---------+
                    |  results      |  (winner highlighted per metric)
                    +-----+---------+
                          |
                   [user changes scenario toggle]
                          |
                    +-----v-----+
                    | restarting |  (re-run with new conditions)
                    +-----------+
```

**Data driving each state:**
- `idle`: all frames show empty browser chrome, metric bars at 0, `scenario: 'default'`
- `loading`: per-frame timers ticking. CSR: `phase: 'blank' | 'spinner' | 'downloading' | 'rendering'`. SSR: `phase: 'waiting' | 'html-received' | 'hydrating' | 'interactive'`. SSG: `phase: 'waiting' | 'html-received' | 'hydrating' | 'interactive'`.
- `complete`: all frames at `phase: 'interactive'`, metric bars at final widths, winner badge on fastest per metric
- `restarting`: all frames flash, reset to idle, immediately re-enter loading with new scenario

### Visual Choreography

**Static layout:**
- DemoSandbox shell: `max-width: 960px`, full container width. Title: "Rendering Strategies".
- Shared control bar at top:
  - **Scenario selector**: `DialSegment` component. Label: "Scenario". Options: `['Default', 'Slow Network', 'Slow Server', 'Dynamic Content', 'SEO Crawler']`. Default: `'Default'`.
  - **"Load Page" button**: 120x40px, `var(--color-accent)` background, white text, `var(--font-mono)` `var(--text-sm)`, `var(--radius-2)`. Pulses with `LOOP.breathe` (scale 1.0 -> 1.02 -> 1.0) when idle. Becomes "Restart" during load with `var(--color-error)` background.
- Three browser frames side-by-side (stacked on mobile < 768px). Each frame:
  - Outer dimensions: flexible, min-width 280px, aspect-ratio roughly 3:4. Border: 1px solid `var(--color-border)`, border-radius: `var(--radius-2)`.
  - **Title bar**: 32px tall, `var(--color-surface-2)` background. Contains:
    - Three dots (8px circles, gap 6px): `var(--color-error)`, `var(--diagram-layer-3)` (yellow), `var(--color-success)`. All at 40% opacity (decorative).
    - Strategy label centered: `var(--font-mono)` `var(--text-xs)` bold. CSR: `var(--diagram-layer-4)` (orange). SSR: `var(--diagram-layer-1)` (green). SSG: `var(--diagram-layer-0)` (blue).
  - **URL bar**: 24px tall, `var(--color-surface)` background, border-bottom 1px `var(--color-border)`. Contains: lock icon (12px, `var(--color-muted)`), URL text "example.com/products" in `var(--font-mono)` `var(--text-xs)` `var(--color-muted)`.
  - **Viewport area**: remaining height (min 300px), `var(--color-bg)` background. This is where the loading sequences play out.
  - **Status badge**: 8px below viewport bottom-right. Pill shape, `var(--font-mono)` `var(--text-xs)`, padding 2px 8px. Shows current phase: "Loading JS..." / "Hydrating..." / "Interactive". Color matches strategy.
- **Metric dashboard** below the three frames:
  - 4 metric rows, each showing 3 horizontal racing bars (one per strategy). Row height: 28px, gap: 4px.
  - Metric labels on left in `var(--font-mono)` `var(--text-xs)` `var(--color-muted)`: "TTFB", "FCP", "LCP", "TTI".
  - Metric tooltip on hover (16px below label): TTFB = "Time to First Byte", FCP = "First Contentful Paint", LCP = "Largest Contentful Paint", TTI = "Time to Interactive".
  - Each bar: 12px tall, border-radius: 6px. CSR bar: `var(--diagram-layer-4)` (orange). SSR bar: `var(--diagram-layer-1)` (green). SSG bar: `var(--diagram-layer-0)` (blue).
  - Bars grow left-to-right from 0 as the corresponding event fires during loading. Speed: proportional to simulated time. Max width = container width.
  - Time labels at bar endpoints: `var(--font-mono)` `var(--text-xs)`, showing ms value (e.g., "200ms", "3200ms").
  - Winner per metric: the shortest bar gets a small star icon (12px) at its right end and bold ms value.
- **Dynamic content badge** (only visible in "Dynamic Content" scenario): positioned over the SSG frame viewport, bottom-left corner. Pill: "Updated 1hr ago" in `var(--diagram-layer-3)` (yellow) `var(--text-xs)` `var(--font-mono)`, border 1px `var(--diagram-layer-3)`, background `var(--diagram-layer-3)` at 15% opacity.
- **SEO overlay** (only visible in "SEO Crawler" scenario): replaces the browser chrome title bars with "Googlebot" label. CSR viewport stays white with a faded "No JS execution" label in `var(--color-error)` at center. SSR and SSG show full content.

**Animations per frame during "Default" scenario:**

1. **CSR frame loading sequence**:
   - **0-200ms**: Viewport pure white. TTFB bar grows to small width (server sends near-empty HTML shell).
   - **200-800ms**: A circular spinner appears at viewport center (24x24px, 2px stroke `var(--color-muted)`, rotate animation: `360deg` over 1s, linear, infinite). Status badge: "Loading JS...". FCP bar does NOT advance yet (no meaningful content).
   - **800-3200ms**: Below spinner, a progress indicator text: "Downloading bundle..." in `var(--text-xs)` `var(--color-muted)`. A thin progress bar (2px, `var(--color-muted)`) grows beneath it. This represents JS bundle download.
   - **3200ms**: Spinner and progress bar fade out (opacity 1 -> 0, 200ms, `TRANSITION.crossfade`). Content crossfades in (opacity 0 -> 1, 300ms, ease-out). Content: a mock product page with a header (16px grey bar, full width), hero image placeholder (full width, 120px tall, `var(--color-surface-2)` with a mountain icon), 3 product cards (each 80x60px, `var(--color-surface-2)`, 1px `var(--color-border)`, arranged in a row). FCP and LCP bars advance simultaneously to 3200ms. Status badge: "Interactive".
   - **3200ms**: TTI bar advances to 3200ms. CSR becomes interactive instantly after content renders (no hydration needed -- it rendered client-side).

2. **SSR frame loading sequence**:
   - **0-200ms**: Viewport white. Server is working.
   - **200ms**: TTFB bar advances. A shimmer placeholder appears in viewport: 3 rectangular blocks stacked vertically (full width x 20px each, gap 8px). Shimmer effect: `linear-gradient(90deg, var(--color-surface-2) 0%, var(--color-border) 50%, var(--color-surface-2) 100%)` background-size 200% 100%, animating background-position from 200% to -200% over 1.5s, ease-in-out, infinite. FCP bar advances to 200ms (meaningful content visible).
   - **800ms**: Shimmer placeholder crossfades to actual content (same layout as CSR: header, hero, 3 cards). Crossfade: shimmer opacity 1 -> 0 simultaneously with content opacity 0 -> 1, 300ms, ease-out. LCP bar advances to 800ms.
   - **800-2100ms**: Content is visible but NOT interactive. Status badge: "Hydrating..." in `var(--diagram-layer-3)` (yellow), pulses with `LOOP.pulse`. CRITICAL: clicking ANY element in the SSR viewport during this period triggers a visual rejection:
     - The clicked element flashes with a 2px `var(--color-error)` outline for 400ms.
     - A tooltip appears above it: "Hydrating -- not interactive yet" in `var(--color-error)` `var(--text-xs)`, fades out after 1.5s.
     - Click event is swallowed (no handler fires).
   - **2100ms**: Status badge transitions to "Interactive" (yellow -> green, `var(--color-success)`). TTI bar advances to 2100ms. Clicks now work -- the "hydrating" tooltip no longer appears.

3. **SSG frame loading sequence**:
   - **0-50ms**: TTFB bar races to position (CDN edge, nearly instant).
   - **50ms**: Content appears IMMEDIATELY in viewport. No shimmer, no spinner -- the full product page (header, hero, 3 cards) fades in over 100ms (opacity 0 -> 1, `TRANSITION.crossfade`). FCP and LCP bars advance to ~50ms.
   - **50-400ms**: Brief hydration period (much shorter than SSR because HTML is pre-built). Status badge: "Hydrating..." but only briefly. Same click-rejection behavior as SSR during this window.
   - **400ms**: TTI bar advances. Status badge: "Interactive". Frame is fully ready.
   - SSG wins TTFB, FCP, and LCP in Default scenario. CSR wins nothing. SSR is between.

**Per-scenario timing overrides:**

| Metric | Default CSR | Default SSR | Default SSG | Slow Network CSR | Slow Network SSR | Slow Network SSG | Slow Server CSR | Slow Server SSR | Slow Server SSG |
|--------|-------------|-------------|-------------|-------------------|-------------------|-------------------|-----------------|-----------------|-----------------|
| TTFB   | 100ms       | 200ms       | 30ms        | 300ms             | 400ms             | 50ms              | 100ms           | 2500ms          | 30ms            |
| FCP    | 3200ms      | 200ms       | 50ms        | 8000ms            | 500ms             | 80ms              | 3200ms          | 2500ms          | 50ms            |
| LCP    | 3200ms      | 800ms       | 50ms        | 8000ms            | 1200ms            | 80ms              | 3200ms          | 2500ms          | 50ms            |
| TTI    | 3200ms      | 2100ms      | 400ms       | 8000ms            | 3000ms            | 600ms             | 3200ms          | 3500ms          | 400ms           |

- **Dynamic Content**: All timings same as Default. SSG viewport shows the "Updated 1hr ago" badge. SSR and CSR show a "Just now" timestamp label in `var(--color-success)` at the same position. This reveals SSG's staleness.
- **SEO Crawler**: CSR viewport stays white with "No JS execution" warning. TTFB/FCP/LCP/TTI bars for CSR do not advance. SSR and SSG show full content with normal timings. The metric dashboard shows CSR bars as empty with an "N/A" label.

**Reduced motion**: No spinner rotation (static spinner icon). No shimmer animation (static grey blocks). Content appears instantly at the moment it would normally crossfade in. Metric bars snap to final width. No pulse on "Hydrating" badge. Click rejection still works (outline + tooltip, no animation).

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees three browser frames labeled "CSR" (orange), "SSR" (green), "SSG" (blue). All viewports are empty white. Scenario selector shows "Default". Metric dashboard below shows 4 rows of empty bars. "Load Page" button pulses gently.
2. **Reader clicks "Load Page"**: All three frames begin simultaneously. SSG frame: content appears almost instantly (~50ms) -- header, hero image, product cards visible. SSR frame: shimmer placeholders appear at 200ms, then content crossfades in at 800ms. CSR frame: blank white, then spinner at 200ms, "Downloading bundle..." progress. Metric bars start racing: SSG bars sprint ahead. SSR bars follow at medium pace. CSR bars crawl.
3. **At ~2s mark**: SSG and SSR have visible content. CSR is still showing a spinner with "Downloading bundle..." text. The visual gap is stark. The reader sees one frame with a full page, one with content, and one with a spinner.
4. **At ~3.2s**: CSR finally renders content. All three frames now show the same page, but the metric bars tell the story: SSG bars are short (fast), SSR bars are medium, CSR bars are long (slow).
5. **Reader notices "Hydrating..." badge on SSR frame**: They instinctively click a product card in the SSR viewport during hydration. Nothing happens. A red outline flashes and "Hydrating -- not interactive yet" tooltip appears. This is the uncanny valley -- visible content that doesn't respond. The reader feels it physically.
6. **Reader switches scenario to "Slow Network"**: Frames reset and reload. CSR frame: spinner persists for 8 full seconds. SSG: barely affected (content from CDN). SSR: slightly slower but still under 1s. The CSR metric bars stretch far to the right. A nudge appears: "CSR downloads its entire app as JavaScript" in `var(--color-muted)` near the CSR frame.
7. **Reader tries "Dynamic Content"**: Same timings but SSG frame now has the yellow "Updated 1hr ago" badge while SSR and CSR show "Just now." The reader discovers SSG's trade-off: speed in exchange for freshness.
8. **Reader tries "SEO Crawler"**: CSR frame goes white with "No JS execution" error. SSR and SSG render normally. CSR's metric bars show "N/A." The blank CSR frame is viscerally alarming.

### Data & State Shape

```typescript
type Strategy = 'csr' | 'ssr' | 'ssg';
type Scenario = 'default' | 'slow-network' | 'slow-server' | 'dynamic-content' | 'seo-crawler';

type CSRPhase = 'idle' | 'blank' | 'spinner' | 'downloading' | 'rendering' | 'interactive';
type SSRPhase = 'idle' | 'waiting' | 'shimmer' | 'content-visible' | 'hydrating' | 'interactive';
type SSGPhase = 'idle' | 'waiting' | 'content-visible' | 'hydrating' | 'interactive';
type FramePhase = CSRPhase | SSRPhase | SSGPhase;

type MetricName = 'ttfb' | 'fcp' | 'lcp' | 'tti';

interface MetricTiming {
  ttfb: number;     // ms
  fcp: number;
  lcp: number;
  tti: number;
}

// Lookup table: scenario -> strategy -> timings
type TimingTable = Record<Scenario, Record<Strategy, MetricTiming>>;

interface FrameState {
  strategy: Strategy;
  phase: FramePhase;
  elapsedMs: number;
  contentVisible: boolean;
  isInteractive: boolean;
  hydrationProgress: number;        // 0.0 to 1.0
  clicksDuringHydration: number;    // count of swallowed clicks (for analytics/nudge)
  showStaleBadge: boolean;          // only SSG in dynamic-content scenario
  showSeoCrawlerBlock: boolean;     // only CSR in seo-crawler scenario
}

interface MetricBarState {
  metric: MetricName;
  bars: Record<Strategy, {
    currentMs: number;              // current bar width in ms
    targetMs: number;               // final ms value from timing table
    isComplete: boolean;
    isWinner: boolean;              // shortest bar for this metric
    isNA: boolean;                  // true for CSR in SEO scenario
  }>;
}

interface RenderBattleState {
  // Controls
  scenario: Scenario;
  phase: 'idle' | 'loading' | 'complete';

  // Frames
  frames: Record<Strategy, FrameState>;

  // Metrics
  metrics: MetricBarState[];        // 4 items (TTFB, FCP, LCP, TTI)

  // Simulation
  simulationTime: number;          // ms since "Load Page" clicked
  timingTable: TimingTable;        // static lookup

  // UI
  showHydrationTooltip: { strategy: Strategy; x: number; y: number } | null;
  showNetworkNudge: boolean;       // appears after slow-network demo
}

// Derived:
// - winnerPerMetric: for each metric, the strategy with lowest targetMs
// - allComplete: all 3 frames at 'interactive' phase
// - hydrationWindow: { start: lcp, end: tti } -- clicks swallowed in this range
```

### Primitives & Props

**DemoSandbox** -- Outer container.
```tsx
<DemoSandbox title="Rendering Strategies">
  <DemoSandbox.Controls>
    <DialSegment
      label="Scenario"
      options={['Default', 'Slow Network', 'Slow Server', 'Dynamic Content', 'SEO Crawler'] as const}
      value={scenario}
      onChange={setScenario}
    />
  </DemoSandbox.Controls>
  <RenderStrategyBattle scenario={scenario} />
</DemoSandbox>
```

**DialSegment** -- Segmented control for scenario selection. Already exists in `src/components/ui/dialkit/DialSegment.tsx`.
```tsx
<DialSegment
  label="Scenario"
  options={SCENARIOS}
  value={scenario}
  onChange={setScenario}
  formatOption={(v) => v}
/>
```

**New bespoke subcomponents (not reusable):**
- `BrowserFrame` -- single mock browser window with title bar, URL bar, viewport area, and status badge. Accepts `strategy`, `phase`, `children` (viewport content).
- `CSRViewport` -- viewport content for CSR: manages blank -> spinner -> progress -> content sequence.
- `SSRViewport` -- viewport content for SSR: manages shimmer -> content crossfade with hydration click rejection.
- `SSGViewport` -- viewport content for SSG: manages instant content with brief hydration.
- `MockPageContent` -- the shared product page layout (header, hero, 3 cards) rendered inside each viewport after loading completes.
- `ShimmerBlock` -- animated shimmer placeholder rectangle with configurable dimensions.
- `MetricDashboard` -- 4-row metric bar chart with racing bars and winner indicators.
- `MetricBar` -- single animated horizontal bar with time label and winner star.
- `HydrationTooltip` -- "not interactive yet" tooltip that appears on click during hydration.
- `StaleBadge` -- "Updated 1hr ago" pill for SSG in dynamic-content scenario.
- `LoadPageButton` -- "Load Page" / "Restart" button with pulse animation.

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Scenario change mid-load** | All frames flash once (opacity 1 -> 0.3 -> 1, 200ms), reset, and restart with new scenario timings. No confirmation. Metric bars reset to 0 and re-race. |
| **Rapid clicking during SSR hydration** | Each click produces the red outline + tooltip. Cap tooltip display to 1 at a time (dismiss previous before showing new). After 3 rejected clicks, show a persistent label below the SSR frame: "Content is visible but not interactive during hydration" in `var(--color-muted)`. |
| **Clicking SSG during its brief hydration window (50-400ms)** | Same rejection behavior as SSR. The window is short so most readers won't trigger it, but if they do, it reinforces that hydration is universal for server-rendered HTML. |
| **"Load Page" clicked rapidly** | Debounce: ignore clicks within 300ms. Button disabled for 300ms (opacity 0.5, pointer-events: none). |
| **All 5 scenarios explored** | After the reader has tried all 5 scenarios, a summary insight fades in below the metric dashboard: "No single strategy wins every scenario. The best choice depends on your constraints." in `var(--color-accent)` `var(--text-sm)`. This only appears once all 5 have been run at least once (tracked in `scenariosSeen: Set<Scenario>`). |
| **Narrow viewport (< 768px)** | Frames stack vertically. Each frame: full width, 240px viewport height. Metric dashboard: bars scale to container width. Scenario selector wraps below label. |
| **Very narrow (< 480px)** | Scenario selector becomes a `<select>` dropdown instead of DialSegment (too many options for inline segments). Frames: 200px viewport height. |
| **Reduced motion** | Spinner is a static icon (no rotation). Shimmer is a static grey block. Content appears instantly at trigger time. Metric bars snap to width. Status badge changes instantly. |
| **Theme change during animation** | All `var(--*)` colors are live CSS custom properties, so they update automatically. No special handling needed. The shimmer gradient references tokens and re-resolves on theme change. |
| **Keyboard accessibility** | Tab order: Scenario segment -> Load Page button. During load, Tab does not enter the browser viewports (they are `aria-hidden` during animation). After load completes, product cards inside frames are focusable with `aria-label="Product card (decorative)"`. Metric bars: each row has `role="img"` with `aria-label` describing winner and times. |

### Cross-Lesson Connections

- **Establishes the landscape**: This stop defines the 3 foundational strategies that ALL subsequent stops build upon. render-isr cannot be understood without knowing SSG's staleness (revealed here in "Dynamic Content" scenario). render-ssr-streaming cannot be understood without knowing SSR's all-or-nothing waterfall (visible here as the shimmer-to-content flash). render-rsc cannot be understood without knowing CSR's bundle cost (visible here as the 3.2s spinner wait).
- **The hydration uncanny valley**: First introduced here (SSR/SSG click rejection), this concept returns in render-ssr-streaming (where selective hydration solves it) and render-rsc (where server components eliminate it for non-interactive components).
- **Foreshadows render-edge**: The "CDN edge" speed advantage of SSG (visible in "Slow Network" scenario) motivates why edge rendering exists -- what if SSR could be as fast as SSG by running at the edge?
- **Metric vocabulary**: TTFB, FCP, LCP, TTI are introduced here and used throughout the section. The metric dashboard visual language should be consistent.

---

## render-isr -- Incremental Static Regeneration Scrollytelling
**Format**: scrollytelling | **Effort**: medium

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (timeline visible, cache box grey, no visitors)
                          +-----+-----+
                                |
                     [scroll enters step 1 viewport]
                                |
                          +-----v---------+
                          | first-visitor |  (visitor dot arrives, cache miss, server builds)
                          +-----+---------+
                                |
                     [scroll enters step 2 viewport]
                                |
                          +-----v---------+
                          | cache-hit     |  (visitor 2 arrives, cache serves instantly)
                          +-----+---------+
                                |
                     [scroll enters step 3 viewport]
                                |
                          +-----v---------+
                          | cache-stale   |  (timer expires, cache turns yellow)
                          +-----+---------+
                                |
                     [scroll enters step 4 viewport]
                                |
                          +-----v--------------+
                          | stale-while-reval  |  (visitor 3 served stale, bg rebuild fires)
                          +-----+--------------+
                                |
                     [scroll enters step 5 viewport]
                                |
                          +-----v---------+
                          | cache-fresh   |  (rebuild complete, cache green again)
                          +-----+---------+
                                |
                     [scroll past step 5 -> interactive zone]
                                |
                          +-----v-----------+
                          | interactive     |  (reader controls visitors + revalidation window)
                          +-----+-----------+
                                |
               +----------------+----------------+
               |                                 |
        [generate visitor]                [adjust revalidation window]
               |                                 |
        visitor dot appears,               timer duration changes,
        cache response animates,           stale threshold moves on timeline
        overhead counter updates
               |                                 |
               +----------------+----------------+
                                |
                          [continuous play -- readers
                           generate traffic patterns
                           and watch cache behavior]
```

**Data driving each state:**
- `idle`: `activeStepIndex: -1`, cache state: `'empty'`, visitors: `[]`
- `first-visitor`: `activeStepIndex: 0`, cache: `'empty'` -> `'building'` -> `'fresh'`, first visitor dot in flight
- `cache-hit`: `activeStepIndex: 1`, cache: `'fresh'`, second visitor gets instant response
- `cache-stale`: `activeStepIndex: 2`, cache: `'stale'`, revalidation timer expired
- `stale-while-reval`: `activeStepIndex: 3`, cache: `'stale'` (serves response), background: `'rebuilding'`
- `cache-fresh`: `activeStepIndex: 4`, cache: `'fresh'` (rebuilt), cycle complete
- `interactive`: `activeStepIndex: 5`, reader generates visitors with configurable timing and revalidation window

### Visual Choreography

**Static layout (sticky visual):**
- Container: `max-width: 720px`, `width: 100%`. Background: `var(--color-surface)`, border: 1px solid `var(--color-border)`, border-radius: `var(--radius-3)`, padding: `var(--space-4)`.
- **Horizontal timeline**: centered, width 90% of container, 2px solid `var(--color-border)`. Height positioned at vertical center of the container. Time flows left-to-right.
- **Visitor source** (left side): a vertical column at x=5% showing a stack of person icons (12x12px SVG silhouettes, `var(--color-muted)`). Label: "Visitors" in `var(--font-mono)` `var(--text-xs)` `var(--color-muted)`.
- **Cache box** (center): 120x80px, positioned at x=45% centered on the timeline. Border: 2px solid, border-radius: `var(--radius-2)`. Label: "Cache" in `var(--font-mono)` `var(--text-sm)` centered inside, below a cache icon (24x24px, stylized box with layers).
  - Empty state: fill transparent, border/label `var(--color-muted)`, dashed border.
  - Fresh state: fill `var(--color-success)` at 12% opacity, border solid `var(--color-success)`, label "FRESH" in `var(--color-success)`.
  - Stale state: fill `var(--diagram-layer-3)` (yellow) at 12% opacity, border solid `var(--diagram-layer-3)`, label "STALE" in `var(--diagram-layer-3)`.
  - Rebuilding state: same as stale but with a rotating rebuild icon (16x16px circular arrow, `var(--diagram-layer-3)`, rotating 360deg over 1s).
- **Server** (right side): 48x48px server rack icon (SVG outline, 2px stroke `var(--color-text)`, fill none) at x=85%. Label: "Origin" in `var(--font-mono)` `var(--text-xs)`.
- **Revalidation timer**: a circular countdown ring (32px diameter) below the cache box. Ring: 2px `var(--color-success)` when fresh, `var(--diagram-layer-3)` when stale. The ring depletes clockwise as time passes. Label inside: remaining seconds in `var(--font-mono)` `var(--text-xs)`.
- **Response time indicator**: when a visitor is served, a pill badge appears above the visitor's response path showing the response time: "20ms" for cache hit in `var(--color-success)`, "2000ms" for cache miss in `var(--color-error)`.

**Visitor animation pattern:**
- Visitor dot: 10px circle, fill `var(--diagram-layer-0)` (blue). Appears at visitor source column.
- Request path: dot travels right along timeline at consistent speed (200px/s visual).
- Cache response (hit): when dot reaches cache box, cache box pulses (scale 1.0 -> 1.05 -> 1.0, 200ms, `SPRING.quick`). Response dot (10px circle, `var(--color-success)`) departs cache leftward back to visitor column. Response time badge: "20ms".
- Cache response (miss): dot passes through cache box (no pulse), continues to server. Server processes (1.5s delay, server icon pulses with `LOOP.pulse`). Response returns leftward through cache (which fills and turns green) and then to visitor. Response time badge: "2000ms".
- Stale serve + background rebuild: visitor dot hits cache, cache serves (response goes left, badge "20ms"). Simultaneously, a separate rebuild arrow departs cache rightward to server (dashed line, `var(--diagram-layer-3)`). Server processes in background. When done, a response returns to cache only (not to visitor). Cache transitions stale -> fresh.

**Animations per scroll step:**

1. **First visitor -- cache miss** (step index 0):
   - Cache box is grey/dashed. Visitor 1 dot appears at left column, travels right. Reaches cache box -- no pulse (miss). Dot continues to server. Server icon pulses for 1.5s. Response dot returns leftward. As it passes through cache box, cache transitions: dashed border -> solid `var(--color-success)` border, fill becomes green at 12%, label changes from "Cache" to "FRESH". Response dot continues to visitor. Badge: "2000ms" in `var(--color-error)`. Revalidation timer begins (ring starts full).

2. **Second visitor -- cache hit** (step index 1):
   - Revalidation timer at ~80% full (still fresh). Visitor 2 dot travels right. Reaches cache box -- box pulses green (scale 1.05, `SPRING.quick`). Response dot immediately departs leftward (no server trip). Badge: "20ms" in `var(--color-success)`. The speed contrast with visitor 1 is the point.

3. **Cache goes stale** (step index 2):
   - Revalidation timer depletes to 0. Ring color transitions green -> yellow (300ms). Cache box transitions: green fill/border -> yellow fill/border. Label changes: "FRESH" -> "STALE". A brief flash effect on the cache box (yellow pulse outward, 400ms). No visitor during this step -- it's the timer expiring.

4. **Stale-while-revalidate** (step index 3):
   - Visitor 3 dot arrives. Cache box is yellow. Dot reaches cache -- box pulses yellow. Response dot departs leftward immediately (stale but served). Badge: "20ms" in `var(--color-success)` with a small "(stale)" suffix in `var(--diagram-layer-3)`. SIMULTANEOUSLY: a dashed arrow departs cache box rightward to server. Server icon begins pulsing. After 1.5s, a return arrow comes back to cache only. This is the background rebuild -- visitor 3 does NOT wait for it.

5. **Cache refreshed** (step index 4):
   - Background rebuild completes. Cache transitions: yellow -> green (same animation as step 1 cache fill). Revalidation timer resets to full. Label: "STALE" -> "FRESH". A visitor 4 dot can now arrive and get fresh content at cache speed.

**Interactive zone (after scrollytelling):**
- The scrollytelling visual transforms into a sandbox. New controls appear below with `TRANSITION.enterCard`:
  - **"Send Visitor" button**: 100x36px, `var(--color-accent)` bg, `var(--font-mono)` `var(--text-sm)`. Each click spawns a new visitor dot. Can be clicked rapidly.
  - **Revalidation window**: `Dial` component. Label: "Revalidation". Min: 10, max: 3600, step: 10. Format: `(v) => v >= 60 ? \`${Math.floor(v/60)}m ${v%60}s\` : \`${v}s\``. Default: 60. This controls how long before cache goes stale.
  - **Stats panel** (right side): shows `Cache hits: N`, `Cache misses: N`, `Rebuilds: N`, `Avg response: Nms`. `var(--font-mono)` `var(--text-xs)`.
- Timeline becomes horizontally scrollable (new visitors push the timeline rightward). Older visitors scroll off the left edge.

**Reduced motion**: Visitor dots appear at destinations without travel. Cache state changes snap (no pulse, no ring animation). Response badges appear instantly. Timer ring updates in steps (no smooth depletion).

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees the horizontal timeline with visitor source on left, empty grey cache box in center, origin server on right. Revalidation timer ring is empty. Narrative: "SSG is fast but frozen at build time. What if the cache could refresh itself?"
2. **Scroll to step 1**: Visitor 1 dot appears and travels right. It passes through the empty cache (miss) and continues to the server. Server works for 1.5s. Response returns, filling the cache green on the way back. The "2000ms" response badge in red is sobering. Narrative: "First visitor pays the full cost: the page builds from scratch."
3. **Scroll to step 2**: Visitor 2 arrives. Cache is green (fresh). The dot reaches cache and bounces back instantly -- "20ms" in green. No server trip. The speed contrast with visitor 1 is visceral. Narrative: "Second visitor gets the cached page instantly. SSG-level speed."
4. **Scroll to step 3**: The revalidation timer depletes to 0. Cache transitions green -> yellow. "FRESH" -> "STALE". Narrative: "The revalidation window expires. Cache is stale -- usable but should refresh."
5. **Scroll to step 4**: Visitor 3 arrives, gets served the stale page instantly ("20ms (stale)"). But a dashed arrow simultaneously flies to the server for background rebuild. The reader sees: visitor served fast AND rebuild happening. Narrative: "Visitor 3 STILL gets instant response. Background rebuild fires silently."
6. **Scroll to step 5**: Background rebuild completes. Cache goes yellow -> green -> "FRESH". Narrative: "Rebuild done. Next visitor gets fresh content. The cycle repeats."
7. **Past step 5 -- interactive zone**: Controls appear. Reader clicks "Send Visitor" rapidly -- all get instant cache responses. They adjust the revalidation window slider from 60s down to 10s, watching the timer deplete faster. Stats panel tracks hits vs misses. Reader discovers: shorter window = fresher content but more rebuilds.

### Data & State Shape

```typescript
type CacheState = 'empty' | 'building' | 'fresh' | 'stale' | 'rebuilding';

interface Visitor {
  id: string;
  spawnedAt: number;               // simulation time ms
  arrivedAtCacheAt: number;
  responseType: 'hit' | 'miss' | 'stale-hit';
  responseTimeMs: number;          // 20 for hit/stale-hit, 2000 for miss
  position: number;                // x position on timeline (0-1 normalized)
  phase: 'traveling' | 'waiting' | 'served';
}

interface BackgroundRebuild {
  id: string;
  startedAt: number;
  completesAt: number;             // startedAt + buildDuration (1500-2000ms)
  phase: 'in-progress' | 'complete';
}

interface CacheTimerState {
  revalidationWindowMs: number;    // 10000-3600000 (from Dial)
  lastFreshenedAt: number;         // simulation time when cache last became fresh
  remainingMs: number;             // derived: revalidationWindowMs - (simTime - lastFreshenedAt)
  percentRemaining: number;        // derived: remainingMs / revalidationWindowMs
}

interface ISRStats {
  cacheHits: number;
  cacheMisses: number;
  staleHits: number;
  rebuilds: number;
  totalVisitors: number;
  avgResponseMs: number;           // derived
}

interface ISRState {
  // Scroll-driven
  activeStepIndex: number;         // -1 to 5 (5 scroll steps + 1 interactive zone)

  // Cache
  cacheState: CacheState;
  cacheTimer: CacheTimerState;

  // Visitors
  visitors: Visitor[];
  maxVisibleVisitors: number;      // cap at 30 for performance

  // Background rebuilds
  activeRebuild: BackgroundRebuild | null;

  // Interactive zone
  isInteractive: boolean;          // true when past all scroll steps
  revalidationWindowSec: number;   // user-controlled (Dial value)

  // Stats (interactive zone only)
  stats: ISRStats;

  // Simulation
  simulationTime: number;
}

// Derived:
// - cacheColor: empty -> var(--color-muted), fresh -> var(--color-success),
//               stale/rebuilding -> var(--diagram-layer-3)
// - timerRingColor: same as cacheColor
// - shouldTriggerRebuild: cacheState === 'stale' && activeRebuild === null && visitorJustArrived
```

### Primitives & Props

**ScrollytellingShell** -- Wraps the entire lesson. Provides two-column layout with sticky visual and scrollable narrative.
```tsx
<ScrollytellingShell
  steps={scrollSteps}                    // 5 ScrollStep objects from lesson meta
  renderVisual={(stepIndex) => <ISRTimeline activeStep={stepIndex} />}
/>
```

**DemoSandbox** -- Wraps the sticky visual for consistent styling.
```tsx
<DemoSandbox>
  <ISRTimeline activeStep={stepIndex} />
  {isInteractive && (
    <DemoSandbox.Controls>
      <Dial label="Revalidation" value={revalSec} min={10} max={3600} step={10} onChange={setRevalSec} format={formatTime} />
    </DemoSandbox.Controls>
  )}
</DemoSandbox>
```

**Dial** -- Slider for revalidation window in interactive zone. Already exists in `src/components/ui/dialkit/Dial.tsx`.
```tsx
<Dial label="Revalidation" value={60} min={10} max={3600} step={10} format={(v) => `${v}s`} onChange={setRevalSec} />
```

**New bespoke subcomponents (not reusable):**
- `ISRTimeline` -- the sticky visual with horizontal timeline, cache box, visitor source, and server
- `CacheBox` -- 120x80px box with state-driven color/label transitions and pulse animations
- `RevalidationRing` -- circular countdown timer ring below cache box
- `VisitorDot` -- animated 10px circle that travels along the timeline
- `ResponseBadge` -- "20ms" / "2000ms" pill that appears above response path
- `RebuildArrow` -- dashed animated arrow from cache to server (background rebuild)
- `ISRStatsPanel` -- hit/miss/rebuild counters for interactive zone
- `SendVisitorButton` -- button to manually spawn visitor dots

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Rapid "Send Visitor" clicks (10+ per second)** | Cap visible visitor dots at 30. Older dots fade out (opacity -> 0, 200ms) as new ones arrive. Stats continue counting all visitors. Timeline extends rightward but caps at 3x container width with overflow-x auto-scroll. |
| **Revalidation window set to 10s during heavy traffic** | Cache oscillates rapidly between fresh and stale. Rebuilds fire frequently. Stats panel shows high rebuild count. This is the intended teaching: short window = more rebuilds = more server cost. |
| **Revalidation window set to 3600s (1 hour)** | Cache stays fresh for a long time. Almost all visitors get cache hits. Stats show very high hit ratio. But content staleness is visible: after the first build, no refreshes happen in the simulation. A label appears after 30s of no rebuilds: "Content could be up to 1hr stale" in `var(--diagram-layer-3)`. |
| **No visitors sent during interactive zone** | Timeline is empty. Stats: all zeros. A gentle nudge appears after 5s: "Click 'Send Visitor' to see ISR in action" in `var(--color-muted)`. |
| **Scroll back up from interactive zone** | Interactive controls fade out. Timeline reverts to scroll-driven animation at the appropriate step. Visitor dots from interactive mode are cleared. Stats reset. Re-entering interactive zone starts fresh. |
| **Narrow viewport (< 640px)** | Timeline orientation: keep horizontal but shrink proportionally. Cache box: 80x60px. Server/visitor icons: 32x32px. Visitor dots: 8px. Controls stack vertically below the timeline. |
| **Reduced motion** | Dots appear at destination positions instantly. Cache color transitions snap. Revalidation ring depletes in 1-second jumps (not smooth). No pulse animations on cache box or server icon. |
| **Visitor arrives exactly when cache expires** | Serve stale (stale-while-revalidate semantics). Visitor gets the stale response AND triggers a rebuild. This matches real ISR behavior -- the transition is not atomic. |

### Cross-Lesson Connections

- **Depends on render-csr-ssr-ssg**: The reader discovered in "Dynamic Content" scenario that SSG serves stale data. ISR is the direct solution. The green cache box echoes SSG's instant delivery, and the yellow stale state echoes the "Updated 1hr ago" badge from the battle.
- **Cache color vocabulary**: Grey -> Green -> Yellow -> Green is the visual story. This color cycle should match the cache states in the battle stop (SSG = instant/green, stale = yellow warning).
- **Foreshadows render-ssr-streaming**: ISR solves SSG's staleness but still serves whole pages. What about pages where PART is fast and PART is slow? Streaming SSR addresses that in the next stop.
- **Foreshadows render-edge**: ISR caches can sit at CDN edges. The "20ms" response time for cache hits directly maps to the edge rendering latency shown in render-edge.

---

## render-ssr-streaming -- Streaming SSR & Selective Hydration
**Format**: scrollytelling | **Effort**: large

### Interaction State Machine

```
                         +-----------+
                         |   idle    |  (side-by-side frames visible, both empty)
                         +-----+-----+
                               |
                    [scroll enters step 1 viewport]
                               |
                         +-----v-----------+
                         | traditional-ssr |  (left frame: blank for 3s, then all-at-once)
                         +-----+-----------+
                               |
                    [scroll enters step 2 viewport]
                               |
                         +-----v-----------+
                         | streaming-shell |  (right frame: shell appears immediately)
                         +-----+-----------+
                               |
                    [scroll enters step 3 viewport]
                               |
                         +-----v-----------+
                         | streaming-slots |  (right frame: sections fill in progressively)
                         +-----+-----------+
                               |
                    [scroll enters step 4 viewport]
                               |
                         +-----v-----------------+
                         | selective-hydration   |  (click-to-prioritize interaction enabled)
                         +-----+-----------------+
                               |
                    [scroll past step 4 -> interactive zone]
                               |
                         +-----v-----------+
                         | interactive     |  (reader configures section load times)
                         +-----+-----------+
                               |
               +---------------+---------------+
               |                               |
        [adjust section             [click unhydrated section]
         load times]                           |
               |                   hydration priority shifts
        page rebuilds with         to clicked section
        new timing profile
               |                               |
               +---------------+---------------+
                               |
                         [continuous exploration]
```

**Data driving each state:**
- `idle`: both frames empty, `activeStepIndex: -1`
- `traditional-ssr`: left frame shows the all-or-nothing behavior. `traditionalPhase: 'blank' | 'rendered'`, right frame stays idle
- `streaming-shell`: right frame shell appears. `streamingPhase: 'shell' | 'fast-sections' | 'slow-sections' | 'complete'`
- `streaming-slots`: right frame sections fill progressively based on their configured load times
- `selective-hydration`: click interaction enabled on right frame. `hydrationQueue: SectionId[]`, `clickedSection: SectionId | null`
- `interactive`: reader configures section speeds. `sectionConfigs: Record<SectionId, 'fast' | 'medium' | 'slow'>`

### Visual Choreography

**Static layout:**
- Container: `max-width: 880px`. Background: `var(--color-surface)`, border: 1px `var(--color-border)`, border-radius: `var(--radius-3)`.
- Two mock page frames side-by-side (stacked vertically on mobile < 768px):
  - **Left frame ("Traditional SSR")**: 48% width. Header label in `var(--diagram-layer-4)` (orange) `var(--font-mono)` `var(--text-sm)` bold. Border: 1px `var(--color-border)`, border-radius: `var(--radius-2)`.
  - **Right frame ("Streaming SSR")**: 48% width. Header label in `var(--diagram-layer-1)` (green). Same border styling.
  - Gap: 4% (flexbox gap or grid gap).
- Each frame contains a mock page with 4 Suspense-wrapped sections:
  - **Header/Nav** (top): 100% width x 40px, `var(--color-surface-2)` when loaded. Contains: logo placeholder (24x24px square) + 4 nav pills (40x16px each).
  - **Hero section**: 100% width x 100px. When loaded: `var(--color-surface-2)` with large title text placeholder (2 grey bars, 80% and 60% width).
  - **Product grid section**: 100% width x 120px. When loaded: 2x2 grid of product card placeholders (each 48% width x 52px, `var(--color-surface-2)`, 1px `var(--color-border)`).
  - **Recommendations section**: 100% width x 80px. When loaded: horizontal row of 4 small cards (each 23% width x 60px). This is the "slow" section.
- Section labels at top-right of each section: `var(--font-mono)` `var(--text-xs)`. Shows load time: "fast (0.3s)" in `var(--color-success)`, "medium (1s)" in `var(--diagram-layer-3)`, "slow (3s)" in `var(--color-error)`.
- **Suspense spinner**: when a section is loading in streaming mode, it shows a centered spinner (16x16px, 2px stroke, rotating) with "Loading..." text in `var(--text-xs)` `var(--color-muted)`.
- **Hydration badge per section**: bottom-right corner of each section. Shows "Hydrating" in `var(--diagram-layer-3)` `var(--text-xs)` with pulse, or "Ready" in `var(--color-success)`.
- **Hydration queue visualizer** (visible from step 4): below the streaming frame. A horizontal bar showing the hydration order as colored blocks. Each block labeled with section name. Block turns from yellow to green as hydration completes. When reader clicks a section, that block jumps to the front of the queue (animated slide, `SPRING.snappy`).

**Default section load times:**
- Header/Nav: 100ms (always fast -- it's the shell)
- Hero: 300ms (fast)
- Product grid: 1000ms (medium)
- Recommendations: 3000ms (slow -- data-intensive)

**Animations per scroll step:**

1. **Traditional SSR -- all-or-nothing** (step index 0):
   - Left frame: viewport is white for 3000ms (waiting for the slowest section). A centered "Server rendering..." label in `var(--color-muted)` `var(--text-sm)` with animated dots (1 -> 2 -> 3 dots cycling every 500ms). At exactly 3000ms: ALL four sections appear simultaneously (opacity 0 -> 1, 200ms, `TRANSITION.crossfade`). The abruptness is intentional -- one moment blank, next moment full page.
   - Right frame: stays idle (dim, labelled "scroll to compare").
   - Teaching: traditional SSR is hostage to its slowest component.

2. **Streaming -- shell appears** (step index 1):
   - Right frame activates. At 100ms: Header/Nav section appears (opacity 0 -> 1, 150ms). The rest of the viewport shows Suspense spinners for the remaining 3 sections. The contrast with the left frame (still processing or already showing everything) is the point.
   - Left frame: if scrolled to quickly, may still be in the blank-waiting state or already rendered.

3. **Streaming -- sections fill progressively** (step index 2):
   - Right frame: Hero section content replaces its spinner at 300ms (spinner crossfades to content, 200ms). Product grid replaces spinner at 1000ms. Recommendations replaces spinner at 3000ms. Each replacement: spinner scales down (0.95) while fading out, content scales up from 1.02 to 1.0 while fading in, 250ms, `SPRING.gentle`.
   - The staggered appearance makes the page feel alive -- usable content arrives progressively. The slow "Recommendations" section loads last, but everything else is already visible and potentially usable.

4. **Selective hydration** (step index 3):
   - Hydration badges appear on all 4 sections in the right frame: "Hydrating" in yellow. Hydration proceeds top-to-bottom by default: Header -> Hero -> Products -> Recommendations. As each hydrates, badge turns "Ready" green.
   - INTERACTIVE: Reader can click any section in the right frame that is showing "Hydrating" badge. When they click:
     - The clicked section's hydration badge flashes brighter yellow (scale 1.0 -> 1.1 -> 1.0, 200ms).
     - The hydration queue visualizer shows that section's block jumping to position 1 (animated slide left, `SPRING.snappy`).
     - That section hydrates NEXT (within 300ms), regardless of its position in the default queue.
     - A label appears above the clicked section: "Priority hydration" in `var(--color-success)` `var(--text-xs)`, fades after 2s.
     - Other sections' hydration pauses briefly (200ms) while the priority section hydrates, then resumes.

**Interactive zone (after scrollytelling):**
- Controls appear below with `TRANSITION.enterCard`:
  - **Section speed selectors**: 4 `DialSegment` components, one per section. Each has options `['Fast', 'Medium', 'Slow']`.
    - Header/Nav: locked to "Fast" (disabled, greyed out) -- the shell always streams first.
    - Hero: default "Fast". Fast=300ms, Medium=1000ms, Slow=3000ms.
    - Product grid: default "Medium".
    - Recommendations: default "Slow".
  - **"Rebuild Page" button**: 100x36px. Triggers both frames to re-run their loading sequence with the configured times.
- Reader adjusts section speeds and watches the side-by-side comparison replay. The teaching moment: making ALL sections "slow" shows traditional SSR waiting 3s for a blank page while streaming shows the shell immediately.

**Reduced motion**: Spinners static (no rotation). Section appearances instant. Hydration queue blocks snap to position (no slide). Priority hydration label appears without fade.

### Teaching Flow (First 60 Seconds)

1. **0s**: Two empty page frames side by side: "Traditional SSR" (orange label, left) and "Streaming SSR" (green label, right). Both viewports white. Below the sticky visual, narrative: "Traditional SSR waits for EVERY component before sending ANY HTML."
2. **Scroll to step 1**: Left frame: "Server rendering..." with animated dots for 3 full seconds. Then EVERYTHING appears at once. The 3-second blank is painful. Right frame is dimmed.
3. **Scroll to step 2**: Right frame activates. Header/Nav appears at 100ms. Three Suspense spinners below it. The right frame already has a usable shell while the left frame was blank for 3 seconds. Narrative: "Streaming sends the shell immediately."
4. **Scroll to step 3**: Right frame sections fill in one by one. Hero at 300ms. Products at 1s. Recommendations at 3s with its spinner visible until then. The page is progressively usable -- contrast with the left frame's all-or-nothing behavior.
5. **Scroll to step 4**: Hydration badges appear: all showing "Hydrating" in yellow. The hydration queue visualizer shows: Header -> Hero -> Products -> Recommendations. Header and Hero hydrate quickly (badges turn green). Products is hydrating. The reader instinctively clicks the "Recommendations" section (still showing "Hydrating"). The queue visualizer jumps: Recommendations slides to position 2 (right after the current item). Recommendations hydrates next, badge turns green. Products waits. The reader sees: their click changed the hydration order. Narrative: "Selective hydration responds to user intent."
6. **Past step 4 -- interactive zone**: Speed selectors appear. Reader sets Hero to "Slow" and Products to "Fast", clicks "Rebuild Page". Traditional frame: blank for 3s (hero is slow). Streaming frame: shell at 100ms, Products at 300ms, Recommendations at 3s, Hero at 3s. Products was usable in 300ms despite the hero being slow. The decoupling is the lesson.

### Data & State Shape

```typescript
type SectionId = 'header-nav' | 'hero' | 'product-grid' | 'recommendations';
type SectionSpeed = 'fast' | 'medium' | 'slow';
type SectionPhase = 'pending' | 'loading' | 'visible' | 'hydrating' | 'interactive';

interface SectionConfig {
  id: SectionId;
  label: string;
  speed: SectionSpeed;
  loadTimeMs: number;              // derived: fast=300, medium=1000, slow=3000 (header always 100)
  hydrationTimeMs: number;         // fixed: header=100, hero=200, products=400, recommendations=600
}

interface SectionState {
  config: SectionConfig;
  phase: SectionPhase;
  contentVisibleAt: number | null; // simulation time when content appeared
  hydratedAt: number | null;       // simulation time when hydration completed
  isPriorityHydration: boolean;    // true if user clicked during hydration
}

type TraditionalPhase = 'idle' | 'server-rendering' | 'rendered';

interface HydrationQueueItem {
  sectionId: SectionId;
  position: number;                // 0-based position in queue
  status: 'pending' | 'hydrating' | 'complete';
}

interface StreamingSSRState {
  // Scroll-driven
  activeStepIndex: number;         // -1 to 4 (4 scroll steps + 1 interactive zone)

  // Section configs (interactive zone)
  sectionConfigs: Record<SectionId, SectionSpeed>;

  // Traditional SSR (left frame)
  traditionalPhase: TraditionalPhase;
  traditionalRenderTime: number;   // derived: max of all section loadTimes

  // Streaming SSR (right frame)
  streamingSections: Record<SectionId, SectionState>;

  // Hydration
  hydrationQueue: HydrationQueueItem[];
  hydrationActive: boolean;        // true once content is streaming
  clickedDuringHydration: SectionId | null;

  // Simulation
  simulationTime: number;
  isInteractive: boolean;          // true when past all scroll steps

  // Speed -> ms lookup
  speedToMs: Record<SectionSpeed, number>;  // { fast: 300, medium: 1000, slow: 3000 }
}

// Derived:
// - traditionalTotalWait: Math.max(...Object.values(streamingSections).map(s => s.config.loadTimeMs))
// - streamingFirstPaint: 100 (header always first)
// - slowestSection: section with max loadTimeMs
// - allHydrated: every section phase === 'interactive'
```

### Primitives & Props

**ScrollytellingShell** -- Wraps the lesson.
```tsx
<ScrollytellingShell
  steps={scrollSteps}
  renderVisual={(stepIndex) => <StreamingComparison activeStep={stepIndex} />}
/>
```

**DemoSandbox** -- Wraps the sticky visual.
```tsx
<DemoSandbox>
  <StreamingComparison activeStep={stepIndex} configs={sectionConfigs} />
  {isInteractive && (
    <DemoSandbox.Controls>
      <DialSegment label="Hero" options={speeds} value={heroSpeed} onChange={setHeroSpeed} />
      <DialSegment label="Products" options={speeds} value={productsSpeed} onChange={setProductsSpeed} />
      <DialSegment label="Recs" options={speeds} value={recsSpeed} onChange={setRecsSpeed} />
    </DemoSandbox.Controls>
  )}
</DemoSandbox>
```

**DialSegment** -- Speed selectors per section. Already exists.
```tsx
<DialSegment label="Hero" options={['Fast', 'Medium', 'Slow'] as const} value={speed} onChange={setSpeed} />
```

**New bespoke subcomponents (not reusable):**
- `PageFrame` -- mock browser frame with label, used for both traditional and streaming sides
- `SuspenseSection` -- single section that transitions between spinner and content states
- `SuspenseSpinner` -- centered loading spinner for pending sections (16x16px rotating)
- `MockSectionContent` -- placeholder content for each section type (header nav, hero, grid, recommendations)
- `HydrationBadge` -- per-section "Hydrating" / "Ready" indicator
- `HydrationQueueBar` -- horizontal visualizer showing hydration order as colored blocks
- `ServerRenderingDots` -- "Server rendering..." label with animated dots for traditional SSR
- `RebuildButton` -- triggers both frames to re-run their sequences

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **All sections set to "Slow"** | Traditional: 3s blank wait. Streaming: shell at 100ms, then all 3 spinners visible for 3s, then all fill simultaneously. The streaming frame still WINS on first paint (shell visible). But the sections all arrive together -- streaming's advantage is reduced when all sections are equally slow. Show this explicitly: "Streaming helps most when section speeds DIFFER" label appears in `var(--color-muted)`. |
| **All sections set to "Fast"** | Both frames render nearly simultaneously. Traditional: ~300ms blank then all-at-once. Streaming: shell at 100ms, sections at 300ms. Minimal difference. Label: "With fast data, traditional SSR is nearly as good" in `var(--color-muted)`. |
| **Click section that's already hydrated** | Normal click behavior (no special handling). Badge already shows "Ready". No priority hydration animation. |
| **Click section that hasn't loaded content yet (still spinner)** | Ignore the click. Content must be visible before hydration begins. A brief tooltip: "Still loading from server" in `var(--color-muted)`. |
| **Scroll rapidly through all steps** | Steps accumulate correctly. Traditional frame runs its full sequence. Streaming frame: sections appear at correct relative times. If scroll is very fast (< 1s through all steps), truncate animations: sections appear instantly at their trigger points. |
| **Scroll back up during streaming** | Sections that have appeared stay visible (no un-rendering). Hydration badges reset to "Hydrating" for sections that were interactive. Hydration queue resets to default order. This prevents confusion from partially-reversed states. |
| **Narrow viewport (< 768px)** | Frames stack vertically: Traditional above Streaming. Each frame: full width. Section heights reduced proportionally. Hydration queue bar wraps to 2 rows if needed. Speed selectors: 2 per row. |
| **Keyboard accessibility** | During hydration step, sections in the streaming frame are focusable (tabindex=0). Pressing Enter triggers priority hydration. `aria-live="polite"` on hydration badges. Queue visualizer has `role="list"` with ordered items. |

### Cross-Lesson Connections

- **Depends on render-csr-ssr-ssg**: The reader experienced SSR's "blank page then everything" behavior in the battle. Streaming SSR is the direct solution to that limitation. The left frame in this stop intentionally recreates the SSR experience from the battle.
- **Depends on render-isr**: ISR showed that caching entire pages works for static content. But what about pages with BOTH fast and slow data? Streaming SSR handles mixed-speed content within a single page -- ISR handles it at the page level.
- **The hydration uncanny valley revisited**: render-csr-ssr-ssg introduced click rejection during hydration. Here, selective hydration SOLVES it by letting the user's intent drive hydration priority. The reader already has the physical memory of rejected clicks -- now they see the fix.
- **Foreshadows render-rsc**: Streaming SSR streams HTML. RSC streams a richer payload (the RSC wire format). The Suspense boundaries visible here as sections are exactly the Suspense boundaries that RSC uses. The reader who understands streaming SSR's section-by-section loading is prepared for RSC's component-level server/client split.
- **Suspense boundary concept**: Introduced visually here (each section wrapped in Suspense with a fallback spinner). This mental model carries directly into render-rsc where Suspense boundaries mark the server/client divide.

---

## render-rsc -- React Server Components
**Format**: scrollytelling | **Effort**: large

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (component tree visible, all nodes orange/client)
                          +-----+-----+
                                |
                     [scroll enters step 1 viewport]
                                |
                          +-----v-----------+
                          | all-client      |  (full tree orange, bundle meter at 420KB)
                          +-----+-----------+
                                |
                     [scroll enters step 2 viewport]
                                |
                          +-----v-----------+
                          | rsc-split       |  (most nodes turn blue, bundle drops to 120KB)
                          +-----+-----------+
                                |
                     [scroll enters step 3 viewport]
                                |
                          +-----v-----------+
                          | serialization   |  (zoom into server component rendering flow)
                          +-----+-----------+
                                |
                     [scroll enters step 4 viewport]
                                |
                          +-----v-----------+
                          | data-fetching   |  (server component with direct DB access)
                          +-----+-----------+
                                |
                     [scroll past step 4 -> interactive zone]
                                |
                          +-----v-----------+
                          | interactive     |  (reader toggles nodes server <-> client)
                          +-----+-----------+
                                |
               +----------------+----------------+
               |                |                |
        [toggle node to    [toggle node to  [try adding useState
         server]            client]          to server node]
               |                |                |
        node turns blue,   node turns        ERROR SHAKE:
        subtree JS removed, orange,          "Server components
        bundle drops       bundle grows      cannot use state"
               |                |                |
               +--------+-------+--------+-------+
                        |
                  [continuous toggling,
                   bundle meter updates live]
```

**Data driving each state:**
- `idle`: all nodes `type: 'client'`, `bundleSizeKB: 420`, tree fully expanded
- `all-client`: same as idle but visually highlighted, bundle meter in red zone
- `rsc-split`: nodes transition to `type: 'server'` or `type: 'client'` per the default RSC split. `bundleSizeKB: 120`
- `serialization`: zoom view of one server component's render -> serialize -> stream flow
- `data-fetching`: zoom view of server component with `await db.query()` inline
- `interactive`: reader can toggle any node. Bundle meter updates in real-time.

### Visual Choreography

**Static layout (sticky visual):**
- Container: `max-width: 780px`. Background: `var(--color-surface)`, border: 1px `var(--color-border)`, border-radius: `var(--radius-3)`.
- **Component tree** (left side, 65% width):
  - 15 nodes arranged as an indented tree (like React DevTools). Tree structure:
    ```
    App                          (layout, no state)
    +-- Header                   (layout)
    |   +-- Logo                 (static)
    |   +-- Navigation           (layout)
    |       +-- NavLink x3       (static)
    +-- MainContent              (layout)
    |   +-- Sidebar              (layout)
    |   |   +-- CategoryList     (static)
    |   |   +-- FilterPanel      (INTERACTIVE -- uses state)
    |   +-- ProductGrid          (layout)
    |       +-- ProductCard x3   (static)
    |       +-- AddToCartButton  (INTERACTIVE -- uses onClick + state)
    +-- Footer                   (static)
    ```
  - Each node: a rounded rectangle, 200px wide (indented from parent by 20px), 28px tall. Contains:
    - Component name in `var(--font-mono)` `var(--text-xs)`.
    - Server/client indicator: colored circle (8px) at left edge. Server = `var(--diagram-layer-0)` (blue). Client = `var(--diagram-layer-4)` (orange).
    - Background fill: server = `var(--diagram-layer-0)` at 10% opacity. Client = `var(--diagram-layer-4)` at 10% opacity.
    - Border: 1.5px solid, color matches server/client.
  - Tree connector lines: 1px `var(--color-border)`, vertical + horizontal L-shapes connecting parent to children.
  - Interactive nodes (FilterPanel, AddToCartButton) have a small lightning bolt icon (10px, `var(--diagram-layer-3)`) at right edge indicating interactivity requirement.

- **Bundle size meter** (right side, 30% width):
  - Vertical bar, 24px wide, height 200px. Background: `var(--color-surface-2)`.
  - Fill: from bottom upward. Color gradient: green zone (0-150KB, `var(--color-success)`), yellow zone (150-300KB, `var(--diagram-layer-3)`), red zone (300KB+, `var(--color-error)`).
  - Current value label above bar: "{N}KB" in `var(--font-mono)` `var(--text-lg)` bold. Color matches zone.
  - Below bar: scale ticks at 0, 100, 200, 300, 400KB in `var(--text-xs)` `var(--color-muted)`.
  - Label: "Bundle Size" in `var(--font-mono)` `var(--text-xs)` `var(--color-muted)`.
  - Target bracket on the right side of the bar: a thin bracket spanning 0-150KB labeled "ideal" in `var(--color-success)` `var(--text-xs)`.

- **Serialization zoom view** (replaces tree at step 3):
  - Left-to-right flow diagram, 3 stages:
    1. **Server Component** box (120x60px, `var(--diagram-layer-0)` border): shows JSX code snippet `<ProductCard />` with `var(--font-mono)` `var(--text-xs)`.
    2. **Arrow** (dashed, `var(--diagram-layer-0)`): labeled "render + serialize" in `var(--text-xs)`.
    3. **RSC Payload** box (120x60px, `var(--diagram-layer-2)` border): shows JSON-like payload `{ type: "div", props: { children: [...] } }` in `var(--font-mono)` `var(--text-xs)`.
    4. **Arrow** (solid, `var(--diagram-layer-1)`): labeled "stream to client" in `var(--text-xs)`.
    5. **Client Tree** box (120x60px, `var(--diagram-layer-1)` border): shows the component stitched into the tree. "No JS executed" label in `var(--color-success)` `var(--text-xs)`.

- **Data fetching zoom view** (replaces tree at step 4):
  - Single large component box (300x120px, `var(--diagram-layer-0)` border):
    ```
    // Server Component
    async function ProductList() {
      const products = await db.query('products');
      return <Grid items={products} />;
    }
    ```
    Code in `var(--font-mono)` `var(--text-xs)` with syntax highlighting. The `await db.query()` line is highlighted with `var(--diagram-layer-0)` background at 15%. A small database icon (16x16px) to the right with a direct arrow from the code to the icon. Label beneath: "No fetch(). No loading state. No waterfall." in `var(--color-success)` `var(--text-sm)`.

**Animations per scroll step:**

1. **All client** (step index 0):
   - All 15 nodes are orange (client). Each node has its circle and fill in `var(--diagram-layer-4)`. The tree is fully visible.
   - Bundle meter: fill animates from 0 to 420KB over 800ms (`TRANSITION.progress`). Ends in the red zone. The "420KB" label appears in red. A warning pulse on the meter (red glow, `LOOP.glow`, 2 cycles then stops).

2. **RSC split** (step index 1):
   - Nodes transition from orange to blue in a cascade: starting from leaf nodes upward (CategoryList, NavLink x3, Logo, Footer first), then layout nodes (Navigation, Header, Sidebar, ProductGrid, MainContent, App). Each transition: orange fill/border crossfade to blue over 300ms, staggered 80ms per node (`STAGGER.fast` x1.3).
   - FilterPanel and AddToCartButton STAY orange (they need state/interactivity). Their lightning bolt icons pulse once in `var(--diagram-layer-3)` to draw attention.
   - Bundle meter: fill shrinks from 420KB to 120KB over 1.2s (`TRANSITION.progress`). Color transitions from red zone to green zone. Label updates: "120KB" in green. A brief celebration effect: the meter's green fill pulses brighter once (opacity 1.0 -> 0.7 -> 1.0, 400ms).
   - Total transition takes ~2s with the stagger.

3. **Serialization zoom** (step index 2):
   - Component tree slides left and scales down (scale 1.0 -> 0.4, opacity 1.0 -> 0.3, 500ms, `SPRING.gentle`), revealing the serialization flow diagram.
   - Flow diagram fades in (opacity 0 -> 1, translateY 16px -> 0, `TRANSITION.enterCard`).
   - Stages appear left-to-right with 400ms stagger: Server Component box -> arrow animates (dashed line draws from left to right, 300ms) -> RSC Payload box -> arrow draws -> Client Tree box.
   - Inside Client Tree box, a small "0 KB added" label in `var(--color-success)`.

4. **Data fetching zoom** (step index 3):
   - Serialization diagram slides up and out. Data fetching component box slides in from below (`TRANSITION.enterCard`).
   - The `await db.query()` line highlights after 500ms delay: background color sweeps left-to-right over the line (200ms). Database icon pulses once. The "direct" arrow draws from code to database icon (200ms).
   - The "No fetch(). No loading state. No waterfall." label fades in at 800ms.

**Interactive zone (after scrollytelling):**
- Serialization/data-fetching zoom views fade out. Component tree returns to full size and center.
- Each node becomes clickable. On click:
  - A toggle overlay appears ON the node: two buttons side-by-side, "Server" (blue) and "Client" (orange), 60x20px each. Current type is highlighted. `SPRING.snappy` transition.
  - Clicking the other type transitions the node: color crossfade 300ms, bundle meter updates simultaneously.
- **Server -> Client**: node turns orange. Bundle meter INCREASES by that component's JS weight. If the node has server-only children, they also turn orange (cascade down -- a warning first: "This will also make N child components client" in `var(--diagram-layer-3)`, 2s, then transitions).
- **Client -> Server**: node turns blue. Bundle meter DECREASES. If the node has NO interactive requirements (no state, no effects, no handlers), the transition succeeds. If the node HAS interactivity (FilterPanel, AddToCartButton), the transition FAILS:
  - Node shakes horizontally (translateX: 0 -> -4px -> 4px -> -4px -> 4px -> 0, 400ms, ease-out).
  - A red error tooltip appears above the node: "Server components cannot use state or effects" in `var(--color-error)` `var(--font-mono)` `var(--text-xs)`. Tooltip has `var(--color-error-muted)` background, 1px `var(--color-error)` border, `var(--radius-1)` radius. Fades out after 3s.
  - The node stays orange. Bundle meter does not change.
- **Subtree cascade**: When a non-leaf node is toggled to server, all its descendants that are currently client AND have no interactivity requirements also turn server (cascade). Bundle meter drops by the combined weight. This is the "cascade insight" -- moving a parent to server removes an entire subtree's JS.

**Component JS weights (for bundle meter calculation):**
- App: 5KB, Header: 3KB, Logo: 2KB, Navigation: 4KB, NavLink: 1KB each (x3 = 3KB)
- MainContent: 5KB, Sidebar: 8KB, CategoryList: 12KB, FilterPanel: 35KB (interactive)
- ProductGrid: 10KB, ProductCard: 15KB each (x3 = 45KB), AddToCartButton: 25KB (interactive)
- Footer: 8KB
- Total when all client: ~170KB of component JS + 250KB React runtime/framework = 420KB
- When only interactive components are client: FilterPanel (35KB) + AddToCartButton (25KB) + React runtime (60KB for client subset) = 120KB

**Reduced motion**: Node color transitions instant. Bundle meter snaps to value. Error shake is a single red flash (no movement). Zoom transitions instant. No stagger on cascade.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees a component tree with 15 orange nodes, all labeled as client components. Bundle meter at right shows "420KB" in red. Lightning bolt icons on FilterPanel and AddToCartButton hint at interactivity. Narrative: "Traditional React: every component is a client component. Every component's code ships to the browser."
2. **Scroll to step 1**: Nodes begin cascading from orange to blue, leaf nodes first, working upward. The visual sweep is satisfying -- blue spreading through the tree like water. FilterPanel and AddToCartButton resist the change, staying orange with pulsing lightning bolts. Bundle meter shrinks from 420KB to 120KB. The meter transitions from red zone through yellow into green. Narrative: "Server Components: non-interactive components render on the server. Their code never reaches the browser."
3. **Scroll to step 2**: The tree miniaturizes and the serialization flow appears. Server Component -> serialize -> RSC payload -> stream -> Client. The "0 KB added" label on the client side is the punchline: server components contribute zero JavaScript. Narrative: "Server components render into a serialized payload -- not HTML, not JavaScript."
4. **Scroll to step 3**: The data fetching zoom appears. `await db.query('products')` is highlighted. Database icon with direct arrow. "No fetch(). No loading state. No waterfall." label in green. Narrative: "Server components can access databases directly. No client-server waterfall."
5. **Past step 4 -- interactive zone**: Tree returns to full size. Reader clicks the App node. Toggle appears: Server | Client. Reader clicks "Server" -- App turns blue, and ALL its non-interactive children also cascade to blue. Bundle meter drops dramatically. Reader then tries clicking FilterPanel -> "Server". SHAKE. Red error: "Server components cannot use state or effects." The constraint teaches the boundary.
6. **Reader experiments**: They toggle ProductCard x3 to client -- bundle meter jumps by 45KB. They toggle back to server -- drops. They discover: each node's JS weight affects the total. They try toggling MainContent (parent) to server -- all children except FilterPanel cascade. The cascade insight: moving one parent removes an entire subtree.

### Data & State Shape

```typescript
type ComponentType = 'server' | 'client';

interface ComponentNode {
  id: string;                      // "app", "header", "logo", etc.
  name: string;                    // display name: "App", "Header", "Logo"
  type: ComponentType;
  parentId: string | null;
  childIds: string[];
  jsWeightKB: number;              // JS bundle cost when client
  requiresInteractivity: boolean;  // true for FilterPanel, AddToCartButton
  interactivityReason?: string;    // "useState", "onClick + useState"
  depth: number;                   // indentation level in tree
}

interface BundleMeter {
  currentKB: number;               // sum of client node weights + runtime overhead
  maxKB: number;                   // 420 (all client)
  minKB: number;                   // 120 (only interactive nodes as client)
  zone: 'green' | 'yellow' | 'red'; // derived from currentKB thresholds
  runtimeOverheadKB: number;       // varies: 250 all-client, 60 minimal-client
}

interface ErrorShake {
  nodeId: string;
  message: string;
  expiresAt: number;               // simulation time when tooltip disappears
}

type ZoomView = 'tree' | 'serialization' | 'data-fetching';

interface RSCState {
  // Scroll-driven
  activeStepIndex: number;         // -1 to 4 (4 scroll steps + 1 interactive zone)

  // Component tree
  nodes: Record<string, ComponentNode>;  // 15 nodes
  treeOrder: string[];                   // rendering order for tree layout

  // Bundle meter
  bundle: BundleMeter;

  // Interactive zone
  isInteractive: boolean;
  activeToggleNodeId: string | null;     // which node has its toggle overlay open
  errorShake: ErrorShake | null;
  pendingCascade: {                      // confirmation for subtree cascade
    parentId: string;
    affectedChildIds: string[];
    newType: ComponentType;
  } | null;

  // Zoom views (scroll-driven)
  currentZoom: ZoomView;

  // Discovery tracking
  hasTriedServerToClient: boolean;
  hasTriggeredErrorShake: boolean;
  hasSeenCascade: boolean;
}

// Derived:
// - clientNodes: nodes where type === 'client'
// - serverNodes: nodes where type === 'server'
// - bundleKB: sum of clientNodes.jsWeightKB + runtimeOverhead
// - runtimeOverhead: clientNodes.length > 2 ? 250 : 60
//   (simplified: full runtime when many client components, slim when few)
// - canToggleToServer(nodeId): !node.requiresInteractivity
// - cascadeTargets(nodeId, newType): all descendants that can transition
```

### Primitives & Props

**ScrollytellingShell** -- Wraps the lesson.
```tsx
<ScrollytellingShell
  steps={scrollSteps}
  renderVisual={(stepIndex) => <RSCTree activeStep={stepIndex} />}
/>
```

**DemoSandbox** -- Wraps the sticky visual.
```tsx
<DemoSandbox>
  <RSCTree activeStep={stepIndex} nodes={nodes} onToggle={handleToggle} />
</DemoSandbox>
```

**New bespoke subcomponents (not reusable):**
- `ComponentTree` -- the indented tree layout with connector lines and interactive nodes
- `TreeNode` -- single node rectangle with server/client indicator, name, and optional toggle overlay
- `NodeToggle` -- "Server | Client" toggle overlay that appears on node click
- `BundleMeter` -- vertical bar chart with green/yellow/red zones and KB label
- `ErrorShakeTooltip` -- red error message that appears with shake animation on invalid toggle
- `SerializationFlow` -- 3-stage left-to-right flow diagram (zoom view for step 3)
- `DataFetchingZoom` -- code block with highlighted db.query line (zoom view for step 4)
- `CascadeConfirmation` -- brief warning before cascading subtree type changes
- `LightningBolt` -- small icon indicating interactivity requirement on a node

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **All nodes toggled to server (including interactive ones)** | Not possible. FilterPanel and AddToCartButton reject the toggle with error shake. The tree always has at least 2 client nodes (60KB minimum). This is the teaching constraint. |
| **All nodes toggled to client** | Bundle meter returns to 420KB (red zone). A label appears below the meter: "Back to traditional React -- every component ships JS" in `var(--color-muted)`. This validates the starting state. |
| **Toggle parent to server while child is interactive** | Parent turns server. Interactive child STAYS client. Non-interactive siblings turn server. The "use client" boundary is visually clear: the orange child is an island in a blue tree. A label: "'use client' boundary" appears next to the remaining orange node. |
| **Toggle parent to client when all children are server** | Parent turns client. Children stay server (moving a parent to client doesn't force children to client). But: a warning appears if a client parent tries to import a server component that uses async/await: "Client components cannot render async server components directly" in `var(--diagram-layer-3)`. For simplicity, this warning only appears for the MainContent -> ProductGrid relationship. |
| **Rapid clicking multiple nodes** | Only one toggle overlay visible at a time. Clicking a new node closes the previous toggle. Bundle meter updates are debounced by 100ms to prevent jitter. |
| **Narrow viewport (< 640px)** | Tree nodes: 160px wide. Font size drops to 10px. Bundle meter moves below the tree (horizontal bar instead of vertical). Toggle overlay: full-width popup at bottom of container instead of inline on node. |
| **Reduced motion** | Node color transitions instant. Bundle meter snaps. Error shake is a red border flash (2 frames) instead of horizontal movement. Zoom transitions instant. Cascade transitions simultaneous (no stagger). |
| **Theme change while toggle overlay is open** | Overlay re-renders with new token values. No special handling -- all colors via CSS custom properties. |
| **Keyboard accessibility** | Tab navigates through tree nodes in document order (depth-first). Enter opens toggle overlay. Arrow Left/Right switches between Server/Client within the overlay. Escape closes overlay. Bundle meter has `role="meter"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax`, `aria-label="JavaScript bundle size"`. Error messages are `role="alert"`. |

### Cross-Lesson Connections

- **Depends on render-csr-ssr-ssg**: The reader saw CSR's 420KB bundle problem in the battle (3.2s spinner while JS downloads). RSC directly addresses this: most components don't need to be client-side. The 420KB -> 120KB reduction in this stop is the payoff for the frustration experienced in the battle.
- **Depends on render-ssr-streaming**: Streaming SSR showed that Suspense boundaries allow progressive loading. RSC uses the SAME Suspense boundaries but for a different purpose: marking where server rendering ends and client rendering begins. The reader who understands streaming's section-by-section loading is ready for RSC's component-level server/client split.
- **The "use client" boundary concept**: First shown here as the orange island in the blue tree. The reader physically creates this boundary by toggling nodes. This is the foundational mental model for Next.js App Router, which the reader may encounter in practice.
- **Foreshadows render-edge**: Server components run on the server -- but WHICH server? The next stop (render-edge) asks: what if server components ran at the edge, close to the user? RSC's server-side execution model enables edge rendering for the rendering logic itself.
- **The error shake pattern**: The "Server components cannot use state" shake is the most important teaching moment. It physically demonstrates the constraint that separates server from client components. This same constraint drives real-world architecture decisions in Next.js, Remix, and other RSC-enabled frameworks.

---

## render-edge -- Edge Rendering Geography
**Format**: scrollytelling | **Effort**: medium

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (world map visible, user dot + origin server visible)
                          +-----+-----+
                                |
                     [scroll enters step 1 viewport]
                                |
                          +-----v-----------+
                          | origin-only     |  (request line crosses ocean, 280ms latency)
                          +-----+-----------+
                                |
                     [scroll enters step 2 viewport]
                                |
                          +-----v-----------+
                          | cdn-static      |  (static assets from nearby edge, API still origin)
                          +-----+-----------+
                                |
                     [scroll enters step 3 viewport]
                                |
                          +-----v-----------+
                          | edge-rendering  |  (HTML rendered at edge, 20ms latency)
                          +-----+-----------+
                                |
                     [scroll enters step 4 viewport]
                                |
                          +-----v-----------+
                          | edge-tradeoffs  |  (constraints and limitations visible)
                          +-----+-----------+
                                |
                     [scroll past step 4 -> interactive zone]
                                |
                          +-----v-----------+
                          | interactive     |  (reader picks location, toggles page type)
                          +-----+-----------+
                                |
               +----------------+----------------+
               |                                 |
        [select location]              [toggle page type]
               |                                 |
        latency lines redraw,          edge vs origin performance
        metrics update                 comparison changes
               |                                 |
               +----------------+----------------+
                                |
                          [exploration continues]
```

**Data driving each state:**
- `idle`: map visible, `selectedLocation: 'tokyo'` (default), `renderingMode: 'origin'`
- `origin-only`: request line from Tokyo to Virginia, `latencyMs: 280`
- `cdn-static`: two lines: short line for CSS/JS (Tokyo edge), long line for API (Virginia)
- `edge-rendering`: short line only (Tokyo edge renders HTML), `latencyMs: 20`
- `edge-tradeoffs`: edge node shows constraint icons
- `interactive`: reader picks location on map and toggles between page types

### Visual Choreography

**Static layout (sticky visual):**
- Container: `max-width: 780px`. Background: `var(--color-surface)`, border: 1px `var(--color-border)`, border-radius: `var(--radius-3)`, padding: `var(--space-4)`.
- **Simplified world map**: SVG, 100% width, aspect-ratio 2:1. This is NOT a detailed geographic map. It's a simplified abstract representation:
  - Background: `var(--color-surface-2)`.
  - Continent outlines: subtle paths in `var(--color-border)` at 30% opacity, 1px stroke, no fill. Just enough to suggest geography (North America, Europe, Asia outlines).
  - Grid overlay: faint grid lines, `var(--color-border)` at 10% opacity, 40px spacing.

- **Location dots** (interactive in interactive zone, decorative during scrollytelling):
  - 7 preset locations, each a 10px circle:
    - Tokyo: (x=82%, y=38%) `var(--diagram-layer-0)` (blue)
    - Sydney: (x=86%, y=72%) `var(--diagram-layer-0)`
    - London: (x=48%, y=30%) `var(--diagram-layer-0)`
    - Sao Paulo: (x=32%, y=62%) `var(--diagram-layer-0)`
    - Mumbai: (x=68%, y=45%) `var(--diagram-layer-0)`
    - New York: (x=26%, y=35%) `var(--diagram-layer-0)`
    - Lagos: (x=50%, y=52%) `var(--diagram-layer-0)`
  - Active location: 12px, filled, with a subtle glow (`box-shadow: 0 0 8px var(--diagram-layer-0)`). Label in `var(--font-mono)` `var(--text-xs)` above the dot.
  - Inactive locations (visible only in interactive zone): 8px, `var(--color-border)` fill, no glow. On hover: expand to 10px, show label.

- **Origin server** (Virginia):
  - Position: (x=24%, y=38%). 20x20px server rack icon, `var(--diagram-layer-4)` (orange) stroke/fill. Label: "Origin (Virginia)" in `var(--font-mono)` `var(--text-xs)`.

- **Edge nodes** (appear from step 2):
  - 6 smaller dots (8px) positioned near each user location (offset 3% toward origin). Color: `var(--diagram-layer-1)` (green). Label: "Edge" in `var(--text-xs)`. These represent CDN/edge compute locations.
  - Tokyo edge: (x=80%, y=37%)
  - Sydney edge: (x=84%, y=70%)
  - London edge: (x=47%, y=29%)
  - Sao Paulo edge: (x=31%, y=60%)
  - Mumbai edge: (x=67%, y=44%)
  - Lagos edge: (x=49%, y=50%)

- **Request lines**: SVG paths between dots. Animated with dashes traveling along the path.
  - Origin request line: 2px `var(--diagram-layer-4)` (orange), slightly curved (quadratic bezier, control point offset 10% upward). Dashes: `stroke-dasharray: 8 4`, animated `stroke-dashoffset` for traveling effect, 2s per cycle.
  - Edge request line: 2px `var(--diagram-layer-1)` (green), straight or slightly curved. Much shorter visually.
  - The LINE LENGTH physically represents latency. Longer line = more latency = worse. This is the core visual metaphor.

- **Latency indicator**: positioned at the midpoint of each active request line. A pill badge showing: "280ms" in `var(--diagram-layer-4)` for origin, "20ms" in `var(--diagram-layer-1)` for edge. `var(--font-mono)` `var(--text-sm)` bold. Background: respective color at 15% opacity, border 1px.

- **Latency comparison bar** (below map):
  - Two horizontal bars:
    - "Origin": bar fill `var(--diagram-layer-4)` (orange). Width proportional to latency.
    - "Edge": bar fill `var(--diagram-layer-1)` (green). Width proportional to latency.
  - Scale: 0 to 400ms, ticks every 100ms. `var(--text-xs)` `var(--color-muted)`.
  - Speedup label at right: "14x faster" in `var(--color-success)` `var(--text-sm)` bold (when edge is faster).

**Animations per scroll step:**

1. **Origin only** (step index 0):
   - Tokyo user dot active (glowing blue). Origin server visible in Virginia.
   - Request line DRAWS from Tokyo to Virginia: the path traces out over 1.5s, left-to-right (stroke-dashoffset animates from full length to 0). As it completes, the latency badge "280ms" fades in at the midpoint.
   - Latency bar below: orange bar grows to 280ms width over 800ms.
   - The long line crossing the Pacific is the visual. It takes 1.5s just to draw it -- a physical representation of distance.

2. **CDN for static assets** (step index 1):
   - Edge nodes fade in near each location (opacity 0 -> 1, `TRANSITION.enterCard`, staggered 100ms).
   - The Tokyo edge node is highlighted (larger, green glow).
   - TWO request lines appear:
     - Short green line: Tokyo user -> Tokyo edge. Draws quickly (300ms). Badge: "20ms" for static assets. Label on the line: "CSS, JS, images" in `var(--text-xs)` `var(--color-muted)`.
     - Long orange line: Tokyo user -> Virginia origin (same as step 1). Badge: "280ms" for HTML/API. Label on line: "HTML, API" in `var(--text-xs)` `var(--color-muted)`.
   - The two lines coexist: fast assets from nearby, slow HTML from far.

3. **Edge rendering** (step index 2):
   - The long orange origin line fades out (opacity 1 -> 0, 500ms). Simultaneously, the short green edge line brightens and its label changes to "HTML + CSS + JS + API".
   - Badge: "20ms" in `var(--diagram-layer-1)`.
   - Latency bar: orange bar shrinks to 0 while green bar appears at 20ms. The visual compression is dramatic.
   - A "14x faster" label animates in (scale 0 -> 1, `SPRING.gentle`) next to the green bar.
   - A small celebration: green ripple emanates from the edge node (2 concentric circles expanding outward, `var(--diagram-layer-1)` at 20% opacity, 600ms, then fade).

4. **Edge tradeoffs** (step index 3):
   - Three constraint icons appear next to the Tokyo edge node, staggered 300ms:
     - **Limited runtime** icon: a broken gear (16px), `var(--color-error)`. Tooltip on hover: "No native modules, restricted APIs, limited compute".
     - **Cold starts** icon: a snowflake (16px), `var(--diagram-layer-0)`. Tooltip: "First request may be slow (~50-500ms cold start)".
     - **Data freshness** icon: a clock with warning (16px), `var(--diagram-layer-3)`. Tooltip: "Edge cache may serve stale data. Database is still at origin."
   - A new request line appears: edge node -> origin server (dashed, thin, `var(--color-muted)`). Label: "DB queries still go to origin" in `var(--text-xs)` `var(--color-muted)`. This subtly shows that edge rendering doesn't eliminate ALL origin requests -- database access still crosses the ocean.

**Interactive zone (after scrollytelling):**
Controls appear below the map with `TRANSITION.enterCard`:
- **Location selector**: 7 buttons in a row, each showing a city name and a small flag/emoji-free icon. `var(--font-mono)` `var(--text-xs)`. Active city: `var(--color-accent)` background. Clicking updates the active user dot on the map and redraws request lines.
  - Alternatively, clicking directly on location dots on the map also selects them.
- **Page type toggle**: `DialSegment` component. Label: "Page type". Options: `['Personalized', 'Database-heavy', 'Static']`.
  - **Personalized**: Edge wins. Latency: edge 20-40ms, origin 200-300ms (depending on location). Edge renders with cookies/headers, no DB needed. Speedup label in green.
  - **Database-heavy**: Origin wins. Latency: edge 350-500ms (edge must call origin DB), origin 200-300ms. Edge adds a round trip. Speedup label switches to "Origin is faster" in `var(--diagram-layer-4)`.
  - **Static**: Edge wins dramatically. Latency: edge 10-20ms (cached at edge), origin 200-300ms. But shows an "up to 1hr stale" warning on the edge path.

**Per-location latency table (ms):**

| Location | Distance to Virginia | Origin latency | Edge latency (personalized) | Edge latency (DB-heavy) |
|----------|---------------------|----------------|-----------------------------|------------------------|
| New York | ~400km              | 40ms           | 15ms                        | 55ms                   |
| London   | ~5600km             | 180ms          | 25ms                        | 380ms                  |
| Sao Paulo| ~7200km             | 220ms          | 30ms                        | 420ms                  |
| Lagos    | ~8500km             | 260ms          | 35ms                        | 440ms                  |
| Mumbai   | ~12500km            | 300ms          | 25ms                        | 480ms                  |
| Tokyo    | ~11000km            | 280ms          | 20ms                        | 460ms                  |
| Sydney   | ~16000km            | 340ms          | 30ms                        | 520ms                  |

**Reduced motion**: Request lines appear at full length without drawing animation. Edge nodes appear instantly. Constraint icons appear simultaneously. Latency bars snap to width. No ripple celebration.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees a simplified world map. A glowing blue dot in Tokyo. An orange server icon in Virginia. The map is clean -- just continent outlines, grid, and these two points. Narrative: "Your user in Tokyo. Your server in Virginia. Every request crosses the Pacific."
2. **Scroll to step 1**: A request line draws from Tokyo to Virginia. It takes 1.5s just to trace the path -- the distance is physically felt. "280ms" badge appears at midpoint. The orange latency bar grows long below the map. Narrative: "Physics is the bottleneck. 280ms round trip minimum."
3. **Scroll to step 2**: Green edge nodes fade in near each continent. A short green line draws from Tokyo to the nearby edge (fast, 300ms). A label: "CSS, JS, images" served locally. But the long orange line remains for "HTML, API". Two lines coexist: short green + long orange. Narrative: "CDN for static assets. But HTML still comes from origin."
4. **Scroll to step 3**: The orange line fades away. The green line's label changes to cover everything: "HTML + CSS + JS + API". Badge: "20ms". Latency bar: orange bar collapses, green bar at 20ms. "14x faster" label appears. Green ripple from edge node. The reader sees: edge rendering eliminated the transoceanic round trip. Narrative: "Edge rendering: HTML rendered at the edge. 20ms instead of 280ms."
5. **Scroll to step 4**: Constraint icons appear near the edge node: broken gear, snowflake, clock. A dashed line draws from edge back to Virginia: "DB queries still go to origin." The reader discovers: edge isn't magic -- it has real constraints. Narrative: "But edge has limits: restricted runtime, cold starts, and data staleness."
6. **Past step 4 -- interactive zone**: Location selector and page type toggle appear. Reader clicks "Sydney" -- user dot moves, request lines redraw. Origin latency: 340ms (longest). Edge: 30ms. "11x faster." Reader toggles to "Database-heavy" -- the edge latency jumps to 520ms, WORSE than origin (340ms). The comparison bar flips: "Origin is faster." The reader discovers: edge rendering backfires when the edge must talk to the origin database.
7. **Reader clicks New York**: Origin latency drops to 40ms (nearby). Edge: 15ms. Only 2.7x faster. The benefit shrinks as users get closer to origin. The proportionality insight: edge benefits scale with distance.

### Data & State Shape

```typescript
type LocationId = 'tokyo' | 'sydney' | 'london' | 'sao-paulo' | 'mumbai' | 'new-york' | 'lagos';
type PageType = 'personalized' | 'database-heavy' | 'static';
type RenderingMode = 'origin' | 'cdn-static' | 'edge-full';

interface MapLocation {
  id: LocationId;
  label: string;
  x: number;                       // % position on map (0-100)
  y: number;
  edgeNodeOffset: { dx: number; dy: number };  // edge node position relative to user
}

interface LatencyProfile {
  originMs: number;
  edgeMs: number;
  edgeDbHeavyMs: number;           // edge + round trip to origin DB
  edgeStaticMs: number;            // edge cached, near-instant
}

// Static lookup
type LatencyTable = Record<LocationId, LatencyProfile>;

interface RequestLine {
  id: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;                   // CSS variable
  latencyMs: number;
  label: string;
  style: 'solid' | 'dashed';
  isActive: boolean;
}

interface EdgeConstraint {
  icon: 'gear-broken' | 'snowflake' | 'clock-warning';
  label: string;
  description: string;
}

interface EdgeRenderingState {
  // Scroll-driven
  activeStepIndex: number;         // -1 to 4 (4 scroll steps + 1 interactive zone)

  // Map
  locations: MapLocation[];        // 7 preset locations
  selectedLocation: LocationId;    // default: 'tokyo'
  latencyTable: LatencyTable;

  // Rendering mode (scroll-driven, then interactive)
  renderingMode: RenderingMode;

  // Interactive zone
  isInteractive: boolean;
  pageType: PageType;              // default: 'personalized'

  // Request lines (derived)
  activeLines: RequestLine[];

  // Latency comparison
  originLatencyMs: number;         // derived from selectedLocation + pageType
  edgeLatencyMs: number;           // derived from selectedLocation + pageType
  speedup: number;                 // derived: originLatencyMs / edgeLatencyMs
  edgeIsFaster: boolean;           // derived: edgeLatencyMs < originLatencyMs

  // Edge constraints (visible from step 3)
  showConstraints: boolean;
  showDbRoundTrip: boolean;        // dashed line from edge to origin

  // Zoom views
  showEdgeNodes: boolean;          // true from step 1 onward
}

// Derived:
// - speedupLabel: edgeIsFaster ? `${speedup.toFixed(0)}x faster` : 'Origin is faster'
// - activeLatency: based on pageType:
//   'personalized' -> latencyTable[loc].edgeMs
//   'database-heavy' -> latencyTable[loc].edgeDbHeavyMs
//   'static' -> latencyTable[loc].edgeStaticMs
```

### Primitives & Props

**ScrollytellingShell** -- Wraps the lesson.
```tsx
<ScrollytellingShell
  steps={scrollSteps}
  renderVisual={(stepIndex) => <EdgeMap activeStep={stepIndex} />}
/>
```

**DemoSandbox** -- Wraps the sticky visual.
```tsx
<DemoSandbox>
  <EdgeMap activeStep={stepIndex} location={location} pageType={pageType} />
  {isInteractive && (
    <DemoSandbox.Controls>
      <DialSegment label="Page type" options={PAGE_TYPES} value={pageType} onChange={setPageType} />
    </DemoSandbox.Controls>
  )}
</DemoSandbox>
```

**DialSegment** -- Page type toggle. Already exists.
```tsx
<DialSegment label="Page type" options={['Personalized', 'Database-heavy', 'Static'] as const} value={pageType} onChange={setPageType} />
```

**New bespoke subcomponents (not reusable):**
- `WorldMap` -- simplified SVG world map with continent outlines and grid
- `LocationDot` -- clickable location dot with label and glow effect
- `OriginServer` -- server rack icon at Virginia position
- `EdgeNode` -- small green dot representing an edge compute location
- `RequestLine` -- animated SVG path between two points with dashes and latency badge
- `LatencyBadge` -- pill showing "280ms" at the midpoint of a request line
- `LatencyComparison` -- two horizontal bars comparing origin vs edge latency with speedup label
- `EdgeConstraintIcons` -- three constraint icons (gear, snowflake, clock) with hover tooltips
- `LocationSelector` -- row of city buttons for the interactive zone
- `DbRoundTripLine` -- dashed line from edge node back to origin showing DB query overhead

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Select New York (closest to Virginia origin)** | Origin latency is only 40ms. Edge latency: 15ms. Speedup: ~2.7x. Label: "2.7x faster" -- still a win but much smaller than Tokyo's 14x. This teaches proportionality. If reader selects "Database-heavy" for New York: edge 55ms vs origin 40ms -- origin wins. "Edge overhead exceeds distance benefit" label in `var(--color-muted)`. |
| **Database-heavy page at every location** | Edge always loses (edge + DB round trip > direct to origin). The latency comparison bar consistently shows origin as faster. After 3 locations tried with DB-heavy: a summary label appears: "Edge rendering adds a hop when the edge needs origin data" in `var(--color-muted)`. |
| **Static page at every location** | Edge always wins dramatically (cached content). But a "stale data" warning appears on the edge bar: "Cache may be up to 1hr stale" in `var(--diagram-layer-3)`. This connects to ISR's revalidation concept from render-isr. |
| **Rapid location switching** | Request lines redraw with 200ms crossfade (old lines fade, new draw). Latency bars animate with `SPRING.snappy`. No debounce needed -- each location is a simple lookup. |
| **Scroll back up from interactive zone** | Interactive controls fade out. Map reverts to scroll-driven state at appropriate step. Selected location resets to Tokyo. Page type resets to personalized. |
| **Narrow viewport (< 640px)** | Map: full width, aspect-ratio 16:9 (wider than tall to fit mobile). Location dots: 8px (tappable area 40x40px for touch targets). Location selector: wraps to 2 rows. Latency bars: below map, full width. |
| **Very narrow (< 400px)** | Map simplifies: only show the selected location + origin + active edge node. Other locations become a `<select>` dropdown. Continent outlines hidden. Grid hidden. |
| **Reduced motion** | Request lines appear at full length instantly. Edge nodes appear without fade. Constraint icons appear simultaneously. Latency bars snap. No ripple effect. |
| **Keyboard accessibility** | Location dots: focusable with Tab, activated with Enter/Space. Arrow keys cycle through locations. Page type segment: standard DialSegment keyboard behavior. Map SVG: `role="img"` with `aria-label` describing the current state ("Request from Tokyo to Virginia origin server, latency 280ms"). Latency bars: `role="meter"` with `aria-valuenow`. |
| **Color blindness** | Origin (orange) and Edge (green) are distinguishable for most color vision types. Additionally: origin lines are dashed, edge lines are solid -- a non-color differentiator. Latency badges include the source label ("Origin: 280ms", "Edge: 20ms") for text-based disambiguation. |

### Cross-Lesson Connections

- **Depends on render-csr-ssr-ssg**: The reader saw SSG's speed advantage (CDN edge, instant delivery) in the battle's "Default" and "Slow Network" scenarios. Edge rendering extends that concept: what if SSR could also run at the edge?
- **Depends on render-isr**: ISR's cache-at-edge model directly applies here. The "Static" page type in this stop's interactive zone echoes ISR's cache hit behavior. The "stale data" warning connects to ISR's revalidation window.
- **Depends on render-rsc**: Server components run server-side. Edge rendering puts that "server" at the edge. The reader who understands RSC's server/client split can now reason about WHERE the server components execute.
- **The "database-heavy" counter-insight**: This is the critical lesson. Edge rendering is not universally better. When the edge node must query a database at origin, it ADDS latency (edge -> origin -> edge -> client instead of direct origin -> client). This prevents cargo-culting edge deployment.
- **Section 8 culmination**: This stop ties together the full section. CSR/SSR/SSG (landscape) -> ISR (staleness fix) -> Streaming SSR (all-or-nothing fix) -> RSC (bundle fix) -> Edge (geography fix). Each stop solved a problem from the previous one. Edge is the deployment dimension that completes the picture. The reader now has the full mental model: WHAT to render (RSC), WHEN to render (CSR/SSR/SSG/ISR), HOW to render (streaming), and WHERE to render (edge).
