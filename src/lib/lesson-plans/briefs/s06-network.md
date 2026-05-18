# Section 6: Network -- Implementation Briefs

> 4 stops. Each brief is self-contained: an implementing agent should be able to
> build the component without asking any design questions.
>
> **Design tokens** live in `src/styles/tokens.css`.
> **Motion presets** live in `src/lib/motion.ts` (SPRING, TRANSITION, LOOP, DURATION, DELAY, STAGGER).
> **Convention**: CSS Modules for layout, Tailwind for internals, `var(--*)` for every color.

---

## net-intro -- Request Lifecycle Scrollytelling
**Format**: scrollytelling | **Effort**: medium

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (browser + server icons visible, pipeline empty)
                          +-----+-----+
                                |
                     [scroll enters step 1 viewport]
                                |
                          +-----v-----+
                          | dns-stage |  (DNS box lights up, lookup animation plays)
                          +-----+-----+
                                |
                     [scroll enters step 2 viewport]
                                |
                          +-----v-----+
                          | tcp-stage |  (TCP box lights up, SYN/SYN-ACK/ACK packets animate)
                          +-----+-----+
                                |
                     [scroll enters step 3 viewport]
                                |
                          +-----v-----+
                          | tls-stage |  (TLS box lights up, cert + key exchange animate)
                          +-----+-----+
                                |
                     [scroll enters step 4 viewport]
                                |
                          +-----v-----+
                          | http-stage|  (HTTP box lights up, request/response headers visible)
                          +-----+-----+
                                |
                     [scroll enters step 5 viewport]
                                |
                          +-----v---------+
                          | waterfall     |  (6-resource waterfall chart renders)
                          +-----+---------+
                                |
                     [user toggles cold/warm]
                                |
                   +------------v-----------+
                   |   waterfall-toggled    |  (stages animate in/out based on warm/cold)
                   +------------------------+
```

**Data driving each state:**
- `idle`: `activeStepIndex: -1`, all stages dimmed
- `dns-stage` through `http-stage`: `activeStepIndex: 0..3`, stages at index <= activeStepIndex are lit (opacity 1.0), later stages remain dim (opacity 0.2)
- `waterfall`: `activeStepIndex: 4`, pipeline complete, waterfall chart visible
- `waterfall-toggled`: `cacheMode: 'cold' | 'warm'`, determines which stages show in each waterfall row

Each step transition is CUMULATIVE -- previous stages stay lit. The pipeline builds up as the reader scrolls down.

### Visual Choreography

**Static layout:**
- Container: `max-width: 800px`, `width: 100%`, centered. Height determined by content. Background: `var(--color-surface)`, border: 1px solid `var(--color-border)`, border-radius: `var(--radius-3)`.
- Sticky visual occupies 60% left column.
- Top row: Browser icon (48x48px, positioned at x=40, y=32) and Server icon (48x48px, positioned at right edge x=712, y=32). Both rendered as SVG -- browser is a rounded window frame outline, server is a rack server outline. Stroke: 2px `var(--color-text)`, fill: none.
- Pipeline between icons: 4 stage boxes arranged horizontally between browser and server, evenly spaced. Each box:
  - Dimensions: 120x64px
  - Border-radius: `var(--radius-2)`
  - Default state: fill `transparent`, border 1.5px dashed `var(--color-border)`, opacity 0.2
  - Active state: fill at 12% opacity of its layer color, border 2px solid layer color, opacity 1.0
  - Label centered inside: `var(--font-mono)`, `var(--text-xs)`, layer color
  - Stage assignments:
    - DNS: `var(--diagram-layer-0)` (blue, hue 200)
    - TCP: `var(--diagram-layer-1)` (green, hue 140)
    - TLS: `var(--diagram-layer-2)` (purple, hue 300)
    - HTTP: `var(--diagram-layer-4)` (orange, hue 30)
- Timing bar beneath each stage box: 4px tall, rounded-full, same layer color. Width proportional to typical latency (DNS: 80px for ~50ms, TCP: 48px for ~30ms, TLS: 64px for ~40ms, HTTP: 32px for ~20ms). Label below bar: `var(--text-xs)`, `var(--color-muted)`, showing ms value.
- Connection line: 2px path from browser to server running through all stage boxes. Color: `var(--color-border)` when inactive, `var(--color-accent)` when pipeline stage is active with a traveling gradient.

**Animations per scroll step:**

1. **DNS stage activates** (step index 0):
   - DNS box: opacity 0.2 -> 1.0 over 400ms, ease-out (`TRANSITION.progress` timing, custom duration).
   - Internal illustration fades in at 200ms delay: a mini lookup sequence -- domain name text "example.com" on left, arrow, IP address "93.184.216.34" on right. Cache icon (small box with "X" = miss) appears first, then recursive arrow.
   - Packet circle (8x8px, fill `var(--diagram-layer-0)`) departs browser icon, travels to DNS box at 500px/s, ease-in-out. Upon arrival, box pulses briefly (scale 1.0 -> 1.04 -> 1.0, 200ms, `SPRING.quick`).
   - Timing bar width animates from 0 to 80px over 600ms, ease-out.

2. **TCP stage activates** (step index 1):
   - TCP box: same opacity animation as DNS (400ms ease-out).
   - Internal illustration at 200ms delay: three packet arrows animate in sequence:
     - SYN: 8x8px circle `var(--diagram-layer-1)` flies browser -> server over 300ms
     - SYN-ACK: circle flies server -> browser over 300ms (200ms delay after SYN arrives)
     - ACK: circle flies browser -> server over 300ms (200ms delay after SYN-ACK arrives)
   - Each arrow labeled with tiny `var(--text-xs)` monospace text: "SYN", "SYN-ACK", "ACK".
   - Timing bar animates 0 -> 48px over 600ms.

3. **TLS stage activates** (step index 2):
   - TLS box: same opacity animation.
   - Internal illustration at 200ms delay: certificate icon (small rectangle with seal) flies server -> browser over 400ms. Key icon (small key shape) flies browser -> server over 400ms after 200ms gap. A lock icon fades in (scale 0 -> 1, `SPRING.gentle`) at the center of the TLS box when exchange completes.
   - Timing bar animates 0 -> 64px.

4. **HTTP stage activates** (step index 3):
   - HTTP box: same opacity animation.
   - Internal illustration at 200ms delay: request block (tiny code block with "GET /" header lines) slides out from browser side, response block (with "200 OK" + body bytes) slides back from server side. Each block is 56x32px, `var(--color-surface-2)` bg, 1px border `var(--color-border)`, `var(--text-xs)` monospace content.
   - The full pipeline is now lit. A brief shimmer effect runs along the entire connection line from browser to server (gradient sweep left-to-right, 800ms, ease-in-out).

5. **Waterfall chart** (step index 4):
   - Pipeline visual slides up and shrinks to 60% height over 500ms, `TRANSITION.collapse`.
   - Below it, a waterfall chart fades in (opacity 0 -> 1, translateY 16px -> 0, `TRANSITION.enterCard`).
   - Chart: 6 rows, one per resource. Each row shows a horizontal bar broken into colored segments matching the pipeline stages (DNS blue, TCP green, TLS purple, HTTP orange). Row labels on left: `index.html`, `style.css`, `app.js`, `logo.png`, `font.woff2`, `api.json` in `var(--font-mono)` `var(--text-xs)`.
   - Row 1 (index.html): all 4 segments. Total bar width: ~400px.
   - Rows 2-6: in cold mode, full segments (slightly shorter DNS due to caching). Bars stagger in with `STAGGER.fast` (60ms per row).
   - Time axis along bottom: 0ms to 600ms with tick marks every 100ms. `var(--color-muted)`, `var(--text-xs)`.

6. **Cold/Warm toggle** (step index 5 -- interactive):
   - Toggle control: `DialSegment` component positioned top-right of waterfall. Options: `['Cold Start', 'Warm']`. Default: `'Cold Start'`.
   - **Cold Start**: All 6 rows show full pipeline segments (DNS + TCP + TLS + HTTP). Row 1 has a connection-setup overhead label.
   - **Warm toggle**: DNS, TCP, and TLS segments SHRINK to 0 width over 400ms (`SPRING.snappy`) on rows 2-6. Only HTTP segment remains. Row 1 retains full pipeline (initial request). Total bar width collapses from ~400px to ~80px for rows 2-6. A label animates in: "60-80% faster" in `var(--color-success)`, positioned right of the collapsed bars.
   - The visual DIFFERENCE in bar width is the lesson. The contrast must be dramatic.

**Reduced motion**: All opacity changes instant. Packets appear at destinations without travel. Waterfall bars appear at full width without staggered grow. Toggle snaps between states. Timing bars appear at final width.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees browser icon on the left, server icon on the right, four dimmed dashed boxes between them labeled "DNS", "TCP", "TLS", "HTTP". Empty connection line between browser and server. Below the sticky visual (scroll column), the first narrative reads: "You type a URL and press Enter. What happens in the next 200 milliseconds?"
2. **Reader scrolls to step 1**: DNS box lights up -- fills with a subtle blue tint, border becomes solid, opacity jumps to 1.0. A small packet circle departs the browser icon and travels to the DNS box. Inside the box, a "example.com -> 93.184.216.34" mini-diagram appears. The timing bar below DNS grows to show "~50ms". Narrative: "DNS resolves the domain name to an IP address..."
3. **Reader scrolls to step 2**: TCP box lights up green. The three-way handshake animates: SYN flies right, SYN-ACK flies left, ACK flies right. Each labeled. DNS stays lit. Timing bar: "~30ms". Narrative: "TCP three-way handshake establishes a reliable connection..."
4. **Reader scrolls to step 3**: TLS box lights up purple. Certificate flies server-to-browser, key flies browser-to-server, lock icon appears. All prior stages stay lit. Timing bar: "~40ms". Narrative: "For HTTPS: the TLS handshake exchanges certificates..."
5. **Reader scrolls to step 4**: HTTP box lights up orange. GET request slides out, 200 OK response slides back. Full pipeline is lit. A shimmer runs the entire connection line. Timing bar: "~20ms". Narrative: "Finally: the actual HTTP request..."
6. **Reader scrolls to step 5**: Pipeline shrinks upward. Waterfall chart fades in below with 6 resources. Cold start: all bars have full-length segments. The toggle appears top-right showing "Cold Start" selected. Narrative: "Subsequent requests skip DNS, TCP, and TLS..."
7. **Reader toggles to "Warm"**: DNS, TCP, and TLS segments collapse on rows 2-6. Bars shrink dramatically. A "60-80% faster" label appears in green. The visual gulf between row 1 (full pipeline) and rows 2-6 (HTTP only) makes the point viscerally. The reader now understands why the first request is uniquely expensive.

### Data & State Shape

```typescript
type PipelineStage = 'dns' | 'tcp' | 'tls' | 'http';

