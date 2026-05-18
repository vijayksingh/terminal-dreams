# Concurrency Patterns in JS

**Status:** Expanded idea -- not yet started
**Created:** 2026-05-15
**Tags:** Concurrency, Event Loop, Scheduling, Web Workers, Async Patterns, React Scheduler, Partykit, Comlink, AbortController

---

## The Idea

A six-post series exploring how JavaScript handles concurrency despite being single-threaded, examined through the lens of real-world open-source libraries. The unifying thesis: **JavaScript does not have concurrency -- it has the illusion of concurrency, built from carefully choreographed cooperation between your code and the runtime.** Understanding that choreography is the difference between code that works and code that freezes, races, or silently corrupts state.

Static diagrams cannot teach concurrency. A box labeled "microtask queue" next to a box labeled "macrotask queue" tells the reader nothing about *ordering*, *timing*, or *preemption*. Concurrency bugs are about things happening in the wrong order, at the wrong time, or not at all. The only way to build intuition for these failures is to watch them happen -- to see tasks queue, execute, block, yield, race, and cancel in real time, and to manipulate the variables that determine those outcomes.

Each post follows the same arc: **constraint -> mechanism -> annotated source from a real repo -> interactive proof**. The reader never takes our word for it -- they schedule tasks, trigger race conditions, block the main thread, and build transferable mental models that apply far beyond any single library.

---

## Series Structure

1. **The Problem** -- the single-threaded constraint, event loop internals, microtasks vs. macrotasks, the 16ms frame budget, what "blocking" actually looks like
2. **React Scheduler** -- cooperative scheduling, priority lanes, time-slicing, the `shouldYield` pattern, how React gives the browser its thread back
3. **Partykit / PartyServer** -- real-time multiplayer state, WebSocket connection management, conflict resolution, shared mutable state across connections
4. **Web Workers & Comlink** -- true parallelism in the browser, structured cloning, transferable objects, how Comlink makes workers feel like async functions
5. **Async Patterns Deep Dive** -- AbortController, race conditions, Promise.allSettled, cancellation, cleanup, how real libraries handle the edges
6. **Synthesis** -- the concurrency decision tree, when to use scheduling vs. workers vs. async patterns, how they compose

---

## Shared Primitives

Before detailing each post's widgets, identify the reusable visual primitives this series needs. Building these first (per the project's FlowDiagram ethos: composable primitives, not monolithic one-offs) means later widgets are assembled from tested, consistent parts.

### `<TimelineRuler>`

A horizontal time axis with configurable units (ms, frames, seconds). Supports a draggable cursor for scrubbing, markers at arbitrary positions, and labeled spans (bars). Used in nearly every widget in the series.

```tsx
interface TimelineRulerProps {
  durationMs: number;
  cursorMs: number;
  onCursorChange: (ms: number) => void;
  markers?: Array<{ ms: number; label: string; color: string }>;
  spans?: Array<{ startMs: number; endMs: number; label: string; color: string }>;
  showFrameBudgetLines?: boolean; // vertical dashed lines every 16.67ms
}
```

### `<QueueVisualizer>`

A vertical or horizontal queue that shows items entering, waiting, and exiting. Items are colored blocks with labels. Supports FIFO, priority, and drain-all semantics. Animates enqueue (item slides in), dequeue (item slides out), and reordering (items swap positions).

```tsx
interface QueueVisualizerProps {
  items: Array<{ id: string; label: string; color: string; priority?: number }>;
  direction: "horizontal" | "vertical";
  mode: "fifo" | "priority" | "drain-all";
  maxVisible: number;
  onDequeue?: (item: Item) => void;
}
```

### `<FrameBudgetBar>`

A horizontal bar representing a single 16.67ms frame. Fills left-to-right as work is done within the frame. Color transitions: green (0-8ms, plenty of budget), yellow (8-14ms, getting tight), red (14-16.67ms, barely making it), flashing red with overshoot indicator (>16.67ms, frame dropped). Used in Post 1 and Post 2.

```tsx
interface FrameBudgetBarProps {
  usedMs: number;
  budgetMs?: number; // default 16.67
  label?: string;
  showOvershoot?: boolean;
}
```

### `<PlaybackControls>`

Shared play/pause/speed/reset controls. Consistent across all widgets. Speed presets: 0.25x, 0.5x, 1x (default), 2x, "Real speed." Reduced motion mode replaces continuous playback with step-through arrows.

```tsx
interface PlaybackControlsProps {
  playing: boolean;
  speed: number;
  onPlayPause: () => void;
  onSpeedChange: (speed: number) => void;
  onReset: () => void;
  onStep?: (direction: "forward" | "backward") => void;
  showStepControls?: boolean; // for reduced motion
}
```

### `<ConnectionPipe>`

An SVG pipe connecting two endpoints. Supports animated particles (small circles) flowing through it. Configurable direction, speed, particle density, and color. Can show blockage (particles pile up at one end), bidirectional flow, and abort signals (red particle traveling in reverse). Reused in Post 1, Post 3, Post 4, Post 5.

```tsx
interface ConnectionPipeProps {
  from: { x: number; y: number };
  to: { x: number; y: number };
  particles: Array<{ id: string; progress: number; color: string }>;
  direction: "left-to-right" | "right-to-left" | "bidirectional";
  blocked?: boolean;
  curve?: "straight" | "bezier";
}
```

### `<CallStackFrame>`

A single frame in a call stack visualization. Rectangles stacked vertically, most recent on top. Supports push (slide in from top with `SPRING.snappy`), pop (slide out upward), and "stuck" indicator (frame turns red and pulses when it has been on the stack too long).

```tsx
interface CallStackFrameProps {
  frames: Array<{ id: string; name: string; duration?: number }>;
  maxVisible: number;
  stuckThresholdMs?: number;
}
```

---

## Post 1: The Problem -- One Thread to Rule Them All

### Thesis

JavaScript is single-threaded by design. This is not a limitation to work around -- it is a constraint that shapes every concurrency pattern in the language. The event loop is the mechanism that creates the *illusion* of concurrency by interleaving work at precise moments. Understanding the event loop's actual algorithm -- not the simplified "callback queue" version, but the real spec with microtask draining, rendering steps, and task priorities -- is the prerequisite for everything else in this series.

### Content Outline

**The single-threaded constraint and why it exists.** JavaScript was designed for DOM manipulation. Two threads mutating the DOM simultaneously would require locks, and locks are the source of an entire category of bugs (deadlocks, livelocks, priority inversion) that JS was designed to avoid. The trade-off: no data races, but also no parallelism. Every piece of JS you write shares a single call stack.

**The event loop algorithm, for real this time.** Not the "tasks go in a queue and get executed" simplification. The actual algorithm from the HTML spec:

1. Pick the oldest task from the task queue (macrotask). Execute it to completion.
2. Drain the microtask queue -- execute ALL pending microtasks, including any new ones added during execution. This is crucial: microtasks can spawn microtasks, and they ALL run before anything else.
3. If it is time to render (roughly every 16.67ms for 60fps):
   a. Run `requestAnimationFrame` callbacks
   b. Calculate styles, layout, paint
   c. Run `requestIdleCallback` if there is time remaining in the frame
4. Go to step 1.

The critical insight: steps 1 and 2 are *unbounded*. A macrotask can run for 500ms. Microtask draining can run indefinitely if microtasks keep spawning microtasks. Step 3 only happens if the browser gets a chance to run it. "Blocking the main thread" means being stuck in step 1 or 2 so long that step 3 never runs.

**Microtasks vs. macrotasks -- why it matters.** Concrete examples:
- `Promise.then` -> microtask (drains before rendering)
- `setTimeout(fn, 0)` -> macrotask (runs after next render opportunity)
- `queueMicrotask(fn)` -> microtask (explicitly)
- `requestAnimationFrame(fn)` -> runs at render time (step 3a)
- `MutationObserver` -> microtask
- `MessageChannel.port.onmessage` -> macrotask (React Scheduler uses this)

Show the ordering puzzle: if you call `setTimeout(A, 0)`, `Promise.resolve().then(B)`, `queueMicrotask(C)`, what order do they run? Answer: C, B (microtasks drain first, in FIFO order), then A (macrotask, next iteration). But if you call them inside a `setTimeout` callback, the ordering changes relative to the outer context.

**The 16ms budget.** At 60fps, the browser wants to paint every 16.67ms. If your JS work takes 20ms, you drop a frame. If it takes 100ms, you drop 6 frames and the user sees a noticeable stutter. If it takes 500ms, the page appears frozen. Show the budget breakdown: ~10ms for JS work (leaving ~6ms for browser rendering work), not the full 16ms. This budget is the reason React needs a scheduler (Post 2), the reason expensive computations belong in workers (Post 4), and the reason long promise chains can cause jank (Post 5).

**What "blocking" actually looks like.** A `while` loop that runs for 2 seconds: no rendering, no event handling, no animations, the cursor freezes, scroll is unresponsive. But also: a tight loop of 10,000 synchronous DOM reads/writes (layout thrashing), a JSON.parse of a 5MB string, a regex backtracking on a pathological input. "Blocking" is not always an obvious infinite loop -- it is any synchronous work that exceeds the frame budget.

### Interactive Widgets

#### Widget 1.1: The Event Loop Simulator

**What it teaches:** The actual event loop algorithm -- how the call stack, microtask queue, macrotask queue, and render step interact. The reader should internalize the microtask draining rule (ALL microtasks run before the next macrotask or render) and the consequences of exceeding the frame budget.

**Layout:** Four vertical columns, left to right:
- **Column 1: "Call Stack"** -- a vertical stack of frame rectangles (uses `<CallStackFrame>`). Most recent frame on top. When the stack is empty, it shows a subtle "idle" label.
- **Column 2: "Microtask Queue"** -- a vertical queue (uses `<QueueVisualizer>` in drain-all mode). Items are colored with `--diagram-layer-1` (green-hued). Label at the top: "Drains completely before moving on."
- **Column 3: "Macrotask Queue"** -- a vertical queue (uses `<QueueVisualizer>` in FIFO mode). Items are colored with `--diagram-layer-0` (blue-hued). Label at the top: "One per loop iteration."
- **Column 4: "Render"** -- a small frame preview (a miniature browser viewport) with a frame counter. Below it, a `<FrameBudgetBar>` showing how much of the 16ms budget has been consumed.

Below all four columns: a `<TimelineRuler>` showing elapsed time, with vertical dashed lines every 16.67ms (frame boundaries). The current position is marked with a cursor.

Above the columns: a **control panel** with buttons to schedule different types of work.

**Animation spec:**
- **Event loop cursor:** A glowing dot that orbits through the four columns in the event loop's actual order: Call Stack -> Microtask Queue (drain all) -> Render -> Macrotask Queue (pick one) -> Call Stack. The dot's position represents "where in the algorithm the event loop currently is." It moves with `SPRING.gentle` and pauses briefly at each stage.
- **Scheduling a task:** When the reader clicks a button (e.g., "setTimeout"), a new block appears at the bottom of the Macrotask Queue. It slides in from the right with `SPRING.snappy`. The block is labeled with the function name and has a small clock icon.
- **Scheduling a microtask:** When the reader clicks "Promise.then" or "queueMicrotask," a new block appears in the Microtask Queue. It slides in from the right, colored green to distinguish from macrotasks.
- **Execution:** When the event loop cursor reaches the Call Stack and a task/microtask is being processed, the corresponding block lifts from its queue and floats to the Call Stack, inserting as the top frame. The float animation follows a curved bezier path with `SPRING.gentle`. On the call stack, the frame shows a small progress bar that fills over its execution duration. When complete, the frame pops off the top of the stack (slides up and fades out over `DURATION.fast`).
- **Microtask drain:** When the cursor reaches the microtask queue, ALL queued microtasks execute sequentially. They lift one at a time to the call stack, execute, and pop. Crucially, if a microtask spawns another microtask (the reader can configure this), the new microtask appears in the queue mid-drain and is also executed before moving on. The queue visually never finishes draining until no more microtasks remain.
- **Render step:** When the cursor reaches the Render column, the frame preview updates. The frame counter increments. The `<FrameBudgetBar>` fills based on how much JS work happened since the last render. If the budget was exceeded, the bar flashes red and the frame counter shows a "DROPPED" indicator on the missed frame.
- **Blocking task:** The "Blocking Task (500ms)" button schedules a macrotask with a 500ms execution time. When it runs, the call stack frame turns red and pulses (`LOOP.pulse`). The event loop cursor stops -- it cannot advance. The render column shows "BLOCKED" in red. The frame budget bar overflows dramatically. The frame counter shows dropped frames accumulating. The microtask and macrotask queues pile up with pending work, visibly growing. When the blocking task finally completes, there is a rush of activity as queued work processes.

**Interaction:**
- **Schedule buttons:** "setTimeout(fn, 0)", "Promise.then(fn)", "queueMicrotask(fn)", "requestAnimationFrame(fn)", "Blocking Task (500ms)". Each button adds work to the appropriate queue.
- **Microtask spawning toggle:** A checkbox on the "Promise.then" button: "Spawns another microtask." When checked, each microtask that executes spawns one more. The reader can watch the microtask queue never drain (until they uncheck it), demonstrating how microtask storms can starve rendering.
- **Speed control:** `<PlaybackControls>` below the timeline. Speed range 0.1x to 3x. Default 0.5x (slow enough to see individual steps).
- **Step mode:** A "Step" button that advances the event loop one step at a time. The reader manually walks through: "Execute this macrotask. Now drain microtasks. Now render. Now pick the next macrotask."
- **Reset:** Clears all queues and the call stack.

