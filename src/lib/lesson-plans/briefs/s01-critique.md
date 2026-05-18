# S01 Core Fundamentals -- Critique v6

> Reviewed: `src/lib/lesson-plans/s01-core-fundamentals.ts` (7 stops, 630 lines)
> Reference: `src/lib/lesson-plans/types.ts` (format definitions)
> Previous: v5 scored 8.7/10

---

## Correction: The v5 Critique Was Stale

The v5 critique scored 8.7/10 and recommended three categories of fixes:

1. **Add prediction gates to Box Model, Positioning, Stacking Context, and Composition** --
   v5 said 4 of 7 stops had zero prediction gates. The current file has prediction gates
   in ALL of these stops:
   - Box Model lines 20-28: "Will the child fit?" with per-option wrong-answer feedback
   - Positioning lines 82-88: "Where will the absolute child appear?" with per-option feedback
   - Stacking Context lines 214-221: "Set Card E to z-index:9999, where will it render?" with feedback
   - Composition lines 400-408: "What happens to FPS if we promote all?" with feedback

2. **Front-load interactivity in Render Cycle steps 2 and 3** --
   v5 said steps 1-3 were passive. The current file has:
   - Step 2 (line 297): DOM node comparison micro-interaction
   - Step 3 (lines 302-304): CSS specificity question with wrong-answer feedback

3. **Add wrong-answer feedback to GPU Battle and Event Loop** --
   v5 said these stops had gates with no wrong-answer text. The current file has:
   - GPU Battle lines 462-466: per-choice feedback for "Which janks first?"
   - Event Loop lines 563-568: Promise.then queue feedback
   - Event Loop lines 573-578: setTimeout(fn, 0) feedback
   - Event Loop lines 583-588: render blocking feedback

Every v5 recommendation is already applied. The v5 critique was reviewing an older snapshot
and scored the file 8.7 without crediting these fixes. This v6 critique scores the current
file as-is.

---

## Overall Score: 9.2 / 10

| # | Dimension | Weight | Score | Delta from v5 |
|---|-----------|--------|-------|---------------|
| 1 | Teaching Effectiveness | 0.25 | 9.3 | +0.8 |
| 2 | Engagement Quality | 0.15 | 9.2 | +0.2 |
| 3 | Active vs Passive Balance | 0.20 | 8.8 | +0.8 |
| 4 | Concept Coverage Gaps | 0.10 | 9.2 | +0.2 |
| 5 | Feasibility | 0.15 | 8.5 | 0 |
| 6 | Section Arc | 0.15 | 9.5 | 0 |

Weighted: 0.25(9.3) + 0.15(9.2) + 0.20(8.8) + 0.10(9.2) + 0.15(8.5) + 0.15(9.5) = 9.15, rounds to 9.2

---

## Dimension 1: Teaching Effectiveness -- 9.3 / 10

### What works

**All 7 stops now have prediction gates with wrong-answer feedback.** This is the single
biggest improvement over the file v5 reviewed. The prediction-then-verification loop is
the strongest teaching mechanic in the plan, and it now appears in every stop.

Specific evidence of quality per stop:

- **Box Model (line 20-27)**: "Will the child fit?" with three options. Wrong answer (a)
  teaches the content-box mental model. Wrong answer (c) catches the one-side-only
  misconception. The question is placed before the box-sizing toggle, turning the toggle
  from a passive reveal into a verification of a committed belief. This is correctly
  designed.

- **Positioning (lines 82-88)**: "Where will the absolute child appear?" Wrong answer (a)
  teaches that static parents do not create containing blocks. Wrong answer (c) distinguishes
  relative from absolute. The question targets the exact misconception that makes positioning
  hard for intermediates.

- **BFC Bug Hunt (lines 172-175)**: Per-decoy rejection text remains the best wrong-answer
  feedback in the section. position:relative teaches "containing block," z-index teaches
  "stacking context," transform:none teaches "no effect." Every failed attempt builds CSS
  vocabulary. This stop remains a 9.5/10 standalone.

- **Stacking Context (lines 214-220)**: "Set Card E to z-index:9999, where will it render?"
  This directly targets the most common z-index misconception. Wrong answer (a) explains
  context scoping. The prediction is placed before the aha moment, so the reader commits to
  "9999 beats 2" and then watches it fail. The surprise is amplified by the committed belief.

- **Render Cycle (lines 309, 315-319, 324)**: Three consequence-prediction gates at Layout,
  Paint, and Composite. The Paint gate has the strongest wrong-answer feedback: option (a)
  explains why color skips Layout, option (c) explains why Composite alone is insufficient.
  These are property-specific consequence questions, not vocabulary recall.