interface StageConfig {
  id: PipelineStage;
  label: string;
  color: string;              // CSS variable: var(--diagram-layer-N)
  typicalLatencyMs: number;   // for timing bar width and label
  timingBarWidth: number;     // px, proportional to latency
}

interface PacketAnimation {
  id: string;
  from: 'browser' | 'server' | PipelineStage;
  to: 'browser' | 'server' | PipelineStage;
  color: string;
  label?: string;
  delayMs: number;
  durationMs: number;
}

type CacheMode = 'cold' | 'warm';

interface WaterfallResource {
  name: string;                          // e.g. "index.html"
  segments: {
    stage: PipelineStage;
    durationMs: number;                  // drives bar width
    skippedWhenWarm: boolean;            // DNS, TCP, TLS are skipped when warm (except row 0)
  }[];
  isInitialRequest: boolean;             // row 0 always shows full pipeline
}

interface RequestLifecycleState {
  // Scroll-driven
  activeStepIndex: number;               // -1 to 5 (6 scroll steps)

  // Waterfall
  cacheMode: CacheMode;                  // toggled by user
  resources: WaterfallResource[];        // 6 items, static data

  // Animation tracking
  stageAnimationComplete: Record<PipelineStage, boolean>;
  packetQueue: PacketAnimation[];        // queued packets for current step
}

// Derived:
// - litStages: stages[0..activeStepIndex] -- all stages at or before active step
// - waterfallVisible: activeStepIndex >= 4
// - warmSpeedup: computed from sum of skipped segment durations
```

### Primitives & Props

**ScrollytellingShell** -- Wraps the entire lesson. Provides the two-column layout with sticky visual and scrollable narrative.
```tsx
<ScrollytellingShell
  steps={scrollSteps}            // 6 ScrollStep objects from lesson meta
  renderVisual={(stepIndex) => <RequestPipeline activeStep={stepIndex} />}
/>
```

**DemoSandbox** -- Wraps the sticky visual area for consistent styling.
```tsx
<DemoSandbox>
  <RequestPipeline activeStep={stepIndex} cacheMode={cacheMode} />
</DemoSandbox>
```

**DemoSandbox.Tabs** -- Provides the Cold Start / Warm toggle at step 5.
```tsx
<DemoSandbox.Tabs
  options={['Cold Start', 'Warm'] as const}
  value={cacheMode}
  onChange={setCacheMode}
/>
```

**Annotation** -- Labels for timing bars ("~50ms") and pipeline shimmer label.
```tsx
<Annotation target={dnsTimingRef} text="~50ms" position="below" />
```

**New bespoke subcomponents (not reusable):**
- `PipelineStageBox` -- single stage box with dim/lit states, internal illustration slot
- `PacketDot` -- 8x8px animated circle that travels between two coordinates
- `WaterfallChart` -- 6-row bar chart with collapsible segments per cache mode

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Fast scrolling past multiple steps** | Each stage lights up in rapid sequence with truncated animations (skip packet travel, instant opacity). A `skipAnimation` flag triggers when scroll velocity > 800px/s. Stages still accumulate correctly -- no step is skipped from the state machine, only the animation is shortened. |
| **Scroll back up (reverse)** | Stages dim in reverse order. Waterfall hides when scrolling above step 4. Pipeline stages fade back to dim (opacity 0.2) for steps above current index. The visual BUILDS going down and UNBUILDS going up -- never resets. |
| **Toggle cold/warm before reaching step 5** | Toggle only renders at step 5+. If reader somehow accesses it early (keyboard focus), ignore toggle changes when `activeStepIndex < 4`. |
| **Narrow viewport (< 640px)** | Pipeline stages stack vertically instead of horizontally. Browser icon top, server icon bottom. Stage boxes: full width, 64px tall, stacked with 8px gap. Waterfall bars scale to container width. |
| **Reduced motion** | All packet travel instant (appear at destination). Opacity changes snap. Timing bars appear at full width. Waterfall bars appear at full width without stagger. Toggle changes snap between cold/warm. |
| **Keyboard navigation** | Tab focuses the cold/warm toggle. Arrow keys switch between options. Each pipeline stage box is focusable for screen readers with `aria-label` describing the stage name and latency. |

### Cross-Lesson Connections

- **Sets up net-protocols**: The pipeline stages introduced here (DNS, TCP, TLS) reappear in the protocol battle. The reader must understand that TCP is the transport layer before they can understand HTTP/2's TCP-level HOL blocking vs HTTP/3's QUIC.
- **Foreshadows net-long-polling**: The "connection reuse" concept from the warm toggle directly motivates why persistent connections (WebSocket, SSE) exist -- they eliminate repeated handshakes.
- **Foreshadows net-rest-graphql**: The HTTP request/response stage shown here is exactly what REST and GraphQL operate on. The reader sees that the request itself is fast; the question becomes what data shape rides on it.
- **Reuses from s01**: The timing bar concept (proportional width to represent latency) is similar to the FormulaBar segments from core-box-model. Same visual language of "width = magnitude."

---

## net-protocols -- Protocol Battle (HTTP/1.1 vs HTTP/2 vs HTTP/3)
**Format**: battle | **Effort**: medium

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (3 lanes visible, controls at default, no activity)
                          +-----+-----+
                                |
                     [click "Load Resources" button]
                                |
                          +-----v-----+
                          |  racing   |  (all 3 lanes loading simultaneously)
                          +-----+-----+
                                |
               +----------------+----------------+
               |                |                |
        [HTTP/1.1 lane]  [HTTP/2 lane]    [HTTP/3 lane]
        loads in batches  loads parallel   loads parallel
        of 6, sequential  over 1 conn     over QUIC
               |                |                |
               |         [packet loss > 0?]      |
               |           /         \           |
               |     [yes: all       [no]        |
               |      streams        |           |
               |      freeze]        |           |
               |           \         /           |
               |         [HTTP/3: only affected  |
               |          stream pauses]         |
               |                |                |
               +--------+-------+--------+-------+
                        |                |
                 [all lanes complete]    [user adjusts controls mid-race]
                        |                |
                  +-----v-----+    +-----v-----+
                  | complete  |    | restarting |  (current race cancels, new race begins)
                  +-----+-----+    +-----+-----+
                        |                |
               [compare metrics]   [returns to racing]
                        |
                  +-----v-----+
                  |  results   |  (total time per protocol, winner badge)
                  +-----------+
```