**Component API (rough):**
```tsx
interface EventLoopSimulatorProps {
  initialTasks?: ScheduledTask[];
  speed?: number;
  stepMode?: boolean;
  showFrameBudget?: boolean;
}

interface ScheduledTask {
  type: "macrotask" | "microtask" | "raf";
  label: string;
  durationMs: number;
  spawnsMicrotask?: boolean;
  color?: string;
}
```

**Why animation is essential:** The event loop is a *process*, not a structure. A static diagram showing three boxes (call stack, microtask queue, macrotask queue) teaches topology but not behavior. The critical lessons -- microtasks drain completely, one macrotask per iteration, rendering can be starved -- are all about *ordering and timing*. The blocking task scenario is impossible to teach statically: the reader must watch the cursor freeze, the frame counter stall, and the queues pile up to understand what "blocking the main thread" means. The step mode is key for building the mental model: the reader becomes the event loop, manually deciding what happens next.

---

#### Widget 1.2: The Frame Budget Monitor

**What it teaches:** The concrete relationship between JS execution time and frame drops. The reader should develop an instinct for "this work is too expensive for a single frame" by watching budget consumption in real time.

**Layout:** A vertical arrangement:
- **Top: "Work to Schedule"** -- a palette of differently-sized work blocks, each labeled with a name and estimated duration: "DOM Read (0.5ms)", "Style Recalc (2ms)", "JSON Parse (8ms)", "Layout Thrash (15ms)", "Heavy Computation (45ms)", "Regex Backtrack (200ms)". Each block's width is proportional to its duration.
- **Middle: "Frame Timeline"** -- a horizontal strip divided into 16.67ms frame slots. Each slot is a `<FrameBudgetBar>`. The reader drags work blocks from the palette into frame slots. As work accumulates in a frame, the budget bar fills. Multiple work blocks stack within a frame, showing total consumption.
- **Bottom: "Result"** -- a simple animation (a ball bouncing horizontally, or a CSS transition running). When frames are dropped, the animation visibly stutters. Smooth when budget is respected, janky when exceeded.

**Animation spec:**
- **Drag and drop:** Work blocks from the palette are draggable. When dragged, the block lifts with a subtle shadow increase and `SPRING.quick` scale to 1.05. When dropped into a frame slot, it snaps into position.
- **Budget fill:** Each `<FrameBudgetBar>` fills as work is added. Color transitions: green -> yellow (at 50%) -> orange (at 75%) -> red (at 100%). If total work exceeds 16.67ms, the bar overflows -- a red overflow section extends beyond the bar's right edge, and a "FRAME DROP" badge appears with a shake animation (`SPRING.quick`, small x-oscillation).
- **Bouncing ball:** The ball animation at the bottom runs at a target 60fps. Each frame slot in the timeline corresponds to one frame of the ball animation. Dropped frames cause the ball to "teleport" (skip positions) rather than move smoothly. The reader can see the direct relationship: drag "Heavy Computation (45ms)" into a frame slot, watch the ball jump at that exact moment.
- **Layout thrashing demo:** The "Layout Thrash (15ms)" block, when placed in a frame, shows a tooltip: "Forces synchronous layout: read offsetHeight, write style, read offsetHeight, write style..." The budget bar fills differently -- instead of one smooth fill, it shows a stutter pattern (read-write-read-write) with tiny pauses between each forced layout.

**Interaction:**
- Drag work blocks from palette to frame slots
- Remove blocks by dragging them back to the palette (or pressing delete when selected)
- Click a frame slot to expand it and see the breakdown of work within it
- A "Fill randomly" button that distributes realistic work across 10 frames -- some frames under budget, some over -- and plays the resulting animation to show the jank pattern
- A "requestAnimationFrame" toggle: when enabled, heavy work is split across frames using rAF, and the reader can see how the same total work, distributed differently, produces smooth vs. janky animation

**Component API (rough):**
```tsx
interface FrameBudgetMonitorProps {
  workBlocks: Array<{
    id: string;
    label: string;
    durationMs: number;
    category: "dom" | "compute" | "layout" | "parse";
  }>;
  frameCount: number; // how many frame slots to show
  targetFps: number;  // default 60
}
```

**Why animation is essential:** The frame budget is fundamentally about motion. "16ms per frame" is meaningless until the reader drags a 45ms task into a frame slot and watches the bouncing ball jerk. The visceral connection between "too much work" and "visible stutter" cannot be taught with numbers alone. The layout thrashing variant is particularly important: it shows that the *pattern* of work (interleaved reads and writes) matters as much as the *amount* of work, which is a lesson that surprises even experienced developers.

---

#### Widget 1.3: The Ordering Puzzle

**What it teaches:** Microtask vs. macrotask ordering, which is the source of countless subtle bugs. The reader should be able to predict the execution order of mixed async operations.

**Layout:** Two panels side by side:
- **Left panel: "Code"** -- a code editor showing a short JS snippet (5-10 lines) with numbered statements. Each statement schedules work using a different mechanism: `console.log` (synchronous), `setTimeout(fn, 0)`, `Promise.resolve().then(fn)`, `queueMicrotask(fn)`, `requestAnimationFrame(fn)`. Each line is color-coded by type: synchronous = white, microtask = green (`--diagram-layer-1`), macrotask = blue (`--diagram-layer-0`), rAF = purple (`--diagram-layer-2`).
- **Right panel: "Execution Order"** -- a numbered list that fills in as the reader predicts or as the simulation runs. Initially empty slots labeled "1st: ?", "2nd: ?", etc.

Below: a prediction mode toggle and a "Run" button.

**Animation spec:**
- **Prediction mode:** The reader clicks lines in the code editor in the order they think the code will execute. Each clicked line animates to the next empty slot in the execution order list. The line number in the code dims (already placed). When all lines are placed, the reader clicks "Check" and the correct order is revealed: correctly placed lines get a green checkmark with a gentle pulse, incorrectly placed lines get a red X and slide to their correct position with `SPRING.snappy`. A score appears: "4/6 correct."
- **Simulation mode:** The reader clicks "Run." The event loop simulator from Widget 1.1 appears in miniature below the code, and lines execute one at a time. Each line highlights in the code (a moving highlight bar, `TRANSITION.enterItem`), and the corresponding statement appears in the execution order list. Synchronous statements execute immediately (fast). Then microtasks drain (the microtask queue flashes as each runs). Then the render step. Then macrotasks. The execution order list fills in real time.
- **Transitions between puzzles:** Multiple puzzle scenarios are available (tabs or a "Next Puzzle" button). Each is progressively harder:
  1. Simple: two setTimeouts and a Promise
  2. Medium: nested Promises (a .then that returns another .then)
  3. Hard: a setTimeout that contains a Promise, and a Promise that contains a setTimeout
  4. Expert: async/await mixed with queueMicrotask and requestAnimationFrame
  5. Devilish: a microtask that spawns a microtask that spawns a setTimeout -- when does the setTimeout run?

**Interaction:**
- Toggle between Prediction mode and Simulation mode
- In Prediction mode, click lines to place them in order, then check
- In Simulation mode, watch the execution play out
- "Next Puzzle" to advance through difficulty levels
- "Explain" button on each puzzle that reveals a step-by-step annotation: "Line 3 runs first because it's synchronous. Then line 5 (microtask, queued during synchronous execution). Then..."

**Component API (rough):**
```tsx
interface OrderingPuzzleProps {
  puzzles: Array<{
    code: string;
    statements: Array<{
      line: number;
      label: string;
      type: "sync" | "microtask" | "macrotask" | "raf";
      executionOrder: number;
    }>;
    explanation: string;
  }>;
  mode: "prediction" | "simulation";
  activePuzzle: number;
}
```

**Why animation is essential:** Ordering is the concept. A static list of "Promise.then runs before setTimeout" is a fact to memorize. The prediction mode turns it into an active reasoning exercise -- the reader must apply the mental model, not just read it. The simulation mode, with its miniature event loop showing tasks flowing through queues, makes the abstract rule ("microtasks drain before the next macrotask") concrete and observable. The progressive difficulty forces the reader to handle increasingly tricky edge cases, building genuine fluency rather than surface familiarity.

---

### Critical Questions for Post 1

- **Are we teaching the spec or a useful simplification?** The real event loop spec (HTML Standard section 8.1.7.3) has details we should omit (task source priorities, agent event loops, spin-the-event-loop). Our model should be accurate enough that no prediction the reader makes based on it will be wrong, but simple enough that they can hold it in their head. The four-step model (macrotask -> microtask drain -> render -> repeat) is the right level.
- **The microtask storm scenario is dangerous.** Widget 1.1's "microtask spawns microtask" toggle can create an infinite loop that starves rendering. In our simulation this is safe (we control the clock), but the reader might try it in a real console. Include a warning and explain that `while(true)` and microtask storms are equivalent in their effect on the page.
- **requestAnimationFrame's position in the loop.** rAF runs at "render time" but is technically a macrotask in some mental models. Our model should place it clearly: it runs during the render step, after microtask draining, before paint. The event loop simulator must get this right or the ordering puzzle answers will be wrong.
- **Node.js event loop differences.** The HTML event loop and Node's libuv event loop are different (Node has `process.nextTick`, `setImmediate`, and different phase ordering). This post should explicitly scope to the browser event loop and note the divergence. A future post or sidebar could cover Node.
- **Is the frame budget monitor too gamified?** Dragging blocks into slots is fun, but does it build real intuition? The connection to the bouncing ball is critical -- without seeing the *consequence* of budget overruns, the budget numbers are abstract. Make sure the ball animation is always visible, never scrolled out of view.

---

## Post 2: React Scheduler -- Cooperative Scheduling

### Thesis

React Scheduler is one of the most sophisticated pieces of userland JavaScript ever written, and almost nobody reads it. It implements cooperative multitasking on top of a single-threaded runtime: breaking work into small units, assigning priorities, and voluntarily yielding back to the browser before the frame budget is exhausted. The `shouldYield` function -- five lines of code that check if 5ms have elapsed -- is the heartbeat of concurrent React.

### Content Outline

**Why React needs a scheduler.** Rendering a large component tree can take 50-200ms. Without a scheduler, that is 50-200ms of uninterrupted work on the main thread. No rendering, no event handling, no animations. The user experience degrades. React's solution: break rendering into small units of work (fibers), schedule them with priorities, and interrupt rendering to let the browser breathe.

**The cooperative scheduling contract.** Unlike OS-level preemptive scheduling (where the OS can interrupt any thread at any time), cooperative scheduling requires the scheduled code to voluntarily yield. React's scheduler checks `shouldYield()` between each unit of work. If 5ms have elapsed, React stops rendering and schedules a continuation via `MessageChannel.port.postMessage()`. This posts a macrotask, which means: the browser gets to process events, run rAF, and paint before React resumes. The 5ms "time slice" is React's self-imposed budget -- roughly 1/3 of a 16ms frame.

**Why MessageChannel and not setTimeout?** `setTimeout(fn, 0)` has a minimum delay of ~4ms (spec says 1ms for the first few calls, then clamps to 4ms). `MessageChannel` fires a macrotask with no artificial delay. React tried `requestAnimationFrame` first but it fires at most once per frame (60 times/second), which is too infrequent. `MessageChannel` fires as fast as the event loop allows. Walk through the `schedulePerformWorkUntilDeadline` function in React's source.

**Priority lanes.** React 18 introduced lanes -- a bitmask-based priority system. Different updates have different urgencies:
- `SyncLane`: must finish this frame (user typing in an input)
- `InputContinuousLane`: drag, scroll -- high priority but can span frames
- `DefaultLane`: normal state updates (data fetching results)
- `TransitionLane`: `startTransition` updates -- explicitly low priority
- `IdleLane`: background work -- only runs when nothing else needs the thread

Walk through how lanes are assigned, how the scheduler picks the highest-priority work, and how a high-priority update can interrupt a lower-priority render in progress.

**Time-slicing in action.** Annotated walkthrough of a concurrent render:
1. A `startTransition` update triggers a low-priority render
2. The scheduler begins rendering the fiber tree, checking `shouldYield()` between each fiber
3. After 5ms, `shouldYield()` returns true. React stores its position in the fiber tree (the current work-in-progress fiber) and exits.
4. A `MessageChannel` message is posted. The browser processes pending events and paints.
5. The message handler fires. React resumes from where it stopped, processing more fibers.
6. A high-priority user input arrives mid-render. React interrupts the transition render, processes the input synchronously, then resumes the transition.

**The `shouldYield` function, annotated.** This is the core of the entire scheduler -- it is astonishingly simple:
```js
function shouldYieldToHost() {
  const timeElapsed = getCurrentTime() - startTime;
  if (timeElapsed < frameInterval) { // frameInterval = 5ms
    return false;
  }
  return true;
}
```
Five lines. But those five lines represent a philosophical decision: React will NEVER hold the main thread for more than 5ms at a time (barring synchronous lane work). This is what "cooperative" means.

