# Streaming & Incremental Computation

**Status:** Expanded idea -- not yet started
**Created:** 2026-05-15
**Tags:** Streaming, ReadableStream, RSC, AI SDK, TanStack Query, Progressive Rendering, Backpressure, Incremental Updates

---

## The Idea

A five-post series exploring how modern web frameworks handle data that arrives over time. The unifying thesis: **streaming is not a performance optimization -- it is a fundamentally different computation model**, and the frameworks that embrace it reshape how users experience the web.

Static diagrams cannot teach streaming. A box labeled "chunk 1 -> chunk 2 -> chunk 3" communicates nothing about timing, buffering, or the felt experience of progressive rendering. This series requires bespoke interactive widgets where the reader can watch data flow through systems in real time, pause mid-stream, adjust speeds, and feel the difference between "fast batch" and "true streaming" in their bones.

Each post follows the same arc: **problem -> mechanism -> annotated source -> interactive proof**. The reader never takes our word for it -- they see the behavior, manipulate it, and build intuition that transfers beyond any single library.

---

## Series Structure

1. **The Problem** -- batch vs. streaming, why latency matters more than throughput, the spectrum from request-response to real-time
2. **Vercel AI SDK** -- streaming LLM responses, ReadableStream internals, text/object streaming, backpressure
3. **React Server Components** -- the RSC wire format, Suspense streaming, selective hydration, the server/client boundary
4. **TanStack Query** -- stale-while-revalidate, structural sharing, optimistic updates, cache invalidation
5. **Synthesis** -- the streaming decision tree, when each pattern applies, how they compose

---

## Post 1: The Problem

### Thesis

The request-response model treats network calls as function calls that happen to be slow. Streaming treats them as ongoing relationships between producer and consumer. This mental model shift changes everything: how we design UIs, how we handle errors, how we think about "done."

### Content Outline

**The batch model and its discontents.** Fetch data, wait, render. The user sees nothing until everything is ready. Demonstrate with a realistic dashboard: 6 panels, 3 slow API calls, 2 fast ones, 1 dependent on another. In batch mode the page is blank for 2.3 seconds. In streaming mode the fast panels appear in 200ms, slow ones fill in progressively.

**Latency vs. throughput.** The total bytes transferred are identical. The total wall-clock time might even be slightly worse with streaming (overhead of chunked encoding, connection management). But the perceived performance is radically different. Cite the psychology: users judge speed by time-to-first-meaningful-content, not time-to-completion. The 100ms rule, the 1-second rule, the 10-second rule.

**The streaming spectrum.** Not a binary. From left to right:
- **Batch**: fetch all, render all
- **Parallel batch**: fetch in parallel, render as each completes (Promise.all with independent renders)
- **Chunked streaming**: single response, multiple chunks (Transfer-Encoding: chunked)
- **Server-Sent Events**: server pushes discrete events over a long-lived connection
- **WebSocket**: full duplex, bidirectional
- **WebTransport**: multiplexed streams over QUIC

Most apps live in the middle of this spectrum, not at the extremes. The series focuses on chunked streaming and SSE because that is where the most underexplored territory sits for frontend developers.

**The producer-consumer contract.** Every streaming system has a producer (generates data), a consumer (processes data), and a channel (connects them with buffering semantics). The core tensions:
- What happens when the producer is faster than the consumer? (backpressure)
- What happens when the producer fails mid-stream? (partial state)
- What happens when the consumer wants to cancel? (abort signals)
- What does "done" mean? (completion semantics)

These four questions recur in every subsequent post.

### Interactive Widgets

#### Widget 1.1: The Dashboard Race

**What it teaches:** The felt difference between batch and streaming rendering. This is the hook for the entire series -- if the reader doesn't viscerally feel why streaming matters, nothing else lands.

**Layout:** A realistic dashboard mockup with 6 card-shaped panels arranged in a 3x2 grid. Each panel has a title, a skeleton loader, and eventually content (chart, number, table). Below the dashboard: a timeline ruler showing elapsed milliseconds.