**Data driving each state:**
- `idle`: all `resourceStates[]` at `'pending'`, `elapsedMs: 0`
- `racing`: per lane, each resource has state `'pending' | 'loading' | 'blocked' | 'stalled' | 'complete'`. A simulation clock ticks at 16ms intervals (requestAnimationFrame).
- `complete`: all resources in all lanes at `'complete'`. Winner determined by lowest `totalElapsedMs`.
- `restarting`: race cancelled, states reset to `idle`, then immediately transition to `racing` with new control values.

### Visual Choreography

**Static layout:**
- BattleArena shell: full container width, `max-width: 900px`. Three lanes stacked vertically on mobile (< 768px), side-by-side on desktop.
- Shared control bar at top: 100% width, `var(--color-surface-2)` background, `var(--radius-2)` border-radius, `var(--space-3)` padding. Contains:
  - **Resource count**: `Dial` component. Label: "Resources". Min: 1, max: 30, step: 1, default: 6. Format: `(v) => \`${v}\``.
  - **Packet loss**: `Dial` component. Label: "Packet loss". Min: 0, max: 15, step: 0.5, default: 0. Format: `(v) => \`${v}%\``.
  - **"Load Resources" button**: 120x40px, `var(--color-accent)` background, white text, `var(--font-mono)` `var(--text-sm)`, `var(--radius-2)`. Pulses with `LOOP.breathe` (scale 1.0 -> 1.02 -> 1.0) when idle. Becomes "Restart" during race with `var(--color-error)` background.
- Each lane:
  - Header: protocol name in `var(--font-mono)` `var(--text-base)` bold. Lane color: HTTP/1.1 = `var(--diagram-layer-0)` (blue), HTTP/2 = `var(--diagram-layer-1)` (green), HTTP/3 = `var(--diagram-layer-2)` (purple).
  - Waterfall area: 100% lane width, `var(--color-surface)` background. Each resource is a horizontal bar:
    - Height: 20px, gap: 4px between bars.
    - Bar fill: lane color at 80% opacity. Grows left-to-right as the resource loads.
    - Pending state: 0 width, `var(--color-border)` dashed outline.
    - Loading state: bar grows from left to right. Speed: proportional to simulated bandwidth (base 300px/s equivalent).
    - Blocked state (HTTP/1.1 queuing): bar outline visible, fill stays at 0, small lock icon at left edge. Bar tinted `var(--color-muted)` at 40% opacity.
    - Stalled state (packet loss): bar fill freezes. Red flash overlay covers the ENTIRE lane (HTTP/2) or just the single bar (HTTP/3). Flash: `var(--color-error)` at 20% opacity, 200ms on / 200ms off, repeats while stalled. Stall duration: 200-800ms randomized per loss event.
    - Complete state: bar at full width, checkmark icon at right edge. Opacity drops to 60% to make in-progress bars more prominent.
  - Connection indicator below lane header: small diagram showing connection count.
    - HTTP/1.1: up to 6 small pipe icons (6 connections max per origin).
    - HTTP/2: 1 thick pipe icon with multiplexing arrows.
    - HTTP/3: 1 thick pipe icon labeled "QUIC" with independent stream arrows.
  - Metrics row below waterfall: total time in `var(--font-mono)` `var(--text-sm)`. Updates live during race. Format: "1,247ms". Winner gets `var(--color-success)` text color and a small trophy icon.

**Animations:**

1. **Race start** (click "Load Resources"):
   - Button depresses (scale 0.97, 100ms, `SPRING.quick`), then all three lanes begin simultaneously.
   - Resource bars begin growing with staggered starts per protocol logic:
     - **HTTP/1.1**: First 6 resources start simultaneously (6 connections). Resource 7+ waits. When any of the first 6 completes, next pending resource starts. Visible: resources 7+ have a dashed outline with a tiny hourglass icon. Waiting bars have a subtle pulse (`LOOP.breathe` at 50% opacity).
     - **HTTP/2**: All resources start simultaneously over a single connection. Bars grow in parallel. Stream identifiers shown as tiny "S1", "S2"... labels at bar left edge.
     - **HTTP/3**: Same as HTTP/2 visually (all parallel). Stream labels: "Q1", "Q2"...

2. **Packet loss event** (when packet loss slider > 0):
   - Loss events fire randomly. Probability per 100ms tick: `packetLoss / 100`.
   - **HTTP/2 loss**: ALL currently loading bars freeze. A red flash washes over the ENTIRE lane (full-width overlay, `var(--color-error)` at 20% opacity, 200ms). All bars pause for `stallDuration` (200-800ms random). A brief label appears: "TCP HOL blocking" in `var(--color-error)` `var(--text-xs)` at lane center, fades out after 1.5s.
   - **HTTP/3 loss**: Only ONE random loading bar freezes. Red flash covers ONLY that single bar. Other bars continue unimpeded. Label on the frozen bar: "stream stalled" in `var(--text-xs)`. The contrast with HTTP/2's full-lane freeze is the core teaching visual.
   - **HTTP/1.1 loss**: The affected connection stalls. Only resources on that specific connection pause (1 of 6 max). Other connections continue. Intermediate behavior between HTTP/2 and HTTP/3.

3. **Race completion**:
   - Winning lane's header gets a gold border-bottom (2px, `var(--diagram-layer-3)` yellow, hue 60) that draws in over 400ms. Trophy icon (16x16px) fades in next to the total time.
   - Losing lanes: total time in `var(--color-muted)`.
   - If two lanes tie (within 50ms): both get a "tie" badge instead.

4. **Control change mid-race**:
   - All bars flash once (opacity 1 -> 0.3 -> 1, 200ms) to signal reset.
   - Race restarts with new parameters. No confirmation dialog -- instant feedback.