### Interactive Widgets

#### Widget 2.1: The Time-Slicing Timeline

**What it teaches:** How React breaks rendering into 5ms chunks interleaved with browser work. The reader should see that "concurrent rendering" does not mean "parallel rendering" -- it means "rendering with polite interruptions."

**Layout:** A horizontal timeline occupying full content width. Two parallel swim lanes:
- **Top lane: "Main Thread"** -- shows what is running on the main thread at each moment. Segments colored by owner: React work in purple (`--diagram-layer-2`), browser rendering in green (`--diagram-layer-1`), user events in amber (`--diagram-layer-3`), idle in gray.
- **Bottom lane: "React Fiber Tree"** -- a simplified tree (8-12 nodes) representing a component hierarchy. Each node is a small circle. As the timeline progresses, the "current fiber" is highlighted, advancing through the tree in depth-first order.

A `<TimelineRuler>` below both lanes shows elapsed time in ms, with `<FrameBudgetBar>` indicators at frame boundaries.

**Animation spec:**
- **Synchronous mode (no scheduler):** A toggle at the top: "Synchronous | Concurrent." In synchronous mode, the main thread lane shows one long purple bar (React rendering) spanning 80ms. The fiber tree lights up nodes rapidly in sequence. The frame budget bars all show red overshoot. No browser rendering segments appear until React finishes. A frozen "60fps indicator" in the corner shows the frame count stalling.
- **Concurrent mode:** The main thread lane shows an alternating pattern: 5ms purple (React) -> 2ms green (browser paint) -> 5ms purple (React) -> 2ms green -> ... The fiber tree advances a few nodes during each purple segment, then pauses. The frame budget bars show each frame comfortably within budget. The 60fps indicator ticks smoothly.
- **Time-slice boundaries:** At each 5ms boundary in concurrent mode, a small "yield" marker appears on the timeline (a tiny pause icon). The handoff from React to browser is animated: the purple segment ends with a small "out" arrow, a gap (green/browser), then a small "in" arrow as React resumes.
- **Interruption scenario:** A "User Types" button. When clicked during a concurrent render, a yellow "input event" segment appears immediately on the main thread lane, interrupting the current React slice. React pauses (the fiber tree stops advancing), the input is processed, then React resumes. If clicked during synchronous mode, the input event is *delayed* -- it queues up and only processes after the entire render finishes. A visible delay counter shows "Input latency: 80ms" (sync) vs. "Input latency: 3ms" (concurrent).

**Interaction:**
- Synchronous / Concurrent toggle
- "User Types" button to inject an input event
- Speed control (0.25x to 2x)
- Click on any segment in the main thread lane to see details: "React rendered <ComponentName>, took 1.2ms"
- Hover on any fiber node to see when it was processed and in which time slice
- "Component count" slider (8 to 100 nodes) -- more nodes means more time slices, making the interleaving more dramatic

**Component API (rough):**
```tsx
interface TimeSlicingTimelineProps {
  mode: "synchronous" | "concurrent";
  fiberTree: FiberNode[];
  sliceDurationMs?: number; // default 5
  onInterrupt?: () => void;
  componentCount?: number;
}
```

**Why animation is essential:** Time-slicing IS time. A diagram showing "React work | browser | React work | browser" communicates the pattern but not the *feel*. The reader needs to see the smooth 60fps indicator in concurrent mode versus the stalling one in synchronous mode. The interruption scenario is the killer demo: clicking "User Types" during a synchronous render and watching the input queue up for 80ms, then toggling to concurrent and seeing it processed in 3ms, is the argument for concurrent React. No static comparison can replicate the *frustration* of the delayed input.

---

#### Widget 2.2: The Priority Lane Visualizer

**What it teaches:** How React's lane system determines which updates get processed first, and how high-priority updates can interrupt lower-priority work.

**Layout:** A vertical arrangement:
- **Top: "Pending Updates"** -- a panel with buttons to trigger different-priority updates: "User Input (Sync)", "Drag Event (Continuous)", "Data Fetch (Default)", "startTransition (Transition)", "Idle Callback (Idle)." Each button's color matches its priority lane.
- **Middle: "Lane Schedule"** -- five horizontal lanes (one per priority level), stacked vertically. Each lane shows a horizontal bar when work is pending in that lane. The bars are filled segments representing the amount of work. A vertical "now" line moves left to right as time progresses.
- **Bottom: "Execution"** -- a single-line timeline showing what the scheduler is actually executing. Only one lane's work can execute at a time. The color of the executing segment matches the lane.

**Animation spec:**
- **Triggering updates:** When the reader clicks a button, a colored bar appears in the corresponding lane. It starts as a thin bar and grows to represent the amount of work to be done.
- **Scheduling decision:** The scheduler picks the highest-priority non-empty lane. The "now" line advances, and the corresponding lane's bar begins depleting (shrinking from left) as work executes. The execution timeline at the bottom fills with that lane's color.
- **Interruption:** If a higher-priority update arrives while a lower-priority lane is executing: the lower-priority bar *pauses* (a small bookmark appears at the current position -- "will resume here"). The higher-priority bar starts executing. When the higher-priority work finishes, the lower-priority work resumes from the bookmark. In the execution timeline, this shows as: purple (transition) -> red interruption marker -> amber (sync lane) -> red resume marker -> purple (transition continues).
- **Starvation warning:** If a low-priority lane (Transition, Idle) has been waiting for more than N seconds (configurable), its bar starts pulsing with a warning color. A tooltip appears: "This update has been waiting for 3s. React will eventually bump its priority to prevent starvation." This teaches that priority systems without starvation prevention are broken.
- **Lane batching:** Multiple updates in the same lane are batched. Clicking "Data Fetch" three times rapidly shows three updates merging into one lane bar (they converge with a gathering animation), demonstrating automatic batching within a lane.

**Interaction:**
- Click priority buttons to add work to lanes
- A "work amount" slider on each button (how much work each update represents)
- Speed control for the scheduler simulation
- A "starvation timeout" slider to control when starved lanes get promoted
- A "batch window" toggle to show/hide how React batches updates in the same event handler
- Reset button

**Component API (rough):**
```tsx
interface PriorityLaneVisualizerProps {
  lanes: Array<{
    name: string;
    priority: number;
    color: string;
    pendingWork: number; // 0 to 1
  }>;
  starvationTimeoutMs: number;
  showBatching: boolean;
}
```

**Why animation is essential:** Priority scheduling is about *decision-making over time*. The scheduler constantly asks "what should I do next?" Static diagrams can show the priority hierarchy, but they cannot show the *interruption*: a transition render peacefully processing, then a sync update arriving and immediately preempting it, then the transition resuming exactly where it left off. That interruption/resumption cycle is the core insight of concurrent React, and it only makes sense as an animation.

---

#### Widget 2.3: The shouldYield Heartbeat

**What it teaches:** What happens inside a single 5ms time slice. The reader should see the fiber-by-fiber execution and understand that `shouldYield()` is checked between every single fiber.

**Layout:** A horizontally scrolling fiber tree at the top (8-15 nodes, each a labeled rectangle representing a component). Below the tree: a zoomed-in `<FrameBudgetBar>` showing the current 5ms slice. Below that: a code panel showing the `workLoopConcurrent` function with `shouldYield()` highlighted.

**Animation spec:**
- **Fiber processing:** Each fiber node in the tree lights up in depth-first order. When a fiber is active, it expands slightly (`SPRING.snappy`, scale to 1.1) and fills with its lane color. Below the tree, a small stopwatch shows elapsed time within the current slice: "0.0ms", "0.3ms", "0.8ms"...
- **shouldYield check:** After each fiber completes, a brief animation shows the `shouldYield()` check: the highlighted line in the code panel flashes. A small decision diamond appears between the current fiber and the next one: "5ms elapsed? No -> continue" (green path) or "5ms elapsed? Yes -> yield" (red path). The path taken animates with a dot traveling along it.
- **Yield moment:** When `shouldYield()` returns true, the current fiber gets a "paused" icon (a small bookmark/pin). The slice ends. The `<FrameBudgetBar>` shows the final usage. A "Yielding..." label appears. After a brief gap (representing browser time), a new slice begins and the next fiber lights up -- starting from the bookmarked fiber's sibling or parent.
- **Fast fibers vs. slow fibers:** Each fiber has a configurable processing time. Some are fast (0.1ms -- simple DOM elements), some are slow (2ms -- components with heavy render logic). The reader can see that a slice with all fast fibers processes many nodes, while a slice with one slow fiber processes far fewer. This teaches why component render cost matters even with time-slicing.

**Interaction:**
- Click any fiber node to set its processing time (0.1ms to 4ms)
- Click the slice duration to change it (1ms to 10ms, default 5ms)
- Step mode: advance one fiber at a time, watching the shouldYield check each time
- Play mode: watch the full render at adjustable speed
- "Add expensive component" button: inserts a 4ms fiber into the tree and re-runs the simulation to show how it consumes most of a slice

**Component API (rough):**
```tsx
interface ShouldYieldHeartbeatProps {
  fibers: Array<{
    name: string;
    processingTimeMs: number;
    children?: FiberSpec[];
  }>;
  sliceDurationMs?: number; // default 5
  stepMode?: boolean;
}
```

**Why animation is essential:** `shouldYield()` is a checkpoint that runs thousands of times per second in a real React app. It is invisible. This widget makes it visible: every fiber boundary is a decision point, and the reader can see the scheduler *deciding* whether to continue or yield. The zoomed-in view of a single 5ms slice, with the stopwatch counting up and the decision diamond flashing between each fiber, turns an invisible mechanism into a tangible process. The step mode is critical for building the mental model: the reader manually advances through fibers and watches the 5ms budget tick up until the yield decision changes.

---

### Critical Questions for Post 2

- **Are we reading React's actual source?** The annotated code should come from React's GitHub repo, pinned to a specific commit. The simplified versions in our widgets should be clearly labeled as simplifications, with links to the real source. If our simplification lies about any observable behavior, we have failed.
- **The 5ms slice is an implementation detail.** React could change it to 8ms or 3ms tomorrow. The widget should make the slice duration configurable and teach the principle (small slices interleaved with browser work) rather than the specific number.
- **MessageChannel is an implementation detail too.** React has used rAF, setTimeout, and MessageChannel at various points. The widget should acknowledge this history but focus on the *pattern* (posting a macrotask to yield) rather than the specific API.
- **Concurrent mode is not universally better.** For small component trees (render takes <5ms), concurrent mode adds overhead (scheduling, bookkeeping) with no benefit. The time-slicing timeline widget should include a "small tree" preset that shows synchronous and concurrent modes looking identical, with concurrent slightly slower due to overhead. Intellectual honesty matters.
- **Priority inversion is a real problem.** The lane visualizer should include a scenario where a low-priority update holds a resource (e.g., a context value) that a high-priority update needs. This is the classic priority inversion problem. Does React handle it? How? This is the kind of question that separates "learning library API" from "learning concurrency."

---

## Post 3: Partykit / PartyServer -- Distributed State Over WebSockets

### Thesis

Partykit is the first framework that makes server-side WebSocket state management feel as natural as React state. Under the hood, it solves the hardest concurrency problems in distributed systems: shared mutable state across multiple connections, message ordering, conflict resolution, and graceful disconnection. Single-threaded JavaScript on the server (running in Cloudflare Workers/Durable Objects) means no data races -- the same constraint that makes browser JS safe makes Partykit's server-side state safe. The single-threaded model is not a limitation here; it is the primary safety mechanism.

### Content Outline

**The real-time multiplayer problem.** N clients connected to a server via WebSockets, all reading and writing shared state. Without careful coordination: two users type in the same text field, messages arrive out of order, disconnected users see stale state, reconnecting users miss updates. These are concurrency problems, even though each individual runtime is single-threaded.

**The Partykit model.** Each "party" is an isolated server instance (a Durable Object) with:
- A single-threaded JS runtime (no data races within a party)
- Persistent storage (key-value, SQLite)
- A set of connected WebSocket clients
- Lifecycle hooks: `onConnect`, `onMessage`, `onClose`, `onError`

The critical insight: because the server is single-threaded, messages from different clients are serialized automatically. Client A's message is fully processed before Client B's message starts. This eliminates an entire class of concurrency bugs by design.

**Message ordering and the broadcast pattern.** When the server receives a message from Client A, it processes it and broadcasts the result to all connected clients (including A, for confirmation). Walk through the `onMessage` -> `this.room.broadcast()` cycle. Show the ordering guarantee: if Client A sends "add item" and Client B sends "remove item," the server processes them in arrival order, and all clients see the same final state.

**Conflict resolution strategies.** What if two clients edit the same field simultaneously?
- **Last-write-wins (LWW):** Simple, lossy. The last message to arrive overwrites the previous one.
- **Operational transform (OT):** Transform concurrent operations to preserve intent. Complex to implement correctly.
- **CRDTs:** Conflict-free replicated data types. Data structures that can be merged without conflicts. Partykit's `y-partykit` package integrates Yjs for this.
Walk through the trade-offs: LWW is simple but can lose data. OT preserves intent but is complex. CRDTs are mathematically elegant but increase payload size.