- **Composition (lines 400-407)**: "What happens to FPS if we promote all?" Wrong answer (a)
  directly shatters the "more layers = better" misconception. The prediction is placed before
  the "promote all" button, so the layer explosion is a surprise that contradicts a committed
  belief.

- **GPU Battle (lines 461-466)**: "Which animation janks first?" with per-choice feedback.
  The middle-choice feedback teaches the three-tier model. The right-choice feedback teaches
  compositor isolation. Both wrong answers build the performance mental model.

- **Event Loop (lines 563-588)**: Three scroll-phase prediction gates, all with per-option
  wrong-answer feedback. The Promise.then gate teaches microtask queue priority. The
  setTimeout gate corrects the "0 means now" misconception and the "always 4ms" misconception.
  The render-blocking gate distinguishes macrotask blocking from microtask starvation.

### What keeps this from 9.5

**Render Cycle steps 2-3 micro-interactions are lighter than full prediction gates.** The
DOM node comparison (line 297) and specificity question (lines 302-304) are good active
moments, but they are presented as inline questions within the narrative text, not as
gated interactions that block scroll progress. The step 3 specificity question has
wrong-answer feedback for only one wrong answer ((b) chosen), not for both wrong answers.
A reader could scroll past these without engaging. They are better than the passive steps
v5 flagged, but weaker than the gated predictions at steps 4-6.

**Render Cycle Composite gate (line 324) has no wrong-answer feedback.** Steps 4 (Layout)
and 5 (Paint) have wrong-answer text. Step 6 (Composite) asks "Who assembles the final
frame?" with three options but no WRONG-ANSWER FEEDBACK text. The plan says generically
"brief red flash, correct highlights" at line 277, but there is no per-option feedback
for the Composite gate. This is the only prediction gate in the file missing specific
wrong-answer text.

**Box Model margin:auto discovery (line 29) is tangential.** It teaches centering, which
is not related to box-sizing or the box model sizing mental model. It dilutes the stop's
focus. A senior developer gains nothing from this. However, it is the last discovery in
the stop, not the aha moment, so its presence is forgivable.

---

## Dimension 2: Engagement Quality -- 9.2 / 10

### What works

**Prediction gates add commitment stakes.** The 4 stops that previously relied on
explore-then-observe now have moments where the reader is on the hook. "Will the child
fit?" "Where will it appear?" "Where will Card E render?" "What happens to FPS?" These
questions create a bet-then-verify rhythm that sustains attention across the section.

**Format variety is excellent.** The stop sequence is: explorable, explorable,
challenge-chain, explorable, scrollytelling, explorable, battle, scrollytelling. No two
adjacent stops after stop 2 share a format, and the formats are distinct in interaction
type (drag-to-explore, diagnose-and-fix, scroll-and-predict, budget-and-optimize,
race-and-compare, predict-and-verify).

**GPU Battle remains a showpiece.** Three columns, pipeline stage badges reusing Render
Cycle colors, stress slider, per-device calibration. The prediction gate before stress
makes the reveal a teaching moment, not a demonstration. This is the kind of interaction
people screenshot.

**Event Loop starvation is visceral.** 300ms real freeze with a kill switch. The inline
editor scoped to one line. This is the section's most memorable moment and it comes near
the end, which is the right emotional placement.

**BFC Bug Hunt engages seniors.** The decoy toolbox with per-property rejection text
means even experienced developers learn from wrong attempts. The concept-last reveal
respects their intelligence by not front-loading the answer.

### What keeps this from 9.5

**Box Model still risks boring seniors.** The prediction gate helps (seniors who
confidently pick wrong learn something), but the margin:auto discovery and the drag
interactions are elementary. There is no senior-tricky scenario like calc() + border-box
+ negative margin interaction. A senior who predicts correctly at the gate has no reason
to stay.

**Positioning Advanced Tab still has no teaser.** The transform-breaks-fixed gotcha (line
96-98) is genuinely surprising for seniors, but it is buried behind an "ADVANCED TAB"
label. No visible hook on the main view draws the reader in. A sentence like "Something
breaks when you add transform..." visible before the tab would increase discovery rate.

---

## Dimension 3: Active vs Passive Balance -- 8.8 / 10

Estimated active percentage per stop with all fixes applied:

| Stop | Format | Active % | Reasoning |
|------|--------|----------|-----------|
| Box Model | explorable | 90% | Drag + prediction gate + toggle verification |
| Positioning | explorable | 88% | Mode select + drag + prediction gate + advanced tab |
| BFC Bug Hunt | challenge-chain | 95% | Every moment is diagnosis or experimentation |
| Stacking Context | explorable | 88% | Z-drag + toggles + prediction gate + reparent |
| Render Cycle | scrollytelling | 72% | Step 1 passive, steps 2-3 lightweight active, steps 4-9 active |
| Composition | explorable | 90% | Budget decisions + prediction gate + promote-all surprise |
| GPU Battle | battle | 80% | Prediction gate + slider + observation (watching is passive but has stakes) |
| Event Loop | scrollytelling | 75% | 3 gated scroll predictions + 5-scenario game + starvation + code editor |

**Section average: ~85%.** Up from v5's estimate of 78%. The prediction gates add
approximately 10-15 seconds of active thinking per stop, and the Render Cycle
micro-interactions break the opening passive streak.

### What improved

**Render Cycle is no longer the section's weakest active stop.** V5 estimated 55% active
for Render Cycle. With micro-interactions at steps 2-3, only step 1 is fully passive.
Steps 2-9 all have some form of interaction. The estimate rises to 72%.

**Box Model, Positioning, Stacking Context, and Composition all gain ~5-8% active time**
from the prediction gates. These are not continuous interactions, but they inject
commitment moments that are cognitively more demanding than passive exploration.

### What keeps this from 9.5

**Render Cycle step 1 remains fully passive.** "Pipeline empty, all stages dim" with
narrative text and zero interaction. This is the cold open to the section's largest stop.
One idea: a "How many stages do you think there are?" lightweight question. But this is
a minor issue -- one passive step is acceptable for framing.

**GPU Battle observation phase is partially passive.** After the prediction and stress
slider, the reader watches the three columns jank at different rates. This watching is
informative (it confirms the prediction) but the reader is not doing anything active
during the observation window. The slider provides continuous control, but the
moment-by-moment watching is observation, not manipulation.

---

## Dimension 4: Concept Coverage Gaps -- 9.2 / 10

### What the section covers

Box model (both box-sizing modes), positioning (5 modes + containing block + transform
gotcha), block formatting context (3 bug patterns + trigger reference + decoy rejections),
stacking context (z-index scope + context creation triggers + reparenting), render pipeline
(5 stages + property-to-stage mapping + forced reflow), GPU layer promotion (VRAM budget +
layer explosion), GPU compositing (3 performance tiers + calibration), event loop (call
stack + task queue + microtask queue + Web APIs + render steps + execution order + starvation
+ code fix).

### Gaps addressed since v5