**Reduced motion**: Bars appear at final widths without growth animation. Loss flashes are static red tint (no flash). Winner border appears instantly. Button has no pulse.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees three labeled lanes: "HTTP/1.1", "HTTP/2", "HTTP/3". A shared control bar at top shows: Resource count (slider, default 6), Packet loss (slider, default 0%). A "Load Resources" button pulses gently. The lanes are empty -- just headers with connection diagrams below (6 pipes, 1 thick pipe, 1 QUIC pipe).
2. **Reader clicks "Load Resources"**: All 3 lanes start loading simultaneously. HTTP/1.1: 6 bars grow in parallel (one per connection). HTTP/2: 6 bars grow in parallel (multiplexed on one connection). HTTP/3: 6 bars grow in parallel (QUIC streams). At 0% packet loss with 6 resources, all three finish at roughly the same time. HTTP/1.1 is slightly slower due to connection overhead. Result: "Huh, they look similar."
3. **Reader increases resource count to 20**: Clicks "Load Resources" again. HTTP/1.1: first 6 load, resources 7-12 visibly WAIT with dashed outlines and hourglass icons. Then 13-18 wait. Then 19-20. Four batches. HTTP/2 and HTTP/3: all 20 stream in parallel over the single connection. HTTP/1.1 takes roughly 3-4x longer. The queuing is viscerally visible.
4. **Reader notices packet loss slider, still at 0%**: HTTP/2 and HTTP/3 look identical. A nudge label fades in near the packet loss slider: "try adding packet loss" in `var(--color-muted)`, with a right-pointing arrow toward the slider. Label disappears on interaction.
5. **Reader drags packet loss to 5%**: Clicks "Load Resources". During the race, HTTP/2's lane periodically freezes ALL bars with a red flash -- "TCP HOL blocking" label appears. HTTP/3's lane: occasionally ONE bar freezes while others keep going. The divergence is dramatic. HTTP/2 finishes noticeably slower than HTTP/3 now.
6. **Reader pushes packet loss to 10%**: HTTP/2 becomes crippled -- constant full-lane stalls. HTTP/3 degrades gracefully with isolated stalls. HTTP/1.1 falls in between (per-connection stalls). The winner ordering flips: HTTP/3 > HTTP/1.1 > HTTP/2 at high loss. This is the aha moment: HTTP/2 over TCP has WORSE head-of-line blocking than HTTP/1.1 under packet loss.

### Data & State Shape

```typescript
type Protocol = 'http1.1' | 'http2' | 'http3';
type ResourceState = 'pending' | 'queued' | 'loading' | 'stalled' | 'complete';

interface ResourceBar {
  id: string;                            // "r0", "r1", ...
  state: ResourceState;
  progress: number;                      // 0.0 to 1.0
  connectionId: number;                  // which connection this is on (HTTP/1.1: 0-5)
  streamId: number;                      // stream identifier for HTTP/2/3
  stallTimeRemaining: number;            // ms, > 0 when stalled
}

interface LaneState {
  protocol: Protocol;
  resources: ResourceBar[];
  totalElapsedMs: number;
  isComplete: boolean;
  activeConnections: number;             // HTTP/1.1: up to 6, HTTP/2: 1, HTTP/3: 1
  holBlockingActive: boolean;            // true when TCP-level HOL blocking (HTTP/2)
}

interface ProtocolBattleState {
  // Controls
  resourceCount: number;                 // 1-30, default 6
  packetLossPercent: number;             // 0-15, default 0

  // Race
  phase: 'idle' | 'racing' | 'complete';
  lanes: Record<Protocol, LaneState>;

  // Simulation clock
  tickMs: number;                        // current simulation time
  rng: () => number;                     // seeded RNG for reproducible loss events

  // UI
  showNudge: boolean;                    // "try adding packet loss" hint
  winner: Protocol | null;
}

// Derived:
// - winnerProtocol: lane with lowest totalElapsedMs when all complete
// - http11BatchCount: Math.ceil(resourceCount / 6)
// - lossEventThisFrame: rng() < (packetLossPercent / 100) per 100ms tick
```

### Primitives & Props

**DemoSandbox** -- Outer container for the battle arena.
```tsx
<DemoSandbox title="Protocol Battle">
  <DemoSandbox.Controls>
    <Dial label="Resources" value={resourceCount} min={1} max={30} step={1} onChange={setResourceCount} />
    <Dial label="Packet loss" value={packetLoss} min={0} max={15} step={0.5} onChange={setPacketLoss} format={(v) => `${v}%`} />
  </DemoSandbox.Controls>
  <ProtocolBattle />
</DemoSandbox>
```

**Dial** -- Slider control for resource count and packet loss. Already exists in `src/components/ui/dialkit/Dial.tsx`.
```tsx
<Dial label="Resources" value={6} min={1} max={30} step={1} onChange={setResourceCount} />
<Dial label="Packet loss" value={0} min={0} max={15} step={0.5} format={(v) => `${v}%`} onChange={setPacketLoss} />
```

**New bespoke subcomponents (not reusable):**
- `BattleLane` -- single protocol lane with waterfall bars, connection diagram, and metrics
- `ResourceBar` -- single animated bar with state-driven fill, stall overlay, and status icon
- `ConnectionDiagram` -- mini pipe visualization below lane header showing connection model
- `RaceButton` -- the Load Resources / Restart button with pulse animation

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Slider change mid-race** | Race restarts immediately with new values. All bars flash once (200ms) to signal reset. No lost state -- previous race is discarded. |
| **100% packet loss equivalent (slider max 15%)** | At 15% loss, HTTP/2 is heavily impaired but still completes (stalls are 200-800ms, not infinite). Resources eventually finish. Cap stall events to max 3 consecutive stalls per resource to prevent infinite race. |
| **30 resources on HTTP/1.1** | 5 batches of 6. Waterfall becomes tall -- enable vertical scroll within the lane (max-height: 400px, overflow-y: auto). Other lanes match height. |
| **1 resource** | All three protocols finish nearly simultaneously. Display a note: "With 1 resource, protocol differences are minimal" in `var(--color-muted)`. |
| **Race takes > 10 seconds** | Safety timeout: force-complete all resources after 15s simulated time. Display actual completion times, mark timed-out resources with a warning icon. |
| **Narrow viewport (< 768px)** | Lanes stack vertically instead of side-by-side. Control bar wraps: sliders stack, button below. Lane heights cap at 200px with scroll. |
| **Rapid repeated clicks on Load** | Debounce: ignore clicks within 300ms of last race start. Button disabled for 300ms after click (opacity 0.5, pointer-events: none). |
| **Keyboard accessibility** | Tab order: Resource slider -> Packet loss slider -> Load button. During race, Escape cancels and returns to idle. Each lane's total time is in an `aria-live="polite"` region for screen readers. |

### Cross-Lesson Connections

- **Depends on net-intro**: The pipeline stages (TCP, TLS) from the request lifecycle are prerequisite knowledge. The reader must understand that HTTP/2 runs over TCP and HTTP/3 runs over QUIC to understand WHY TCP-level HOL blocking affects HTTP/2 but not HTTP/3.
- **Parallels with net-long-polling**: Both lessons use the "race" format to compare approaches under varying conditions. The packet loss slider here parallels the frequency toggle in net-long-polling -- both are the key differentiator that reveals when approaches diverge.
- **Foreshadows net-rest-graphql**: HTTP/2's multiplexing is especially relevant for GraphQL (single endpoint, multiple data needs) vs REST's multiple endpoints. The reader who understands multiplexing can reason about why GraphQL over HTTP/2 is efficient.
- **The "shared control changes the winner" pattern**: Used here (packet loss) and in net-long-polling (frequency). The building agent should ensure controls feel identical across both battles -- same Dial component, same layout position, same interaction model.

---

## net-long-polling -- Realtime Transport Battle (Long Polling vs WebSocket vs SSE)
**Format**: battle | **Effort**: large

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (3 lanes visible, server quiet, no messages)
                          +-----+-----+
                                |
                     [click "Start Server" button]
                                |
                          +-----v-----+
                          | streaming |  (server sends messages at configured frequency)
                          +-----+-----+
                                |
               +----------------+----------------+
               |                |                |
        [Long Polling]    [WebSocket]        [SSE]
        req -> wait ->    persistent         persistent
        resp -> re-req    bidirectional      server->client
               |                |                |
               |    [frequency changes]          |
               |           |                     |
               |    +------v------+              |
               |    | streaming   | (rate adjusts, overhead becomes visible/invisible)
               |    +------+------+              |
               |           |                     |
               +-----+-----+-----+-----+--------+
                     |           |
          [click "Disconnect"]   [click "Send Message" in client->server panel]
                     |           |
               +-----v-----+    +-----v-----------+
               | disconn'd |    | client-sending   |
               +-----+-----+    +-----+-----------+
                     |                 |
           [auto-reconnect behavior]   [SSE: blocked, WS: sends, LP: new request]
                     |                 |
               +-----v-----+    +-----v-----+
               | reconnecting|   | streaming |
               +-----+-----+    +-----------+
                     |
            [SSE: auto ~3s]
            [WS: manual/failed]
            [LP: next poll]
                     |
               +-----v-----+
               | streaming  |  (back to normal)
               +-----------+