**Connection lifecycle and reconnection.** The WebSocket lifecycle: connecting -> open -> closing -> closed. What happens when a client disconnects?
- The server's `onClose` fires. The server can clean up client-specific state.
- The client reconnects (after a backoff delay). The server's `onConnect` fires again.
- The reconnected client needs to sync: what changed while they were gone?
- Strategies: replay missed messages (requires server-side message log), send full state snapshot (simple but bandwidth-heavy), delta sync (send only what changed).

**Annotated source walkthrough.** A real Partykit server implementation:
- A collaborative counter (simplest case)
- A shared document (Yjs/CRDT case)
- Connection management (hibernation, memory optimization)

### Interactive Widgets

#### Widget 3.1: The Connection Orchestrator

**What it teaches:** How multiple WebSocket clients communicate through a Partykit server, how messages are serialized on the server's single thread, and what happens during concurrent edits.

**Layout:** A horizontal arrangement:
- **Left: "Clients"** -- 3-4 rectangular panels, each representing a client. Each client has a small input field (representing a shared text input) and a connection status indicator (green dot = connected, amber = reconnecting, red = disconnected). Each client is labeled "Client A", "Client B", etc.
- **Center: "Server (Party)"** -- a larger panel representing the Partykit server. Inside: a "message queue" (vertical list of incoming messages, processed one at a time), a "state" display showing the current server state (e.g., the counter value or document text), and a "connection list" showing connected client IDs.
- **Right: "Broadcast"** -- arrows flowing from the server back to all clients. Each broadcast message is a small chip that travels from server to clients.

Uses `<ConnectionPipe>` for all WebSocket connections (bidirectional, with particles).

**Animation spec:**
- **Client sends message:** The reader types in a client's input field (or clicks a "Send Update" button). A message chip detaches from the client panel and travels along the `<ConnectionPipe>` to the server, using `SPRING.gentle` for the traversal. The chip is colored to match the client.
- **Server processing:** The message chip arrives in the server's message queue. If the queue is empty, it processes immediately: the state display updates, and a "processing" indicator pulses briefly. If another message is already being processed, the new chip queues up visibly below the current one. This is the key visualization: messages from different clients are serialized, not processed concurrently.
- **Broadcast:** After processing, the server emits broadcast chips that travel outward along all `<ConnectionPipe>` connections to all clients. Each client's display updates when the broadcast arrives. The broadcast chip carries the new state.
- **Concurrent edit conflict:** If Client A and Client B send messages within ~100ms of each other, both message chips travel to the server simultaneously. But the server processes them sequentially (one enters the processing slot, the other waits in the queue). The reader can see that even "simultaneous" messages are resolved by arrival order. A "Network Lag" slider on each client's pipe lets the reader adjust individual latencies -- making Client B's message arrive first even though it was sent second.
- **Disconnection:** A "Disconnect" button on each client. When clicked, the `<ConnectionPipe>` turns gray with a dashed stroke. The connection list in the server panel removes that client. If a message was in flight, it drops with a red flash and a "lost in transit" label. Clicking "Reconnect" re-establishes the pipe with a "reconnecting..." animation (pipe flickers between dashed and solid) and then the client receives a state snapshot (a large broadcast chip containing the full current state).

**Interaction:**
- Type in client input fields to send updates
- "Disconnect" / "Reconnect" buttons per client
- Network lag slider per client (0ms to 2000ms)
- "Add Client" button (up to 6 clients)
- Speed control for animations
- A "Simultaneous Edit" button that triggers edits from Client A and Client B at the exact same instant, showing how the server serializes them

**Component API (rough):**
```tsx
interface ConnectionOrchestratorProps {
  clients: Array<{
    id: string;
    label: string;
    connected: boolean;
    latencyMs: number;
  }>;
  serverState: unknown;
  conflictResolution: "last-write-wins" | "crdt";
}
```

**Why animation is essential:** Distributed concurrency is inherently about multiple things happening across space and time. Static diagrams show topology (clients connected to server) but not the *dynamics* (message A arrives before message B, broadcast propagates at network speed, disconnected client misses 3 updates). The network lag sliders are the teaching breakthrough: by adjusting individual client latencies, the reader can cause messages to arrive in different orders and see how the server's single-threaded processing resolves the ambiguity. Without interactive timing control, the reader cannot explore the ordering problem.

---

#### Widget 3.2: The Conflict Resolver

**What it teaches:** The three main conflict resolution strategies (LWW, OT, CRDT) and how each handles the same concurrent edit scenario differently.

**Layout:** Three panels side by side, one per strategy. Each panel shows:
- A shared text document (initially "Hello World")
- Two editor cursors (Client A and Client B) at different positions
- A "result" line showing the merged outcome

Below the panels: a shared timeline showing when each client's edit was sent and received.

**Animation spec:**
- **Setup:** Both clients have the same initial text: "Hello World." The reader configures two concurrent edits using preset scenarios or custom input:
  - Scenario 1: Client A inserts "Beautiful " before "World", Client B changes "World" to "Earth"
  - Scenario 2: Client A deletes "Hello", Client B inserts "Dear " before "Hello"
  - Scenario 3: Both clients type at the same cursor position simultaneously
- **LWW panel:** When "Run" is clicked, both edits animate simultaneously (typing indicators on both cursors). The timeline shows both messages traveling to the server. The server applies them in arrival order. The last one wins. The result shows the final text with a red strikethrough on the overwritten edit. A small "lost edit" counter increments. The animation emphasizes the loss: the overwritten text briefly appears, then gets replaced, then a "discarded" label fades in next to it.
- **OT panel:** Both edits animate. The server receives both and performs a transformation: it adjusts the second operation's position to account for the first operation's effect. The transformation is shown as a small calculation bubble: "Original: insert at position 6. After transform: insert at position 16 (because the first edit added 10 characters)." Both edits are preserved in the result. The text builds up letter by letter showing both contributions merging.
- **CRDT panel:** Both edits animate. No server-side transform needed -- the CRDT data structure (shown as a simplified tree of character nodes with unique IDs and positions) resolves conflicts automatically. Each character has a unique ID and a position between its neighbors. Concurrent inserts at the same position are ordered deterministically by client ID. The merge is shown as two branches of the tree converging.

**Interaction:**
- Choose from preset conflict scenarios or type custom concurrent edits
- "Run" button to see all three strategies resolve the same conflict simultaneously
- Speed control
- Click any panel to expand it and see the server-side processing in detail
- A "correctness scorecard" at the bottom: for each scenario, which strategies preserved both users' intent? LWW always scores lowest.

**Component API (rough):**
```tsx
interface ConflictResolverProps {
  initialText: string;
  editA: { position: number; action: "insert" | "delete"; text: string };
  editB: { position: number; action: "insert" | "delete"; text: string };
  activeStrategy?: "lww" | "ot" | "crdt" | "all";
}
```

**Why animation is essential:** Conflict resolution is about two edits happening "at the same time" and the system deciding what the result should be. The three-panel simultaneous comparison is the teaching device: the reader sees the same inputs produce different outputs depending on the strategy. The OT transformation (adjusting positions based on prior operations) is particularly impossible to teach statically -- watching the position number shift as the first edit's effect is accounted for is the "aha" moment. CRDTs are even harder to explain without animation: the branching and merging of the character tree makes the "conflict-free" property visible rather than merely claimed.

---

#### Widget 3.3: The Reconnection Sync

**What it teaches:** What happens when a client disconnects, misses updates, and reconnects. The reader should understand the three sync strategies (replay, snapshot, delta) and their trade-offs.

**Layout:** A vertical timeline showing a single client's journey:
- **Phase 1: Connected** -- the client receives updates in real time (small chips flowing down the timeline)
- **Phase 2: Disconnected** -- the timeline splits into two parallel tracks: "Client (offline)" and "Server (continuing)." The server track shows updates continuing. The client track is empty, with a gray "offline" overlay and a small counter: "Missed: 0... 1... 2... 5... 12 updates."
- **Phase 3: Reconnection** -- the tracks merge. One of three sync animations plays:
  - **Replay:** All 12 missed updates flow to the client one at a time, in order. The client processes each one sequentially. A counter shows "Syncing: 1/12... 2/12... 12/12."
  - **Snapshot:** A single large chip (labeled "Full State Snapshot") flows to the client. The client's state jumps to the current server state. Fast, but large payload.
  - **Delta:** A medium chip (labeled "Delta: 12 changes compressed") flows to the client. The client applies the compressed diff. Size comparison: "Replay: 12 messages (~2.4KB). Snapshot: 1 message (~8KB). Delta: 1 message (~0.6KB)."

**Animation spec:**
- **Connected phase:** Updates appear as small colored chips on the timeline, flowing downward at regular intervals. The client's state display updates with each chip. Everything is smooth and routine.
- **Disconnect moment:** A "Disconnect" button or an automatic event. The `<ConnectionPipe>` snaps with a visual break (the pipe separates into two ends with a jagged break animation). The client's connection dot turns red. A "ticking bomb" counter appears: missed updates accumulating.
- **Server continues:** On the server track, updates keep flowing. Each one also shows as a small entry in a "missed updates log" that grows during the offline period.
- **Reconnection:** The reader clicks "Reconnect" and selects a strategy (Replay / Snapshot / Delta). The `<ConnectionPipe>` re-establishes (the two broken ends reach toward each other and fuse with `SPRING.snappy`). Then the selected sync animation plays:
  - Replay: chips flow one at a time with `STAGGER.fast` between each, the client's state incrementally updates
  - Snapshot: one large chip whooshes across with `SPRING.gentle`, the client's state jumps
  - Delta: one compact chip with a "compressed" visual (tight horizontal lines inside the chip) flows across
- **After sync:** All three strategies result in the same final state. A "State match: Client === Server" confirmation appears with a green checkmark.

**Interaction:**
- "Disconnect" button to trigger offline period
- Duration slider for offline period (affects how many updates are missed)
- Strategy selector (Replay / Snapshot / Delta) for reconnection
- A bandwidth meter showing total bytes transferred for each strategy
- "Compare All" button that shows all three strategies side by side for the same reconnection scenario
- Speed control

**Component API (rough):**
```tsx
interface ReconnectionSyncProps {
  updateRate: number; // updates per second while connected
  offlineDurationMs: number;
  syncStrategy: "replay" | "snapshot" | "delta";
  updateSizeBytes: number; // average size of one update
  fullStateSizeBytes: number;
}
```

**Why animation is essential:** Reconnection is a temporal gap. The client was "here" (state at time T1), the server moved to "there" (state at time T2), and the sync bridges the gap. Watching missed updates accumulate during the offline period creates tension -- "how will the client catch up?" The three sync animations make the trade-offs visceral: replay is slow (12 individual messages), snapshot is big (one huge message), delta is clever (one small message). Without animation, these are numbers in a table. With animation, they are felt experiences.

---

### Critical Questions for Post 3

- **Is Partykit too niche?** Many readers will never build a real-time multiplayer app. The concurrency patterns, however, are universal: serialized message processing, conflict resolution, state synchronization. Frame the Partykit-specific details as one implementation of these patterns. Reference similar systems: Phoenix Channels, Socket.io, Supabase Realtime.
- **Single-threaded server is the key insight.** The reason Partykit's server model is safe is the same reason browser JS is safe: no concurrent access to mutable state. This should be called out explicitly and connected back to Post 1's thesis. The single-threaded constraint that seems limiting in the browser is a *feature* on the server.
- **CRDTs are a rabbit hole.** The conflict resolver widget shows CRDTs at a surface level. A deep dive into CRDT theory would be its own series. Keep the widget focused on the observable behavior (both edits preserved, no coordination needed) and mention that the math is beyond this series' scope. Link to resources for readers who want to go deeper.
- **Network latency makes ordering non-deterministic.** The connection orchestrator's "network lag" sliders are critical for teaching this. In a LAN, messages arrive in send order. Over the internet, they might not. The reader must be able to create out-of-order delivery to understand why server-side serialization matters.
- **Partykit's hibernation model.** Partykit can hibernate a party when no clients are connected, evicting it from memory. This is an important detail for understanding the lifecycle but might be too operational for a concurrency-focused post. Consider it as a sidebar or footnote.

---

## Post 4: Web Workers & Comlink -- True Parallelism

### Thesis

Web Workers are the only way to achieve true parallelism in the browser. Everything else in this series -- the event loop, React Scheduler, Partykit -- is concurrency without parallelism: interleaving work on a single thread. Workers run on a separate OS thread. The main thread and a worker can execute code *at the same time*. But this power comes with a constraint: workers cannot access the DOM, and all communication happens via message passing with structured cloning. Comlink hides this complexity behind a proxy that makes workers feel like async functions, but understanding what is happening underneath is critical for avoiding performance pitfalls.

### Content Outline

**Concurrency vs. parallelism, concretely.** Post 1 established the single-threaded constraint. Post 2 showed cooperative scheduling as a workaround. Post 3 showed distributed concurrency across connections. This post is different: Web Workers are genuinely parallel. Two `for` loops can execute simultaneously. But parallel execution requires communication boundaries, and those boundaries have costs.