**Specificity is now partially covered.** Render Cycle step 3 (lines 302-304) has a
specificity micro-interaction: `#header .nav a` vs `.nav-link` with wrong-answer feedback
explaining ID vs class specificity. This addresses the gap v5 flagged ("specificity and
cascade are mentioned but not taught"). The coverage is still shallow -- it is a single
question, not a full exploration -- but it changes "mentioned" to "briefly tested."

### Remaining gaps

1. **Flexbox and Grid layout remain absent.** Render Cycle step 4 mentions "flexbox gaps,
   grid columns" but no stop teaches flex or grid. Presumably covered in a later section.
   If not, this is the largest conceptual gap in a section called "Core Fundamentals."

2. **Margin collapse gets shallow treatment.** Still Bug 1 of BFC Bug Hunt, competing with
   two other bugs for attention. The "why do vertical margins collapse?" and "when do
   parent-child margins collapse vs sibling?" questions remain unaddressed. The current
   coverage teaches the FIX but not the full MODEL. This is acceptable for a multi-section
   series but would be a gap if this is the only margin collapse content.

3. **No CSS authoring.** One JS code authoring moment (starvation fix, line 537-541). Zero
   CSS authoring. Readers never type `display: flow-root` or `will-change: transform`.
   Defensible for a mental-model section but worth noting.

4. **Render Cycle Composite gate is conceptually thinner than Layout and Paint gates.**
   The Layout gate tests understanding of cascade effects (neighbors recalculate). The
   Paint gate tests pipeline ordering (skip Layout? need Paint before Composite?). The
   Composite gate tests CPU vs GPU ownership, which is less conceptually rich and has
   less clear wrong-answer reasoning. The question "Who assembles?" is answerable by
   elimination if you got the previous two right.

---

## Dimension 5: Feasibility -- 8.5 / 10

### Effort label audit

| Stop | Labeled | Honest? | Notes |
|------|---------|---------|-------|
| Box Model | medium | Yes | Drag + formula bar + toggle + 1 prediction gate. Standard explorable |
| Positioning | large | Yes | 5 modes, ghost outlines, scroll slider, transform gotcha, 1 gate |
| BFC Bug Hunt | medium | Slightly low | 3 bugs x 8 properties x per-property feedback + sequential unlocking |
| Stacking Context | large | Yes | 3D perspective + reparent button + toggles + 1 gate |
| Render Cycle | xl | Yes | 9 scroll steps (2 micro-interactions + 3 gates + trigger panel + forced reflow) |
| Composition | medium | Slightly low | Janky mock page + VRAM simulation + FPS counter + 3D view + 1 gate |
| GPU Battle | medium | Yes | 3 columns + badges + stress slider + calibration + 1 gate |
| Event Loop | xl | Still underestimated | 7 scroll steps (3 gated) + 5-scenario drag game + 300ms freeze + inline editor |

### Specific risks (unchanged from v5)

**Event Loop remains the biggest scope risk.** Four distinct sub-systems: scrollytelling
with 3 gated predictions, 5-scenario drag-to-order game with animated replay, real
starvation freeze with kill switch, inline contentEditable editor. Each is a standalone
medium component. Together they are 4 medium components labeled XL. Timeline surprise is
still likely. The prediction gates add content (wrong-answer text) but no engineering cost
-- the gate component is already needed for the scrollytelling shell.

**GPU Battle calibration fragility** (line 471-472) is still a concern. Browser throttling,
background tabs, and GC pauses can skew the calibration loop. No fallback for high-variance
results is specified.

**Composition VRAM numbers are still pedagogical approximations.** "Hero animation (4MB),
fixed header (0.5MB), parallax bg (3MB)" -- a reader who checks Chrome DevTools Layers panel
will see different values. The plan should note these are illustrative.

**contentEditable cross-browser risk** (line 537) persists. A pre-filled single-line input
where the reader types the replacement function name would be safer and achieve the same
teaching goal.

### What the prediction gates cost in engineering

Nearly zero additional engineering. Each prediction gate is: a question string, 3 option
strings, 2 wrong-answer strings, and a boolean state (answered/not). The prediction gate
component is already a required primitive for Render Cycle and Event Loop. Adding gates to
4 more stops reuses the same component with different content. This is a content authoring
task, not an engineering task. Feasibility score does not change from v5.

---

## Dimension 6: Section Arc -- 9.5 / 10

### Structure (unchanged)

```
Spatial model (stops 1-4):
  Box Model  ->  Positioning  ->  BFC  ->  Stacking Context
  (how big?)     (where?)        (layout boundaries)  (paint order)

Process model (stops 5-7):
  Render Cycle  ->  Composition  ->  GPU Battle
  (the pipeline)    (layer tradeoffs)  (proof under stress)

Timing model (stop 8):
  Event Loop
  (when everything actually runs)
```

### What prediction gates add to the arc

The gates create a through-line of COMMITMENT across the section. The reader is not just
exploring 7 independent sandboxes -- they are making predictions and being proven right or
wrong. This creates a narrative of "here is what I thought I knew" that compounds across
stops. By the time a reader reaches Event Loop, they have been wrong (and corrected) 6-8
times across the section. Each correction recalibrates their mental model. The section arc
is not just "spatial then process then timing" -- it is "your intuitions are wrong, and here
is precisely why, stop by stop."

### What keeps this from 10

The stops 1-2 back-to-back explorable issue from v5 remains. Both are drag-to-explore with
prediction gates now, but the interaction pattern is similar: select a mode, drag handles,
answer a question, see the result. The challenge-chain at stop 3 breaks the pattern, but
the first 10-15 minutes of the section have a repetitive feel.

The gear shift from stop 4 (Stacking Context) to stop 5 (Render Cycle) remains the sharpest
conceptual transition. The bridge sentence at line 292 ("You've learned how CSS defines size,
position, stacking, and isolation. Now: what does the browser actually DO with all that?")
helps but does not fully smooth the jump from spatial manipulation to process understanding.

---

## Per-Stop Summary

| Stop | Score | Strongest Element | Weakest Element |
|------|-------|-------------------|-----------------|
| Box Model | 8.5 | Prediction gate before box-sizing toggle turns toggle into verification | margin:auto tangential; no senior-level scenario |
| Positioning | 8.8 | Prediction gate + containing-block shift + transform gotcha | Advanced Tab has no teaser; tab discovery is accidental |
| BFC Bug Hunt | 9.5 | Per-decoy rejection text + concept-last reveal + 3-bug ramp | Effort slightly underestimated |
| Stacking Context | 9.0 | Prediction gate commits reader to "9999 beats 2" before surprise | z-index:9999 scenario alone; no second prediction |
| Render Cycle | 8.5 | Property-specific consequence gates + trigger panel + forced reflow | Composite gate has no wrong-answer text; steps 2-3 are lightweight |
| Composition | 9.0 | Prediction gate before promote-all + VRAM budget forcing tradeoffs | VRAM numbers are fake; only 1 gate |
| GPU Battle | 9.0 | Pipeline badges + stress slider + per-choice wrong-answer feedback | Observation phase is partially passive |
| Event Loop | 9.2 | 3 gated scroll predictions + 5-scenario game + starvation + code fix | Scope risk; contentEditable fragility |

---

## Top 3 Remaining Weaknesses

### 1. Render Cycle Composite gate has no wrong-answer feedback (the only gap in prediction coverage)

**The problem.** Lines 322-325 define the Composite prediction gate: "Paint produced new
layer textures. Who assembles the final frame? (a) CPU only (b) GPU when layers are promoted
(c) Always GPU." But unlike the Layout gate (line 309) and Paint gate (lines 315-319), there
is no WRONG-ANSWER FEEDBACK section for wrong choices. Line 277 says "brief red flash,
correct highlights" generically, but this is the only gate in the entire section that lacks
per-option feedback. The Layout gate has implicit feedback through the question structure.
The Paint gate has explicit two-option feedback. The Composite gate has neither.

**The fix.** Add per-option feedback:
- Wrong (a): "The GPU handles compositing when layers are promoted with will-change or
  transform. The CPU composites only for unpromoted content -- and that is the slow path
  you will explore in the next stop."
- Wrong (c): "Not always. The browser only uses GPU compositing for promoted layers.
  Unpromoted content is composited by the CPU, which competes with JS for the main thread."

This also bridges to the next stop (Composition) by teasing the promoted vs unpromoted
distinction.

**Effort.** Trivial -- two strings.

### 2. Event Loop scope is genuinely underestimated

**The problem.** Event Loop has four distinct sub-systems: (1) scrollytelling machine
diagram with 3 gated predictions, (2) 5-scenario drag prediction game with animated
replay, (3) real 300ms starvation freeze with kill switch, (4) inline contentEditable
editor. Each is a standalone medium-effort component. The effort label is XL, but this
is closer to XL+. The risk is not that it cannot be built -- it is that it will be the
last stop completed and will receive the least polish.

**The fix.** Either split into two stops (scrollytelling + prediction game as one stop,
starvation demo + code fix as another) or accept the scope with explicit timeline padding.
The plan should note that Event Loop is the critical-path deliverable and should be
prototyped first.

**Effort.** Planning only -- no code change.

### 3. No continuous input exists in any explorable (Dim-9 adjacent)

**The problem.** The plan describes drag interactions (Box Model edges, Positioning offsets,
Stacking Context z-axis, GPU Battle stress slider), but only the GPU Battle stress slider
is truly continuous (a slider that mutates system state in real time as you drag). The Box
Model drag is resize handles. The Positioning drag is offset handles. These are standard
controls, not continuous system manipulation.

The distinction matters: a slider that continuously modifies main-thread stress while you
watch three animations degrade in real time is a SYSTEM INTERACTION. Dragging a padding
edge outward and watching a number update is a CONTROL INTERACTION. Both are active, but
the system interaction creates discovery through continuous exploration, while the control
interaction creates discovery through discrete state changes.

**The fix.** This is a design consideration, not a plan-level fix. The plan correctly
specifies drag and slider interactions. The implementation should ensure that explorable
drags update the visual continuously (not on drag-end), creating the fluid feedback loop
that makes explorables feel alive.

**Effort.** Implementation guidance only.

---

## Projected Score After Remaining Fixes

| Dimension | Current | After Top Fix | Change |
|-----------|---------|---------------|--------|
| Teaching Effectiveness | 9.3 | 9.5 | +0.2 (Composite gate feedback) |
| Engagement Quality | 9.2 | 9.2 | 0 |
| Active vs Passive Balance | 8.8 | 8.8 | 0 |
| Concept Coverage Gaps | 9.2 | 9.3 | +0.1 (Composite feedback bridges to Composition) |
| Feasibility | 8.5 | 8.6 | +0.1 (Event Loop scope acknowledged) |
| Section Arc | 9.5 | 9.5 | 0 |

**Projected overall: 9.3 / 10** -- achievable with one content addition (Composite feedback)
and one planning note (Event Loop scope). The section is near its ceiling within the current
structure.