```

**Data driving each state:**
- `idle`: `serverRunning: false`, `messageLog: []`, all lanes show empty sequence diagrams
- `streaming`: `serverRunning: true`, `frequency: 'low' | 'medium' | 'high'`, messages accumulate in log
- `disconnected`: `connectionState: Record<Transport, 'connected' | 'disconnected' | 'reconnecting'>`
- `client-sending`: `clientMessagePending: Record<Transport, boolean>`

### Visual Choreography

**Static layout:**
- BattleArena shell: full container width, `max-width: 960px`.
- Shared control bar at top:
  - **Frequency**: `DialSegment` component. Label: "Message frequency". Options: `['Low (1/5s)', 'Medium (1/s)', 'High (10/s)']`. Default: `'Low (1/5s)'`.
  - **"Start Server" button**: Same style as protocol battle. 120x40px, `var(--color-accent)`. Label changes to "Stop Server" when running.
  - **"Disconnect" button**: 100x40px, `var(--color-error)` bg, appears only when server is running.
  - **"Send Client Message" button**: 140x40px, `var(--color-surface-2)` bg, border 1px `var(--color-border)`. Tests client-to-server direction.
- Three lanes side-by-side (desktop), stacked (mobile < 768px). Each lane:
  - Header: transport name in `var(--font-mono)` `var(--text-base)` bold.
    - Long Polling: `var(--diagram-layer-4)` (orange, hue 30)
    - WebSocket: `var(--diagram-layer-1)` (green, hue 140)
    - SSE: `var(--diagram-layer-2)` (purple, hue 300)
  - Sequence diagram area: 100% lane width, min-height 300px, `var(--color-surface)` bg. Rendered as a vertical timeline:
    - Left column label: "Client" in `var(--text-xs)` `var(--color-muted)`
    - Right column label: "Server" in `var(--text-xs)` `var(--color-muted)`
    - Vertical dotted lifelines: 1px dashed `var(--color-border)`, one for client (x=25% lane width), one for server (x=75% lane width).
    - Messages: horizontal arrows between lifelines. Server->client: arrow pointing left, lane color. Client->server: arrow pointing right, lighter tint of lane color. Each arrow has a tiny label above it in `var(--text-xs)` `var(--font-mono)`.
    - Arrows stack vertically top-to-bottom as messages arrive. New arrows animate in: slide from source lifeline to destination over 300ms, ease-out. Arrow head: 6px wide.
  - Overhead counter below sequence diagram: "Overhead: N requests" for long polling, "Overhead: 1 connection" for WS/SSE. `var(--font-mono)` `var(--text-xs)`. Counter for long polling increments visibly with each re-request, colored `var(--color-error)` when overhead > 50% of traffic.
  - Connection status indicator: small dot (8px circle) at top-right of lane header. Green (`var(--color-success)`) when connected, red (`var(--color-error)`) when disconnected, yellow (`var(--diagram-layer-3)`) when reconnecting. Pulses during reconnection (`LOOP.pulse`).

**Animations per transport at each frequency:**

1. **Low frequency (1 message per 5 seconds):**
   - **Long Polling**: Client sends request arrow (right-pointing). Arrow reaches server. Pause (3-5s visible gap on timeline). Server sends response arrow (left-pointing) with data label. Immediately: client sends new request arrow. The overhead is one extra arrow per message. At low frequency, this looks fine -- similar traffic volume to WS/SSE.
   - **WebSocket**: Initial handshake: two arrows (upgrade request + 101 response). Then: server sends data arrow every 5s. Clean, minimal traffic. Bidirectional indicator: a small double-headed arrow icon in the lane header.
   - **SSE**: Initial connection: one arrow (GET request). Then: server sends data arrows every 5s. Unidirectional indicator: a single left-pointing arrow icon in the lane header. "server -> client only" label in `var(--text-xs)`.

2. **Medium frequency (1 message per second):**
   - **Long Polling**: Arrows pile up fast. Each message = request arrow + response arrow + re-request arrow = 3 arrows per message. After 10 messages, the lane has 30 arrows. Overhead counter: "30 requests for 10 messages." The timeline visibly FILLS UP faster than WS/SSE lanes.
   - **WebSocket**: One arrow per message. After 10 messages: 12 arrows (2 handshake + 10 data). Clean.
   - **SSE**: Same as WS for server messages. After 10 messages: 11 arrows (1 connection + 10 data).

3. **High frequency (10 messages per second):**
   - **Long Polling**: The lane becomes a wall of arrows. Overhead dominates: most arrows are connection setup, not data. Overhead counter turns red: "300 requests for 100 messages." The visual density difference between LP and WS/SSE lanes is extreme. Timeline auto-scrolls.
   - **WebSocket**: Arrows come fast but are uniform and clean. One per message.
   - **SSE**: Same clean flow as WebSocket.

4. **Disconnect simulation:**
   - All three lanes' connection dots go red simultaneously (200ms transition).
   - **SSE**: After ~3s pause, connection dot turns yellow (reconnecting) with pulse. After 1s, dot goes green. New "reconnected" arrow appears. Label: "EventSource auto-reconnect" in `var(--color-success)` `var(--text-xs)`.
   - **WebSocket**: Connection dot stays red. A dashed "X" mark appears on the client lifeline. Label: "manual reconnection needed" in `var(--color-error)` `var(--text-xs)`. After 5s, a faded ghost arrow labeled "reconnect logic required" appears but DOES NOT complete unless reader writes it.
   - **Long Polling**: Next poll cycle naturally reconnects. Dot goes yellow briefly (< 1s), then green. Label: "polls naturally resume" in `var(--color-muted)`.

5. **Client->Server send attempt:**
   - **WebSocket**: Arrow flies right (client -> server) with data label. Arrives successfully. Green flash on server lifeline.
   - **SSE**: Arrow starts to fly right but STOPS midway. Red "X" appears. Label: "server -> client only" pulses. Arrow fades out with `var(--color-error)` tint. This is a teaching failure state.
   - **Long Polling**: Arrow flies right as a new HTTP request. Technically works but adds another request to the overhead counter.

**Reduced motion**: Arrows appear instantly at destinations without travel animation. Connection dots change color without transition. Overhead counter increments without animation.

### Teaching Flow (First 60 Seconds)

1. **0s**: Three lanes with empty sequence diagrams. Client and server lifelines visible as vertical dotted lines. Frequency toggle shows "Low (1/5s)" selected. "Start Server" button pulses gently.
2. **Reader clicks "Start Server"**: All three lanes begin receiving messages at 1 per 5 seconds. Long Polling: request arrow flies right, waits, response flies left, re-request flies right. WebSocket: after initial handshake (2 arrows), data arrows fly left every 5s. SSE: after connection arrow, data arrows fly left every 5s. At low frequency, all three lanes look roughly similar. Overhead counters are low.
3. **Reader switches frequency to "Medium (1/s)"**: Message rate increases 5x. Long Polling lane starts filling up fast -- 3 arrows per message (request + response + re-request). WS and SSE lanes grow at 1 arrow per message. Within 10 seconds, the density difference is visible. Long Polling overhead counter: "30 requests" vs WS: "12 total" vs SSE: "11 total".
4. **Reader switches to "High (10/s)"**: Long Polling lane becomes a wall of arrows. It auto-scrolls because arrows accumulate faster than the lane height. WS and SSE remain clean. Overhead counter turns red: "300+ requests." The visual contrast is overwhelming.
5. **A nudge appears** near the Disconnect button: "try disconnecting" in `var(--color-muted)`.
6. **Reader clicks "Disconnect"**: All three dots go red. SSE auto-reconnects after 3s (dot goes yellow, then green, "EventSource auto-reconnect" label). WebSocket stays disconnected with "manual reconnection needed" warning. Long Polling reconnects on next poll cycle (~1s). The reconnection difference is the second aha moment.
7. **Reader clicks "Send Client Message"**: WebSocket sends successfully (arrow completes). SSE arrow starts, hits a red X, fails with "server -> client only" label. This reveals the directionality constraint -- the third aha moment.

### Data & State Shape

```typescript
type Transport = 'long-polling' | 'websocket' | 'sse';
type Frequency = 'low' | 'medium' | 'high';
type ConnectionStatus = 'idle' | 'connected' | 'disconnected' | 'reconnecting';
type ArrowDirection = 'client-to-server' | 'server-to-client';