**The Worker communication model.** The main thread and a worker communicate via `postMessage` and `onmessage`. The message payload is copied using the *structured clone algorithm* -- a deep copy that handles cyclic references, typed arrays, dates, maps, sets, and more, but NOT functions, DOM nodes, or class instances (unless they have a custom transfer protocol). Walk through the structured clone algorithm with examples of what clones and what throws.

**Structured cloning costs.** Cloning a 10MB JSON object takes ~50ms. Cloning a 1MB TypedArray takes ~5ms. For large payloads, structured cloning can erase the performance benefit of using a worker. The solution: *Transferable objects*. A transferable ArrayBuffer is moved (not copied) from one thread to another in O(1) time. But the source loses access -- the buffer is "neutered." Walk through the transfer semantics with OffscreenCanvas, ArrayBuffer, and MessagePort.

**SharedArrayBuffer and Atomics.** The most powerful and most dangerous tool. SharedArrayBuffer allows multiple threads to access the same memory simultaneously. This reintroduces the classic concurrency problems that JavaScript was designed to avoid: data races, torn reads, visibility ordering. `Atomics` provides synchronization primitives: `Atomics.wait`, `Atomics.notify`, `Atomics.compareExchange`. These are the JS equivalents of mutexes and condition variables. Walk through a correct implementation of a lock using `Atomics.compareExchange`, and show how it can deadlock if used incorrectly.

**Comlink: making workers ergonomic.** Comlink wraps the `postMessage`/`onmessage` protocol behind ES6 Proxies. A function defined in a worker can be called from the main thread as if it were an async function. Walk through Comlink's source:
1. The main thread calls `wrap(worker)`, which returns a Proxy
2. Any property access on the Proxy is intercepted
3. A function call on the Proxy sends a `postMessage` with the function name and arguments
4. The worker receives the message, calls the real function, and posts the result back
5. The Proxy returns a Promise that resolves with the result
6. Transfer annotations (`Comlink.transfer(buffer, [buffer])`) opt into transferable semantics

**When to use workers.** Not everything belongs in a worker. The overhead of serialization, message passing, and deserialization means workers only win when the work is computationally heavy enough to justify the communication cost. Rules of thumb:
- <1ms of work: don't use a worker (overhead dominates)
- 1-16ms of work: consider a worker if it would cause jank
- >16ms of work: definitely use a worker
- Continuous heavy work (video processing, physics, crypto): always use a worker

### Interactive Widgets

#### Widget 4.1: The Thread Comparator

**What it teaches:** The fundamental difference between single-threaded execution and parallel Worker execution, including the communication overhead that determines when parallelism actually helps.

**Layout:** Two horizontal timelines, stacked vertically:
- **Top: "Main Thread Only"** -- a single lane showing all work (UI tasks and heavy computation) executing sequentially on the main thread.
- **Bottom: "Main Thread + Worker"** -- two lanes. The main thread lane shows UI tasks. The worker lane shows heavy computation. A `<ConnectionPipe>` between them shows message passing (postMessage to send work, postMessage to return results).

A `<FrameBudgetBar>` for each frame boundary on the main thread. A "computation" selector above with configurable work duration.

**Animation spec:**
- **Main thread only:** The reader triggers a "Heavy Computation" (configurable: 5ms, 50ms, 200ms, 500ms). The computation block appears on the main thread timeline as a solid red bar. During this bar, a small bouncing ball animation at the top-right freezes (literally stops moving). Frame budget bars under the computation show solid red overflows. When the computation finishes, the ball resumes and the result appears.
- **Main thread + Worker:** The same computation is offloaded. Three phases:
  1. **Send phase:** A message chip travels from the main thread to the worker via the `<ConnectionPipe>`. This takes ~1ms (shown as a thin amber bar on the main thread: "serializing + posting"). The main thread immediately returns to processing UI work. The ball keeps bouncing.
  2. **Compute phase:** The worker lane shows a blue computation bar of the same duration as the single-threaded version. Critically, during this time, the main thread is free -- it shows green "UI responsive" segments and the ball animation runs smoothly.
  3. **Receive phase:** When the worker finishes, a result chip travels back via the `<ConnectionPipe>`. The main thread processes the result (~1ms deserialization). The total wall-clock time is similar to single-threaded (computation + 2ms overhead), but the main thread was blocked for only 2ms instead of the full computation duration.
- **Break-even visualization:** The communication overhead (serialize + post + deserialize) is highlighted as amber segments. For a 5ms computation, the overhead is 2ms -- significant. For a 500ms computation, the overhead is negligible. A ratio display shows: "Overhead: 40% (not worth it)" vs. "Overhead: 0.4% (definitely worth it)."
- **Large payload penalty:** A "Payload Size" slider that adjusts the size of data sent to/from the worker. At 100 bytes, serialization is instant. At 10MB, serialization takes 50ms -- shown as a thick amber bar that eats into the benefit. A toggle for "Use Transferable" that makes the 10MB transfer O(1) (the amber bar shrinks to nothing), but shows the source buffer as "neutered" (grayed out, inaccessible).

**Interaction:**
- Computation duration slider (5ms to 500ms)
- Payload size slider (100B to 10MB)
- "Use Transferable" toggle
- Speed control for animation
- A "Breakeven Calculator" that shows: "For this payload size and computation duration, using a worker saves ${X}ms of main thread time"
- Toggle between the two modes to see the same computation executed both ways

**Component API (rough):**
```tsx
interface ThreadComparatorProps {
  computationDurationMs: number;
  payloadSizeBytes: number;
  useTransferable: boolean;
  mode: "main-only" | "with-worker" | "split-view";
}
```

**Why animation is essential:** Parallelism means two things happening at the same time. A static diagram can show two parallel bars, but it cannot show the *consequence*: the bouncing ball that freezes in single-threaded mode but keeps moving with a worker. The freeze is the entire argument for workers. The overhead visualization is equally important: seeing the amber serialization bars grow as payload size increases teaches the reader to think about communication cost, not just computation cost. Without animation, "structured cloning takes 50ms for 10MB" is a number. With animation, it is a bar that visually eats the performance benefit.

---

#### Widget 4.2: The Structured Clone Inspector

**What it teaches:** What the structured clone algorithm can and cannot copy, the performance cost of cloning, and how transferable objects avoid that cost.

**Layout:** Two panels:
- **Left: "Source (Main Thread)"** -- a tree visualization of a JavaScript object, like the one in the Streaming series' Structural Sharing Diff widget. Nodes for primitives, objects, arrays, typed arrays, functions, DOM elements, class instances. Each node has a size indicator.
- **Right: "Clone (Worker Thread)"** -- initially empty. As the clone operation runs, nodes appear here.

Between the panels: a `<ConnectionPipe>` with a cloning animation.

**Animation spec:**
- **Clone operation:** When the reader clicks "Send to Worker," the structured clone algorithm runs visually:
  - Primitive values (strings, numbers, booleans) clone instantly: the node appears in the right panel with a green "cloned" flash. A thin copy-line connects the original to the clone.
  - Objects and arrays clone recursively: the parent node appears first, then children clone one at a time with `STAGGER.fast`. Circular references are detected and shown as a loop arrow (the cloner recognizes it has already visited this node).
  - TypedArrays (Uint8Array, Float32Array): clone with a visible cost. A progress bar fills in the right panel as the bytes are copied. For a 10MB buffer, the progress bar takes a perceptible ~50ms. A cost label appears: "10MB: ~50ms to clone."
  - Functions: the node turns red. A "Cannot clone" error badge appears. The clone operation skips it. A tooltip: "Functions cannot be sent to workers."
  - DOM elements: same red "Cannot clone" error.
  - Class instances: yellow warning. "Cloned as plain object -- prototype chain lost."
- **Transferable mode:** A toggle: "Transfer instead of Clone." When enabled and the reader clicks "Send to Worker," TypedArray nodes *move* from the left panel to the right panel. The node in the left panel turns gray and gets a "neutered" label. The transfer animation is a fast slide with `SPRING.quick` -- no copy, just movement. The cost label shows: "10MB: ~0ms (transferred)."
- **Side-by-side comparison:** After both clone and transfer have been demonstrated, a summary bar at the bottom shows: "Clone: 50ms (data in both threads). Transfer: 0ms (data in one thread only)."

**Interaction:**
- Edit the source object (add/remove properties, change types, adjust TypedArray sizes)
- Toggle between Clone and Transfer modes
- Click any node to see its clone behavior and cost
- Preset objects: "Simple JSON (1KB)", "Complex nested (10KB)", "With TypedArrays (1MB)", "With functions (will fail)", "Image data (5MB)"
- "Add unclonable" button to deliberately add a function or DOM node and see the error

**Component API (rough):**
```tsx
interface StructuredCloneInspectorProps {
  sourceObject: unknown;
  mode: "clone" | "transfer";
  showCosts: boolean;
  presets: Array<{ name: string; object: unknown }>;
}
```

**Why animation is essential:** The structured clone algorithm is invisible in practice -- `postMessage(data)` just works (or throws). Making the algorithm visible -- watching it traverse the object tree, pause at each node, decide whether to clone, error, or skip -- turns an opaque runtime operation into a debuggable, understandable process. The transfer animation (node moving instead of copying) makes the zero-copy semantics tangible. The neutering effect (source grays out) makes the ownership transfer visible.

---

#### Widget 4.3: The Worker Pool Scheduler

**What it teaches:** How to distribute work across multiple workers, the scheduling strategies (round-robin, smallest-queue, work-stealing), and the diminishing returns of adding more workers.

**Layout:** A horizontal arrangement:
- **Left: "Work Queue"** -- a vertical list of tasks to be processed (colored blocks of varying sizes, representing different computation durations).
- **Center: "Worker Pool"** -- N horizontal lanes (configurable: 1 to 8 workers), each representing a worker thread. Each lane shows a timeline with computation blocks filling it as tasks are assigned.
- **Right: "Results"** -- completed tasks appear here, color-matched to their original queue position. A "total time" counter shows wall-clock time to process all tasks.

**Animation spec:**
- **Task assignment:** Tasks from the work queue are assigned to workers based on the selected scheduling strategy. Each assignment is animated: the task block lifts from the queue and slides to the assigned worker's lane with `SPRING.gentle`.
  - **Round-robin:** Tasks go to workers in order (1, 2, 3, 1, 2, 3...). Simple but can create imbalance if tasks have different sizes.
  - **Smallest-queue:** Each task goes to the worker with the least pending work. Workers stay balanced.
  - **Work-stealing:** Tasks are assigned round-robin initially. When a worker finishes all its tasks and others still have work, it "steals" a task from the busiest worker. The steal animation shows the task sliding from one worker's lane to another.
- **Execution:** Within each worker lane, tasks execute sequentially (workers are single-threaded). The active task has a progress bar. When complete, it slides to the Results panel.
- **Parallel execution:** Multiple workers execute simultaneously. Their progress bars advance at the same rate. This is genuine parallelism -- unlike the event loop, which only runs one thing at a time.
- **Scaling visualization:** A "Workers" slider (1 to 8). At 1 worker, all tasks execute sequentially (same as main thread only). At 2 workers, total time is roughly halved. At 4, roughly quartered. But at 8, the improvement is less dramatic if there are fewer than 8 tasks, or if tasks are uneven. The "total time" counter shows the diminishing returns curve.
- **Overhead:** Each worker has a small "overhead" bar at the start (initialization cost) and between tasks (message passing). As the number of workers increases, total overhead increases. A "speedup" metric shows: "4 workers: 3.2x speedup (not 4x due to overhead)."

**Interaction:**
- Add tasks to the work queue (click to add, drag to set size)
- Workers slider (1 to 8)
- Strategy selector (Round-robin / Smallest-queue / Work-stealing)
- Speed control
- "Randomize tasks" button (generates 10-20 tasks of random sizes)
- "Compare strategies" button that runs all three strategies on the same task set and shows total time for each
- Toggle "Show overhead" to make message-passing costs visible

**Component API (rough):**
```tsx
interface WorkerPoolSchedulerProps {
  tasks: Array<{ id: string; durationMs: number; label: string }>;
  workerCount: number;
  strategy: "round-robin" | "smallest-queue" | "work-stealing";
  showOverhead: boolean;
}
```

**Why animation is essential:** Parallel execution is fundamentally about multiple things happening simultaneously. This widget is the only place in the series where the reader sees genuine parallelism -- multiple progress bars advancing at the same time. The work-stealing animation (a task sliding from a busy worker to an idle one) makes an advanced scheduling concept intuitive. The scaling visualization (adding workers and watching the speedup plateau) teaches Amdahl's law without using the word "Amdahl."

---

### Critical Questions for Post 4