**Animation spec:**
- **Batch mode:** All 6 panels show skeleton loaders. A progress indicator ticks from 0ms. At ~2300ms, all 6 panels snap to their loaded state simultaneously. The timeline shows a single thick bar spanning 0-2300ms labeled "waiting."
- **Streaming mode:** Panels load independently. Panel 1 (fast API) loads at 180ms. Panel 2 at 210ms. Panel 3 at 450ms (depends on panel 1's data). Panel 4 at 1100ms. Panels 5 and 6 at 2100ms and 2300ms. The timeline shows staggered bars of different lengths, each labeled with the panel name.
- **Transition between modes:** A segmented toggle (Batch | Streaming) at the top. Switching replays the loading sequence. The dashboard resets to skeletons and re-animates.
- **Skeleton animation:** Use a shimmer sweep (linear gradient translating left-to-right, `LOOP.breathe` timing). When content arrives, the skeleton cross-fades to real content over `DURATION.fast`.
- **Timeline cursor:** A vertical hairline advances along the timeline ruler in real time, synced to the animation. The reader can drag this cursor to scrub through the loading sequence -- pause at 500ms to see what's loaded in each mode.

**Interaction:**
- Toggle between Batch and Streaming modes
- Drag the timeline cursor to scrub to any point in the loading sequence
- Hover any panel to see its individual loading timeline highlighted on the ruler
- A "Slow network" toggle that 3x all timings -- makes the difference even more dramatic

**Component API (rough):**
```tsx
<DashboardRace
  panels={[
    { id: "revenue", loadTime: 180, content: <RevenueChart /> },
    { id: "users", loadTime: 210, content: <UserCount /> },
    // ...
  ]}
  mode="streaming" // | "batch"
  networkSpeed={1}  // multiplier
/>
```

**Why animation is essential:** This widget IS the argument for the entire series. If the reader watches two identical dashboards -- same data, same total load time -- and sees one feel instantaneous while the other feels broken, the case for streaming is made without a single line of prose.

---

#### Widget 1.2: The Streaming Spectrum

**What it teaches:** Streaming is not a binary. There is a continuum of approaches, each with different characteristics. The reader should be able to place any system they encounter on this spectrum.

**Layout:** A horizontal spectrum bar stretching the full content width. Five labeled points along it: Batch, Parallel Batch, Chunked, SSE, WebSocket. Above the spectrum: an animated visualization area showing how data moves for the currently selected point. Below: a comparison table with rows for Directionality, Connection Lifecycle, Buffering, Error Recovery, Browser Support.

**Animation spec:**
- **Spectrum selector:** The five points are clickable nodes on the spectrum line. The active node has an accent ring (`SPRING.snappy`). A horizontal highlight bar stretches between Batch and the active node, showing "you are here on the spectrum."
- **Visualization area:** For each point on the spectrum, an animation plays showing a producer (left box), a channel (middle pipe), and a consumer (right box):
  - **Batch:** Producer fills up entirely (a box fills with liquid from bottom to top), then the entire contents whoosh through the pipe in one blob to the consumer.
  - **Parallel Batch:** Three producers fill simultaneously, three pipes carry three blobs independently, consumer assembles them.
  - **Chunked:** Producer drips data continuously. Small droplets flow through the pipe at intervals. Consumer's box fills gradually.
  - **SSE:** Similar to chunked, but the droplets are labeled with event names. A "connection" line persists between producer and consumer (dashed, gently pulsing).
  - **WebSocket:** Droplets flow both directions. The pipe is visually bidirectional (split lane). Consumer can send droplets back.
- **Liquid metaphor:** Each droplet is a small rounded rectangle with a subtle gradient. Movement follows a quadratic bezier path through the pipe. Timing uses `SPRING.gentle` for natural deceleration as droplets arrive.

**Interaction:**
- Click any point on the spectrum to see its animation and comparison data
- Animations loop continuously while a point is selected
- Hover on a comparison table cell to highlight what is different from the neighboring approach

**Component API (rough):**
```tsx
<StreamingSpectrum
  activePoint="chunked"
  onSelect={(point) => void}
  showComparison={true}
/>
```

**Why animation is essential:** The liquid/droplet metaphor makes the abstract concept of "data flowing through a channel" concrete. Seeing batch as "one big blob" vs. chunked as "continuous drips" builds intuition that no static diagram can match.

---

#### Widget 1.3: The Four Questions

**What it teaches:** The four fundamental tensions in any streaming system (backpressure, partial failure, cancellation, completion). These questions are the conceptual backbone of the entire series.

**Layout:** A central producer-channel-consumer visualization (reusing the pipe metaphor from Widget 1.2, but larger and more detailed). Four buttons arranged around it, each labeled with one question. A "scenario panel" below shows what happens when each question is triggered.

**Animation spec:**
- **Default state:** Producer generates droplets at a steady rate. They flow through the channel. Consumer absorbs them. Everything is calm and balanced. The channel (pipe) has a visible capacity -- it can hold ~8 droplets.
- **Backpressure scenario (button 1):** Consumer slows down (visual: consumer box gets a "SLOW" badge, starts pulsing amber). Droplets accumulate in the channel. The pipe visually fills up -- 4 droplets, 6, 8. When full, the pipe turns red and producer is forced to slow (its generation rate visually decreases, a "WAITING" badge appears). If a "no backpressure" toggle is on, excess droplets overflow out the sides of the pipe, splashing into a "lost data" gutter.
- **Partial failure scenario (button 2):** Producer emits 5 normal droplets, then a red "error" droplet. The error droplet flows through the pipe. Consumer receives it. Three options appear: "abort everything" (consumer dumps all received droplets), "skip and continue" (error droplet is filtered out, stream continues), "retry from checkpoint" (stream rewinds to droplet 4).
- **Cancellation scenario (button 3):** Consumer sends an abort signal upstream (a red lightning bolt animates backwards through the pipe from consumer to producer). Producer receives it and stops generating. In-flight droplets in the pipe drain to consumer (graceful) or evaporate (hard cancel).
- **Completion scenario (button 4):** Producer emits a special "done" droplet (green, with a checkmark). It flows through the pipe. Consumer receives it and transitions to a "complete" state (green border, checkmark badge). A subtle question appears: "But what if the connection drops before the done signal arrives?" -- teasing the reliability problem.

**Interaction:**
- Click each of the four question buttons to trigger its scenario
- Each scenario auto-resets after playing, or reader can click "Reset" to return to the balanced default
- A speed control slider adjusts animation speed (0.5x to 3x)
- Toggle "with backpressure" / "without backpressure" in scenario 1

**Component API (rough):**
```tsx
<FourQuestions
  scenario="backpressure" | "partial-failure" | "cancellation" | "completion" | null
  speed={1}
  backpressureEnabled={true}
/>
```

**Why animation is essential:** These are temporal phenomena. Backpressure is about *rates* -- you cannot show a rate in a static image. Cancellation is about a signal propagating *backwards* through time. Completion is about a *final event* in a sequence. Without animation, these are definitions. With animation, they are experiences.

---

### Critical Questions for Post 1

- **Are we building intuition or just showing animations?** The dashboard race is persuasive, but does it teach mechanism? Make sure the timeline scrubbing forces the reader to think about *when* things happen, not just watch them happen.
- **The "fast batch" trap:** On a fast connection, batch and streaming look nearly identical. The dashboard race needs the "slow network" toggle to make this honest -- streaming's advantage shrinks on fast networks and grows on slow ones.
- **Is the liquid metaphor too cute?** Droplets flowing through pipes is intuitive but might oversimplify. Real streams deal with typed chunks, framing, and encoding. The metaphor should be introduced as a thinking tool and then complicated in later posts, not treated as the final mental model.
- **Scope creep risk:** Post 1 covers a lot of conceptual ground. It should resist the temptation to show code. This is the "why" post -- code comes in posts 2-4. If the reader is itching to see implementation by the end of post 1, the post succeeded.

---

## Post 2: Vercel AI SDK -- Streaming LLM Responses

### Thesis

LLM responses are the purest streaming use case in modern web development: tokens arrive one at a time over seconds, the response is consumed progressively, and the user experience degrades catastrophically if you wait for the full response. The AI SDK's streaming pipeline is a masterclass in ReadableStream composition.

### Content Outline

**The LLM streaming problem.** An LLM generating 500 tokens at 30 tokens/second takes ~17 seconds. In batch mode, the user stares at a spinner for 17 seconds. In streaming mode, the first token appears in ~300ms. Same total time, completely different experience. Callback to Post 1's dashboard race.

**ReadableStream fundamentals.** Before diving into the AI SDK, establish the Web Streams API:
- ReadableStream, WritableStream, TransformStream
- The reader/controller model
- `getReader()`, `read()`, and the `{ value, done }` protocol
- `pipeTo()` and `pipeThrough()` for stream composition
- Annotated source of a minimal ReadableStream that emits numbers

**The AI SDK streaming pipeline.** Walk through the actual code path:
1. `streamText()` calls the LLM provider, gets back a raw SSE stream
2. The SSE stream is parsed into a ReadableStream of AI SDK protocol events
3. The protocol stream is transformed: text deltas, tool calls, finish reasons
4. `toDataStreamResponse()` wraps it in a Response with proper headers
5. On the client, `useChat()` consumes the stream and updates React state
6. Each token delta triggers a state update, React re-renders the message

**Text streaming vs. object streaming.** `streamText()` returns string chunks. `streamObject()` returns partial JSON objects. The partial object problem: how do you render `{ name: "Al` before the closing `" }` arrives? The AI SDK uses Zod schemas to validate partial objects and fill in missing structure.

**Backpressure in practice.** What happens when the LLM generates tokens faster than the client can render them? In practice this rarely happens (LLMs are the bottleneck), but the mechanism matters: the ReadableStream pull model means the consumer controls the pace. Walk through the pull/enqueue cycle with annotated code.

**The `useChat` hook internals.** Simplified annotated source:
- Creates an AbortController for cancellation
- Fetches with streaming response
- Reads the response body chunk by chunk
- Parses protocol events
- Updates messages state on each text delta
- Handles tool calls as special events
- Cleanup: abort on unmount

### Interactive Widgets

#### Widget 2.1: The Token Stream Visualizer

**What it teaches:** How individual tokens flow from an LLM through the streaming pipeline to the rendered UI. The reader should internalize that what they see as "the AI typing" is actually a complex pipeline of stream transformations.

**Layout:** Three vertical columns, equal width:
- **Left column: "Raw Stream"** -- shows individual SSE events as they arrive. Each event is a small card that slides in from the top with event type (e.g., `0:`, `2:`, `e:`) and payload. Cards stack downward chronologically. Older cards compress/shrink to keep recent events prominent.
- **Center column: "Pipeline"** -- a vertical stack of labeled transform stages: SSE Parser -> Protocol Decoder -> Text Accumulator. Each stage is a rounded box. When a chunk passes through a stage, the stage briefly pulses with the accent color. Lines connect the stages vertically, and a small data chip animates down each line.
- **Right column: "Rendered UI"** -- a chat message bubble that assembles progressively, token by token. Each new token appears with a subtle fade-in. A blinking cursor sits at the insertion point.

**Animation spec:**
- **Token arrival:** Every 200ms (adjustable), a new SSE event card appears in the left column. It slides in from above with `SPRING.snappy`. Simultaneously, a data chip (small pill-shaped element) detaches from the card and begins traversing the pipeline stages.
- **Pipeline traversal:** The chip moves downward through each stage box. As it enters a stage, the stage glows briefly (border-color transitions to accent, then back, over `DURATION.fast`). The chip may split (one SSE event can produce multiple protocol events) or merge (multiple deltas accumulated into one state update). Split: chip divides into 2-3 smaller chips with a spreading animation. Merge: multiple chips converge into one with a gathering animation.
- **Rendered output:** When the chip exits the final pipeline stage, the corresponding token appears in the right column's message bubble. The token fades in over `DURATION.instant`. The cursor jumps to the right of the new token.
- **Speed control:** A horizontal slider below the three columns. Range: 50ms to 1000ms per token. Label shows both tokens/second and estimated total time for a 200-token response. Moving the slider immediately changes the animation speed -- the reader can speed up to see the full message fast, or slow way down to watch individual tokens traverse the pipeline.
- **Pause/Resume:** A play/pause button. When paused, the current state freezes. The reader can inspect which chips are mid-pipeline, which events are queued, what the partial message looks like.

**Interaction:**
- Speed slider (50ms - 1000ms per token)
- Play/Pause button
- Click any SSE event card in the left column to highlight its corresponding token in the rendered message (and vice versa)
- Click any pipeline stage to expand it into annotated source code showing the transform function
- A "Show raw bytes" toggle that replaces human-readable event names with actual SSE wire format (`data: {"type":"text-delta","value":"Hello"}\n\n`)

**Component API (rough):**
```tsx
<TokenStreamVisualizer
  tokens={["Hello", " ", "world", ",", " ", "how", " ", "are", " ", "you", "?"]}
  tokenInterval={200}
  playing={true}
  showRawBytes={false}
  pipelineStages={[
    { name: "SSE Parser", code: `/* annotated source */` },
    { name: "Protocol Decoder", code: `/* ... */` },
    { name: "Text Accumulator", code: `/* ... */` },
  ]}
/>
```

**Why animation is essential:** The entire point of this widget is that streaming is temporal. A static diagram showing "SSE event -> pipeline -> rendered text" communicates the topology but not the *experience* of data flowing through it. The speed slider is critical -- it lets the reader feel the difference between "fast streaming that looks like batch" (50ms) and "slow streaming where each token matters" (1000ms).

---

#### Widget 2.2: The Backpressure Buffer

**What it teaches:** What backpressure means in practice, how ReadableStream's pull model handles it, and what happens when there is no backpressure management.

**Layout:** A horizontal pipeline: Producer (LLM box on left) -> Buffer (a transparent rectangular tank in the center) -> Consumer (React render box on right). The buffer has a visible capacity (e.g., can hold 12 token chips). A fill-level indicator on the side of the buffer, like a thermometer.

**Animation spec:**
- **Balanced state:** Producer emits token chips at rate X. Consumer absorbs token chips at rate X. Buffer stays nearly empty (1-2 chips passing through). Fill indicator stays in the green zone. Everything flows smoothly.
- **Producer-fast scenario:** A "Producer Speed" slider above the producer cranks the emission rate to 3x. Chips start accumulating in the buffer. Fill indicator rises: green -> yellow -> orange -> red. The buffer visually fills with chips stacking up like tetris blocks. When it hits capacity, one of two things happens based on a toggle:
  - **With backpressure (pull model):** The producer slows down. Its emission animation throttles. A "PULL-BASED: waiting for consumer" label appears on the producer. The buffer level stabilizes at ~80% full.
  - **Without backpressure (push model):** Chips overflow the top of the buffer. They tumble off the sides with a physics-inspired falling animation, landing in a "dropped" tray below. A counter shows "N tokens lost." The producer keeps going at full speed, oblivious.
- **Consumer-slow scenario:** A "Consumer Speed" slider above the consumer reduces its absorption rate. Same buffer dynamics as above. This is the more realistic case -- the render loop is the bottleneck.
- **Consumer paused:** A "Pause Consumer" button. All flow stops at the consumer end. Buffer fills to capacity. With backpressure, producer waits. Without, overflow.

**Interaction:**
- Producer Speed slider (0.5x to 5x)
- Consumer Speed slider (0.5x to 5x)
- Backpressure toggle (pull model vs. push model)
- Pause Consumer button
- Reset button
- Hover on any chip in the buffer to see its content and how long it has been waiting

**Component API (rough):**
```tsx
<BackpressureBuffer
  producerRate={1}
  consumerRate={1}
  bufferCapacity={12}
  backpressureEnabled={true}
  paused={false}
/>
```

**Why animation is essential:** Backpressure is a dynamic equilibrium -- a balance of rates. You cannot show rates in a static image. The "liquid filling a tank" metaphor makes the abstract concept of buffer occupancy viscerally understandable. The overflow animation (chips tumbling off) makes data loss feel real, not abstract.

---

#### Widget 2.3: Text vs. Object Streaming Comparator

**What it teaches:** The difference between streaming raw text and streaming structured objects, and why streaming partial JSON is fundamentally harder.

**Layout:** Two panels side by side.
- **Left panel: "Text Streaming"** -- a simple chat bubble assembling token by token. Below it, the raw stream shown as a growing string: `"Hello"` -> `"Hello world"` -> `"Hello world, how"`.
- **Right panel: "Object Streaming"** -- a structured card (like a recipe card with title, ingredients, steps) assembling field by field. Below it, the raw stream shown as partial JSON: `{ "title": "Pas` -> `{ "title": "Pasta", ` -> `{ "title": "Pasta", "ingredients": [`

**Animation spec:**
- Both panels stream simultaneously, driven by a single timeline.
- **Text panel:** Tokens append sequentially. Each token fades in at the cursor position. Straightforward.
- **Object panel:** The structured card starts empty. As JSON fields complete, the corresponding UI section fills in:
  - `"title": "Pasta Carbonara"` -> the title field in the card populates. But BEFORE the closing quote arrives, the partial title `"Pas"` is shown in the card with a pulsing ellipsis indicator, then `"Past"`, `"Pasta"`, `"Pasta "`, `"Pasta C"`, etc. The card shows the partial value, updating character by character.
  - When a field is syntactically complete (closing quote + comma), the pulsing ellipsis disappears and the field gets a subtle checkmark.
  - When the `"ingredients"` array starts, the ingredients section of the card appears with an "array building" animation -- list items pop in one at a time as each string in the array completes.
- **Zod schema overlay:** A toggle that shows a semi-transparent Zod schema definition overlaid on the object panel. As each field completes and validates, the corresponding line in the schema gets a green highlight. If a partial value violates the schema, it flashes red briefly.
- **The JSON repair moment:** At one point in the stream, the partial JSON is `{ "title": "Pasta", "time": 2` -- a number without a closing brace. The widget shows how the AI SDK handles this: it speculatively closes the JSON (`{ "title": "Pasta", "time": 2 }`) to create a valid partial object, renders it, then corrects when more data arrives.

**Interaction:**
- Shared play/pause and speed controls for both panels
- Toggle Zod schema overlay
- Toggle "Show raw JSON" to expand/collapse the raw stream view
- Click any field in the structured card to highlight the corresponding bytes in the raw stream

**Component API (rough):**
```tsx
<TextVsObjectStreaming
  textTokens={["Hello", " ", "world", /* ... */]}
  objectTokens={[
    '{ "title": "Pas',
    'ta Car',
    'bonara", ',
    '"time": 2',
    '5, "ingredients": ["spa',
    'ghetti", "eggs',
    '", "pecorino"] }',
  ]}
  schema={recipeSchema} // Zod schema for validation overlay
/>
```

**Why animation is essential:** The partial JSON problem is impossible to understand without watching it happen in real time. Seeing `{ "title": "Pas` in the raw stream while the card shows a pulsing partial title teaches something that no amount of prose can. The moment when the SDK speculatively closes the JSON is a genuine "aha" moment -- but only if the reader watches it happen.

---

### Critical Questions for Post 2

- **Are we teaching ReadableStream or the AI SDK?** The danger is getting lost in SDK-specific API details. Every widget should surface the general pattern (producer/transform/consumer) while using the AI SDK as the concrete example. The pipeline stages should be labeled with both AI SDK names AND generic stream names.
- **Token-by-token animation speed:** Real LLMs emit ~30-80 tokens/second. At that speed, individual tokens are invisible -- just a blur. The speed slider must default to something artificially slow (200ms/token = 5 tokens/second) for teaching purposes, but include a "real speed" preset so the reader can see how fast it actually is.
- **The `useChat` hook is React-specific.** Note that the streaming pipeline up to the Response is framework-agnostic. The React-specific part is just the final state update. Keep the widgets focused on the stream pipeline, not the React rendering.
- **Backpressure is mostly theoretical for LLMs.** LLMs are slow enough that backpressure rarely triggers. Be honest about this. The widget teaches the concept -- which matters for non-LLM streaming -- but note that in practice the producer (LLM) is almost always the bottleneck.
- **Are we capturing the TIME dimension?** The token stream visualizer must make timing information first-class. Timestamps on each event. Cumulative time display. The reader should be able to answer "how long has this taken so far?" at any point in the animation.

---

## Post 3: React Server Components -- Streaming HTML

### Thesis

React Server Components are not just "server-side rendering." They represent a streaming protocol between server and client where the server progressively sends UI as a wire format, and the client selectively hydrates only what needs interactivity. The RSC wire format is the most important implementation detail that almost no one reads.

### Content Outline

**The problem RSC solves.** Traditional SSR: render entire page to HTML string, send it, then hydrate everything on the client. The page is interactive only after full hydration. Two problems: (1) the server blocks until everything is rendered, (2) the client blocks until everything is hydrated. RSC streaming solves both.

**Suspense as a streaming primitive.** `<Suspense>` is not just a loading state component. It is a streaming instruction: "send whatever is ready now, and stream this part later when it resolves." Each Suspense boundary is an independent streaming slot. Walk through how the server:
1. Starts rendering the component tree
2. Hits a Suspense boundary with an unresolved async component
3. Sends the fallback HTML immediately
4. Continues rendering other branches
5. When the async component resolves, streams a `<script>` tag that swaps the fallback with the real content

**The RSC wire format.** This is the secret heart of RSC. It is not HTML -- it is a JSON-like serialization of the React element tree. Line-by-line annotation of real RSC payloads:
- `0:"$Sreact.suspense"` -- a Suspense boundary reference
- `1:["$","div",null,{"children":"Hello"}]` -- a div element
- `2:I["./src/Counter.js",["Counter"],"default"]` -- a client component reference (import instruction, not the component itself)
- Row IDs, references, and how the client reconstructs the tree

**Selective hydration.** Not all components need JavaScript. Server Components are never hydrated -- their JS never ships to the client. Client Components (`"use client"`) are hydrated on demand. Walk through the hydration priority system: user interactions bump priority, so clicking an unhydrated button hydrates that component first.

**Nested Suspense and streaming order.** What happens with `<Suspense><Suspense>` nesting? The outer boundary can resolve before the inner one. Demonstrate the independence of streaming slots.

### Interactive Widgets

#### Widget 3.1: The Suspense Boundary Editor

**What it teaches:** How the placement of Suspense boundaries determines what streams when. The reader should develop intuition for "if I put the boundary here, this streams independently; if I put it there, these two things are coupled."

**Layout:** A split view.
- **Left panel: "Component Tree"** -- an editable tree representation of a React component hierarchy. A simplified page with ~8 components: `<Layout>`, `<Header>`, `<Nav>`, `<MainContent>`, `<SlowWidget>`, `<FastWidget>`, `<Sidebar>`, `<Footer>`. Each component node shows its name and a simulated load time (e.g., `SlowWidget: 2000ms`, `FastWidget: 100ms`). Suspense boundary markers are draggable elements that the reader can insert between any parent-child edge in the tree.
- **Right panel: "Streaming Timeline"** -- a Gantt-chart-style visualization showing when each component's HTML is sent to the client. The x-axis is time. Each component is a row. The bar shows: gray = "not yet sent", amber = "fallback sent", green = "real content sent."

**Animation spec:**
- **Initial state:** No Suspense boundaries placed. The streaming timeline shows a single bar: everything loads at the speed of the slowest component (2000ms for SlowWidget). All components go from gray to green simultaneously at 2000ms.
- **Adding a Suspense boundary:** The reader drags a `<Suspense>` marker from a palette and drops it above `SlowWidget` in the tree. The tree visually wraps `SlowWidget` in a dashed border labeled "Suspense." The timeline re-animates: `Header`, `Nav`, `FastWidget`, `Sidebar`, `Footer` all go green at ~200ms. `SlowWidget` shows amber (fallback) at 200ms, then green at 2000ms. The difference is dramatic.
- **Multiple boundaries:** The reader can place multiple Suspense boundaries. Each one creates an independent streaming slot. The timeline shows increasingly parallel loading.
- **Removing boundaries:** Drag a boundary marker to a trash icon. The components previously wrapped by it merge back into their parent's loading group.
- **Playback:** A "Stream it" button replays the loading sequence with a real-time animation. The right panel shows a browser viewport mockup where components appear progressively -- skeletons replaced by content, matching the Gantt chart timing.

**Interaction:**
- Drag Suspense boundaries into the component tree
- Adjust individual component load times (click on the time, type a new value)
- "Stream it" button to see the animated playback
- "Reset" to clear all boundaries
- Side-by-side comparison: save two configurations and compare their timelines

**Component API (rough):**
```tsx
<SuspenseBoundaryEditor
  tree={componentTree}          // nested component definitions
  boundaries={boundaryPositions} // where Suspense wrappers are placed
  onBoundaryChange={(newBoundaries) => void}
  playbackSpeed={1}
/>
```

**Why animation is essential:** Suspense boundaries are about *when* things happen. A static component tree with boundaries marked tells you *where* boundaries are but not *what they do*. The Gantt chart timeline -- especially the "Stream it" playback that shows the page assembling progressively -- turns an architectural decision (where to put Suspense) into a visible, consequential choice.

---

#### Widget 3.2: The Wire Format Decoder

**What it teaches:** What the RSC wire format actually looks like, how the client interprets it, and why it is a streaming protocol (not a document format).

**Layout:** Two panels.
- **Left panel: "Wire"** -- a dark-themed code viewer showing raw RSC wire format lines, arriving one at a time. Each line is syntax-highlighted with type-specific colors: green for element definitions, blue for client component references, amber for Suspense completions, red for error boundaries.
- **Right panel: "Reconstructed Tree"** -- a visual component tree that builds progressively as each wire format line arrives. Nodes appear and connect as the client "interprets" each line.

**Animation spec:**
- **Line arrival:** Each wire format line slides in from the left edge of the code viewer with a quick enter animation (`SPRING.snappy`). A brief highlight flash on the new line.
- **Tree construction:** As each line arrives, the corresponding node appears in the right panel's tree. A connection line draws from its parent. The node entrance uses `SPRING.gentle` with a slight scale-up from 0.8 to 1.0.
- **Client component references:** When a `I[...]` line arrives (client component import instruction), the tree node appears with a dashed border and a "client" badge. A subtle download icon appears next to it -- representing the JS bundle that will be fetched. When "hydration" happens (later in the sequence), the dashed border becomes solid and the download icon is replaced by a checkmark.
- **Suspense resolution:** When a Suspense slot's content arrives (later in the stream), the corresponding tree node transitions from a gray "fallback" state to a colored "resolved" state. The tree may restructure -- the fallback subtree is replaced by the real subtree with a crossfade animation.
- **Hover annotations:** Hovering any wire format line highlights the corresponding tree node(s) and shows a tooltip explaining the line's meaning in plain English: `"This line defines a div element with className 'main' and two children"`.

**Interaction:**
- Step through wire format lines one at a time (arrow keys or click)
- Or play the full sequence at adjustable speed
- Hover lines for annotations
- Toggle between "real RSC format" and "simplified/annotated format"
- A "What if this line was missing?" mode -- click any line to remove it and see how the tree reconstruction fails or degrades

**Component API (rough):**
```tsx
<WireFormatDecoder
  wireLines={[
    { raw: '0:["$","html",null,{"children":...}]', annotation: "Root html element" },
    { raw: '1:I["./Counter.js",[],"default"]', annotation: "Client component import" },
    // ...
  ]}
  autoplay={false}
  stepIndex={0}
/>
```

**Why animation is essential:** The RSC wire format is a *protocol*, not a document. It is consumed sequentially, each line building on prior state. Showing the full format statically is like showing a movie as a grid of frames -- technically complete but missing the essence. The progressive tree construction is the whole point: the client never has the full picture at once, it builds understanding incrementally, just like streaming.

---

#### Widget 3.3: The Hydration Priority Visualizer

**What it teaches:** How React prioritizes hydration of client components based on user interaction, and why selective hydration means the page becomes interactive faster even though full hydration takes the same total time.

**Layout:** A mockup of a simple page with 5 interactive components: a nav menu, a search bar, a "like" button, a comment form, and a carousel. Each component is rendered in server HTML (visible but not yet interactive). A status bar at the bottom shows hydration progress. Each component has a small indicator dot: red = not hydrated, yellow = hydrating, green = hydrated.

**Animation spec:**
- **No interaction (default hydration order):** Components hydrate top-to-bottom in document order. Nav (200ms), Search (400ms), Like button (500ms), Comment form (700ms), Carousel (1000ms). Each indicator transitions red -> yellow (brief, `DURATION.fast`) -> green. The status bar fills progressively.
- **User clicks the Like button at 100ms:** The Like button's hydration is bumped to highest priority. While the nav is still hydrating, the Like button jumps the queue. Hydration order becomes: Like button (150ms), Nav (300ms), Search (500ms), Comment form (700ms), Carousel (1000ms). The Like button gets a visual "priority boost" indicator -- a small lightning bolt that appears when the user clicks, and the hydration bar for that component fills faster.
- **Visual queue:** A vertical queue visualization on the side shows the hydration order. When priority changes, items in the queue rearrange with a smooth reorder animation (`SPRING.snappy`). The clicked component rises to the top with a satisfying snap.
- **Click feedback:** When the user clicks an unhydrated component, the click visually "bounces" off (the component jiggles slightly -- it is not yet interactive). React records the click intent. Once hydration completes, the click replays automatically -- the Like button briefly shows the heart filling in, demonstrating that the interaction was captured.

**Interaction:**
- Click any component before it is hydrated to bump its priority
- A "hydration speed" slider to slow down the process for observation
- Toggle between "document order" and "interaction priority" modes
- Reset and replay

**Component API (rough):**
```tsx
<HydrationPriorityVisualizer
  components={[
    { name: "Nav", hydrationTime: 200, position: { top: 0, left: 0 } },
    { name: "Search", hydrationTime: 200, position: { top: 60, left: 0 } },
    // ...
  ]}
  mode="interaction-priority" // | "document-order"
  playbackSpeed={1}
/>
```

**Why animation is essential:** Hydration priority is invisible in production -- it happens in milliseconds and the user never sees the queue. Slowing it down and visualizing the queue makes an invisible optimization tangible. The moment when a user click causes the queue to rearrange is the "aha" -- React is not just blindly hydrating, it is responding to user intent.

---

### Critical Questions for Post 3

- **How deep into the wire format?** The RSC wire format is not publicly documented and changes between React versions. We should show enough to build intuition (elements, references, Suspense slots) without becoming a reference manual that breaks with the next React release. Pin to a specific React version and note it.
- **Server Components vs. SSR confusion.** Many readers will conflate RSC with traditional SSR. The post must clearly distinguish: SSR streams *HTML*, RSC streams a *component tree protocol*. The wire format decoder is the key differentiator here.
- **Are we teaching React or teaching streaming?** The Suspense boundary editor teaches a general concept (independently streamable slots) using React's implementation. Make sure the reader walks away understanding the pattern, not just the API. Callback to Post 1's "Four Questions" -- which ones does Suspense address?
- **Selective hydration is subtle.** The priority visualizer needs to be dramatically slowed down to be visible. In production, the difference is 50-200ms. We are manufacturing a legible version of a real optimization. Be transparent about this -- show real timings alongside the slowed-down version.
- **The "use client" boundary is confusing.** It does not mean "this runs on the client." It means "this is the boundary where client-side JS is needed." The widget could benefit from a toggle that shows what JS is shipped for each configuration.

---

## Post 4: TanStack Query -- Incremental State Management

### Thesis

TanStack Query does not stream data in the network sense, but it manages state incrementally: serving stale data instantly, revalidating in the background, sharing structure between cache entries, and rolling back optimistic updates. It is streaming in the temporal sense -- the state evolves through multiple phases (stale -> revalidating -> fresh) rather than being a single fetch-and-done.

### Content Outline

**Why TanStack Query belongs in this series.** It is not a streaming library. But it solves the same fundamental problem as streaming: how do you show the user *something* before you have *everything*? The answer is temporal phases: stale data now, fresh data soon, with seamless transitions between them.

**Stale-while-revalidate.** The core pattern:
1. Cache hit: return stale data immediately
2. Background refetch: request fresh data
3. Cache update: replace stale with fresh, re-render
4. The user sees content instantly (stale) and it silently updates (fresh)

Walk through the state machine: `idle -> fetching -> success -> stale -> fetching -> success`. Show how `staleTime`, `gcTime` (garbage collection time), and `refetchInterval` control transitions.

**Structural sharing.** When fresh data arrives, TanStack Query does not naively replace the entire cache entry. It structurally compares old and new data, preserving object references for unchanged subtrees. This means React components that depend on unchanged data do NOT re-render. Walk through the algorithm with a concrete example: a list of 100 items where 3 changed.

**Optimistic updates and rollback.** The optimistic update lifecycle:
1. User action (e.g., like a post)
2. Immediately update the cache with the expected result (post.likes + 1)
3. Fire the mutation to the server
4. If success: cache is already correct, no visible change
5. If failure: roll back the cache to the pre-optimistic state, show error
6. The rollback mechanism: `onMutate` returns a context with the previous data, `onError` restores it

**Cache invalidation strategies.** The hardest problem in computer science, after naming things. TanStack Query's tools:
- `invalidateQueries`: mark as stale, refetch if actively observed
- `refetchQueries`: refetch regardless of staleness
- `setQueryData`: manually update cache
- Query key matching: invalidate all queries whose key starts with `["posts"]`
- The cascade problem: invalidating a list query vs. invalidating individual item queries

### Interactive Widgets

#### Widget 4.1: The Cache State Machine

**What it teaches:** The lifecycle of a query in TanStack Query, visualized as a state machine that the reader can drive by triggering events.

**Layout:** A state machine diagram in the center. States as rounded rectangles: `idle`, `loading`, `success`, `stale`, `error`, `paused`. Transitions as labeled arrows between states. Below: an event trigger panel with buttons for each possible event: "Component mounts", "Fetch starts", "Fetch succeeds", "Fetch fails", "staleTime expires", "Window refocuses", "Component unmounts", "gcTime expires", "Retry". Right side: a snapshot panel showing the current query state object (`{ status, fetchStatus, data, error, dataUpdatedAt }`).

**Animation spec:**
- **Active state:** The current state node has a solid accent border and a gentle pulse (`LOOP.breathe` at reduced intensity). All other states have muted borders.
- **Transition:** When the reader clicks an event button, the state machine animates the transition: a glowing dot travels along the transition arrow from current state to next state, following the arrow's curve. The dot uses `SPRING.gentle`. When it arrives, the new state lights up and the old state dims. The state snapshot panel updates simultaneously with a brief highlight on changed fields.
- **Invalid events:** Buttons for events that are not valid from the current state are disabled (grayed out). Clicking them gently shakes the button (`SPRING.quick` with a small x-axis oscillation) and shows a tooltip: "Cannot retry from idle state."
- **Timeline ribbon:** A horizontal ribbon below the state machine accumulates a history of all transitions. Each transition is a small chip showing the event name and the from->to states. The ribbon scrolls left as it fills. The reader can click any chip to rewind to that point in the history.
- **staleTime and gcTime visualization:** Two circular countdown timers near the state machine. `staleTime` counts down when in `success` state -- when it hits zero, the state transitions to `stale` automatically. `gcTime` counts down when the query has no active observers (component unmounted) -- when it hits zero, the cache entry is garbage collected and the state returns to `idle`.

**Interaction:**
- Click event buttons to trigger state transitions
- Adjust `staleTime` and `gcTime` with number inputs (in seconds, for visibility -- real apps use milliseconds)
- Click timeline chips to rewind/fast-forward
- Toggle "auto-mode" that simulates a realistic lifecycle: mount -> fetch -> success -> staleTime -> refocus -> refetch -> success -> unmount -> gcTime -> garbage collected

**Component API (rough):**
```tsx
<CacheStateMachine
  initialState="idle"
  staleTime={5}   // seconds for visualization
  gcTime={30}     // seconds for visualization
  autoMode={false}
  onStateChange={(from, event, to) => void}
/>
```

**Why animation is essential:** State machines are inherently temporal -- states have duration, transitions have direction. The countdown timers for `staleTime` and `gcTime` are critical: they are time-based triggers that are impossible to convey statically. Watching `staleTime` count down from 5 to 0 and then seeing the automatic transition to `stale` builds intuition for cache configuration in a way that reading `staleTime: 5000` in code never will.

---

#### Widget 4.2: The Structural Sharing Diff

**What it teaches:** How TanStack Query avoids unnecessary re-renders by preserving object references for unchanged data, and why this matters for React's reconciliation.

**Layout:** Three rows.
- **Top row: "Previous Data"** -- a tree visualization of a JSON object. Each node is a box with a key and value. Object/array nodes have children connected by lines. Each node has a subtle memory address label (like `0x3f2a`) representing its JS object reference.
- **Middle row: "Incoming Data"** -- same tree visualization for the new data from the server. Highlighted differences from the previous data (changed values, added fields, removed fields).
- **Bottom row: "After Structural Sharing"** -- the resulting tree. Unchanged nodes retain their original memory address (same color, same `0x` label). Changed nodes have new addresses (different color). React components observing unchanged nodes will NOT re-render.

**Animation spec:**
- **Diff phase:** The widget starts by animating the comparison. Lines draw between corresponding nodes in Previous and Incoming trees. Matching-and-unchanged pairs get green connecting lines. Changed pairs get amber lines. Added/removed nodes get red highlights.
- **Share phase:** Unchanged nodes from the Previous tree animate downward into the Result tree (they literally move -- same object, same reference). Changed nodes from the Incoming tree animate into the Result tree (new objects). The animation shows that unchanged subtrees are *reused*, not *copied*.
- **Re-render indicators:** Below the Result tree, a row of small React component icons. Each component is linked to one or more tree nodes by dotted lines. Components linked to changed nodes flash with a "re-render" pulse. Components linked to unchanged nodes stay calm with a "skipped" badge.
- **The naive alternative:** A toggle: "Without Structural Sharing." In this mode, ALL nodes in the Result tree come from the Incoming data (all new references). ALL React components re-render. The contrast makes the optimization visible.

**Interaction:**
- Edit values in the Incoming Data tree to change what is different
- Toggle structural sharing on/off
- Click any node to see its reference identity and which React components depend on it
- A preset selector with scenarios: "1 of 100 items changed", "deeply nested object, leaf changed", "array reordered"

**Component API (rough):**
```tsx
<StructuralSharingDiff
  previousData={prevObject}
  incomingData={newObject}
  structuralSharingEnabled={true}
  preset="one-item-changed"
/>
```

**Why animation is essential:** The movement of nodes from Previous to Result is the entire lesson. Seeing unchanged nodes physically slide down (reused reference) while changed nodes arrive from the Incoming tree (new reference) makes "structural sharing" concrete. Without animation, this is a Venn diagram. With animation, it is an insight.

---

#### Widget 4.3: The Optimistic Update Rollback

**What it teaches:** The lifecycle of an optimistic update: the immediate cache mutation, the background server request, and the rollback path if the request fails. The reader should feel the "time travel" nature of rollback.

**Layout:** A vertical timeline in the center. On the left: a "UI State" column showing what the user sees (e.g., a Like button with a count). On the right: a "Cache State" column showing the TanStack Query cache contents. At the bottom: a "Server" panel showing the mutation request.

**Animation spec:**
- **Step 1: User action.** The reader clicks a Like button (heart icon, count: 41). The heart fills immediately. Count changes to 42. In the Cache State column, the cached value animates from `{ likes: 41 }` to `{ likes: 42 }`. A "snapshot" card appears below the cache labeled "Rollback snapshot: { likes: 41 }" -- this is the `onMutate` context. The timeline advances.
- **Step 2: Mutation in flight.** A request chip (labeled `POST /api/like`) travels from the cache column down to the Server panel. A spinner appears on the server. The UI and cache still show 42. The timeline advances.
- **Step 3a: Success path.** The server responds with a green checkmark. The request chip returns upward with `{ likes: 42 }`. The cache confirms. The rollback snapshot card fades out (no longer needed). The heart stays filled. A satisfying green pulse on the Like button.
- **Step 3b: Failure path.** The server responds with a red X and `"429 Too Many Requests"`. The request chip returns with an error badge. The cache value *rewinds*: 42 -> 41 (a reverse count animation, the number visually decrementing). The heart unfills. The rollback snapshot card highlights, glows, and its value (`{ likes: 41 }`) is applied to the cache. A red toast appears: "Like failed. Rolled back." The entire sequence has a "time rewinding" quality -- a subtle VHS-rewind visual effect on the UI panel: scanlines, slight desaturation during the rollback.
- **Timeline markers:** Each step is marked on the timeline with a timestamp. The reader can drag the timeline cursor to scrub between steps. Scrubbing backward through the failure path shows the rollback in reverse -- psychologically reinforcing the "undo" semantics.

**Interaction:**
- Click the Like button to start the sequence
- Choose "Success" or "Failure" as the server outcome (radio buttons on the server panel)
- Scrub the timeline to any point
- Adjust "server latency" (200ms to 3000ms) to see how long the optimistic state persists before confirmation/rollback
- A "rapid fire" mode: click Like 5 times quickly, see 5 mutations in flight, then fail the 3rd one -- what happens to mutations 4 and 5?

**Component API (rough):**
```tsx
<OptimisticRollback
  serverOutcome="success" | "failure"
  serverLatency={800}
  rapidFire={false}
  timelinePosition={0}  // 0 to 1
/>
```

**Why animation is essential:** Optimistic updates are a bet against the future. The user sees a state that might not be real. The rollback is a correction of that bet. The "time rewind" animation makes this viscerally clear -- the UI literally goes backward. Without animation, the rollback is just "the old value comes back." With animation, it is a narrative about certainty, speculation, and correction.

---

### Critical Questions for Post 4

- **Is TanStack Query really "streaming"?** This post stretches the streaming metaphor. Be upfront about it: TanStack Query streams *state through time*, not data through a pipe. The connection to Post 1's framework is the temporal dimension -- data that evolves through phases, not data that arrives all at once.
- **Structural sharing is an implementation detail.** Most TanStack Query users never think about it. The widget should justify why they SHOULD: because it is the mechanism that makes fine-grained reactivity possible without explicit selectors. Connect it to Post 2's "Zustand selectors" idea from the state management series (cross-reference).
- **Optimistic update rollback edge cases.** The "rapid fire" scenario (multiple mutations in flight, one fails) is genuinely complex. TanStack Query handles this by rolling back to the snapshot before the failed mutation, then replaying subsequent mutations. The widget should show this, but it might be too complex for the main flow -- consider it as an "advanced" toggle.
- **Are we teaching patterns or API?** The state machine widget should use TanStack Query's state names but explicitly map them to the general pattern: every cache with time-based invalidation has a similar state machine. The reader should be able to apply this mental model to SWR, Apollo Client, or a custom cache.

---

## Post 5: Synthesis -- The Streaming Decision Tree

### Thesis

Streaming is not a single technique -- it is a family of patterns. Choosing the right pattern depends on the data characteristics (size, frequency, structure), the UX requirements (time-to-first-byte, interruptibility, offline support), and the infrastructure constraints (serverless vs. long-running, edge vs. origin). This post provides the decision framework.

### Content Outline

**The streaming decision tree.** A flowchart that guides the reader from a description of their problem to a recommended pattern:
- Is the data generated progressively (LLM tokens, server rendering) or fetched as a whole (API calls)?
  - Progressive: Stream it. Go to "which streaming mechanism?"
  - Whole: Is freshness critical?
    - Yes: Stale-while-revalidate (TanStack Query pattern)
    - No: Simple fetch-and-cache
- Which streaming mechanism?
  - Is the client a browser? Use ReadableStream / SSE
  - Is it server-to-server? Use Node streams or async iterables
  - Need bidirectional? WebSocket
  - Need multiplexing? WebTransport
- Where do Suspense boundaries go?
  - At data dependency boundaries: each independent data fetch gets its own Suspense
  - At priority boundaries: above-the-fold content outside Suspense, below-the-fold inside
  - At interaction boundaries: interactive widgets inside, static content outside

**Pattern comparison matrix.** All three approaches (AI SDK streaming, RSC streaming, TanStack Query incremental state) compared across dimensions:
- Data shape: tokens vs. component tree vs. JSON
- Network protocol: SSE vs. chunked HTML vs. REST
- Buffering: ReadableStream vs. Suspense slots vs. query cache
- Error handling: stream abort vs. error boundary vs. mutation rollback
- Cancellation: AbortController vs. client navigation vs. query cancellation
- Composition: stream transforms vs. nested Suspense vs. dependent queries

**Composing patterns.** The real power is combining them. Example: a Next.js page that:
1. Uses RSC streaming for the page shell (header, nav, layout)
2. Has a Suspense boundary around a data-heavy section powered by TanStack Query (stale-while-revalidate for the initial data)
3. Contains an AI chat widget using the AI SDK for LLM streaming
4. All three streaming patterns running simultaneously on the same page

Walk through the data flow: RSC streams the page structure, Suspense boundaries reveal sections as TanStack Query hydrates their caches, the chat widget starts streaming LLM tokens when the user types.

**When NOT to stream.** Streaming adds complexity. For small payloads (<10KB), batch is simpler and effectively instant. For infrequently updated data, caching beats revalidation. For offline-first apps, streaming is unreliable -- prefer sync-on-reconnect. The decision tree must include "don't stream" as a valid leaf.

### Interactive Widgets

#### Widget 5.1: The Decision Tree Navigator

**What it teaches:** How to choose the right streaming pattern for a given scenario. The reader answers questions and arrives at a recommendation, but more importantly, they understand WHY each question matters.

**Layout:** A full-width interactive decision tree. Each decision node is a question card with 2-3 answer buttons. Selecting an answer animates the tree to reveal the next question. The path the reader has taken is highlighted. Dead-end branches are visible but dimmed.

**Animation spec:**
- **Node expansion:** When the reader selects an answer, the current question card shrinks slightly and shifts left/up. The next question card expands from the selected answer with `SPRING.gentle`. A connecting line draws between them (animated stroke-dashoffset).
- **Path highlighting:** The path from root to current node is highlighted with the accent color. Unchosen branches are visible but desaturated at 30% opacity.
- **Recommendation arrival:** When the reader reaches a leaf node, the recommendation card enters with a more dramatic animation: scale from 0.5 to 1.0 with `SPRING.snappy`, accompanied by a brief confetti of small dots (restrained, not celebratory -- more like "destination reached").
- **Backtracking:** The reader can click any previous question in their path to revisit it. The tree collapses forward from that point with a reverse animation, then re-expands with the new choice.
- **Scenario presets:** A row of labeled buttons at the top: "AI Chatbot", "Dashboard", "Social Feed", "E-commerce PDP", "Docs Site". Clicking one auto-navigates the tree along the recommended path for that scenario, with each question answering itself in sequence (staggered timing, `STAGGER.fast` between steps).

**Interaction:**
- Click answer buttons to navigate the tree
- Click path nodes to backtrack
- Click scenario presets for guided walkthroughs
- Hover any node to see a tooltip explaining why this question matters

**Component API (rough):**
```tsx
<DecisionTreeNavigator
  tree={decisionTreeData}  // nested question/answer/recommendation structure
  presets={[
    { name: "AI Chatbot", path: ["progressive", "browser", "sse", "ai-sdk"] },
    { name: "Dashboard", path: ["whole", "fresh-critical", "swr", "tanstack"] },
    // ...
  ]}
  activePath={currentPath}
  onNavigate={(path) => void}
/>
```

**Why animation is essential:** A static decision tree is a flowchart -- useful but flat. The animated version creates a journey. The reader does not see all paths at once (overwhelming); they discover one path at a time, with context. Backtracking is smooth rather than disorienting. The scenario presets create a "watch the expert navigate" experience.

---

#### Widget 5.2: The Composition Playground

**What it teaches:** How the three streaming patterns (AI SDK, RSC, TanStack Query) compose on a single page, each handling different responsibilities.

**Layout:** A page mockup at the top (a Next.js app with header, main content, sidebar, and a chat widget). Below the mockup: three horizontal swimlanes, one per streaming pattern (RSC, TanStack Query, AI SDK). Each swimlane is a timeline showing when that pattern is active and what it is doing.

**Animation spec:**
- **Page load sequence:** When the reader clicks "Load Page":
  1. RSC swimlane activates first. The page shell (header, nav, layout grid) appears in the mockup. The RSC timeline shows "shell streamed" as a green bar.
  2. Suspense boundaries are visible in the mockup as dashed rectangles. Three of them.
  3. TanStack Query swimlane activates. Two of the Suspense boundaries fill in: the sidebar (stale data from cache, instantly) and the main content (cache miss, shows loading then data). The TQ timeline shows "cache hit (stale)" and "fetch + render" bars.
  4. The third Suspense boundary is the chat widget. It appears but is idle (no LLM streaming yet).
  5. User types in the chat. AI SDK swimlane activates. Tokens stream into the chat bubble. The AI SDK timeline shows "streaming response" as an extending bar that grows in real-time.
- **Swimlane coordination:** Vertical dashed lines connect simultaneous events across swimlanes. When TanStack Query's background refetch completes, a vertical line connects the TQ timeline event to the main content area updating in the mockup. When the RSC stream completes, a vertical line from the RSC timeline to the header becoming interactive.
- **Layered highlighting:** The reader can hover any swimlane to dim the other two, isolating that pattern's contributions to the page. The mockup dims everything except the sections managed by the hovered pattern.

**Interaction:**
- "Load Page" button to start the sequence
- Hover swimlanes to isolate patterns
- Click any event on a timeline to freeze the animation at that moment and see the page state
- A "slow motion" toggle for the entire sequence
- Drag events on the timelines to simulate different scenarios: "What if the TanStack Query cache was empty?" (drag cache-hit to cache-miss), "What if the LLM was slower?" (stretch the AI SDK timeline bar)

**Component API (rough):**
```tsx
<CompositionPlayground
  pageStructure={mockPageLayout}
  patterns={[
    { name: "RSC", events: rscTimeline },
    { name: "TanStack Query", events: tqTimeline },
    { name: "AI SDK", events: aiTimeline },
  ]}
  playbackSpeed={1}
/>
```

**Why animation is essential:** Composition is about simultaneity -- three systems running concurrently, each with its own timing, interacting through shared UI. A static diagram can show the architecture but not the choreography. The swimlane animation reveals the temporal coordination: RSC finishes and TanStack Query starts, not because they are coupled, but because Suspense boundaries gate the transitions.

---

#### Widget 5.3: The Pattern Comparison Grid

**What it teaches:** A direct, interactive comparison of how each streaming pattern handles the Four Questions from Post 1 (backpressure, partial failure, cancellation, completion).

**Layout:** A 4x3 grid. Rows: the Four Questions (Backpressure, Partial Failure, Cancellation, Completion). Columns: the three patterns (AI SDK, RSC, TanStack Query). Each cell contains a miniature animation showing how that pattern handles that question.

**Animation spec:**
- Each cell is a self-contained micro-animation, looping continuously. Dimensions: roughly 200x150px each.
- **Backpressure row:**
  - AI SDK cell: a mini producer-buffer-consumer with the pull model. Chips flow, buffer stays low.
  - RSC cell: Suspense boundaries as flow gates. Data accumulates on the server until the client is ready to receive a new boundary's content.
  - TanStack Query cell: no backpressure concept -- a single request, single response. Cell shows "N/A -- batch request" with a subtle shrug animation (the pipe is just an arrow).
- **Partial Failure row:**
  - AI SDK cell: an error token appears in the stream. The stream terminates. Partial content is preserved in the UI.
  - RSC cell: an Error Boundary catches a failed Suspense slot. Other slots remain intact. The failed slot shows a fallback.
  - TanStack Query cell: mutation fails. Optimistic state rolls back (mini version of Widget 4.3).
- **Cancellation row:**
  - AI SDK cell: AbortController fires. A red signal propagates upstream, stream terminates.
  - RSC cell: client navigates away. In-flight RSC stream is abandoned. Server may or may not know.
  - TanStack Query cell: query is cancelled (component unmount). In-flight request is aborted via AbortController.
- **Completion row:**
  - AI SDK cell: final chunk with `finish_reason: "stop"`. Stream closes. UI gets a "done" indicator.
  - RSC cell: all Suspense boundaries resolved. No explicit "done" signal -- the page is incrementally complete.
  - TanStack Query cell: `status` transitions from `fetching` to `success`. `staleTime` countdown begins.
- **Cell interaction:** Clicking any cell expands it to full width with a detailed animation and annotated code showing the implementation. The other cells in the row dim.

**Interaction:**
- Click any cell to expand it
- Hover a row label to highlight the entire row
- Hover a column header to highlight the entire column
- A "play all" button that activates all 12 micro-animations simultaneously -- visual cacophony that makes the point: these patterns are diverse, not interchangeable

**Component API (rough):**
```tsx
<PatternComparisonGrid
  rows={["backpressure", "partial-failure", "cancellation", "completion"]}
  columns={["ai-sdk", "rsc", "tanstack-query"]}
  expandedCell={null | { row, column }}
  onCellClick={(row, column) => void}
/>
```

**Why animation is essential:** Comparison is the goal, and the micro-animations make simultaneous comparison possible. Seeing all three "cancellation" animations side by side -- AbortController signal, navigation abandonment, query cancellation -- reveals both the similarities (upstream signal) and differences (mechanism, reliability, cleanup) instantly. Static comparison tables list facts; animated comparison grids show behavior.

---

### Critical Questions for Post 5

- **Is the decision tree too prescriptive?** Real engineering decisions involve context the tree cannot capture. The tree should present trade-offs, not answers. Each leaf should be "consider X because..." not "use X."
- **Does the composition playground feel realistic?** The three-pattern page is deliberately synthetic. Acknowledge this -- most real pages use 1-2 of these patterns, not all three. The playground is for understanding composition, not recommending it.
- **The Four Questions callback:** Post 5's comparison grid should feel like a payoff of the framework established in Post 1. The reader who read the Four Questions widget in Post 1 should feel recognition and satisfaction when the grid maps those same questions across all three patterns.
- **Avoiding "just use Next.js" as the conclusion.** The synthesis should not be a framework recommendation. It should be a pattern vocabulary. The reader who uses Remix, or Astro, or a custom setup, should find the decision tree equally useful.

---

## Series-Wide Critical Questions

### The Time Problem

Streaming is inherently temporal, and our teaching medium (interactive widgets) runs in real time. This is our greatest advantage -- static blog posts cannot show streaming. But it creates design challenges:

- **Playback speed defaults matter enormously.** Too fast and the reader sees a blur. Too slow and they get bored and scroll past. Every widget needs a speed control, but the DEFAULT speed should be the one that maximizes insight. Propose: default to ~3x slower than reality, with a "real speed" preset clearly labeled.
- **Autoplay vs. manual.** Should widgets auto-animate when scrolled into view, or wait for the reader to click Play? Propose: auto-animate on first scroll-into-view, with pause/play controls always visible. This respects `usePrefersReducedMotion()` -- reduced motion users see the final state immediately with a "Play animation" button.
- **Time labels.** Every widget that involves timing should show elapsed time prominently. Not buried in a tooltip -- a primary visual element. The reader should always be able to answer "how long has this been going?"

### The "Fast Batch vs. True Streaming" Problem

On a fast network, batch responses return in <200ms. Streaming provides no perceptible benefit. Our widgets must honestly represent this:

- Include "fast network" presets that show streaming and batch looking identical
- Include "slow network" presets that show the dramatic difference
- Include "variable network" presets that show the resilience benefit of streaming (batch fails completely on timeout; streaming shows partial results)
- Never present streaming as universally better -- the series should build judgment, not advocacy

### The Reusability Problem

15 widgets across 5 posts. Several share visual primitives:

- **The producer-consumer-pipe** motif appears in Widget 1.2, 1.3, 2.2, and the comparison grid (5.3). Extract a shared `<StreamPipe>` primitive.
- **The timeline/Gantt view** appears in Widget 1.1, 3.1, and 5.2. Extract a shared `<TimelineRuler>` and `<TimelineBar>` primitive.
- **The state machine visualizer** appears in Widget 4.1 and could be reused for any FSM. Extract a shared `<StateMachine>` primitive.
- **The scrub/playback controls** (play, pause, speed slider, timeline cursor) appear in nearly every widget. Extract a shared `<PlaybackControls>` component.

This aligns with the project's ethos (from the FlowDiagram story): build composable primitives, not monolithic one-off widgets. The primitives developed for this series become part of the shared component library.

### The General vs. Specific Problem

Each post uses a specific library to teach a general pattern. The widgets must make the general pattern visible:

- Label pipeline stages with both library-specific names AND generic names (e.g., "SSE Parser" / "Deserializer")
- In Post 5, the comparison grid strips away library-specific details and shows the patterns side by side
- The decision tree in Post 5 should reference patterns, not libraries ("stale-while-revalidate" not "TanStack Query")
- Consider a "generic mode" toggle on each widget that replaces library-specific labels with pattern names

---

## Technical Notes

- All animations must use motion.ts presets (SPRING, TRANSITION, LOOP, STAGGER, DELAY). No inline timing values.
- All widgets must respect `usePrefersReducedMotion()`. Reduced motion fallback: show the final state with step-through arrows instead of continuous animation.
- Stream pipe / liquid / droplet animations: use framer-motion `motion.path` for bezier-curved movement, `useAnimationControls` for imperative play/pause.
- The Suspense Boundary Editor (Widget 3.1) requires a tree-manipulation UI. Consider react-arborist or a custom drag-and-drop tree built on dnd-kit.
- The Wire Format Decoder (Widget 3.2) should use actual RSC wire format from a pinned React version. Build a small Next.js app, capture the wire output, and use it as the widget's data source.
- The Token Stream Visualizer (Widget 2.1) should support plugging in real Vercel AI SDK responses (captured and replayed) for authenticity.
- Timeline scrubbing (Widgets 1.1, 4.3, 5.2) requires a seekable animation model. Consider `useTransform` from framer-motion to map a slider value (0-1) to animation progress, rather than time-based animation.
- Each widget should be lazy-loaded and wrapped in its own Suspense boundary (dogfooding Post 3's concepts).

---

## Sequence of Work

1. **Build shared primitives first:**
   - `<StreamPipe>` -- producer/buffer/consumer with configurable rates, backpressure, overflow
   - `<TimelineRuler>` -- scrubable timeline with cursor, bars, markers
   - `<PlaybackControls>` -- play/pause/speed/reset controls
   - `<StateMachineViz>` -- generic state machine renderer with animated transitions

2. **Post 1 widgets** -- these set the visual vocabulary for the series. Get the liquid/droplet metaphor right here. The Dashboard Race is the hook.

3. **Post 2 widgets** -- the Token Stream Visualizer is the most complex widget in the series. Build it with real AI SDK data. The Backpressure Buffer reuses `<StreamPipe>`.

4. **Post 3 widgets** -- the Suspense Boundary Editor requires the most UI engineering (drag-and-drop tree manipulation). The Wire Format Decoder requires sourcing real RSC payloads.

5. **Post 4 widgets** -- the Cache State Machine reuses `<StateMachineViz>`. The Structural Sharing Diff is a standalone tree-diff visualization. The Optimistic Rollback is narratively rich but technically straightforward.

6. **Post 5 widgets** -- these are synthesis widgets that reference concepts from all prior posts. Build last, after the vocabulary is established.

7. **Write prose last.** The widgets ARE the teaching. The prose is connective tissue between widgets, not the primary medium.

---

## Open Questions

- **Should Post 2 cover `useObject` / `experimental_useObject`?** The partial object streaming problem (streaming JSON that is valid at every prefix) is fascinating but may be too niche. It could be its own post.
- **Should there be a Post 0 ("Prerequisites") covering Web Streams API fundamentals?** ReadableStream, WritableStream, TransformStream, async iterables. This could be a standalone recipe rather than a full post.
- **Should we capture real network traces for the widgets?** Using `performance.now()` to capture actual token arrival times from a real AI SDK call, actual RSC wire format from a real Next.js page, actual TanStack Query lifecycle from a real app. Pro: authenticity. Con: brittle, version-dependent.
- **Is 5 posts too many?** The series could be tightened to 3: Problem, Patterns (AI SDK + RSC merged), Synthesis. But each pattern has enough depth for its own post, and the interactive widgets justify the length.
- **Cross-references with the state management series.** TanStack Query (Post 4) overlaps with the "React State Without the Re-renders" series. Should they share a widget or just link to each other?