interface SequenceArrow {
  id: string;
  direction: ArrowDirection;
  label: string;                         // "GET /poll", "data: {...}", "SYN", etc.
  type: 'data' | 'overhead' | 'handshake' | 'failed';
  timestampMs: number;                   // simulation time
  durationMs: number;                    // arrow travel time (visual only)
}

interface TransportLane {
  transport: Transport;
  connectionStatus: ConnectionStatus;
  arrows: SequenceArrow[];
  overheadCount: number;                 // number of non-data arrows
  dataCount: number;                     // number of actual data messages received
  reconnectTimeoutId: ReturnType<typeof setTimeout> | null;
}

interface RealtimeBattleState {
  // Controls
  frequency: Frequency;                  // determines message interval
  serverRunning: boolean;

  // Lanes
  lanes: Record<Transport, TransportLane>;

  // Simulation
  simulationTime: number;                // ms since server started
  messageInterval: number;               // derived from frequency: 5000 | 1000 | 100
  nextMessageAt: number;                 // next scheduled server message time

  // Frequency -> interval mapping:
  // 'low': 5000ms, 'medium': 1000ms, 'high': 100ms

  // UI
  showDisconnectNudge: boolean;          // appears after 15s of streaming
  showSendNudge: boolean;                // appears after disconnect demo
}

// Derived:
// - overheadRatio: lane.overheadCount / (lane.overheadCount + lane.dataCount)
// - overheadIsHigh: overheadRatio > 0.5 (triggers red coloring for LP)
// - isFullyReconnected: all lanes connectionStatus === 'connected'
```

### Primitives & Props

**DemoSandbox** -- Outer container.
```tsx
<DemoSandbox title="Realtime Transports">
  <DemoSandbox.Controls>
    <DialSegment
      label="Frequency"
      options={['Low (1/5s)', 'Medium (1/s)', 'High (10/s)'] as const}
      value={frequency}
      onChange={setFrequency}
    />
  </DemoSandbox.Controls>
  <RealtimeBattle />
</DemoSandbox>
```

**DialSegment** -- Segmented control for frequency selection. Already exists in `src/components/ui/dialkit/DialSegment.tsx`.
```tsx
<DialSegment label="Frequency" options={frequencyOptions} value={frequency} onChange={setFrequency} />
```

**New bespoke subcomponents (not reusable):**
- `SequenceDiagram` -- vertical timeline with client/server lifelines and animated arrows
- `SequenceArrow` -- single animated horizontal arrow with label, direction, and state
- `ConnectionDot` -- 8px status indicator with connected/disconnected/reconnecting states
- `OverheadCounter` -- live counter showing overhead requests, turns red when ratio is high
- `TransportLaneHeader` -- protocol name + directionality icon + connection dot

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Frequency change while streaming** | Existing arrows stay. New messages arrive at new rate. No reset of arrow history -- the density change is visible as a transition point in the timeline. Overhead counter continues accumulating. |
| **Disconnect while at high frequency** | Pause message generation for all lanes. Reconnection logic runs per-transport. On reconnect, messages resume at current frequency. Arrow gap during disconnection is visible as empty space on timeline. |
| **Send client message while disconnected** | All three lanes show failed send (red X on arrow). Different failure modes: WS shows "not connected" error, SSE shows "server->client only" (separate from disconnect), LP shows "no active request." |
| **Rapid frequency toggling** | Debounce frequency changes by 500ms. During debounce, show a brief "adjusting..." label on the control. Prevents arrow spam from rapid rate changes. |
| **Timeline overflow (> 200 arrows in a lane)** | Enable vertical auto-scroll within lane. Keep latest 50 arrows visible, older arrows scroll above viewport. A "scroll up for history" label at top of lane. Cap at 500 arrows total -- oldest are garbage collected. |
| **Server stop + restart** | Clicking "Stop Server" pauses all lanes. Arrow generation stops. Clicking "Start Server" again resumes from current state (arrows preserved). A vertical separator line appears on the timeline at the restart point. |
| **Mobile (< 768px)** | Lanes stack vertically. Each lane collapses to show only the last 10 arrows. Expand to full view on tap. Control bar wraps: frequency segment on top row, buttons on bottom row. |
| **Keyboard accessibility** | Tab order: Frequency segment -> Start/Stop button -> Disconnect button -> Send Message button. Arrow keys on frequency segment to switch. `aria-live="polite"` on overhead counters and connection status. |
| **Reduced motion** | Arrows appear at full length instantly. Connection dots change color without transition. No auto-scroll animation (jump to latest). |

### Cross-Lesson Connections

- **Depends on net-intro**: Understanding TCP connections and the handshake cost is prerequisite. Long Polling's overhead is visible BECAUSE the reader already knows that each HTTP request involves connection setup (or at least request/response framing).
- **Depends on net-protocols**: HTTP/2 multiplexing matters for long polling efficiency. If the reader knows HTTP/2, they understand that long polling over HTTP/2 might reuse a single connection -- but the request/response overhead per poll remains.
- **Parallels with net-protocols**: Both use the battle format with a "gradient control" (packet loss / frequency) that differentiates approaches. The building agent should use identical DemoSandbox + Dial/DialSegment layout patterns for consistency.
- **Foreshadows net-rest-graphql**: SSE's server-to-client-only constraint is directly relevant to GraphQL subscriptions (which often use SSE or WebSocket). The directionality lesson here prepares the reader.
- **The "try adding [parameter]" nudge pattern**: Same as net-protocols. A muted hint near the differentiating control appears after the initial demo makes the approaches look similar.

---

## net-rest-graphql -- REST vs GraphQL Explorable
**Format**: explorable | **Effort**: medium

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (data checkboxes visible, no selections yet)
                          +-----+-----+
                                |
                     [check any data field checkbox]
                                |
                          +-----v---------+
                          | fields-selected|  (REST + GraphQL panels update simultaneously)
                          +-----+---------+
                                |
               +----------------+----------------+
               |                                 |
      [REST panel updates]              [GraphQL panel updates]
      Shows N requests needed           Shows 1 query with
      Highlights wasted fields          exactly checked fields
               |                                 |
               +----------------+----------------+
                                |
                     [check "posts" field]
                                |
                          +-----v---------+
                          | posts-visible |  (posts list renders in both panels)
                          +-----+---------+
                                |
                     [check "author info per post"]
                                |
                          +-----v-----------+
                          | n-plus-1-active |  (REST shows N+1 requests, GraphQL shows 1)
                          +-----+-----------+
                                |
                     [click "Show Tradeoffs" panel]
                                |
                          +-----v-----------+
                          | tradeoffs-open  |  (GraphQL downsides visible)
                          +-----+-----------+
                                |
                     [uncheck fields to compare different combos]
                                |
                          +-----v---------+
                          | fields-selected|  (free exploration continues)
                          +-----------+---+
                                      |
                           [3+ different field combinations tried]
                                      |
                                +-----v-----+
                                |  summary  |  (insight panel fades in)
                                +-----------+
```

**Data driving each state:**
- `idle`: `selectedFields: Set()` (empty), both panels show placeholder content
- `fields-selected`: `selectedFields: Set<FieldName>`, REST and GraphQL panels derive their content from the selection
- `n-plus-1-active`: `selectedFields` includes `'posts'` AND `'postAuthorInfo'`
- `tradeoffs-open`: `tradeoffPanelOpen: boolean`
- `summary`: `fieldCombinationsTried: number >= 3`