- **SharedArrayBuffer and Atomics: include or exclude?** SharedArrayBuffer is the most powerful and most dangerous concurrency tool in JS. It reintroduces data races that the rest of the language avoids by design. Including it is honest and complete; excluding it keeps the post focused. Recommendation: include a brief section with a warning, but don't build a widget for it. The lock implementation is interesting for advanced readers but too specialized for most.
- **Worker initialization cost.** Creating a Worker is expensive (~50-100ms). Real apps create workers at startup and reuse them. The Thread Comparator widget should show this initialization cost as a one-time startup bar, separate from per-message communication overhead.
- **Module Workers vs. classic Workers.** Modern browsers support `new Worker('./worker.js', { type: 'module' })` which allows `import` statements inside workers. This is the recommended approach for new code. The annotated source examples should use module workers.
- **Is Comlink too magical?** Comlink hides the message-passing complexity behind Proxies. This is great for developer experience but dangerous for understanding. The Structured Clone Inspector widget exists specifically to un-hide what Comlink abstracts. Make sure the reader encounters the inspector BEFORE learning about Comlink, so they understand what is being hidden.
- **OffscreenCanvas is underappreciated.** A worker can render to a canvas without touching the main thread at all. This is the ultimate "no jank" rendering solution for heavy graphics. Consider including a small demo: a canvas animation rendering smoothly in a worker while the main thread is artificially blocked.

---

## Post 5: Async Patterns Deep Dive -- Cancellation, Races, and Cleanup

### Thesis

Most JavaScript async code is subtly broken. It works in the happy path -- one request, one response, no interruptions. But real applications involve cancellation (user navigates away), races (two requests for the same resource), cleanup (abort pending requests on unmount), and error recovery (retry with backoff). These are concurrency problems in disguise, and the async primitives that solve them (`AbortController`, `Promise.allSettled`, `AsyncDisposableStack`) are among the least understood tools in the language.

### Content Outline

**The happy path illusion.** A `fetch` call that always completes, a Promise chain that never rejects, an effect that never needs cleanup. Most tutorials teach this. Real code lives in the unhappy path: what happens when the user clicks "Cancel"? What happens when component unmounts mid-fetch? What happens when two rapid clicks trigger two identical requests?

**AbortController: the universal cancellation primitive.** AbortController is not just for `fetch`. It is a general-purpose cancellation token:
- `fetch(url, { signal })` -- abort a network request
- `addEventListener('click', handler, { signal })` -- auto-remove listener on abort
- `stream.pipeTo(writable, { signal })` -- abort a stream pipeline
- Custom async functions can accept an `AbortSignal` and check `signal.aborted` or listen to the `abort` event

Walk through the AbortController lifecycle:
1. Create controller: `const controller = new AbortController()`
2. Pass signal to async operations: `fetch(url, { signal: controller.signal })`
3. When cancellation is needed: `controller.abort(reason)`
4. The fetch rejects with `AbortError`. The signal's `abort` event fires.
5. Cleanup in the catch block: only retry if the error is NOT an AbortError

**AbortSignal composition.** `AbortSignal.any([signal1, signal2])` creates a signal that aborts when ANY of the inputs abort. `AbortSignal.timeout(5000)` creates a signal that aborts after 5 seconds. Composing these: `AbortSignal.any([userSignal, AbortSignal.timeout(5000)])` creates a signal that aborts on user cancellation OR timeout, whichever comes first.

