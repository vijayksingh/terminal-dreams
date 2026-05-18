# Section 9: Security & Auth -- Implementation Briefs

> 6 stops. Each brief is self-contained: an implementing agent should be able to
> build the component without asking any design questions.
>
> **Design tokens** live in `src/styles/tokens.css`.
> **Motion presets** live in `src/lib/motion.ts` (SPRING, TRANSITION, LOOP, DURATION, DELAY, STAGGER).
> **Convention**: CSS Modules for layout, Tailwind for internals, `var(--*)` for every color.
>
> **SANDBOXING MANDATE**: Every security demo MUST be safe. No actual script
> execution, no real cookie manipulation on the host page, no real form
> submissions. All "attacks" are visual simulations using mock alert dialogs
> (styled divs, not `window.alert`), red glow/pulse effects for
> "vulnerability found", green shield effects for "defense successful",
> sandboxed iframes with `sandbox` attribute (no `allow-scripts`), and pattern
> matching on known payloads -- never `eval()`.

---

## sec-xss -- XSS Challenge Chain (Attack/Defend)
**Format**: challenge-chain | **Effort**: large

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (challenge selector visible, progress bar at 0/6)
                          +-----+-----+
                                |
                     [challenge loaded (auto or click)]
                                |
                    +-----------v-----------+
                    |   challenge-active    |  (vulnerable code snippet shown, input field focused)
                    +-----------+-----------+
                                |
                     [reader types/pastes payload in input]
                                |
                    +-----------v-----------+
                    |   payload-entered     |  (input has content, "Launch Attack" button enabled)
                    +-----------+-----------+
                                |
                     [click "Launch Attack"]
                                |
                    +-----------v-----------+
                    |    attack-phase       |  (payload visually "injected" into preview)
                    +-----------+-----------+
                           /          \
                   [payload matches    [payload does not match
                    known pattern]      any known pattern]
                       /                    \
          +-----------v------+    +----------v-----------+
          |  attack-success  |    |   attack-miss        |
          |  (red glow,      |    |   (yellow "close!"   |
          |   mock alert,    |    |    or "try another    |
          |   vulnerability  |    |    approach" hint)    |
          |   explanation)   |    +----------+-----------+
          +--------+---------+               |
                   |                [reader modifies payload]
                   |                         |
                   |              [returns to payload-entered]
                   |
          [click "Now Defend!" button]
                   |
          +--------v---------+
          |  defend-phase    |  (defense options panel appears:
          |                  |   radio/checkbox for defense strategy)
          +--------+---------+
                   |
          [reader selects defense + clicks "Apply Defense"]
                   |
              /          \
      [correct           [wrong
       defense]           defense]
          /                    \
+--------v-------+    +--------v--------+
| defend-success |    |  defend-fail    |
| (green shield, |    |  (attack still  |
|  "Secured!"    |    |   succeeds,     |
|  explanation)  |    |   hint shown)   |
+--------+-------+    +--------+--------+
         |                     |
         |            [reader picks again]
         |            [returns to defend-phase]
         |
  [click "Next Challenge" or auto-advance after 2s]
         |
+--------v---------+
| next-challenge   |  (progress bar increments, next challenge loads)
+--------+---------+
         |
  [if challenge 6 complete]
         |
+--------v---------+
|    completed     |  (all 6 shields lit, summary card with all attacks + defenses)
+------------------+
```

**Data driving each state:**
- `idle`: `currentChallenge: 0`, `completedChallenges: []`, `phase: 'idle'`
- `challenge-active`: `phase: 'attack'`, `payload: ''`, `vulnerableCode` and `description` loaded for current challenge
- `payload-entered`: `payload: string` (non-empty), attack button enabled
- `attack-phase`: `isAnimating: true`, payload visually injected into preview area
- `attack-success`: `attackResult: 'success'`, matched pattern stored, explanation text shown
- `attack-miss`: `attackResult: 'miss'`, hint index incremented (3 progressive hints per challenge)
- `defend-phase`: `phase: 'defend'`, `selectedDefense: null`, defense options rendered
- `defend-success`: `defenseResult: 'success'`, challenge marked complete
- `defend-fail`: `defenseResult: 'fail'`, hint for correct defense shown
- `next-challenge`: `currentChallenge` increments, resets to `challenge-active`
- `completed`: `completedChallenges.length === 6`

### Visual Choreography

**Static layout:**
- Container: full width of content column, `max-width: 800px`, centered. Background: `var(--color-surface)`, border: 1px solid `var(--color-border)`, border-radius: `var(--radius-3)`.
- **Progress bar** at top: 100% width, 4px tall, `var(--color-border)` background. Fill: `var(--color-accent)`, width proportional to `completedChallenges.length / 6`. Six shield icons (16x16px SVG) spaced evenly above the bar, one per challenge. Incomplete: `var(--color-border)` stroke, no fill. Complete: `var(--color-success)` fill with checkmark.
- **Challenge card**: below progress bar. Two zones stacked vertically:
  - **Top zone -- Vulnerable Code**: `var(--color-surface-2)` background, `var(--radius-2)` border-radius, `var(--space-3)` padding. Contains:
    - Challenge number + title: `var(--font-mono)` `var(--text-sm)` bold. E.g., "Challenge 1/6: Reflected XSS".
    - Description: 1-2 sentences in `var(--text-sm)` `var(--color-muted)`. E.g., "This search page reflects the query parameter directly into the HTML. Craft a payload that executes."
    - Code snippet: monospaced block showing the vulnerable code. Key vulnerable line highlighted with `var(--color-error)` left-border (3px solid). E.g., `<p>Search results for: ${req.query.q}</p>` with the interpolation highlighted.
  - **Bottom zone -- Interaction Area**: `var(--space-4)` padding. Contains:
    - **Attack phase**: text input (full width, `var(--font-mono)` `var(--text-sm)`, `var(--color-surface-2)` bg, 1px `var(--color-border)` border, `var(--radius-2)`, 44px height). Placeholder: "Type your XSS payload..." A "Launch Attack" button right-aligned below: 140x40px, `var(--color-error)` background when enabled, `var(--color-muted)` when disabled, `var(--font-mono)` `var(--text-sm)` white text.
    - **Preview area**: 100% width, min-height 120px, `var(--color-bg)` background, 1px solid `var(--color-border)`, `var(--radius-2)`. Label above: "Page Preview" in `var(--text-xs)` `var(--color-muted)`. This renders the "result" of the payload injection -- but NEVER executes it. The payload string is rendered as styled text, with dangerous parts highlighted.
    - **Defense phase** (replaces attack input): 2-4 radio buttons with defense options. Each option: label in `var(--font-mono)` `var(--text-sm)`, description in `var(--text-xs)` `var(--color-muted)`. "Apply Defense" button: 140x40px, `var(--color-success)` background when a defense is selected.

**Animations per challenge phase:**

1. **Attack injection** (click "Launch Attack"):
   - Payload text in the input field lifts out (scale 1.0 to 0.95, opacity 1.0 to 0.5, 200ms) and "travels" to the preview area. Implementation: a cloned text element positioned absolutely, animates from input rect to preview rect over 400ms with `SPRING.snappy`. On arrival, the clone fades out and the payload appears inline in the preview area.
   - If payload matches a known attack pattern:
     - Preview area border: transitions from `var(--color-border)` to `var(--color-error)` over 200ms.
     - Red glow pulse: `box-shadow: 0 0 12px var(--diagram-layer-8)` (hue 0, red), pulses with `LOOP.glow` (1s cycle). Three pulses, then steady glow.
     - **Mock alert dialog**: A 240x120px div, centered over the preview area, slides down from -40px to 0px over 300ms with `SPRING.gentle`. White background (`var(--color-text)`), `var(--radius-2)` border-radius, `var(--shadow-2)`. Content: warning icon (triangle, 24px, `var(--color-error)`), bold text "XSS Executed!" in `var(--text-base)`, the matched payload pattern in `var(--font-mono)` `var(--text-xs)` `var(--color-muted)`, and a single "OK" button (80x32px, `var(--color-error)` bg). This is a STYLED DIV -- not `window.alert()`.
     - Vulnerable code line in the top zone: background flashes `var(--color-error-muted)` twice (200ms on, 200ms off).
   - If payload does NOT match:
     - Preview area shows the payload as literal text (no glow, no mock alert).
     - A hint badge slides in from the right: `var(--diagram-layer-3)` (yellow) background, `var(--text-xs)`, text depends on proximity to a valid payload. Generic: "Interesting attempt! Think about what the browser treats as executable..." Progressive hints after 2nd and 3rd miss.

2. **Defense application** (click "Apply Defense"):
   - The attack from the previous phase replays automatically in the preview area.
   - If defense is correct:
     - The payload renders as HARMLESS TEXT in the preview (e.g., `&lt;script&gt;` instead of a script tag). The dangerous characters are visually replaced with their encoded equivalents, each replacement highlighted with a brief green flash (background `var(--color-success-muted)`, 300ms).
     - A green shield icon (32x32px SVG) scales up from 0 to 1.0 at center of preview, `SPRING.gentle`. Text below shield: "Secured!" in `var(--color-success)` `var(--font-mono)` `var(--text-sm)`.
     - Mock alert dialog does NOT appear. Preview border: `var(--color-success)`.
   - If defense is wrong:
     - The attack succeeds again -- same red glow, same mock alert. But now with an additional line in the mock alert: "Defense '{selectedDefense}' didn't prevent this attack" in `var(--text-xs)`.
     - A hint appears below the defense options: "This attack exploits {mechanism}. Which defense addresses {mechanism}?" in `var(--color-muted)` `var(--text-xs)`.

3. **Challenge transition** (after defend-success):
   - Current challenge card slides left and fades out (translateX 0 to -40px, opacity 1 to 0, 300ms `TRANSITION.enterCard`).
   - Shield icon in progress bar fills green with a brief scale pulse (1.0 to 1.2 to 1.0, `SPRING.quick`).
   - New challenge card slides in from right (translateX 40px to 0, opacity 0 to 1, 300ms `TRANSITION.enterCard`).

4. **Completion state**:
   - All 6 shield icons in progress bar glow simultaneously with `LOOP.breathe`.
   - Summary card fades in: 6 rows, each showing challenge name, the successful attack payload, and the defense used. Attack in `var(--color-error)` monospace, defense in `var(--color-success)` monospace.

**Reduced motion**: Payload "travel" is instant (appears in preview immediately). Mock alert appears without slide. Shield scale pulse is instant. Challenge transitions are instant opacity swap. Glow effects are static (no pulse -- just steady border color).

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees "Challenge 1/6: Reflected XSS" with 6 empty shield icons in the progress bar. The vulnerable code snippet shows a search page: `<p>Search results for: ${req.query.q}</p>` with the interpolation highlighted in red. Description: "This search page reflects the query parameter directly into the HTML. Craft a payload that executes." The text input is focused with placeholder: "Type your XSS payload..."
2. **Reader types `<script>alert(1)</script>` in the input**: As they type, the preview area shows a live "safe render" of what the page would look like -- the text appears but nothing executes. The "Launch Attack" button becomes enabled (transitions from muted to red).
3. **Reader clicks "Launch Attack"**: The typed payload lifts from the input and travels to the preview area. The preview border turns red with a pulsing glow. The mock alert dialog slides down: "XSS Executed!" with the payload shown. The vulnerable code line in the top zone flashes red. Reader clicks "OK" to dismiss the mock alert.
4. **Below the preview, a "Now Defend!" button has appeared**: `var(--color-accent)` background, pulsing gently. Reader clicks it.
5. **Defense options appear** (replacing the attack input): four radio buttons:
   - "HTML entity encoding" (correct)
   - "URL encoding"
   - "Base64 encoding"
   - "Input length limit"
   Reader selects "HTML entity encoding" and clicks "Apply Defense."
6. **The attack replays**: but this time the payload renders as `&lt;script&gt;alert(1)&lt;/script&gt;` -- literal text, not code. Each `<` and `>` replacement flashes green. The green shield icon scales up. "Secured!" text appears. No mock alert. The first shield in the progress bar fills green.
7. **Challenge 2 slides in**: "Stored XSS" -- a comment form that stores input in a database and displays it to other users. The difficulty escalates.

### Data & State Shape

```typescript
type ChallengePhase = 'attack' | 'defend';
type AttackResult = 'success' | 'miss' | null;
type DefenseResult = 'success' | 'fail' | null;

interface AttackPattern {
  /** Regex that matches this category of attack */
  pattern: RegExp;
  /** Category name for feedback */
  category: string;
  /** What the mock alert should say */
  alertText: string;
  /** How the payload renders in "executed" state */
  executedRender: string;
}

interface DefenseOption {
  id: string;
  label: string;
  description: string;
  isCorrect: boolean;
}

interface XSSChallenge {
  id: number;
  title: string;                          // "Reflected XSS", "Stored XSS", etc.
  description: string;                    // 1-2 sentence setup
  vulnerableCode: string;                 // code snippet to display
  vulnerableLine: number;                 // which line is highlighted red
  attackPatterns: AttackPattern[];        // ~20 known patterns per challenge
  hints: [string, string, string];        // 3 progressive hints for attack phase
  defenseOptions: DefenseOption[];        // 3-4 options, exactly one correct
  defenseHint: string;                    // hint for wrong defense selection
  defenseExplanation: string;             // shown on successful defense
  /** How the payload looks AFTER the correct defense is applied */
  defendedRender: (payload: string) => string;
}

interface XSSChallengeState {
  // Challenge progression
  currentChallenge: number;              // 0-5
  completedChallenges: number[];         // indices of completed challenges
  phase: ChallengePhase;

  // Attack state
  payload: string;                       // current input value
  attackResult: AttackResult;
  matchedPattern: AttackPattern | null;
  attackHintIndex: number;               // 0-2, increments on miss

  // Defense state
  selectedDefense: string | null;        // DefenseOption.id
  defenseResult: DefenseResult;

  // Animation
  isAnimating: boolean;                  // true during payload travel, glow, etc.
  showMockAlert: boolean;                // true when mock alert is visible
}

// Challenge definitions (static data):
const CHALLENGES: XSSChallenge[] = [
  {
    id: 0,
    title: "Reflected XSS",
    vulnerableCode: `app.get('/search', (req, res) => {
  res.send(\`<p>Results for: \${req.query.q}</p>\`);
});`,
    vulnerableLine: 1,
    attackPatterns: [
      { pattern: /<script[^>]*>.*<\/script>/i, category: "script injection", alertText: "XSS Executed!", executedRender: "..." },
      { pattern: /<img[^>]+onerror\s*=/i, category: "img onerror", alertText: "XSS via image error!", executedRender: "..." },
      { pattern: /<svg[^>]+onload\s*=/i, category: "svg onload", alertText: "XSS via SVG!", executedRender: "..." },
      // ~17 more patterns
    ],
    hints: [
      "What HTML tags can execute JavaScript?",
      "Try injecting a <script> tag...",
      "The classic: <script>alert(1)</script>",
    ],
    defenseOptions: [
      { id: "html-encode", label: "HTML entity encoding", description: "Convert < > \" ' & to HTML entities", isCorrect: true },
      { id: "url-encode", label: "URL encoding", description: "Percent-encode special characters", isCorrect: false },
      { id: "base64", label: "Base64 encoding", description: "Encode the entire output in Base64", isCorrect: false },
      { id: "length-limit", label: "Input length limit (50 chars)", description: "Reject inputs longer than 50 characters", isCorrect: false },
    ],
    defenseHint: "The attack works because < and > are interpreted as HTML. Which defense converts those characters to display-safe equivalents?",
    defenseExplanation: "HTML entity encoding converts < to &lt; and > to &gt;. The browser renders them as text, not as HTML tags. This is the primary defense against reflected XSS.",
    defendedRender: (p) => p.replace(/</g, "&lt;").replace(/>/g, "&gt;"),
  },
  // challenges 1-5: stored XSS, DOM XSS (innerHTML), attribute injection,
  // event handler injection, mutation XSS
];
```

### Primitives & Props

**ChallengeRunner** -- Wraps the entire challenge chain. Provides progress bar, sequential unlock, challenge transitions.
```tsx
<ChallengeRunner
  challenges={CHALLENGES}
  renderChallenge={(challenge, phase, onComplete) => (
    <XSSChallengeCard challenge={challenge} phase={phase} onComplete={onComplete} />
  )}
  onAllComplete={() => { /* show summary */ }}
/>
```

**DemoSandbox** -- Outer container.
```tsx
<DemoSandbox title="XSS Challenge Chain">
  <ChallengeRunner ... />
</DemoSandbox>
```

**StatusDot** -- Used in progress bar for challenge completion status.
```tsx
<StatusDot status={completed ? "success" : "error"} />
```

**New bespoke subcomponents (not reusable):**
- `XSSChallengeCard` -- single challenge with attack input, preview, and defense options
- `MockAlertDialog` -- 240x120px styled div that mimics a browser alert (NOT `window.alert`)
- `VulnerableCodeBlock` -- monospaced code display with highlighted vulnerable line
- `PayloadPreview` -- the "page preview" area that renders payloads safely as styled text
- `DefenseSelector` -- radio button group for defense options with hint display
- `ChallengeProgressBar` -- 6 shield icons + fill bar showing completion

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Reader enters an unrecognized payload** | Pattern matching checks ~20 known patterns per challenge. If no match: show "Interesting attempt!" with a category-aware hint. If the payload contains ANY HTML tag (regex `/<[a-z]/i`), show "You're on the right track -- that's an HTML tag, but this particular one won't execute JavaScript here." If the payload is plain text, show "XSS requires injecting code the browser will execute. What HTML elements run JavaScript?" |
| **Reader copy-pastes a payload** | Works identically to typing. The `onChange` handler on the input captures paste events. The "Launch Attack" button enables as soon as input is non-empty. No debounce needed -- the attack only fires on button click. |
| **Reader types extremely long payload (> 500 chars)** | Input has `maxLength={500}`. A character counter appears at 400+ chars: "478/500" in `var(--color-muted)` `var(--text-xs)`. Truncation is silent -- no error message. 500 chars is sufficient for any realistic XSS payload. |
| **Reader tries to skip ahead (clicks later challenge in progress bar)** | Challenges are locked until the previous one is completed. Locked shields have `cursor: not-allowed` and `opacity: 0.3`. Click on a locked shield shows a tooltip: "Complete challenge N first." |
| **Reader selects wrong defense multiple times** | Each wrong selection shows the attack replay + a progressively more specific hint. After 3 wrong attempts, the correct answer highlights with a green border and a label: "This is the right defense -- click to see why." The reader must still click to learn. |
| **Mobile (< 640px)** | Code snippet font-size drops to `var(--text-xs)`. Preview area min-height reduces to 80px. Mock alert dialog scales to 200x100px. Defense radio buttons stack vertically with 12px gap. |
| **Reduced motion** | Payload "travel" animation skipped -- payload appears instantly in preview. Mock alert appears without slide-in. Glow effects are static red border (no pulse). Shield fill is instant (no scale animation). |
| **Screen reader announcing "attack successful"** | Mock alert has `role="alertdialog"`, `aria-label="Simulated XSS attack result"`. The word "Simulated" is prepended to all attack feedback for screen readers (visually hidden with `sr-only` class on the "Simulated" prefix). Defense success: `aria-live="polite"` region announces "Defense applied successfully. Challenge complete." |
| **Keyboard navigation** | Tab order: code block (focusable for reading, `tabIndex={0}`) -> input field -> Launch Attack button -> defense radio buttons -> Apply Defense button -> Next Challenge button. Enter key submits the current phase (attack or defense). Escape dismisses the mock alert. |

### Cross-Lesson Connections

- **Directly feeds sec-csp**: The XSS attacks crafted here (especially challenges 5 and 6: event handler injection and mutation XSS) are exactly what CSP defends against. Challenge 5 explicitly names CSP as part of the defense. After completing sec-xss, readers should immediately understand WHY CSP's `script-src` directive matters -- they just exploited the gap it fills.
- **Feeds sec-cookies**: Challenge 1 (reflected XSS) and challenge 2 (stored XSS) are the attacks that steal cookies. The reader will understand why HttpOnly matters when they reach sec-cookies -- they just used `document.cookie` conceptually in their attack payloads.
- **Feeds sec-csrf indirectly**: XSS can be used to bypass CSRF tokens (if the attacker can inject JS, they can read the token from the DOM). This connection is noted in the summary card but not deeply explored here.

---

## sec-csrf -- CSRF Scrollytelling
**Format**: scrollytelling | **Effort**: medium

### Interaction State Machine

```
                          +-----------+
                          |  step-0   |  (three actor boxes visible, no activity)
                          +-----+-----+
                                |
                     [scroll enters step 1 viewport]
                                |
                          +-----v-----+
                          |   login   |  (User -> Bank arrow, cookie icon appears on User)
                          +-----+-----+
                                |
                     [scroll enters step 2 viewport]
                                |
                        +-------v-------+
                        |  visit-evil   |  (Evil Site box appears, User connects to it)
                        +-------+-------+
                                |
                     [scroll enters step 3 viewport]
                                |
                        +-------v-------+
                        |  form-submit  |  (hidden form fires from Evil Site to Bank,
                        |               |   cookie auto-attaches to the request)
                        +-------+-------+
                                |
                     [scroll enters step 4 viewport]
                                |
                    +-----------v-----------+
                    |  money-transferred    |  (Bank processes transfer, red warning)
                    +-----------+-----------+
                                |
                     [scroll enters step 5 viewport]
                                |
                    +-----------v-----------+
                    |   defense-token       |  (CSRF token defense, arrow blocked)
                    +-----------+-----------+
                                |
                     [scroll enters step 6 viewport]
                                |
                    +-----------v-----------+
                    |  defense-samesite     |  (SameSite defense, cookie not sent)
                    +-----------+-----------+
                                |
                     [scroll passes step 6 -- interactive zone]
                                |
                    +-----------v-----------+
                    | interactive-toggle    |  (reader toggles defenses on/off,
                    |                       |   watches attack succeed or get blocked)
                    +-----------+-----------+
```

**Data driving each state:**
- `step-0`: `activeStepIndex: -1`, three actor boxes visible but dim, no arrows or cookies
- `login`: `activeStepIndex: 0`, login arrow animates, cookie icon appears on User box
- `visit-evil`: `activeStepIndex: 1`, Evil Site box brightens, connection arrow from User
- `form-submit`: `activeStepIndex: 2`, hidden form arrow from Evil Site through User to Bank, cookie packet attached
- `money-transferred`: `activeStepIndex: 3`, Bank shows transfer processed, red flash
- `defense-token`: `activeStepIndex: 4`, CSRF token arrow blocked, red X on Evil Site's request
- `defense-samesite`: `activeStepIndex: 5`, SameSite badge on cookie, cookie not sent on cross-site request
- `interactive-toggle`: `activeStepIndex: 6`, defense toggles rendered, `defenses: { csrfToken: boolean, sameSite: boolean, originCheck: boolean }`

### Visual Choreography

**Static layout:**
- Container: `max-width: 800px`, centered. ScrollytellingShell: sticky visual (60% left), scroll narrative (40% right).
- Sticky visual: three actor boxes arranged in a triangle layout:
  - **User** (top-left): 120x80px, `var(--color-surface-2)` background, 2px solid `var(--diagram-layer-0)` (blue) border, `var(--radius-2)`. Interior: laptop icon (32x32px SVG, simple laptop outline in `var(--diagram-layer-0)`). Label below icon: "You" in `var(--font-mono)` `var(--text-sm)`. Cookie slot: empty circle (20px diameter, dashed `var(--color-border)` border) below the laptop, labeled "cookies" in `var(--text-xs)` `var(--color-muted)`.
  - **Bank** (top-right): 120x80px, `var(--color-surface-2)` background, 2px solid `var(--diagram-layer-1)` (green) border, `var(--radius-2)`. Interior: server rack icon (32x32px SVG, `var(--diagram-layer-1)` stroke). Label: "bank.com" in `var(--font-mono)` `var(--text-sm)`.
  - **Evil Site** (bottom-center): 120x80px, initially `opacity: 0.15`. `var(--color-surface-2)` background, 2px solid `var(--diagram-layer-8)` (red, hue 0) border, `var(--radius-2)`. Interior: skull-and-crossbones icon (32x32px SVG, `var(--diagram-layer-8)` stroke). Label: "evil.com" in `var(--font-mono)` `var(--text-sm)` `var(--diagram-layer-8)`.
- Arrow paths: SVG paths drawn between box centers. Each arrow is a labeled packet that physically travels the path.

**Animations per scroll step:**

1. **Login** (step index 0):
   - Arrow from User to Bank: dashed line draws from left to right over 600ms. Arrow color: `var(--diagram-layer-0)` (blue). A packet label "POST /login" in `var(--text-xs)` `var(--font-mono)` rides the arrow.
   - Bank responds: reverse arrow (dashed, green) from Bank to User over 400ms. Label: "200 OK + Set-Cookie: session=abc123".
   - Cookie appears: the empty circle on the User box fills with `var(--diagram-layer-3)` (yellow, hue 60) over 300ms with `SPRING.gentle`. A small cookie icon (16px, `var(--diagram-layer-3)`) fades in. Label below: "session=abc123" in `var(--text-xs)` `var(--font-mono)` `var(--color-muted)`.

2. **Visit evil site** (step index 1):
   - Evil Site box: opacity 0.15 to 1.0 over 400ms. Border pulses red once (`var(--diagram-layer-8)`, `LOOP.glow` single iteration).
   - Arrow from User to Evil Site: dashed line draws downward, `var(--color-muted)`. Label: "GET evil.com" in `var(--text-xs)`.
   - A small "Tab 2" indicator appears on the User box: tiny tab icon (8x16px) at top-right, `var(--color-muted)`.

3. **Hidden form fires** (step index 2):
   - On the Evil Site box, a form outline fades in (40x24px, dashed red border). Label: "hidden form" in `var(--text-xs)` `var(--diagram-layer-8)`.
   - Arrow from Evil Site, routing THROUGH User (cookie pickup) to Bank. This is a two-segment arrow:
     - Segment 1: Evil Site to User box (red dashed line, 300ms). At User box, the cookie icon briefly glows (scale 1.0 to 1.3 to 1.0, 200ms, `SPRING.quick`).
     - Segment 2: User to Bank (red dashed line with cookie icon attached to the arrowhead, 400ms). Label on arrow: "POST /transfer?to=evil&amount=10000". The cookie icon (8px, `var(--diagram-layer-3)`) rides alongside the arrow label.
   - Key visual: the cookie AUTOMATICALLY attaches. No user action between Evil Site sending the form and the cookie being included.

4. **Money transferred** (step index 3):
   - Bank box: background flashes `var(--color-error-muted)` twice (200ms on, 200ms off, 200ms on).
   - A receipt icon appears inside Bank box (16px, `var(--diagram-layer-8)`). Label: "Transfer: $10,000 to evil" in `var(--text-xs)` `var(--color-error)`.
   - Below the Bank box, text appears: "Valid cookie = valid request" in `var(--font-mono)` `var(--text-xs)` `var(--color-error)`.
   - Full-width overlay text below the three boxes (centered, `var(--text-sm)` `var(--color-error)` bold): "The bank can't tell the difference between a legitimate request and a forged one."

5. **CSRF token defense** (step index 4):
   - The attack arrow replays from step 2-3, but now:
     - Bank box gains a token badge: small shield icon with "Token" label, `var(--color-success)`, positioned inside the box.
     - The arrow from Evil Site arrives at Bank. A shield icon (24px, `var(--color-success)`) appears at the Bank box boundary. The arrow hits the shield and bounces back: the arrowhead reverses direction, traveling 40px back and fading out over 300ms. A red "X" (16px, `var(--color-error)`) appears at the impact point.
     - Label at shield: "Missing CSRF token" in `var(--text-xs)` `var(--color-error)`.
   - Below, text: "Evil site can't include the token -- same-origin policy blocks reading it" in `var(--text-xs)` `var(--color-muted)`.

6. **SameSite defense** (step index 5):
   - Cookie on User box gains a badge: small tag labeled "SameSite" in `var(--text-xs)` `var(--color-success)`, attached to the cookie circle.
   - The attack arrow replays from Evil Site toward User. But this time, at the User box, the cookie does NOT glow and does NOT attach to the arrow. Instead, a small lock icon (12px) appears over the cookie. The arrow continues to Bank WITHOUT the cookie.
   - At Bank, the cookieless request is rejected: "No session cookie" label in `var(--text-xs)` `var(--color-error)`. Red X.
   - Label: "Browser refuses to send cookies on cross-site requests" in `var(--text-xs)` `var(--color-muted)`.

7. **Interactive toggle zone** (step index 6):
   - Below the diagram, a control panel fades in: three `DialToggle` switches:
     - "CSRF Token" (default: on)
     - "SameSite=Strict" (default: on)
     - "Origin Check" (default: on)
   - A "Replay Attack" button: 120x40px, `var(--diagram-layer-8)` background, white text.
   - Reader toggles defenses off and clicks "Replay Attack" to watch the attack succeed or fail. Each defense blocks at a different point:
     - CSRF Token: blocks at Bank (missing token).
     - SameSite: blocks at User (cookie not sent).
     - Origin Check: blocks at Bank (wrong origin header).
   - With all defenses off: full attack succeeds (money transferred, red flash).
   - With any single defense on: attack blocked at that defense's checkpoint.

**Reduced motion**: All arrows appear instantly at full extent (no travel animation). Packet labels appear at midpoint of arrow. Cookie fill is instant. Bounce-back on blocked arrows is instant (arrow simply doesn't appear, red X appears at endpoint). Toggle state changes reflected instantly.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees three boxes: "You" (blue border, laptop icon), "bank.com" (green border, server icon), and a dimmed "evil.com" (faint red border, skull icon). The cookie slot on the User box is empty. Scroll narrative reads: "You log into your bank. The server sets a session cookie."
2. **Reader scrolls to step 1**: Login arrow travels from User to Bank. Bank responds with Set-Cookie. The cookie circle on the User box fills yellow. Label: "session=abc123". Narrative: "This cookie will be sent with every request to bank.com -- the browser does this automatically."
3. **Reader scrolls to step 2**: Evil Site box brightens to full opacity with a red border pulse. Arrow from User to Evil Site. A "Tab 2" indicator appears on User. Narrative: "You visit a seemingly harmless website in another tab. Meanwhile, your bank cookie is still active."
4. **Reader scrolls to step 3**: Hidden form outline appears on Evil Site. The two-segment arrow fires: Evil Site to User (cookie glows and attaches), then User to Bank with the cookie riding along. The label reads "POST /transfer?to=evil&amount=10000". Narrative: "Evil site's hidden form submits a transfer request TO your bank. The browser helpfully attaches your session cookie."
5. **Reader scrolls to step 4**: Bank flashes red. Transfer receipt appears. The text "The bank can't tell the difference" appears in red below. This is the gut-punch moment. Narrative: "The bank sees a valid session cookie and processes the transfer."
6. **Reader scrolls to steps 5-6**: Defenses appear one at a time. CSRF token blocks the request at Bank (shield + bounce). SameSite prevents the cookie from leaving User. Then the toggle panel appears for experimentation.

### Data & State Shape

```typescript
type CSRFDefense = 'csrfToken' | 'sameSite' | 'originCheck';

interface CSRFActor {
  id: 'user' | 'bank' | 'evil';
  label: string;
  icon: 'laptop' | 'server' | 'skull';
  borderColor: string;                    // CSS variable
  position: { x: number; y: number };     // relative to container
}

interface CSRFArrow {
  id: string;
  from: CSRFActor['id'];
  to: CSRFActor['id'];
  label: string;
  color: string;
  carriesCookie: boolean;
  blockedBy: CSRFDefense | null;          // which defense blocks this arrow
  delayMs: number;
  durationMs: number;
}

interface CSRFScrollyState {
  // Scroll-driven
  activeStepIndex: number;                // -1 to 6

  // Cookie state
  cookieSet: boolean;                     // true after login step
  cookieValue: string;                    // "session=abc123"

  // Interactive toggle (step 6)
  defenses: Record<CSRFDefense, boolean>;
  isReplaying: boolean;                   // true during "Replay Attack" animation
  replayResult: 'success' | 'blocked-token' | 'blocked-samesite' | 'blocked-origin' | null;

  // Animation
  activeArrows: CSRFArrow[];              // arrows currently animating
  blockedAt: CSRFActor['id'] | null;      // where the block shield appears
}

// Derived:
// - anyDefenseActive: Object.values(defenses).some(Boolean)
// - firstActiveDefense: the first enabled defense in priority order
//   (sameSite blocks earliest -- at User; csrfToken and originCheck block at Bank)
// - evilSiteVisible: activeStepIndex >= 1
```

### Primitives & Props

**ScrollytellingShell** -- Wraps the entire lesson. Provides two-column layout with sticky visual and scrollable narrative.
```tsx
<ScrollytellingShell
  steps={scrollSteps}             // 7 ScrollStep objects (6 narrative + 1 interactive)
  renderVisual={(stepIndex) => <CSRFDiagram activeStep={stepIndex} />}
/>
```

**DemoSandbox** -- Outer container for the sticky visual area.
```tsx
<DemoSandbox>
  <CSRFDiagram activeStep={stepIndex} defenses={defenses} />
</DemoSandbox>
```

**DialToggle** -- Toggle switches for the three defense options.
```tsx
<DialToggle label="CSRF Token" value={defenses.csrfToken} onChange={(v) => setDefense('csrfToken', v)} />
<DialToggle label="SameSite" value={defenses.sameSite} onChange={(v) => setDefense('sameSite', v)} />
<DialToggle label="Origin Check" value={defenses.originCheck} onChange={(v) => setDefense('originCheck', v)} />
```

**New bespoke subcomponents (not reusable):**
- `CSRFDiagram` -- the three-actor box layout with arrow routing between them
- `ActorBox` -- single actor (User/Bank/Evil) with icon, label, and optional cookie slot
- `PacketArrow` -- animated SVG arrow that travels between two actor boxes with a label
- `ShieldBlock` -- the defense shield that appears at an actor boundary and bounces arrows back
- `CookieIcon` -- small yellow circle with "cookie" styling, can glow and attach to arrows
- `DefenseControlPanel` -- the toggle panel + replay button for interactive step

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Fast scrolling past all steps** | Each step's arrows appear instantly (skip travel animation). Cookie fills instantly. Evil site appears at full opacity. The visual accumulates correctly -- no step is skipped from the state machine. Only animation duration is shortened. |
| **Scroll back up** | Arrows fade out in reverse order. Cookie disappears when scrolling above step 0. Evil Site dims back to 0.15 opacity above step 1. Defense toggles hide above step 6. The visual UNBUILDS cleanly. |
| **All defenses toggled off simultaneously** | "Replay Attack" plays the full attack sequence (steps 2-4) unimpeded. Money transferred, red flash. A subtle warning label: "No defenses active -- attack succeeds" in `var(--color-error)` `var(--text-xs)`. |
| **Toggle defenses rapidly** | Debounce replay: the "Replay Attack" animation must complete (or be canceled) before a new replay starts. Toggling defenses mid-replay cancels the current replay and restarts with new defense state. |
| **Narrow viewport (< 640px)** | Three actor boxes stack vertically: User top, Bank middle, Evil bottom. Arrows become vertical. Arrow labels position beside (not above) the arrow. Toggle panel renders full-width below the diagram. |
| **Keyboard navigation** | Tab order: each actor box is focusable with `aria-label` describing the actor and current state. Toggle switches are natively keyboard accessible. "Replay Attack" button responds to Enter/Space. Arrow animations are described in an `aria-live="polite"` region: "Request sent from evil.com to bank.com. Cookie attached. Transfer processed." |
| **Reduced motion** | Arrows appear at full extent without travel. Cookie fills without transition. Shield blocks appear instantly. Replay is a state-only transition (defense result shown immediately without animation). |

### Cross-Lesson Connections

- **Depends on sec-xss conceptually**: XSS can bypass CSRF tokens (if an attacker can inject JS, they can read the CSRF token from the DOM). This is mentioned but not simulated -- the focus here is on the forged-request vector, not the XSS bypass.
- **Directly feeds sec-cookies**: The SameSite defense introduced at step 5 is explored in depth in sec-cookies. Here the reader sees that SameSite=Strict blocks the cookie from being sent; in sec-cookies they learn the full attribute system (Strict vs Lax vs None) and when each is appropriate.
- **Shares visual language with sec-cors**: Both use actor boxes with arrows between them. Both show the browser making decisions the user didn't request (CSRF: attaching cookies; CORS: blocking responses). The visual similarity reinforces that both are browser-mediated security behaviors.
- **Feeds sec-oauth**: CSRF attacks against OAuth redirect URIs are a real attack vector. The PKCE mechanism in sec-oauth is partly motivated by CSRF-like attacks on the authorization code exchange.

---

## sec-csp -- CSP Playground
**Format**: playground | **Effort**: medium

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (directives panel left, mock page right,
                          |           |   all resources blocked -- strict default)
                          +-----+-----+
                                |
                     [reader toggles a directive source]
                                |
                    +-----------v-----------+
                    |   directive-changed   |  (resource statuses recalculate instantly)
                    +-----------+-----------+
                          |           |
               [resource now          [resource still
                ALLOWED]               BLOCKED]
                  |                       |
          +-------v------+      +--------v--------+
          | resource-ok  |      | resource-blocked|
          | (green dot,  |      | (red dot,       |
          |  renders)    |      |  violation log  |
          +--------------+      |  entry added)   |
                                +-----------------+
                                        |
                     [reader clicks preset scenario button]
                                        |
                          +-------------v-----------+
                          |   preset-applied        |  (all directives snap to
                          |                         |   preset config, resources
                          |                         |   recalculate)
                          +-------------------------+
                                        |
                     [reader modifies any directive after preset]
                                        |
                     [returns to directive-changed, preset label clears]
```

**Data driving each state:**
- `idle`: all directives at `'none'` (strict default), all resources blocked
- `directive-changed`: specific directive updated, `resourceStatuses` recalculated by evaluating each resource's requirements against current CSP
- `resource-ok`: resource status is `'allowed'`, green StatusDot
- `resource-blocked`: resource status is `'blocked'`, red StatusDot, new entry in violation log
- `preset-applied`: all directives set to preset values, `activePreset: string | null`

### Visual Choreography

**Static layout:**
- Container: full width, `max-width: 960px`, centered. Two-column layout (desktop): 45% left (directives), 55% right (mock page + output).
- **LEFT column -- Directive Builder:**
  - Header: "CSP Directives" in `var(--font-mono)` `var(--text-base)` bold.
  - Preset buttons row: three buttons side-by-side: "Strict", "Common", "Permissive". Each: `var(--color-surface-2)` bg, 1px `var(--color-border)` border, `var(--radius-1)`, `var(--font-mono)` `var(--text-xs)`. Active preset: `var(--color-accent)` border, `var(--color-accent)` text.
  - Directive rows: one per directive (7 directives). Each row:
    - Directive name: `var(--font-mono)` `var(--text-sm)` bold. Color: unique per directive using `var(--diagram-layer-N)`.
      - `default-src`: `var(--diagram-layer-0)` (blue)
      - `script-src`: `var(--diagram-layer-8)` (red, hue 0) -- red because most dangerous
      - `style-src`: `var(--diagram-layer-2)` (purple)
      - `img-src`: `var(--diagram-layer-1)` (green)
      - `connect-src`: `var(--diagram-layer-4)` (orange)
      - `font-src`: `var(--diagram-layer-9)` (indigo)
      - `frame-src`: `var(--diagram-layer-3)` (yellow)
    - Source checkboxes below the name: `'self'`, `'unsafe-inline'`, `'unsafe-eval'`, `'nonce-...'`, `'sha256-...'`, `*.cdn.com`, `*` (wildcard). Each as a small toggle chip: 60-80px wide, `var(--color-surface-2)` bg, `var(--radius-1)`, `var(--text-xs)` `var(--font-mono)`. Active: filled with directive color at 20% opacity, border in directive color. Inactive: `var(--color-border)` border.
    - `unsafe-inline` and `unsafe-eval` chips have a small warning icon (8px triangle) when active.
  - Below all directives: the generated CSP header string. `var(--color-surface-2)` bg, `var(--radius-2)`, `var(--space-3)` padding, `var(--font-mono)` `var(--text-xs)`, line-break after each directive. A "Copy" button (24x24px, clipboard icon) at top-right of the CSP string block.

- **RIGHT column -- Mock Page + Violation Log:**
  - **Mock Page** (top 60% of right column): `var(--color-bg)` background, 1px `var(--color-border)` border, `var(--radius-2)`, min-height 280px. Styled as a mini webpage:
    - Browser chrome bar at top: 28px tall, `var(--color-surface-2)` bg, three colored dots (8px, red/yellow/green) at left, URL bar in center showing "https://example.com" in `var(--text-xs)` `var(--font-mono)`.
    - Page content below chrome: 7 resource indicators, each a horizontal row:
      - StatusDot (green `'success'` or red `'error'`)
      - Resource type icon (16px): `<script>` tag icon, `<style>` tag icon, `<img>` icon, `<iframe>` icon, XHR/fetch icon
      - Resource description: `var(--text-xs)` `var(--font-mono)`. E.g., "Inline script: analytics.init()" or "External script: cdn.example.com/lib.js"
      - Status label: "ALLOWED" in `var(--color-success)` or "BLOCKED" in `var(--color-error)`, `var(--text-xs)` `var(--font-mono)` bold.
    - Resources:
      1. Inline script (`<script>analytics.init()</script>`) -- requires `script-src 'unsafe-inline'` or nonce/hash
      2. External script (`cdn.example.com/lib.js`) -- requires `script-src cdn.example.com` or `*`
      3. Inline style (`<style>body { color: red }</style>`) -- requires `style-src 'unsafe-inline'` or nonce/hash
      4. External stylesheet (`fonts.googleapis.com/css`) -- requires `style-src fonts.googleapis.com` or `*`
      5. Cross-origin image (`img.example.com/photo.jpg`) -- requires `img-src img.example.com` or `*`
      6. Iframe (`embed.example.com/widget`) -- requires `frame-src embed.example.com` or `*`
      7. XHR/Fetch (`api.example.com/data`) -- requires `connect-src api.example.com` or `*`

  - **Violation Log** (bottom 40% of right column): `var(--color-surface)` bg, 1px `var(--color-border)` border-top, `var(--radius-2)` bottom corners. Header: red terminal icon + "Violation Log" in `var(--font-mono)` `var(--text-sm)` `var(--color-error)`.
    - Each violation: a line in `var(--font-mono)` `var(--text-xs)`, styled like a Chrome DevTools console error:
      - Red "X" icon (8px) at left
      - Text: "Refused to {action} because it violates the following Content Security Policy directive: '{directive}'" in `var(--color-error)` at 80% opacity.
      - E.g., "Refused to execute inline script because it violates the following Content Security Policy directive: 'script-src 'self''"
    - Max 10 visible entries; scrollable if more. Newest entries at top.
    - When a violation is resolved (resource becomes allowed), the entry fades out over 300ms and is removed.

**Animations:**

1. **Directive toggle** (reader clicks a source chip):
   - Chip: background fills/empties over 150ms, `TRANSITION.crossfade`.
   - Affected resources: StatusDot transitions green<->red with a brief scale pulse (1.0 to 1.15 to 1.0, 200ms, `SPRING.quick`).
   - Violation log: new entry slides in from top (translateY -16px to 0, opacity 0 to 1, 200ms `TRANSITION.enterItem`).
   - CSP header string: the changed directive flashes its color briefly (background at 20% directive color, 300ms).

2. **Preset application** (reader clicks "Strict" / "Common" / "Permissive"):
   - All directive chips snap to new states simultaneously.
   - All resource statuses recalculate. A sweep animation runs down the resource list: each row updates with a 40ms stagger (`STAGGER.fast`).
   - Violation log clears and repopulates with new violations (if any).

3. **`unsafe-inline` warning** (reader enables `unsafe-inline` on `script-src`):
   - The chip gains a yellow warning triangle. A toast-style warning appears above the mock page: "unsafe-inline defeats most of CSP's XSS protection" in `var(--diagram-layer-3)` text, `var(--color-surface-2)` bg, 1px `var(--diagram-layer-3)` border. Auto-dismisses after 4s or on click. 240px wide, positioned top-right of mock page area.

**Reduced motion**: Chip fills are instant. StatusDot changes without scale pulse. Violation log entries appear without slide. Preset sweep is instant (no stagger). Warning toast appears without slide.

### Teaching Flow (First 60 Seconds)

1. **0s**: Reader sees two columns. Left: 7 directive rows, all sources unchecked (strict default). Right: mock page with ALL 7 resources showing red "BLOCKED" StatusDots. Violation log has 7 entries. The CSP header reads: `default-src 'none'`. The "Strict" preset button is highlighted. Everything is broken -- this is intentional.
2. **Reader reads violation log**: "Refused to execute inline script...", "Refused to load the stylesheet...", etc. Each violation names the directive that blocked it. The reader sees the 1:1 mapping: each resource was blocked by a specific directive.
3. **Reader clicks the `'self'` chip under `script-src`**: The external script from `cdn.example.com` is still blocked (not from `'self'`), but... wait, the inline script is also still blocked. `'self'` doesn't allow inline scripts! The reader's assumption is challenged.
4. **Reader clicks `'unsafe-inline'` under `script-src`**: The inline script turns green. But the warning toast appears: "unsafe-inline defeats most of CSP's XSS protection." The reader now understands the tension: inline scripts are convenient but dangerous.
5. **Reader clicks the "Common" preset**: Directives snap to a typical production config: `default-src 'self'`, `script-src 'self' cdn.example.com`, `style-src 'self' 'unsafe-inline' fonts.googleapis.com`, `img-src *`, `connect-src 'self' api.example.com`. Most resources turn green. The iframe and one external script may still be blocked. The violation log shows only 1-2 entries.
6. **Reader explores**: They toggle individual sources to understand what each controls. The CSP header string updates live. They copy the header for reference.

### Data & State Shape

```typescript
type CSPDirective = 'default-src' | 'script-src' | 'style-src' | 'img-src' | 'connect-src' | 'font-src' | 'frame-src';
type CSPSource = "'self'" | "'unsafe-inline'" | "'unsafe-eval'" | "'nonce-abc123'" | "'sha256-...'" | "cdn.example.com" | "fonts.googleapis.com" | "img.example.com" | "api.example.com" | "embed.example.com" | "*";

interface CSPResourceDef {
  id: string;
  type: 'inline-script' | 'external-script' | 'inline-style' | 'external-style' | 'image' | 'iframe' | 'xhr';
  label: string;                          // "Inline script: analytics.init()"
  icon: string;                           // icon identifier
  requiredDirective: CSPDirective;        // which directive governs this resource
  requiredSources: CSPSource[];           // ANY of these sources would allow it
  violationMessage: string;               // Chrome-style error message
}

interface CSPPreset {
  name: string;                           // "Strict", "Common", "Permissive"
  directives: Record<CSPDirective, CSPSource[]>;
  description: string;                    // tooltip explaining the preset
}

interface CSPPlaygroundState {
  // Directive configuration
  directives: Record<CSPDirective, Set<CSPSource>>;

  // Derived (computed from directives)
  resourceStatuses: Record<string, 'allowed' | 'blocked'>;
  violations: CSPViolation[];
  headerString: string;                   // the complete CSP header

  // UI
  activePreset: string | null;            // null if user has modified after preset
  warningToast: string | null;            // warning message, auto-dismisses
}

interface CSPViolation {
  id: string;
  resourceId: string;
  directive: CSPDirective;
  message: string;
  timestamp: number;                      // for ordering
}

// Evaluation function (pure):
function evaluateResource(
  resource: CSPResourceDef,
  directives: Record<CSPDirective, Set<CSPSource>>
): 'allowed' | 'blocked' {
  const effectiveSources = directives[resource.requiredDirective].size > 0
    ? directives[resource.requiredDirective]
    : directives['default-src'];           // fallback to default-src
  return resource.requiredSources.some(s => effectiveSources.has(s))
    ? 'allowed'
    : 'blocked';
}
```

### Primitives & Props

**DemoSandbox** -- Outer container.
```tsx
<DemoSandbox title="CSP Playground">
  <CSPPlayground />
</DemoSandbox>
```

**StatusDot** -- Used for each resource's allowed/blocked indicator.
```tsx
<StatusDot status={resourceStatus === 'allowed' ? 'success' : 'error'} label={statusLabel} />
```

**New bespoke subcomponents (not reusable):**
- `DirectiveRow` -- single directive with name, source chip toggles, and color coding
- `SourceChip` -- toggleable chip for a CSP source value with optional warning icon
- `MockBrowserPage` -- the mini webpage with browser chrome bar and resource indicators
- `ViolationLog` -- Chrome DevTools-styled console error log
- `CSPHeaderOutput` -- the generated CSP header string with copy button and directive highlighting
- `PresetSelector` -- the Strict/Common/Permissive button row

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **`default-src` as fallback** | When a specific directive (e.g., `script-src`) has NO sources set, it falls back to `default-src`. The directive row shows a subtle "inherits from default-src" label in `var(--color-muted)` `var(--text-xs)` when empty. Evaluation function checks `default-src` when the specific directive's source set is empty. |
| **`default-src 'none'` + no other directives** | All 7 resources blocked. This is the "Strict" preset starting state. The mock page is completely red -- intentionally dramatic to motivate loosening. |
| **Reader enables wildcard `*`** | All resources under that directive turn green. A warning toast: "Wildcard allows loading from ANY origin -- this defeats the purpose of CSP for this resource type." |
| **Many violations at once (preset switch)** | Violation log caps at 10 visible entries. Older entries scroll off. Each entry has a `key` based on resource ID so React reconciliation handles additions/removals cleanly. |
| **Narrow viewport (< 640px)** | Two columns stack vertically: directive builder on top, mock page + violation log below. Directive rows become more compact: source chips wrap to multiple lines. Mock page min-height reduces to 200px. |
| **Keyboard navigation** | Each source chip is a checkbox (`role="checkbox"`, `aria-checked`). Directive names are headings (`role="heading"`, `aria-level={3}`). Tab order: preset buttons -> directive sources (row by row) -> copy button. Screen reader announces: "script-src: self enabled, unsafe-inline disabled, ..." |
| **Copy CSP header** | Click copies the CSP string to clipboard via `navigator.clipboard.writeText()`. Button shows a brief checkmark (300ms) then reverts to clipboard icon. Fallback for non-HTTPS: select-all in a hidden textarea. |

### Cross-Lesson Connections

- **Depends on sec-xss**: CSP is the defense against the XSS attacks from sec-xss. Challenge 5 of sec-xss explicitly names CSP. The reader arrives at sec-csp knowing WHY `script-src` matters -- they just exploited the gap.
- **Shares defense model with sec-cookies**: Both are "configure attributes to prevent attacks" playgrounds. sec-cookies has cookie attributes (HttpOnly, Secure, SameSite); sec-csp has directive sources. Same mental model: each attribute/directive is a defense layer.
- **Referenced by sec-cors**: CSP and CORS both control what resources can load, but from different angles. CSP is a server-to-browser policy ("here's what this page is allowed to load"). CORS is a server-to-browser permission ("here's who is allowed to read my responses"). The reader should understand this distinction.

---

## sec-cors -- CORS Scrollytelling + Request Builder
**Format**: scrollytelling | **Effort**: large

### Interaction State Machine

```
                          +-----------+
                          |  step-0   |  (Browser box left, Server box right, empty)
                          +-----+-----+
                                |
                     [scroll enters step 1 viewport]
                                |
                          +-----v-----+
                          | simple-req|  (GET request arrow, standard headers)
                          +-----+-----+
                                |
                     [scroll enters step 2 viewport]
                                |
                        +-------v-------+
                        |  acao-pass   |  (Server responds with ACAO header,
                        |              |   browser checks, green checkmark)
                        +-------+-------+
                                |
                     [scroll enters step 3 viewport]
                                |
                        +-------v---------+
                        |  acao-blocked   |  (Server omits ACAO, response arrives
                        |                 |   but browser BLOCKS JS from reading it)
                        +-------+---------+
                                |
                     [scroll enters step 4 viewport]
                                |
                        +-------v---------+
                        |  preflight-why  |  (POST + application/json triggers preflight)
                        +-------+---------+
                                |
                     [scroll enters step 5 viewport]
                                |
                        +-------v---------+
                        |  options-req    |  (OPTIONS request, server responds with
                        |                 |   allowed methods/headers)
                        +-------+---------+
                                |
                     [scroll enters step 6 viewport -- interactive zone]
                                |
                    +-----------v-----------+
                    |   request-builder    |  (full interactive mode)
                    +-----------+-----------+
                           /          \
                   [configure request]  [configure server CORS]
                          |                    |
                   +------v------+     +------v------+
                   | req-config  |     | cors-config |
                   +------+------+     +------+------+
                          |                    |
                          +--------+----------+
                                   |
                        [click "Send Request"]
                                   |
                          +--------v--------+
                          |  flow-animating |  (preflight if needed, then actual request)
                          +--------+--------+
                              /          \
                     [CORS passes]    [CORS fails]
                        /                    \
               +-------v------+     +--------v--------+
               | flow-success |     |  flow-blocked   |
               | (green, JS   |     |  (response 200  |
               |  reads data) |     |   but JS can't  |
               +--------------+     |   read it)      |
                                    +-----------------+
```

**Data driving each state:**
- `step-0` through `options-req`: scroll-driven, `activeStepIndex: -1 to 4`
- `request-builder`: `activeStepIndex: 5`, interactive mode active
- `req-config`: `method`, `contentType`, `customHeaders`, `credentials` configured
- `cors-config`: `allowOrigin`, `allowMethods`, `allowHeaders`, `allowCredentials` configured
- `flow-animating`: `isAnimating: true`, preflight decision computed, arrows firing
- `flow-success`: CORS check passes, response data visible to JS
- `flow-blocked`: response arrived (status 200 visible) but JS blocked from reading

### Visual Choreography

**Static layout:**
- Container: `max-width: 800px`, centered. ScrollytellingShell for steps 0-4, then interactive zone.
- Sticky visual: two main boxes side-by-side:
  - **Browser** (left): 160x100px, `var(--color-surface-2)` bg, 2px solid `var(--diagram-layer-0)` (blue) border, `var(--radius-2)`. Interior: browser window icon (40x40px SVG). Label: "Browser (origin: app.com)" in `var(--font-mono)` `var(--text-xs)`.
  - **Server** (right): 160x100px, `var(--color-surface-2)` bg, 2px solid `var(--diagram-layer-1)` (green) border, `var(--radius-2)`. Interior: server icon (40x40px SVG). Label: "Server (api.example.com)" in `var(--font-mono)` `var(--text-xs)`.
- Between the boxes: the arrow flight area (horizontal space for request/response animations).
- **Header Inspector** panel: below the two boxes. `var(--color-surface)` bg, 1px `var(--color-border)` border, `var(--radius-2)`, min-height 120px. Two columns:
  - Request headers (left): key-value pairs in `var(--font-mono)` `var(--text-xs)`. Each key in `var(--color-muted)`, value in `var(--color-text)`. Key headers highlighted: `Origin` in `var(--diagram-layer-0)`, `Content-Type` in `var(--diagram-layer-4)`.
  - Response headers (right): same style. Key header highlighted: `Access-Control-Allow-Origin` in `var(--diagram-layer-1)`.
  - Hovering any header shows a tooltip (200px wide, `var(--color-surface-2)` bg, `var(--shadow-1)`, `var(--text-xs)`) explaining that header's role in CORS.

**Animations per scroll step:**

1. **Simple GET** (step index 0):
   - Request arrow: dashed `var(--diagram-layer-0)` line draws from Browser to Server over 500ms. Packet label: "GET /data" in `var(--text-xs)` `var(--font-mono)`.
   - Header Inspector populates request headers: `Method: GET`, `Origin: https://app.com`, `Accept: application/json`. Each line fades in with 60ms stagger.

2. **ACAO passes** (step index 1):
   - Response arrow: dashed `var(--diagram-layer-1)` line draws from Server to Browser over 400ms. Label: "200 OK".
   - Header Inspector populates response headers: `Access-Control-Allow-Origin: *`. The ACAO header flashes green (background `var(--color-success-muted)`, 400ms).
   - At Browser box: green checkmark icon (20px) scales up from 0 to 1.0 with `SPRING.gentle`. Label below: "JS can read response" in `var(--color-success)` `var(--text-xs)`.

3. **ACAO blocked** (step index 2):
   - Same request arrow replays.
   - Response arrow fires: label "200 OK" -- the response ARRIVES.
   - But: Header Inspector shows response WITHOUT `Access-Control-Allow-Origin`. The ACAO row has a red dashed outline with text "missing" in `var(--color-error)` `var(--text-xs)`.
   - At Browser box: a red SHIELD icon (24px, `var(--diagram-layer-8)`) appears OVER the response data. The shield scales up from 0 with `SPRING.snappy`. Behind the shield, the response text is visible but blurred (filter: blur(3px)).
   - Below Browser box: console-style error message appears: "Access to fetch at 'api.example.com/data' from origin 'app.com' has been blocked by CORS policy" in `var(--font-mono)` `var(--text-xs)` `var(--color-error)`. Red "X" icon at left. The message slides up from below over 300ms.
   - CRITICAL teaching visual: the "200 OK" status is VISIBLE on the response arrow. The response arrived. But the shield blocks JS from reading it. Two labels positioned explicitly:
     - On the response arrow (at midpoint): "Response arrived (200 OK)" in `var(--color-success)` `var(--text-xs)`.
     - On the shield: "JS blocked" in `var(--color-error)` `var(--text-xs)`.

4. **Preflight trigger** (step index 3):
   - Header Inspector clears and shows new request: `Method: POST`, `Content-Type: application/json`, `Origin: https://app.com`.
   - The `Content-Type: application/json` line has a yellow warning badge (8px triangle) and label: "triggers preflight!" in `var(--diagram-layer-3)` `var(--text-xs)`.
   - An explanatory label appears in the arrow flight area: "Non-simple request detected" in `var(--font-mono)` `var(--text-xs)` `var(--diagram-layer-3)`.

5. **OPTIONS preflight** (step index 4):
   - **First arrow (preflight)**: dashed `var(--diagram-layer-3)` (yellow) line from Browser to Server, 400ms. Label: "OPTIONS /data". Header Inspector shows: `Access-Control-Request-Method: POST`, `Access-Control-Request-Headers: Content-Type`.
   - **Server responds**: return arrow, `var(--diagram-layer-1)`. Label: "204 No Content". Header Inspector shows: `Access-Control-Allow-Methods: POST, GET`, `Access-Control-Allow-Headers: Content-Type`.
   - **Then actual request**: second arrow fires 300ms after preflight completes. Same as a regular request. `var(--diagram-layer-0)`, label: "POST /data". Server responds with "200 OK" + ACAO header. Green checkmark at Browser.
   - The TWO-PHASE nature is visually explicit: a horizontal divider line appears between the preflight and actual request in the Header Inspector, labeled "preflight" above and "actual" below.

6. **Interactive request builder** (step index 5):
   - Control panel appears below the diagram. Two sections side-by-side:
     - **Request Config** (left): `var(--color-surface-2)` bg, `var(--radius-2)`.
       - Method: `DemoSandbox.Tabs` with options `['GET', 'POST', 'PUT', 'DELETE']`. Default: GET.
       - Content-Type: `DemoSandbox.Tabs` with options `['text/plain', 'application/json', 'multipart/form-data']`. Default: text/plain.
       - Custom Headers: `DialToggle` for "Authorization" header and "X-Custom-Header".
       - Credentials: `DialToggle` for "Include cookies (credentials: true)".
     - **Server CORS Config** (right): `var(--color-surface-2)` bg, `var(--radius-2)`.
       - Allow-Origin: `DemoSandbox.Tabs` with `['*', 'https://app.com', 'https://other.com', '(none)']`. Default: `*`.
       - Allow-Methods: checkbox chips for `GET`, `POST`, `PUT`, `DELETE`. Default: GET, POST checked.
       - Allow-Headers: checkbox chips for `Content-Type`, `Authorization`, `X-Custom-Header`. Default: Content-Type checked.
       - Allow-Credentials: `DialToggle`. Default: off.
   - **"Send Request" button**: centered below both config sections. 140x40px, `var(--color-accent)` bg, `var(--font-mono)` `var(--text-sm)`.
   - **Preflight indicator**: between configs and button, a badge: "Will preflight: YES" (yellow bg) or "Will preflight: NO" (muted bg). Updates live as request config changes. Shows the REASON if yes: "Non-simple Content-Type" or "Custom header present" in `var(--text-xs)`.
   - On "Send Request": the full flow animates in the diagram above. Preflight if needed, then actual request, then CORS check. Result appears at Browser box (green check or red shield + console error).

**Reduced motion**: Arrows appear at full extent without travel. Header Inspector populates instantly. Shield and checkmark appear without scale animation. Console error appears without slide. Preflight/actual phases are shown simultaneously (both arrows visible, labeled).

### Teaching Flow (First 60 Seconds)

1. **0s**: Browser box (left, blue border) and Server box (right, green border). Empty Header Inspector below. Narrative: "A simple GET request with standard headers. The browser sends it directly." Arrow area is empty.
2. **Reader scrolls to step 1**: GET request arrow travels Browser to Server. Header Inspector fills with request headers (Origin: https://app.com). Narrative: "The server includes Access-Control-Allow-Origin in the response."
3. **Reader scrolls to step 2**: Server responds with ACAO:*. Green checkmark at Browser. Header Inspector highlights ACAO in green. Narrative: "If the origin matches, JavaScript can read the response."
4. **Reader scrolls to step 3**: Same request, but now Server responds WITHOUT ACAO. The 200 OK status is visible on the arrow. But the red shield covers the response at Browser. The console error slides up. TWO labels make the point: "Response arrived (200 OK)" in green, "JS blocked" in red. This is the core CORS misunderstanding demolished in 10 seconds. Narrative: "Without the CORS header, the browser blocks JavaScript from reading the response. The request SUCCEEDED. But the browser protects the response data."
5. **Reader scrolls to steps 4-5**: Preflight animation plays. The two-phase flow is visible. Then the interactive request builder appears for experimentation.

### Data & State Shape

```typescript
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ContentType = 'text/plain' | 'application/json' | 'multipart/form-data';

interface CORSRequestConfig {
  method: HttpMethod;
  contentType: ContentType;
  customHeaders: {
    authorization: boolean;
    xCustom: boolean;
  };
  credentials: boolean;
}

interface CORSServerConfig {
  allowOrigin: '*' | 'https://app.com' | 'https://other.com' | 'none';
  allowMethods: Set<HttpMethod>;
  allowHeaders: Set<string>;              // 'Content-Type', 'Authorization', 'X-Custom-Header'
  allowCredentials: boolean;
}

interface CORSFlowResult {
  preflightNeeded: boolean;
  preflightReason: string | null;         // "Non-simple Content-Type", "Custom header", "Non-simple method"
  preflightPassed: boolean | null;        // null if no preflight needed
  corsCheckPassed: boolean;
  blockReason: string | null;             // Chrome-style error message
}

interface CORSScrollyState {
  // Scroll-driven (steps 0-4)
  activeStepIndex: number;                // -1 to 5

  // Interactive builder (step 5)
  requestConfig: CORSRequestConfig;
  serverConfig: CORSServerConfig;

  // Flow animation
  isAnimating: boolean;
  flowResult: CORSFlowResult | null;
  currentFlowPhase: 'idle' | 'preflight-out' | 'preflight-back' | 'request-out' | 'response-back' | 'cors-check' | 'complete';

  // Header Inspector
  visibleHeaders: { key: string; value: string; highlighted: boolean; tooltip: string }[];
  headerPhase: 'request' | 'response' | 'preflight-request' | 'preflight-response';
}

// Pure functions:
function needsPreflight(config: CORSRequestConfig): { needed: boolean; reason: string | null } {
  if (config.method !== 'GET' && config.method !== 'POST') return { needed: true, reason: `Method ${config.method} is not simple` };
  if (config.contentType === 'application/json') return { needed: true, reason: "Content-Type application/json is not simple" };
  if (config.customHeaders.authorization || config.customHeaders.xCustom) return { needed: true, reason: "Custom header present" };
  return { needed: false, reason: null };
}

function checkCORS(request: CORSRequestConfig, server: CORSServerConfig): CORSFlowResult {
  // ... evaluates CORS rules and returns result with block reason
}
```

### Primitives & Props

**ScrollytellingShell** -- Wraps scroll steps 0-4.
```tsx
<ScrollytellingShell
  steps={scrollSteps}
  renderVisual={(stepIndex) => <CORSDiagram activeStep={stepIndex} />}
/>
```

**DemoSandbox** -- Wraps the interactive request builder.
```tsx
<DemoSandbox title="CORS Request Builder">
  <DemoSandbox.Controls>
    {/* Request config controls */}
  </DemoSandbox.Controls>
  <CORSDiagram mode="interactive" requestConfig={config} serverConfig={serverConfig} />
</DemoSandbox>
```

**DemoSandbox.Tabs** -- For method and content-type selection.
```tsx
<DemoSandbox.Tabs options={['GET', 'POST', 'PUT', 'DELETE']} value={method} onChange={setMethod} />
```

**DialToggle** -- For credentials and custom header toggles.
```tsx
<DialToggle label="Authorization" value={customHeaders.authorization} onChange={...} />
<DialToggle label="Credentials" value={credentials} onChange={...} />
```

**New bespoke subcomponents (not reusable):**
- `CORSDiagram` -- Browser/Server boxes with arrow flight area and Header Inspector
- `HeaderInspector` -- two-column header display with hover tooltips and highlighted key headers
- `CORSArrow` -- animated SVG arrow between Browser and Server with packet label
- `CORSShield` -- red shield that appears over blocked responses (blur effect behind)
- `ConsoleError` -- Chrome DevTools-styled CORS error message
- `PreflightBadge` -- "Will preflight: YES/NO" indicator with reason text
- `RequestBuilderPanel` -- two-section control panel for request + server CORS config

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **`Allow-Origin: *` with credentials** | If reader enables both wildcard origin and credentials, show error: "Cannot use wildcard origin with credentials. Must specify exact origin." in `var(--color-error)`. The flow animation shows the request failing at the CORS check with this specific error in the console. This is a real browser behavior. |
| **Preflight fails** | If the OPTIONS response doesn't include the required method/header, the actual request NEVER fires. The preflight arrow bounces back with a red X. Label: "Preflight failed -- actual request not sent." The difference from a CORS block (where the response arrives) is visually distinct. |
| **Reader configures a simple request (GET, no custom headers)** | Preflight badge shows "NO". Only one request/response cycle animates. No OPTIONS arrow. |
| **Fast scrolling** | Same as sec-csrf: arrows appear instantly, headers populate instantly, shield appears without animation. State accumulates correctly. |
| **Narrow viewport (< 640px)** | Browser and Server boxes stack vertically (Browser top, Server bottom). Arrows become vertical. Header Inspector becomes single-column (request headers, then response headers). Request builder controls stack vertically. |
| **Keyboard navigation** | Tab order through request builder controls is left-to-right, top-to-bottom. "Send Request" button responds to Enter. Header Inspector headers are focusable for tooltip access (show on focus, not just hover). Screen reader describes flow: "Preflight OPTIONS request sent. Server responded with allowed methods." |
| **Reduced motion** | All arrows appear at full extent. Shield appears without scale. Console error appears without slide. Header Inspector rows appear without stagger. Flow phases are instant -- all arrows and results appear simultaneously. |

### Cross-Lesson Connections

- **Often confused with sec-csp**: CSP controls what a PAGE can load. CORS controls what a SERVER allows to be READ. They operate at different points: CSP is a directive from the server to the browser about the page's own resources. CORS is a permission from a different server about cross-origin access. The Header Inspector explicitly shows this: CSP headers (`Content-Security-Policy`) appear on the page's own response; CORS headers (`Access-Control-Allow-Origin`) appear on the cross-origin API's response.
- **Connects to sec-csrf**: CORS preflight is sometimes confused with CSRF protection. The preflight prevents certain cross-origin requests from being sent (PUT, DELETE, custom headers). But simple POST requests (form submissions) do NOT preflight -- which is exactly the CSRF attack vector from sec-csrf. The reader who completed sec-csrf understands why: HTML forms can submit POST without JavaScript, so the browser can't prevent it.
- **Feeds sec-oauth**: OAuth token exchange requests are cross-origin (your app to the auth server). CORS must be configured on the auth server's token endpoint. The reader needs CORS understanding to debug OAuth "blocked by CORS policy" errors, which are among the most common OAuth implementation issues.

---

## sec-cookies -- Cookie Playground
**Format**: playground | **Effort**: medium

### Interaction State Machine

```
                          +-----------+
                          |   idle    |  (cookie jar empty, builder form visible,
                          |           |   attack scenario buttons disabled)
                          +-----+-----+
                                |
                     [reader fills builder form + clicks "Bake Cookie"]
                                |
                    +-----------v-----------+
                    |   cookie-created     |  (cookie card appears in jar,
                    |                      |   security score calculated,
                    |                      |   attack buttons enabled)
                    +-----------+-----------+
                           /          \
                [create more          [click attack
                 cookies]              scenario button]
                    |                       |
                    |              +--------v---------+
                    |              | attack-running   |  (scenario animates,
                    |              |                  |   each cookie tested)
                    |              +--------+---------+
                    |                  /          \
                    |         [cookie            [cookie
                    |          vulnerable]        protected]
                    |            |                    |
                    |    +-------v------+    +-------v--------+
                    |    | attack-hit   |    | attack-blocked |
                    |    | (red flash   |    | (green shield  |
                    |    |  on cookie   |    |  on cookie     |
                    |    |  card)       |    |  card)         |
                    |    +--------------+    +----------------+
                    |              \          /
                    |               +---+---+
                    |                   |
                    |        [scenario complete, results shown]
                    |                   |
                    |         +---------v--------+
                    |         | scenario-result  |  (summary: which cookies survived)
                    |         +---------+--------+
                    |                   |
                    |        [click another scenario or modify cookies]
                    |                   |
                    +---------+---------+
                              |
                   [returns to cookie-created or idle]
```

**Data driving each state:**
- `idle`: `cookies: []`, `activeScenario: null`
- `cookie-created`: `cookies: CookieCard[]`, each with computed `securityScore`
- `attack-running`: `activeScenario: 'xss' | 'http-sniff' | 'csrf'`, `attackResults: Record<cookieId, 'vulnerable' | 'protected'>`
- `scenario-result`: `scenarioComplete: true`, results displayed on each cookie card

### Visual Choreography

**Static layout:**
- Container: full width, `max-width: 960px`. Two zones stacked vertically:
  - **Cookie Jar** (top 60%): `var(--color-surface)` bg, `var(--radius-3)` border-radius, `var(--space-4)` padding. Header: "Cookie Jar" in `var(--font-mono)` `var(--text-base)` bold, with a cookie jar icon (24px SVG). Grid layout: auto-fill, min 240px columns, 12px gap.
    - Each **cookie card**: 240x auto-height, `var(--color-surface-2)` bg, 1px `var(--color-border)` border, `var(--radius-2)`, `var(--space-3)` padding.
      - Cookie name: `var(--font-mono)` `var(--text-sm)` bold, `var(--color-text)`.
      - Cookie value: `var(--font-mono)` `var(--text-xs)` `var(--color-muted)`, truncated with ellipsis at 20 chars.
      - Attribute badges: horizontal row of small pills below value. Each pill: 60-80px, `var(--radius-1)`, `var(--text-xs)` `var(--font-mono)`.
        - HttpOnly: green pill (`var(--color-success)` bg at 15%, `var(--color-success)` text) if set, red pill (`var(--color-error)` bg at 15%, `var(--color-error)` text) with strikethrough if unset.
        - Secure: same green/red pill pattern.
        - SameSite: green if Strict or Lax, yellow (`var(--diagram-layer-3)`) if None, red if unset.
      - **Security Score**: bottom of card. 3 shield icons (16px each) representing HttpOnly, Secure, SameSite. Filled `var(--color-success)` if attribute is set safely, hollow `var(--color-border)` if missing. Score label: "2/3" in `var(--text-xs)` `var(--font-mono)`.
    - **Best practices template cookie**: always visible as the last card in the grid, dashed border `var(--color-success)`, labeled "Template: Best Practices" in `var(--text-xs)` `var(--color-success)`. Shows: HttpOnly + Secure + SameSite=Strict. Reader can click to auto-fill the builder with these settings.

  - **Bottom zone** (40%): two sections side-by-side:
    - **Cookie Builder** (left, 50%): form with fields:
      - Name: text input, `var(--font-mono)`, placeholder "session_id"
      - Value: text input, `var(--font-mono)`, placeholder "abc123"
      - Domain: text input, `var(--font-mono)`, pre-filled "example.com"
      - Path: text input, `var(--font-mono)`, pre-filled "/"
      - Expires: `DemoSandbox.Tabs` with `['Session', '1 hour', '1 day', '1 year']`
      - HttpOnly: `DialToggle` (default: off)
      - Secure: `DialToggle` (default: off)
      - SameSite: `DemoSandbox.Tabs` with `['(unset)', 'Strict', 'Lax', 'None']`. Default: `(unset)`.
      - "Bake Cookie" button: 120x40px, `var(--color-accent)` bg, cookie emoji prefix.
    - **Attack Scenarios** (right, 50%): three scenario buttons stacked vertically:
      - "XSS Theft (document.cookie)": 100% width, 48px height, `var(--diagram-layer-8)` (red) border, `var(--color-surface-2)` bg. Icon: script tag.
      - "HTTP Sniffing (non-HTTPS)": 100% width, 48px, `var(--diagram-layer-4)` (orange) border. Icon: eye.
      - "Cross-Site Request (CSRF)": 100% width, 48px, `var(--diagram-layer-3)` (yellow) border. Icon: form.
      - Disabled (`opacity: 0.3`, `cursor: not-allowed`) when cookie jar is empty.

**Animations per attack scenario:**

1. **XSS Theft** (click scenario button):
   - A mock code block appears floating above the cookie jar: `document.cookie` in `var(--font-mono)` `var(--text-sm)` `var(--diagram-layer-8)`. The code block has a red glow: `box-shadow: 0 0 8px var(--diagram-layer-8)`.
   - For each cookie card, sequentially (80ms stagger):
     - If HttpOnly is NOT set: card border flashes red (3 times, 150ms each). A "STOLEN!" label (red, bold, `var(--text-xs)`) appears on the card. The cookie value briefly becomes fully visible (no truncation). A copy of the value "floats" up to the code block (absolute positioned clone, travels 300ms, `SPRING.snappy`).
     - If HttpOnly IS set: card border flashes green once. A lock icon (16px) appears over the value. Label: "Protected" in `var(--color-success)` `var(--text-xs)`.
   - After all cards processed: summary below code block: "Stolen: 2/4 cookies. HttpOnly prevents JavaScript access." in `var(--text-xs)`.

2. **HTTP Sniffing** (click scenario button):
   - A mock network icon (wifi symbol with an eye, 32px) appears above the cookie jar with label "HTTP (not HTTPS)" in `var(--font-mono)` `var(--text-xs)` `var(--diagram-layer-4)`.
   - For each cookie card, sequentially (80ms stagger):
     - If Secure is NOT set: card border flashes orange. Label: "TRANSMITTED IN CLEAR TEXT!" in `var(--color-error)` `var(--text-xs)`. The value text briefly changes to plaintext on an orange background.
     - If Secure IS set: card border flashes green. Label: "Not sent over HTTP" in `var(--color-success)` `var(--text-xs)`.
   - Summary: "Exposed: 3/4 cookies. Secure flag prevents transmission over HTTP."

3. **Cross-Site Request** (click scenario button):
   - A mock evil-site box (same style as sec-csrf) appears above cookie jar: "evil.com" with form icon.
   - For each cookie card, sequentially (80ms stagger):
     - If SameSite is unset or None: card border flashes yellow. Label: "SENT WITH CROSS-SITE REQUEST!" in `var(--color-error)` `var(--text-xs)`.
     - If SameSite is Strict: card border flashes green. Label: "Not sent (Strict)" in `var(--color-success)`.
     - If SameSite is Lax: card border flashes blue. Label: "Sent only for top-level navigation (Lax)" in `var(--diagram-layer-0)` `var(--text-xs)`.
   - Summary: "Vulnerable: 1/4 cookies. SameSite controls cross-site cookie transmission."

4. **SameSite=None without Secure** (builder validation):
   - If reader sets SameSite to "None" but Secure is off, the "Bake Cookie" button disables. A red error appears below: "SameSite=None requires Secure flag -- browsers reject this combination" in `var(--color-error)` `var(--text-xs)`.

**Reduced motion**: Card border color changes instant (no flash). Value "float" to code block is instant (appears at destination). Summary appears without stagger. Scenario icons appear without animation.

### Teaching Flow (First 60 Seconds)

1. **0s**: Empty cookie jar with "No cookies yet" placeholder. Builder form on the left. Attack buttons dimmed on the right. The template "Best Practices" card is visible with dashed green border.
2. **Reader creates a cookie**: types name "session_id", value "user123", leaves all security attributes OFF (HttpOnly off, Secure off, SameSite unset). Clicks "Bake Cookie." The cookie card appears in the jar with all three shield icons hollow (0/3 score). Attribute badges all red with strikethrough.
3. **Reader creates a second cookie**: clicks the "Best Practices" template. Builder auto-fills: HttpOnly on, Secure on, SameSite Strict. Clicks "Bake Cookie." This card appears with 3/3 shields green.
4. **Reader clicks "XSS Theft"**: The `document.cookie` code block appears. First cookie: border flashes red, "STOLEN!", value floats up. Second cookie: border flashes green, lock icon, "Protected." Summary: "Stolen: 1/2 cookies."
5. **Reader immediately sees**: the ONLY difference between the two cookies was HttpOnly. One was stolen, one wasn't. The 1:1 mapping of attribute to defense is viscerally clear.
6. **Reader runs the other scenarios**: each test a different attribute. After all three, the "Best Practices" cookie survived all attacks. The insecure cookie was vulnerable to all three.

### Data & State Shape

```typescript
type SameSiteValue = 'Strict' | 'Lax' | 'None' | 'unset';
type ExpiresOption = 'Session' | '1 hour' | '1 day' | '1 year';

interface CookieCard {
  id: string;                              // unique ID (uuid or nanoid)
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: ExpiresOption;
  httpOnly: boolean;
  secure: boolean;
  sameSite: SameSiteValue;
  securityScore: number;                   // 0-3, count of safe attributes
  isTemplate: boolean;                     // true for the "Best Practices" card
}

type AttackScenario = 'xss' | 'http-sniff' | 'csrf';
type AttackVulnerability = 'vulnerable' | 'protected' | 'partial';  // partial for SameSite=Lax

interface CookiePlaygroundState {
  // Cookie jar
  cookies: CookieCard[];

  // Builder form
  builderValues: Omit<CookieCard, 'id' | 'securityScore' | 'isTemplate'>;
  builderError: string | null;             // e.g., "SameSite=None requires Secure"

  // Attack scenarios
  activeScenario: AttackScenario | null;
  attackResults: Record<string, AttackVulnerability>;   // keyed by cookie id
  scenarioComplete: boolean;
  scenarioSummary: string | null;

  // Animation
  isAnimating: boolean;
  currentAnimatingCookieIndex: number;     // for staggered card processing
}

// Security score calculation (pure):
function calculateSecurityScore(cookie: CookieCard): number {
  let score = 0;
  if (cookie.httpOnly) score++;
  if (cookie.secure) score++;
  if (cookie.sameSite === 'Strict' || cookie.sameSite === 'Lax') score++;
  return score;
}

// Attack evaluation (pure):
function evaluateAttack(cookie: CookieCard, scenario: AttackScenario): AttackVulnerability {
  switch (scenario) {
    case 'xss': return cookie.httpOnly ? 'protected' : 'vulnerable';
    case 'http-sniff': return cookie.secure ? 'protected' : 'vulnerable';
    case 'csrf':
      if (cookie.sameSite === 'Strict') return 'protected';
      if (cookie.sameSite === 'Lax') return 'partial';
      return 'vulnerable';
  }
}
```

### Primitives & Props

**DemoSandbox** -- Outer container.
```tsx
<DemoSandbox title="Cookie Lab">
  <CookiePlayground />
</DemoSandbox>
```

**DemoSandbox.Tabs** -- For SameSite and Expires selectors.
```tsx
<DemoSandbox.Tabs options={['(unset)', 'Strict', 'Lax', 'None']} value={sameSite} onChange={setSameSite} />
```

**DialToggle** -- For HttpOnly and Secure toggles.
```tsx
<DialToggle label="HttpOnly" value={httpOnly} onChange={setHttpOnly} />
<DialToggle label="Secure" value={secure} onChange={setSecure} />
```

**StatusDot** -- For cookie security badges.
```tsx
<StatusDot status={cookie.httpOnly ? "success" : "error"} label={cookie.httpOnly ? "HttpOnly" : "No HttpOnly"} />
```

**New bespoke subcomponents (not reusable):**
- `CookieJar` -- grid container with cookie cards and template card
- `CookieCardComponent` -- single cookie card with attributes, security score shields, and attack result overlay
- `CookieBuilderForm` -- the form for creating new cookies with validation
- `AttackScenarioButton` -- styled button for each attack scenario with icon
- `AttackOverlay` -- floating mock element (code block, wifi icon, evil site) that appears during scenarios
- `SecurityShield` -- 16px shield icon with filled/hollow states

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Cookie jar full (> 8 cookies)** | Grid scrolls vertically. Max 12 cookies allowed. After 12, "Bake Cookie" disables with message: "Cookie jar full. Delete a cookie to add more." Each cookie card has a small "X" delete button (8px, top-right corner, appears on hover). |
| **SameSite=None without Secure** | "Bake Cookie" button disables. Red error message. This mirrors real browser behavior -- browsers reject `SameSite=None` without `Secure`. |
| **Empty cookie name** | "Bake Cookie" disabled. Subtle red border on name input after blur. No error text -- just visual cue. |
| **Duplicate cookie name** | Allowed (real browsers allow duplicate names with different domains/paths). But show a warning: "Cookie with this name already exists" in `var(--diagram-layer-3)` `var(--text-xs)`. |
| **Attack during another attack** | Disabled. Scenario buttons become unclickable while an attack is animating (`isAnimating: true`, `pointer-events: none`, `opacity: 0.5`). |
| **Narrow viewport (< 640px)** | Cookie cards go to single column. Builder form and attack buttons stack vertically (builder on top, attacks below). Attack scenario buttons become horizontal pills instead of stacked. |
| **Keyboard navigation** | Tab order: cookie cards (each focusable, arrow keys navigate grid) -> builder inputs -> Bake Cookie button -> attack scenario buttons. Screen reader: each cookie card announces name, value (truncated), and security score: "session_id: user123. Security: 1 of 3 shields. Missing: HttpOnly, SameSite." |
| **Reduced motion** | Card border changes instant. Value float during XSS is instant. Stagger between cards is 0ms -- all results appear simultaneously. |

### Cross-Lesson Connections

- **Depends on sec-xss**: The XSS attack scenario ("XSS Theft") is a direct callback to sec-xss. The reader crafted XSS payloads there; now they see that HttpOnly is the defense against those payloads stealing cookies.
- **Depends on sec-csrf**: The CSRF attack scenario is a direct callback to sec-csrf. The SameSite attribute introduced briefly in sec-csrf's defense scrollytelling is now fully explored with all three values (Strict, Lax, None).
- **Shares playground format with sec-csp**: Both are "configure attributes and test against attacks" playgrounds. The visual language is consistent: green for protected, red for vulnerable, shield icons for security attributes.
- **Feeds sec-oauth**: OAuth tokens stored in cookies need HttpOnly + Secure + SameSite. The reader who completes sec-cookies knows exactly which attributes to set when storing refresh tokens in cookies (as recommended in sec-oauth step 5).

---

## sec-oauth -- OAuth Flow Scrollytelling (4 Tabs)
**Format**: scrollytelling | **Effort**: large

### Interaction State Machine

```
                          +-----------+
                          | tab-1     |  (Auth Code + PKCE tab active, step-0)
                          +-----+-----+
                                |
                     [scroll enters step 1 viewport]
                                |
                          +-----v-----+
                          | pkce-gen  |  (code_verifier + code_challenge generated)
                          +-----+-----+
                                |
                     [scroll enters step 2 viewport]
                                |
                        +-------v-------+
                        | redirect-auth |  (redirect to auth server with challenge)
                        +-------+-------+
                                |
                     [scroll enters step 3 viewport]
                                |
                        +-------v-------+
                        | user-authn    |  (user authenticates, auth code returned)
                        +-------+-------+
                                |
                     [scroll enters step 4 viewport]
                                |
                        +-------v-----------+
                        | token-exchange    |  (code + verifier -> tokens)
                        +-------+-----------+
                                |
                     [scroll enters step 5 viewport]
                                |
                        +-------v-----------+
                        | token-storage     |  (where to store tokens safely)
                        +-------+-----------+
                                |
                     [reader clicks different tab]
                                |
                   +--------+--------+--------+
                   |        |        |        |
              [Tab 2]  [Tab 3]  [Tab 4 --     |
              Client   Auth Code DEPRECATED]  |
              Creds    (server)  Implicit     |
                   |        |        |        |
                   v        v        v        v
              (each tab has its own scroll steps
               and resets to step-0 of that tab)
```

**Data driving each state (Tab 1 -- PKCE):**
- `pkce-gen`: `codeVerifier` and `codeChallenge` values visible, verifier stays in browser
- `redirect-auth`: arrow from Browser to Auth Server carrying client_id + redirect_uri + code_challenge
- `user-authn`: login form on Auth Server, auth code returned via redirect
- `token-exchange`: arrow from Browser to Auth Server carrying code + verifier, tokens returned
- `token-storage`: access token in memory (green), refresh token in HttpOnly cookie (green), token in URL (red X)

### Visual Choreography

**Static layout:**
- Container: `max-width: 800px`, centered. Tab bar at top + ScrollytellingShell per tab.
- **Tab bar**: `DemoSandbox.Tabs` with 4 options:
  - "Auth Code + PKCE" (default, `var(--color-accent)` when active)
  - "Client Credentials" (simple, no tab-specific highlight)
  - "Auth Code (Server)" (server-side variant)
  - "Implicit (DEPRECATED)" (`var(--color-error)` text when active, strikethrough)
- Sticky visual: **sequence diagram** with 4 actor lifelines (Tab 1):
  - **User**: vertical dashed lifeline, `var(--diagram-layer-0)` (blue). Icon: person silhouette (24px). Label: "User".
  - **Browser/SPA**: vertical dashed lifeline, `var(--diagram-layer-1)` (green). Icon: browser (24px). Label: "Browser".
  - **Auth Server**: vertical dashed lifeline, `var(--diagram-layer-2)` (purple). Icon: shield (24px). Label: "Auth Server".
  - **API Server**: vertical dashed lifeline, `var(--diagram-layer-4)` (orange). Icon: server (24px). Label: "API Server". (Appears at step 5 only.)
  - Lifelines: 1px dashed `var(--color-border)`, positioned at 15%, 38%, 62%, 85% of container width. Lifeline labels and icons at top.
- **Color coding for data labels on arrows:**
  - Public data (safe to expose): `var(--color-success)` background at 10% opacity, `var(--color-success)` text.
  - Secrets (must be protected): `var(--color-error)` background at 10% opacity, `var(--color-error)` text.
  - Tokens: `var(--color-accent)` background at 10% opacity, `var(--color-accent)` text.
- Arrows: horizontal lines between lifelines, with arrowheads. Each arrow has a data label block (auto-width, max 200px, `var(--font-mono)` `var(--text-xs)`, colored per data type, `var(--radius-1)` `var(--space-1)` padding) positioned above or below the arrow line.

**Animations per scroll step (Tab 1 -- Auth Code + PKCE):**

1. **PKCE generation** (step index 0):
   - On the Browser lifeline: a computation box fades in (100x60px, `var(--color-surface-2)` bg, dashed border `var(--diagram-layer-1)`). Interior text:
     - Line 1: `code_verifier = "dBjftJeZ4CVP..."` in `var(--color-error)` (secret, 10% bg). Label: "random 128 chars" in `var(--text-xs)` `var(--color-muted)`.
     - Line 2: `code_challenge = SHA256(verifier)` in `var(--color-success)` (public, 10% bg). Label: "hash (safe to send)" in `var(--text-xs)` `var(--color-muted)`.
   - An arrow from line 1 to line 2 with "SHA256" label, showing the derivation. Animates over 400ms.
   - The verifier line has a small lock icon and stays visually anchored to the Browser lifeline (it NEVER leaves).

2. **Redirect to auth server** (step index 1):
   - Arrow from Browser to Auth Server. Long horizontal line, `var(--diagram-layer-2)` dashed. Animated over 500ms.
   - Data label above arrow: three pills:
     - `client_id` -- green (public)
     - `redirect_uri` -- green (public)
     - `code_challenge` -- green (public, safe to send)
   - The `code_verifier` stays at Browser -- a small anchor line connects it to the Browser lifeline with a lock icon. Label: "stays here" in `var(--text-xs)` `var(--color-muted)`.

3. **User authenticates** (step index 2):
   - Arrow from User to Auth Server: "username + password" in red (secret). The Auth Server lifeline flashes briefly.
   - Return arrow from Auth Server back to Browser (via redirect): data label `authorization_code = "SplxlOBeZQQ..."` in `var(--color-accent)` (token).
   - Label below: "One-time use code. Expires in 60s." in `var(--text-xs)` `var(--color-muted)`.

4. **Token exchange** (step index 3):
   - Arrow from Browser to Auth Server. Data label: two pills:
     - `authorization_code` -- accent (token)
     - `code_verifier` -- red (secret, NOW sent)
   - The verifier finally leaves the Browser -- it "detaches" from its anchor (lock icon opens, line breaks) and travels with the arrow. This is a key visual: the verifier was held back until now.
   - Auth Server: a brief "VERIFY" animation. The verifier arrives, and a SHA256 computation box appears (same as step 0 but on the Auth Server lifeline). The result matches the stored code_challenge. A green checkmark appears.
   - Return arrow from Auth Server to Browser: two tokens:
     - `access_token` -- accent (token)
     - `refresh_token` -- accent (token)

5. **Token storage** (step index 4):
   - On the Browser lifeline, two storage containers appear:
     - **Memory** (top): green border, `var(--color-success)`. Contains `access_token`. Shield icon. Label: "In-memory only. Lost on page refresh." in `var(--text-xs)`.
     - **HttpOnly Cookie** (bottom): green border, `var(--color-success)`. Contains `refresh_token`. Cookie + shield icon. Label: "HttpOnly + Secure + SameSite" in `var(--text-xs)`.
   - Below, a WRONG storage option with red X:
     - **localStorage**: red X, `var(--color-error)` border. Label: "XSS can steal it!" in `var(--text-xs)` `var(--color-error)`.
     - **URL fragment**: red X, `var(--color-error)` border. Label: "Visible in history, logs, referrer!" in `var(--text-xs)` `var(--color-error)`.
   - API Server lifeline appears (fades in at right edge). Arrow from Browser to API Server with `Authorization: Bearer <access_token>` label in accent. Green response arrow back.

**Tab 4 -- Implicit (DEPRECATED):**
- A prominent banner at top of the tab content: "DEPRECATED" in white text on `var(--color-error)` background, full width, 40px height, `var(--font-mono)` `var(--text-sm)` bold. A warning triangle icon (16px).
- The sequence diagram is simpler (only 3 steps): redirect to auth server, user authenticates, token returned IN THE URL FRAGMENT.
- At step 3, the token appears in the URL bar (a mock browser address bar): `https://app.com/callback#access_token=eyJhbG...`. The `#access_token=` portion is highlighted in `var(--color-error)` with a red glow.
- Three vulnerability callouts appear sequentially (300ms stagger):
  - "Visible in browser history" -- history icon + red text
  - "Visible in server logs" -- log icon + red text
  - "Accessible via document.location.hash" -- code icon + red text
- Each callout: 180x32px, `var(--color-error-muted)` bg, `var(--color-error)` text, `var(--text-xs)` `var(--font-mono)`, `var(--radius-1)`.

**Reduced motion**: All arrows appear at full extent without travel. Data labels appear at positions without animation. PKCE computation box appears without fade. Verifier "detach" is instant. Token storage containers appear without fade. Deprecated banner appears without animation.

### Teaching Flow (First 60 Seconds)

1. **0s**: Tab 1 "Auth Code + PKCE" is active. Four lifelines visible: User, Browser, Auth Server, API Server (dimmed). Narrative: "PKCE: the browser generates a random secret (verifier) and its hash (challenge)."
2. **Reader scrolls to step 1**: On the Browser lifeline, the computation box appears showing `code_verifier` (red) and `code_challenge = SHA256(verifier)` (green). The SHA256 arrow connects them. The verifier has a lock icon. The reader sees: secret stays in the browser, only the hash is sent.
3. **Reader scrolls to step 2**: Arrow from Browser to Auth Server carrying `client_id`, `redirect_uri`, and `code_challenge` -- all green (public). The verifier stays anchored to Browser with "stays here" label. Narrative: "The code verifier is NOT sent yet."
4. **Reader scrolls to step 3**: User authenticates. Auth code returns to Browser. Narrative: "A one-time-use authorization code."
5. **Reader scrolls to step 4**: The verifier finally detaches from Browser and travels with the auth code to Auth Server. The verification animation plays. Tokens return. Narrative: "The auth server checks the verifier against the stored challenge -- proof that the same browser started and finished the flow."
6. **Reader scrolls to step 5**: Token storage visualization. Access token in memory (green shield). Refresh token in HttpOnly cookie (green shield). localStorage and URL fragment shown with red X. The reader now knows WHERE to store each token.
7. **Reader clicks Tab 4 "Implicit"**: DEPRECATED banner. The token appears directly in the URL. Three vulnerability callouts stack up in red. The contrast with PKCE is immediate.

### Data & State Shape

```typescript
type OAuthTab = 'pkce' | 'client-creds' | 'server-auth-code' | 'implicit';
type DataSensitivity = 'public' | 'secret' | 'token';

interface SequenceArrow {
  id: string;
  from: string;                           // lifeline ID
  to: string;                             // lifeline ID
  dataLabels: {
    text: string;
    sensitivity: DataSensitivity;         // determines color
  }[];
  annotation?: string;                    // small text below arrow
  delayMs: number;
  durationMs: number;
}

interface LifelineActor {
  id: string;
  label: string;
  icon: string;                           // SVG identifier
  color: string;                          // CSS variable
  xPercent: number;                       // horizontal position as % of container
  visibleFromStep: number;                // step index when this actor becomes visible
}

interface OAuthTabConfig {
  id: OAuthTab;
  label: string;
  isDeprecated: boolean;
  actors: LifelineActor[];
  scrollSteps: {
    visual: string;
    narrative: string;
    arrows: SequenceArrow[];
    annotations?: { actorId: string; content: string; position: 'left' | 'right' }[];
  }[];
}

interface OAuthScrollyState {
  // Tab
  activeTab: OAuthTab;

  // Scroll (per tab)
  activeStepIndex: number;                // -1 to N (varies per tab)

  // PKCE-specific (Tab 1)
  codeVerifier: string;                   // displayed value (truncated)
  codeChallenge: string;                  // displayed value (truncated)
  verifierDetached: boolean;              // true at step 3 when verifier leaves Browser

  // Animation
  isAnimating: boolean;
  completedArrows: Set<string>;           // IDs of arrows that have finished animating
}

// Tab configurations (static data):
const OAUTH_TABS: OAuthTabConfig[] = [
  {
    id: 'pkce',
    label: 'Auth Code + PKCE',
    isDeprecated: false,
    actors: [
      { id: 'user', label: 'User', icon: 'person', color: 'var(--diagram-layer-0)', xPercent: 15, visibleFromStep: 0 },
      { id: 'browser', label: 'Browser', icon: 'browser', color: 'var(--diagram-layer-1)', xPercent: 38, visibleFromStep: 0 },
      { id: 'auth', label: 'Auth Server', icon: 'shield', color: 'var(--diagram-layer-2)', xPercent: 62, visibleFromStep: 0 },
      { id: 'api', label: 'API Server', icon: 'server', color: 'var(--diagram-layer-4)', xPercent: 85, visibleFromStep: 4 },
    ],
    scrollSteps: [/* 5 steps as described above */],
  },
  {
    id: 'client-creds',
    label: 'Client Credentials',
    isDeprecated: false,
    actors: [
      { id: 'server', label: 'Your Server', icon: 'server', color: 'var(--diagram-layer-1)', xPercent: 30, visibleFromStep: 0 },
      { id: 'auth', label: 'Auth Server', icon: 'shield', color: 'var(--diagram-layer-2)', xPercent: 70, visibleFromStep: 0 },
    ],
    scrollSteps: [/* 2 steps: send client_id + client_secret, receive access_token */],
  },
  {
    id: 'server-auth-code',
    label: 'Auth Code (Server)',
    isDeprecated: false,
    actors: [
      { id: 'user', label: 'User', icon: 'person', color: 'var(--diagram-layer-0)', xPercent: 15, visibleFromStep: 0 },
      { id: 'browser', label: 'Browser', icon: 'browser', color: 'var(--diagram-layer-1)', xPercent: 35, visibleFromStep: 0 },
      { id: 'server', label: 'Your Server', icon: 'server', color: 'var(--diagram-layer-4)', xPercent: 55, visibleFromStep: 0 },
      { id: 'auth', label: 'Auth Server', icon: 'shield', color: 'var(--diagram-layer-2)', xPercent: 80, visibleFromStep: 0 },
    ],
    scrollSteps: [/* 4 steps: redirect, authenticate, server exchanges code for tokens, stores securely */],
  },
  {
    id: 'implicit',
    label: 'Implicit (DEPRECATED)',
    isDeprecated: true,
    actors: [
      { id: 'user', label: 'User', icon: 'person', color: 'var(--diagram-layer-0)', xPercent: 20, visibleFromStep: 0 },
      { id: 'browser', label: 'Browser', icon: 'browser', color: 'var(--diagram-layer-1)', xPercent: 50, visibleFromStep: 0 },
      { id: 'auth', label: 'Auth Server', icon: 'shield', color: 'var(--diagram-layer-2)', xPercent: 80, visibleFromStep: 0 },
    ],
    scrollSteps: [/* 3 steps: redirect, authenticate, token in URL fragment */],
  },
];
```

### Primitives & Props

**ScrollytellingShell** -- Wraps scroll steps per active tab.
```tsx
<ScrollytellingShell
  steps={activeTabConfig.scrollSteps}
  renderVisual={(stepIndex) => (
    <OAuthSequenceDiagram
      actors={activeTabConfig.actors}
      stepIndex={stepIndex}
      arrows={activeTabConfig.scrollSteps[stepIndex]?.arrows ?? []}
    />
  )}
/>
```

**DemoSandbox** -- Outer container with tab bar.
```tsx
<DemoSandbox title="OAuth Flows">
  <DemoSandbox.Tabs
    options={['Auth Code + PKCE', 'Client Credentials', 'Auth Code (Server)', 'Implicit (DEPRECATED)']}
    value={activeTab}
    onChange={setActiveTab}
  />
  <ScrollytellingShell ... />
</DemoSandbox>
```

**New bespoke subcomponents (not reusable):**
- `OAuthSequenceDiagram` -- sequence diagram with actor lifelines and animated arrows
- `LifelineColumn` -- single vertical dashed line with icon, label, and anchored data boxes
- `SequenceArrowComponent` -- horizontal arrow between lifelines with color-coded data labels
- `PKCEComputeBox` -- computation visualization for verifier/challenge generation
- `TokenStorageVisualization` -- the token storage comparison (memory vs cookie vs localStorage vs URL)
- `DeprecatedBanner` -- red banner with DEPRECATED warning for Tab 4
- `VulnerabilityCallout` -- red callout boxes for Implicit flow vulnerabilities
- `DataLabel` -- pill-shaped label with sensitivity-based color coding (public/secret/token)

### Edge Cases

| Scenario | Handling |
|----------|----------|
| **Tab switch mid-scroll** | Scroll position resets to top of new tab. Previous tab's state is preserved (so switching back resumes where the reader left off). Transition: current tab content fades out (150ms), new tab content fades in (150ms). |
| **Tab 4 (Implicit) first** | Works fine -- the DEPRECATED banner is prominent. But a tooltip on the tab encourages: "Start with Tab 1 (Auth Code + PKCE) for the recommended approach." |
| **Fast scrolling through sequence steps** | Arrows appear at full extent. Data labels appear at final positions. Verifier computation appears without animation. Same accumulation principle as other scrollytelling. |
| **Scroll back up** | Arrows fade out in reverse order. Data labels disappear. PKCE compute box hides when scrolling above step 0. Token storage containers hide above step 4. |
| **Narrow viewport (< 640px)** | Lifelines collapse to 2 per row (User + Browser row, Auth Server + API Server row). Arrows become diagonal or use curved paths. Data label pills stack vertically instead of horizontally. Tab bar becomes scrollable horizontally. |
| **Keyboard navigation** | Tab bar is keyboard navigable (arrow keys switch tabs). Each scroll step is focusable. Screen reader announces data flow: "Browser sends client_id, redirect_uri, and code_challenge to Auth Server." Data sensitivity is announced: "client_id (public), code_verifier (secret)." |
| **Reduced motion** | All arrows appear at full extent. PKCE computation appears without animation. Verifier detachment is instant. Token storage containers appear without fade. Tab transitions are instant. |
| **Very wide viewport (> 1200px)** | Lifelines spread further apart. Arrow labels have more room. Max container width prevents excessive spreading: `max-width: 800px`. |

### Cross-Lesson Connections

- **Depends on sec-cookies**: Token storage (step 5) directly references HttpOnly + Secure + SameSite for the refresh token cookie. The reader needs sec-cookies knowledge to understand why these attributes matter.
- **Depends on sec-cors**: The token exchange request (step 3) is a cross-origin request from the SPA to the auth server. CORS must be configured on the auth server's token endpoint. If the reader has completed sec-cors, they understand why this works (the auth server sends `Access-Control-Allow-Origin` for the SPA's origin).
- **References sec-csrf**: PKCE partly defends against a CSRF-like attack on the authorization code. If an attacker intercepts the code (e.g., through a malicious redirect), they can't exchange it without the verifier. The reader who completed sec-csrf understands the "forged request" concept.
- **References sec-xss**: The "don't store tokens in localStorage" warning at step 5 is directly motivated by sec-xss. If an attacker achieves XSS, they can read localStorage. The reader who completed sec-xss has personally exploited `document.cookie` -- they understand why in-memory is safer.
- **Ties the entire section together**: sec-oauth is the capstone. It references XSS (token theft), CSRF (code interception), CORS (token exchange), cookies (token storage), and CSP (defense-in-depth). The reader who has completed all 5 previous stops has the full context to understand OAuth security.