### Visual Choreography

**Static layout:**
- Full-width explorable. No scrollytelling shell -- content fills available width, `max-width: 960px`, centered.
- **Field selector** at top: A checklist panel representing "data needed for a user profile page". Background: `var(--color-surface-2)`, border: 1px solid `var(--color-border)`, border-radius: `var(--radius-2)`, padding: `var(--space-4)`. Title: "What data does this page need?" in `var(--font-mono)` `var(--text-sm)`.
  - Checkbox fields (each is a custom styled checkbox + label):
    - `name` -- "User name" (default: checked)
    - `avatar` -- "Profile avatar"
    - `bio` -- "Bio text"
    - `email` -- "Email address"
    - `posts` -- "Recent posts (10)"
    - `postAuthorInfo` -- "Author info per post" (nested, indented 20px, disabled until `posts` checked)
    - `followerCount` -- "Follower count"
    - `notificationCount` -- "Notification count"
  - Checkbox appearance: 18x18px, border 2px `var(--color-border)`, border-radius 4px. Checked: fill `var(--color-accent)`, white checkmark. Label: `var(--font-mono)` `var(--text-sm)`.

- **Two panels side-by-side** below the field selector (stacked on mobile < 768px):
  - **REST panel** (left, 50% width): header "REST" in `var(--diagram-layer-4)` (orange). Background: `var(--color-surface)`, border-radius: `var(--radius-2)`, border: 1px `var(--color-border)`.
  - **GraphQL panel** (right, 50% width): header "GraphQL" in `var(--diagram-layer-2)` (purple). Same styling.
  - Each panel contains:
    - **Request section**: shows the HTTP requests that would fire.
    - **Response section**: shows the JSON response with field-level annotations.
    - **Metrics bar** at bottom: request count, total bytes, wasted bytes.

**REST panel content (dynamic based on field selection):**
- Request list: each endpoint is a rounded pill showing method + path.
  - `GET /api/user` -- always fires if any user field is checked. Returns: `{ id, name, avatar, bio, email, created_at, updated_at, plan, timezone, locale, ... }` (20+ fields).
  - `GET /api/user/posts` -- fires if `posts` is checked. Returns: `[{ id, title, body, created_at, author_id, likes, comments_count, tags, ... }]` (10 posts, 12+ fields each).
  - `GET /api/user/posts/:id/author` (x10) -- fires if `postAuthorInfo` is checked. One per post. Returns: `{ id, name, avatar }` per author.
  - `GET /api/user/followers/count` -- fires if `followerCount` is checked.
  - `GET /api/user/notifications/count` -- fires if `notificationCount` is checked.
- Pill colors: method badge `var(--diagram-layer-1)` (green) for GET, path in `var(--font-mono)` `var(--text-xs)`.
- Request counter: "N requests" in large `var(--text-lg)` bold. Animates on change (count-up, 200ms).
- **Response JSON viewer**: Rendered as a formatted JSON block with syntax highlighting. `var(--font-mono)` `var(--text-xs)`, `var(--color-surface)` bg. CRITICAL: fields that are returned but NOT needed by the reader's selection are highlighted with a `var(--color-error)` background at 15% opacity and a 2px left border in `var(--color-error)`. These "wasted" fields have strikethrough text. A running tally at the bottom: "N of M fields used (X% wasted)" where the percentage is in `var(--color-error)` when > 40%.
- Each request pill animates in when triggered: slide from left, 200ms, `TRANSITION.enterItem`. Request arrows fly from the panel to a small "server" icon (24x24px) at top-right of the REST panel.

**GraphQL panel content (dynamic based on field selection):**
- Single request pill: `POST /graphql`. Always exactly 1 request (except when no fields selected).
- **Query viewer**: A formatted GraphQL query block showing EXACTLY the fields the reader checked. `var(--font-mono)` `var(--text-xs)`. Syntax highlighted: `query` keyword in `var(--diagram-layer-2)`, field names in `var(--color-text)`, braces in `var(--color-muted)`.
  ```graphql
  query {
    user {
      name
      avatar
    }
  }
  ```
  The query updates live as checkboxes are toggled. New fields slide in (height 0 -> 20px, 200ms, `TRANSITION.enterItem`), removed fields slide out (height -> 0, 150ms).
- **Response JSON viewer**: Same formatting as REST, but NO red-highlighted fields. Every field in the response matches a checked field. Zero waste. A label: "0% wasted" in `var(--color-success)`.
- For the N+1 case (posts + author info): the query shows a nested resolver:
  ```graphql
  query {
    user {
      posts {
        title
        author {
          name
          avatar
        }
      }
    }
  }
  ```
  Still 1 request. The REST panel meanwhile shows 11 requests (1 for posts + 10 for authors).

**N+1 Problem visualization (when `posts` + `postAuthorInfo` are both checked):**
- REST panel: 11 request pills stack up. Request arrows fly to the server icon in rapid succession (staggered 60ms apart, `STAGGER.fast`). A bold label: "11 requests" in `var(--color-error)` `var(--text-lg)`. Below: a mini waterfall showing the 10 author requests firing sequentially, each as a 16px-tall bar. Labels: "GET /posts/1/author", "GET /posts/2/author", ...
- GraphQL panel: 1 request pill. Calm. Label: "1 request" in `var(--color-success)` `var(--text-lg)`.
- A versus indicator between the panels: "11 vs 1" in large `var(--text-2xl)` bold, the "11" in `var(--color-error)` and the "1" in `var(--color-success)`.

**Tradeoff panel (expandable at bottom):**
- Collapsed state: a button "Show GraphQL Tradeoffs" in `var(--font-mono)` `var(--text-sm)`, `var(--color-surface-2)` bg, border 1px `var(--color-border)`. Chevron down icon.
- Expanded state: slides down (height 0 -> auto, 300ms, `TRANSITION.collapse`). Content:
  - 4 tradeoff cards in a 2x2 grid (stacking on mobile):
    1. **Caching**: "No URL-based caching. Every POST request bypasses CDN/browser cache. Requires custom cache layers (Apollo, Relay)." Icon: a broken cache symbol. Color accent: `var(--color-error)`.
    2. **Schema Overhead**: "Schema definition, resolvers, and type generation add significant upfront work. Every field change requires schema updates." Icon: a schema diagram. Color accent: `var(--diagram-layer-3)` (yellow).
    3. **Tooling Required**: "Needs a GraphQL server, client library, code generation. REST works with fetch()." Icon: a toolbox. Color accent: `var(--diagram-layer-3)`.
    4. **Error Handling**: "GraphQL returns 200 OK even for errors. Errors are in the response body, not the status code. Custom error parsing required." Icon: a warning triangle. Color accent: `var(--color-error)`.
  - Each card: 200px min-width, `var(--color-surface)` bg, 1px `var(--color-border)` border, `var(--radius-2)`, `var(--space-3)` padding. Title in `var(--text-sm)` bold, description in `var(--text-xs)` `var(--color-muted)`.