**Race conditions in practice.** The classic race: user types in a search box, each keystroke fires a fetch. Keystroke 1 fires fetch A, keystroke 2 fires fetch B. If fetch A resolves after fetch B (because it was slower), the search results show stale data from keystroke 1. Solutions:
- Abort previous fetch when new one starts (AbortController)
- Ignore stale responses (track request ID, only apply the latest)
- Debounce (don't fire until typing pauses)
- React Query / SWR (built-in stale response handling)

Walk through how each solution works and its trade-offs.

**Promise.allSettled and error boundaries.** `Promise.all` fails fast: one rejection rejects the whole group. `Promise.allSettled` waits for all to complete, regardless of outcome. When to use which:
- `Promise.all`: when ALL results are needed and any failure is fatal
- `Promise.allSettled`: when partial results are acceptable (dashboard panels that load independently)
- `Promise.race`: when you want the first result (timeout pattern)
- `Promise.any`: when you want the first SUCCESS (failover pattern)

**Cleanup and the `using` keyword.** TC39 Explicit Resource Management (`using`, `await using`, `DisposableStack`). The async equivalent of RAII: resources are automatically cleaned up when they go out of scope. Walk through a practical example: an AbortController that automatically aborts when the function exits.

**Real library patterns.** How production libraries handle these edge cases:
- React's `useEffect` cleanup: return a function that aborts in-flight requests
- TanStack Query's `queryFn` receives an `AbortSignal` and cancels on unmount
- SWR's `dedupingInterval`: prevents duplicate requests within a time window
- Vercel AI SDK's `stop()`: sends an abort signal upstream to the LLM

### Interactive Widgets

#### Widget 5.1: The Race Condition Reproducer

**What it teaches:** How race conditions occur in async code and how different mitigation strategies prevent them. The reader should be able to create a race condition, see it corrupt state, and then apply a fix.

**Layout:** A search interface mockup:
- **Top: "Search Box"** -- a text input where the reader types. Each keystroke fires a simulated fetch.
- **Middle: "Network"** -- a visualization showing in-flight requests as horizontal bars on a timeline. Each bar is labeled with the search term and has a configurable duration. Bars for different keystrokes are different colors. When a response arrives, a vertical line marks the arrival, and the response payload is shown.
- **Bottom: "Results Panel"** -- shows the currently displayed search results. When a race condition occurs, the results flash red and show "STALE DATA: showing results for 'rea' but user typed 'react'."

**Animation spec:**
- **Typing simulation:** The reader types "react" in the search box, one character at a time. Or clicks a "Type 'react'" button that auto-types with 150ms between keystrokes.
- **Request firing:** Each keystroke launches a fetch. The request appears as a colored bar in the Network panel, extending rightward from its start time. Duration is randomized: "r" takes 300ms, "re" takes 150ms, "rea" takes 500ms (deliberately slow!), "reac" takes 200ms, "react" takes 250ms.
- **The race:** Because "rea" is slow, its response arrives AFTER the responses for "reac" and "react." The network panel shows the bars and their arrival order. Without mitigation, the Results Panel updates with each arriving response: first "r" results, then "re" results, then "reac" results, then "react" results, then... "rea" results arrive last and overwrite "react" results. The Results Panel flashes red: "RACE CONDITION: stale data displayed."
- **Mitigation strategies:** A strategy selector above the network panel:
  - **No mitigation (default):** The race condition occurs as described above.
  - **AbortController:** When a new keystroke fires, the previous request's bar shows a red "ABORTED" flash and stops extending. Only the latest request completes. The network panel shows: "r" (aborted), "re" (aborted), "rea" (aborted), "reac" (aborted), "react" (completes). The Results Panel shows only "react" results. Clean.
  - **Request ID check:** All requests complete, but responses are checked against the current request ID. When "rea" arrives late, a small "ignored (stale)" label appears on its response, and the Results Panel does not update. The network panel shows all bars completing, but only the latest response is applied.
  - **Debounce (300ms):** No requests fire until typing pauses for 300ms. The first four keystrokes produce no requests. After the reader stops typing "react," a single request fires after 300ms. The network panel shows one bar. Clean, but slower time-to-result.
- **Replay button:** After seeing the race condition, the reader can switch strategies and replay the same typing sequence to compare outcomes. The network panel shows the same randomized durations for a fair comparison.

**Interaction:**
- Type in the search box (or use "Type 'react'" auto-type button)
- Strategy selector (None / AbortController / Request ID / Debounce)
- "Randomize latencies" button to get a new set of response times
- "Make 'rea' slow" toggle (ensures the race condition is triggered)
- Speed control for the animation
- Replay button to re-run the same scenario with a different strategy

**Component API (rough):**
```tsx
interface RaceConditionReproducerProps {
  keystrokes: string[];
  latencies: Record<string, number>; // query -> response time in ms
  strategy: "none" | "abort" | "request-id" | "debounce";
  debounceMs?: number;
}
```

**Why animation is essential:** Race conditions are invisible. The code does not crash. No error is thrown. The wrong data is simply displayed, and the user may never notice. Making the race *visible* -- watching "rea" arrive after "react" and overwrite the correct results -- turns an abstract bug category into a concrete, observable failure. The strategy comparison (same scenario, different outcomes) is the teaching device: the reader sees the bug, then sees three different fixes, and understands each one because they watched it prevent the specific race they just observed.

---

#### Widget 5.2: The Cancellation Flow

**What it teaches:** How AbortController propagates cancellation through a chain of async operations, and what happens to in-flight work when abort is called.

**Layout:** A vertical pipeline showing a chain of async operations:
1. "User Action" (click button)
2. "API Gateway" (fetch with signal)
3. "Database Query" (downstream of fetch)
4. "Transform Response" (downstream of query)
5. "Update UI" (final step)

Each stage is a rounded box. Connections are `<ConnectionPipe>` segments. At the top: an AbortController with a prominent "Abort" button. The controller's signal is passed through all stages (shown as a thin red line threaded through the pipeline alongside the data flow).

**Animation spec:**
- **Happy path:** The reader clicks "Start Request." A data chip (blue) travels from stage 1 through the pipeline, pausing at each stage while work is done (the stage box pulses and shows a small progress bar). After ~500ms total, the chip arrives at "Update UI" and the UI shows the result. The signal line stays green throughout (no abort).
- **Abort mid-flight:** The reader clicks "Start Request," waits until the chip is at stage 3 ("Database Query"), then clicks "Abort." The abort signal propagates:
  1. The signal line turns red, starting from the AbortController and traveling DOWN the pipeline (the red color sweeps along the line with `SPRING.snappy`, like a lit fuse).
  2. When the red signal reaches stage 3 (where the chip currently is): the stage's progress bar halts. The stage box flashes red. The chip turns red and gets an "AbortError" label.
  3. The stages below (4, 5) show "Cancelled" labels without ever receiving the chip.
  4. The stages above (1, 2) that already completed show "Completed (but result discarded)" in gray.
  5. A catch block visualization appears at the bottom: `if (error.name === 'AbortError') { /* cleanup */ }`.
- **Timeout abort:** A variant where `AbortSignal.timeout(2000)` is used instead of manual abort. A countdown timer appears next to the signal. If the pipeline takes longer than 2000ms, the signal fires automatically. The reader can adjust stage durations to see whether the pipeline completes before the timeout.
- **Signal composition:** A second AbortController ("User Navigation") and a toggle for `AbortSignal.any([userAbort, timeout])`. The compound signal fires if EITHER controller aborts. The reader can trigger either one and see the same cancellation flow.

**Interaction:**
- "Start Request" button
- "Abort" button (enabled only when a request is in flight)
- Stage duration sliders (per stage, 50ms to 2000ms)
- Timeout duration slider (for AbortSignal.timeout)
- "Signal composition" toggle
- Speed control
- Step mode: advance the pipeline one stage at a time, with the option to abort between any two stages

**Component API (rough):**
```tsx
interface CancellationFlowProps {
  stages: Array<{
    name: string;
    durationMs: number;
    canAbort: boolean;
  }>;
  timeoutMs?: number;
  signalComposition?: boolean;
}
```

**Why animation is essential:** Cancellation is a signal propagating through a system. The "lit fuse" animation -- the red signal sweeping down the pipeline -- makes the propagation direction and speed visible. Without animation, AbortController is described as "calling .abort() makes the fetch reject." With animation, the reader sees the full story: the signal travels through the pipeline, reaches the active stage, halts work, prevents downstream stages, and triggers cleanup. The timeout variant adds urgency: the countdown timer creates tension, and the reader can adjust durations to make the pipeline barely finish in time or barely miss the deadline.

---

#### Widget 5.3: The Promise Combinator Playground

**What it teaches:** The behavioral differences between `Promise.all`, `Promise.allSettled`, `Promise.race`, and `Promise.any`, and when to use each one.

**Layout:** Four quadrants, one per combinator. Each quadrant contains:
- A set of 3-4 promise "lanes" (horizontal bars representing promise duration)
- A "result" indicator at the bottom showing when and how the combinator resolves/rejects
- A small code snippet showing the combinator's signature

Above the quadrants: a control panel where the reader configures promise outcomes (resolve after Nms, reject after Nms, never resolve).

**Animation spec:**
- **Promise lanes:** Each promise is a horizontal bar that fills over time. When it resolves, the bar turns green and a checkmark appears. When it rejects, the bar turns red and an X appears. A promise configured to "never resolve" fills slowly and stays amber.
- **Promise.all quadrant:** All bars fill simultaneously. If ALL resolve: the result indicator turns green and shows the array of values. If ANY rejects: the moment the first rejection occurs, the result indicator immediately turns red ("fail fast"). Remaining promises' bars gray out -- they continue running but their results are ignored. The fail-fast moment is dramatic: a red shockwave emanates from the rejected promise to the result indicator.
- **Promise.allSettled quadrant:** All bars fill simultaneously. The result indicator waits for ALL promises to settle (resolve or reject). It then shows an array of `{ status, value/reason }` objects. No fail-fast. The result indicator turns green (always, because allSettled never rejects) with mixed green/red indicators for individual outcomes.
- **Promise.race quadrant:** All bars fill simultaneously. The FIRST promise to settle (resolve or reject) triggers the result. Its bar gets a "WINNER" badge. All other bars gray out. The result indicator shows the winning value (or the first rejection). A visual "race finish line" at the result indicator.
- **Promise.any quadrant:** All bars fill simultaneously. The FIRST promise to RESOLVE triggers the result. Rejections are collected but do not trigger the result. If ALL reject, the result shows an `AggregateError`. The first resolve gets a "WINNER" badge. Rejected promises' bars show "rejected (collected)" labels. This is the "optimistic" combinator.
- **Color coding:** Resolved = green, Rejected = red, Pending = amber fill animation, Ignored (after combinator settles) = gray.

**Interaction:**
- Configure each promise: resolve after N ms, reject after N ms, or never settle
- Preset scenarios:
  - "All succeed" (all four combinators produce different results)
  - "One fails" (Promise.all fails fast, others handle gracefully)
  - "All fail" (Promise.any shows AggregateError)
  - "Timeout race" (Promise.race with a timeout promise)
  - "Dashboard panels" (independent loads, allSettled is the right choice)
- Speed control
- "Run" button that starts all four quadrants simultaneously for direct comparison
- Click any quadrant to expand it full-width with detailed annotations

**Component API (rough):**
```tsx
interface PromiseCombinatorPlaygroundProps {
  promises: Array<{
    label: string;
    outcome: "resolve" | "reject" | "pending";
    durationMs: number;
    value?: unknown;
    reason?: string;
  }>;
  activeCombinator?: "all" | "allSettled" | "race" | "any" | "all-four";
}
```

**Why animation is essential:** The four combinators are distinguished by *when* they settle and *how* they handle mixed outcomes. These are temporal properties. Watching `Promise.all` fail fast the instant one promise rejects, while `Promise.allSettled` calmly waits for all to finish, is worth a thousand words of documentation. The four-quadrant simultaneous view is the teaching device: same inputs, four different behaviors, all visible at once. The "race finish line" metaphor for `Promise.race` and `Promise.any` makes the semantics intuitive.

---

### Critical Questions for Post 5

- **Is this post too broad?** AbortController, race conditions, Promise combinators, and cleanup/disposal are each topics that could fill a post. The unifying thread is "async operations that go wrong" -- make sure each widget is framed as a different manifestation of the same underlying problem (concurrent async operations interacting in unexpected ways).
- **The `using` keyword is very new.** Explicit Resource Management is Stage 3 and only available in TypeScript 5.2+ with `--lib esnext`. Mention it as the future direction but don't build a widget for it. The AbortController widgets teach the same concept (cleanup) with tools readers can use today.
- **React-specific vs. general.** The race condition reproducer uses a search box, which is a common React pattern (useEffect cleanup aborting stale fetches). But the concept is universal. Make sure the widget and prose frame it as a general async problem, not a React-specific one. A vanilla JS solution should be shown alongside the React useEffect version.
- **Are we teaching concurrency thinking?** The race condition reproducer is the most important widget in the series for building transferable intuition. The reader who can look at any async code and ask "what happens if this resolves out of order?" has learned concurrency thinking. The strategy comparison should emphasize WHY each strategy works (what invariant it maintains), not just HOW to implement it.
- **Promise combinator choice is a design decision.** The playground should teach judgment, not just behavior. After the reader sees all four combinators, the question is: "which one do I use for my use case?" The dashboard preset (where `allSettled` is clearly correct because panels are independent) should make this decision feel natural, not memorized.

---

## Post 6: Synthesis -- The Concurrency Decision Tree

### Thesis

JavaScript offers a spectrum of concurrency strategies: event loop cooperation (careful task scheduling), cooperative multitasking (React Scheduler's time-slicing), distributed coordination (Partykit's serialized message processing), true parallelism (Web Workers), and async orchestration (AbortController, Promise combinators). Choosing the right one depends on the problem: Is the work CPU-bound or I/O-bound? Does it need DOM access? Is there shared mutable state? How important is cancellation? This post provides the decision framework and shows how patterns compose.

### Content Outline

**The five concurrency models in JS, compared.** Map each post's approach to the same conceptual dimensions:
- **Execution model:** Interleaved on one thread (event loop, React Scheduler), serialized across connections (Partykit), parallel on multiple threads (Workers), interleaved I/O (async/await)
- **Data sharing:** Shared everything (main thread closures), shared nothing (Workers + postMessage), shared state via coordination (Partykit server state), shared memory (SharedArrayBuffer)
- **Scheduling:** Implicit (event loop), cooperative (React), centralized (Partykit server), OS-level (Workers), programmer-controlled (async patterns)
- **Cancellation:** Not applicable (event loop), implicit (React abandons stale renders), application-level (Partykit disconnect), postMessage (Workers), AbortController (async)
- **Error propagation:** Uncaught exception (event loop), Error Boundary (React), onError handler (Partykit), error event (Workers), rejection (async)

**The decision tree.** A practical flowchart:
1. Is the work CPU-intensive (>16ms)?
   - Yes: Use a Web Worker (Post 4). Does it need DOM access? If yes, restructure to separate computation from DOM manipulation.
   - No: Continue.
2. Is the work user-facing and interruptible?
   - Yes: Use cooperative scheduling / `startTransition` (Post 2). Priority determines urgency.
   - No: Continue.
3. Does the work involve multiple clients/connections?
   - Yes: Use server-side coordination (Post 3). Single-threaded server serializes access.
   - No: Continue.
4. Does the work involve multiple async operations that might fail, race, or need cancellation?
   - Yes: Use async patterns (Post 5). AbortController for cancellation, appropriate Promise combinator for composition.
   - No: The event loop handles it (Post 1). No special concurrency tools needed.

**Composing patterns.** Real applications use multiple patterns simultaneously:
- A React app uses cooperative scheduling for rendering, Workers for heavy computation, AbortController for fetch cancellation, and connects to a Partykit server for real-time features
- Each pattern handles a different axis of the concurrency problem
- They do not interfere because they operate at different levels: the scheduler manages rendering, Workers manage computation, AbortController manages I/O, and Partykit manages distributed state

**When to do nothing.** The most important concurrency decision is often "this does not need a concurrency solution." For work that takes <5ms, the event loop handles it fine. For single-user, single-request flows, async/await is sufficient. Over-engineering concurrency is a common trap.

### Interactive Widgets

#### Widget 6.1: The Concurrency Decision Navigator

**What it teaches:** How to choose the right concurrency pattern for a given problem. The reader answers questions about their use case and arrives at a recommendation, with the reasoning visible at every step.

**Layout:** A full-width interactive decision tree (similar structure to the Streaming series' Decision Tree Navigator). Each node is a question card with 2-3 answer options. The path highlights as the reader navigates. Terminal nodes show a recommended pattern with a brief rationale and a link to the relevant post in the series.

**Animation spec:**
- **Node expansion:** Selecting an answer shrinks the current card and reveals the next one via `SPRING.gentle`. A connecting line draws between them with animated stroke-dashoffset.
- **Path highlighting:** The chosen path uses the accent color. Unchosen branches desaturate to 30% opacity but remain visible (the reader can see what they are NOT, which is as informative as what they ARE).
- **Terminal node:** When the reader reaches a leaf, the recommendation card enters with `SPRING.snappy` scale from 0.7 to 1.0. The card contains: pattern name, one-sentence rationale, relevant post link, and a small animation snippet from the recommended post's widgets (e.g., the time-slicing timeline if React Scheduler is recommended).
- **Backtracking:** Click any previous node to revisit. Forward nodes collapse with a reverse animation.
- **Scenario presets:** Buttons: "Image Processing App", "Real-time Collaboration", "Data Dashboard", "Search Autocomplete", "Animation-Heavy Page", "Simple CRUD." Each auto-navigates the tree, answering questions in sequence with `STAGGER.fast` between steps.

**Interaction:**
- Click answer options to navigate
- Click visited nodes to backtrack
- Scenario presets for guided walkthroughs
- Hover any node for a tooltip explaining why this question matters
- "Show all paths" toggle that reveals the complete tree structure (for readers who prefer to see the full picture)

**Component API (rough):**
```tsx
interface ConcurrencyDecisionNavigatorProps {
  tree: DecisionTree; // nested question/answer/recommendation
  presets: Array<{ name: string; path: string[] }>;
  showAllPaths?: boolean;
}
```

**Why animation is essential:** A static flowchart presents all decisions simultaneously, which is overwhelming. The animated navigator reveals decisions one at a time, creating a guided journey. The scenario presets are critical for learning: watching the tree navigate itself for "Real-time Collaboration" (landing at Partykit patterns) vs. "Image Processing" (landing at Workers) teaches the decision-making process, not just the outcome.

---

#### Widget 6.2: The Composition Sandbox

**What it teaches:** How multiple concurrency patterns coexist in a single application, each handling a different aspect of the concurrency problem.

**Layout:** A simplified application mockup at the top (a collaborative image editor: canvas, toolbar, user cursors, chat sidebar). Below: four horizontal swimlanes, one per concurrency pattern used in the app:
- **Lane 1: Event Loop** -- basic event handling (clicks, keyboard input)
- **Lane 2: React Scheduler** -- rendering updates with priorities
- **Lane 3: Web Worker** -- image filter computation
- **Lane 4: Partykit** -- real-time cursor sync between users

Each lane shows a timeline of activity.

**Animation spec:**
- **Scenario: User applies an image filter.** The reader clicks "Apply Blur Filter" in the app mockup. The sequence plays out across lanes:
  1. **Event Loop lane:** A "click" event appears and is processed (fast, <1ms bar).
  2. **React Scheduler lane:** A `startTransition` update queues a low-priority render (showing the "processing" spinner). The scheduler time-slices the render over several frames.
  3. **Worker lane:** The blur computation starts in the worker (a solid computation bar spanning 200ms). Simultaneously, the main thread (React Scheduler lane) continues rendering unrelated updates.
  4. **Worker lane:** Computation completes. A result chip travels back to the main thread (small message-passing bar).
  5. **React Scheduler lane:** A high-priority update applies the filtered image. The canvas in the app mockup updates.
  6. **Partykit lane:** The image update is broadcast to other connected users. Message chips travel outward.
- **Cross-lane interactions:** Vertical dashed lines connect events across lanes: the click in Event Loop triggers the React update, which triggers the Worker computation, which triggers the Partykit broadcast. The reader can trace the causal chain across all four patterns.
- **Swimlane isolation:** Hover any lane to dim the others, isolating that pattern's contribution. The app mockup highlights only the parts managed by the hovered pattern: hovering Workers dims everything except the canvas; hovering Partykit dims everything except the cursor positions.
- **Counter-scenario: No Workers.** A toggle: "Disable Workers." The blur computation moves to the main thread. The React Scheduler lane shows a long, uninterruptible computation bar. The app mockup freezes (user cursors stop moving, the toolbar becomes unresponsive). The contrast teaches why Workers matter for this specific case.

**Interaction:**
- Scenario buttons: "Apply Filter", "Type in Chat", "Move Cursor", "Resize Canvas"
- "Disable Workers" toggle
- "Disable Scheduler" toggle (falls back to synchronous rendering)
- "Disconnect Partykit" toggle (local-only mode)
- Speed control
- Hover lanes to isolate patterns
- Click any event on a timeline to freeze and inspect the full application state at that moment

**Component API (rough):**
```tsx
interface CompositionSandboxProps {
  scenario: "apply-filter" | "type-chat" | "move-cursor" | "resize";
  workersEnabled: boolean;
  schedulerEnabled: boolean;
  partykitEnabled: boolean;
  playbackSpeed: number;
}
```

**Why animation is essential:** Composition is about simultaneity and coordination. Four patterns running at the same time, each handling a different responsibility, creating a seamless user experience. A static architecture diagram shows the boxes and arrows. The animated sandbox shows the *choreography*: the Worker computing while React renders while Partykit syncs while the event loop handles input. The "disable" toggles are the killer feature: turning off Workers and watching the app freeze demonstrates WHY the architecture needs all four patterns. This is impossible to convey without real-time animation.

---

#### Widget 6.3: The Pattern Comparison Grid

**What it teaches:** A direct, side-by-side comparison of how each concurrency pattern handles the key concerns from Post 1: scheduling, data sharing, cancellation, and error handling.

**Layout:** A 4x5 grid.
- **Rows:** Scheduling, Data Sharing, Cancellation, Error Handling
- **Columns:** Event Loop (Post 1), React Scheduler (Post 2), Partykit (Post 3), Web Workers (Post 4), Async Patterns (Post 5)
- Each cell contains a miniature animation (150x100px) demonstrating that pattern's approach to that concern.

**Animation spec:**
- Each cell is a self-contained looping micro-animation:
  - **Scheduling row:**
    - Event Loop: tasks flowing through a simplified event loop (one at a time)
    - React: time-sliced fibers with yield points
    - Partykit: messages queuing on the server, processed sequentially
    - Workers: parallel bars advancing simultaneously
    - Async: promises as overlapping bars (concurrent I/O)
  - **Data Sharing row:**
    - Event Loop: all tasks access the same variables (arrows point to one shared box)
    - React: fiber tree with immutable state snapshots
    - Partykit: server state box with message-in/broadcast-out arrows
    - Workers: separate boxes with postMessage chips bouncing between them
    - Async: closures capturing variables (dotted enclosure lines)
  - **Cancellation row:**
    - Event Loop: "N/A" with a shrug (tasks run to completion)
    - React: a fiber tree partially rendered, then abandoned (tree grays out)
    - Partykit: WebSocket close signal traveling to server
    - Workers: terminate message traveling to worker, worker box disappearing
    - Async: AbortController's red signal sweeping through a pipeline
  - **Error Handling row:**
    - Event Loop: uncaught error bubble rising to window.onerror
    - React: Error Boundary catching and showing fallback UI
    - Partykit: onError handler on server, error message to client
    - Workers: error event on the worker object
    - Async: .catch on Promise chain, try/catch with await

**Interaction:**
- Click any cell to expand it to full width with a detailed animation and annotated code
- Hover a row to highlight the entire row (compare one concern across all patterns)
- Hover a column to highlight the entire column (see one pattern's full concurrency profile)
- A "quiz mode" toggle: cells start blank, and the reader guesses which animation belongs where (drag and drop). Score at the end.
- "Play all" button: all 20 micro-animations run simultaneously

**Component API (rough):**
```tsx
interface PatternComparisonGridProps {
  rows: string[];   // concern names
  columns: string[]; // pattern names
  expandedCell?: { row: number; column: number } | null;
  quizMode?: boolean;
}
```

**Why animation is essential:** A static comparison table lists facts. An animated comparison grid shows *behavior*. The micro-animations let the reader see at a glance: "React cancels by abandoning partial work. Workers cancel by terminating. Async cancels by signaling." These are fundamentally different mechanisms, and the animations make the differences visceral. The quiz mode is the final test: can the reader distinguish the patterns by their behavior alone?

---

### Critical Questions for Post 6

- **Is the decision tree too prescriptive?** Real concurrency decisions involve context the tree cannot capture (team familiarity, existing infrastructure, bundle size constraints). Each leaf should recommend a pattern with caveats, not dictate a solution.
- **Does the composition sandbox feel realistic?** A collaborative image editor using all four patterns simultaneously is possible but uncommon. Acknowledge this is a teaching device, not a blueprint. Most real apps use 2-3 of these patterns.
- **The comparison grid is the series payoff.** The reader who started with the event loop in Post 1 and reaches the 4x5 grid in Post 6 should feel a sense of completion. The grid is the vocabulary they have built: 5 patterns, 4 concerns, 20 specific behaviors they can now name and recognize.
- **Avoiding "just use the right tool" as the conclusion.** The synthesis should arm the reader with a decision process, not a recommendation. The reader working on a simple CRUD app should leave feeling validated in using basic async/await. The reader building a collaborative editor should leave with a clear architecture.
- **Cross-series references.** The Streaming series has overlapping concepts (backpressure, cancellation, composition). The synthesis post should reference the Streaming decision tree and note how the two decision trees interact: "If your problem is about data arriving over time, see the Streaming series. If it's about work competing for the thread, you're in the right place."

---

## Series-Wide Critical Questions

### The Ordering Problem

Concurrency is about ordering: what runs first, what runs next, what can interrupt what. Every widget must make ordering visible and manipulable:

- **The event loop simulator's step mode** is the most important teaching tool. The reader manually decides "execute this microtask, now this one, now check the macrotask queue" and builds the mental model by enacting it.
- **The race condition reproducer** is the most practical teaching tool. The reader creates a real (simulated) race condition, watches it corrupt state, then applies a fix. This is the widget they will remember when they encounter a race condition in their own code.
- **Timing controls everywhere.** Every widget that involves timing should have a speed slider. The default speed should be artificially slow (teaching speed), with a "real speed" option that shows how fast things actually happen. The reader should always know they are watching a slow-motion version of reality.

### The "Is This Actually Concurrency?" Question

Some purists will argue that JavaScript does not have "real" concurrency -- only Web Workers provide true parallelism, and everything else is cooperative multitasking. This series should:
- Acknowledge the distinction clearly (Post 1 establishes it)
- Use "concurrency" in its broader sense: managing multiple things that could happen at the same time, even if they are interleaved rather than parallel
- Avoid the word "concurrent" when describing single-threaded interleaving; use "cooperative" or "interleaved" instead
- Reserve "parallel" for Web Workers specifically
- The thesis is: "JavaScript achieves concurrent behavior through multiple mechanisms, only one of which involves parallelism."

### Widget Complexity Budget

This series proposes 17 widgets across 6 posts. Some are complex (Event Loop Simulator, Time-Slicing Timeline, Connection Orchestrator), others are simpler (Frame Budget Monitor, Promise Combinator Playground). The complexity budget:

- **3 anchor widgets** (most complex, most time to build): Event Loop Simulator (1.1), Time-Slicing Timeline (2.1), Connection Orchestrator (3.1)
- **6 major widgets** (significant interactivity, custom animations): Frame Budget Monitor (1.2), Priority Lane Visualizer (2.2), Conflict Resolver (3.2), Thread Comparator (4.1), Race Condition Reproducer (5.1), Composition Sandbox (6.2)
- **5 supporting widgets** (focused, single-concept): Ordering Puzzle (1.3), shouldYield Heartbeat (2.3), Reconnection Sync (3.3), Structured Clone Inspector (4.2), Cancellation Flow (5.2)
- **3 reference widgets** (comparison/synthesis): Worker Pool Scheduler (4.3), Promise Combinator Playground (5.3), Pattern Comparison Grid (6.3)

### The Transferability Mandate

Each post uses a specific library/framework. The widgets must teach the general pattern, not just the API:

- Label every mechanism with both library-specific AND generic names ("shouldYield" / "cooperative yield point", "lanes" / "priority levels", "onMessage" / "message handler")
- Post 6's comparison grid strips away library-specific details and compares patterns at the conceptual level
- The decision tree references patterns, not libraries ("cooperative scheduling" not "React Scheduler")
- Consider a "generic mode" toggle on each widget that replaces library-specific labels with pattern names
- The reader should be able to apply Post 2's mental model to any cooperative scheduler, Post 3's model to any distributed state system, Post 4's model to any parallel execution environment

### Shared Primitive Reuse Map

Track which primitives are used across which widgets:

| Primitive | 1.1 | 1.2 | 1.3 | 2.1 | 2.2 | 2.3 | 3.1 | 3.2 | 3.3 | 4.1 | 4.2 | 4.3 | 5.1 | 5.2 | 5.3 | 6.1 | 6.2 | 6.3 |
|-----------|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| TimelineRuler |  x  |  x  |     |  x  |  x  |     |     |     |  x  |  x  |     |  x  |  x  |     |     |     |  x  |     |
| QueueVisualizer |  x  |     |     |     |  x  |     |  x  |     |     |     |     |  x  |     |     |     |     |     |     |
| FrameBudgetBar |  x  |  x  |     |  x  |     |  x  |     |     |     |     |     |     |     |     |     |     |     |     |
| PlaybackControls |  x  |  x  |  x  |  x  |  x  |  x  |  x  |  x  |  x  |  x  |  x  |  x  |  x  |  x  |  x  |     |  x  |  x  |
| ConnectionPipe |     |     |     |     |     |     |  x  |     |  x  |  x  |  x  |     |     |  x  |     |     |  x  |     |
| CallStackFrame |  x  |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |     |

---

## Technical Notes

- All animations must use motion.ts presets (SPRING, TRANSITION, LOOP, STAGGER, DELAY, DURATION, EASE). No inline timing values.
- All widgets must respect `usePrefersReducedMotion()`. Reduced motion fallback: show the final state with step-through controls instead of continuous animation. The event loop simulator and ordering puzzle are particularly important to support in reduced motion mode, since their educational value depends on sequencing, not speed.
- The Event Loop Simulator (1.1) is the most architecturally complex widget. It needs a state machine internally: a `useReducer` managing task queues, current phase (microtask drain / macrotask / render), and the event loop cursor position. Consider building it on top of a `useEventLoopSimulation` hook that encapsulates the algorithm.
- The Time-Slicing Timeline (2.1) should use real React Scheduler source (pinned commit) for annotations. Build a small test app, profile it with React DevTools, and capture the actual time-slice boundaries for the widget's data.
- The Connection Orchestrator (3.1) should simulate network latency accurately. Use `setTimeout` for simulated message delays, not animation delays. The visual animation speed and the simulated network speed are independent concerns.
- Worker widgets (4.1, 4.2, 4.3) cannot run real Workers in the blog post (Workers require a separate file or blob URL). Use simulated workers with `setTimeout` for computation delays, and clearly note that real Workers would use separate threads. Consider a "try in CodeSandbox" link for readers who want to see real Workers.
- Timeline scrubbing (Widgets 1.1, 2.1, 4.1, 5.1, 6.2) requires a seekable animation model. Use `useTransform` from framer-motion to map a slider value (0-1) to animation progress, rather than time-based animation.
- Each widget should be lazy-loaded and wrapped in its own Suspense boundary. Heavy widgets (Event Loop Simulator, Composition Sandbox) should show a meaningful skeleton, not a spinner.
- Design tokens for this series: extend `tokens.css` with concurrency-specific semantic tokens:
  ```css
  --concurrency-microtask: oklch(65% 0.15 140);   /* green family */
  --concurrency-macrotask: oklch(65% 0.15 200);   /* blue family */
  --concurrency-raf: oklch(65% 0.15 300);          /* purple family */
  --concurrency-blocked: oklch(65% 0.2 25);        /* red family */
  --concurrency-idle: oklch(50% 0.02 262);         /* muted gray */
  --concurrency-worker: oklch(65% 0.15 60);        /* amber family */
  ```

---

## Sequence of Work

1. **Build shared primitives first:**
   - `<TimelineRuler>` -- scrubable timeline with cursor, bars, markers, frame budget lines
   - `<QueueVisualizer>` -- animated queue with FIFO, priority, and drain-all modes
   - `<FrameBudgetBar>` -- frame budget consumption visualizer with color transitions
   - `<PlaybackControls>` -- play/pause/speed/reset/step controls
   - `<ConnectionPipe>` -- SVG pipe with animated particles, blockage, and abort signals
   - `<CallStackFrame>` -- stack visualization with push/pop animations

2. **Post 1 widgets** -- these set the vocabulary. The Event Loop Simulator (1.1) is the foundation everything else builds on. The Ordering Puzzle (1.3) is the reader's first active exercise. Get the color coding right (microtask = green, macrotask = blue, rAF = purple) because it persists through the entire series.

3. **Post 2 widgets** -- the Time-Slicing Timeline (2.1) is the most important widget for React developers. It should feel like a revelation: "so THAT's what concurrent mode is doing." The shouldYield Heartbeat (2.3) zooms into the core mechanism.

4. **Post 3 widgets** -- the Connection Orchestrator (3.1) requires simulated network latency. The Conflict Resolver (3.2) is the most conceptually dense widget (three strategies simultaneously). The Reconnection Sync (3.3) is simpler but narratively satisfying.

5. **Post 4 widgets** -- the Thread Comparator (4.1) is the "aha" for parallelism (watching the bouncing ball freeze vs. stay smooth). The Structured Clone Inspector (4.2) makes an invisible algorithm visible. The Worker Pool Scheduler (4.3) teaches diminishing returns.

6. **Post 5 widgets** -- the Race Condition Reproducer (5.1) is the most practically useful widget in the entire series. Build it to be shareable -- readers should want to send it to teammates who write racy async code. The Promise Combinator Playground (5.3) is a reference tool.

7. **Post 6 widgets** -- synthesis. Build last. The Composition Sandbox (6.2) reuses primitives from all previous posts. The Pattern Comparison Grid (6.3) is the series' capstone.

8. **Write prose last.** The widgets ARE the teaching. The prose is connective tissue between widgets, providing context, annotated source code, and the "why" that the widgets' "how" makes visible.

---

## Open Questions

- **Should Post 1 include `requestIdleCallback`?** It is part of the event loop spec and often misunderstood. It runs during the idle period of a frame -- after rAF, after paint, if there is time remaining. Including it makes the event loop model more complete but adds complexity. Consider it as an "advanced" section or sidebar.
- **Should Post 2 cover React 19's scheduler changes?** React 19 makes further scheduler improvements. Pin to a specific React version and note what changed. The principles (cooperative scheduling, priority lanes) are stable even as implementation details evolve.
- **Should Post 3 use Partykit or PartyServer?** The branding has shifted. Use whichever name is current at publication time, but focus on the patterns (WebSocket server with single-threaded message processing) rather than the specific API. The patterns apply to any durable object / actor model system.
- **Should Post 4 include a SharedArrayBuffer widget?** SharedArrayBuffer + Atomics reintroduces classic concurrency primitives (locks, condition variables) to JavaScript. It is the most "computer science" topic in the series. A widget showing a mutex implemented with `Atomics.compareExchange` could be fascinating but might alienate the target audience. Consider it as an optional "deep cut" section.
- **Should there be a Post 0 ("Prerequisites")?** Covering: what is a thread, what is a process, CPU-bound vs. I/O-bound work, the C10K problem and why async I/O exists. This could be a standalone article or a brief section in Post 1.
- **Cross-references with the Streaming series.** The Streaming series' backpressure widget (Widget 2.2 in that series) and this series' Worker communication overhead are related concepts (data flow management). Should they share a primitive or just link to each other?
- **Is 6 posts too many or too few?** The series could be compressed to 4 (merge Posts 1+2 and Posts 4+5). But each post has 3 widgets with distinct teaching goals, and the interactive depth justifies the length. The risk of 6 posts is reader fatigue; the risk of 4 is rushing through concepts.