**Reduced motion**: Checkbox changes cause instant panel updates (no slide-in for fields or request pills). Tradeoff panel opens instantly. Request arrows do not fly. Counter updates snap to new values.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees the field selector at top with "name" pre-checked. Below: REST panel shows `GET /api/user` (1 request). Response JSON shows the full user object with 20+ fields -- 19 of them highlighted in red as wasted. Label: "1 of 20 fields used (95% wasted)". GraphQL panel shows a clean `query { user { name } }` and a tiny response: `{ "name": "Jane Doe" }`. Label: "0% wasted".
2. **Reader checks "avatar"**: REST panel: same 1 request, but now 2 of 20 fields are used. "90% wasted." GraphQL: `avatar` line slides into the query. Response adds the avatar field. Still 0% waste. The red strikethrough fields in REST vs the clean GraphQL response is the first visual contrast.
3. **Reader checks "posts"**: REST panel: a second request pill slides in: `GET /api/user/posts`. Now 2 requests. The posts response JSON appears with 12+ fields per post, many highlighted red (likes, comments_count, tags -- not requested). GraphQL: the query expands with a `posts { title }` block. Response shows only titles. Still 1 request.
4. **Reader checks "author info per post"**: REST panel EXPLODES: 10 additional request pills fly in rapid-fire. Request counter jumps to 12. A mini waterfall of author requests appears. The "12 vs 1" versus indicator is dramatic. GraphQL: query adds `author { name avatar }` inside posts. Still 1 request.
5. **A nudge appears** near the tradeoff button: "GraphQL looks perfect -- but is it?" in `var(--color-muted)`.
6. **Reader clicks "Show GraphQL Tradeoffs"**: Panel expands showing 4 downsides. Caching, schema overhead, tooling, error handling. This prevents the reader from concluding "just always use GraphQL."
7. **Reader unchecks everything, then checks only "follower count"**: REST: `GET /api/user/followers/count` (1 request, lean endpoint). GraphQL: still 1 request, but requires the full GraphQL stack for a simple count. The tradeoff panel's "tooling required" card is relevant -- REST wins for simple cases.

### Data & State Shape

```typescript
type FieldName =
  | 'name' | 'avatar' | 'bio' | 'email'
  | 'posts' | 'postAuthorInfo'
  | 'followerCount' | 'notificationCount';

interface RestEndpoint {
  method: 'GET' | 'POST';
  path: string;
  responseFields: { name: string; used: boolean }[];  // used = field matches a checked checkbox
  count: number;                                       // 1 for most, 10 for per-post author
}

interface GraphQLQueryField {
  name: string;
  children?: GraphQLQueryField[];        // nested fields (e.g., posts -> author)
  indent: number;                        // for rendering
}

interface RESTvsGraphQLState {
  // Field selection
  selectedFields: Set<FieldName>;

  // REST derived
  restEndpoints: RestEndpoint[];         // derived from selectedFields
  restTotalRequests: number;             // derived: sum of endpoint counts
  restTotalFields: number;               // derived: sum of all response fields
  restUsedFields: number;                // derived: fields matching selection
  restWastePercent: number;              // derived: (total - used) / total * 100

  // GraphQL derived
  graphqlQuery: string;                  // derived: formatted query string
  graphqlQueryFields: GraphQLQueryField[];  // derived: structured for rendering
  graphqlTotalRequests: 1;               // always 1

  // Tradeoff panel
  tradeoffPanelOpen: boolean;

  // Discovery tracking
  fieldCombinationsTried: number;        // increments when selection changes significantly
  showSummary: boolean;                  // true when combinationsTried >= 3
  showTradeoffNudge: boolean;            // appears after N+1 demo
}

// Mock data (static, embedded in component):
const MOCK_USER = {
  id: "u_1a2b3c",
  name: "Jane Doe",
  avatar: "https://...",
  bio: "Frontend engineer...",
  email: "jane@example.com",
  created_at: "2024-01-15T...",
  updated_at: "2024-06-20T...",
  plan: "pro",
  timezone: "America/New_York",
  locale: "en-US",
  theme: "dark",
  two_factor: true,
  company: "Acme Inc",
  website: "https://jane.dev",
  github: "janedoe",
  twitter: "@janedoe",
  role: "admin",
  last_login: "2024-06-20T...",
  login_count: 847,
  storage_used: 2147483648,
  // ... 20+ fields total
};

const MOCK_POSTS: Array<{
  id: string; title: string; body: string;
  created_at: string; author_id: string;
  likes: number; comments_count: number;
  tags: string[]; slug: string; status: string;
  word_count: number; reading_time: number;
}>;  // 10 posts, 12+ fields each
```

### Primitives & Props

**DemoSandbox** -- Outer container for the explorable.
```tsx
<DemoSandbox title="REST vs GraphQL">
  <RESTvsGraphQLExplorable />
</DemoSandbox>
```

**DialPanel** -- Collapsible panel used for the tradeoff section. Already exists in `src/components/ui/dialkit/DialPanel.tsx`.
```tsx
<DialPanel title="GraphQL Tradeoffs" defaultOpen={false} accent="var(--color-error)">
  <TradeoffCards />
</DialPanel>
```

**New bespoke subcomponents (not reusable):**
- `FieldSelector` -- checkbox grid for selecting data fields, with dependent field handling (postAuthorInfo depends on posts)
- `RestPanel` -- left panel showing endpoint pills, response JSON with waste highlighting, and request counter
- `GraphQLPanel` -- right panel showing query editor, clean response, and request counter
- `ResponseJSON` -- formatted JSON viewer with per-field used/wasted annotations and strikethrough
- `EndpointPill` -- method + path badge with fly-in animation
- `WasteIndicator` -- "N% wasted" label with color-coded severity
- `VersusIndicator` -- centered "N vs 1" comparison between panels
- `TradeoffCard` -- single tradeoff item with icon, title, and description
- `NPlus1Waterfall` -- mini waterfall showing the 10 sequential author requests in REST

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **No fields selected** | Both panels show placeholder: "Select data fields above to compare" in `var(--color-muted)`. No requests, no JSON. REST request count: 0. GraphQL query: empty. |
| **All fields selected** | REST: 5 endpoints + 10 author requests = 15 total. GraphQL: 1 request. Maximum visual contrast. Waste % in REST varies per endpoint. |
| **postAuthorInfo without posts** | Checkbox is disabled (pointer-events: none, opacity 0.4) when posts is unchecked. If posts is unchecked while postAuthorInfo is checked, both uncheck simultaneously. |
| **Rapid checkbox toggling** | Debounce derived state computation by 100ms. REST/GraphQL panels use `AnimatePresence` for smooth entry/exit of request pills and query fields. No layout thrash. |
| **Very small viewport (< 480px)** | Panels stack vertically (REST above GraphQL). Field selector uses 2 columns instead of 4. Tradeoff cards stack to single column. JSON viewer has horizontal scroll for long lines. |
| **JSON viewer overflow** | Max-height: 300px per JSON block with `overflow-y: auto`. Wasted fields at the top of the response should be most visible (sort used fields to bottom? no -- keep natural API order to be realistic). |
| **Reader only explores REST (never looks at GraphQL)** | After 30s of only interacting with REST-side, a nudge arrow points to the GraphQL panel: "compare the approaches" in `var(--color-muted)`. |
| **Keyboard accessibility** | Checkboxes are native `<input type="checkbox">`. Tab order flows through checkboxes, then tradeoff button. REST/GraphQL panels are `role="region"` with `aria-label`. Request counts and waste percentages are `aria-live="polite"`. |
| **Screen reader for wasted fields** | Each wasted field in the JSON has `aria-label="unused field: {fieldName}"`. Waste summary is read as "15 of 20 fields returned are not used by this page". |

### Cross-Lesson Connections

- **Depends on net-intro**: The reader must understand that each HTTP request has connection overhead (DNS, TCP, TLS). The N+1 problem is painful BECAUSE each request carries that overhead. 11 requests means 11x the connection cost (or at least 11x the request/response framing on a reused connection).
- **Depends on net-protocols**: HTTP/2 multiplexing reduces the N+1 penalty (parallel requests over one connection), but doesn't eliminate the request overhead. HTTP/1.1 makes N+1 even worse (max 6 connections). The reader who remembers the protocol battle understands the transport-level cost.
- **Depends on net-long-polling**: SSE's server-to-client constraint relates to GraphQL subscriptions. If the reader wants real-time data with GraphQL, they need SSE or WebSocket (from the previous lesson) as the transport.
- **Section 6 culmination**: This stop ties together the full section. The request lifecycle (net-intro) establishes what a request costs. Protocol differences (net-protocols) affect how multiple requests perform. Transport choices (net-long-polling) affect real-time patterns. Now REST vs GraphQL is about data fetching EFFICIENCY on top of all that infrastructure. The reader has the full picture: transport -> protocol -> API paradigm.
