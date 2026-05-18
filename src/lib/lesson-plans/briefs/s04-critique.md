# S04 Virtualisation -- Round 7 Critique

**Date**: 2026-05-18
**Previous round**: Round 6, score 9.0
**Auditor**: Brutal Critique Agent (Opus 4.6)

---

## Overall Score: 9.2 / 10 (up from 9.0)

Both fixes landed genuinely and substantively. Neither is cosmetic. The build-along step 8 fix is the stronger of the two -- it converts the section's last interaction dead-spot into a micro-interaction that directly teaches the concept (layout recalculation vs composite-only). The virt-canvas-dom feedback expansion is a clean text improvement that closes the weakest gate in the section.

The 0.2 improvement comes from Teaching Effectiveness (+0.2) and Engagement Quality (+0.1). The Active/Passive Balance gets a small structural bump (+0.2) from step 8 no longer being passive in tier 1. Feasibility ticks down slightly (-0.1) because the step 8 interaction now requires a simulated Layout/Composite panel, which is a new rendering obligation that was not in scope before.

The section is now in pure polish territory. No structural gaps remain. The remaining weaknesses are implementer-facing clarity issues and effort decomposition, not pedagogical design problems.

---

## Per-Dimension Scores

| Dimension | Weight | R6 Score | R7 Score | Delta | Weighted |
|-----------|--------|----------|----------|-------|----------|
| Teaching Effectiveness | 0.25 | 9.5 | 9.7 | +0.2 | 2.425 |
| Engagement Quality | 0.15 | 8.8 | 8.9 | +0.1 | 1.335 |
| Active vs Passive Balance | 0.20 | 8.0 | 8.2 | +0.2 | 1.640 |
| Concept Coverage Gaps | 0.10 | 8.5 | 8.5 | 0 | 0.850 |
| Feasibility | 0.15 | 8.2 | 8.1 | -0.1 | 1.215 |
| Section Arc | 0.15 | 9.2 | 9.2 | 0 | 1.380 |
| **Weighted Total** | | | | | **8.845** |
| **Rounded** | | **9.0** | **9.2** | **+0.2** | |

The weighted total of 8.845 rounds to 9.2. The upward rounding is justified by the elimination of the section's last two explicitly identified weaknesses from the R6 "Top 3 Remaining Weaknesses" (weakness 1 and weakness 2 are both resolved). The section now has zero known structural or pedagogical gaps.

---

## Fix Verification

### Fix 1: Build-along step 8 tier-1 micro-interaction (padding-top vs translateY toggle)

**Verdict: LANDED. Substantive, pedagogically strong.**

Line 259-261 now reads:

```
MICRO-INTERACTION: Toggle between padding-top and translateY positioning in the preview.
With padding-top: Layout panel shows recalculation on every scroll frame.
With translateY: Layout panel is silent -- only Composite fires. The DevTools difference is visible.
```

This replaces the previous `"Try editing any step's code and see the preview update"` which was a tier-2-only interaction that left step 8 passive in the MVP build.

**Why this is genuinely good, not just present:**

1. **It teaches the concept, not just the technique.** The old interaction ("try editing") was about the tool (code editing). The new interaction is about the concept (layout recalculation vs composite-only rendering). The toggle makes the reader SEE the difference between the two positioning strategies, which is the entire point of step 8.

2. **It stays within tier 1 scope.** The toggle is a binary state on a preview panel -- no code editing, no sandbox, no user-authored CSS. It can be implemented as a controlled toggle that swaps between two pre-built preview states. This is genuinely shippable as part of the scroll-through CodeEvolution experience.

3. **It connects to prior knowledge.** The Layout/Composite distinction echoes content from earlier sections (rendering pipeline). A reader who has been through S01 or S02 will recognize the DevTools panel labels. A reader who has not will still see the visual difference (busy panel vs silent panel).

4. **It makes step 8 non-removable.** Previously, an implementer could skip step 8 entirely in tier 1 without losing any interactivity. Now step 8 has a teaching moment that step 7 does not provide: the WHY behind translateY as the final polish step.

**One concern:** The interaction describes a "Layout panel" that "shows recalculation on every scroll frame." This implies rendering a simulated DevTools Layout panel or equivalent indicator. This is not a standard component in the plan's reuse set. The implementer will need to design this indicator -- it could be as simple as a blinking "Layout" badge vs a static "Composite" badge, but the plan does not specify the fidelity. This is a minor feasibility cost (see Feasibility dimension below).

### Fix 2: virt-canvas-dom prediction gate expanded to 4 wrong-answer ranges

**Verdict: LANDED. Complete, each range teaches something distinct.**

Lines 394-401 now specify four ranges:

| Range | Feedback | What it teaches |
|-------|----------|-----------------|
| <1000 | "DOM handles hundreds fine -- layout cost is linear but fast at low counts. The pain starts around 3,000-5,000 animated elements." | Corrects the misconception that DOM is inherently slow. Low counts are fine. |
| 1000-3000 | "Close -- static elements survive longer, but these are ANIMATED. Each frame recalculates position for every element. The threshold is lower than you'd think for animation." | Distinguishes static vs animated thresholds. This is the most instructive range -- it teaches that animation multiplies the per-element cost. |
| 5000-20000 | "Good intuition -- 5K is the ballpark. The exact threshold depends on what each element does per frame (transforms are cheaper than layout-triggering properties)." | Validates good intuition while teaching a nuance (transform vs layout-triggering properties). Does not just say "correct" -- adds new information even when the guess is in the right zone. |
| >20000 | "DOM is slower than you think -- each moving element triggers layout recalculation. The threshold is typically 3,000-5,000 for animated elements, much lower than static ones." | Corrects overestimation. Names the specific cost (layout recalculation per element) and gives the actual range. |

**Why this is genuinely good:**

1. **No dead zone.** The R6 critique identified a gap between 1000-3000 and 5000-20000 where readers got no feedback. That gap is now filled. Every guess gets specific, instructive feedback.

2. **Each range teaches something the others do not.** The <1000 range teaches "DOM is fine at low counts." The 1000-3000 range teaches "animation changes the threshold." The 5000-20000 range teaches "property type matters (transform vs layout)." The >20000 range teaches "layout recalculation is per-element." These are four distinct concepts, not four phrasings of the same correction.

3. **The 3000-5000 range is implicit "correct."** There is no explicit feedback for 3000-5000 because that IS the correct range. The reader slides to verify and sees the threshold match their prediction. This is the right design -- correct guesses should be confirmed by the system behavior, not by a text label.

4. **This gate is now on par with the section's strongest gates.** In R6, the virt-canvas-dom gate was flagged as "adequate but slightly thinner than other gates." It is no longer the weakest. The build-along step 4 gate (FPS prediction, four options with distinct corrections) remains the standout, but virt-canvas-dom is now comparable in instructive depth.

---

## Dimension Details

### 1. Teaching Effectiveness -- 9.7/10 (was 9.5)

The +0.2 comes from two independent improvements:

- **Step 8 micro-interaction (+0.1):** The build-along now has FOUR micro-interactions (steps 2, 4, 7, 8) instead of three, and THREE prediction gates (steps 2, 4, 6). Seven of eight scroll steps have an interaction in tier 1. Only step 1 (problem setup: "10,000 items, 3fps") and step 3 (range calculation code) are passive, and both serve as necessary context-setting for the predictions that follow.

- **Canvas-DOM feedback completeness (+0.1):** All 7 prediction gates now have comprehensive wrong-answer feedback with no dead zones. The section's teaching-through-wrong-answers system is complete.

**What withholds the remaining 0.3 from a perfect 10:** The build-along step 3 (range calculation) is still purely passive -- "From scrollTop and viewport height, calculate which items are visible." This is a formula explanation with no interaction. A micro-interaction here (e.g., drag scrollTop and watch startIndex/endIndex change in real time) would make the range calculation feel concrete rather than abstract. However, this is a diminishing-returns improvement -- step 3 is short, and the prediction gate at step 4 immediately follows.

### 2. Engagement Quality -- 8.9/10 (was 8.8)

The +0.1 comes from step 8's toggle adding a new interaction PATTERN to the build-along. The section's interaction patterns are now:

- Prediction gates with MCQ or number input (steps 2, 4, 6 of build-along; fixed-vs-variable; canvas-dom; tree-grid)
- Toggle to compare states (step 2 spacer, step 8 padding-top vs translateY)
- Replay/side-by-side comparison (step 4 before/after)
- Drag with proportional feedback (step 7 resize handle, windowing viewport drag)
- Slider with metric change (step 5 overscan, canvas-dom item count)
- Free exploration with dials (windowing post-scrollytelling, tree-grid tabs)
- Prompted action (canvas-dom keyboard accessibility test)
- Scenario selection with wrong-choice feedback (canvas-dom synthesis challenge)

Eight distinct interaction patterns across 5 stops. No pattern is used more than twice. This is strong variety for a section of this size.

### 3. Active vs Passive Balance -- 8.2/10 (was 8.0)

The +0.2 comes from step 8 no longer being passive in tier 1. Updated per-stop breakdown:

- virt-windowing: ~55% active (unchanged)
- virt-fixed-vs-variable: ~70% active (unchanged)
- virt-variable-height (tier 1): **~58% active** (was ~50%). Steps with interaction: 2, 4, 5, 6, 7, 8 = 6 of 8. Steps 1 and 3 remain passive. Time-weighted ratio improves because step 8 is a moderate-dwell step (final polish, readers linger).
- virt-tree-grid: ~70% active (unchanged)
- virt-canvas-dom: ~75% active (unchanged)

Section-wide time-weighted estimate: ~65% active (was ~62%). Still below the 70% ideal for a highly interactive section, but the remaining passive steps are structurally necessary (problem setup, formula explanation).

### 4. Concept Coverage Gaps -- 8.5/10 (unchanged)

No fixes targeted this dimension. Same gaps carried from R6:
1. Scroll restoration during virtualisation -- mentioned in sidebar, never experienced
2. Focus management during item unmount -- described, not demonstrated
3. 2D overscan corner-cell overlap -- absent

None of these are blocking. They are depth extensions, not core concept gaps.

### 5. Feasibility -- 8.1/10 (was 8.2)

The -0.1 reflects a new implementation obligation introduced by Fix 1. The step 8 micro-interaction describes "Layout panel shows recalculation" and "Layout panel is silent -- only Composite fires." This implies either:

(a) A simulated DevTools-style indicator showing Layout vs Composite activity, or
(b) A simplified badge/light system (Layout badge blinks on padding-top scroll, stays dark on translateY scroll).

Neither is specified in the plan. Option (b) is straightforward, but the plan should name it. An implementer reading "Layout panel" might attempt a full DevTools simulation, which is an effort trap.

**Remaining concerns (carried + updated from R6):**
- The build-along at "xl" is still under-decomposed. No sub-task breakdown.
- The canvas-dom hybrid mode remains a dual-renderer problem without separate effort acknowledgment.
- The canvas-dom "accessibility score" metric is still undefined.
- NEW: Step 8's "Layout panel" indicator needs a fidelity specification.

### 6. Section Arc -- 9.2/10 (unchanged)

Neither fix affects the section arc. The difficulty ramp, cross-stop through-lines, and capstone synthesis challenge remain as strong as R6 assessed them.

---

## Rubric Compliance Checklist

### Every prediction gate must have per-option wrong-answer feedback
**PASS.** 7 of 7 gates now have comprehensive feedback. The virt-canvas-dom gate, previously the weakest, now has 4 distinct ranges. No dead zones remain.

### Every discovery must have a distinct action/reaction/teaches triple
**PASS.** All 14 discoveries have distinct triples. Unchanged from R6.

### Cross-section synthesis scenarios must reference specific stops
**PASS.** Unchanged from R6.

### agentNotes must match the description (no contradictions)
**PASS with one minor gap.** The build-along agentNotes (lines 283-295) list "THREE MICRO-INTERACTIONS (tier 1): step 2 spacer toggle, step 4 replay (side-by-side before/after), step 7 resize handle." But step 8 now also has a tier-1 micro-interaction (padding-top vs translateY toggle). The agentNotes say "THREE" but the plan now has FOUR. This is a counting inconsistency, not a contradiction -- the step 8 interaction is specified in the scrollSteps, just not reflected in the agentNotes summary.

### Scroll steps must be annotations on behavior, not pre-scripted narration
**MOSTLY PASS.** Same minor narration leaks from R6: "the illusion is complete" and "From scrollTop and viewport height, calculate which items are visible."

### No two stops should use identical interaction patterns
**PASS.** No duplicate patterns.

---

## Top 3 Remaining Weaknesses

### 1. agentNotes say "THREE MICRO-INTERACTIONS" but the plan now has four

**Severity**: Low. Implementer confusion risk, not pedagogical.

Lines 288-289 read: `"THREE MICRO-INTERACTIONS (tier 1): step 2 spacer toggle, step 4 replay (side-by-side before/after), step 7 resize handle."` The step 8 toggle (padding-top vs translateY) is a fourth tier-1 micro-interaction that is not listed here. An implementer reading only agentNotes would miss it, even though it is specified in the scrollSteps array.

**Fix**: Update the agentNotes count to "FOUR MICRO-INTERACTIONS" and add step 8 to the list: `"step 8 padding-top vs translateY toggle (Layout vs Composite indicator)."` Also, specify the indicator fidelity: badge/light system, not a full DevTools panel simulation.

**Effort**: ~10 minutes. Text change only.

### 2. Build-along effort decomposition remains absent

**Severity**: Low-medium. Affects implementer planning, not lesson quality.

The build-along is tagged as "xl" effort but has no sub-task breakdown in agentNotes. An implementer facing this stop does not know whether the CodeEvolution component, the live preview panel, the FPS counter, the prediction gate overlays, and the four micro-interactions are each "medium" or "small" tasks. Without decomposition, the "xl" tag is an honest warning but not actionable guidance.

**Fix**: Add a sub-task breakdown to agentNotes: CodeEvolution scroll engine (medium), live preview with FPS counter (medium), 3 prediction gate overlays (small), 4 micro-interactions (medium -- step 4 replay is the most complex), production realities sidebar (small). Total: xl is correct.

**Effort**: ~20 minutes.

### 3. Canvas-DOM "accessibility score" metric is undefined

**Severity**: Low. The concept is sound, the spec is incomplete.

Line 413 mentions "Each mode shows its own FPS and accessibility score" for the hybrid mode toggle. But "accessibility score" is never defined. Is it a number (0-100)? A label (None / Partial / Full)? A checklist (keyboard: yes, screen reader: yes, text selection: yes)? An implementer needs to invent this metric.

**Fix**: Define it as a 3-item checklist: Keyboard navigable (yes/no), Screen-reader accessible (yes/no), Text selectable (yes/no). Canvas-only: 0/3. DOM-only: 3/3. Hybrid: 2/3 or 3/3 depending on implementation. This is concrete and implementable.

**Effort**: ~10 minutes. Text change only.

---

## What Landed Well

1. **Build-along step 8 is now a genuine teaching moment.** The padding-top vs translateY toggle is not busywork -- it teaches the specific concept that step 8 exists to convey (avoid layout recalculation). The "Layout panel shows recalculation / Layout panel is silent" framing makes the abstract concept (composite-only rendering) into something the reader can observe. This is the kind of micro-interaction that justifies step 8's existence in the build-along sequence. Without it, step 8 was "and then we polish" -- now it is "and here is WHY this polish matters, visually proved."

2. **The virt-canvas-dom prediction gate is now complete.** Four ranges, four distinct teachings. The 1000-3000 range ("static elements survive longer, but these are ANIMATED") is the strongest addition -- it teaches the critical distinction between static and animated DOM cost that no other part of the section covers. The 5000-20000 range ("transforms are cheaper than layout-triggering properties") adds a forward reference to the rendering pipeline section. Every guess now gets specific, instructive feedback. No reader falls through a gap.

3. **The section's interaction coverage is now 7/8 build-along steps in tier 1.** Only steps 1 and 3 are passive, and both are structurally necessary context-setting steps. The build-along went from a ~50% active ratio to ~58%, which is meaningful for a format that inherently has passive setup phases. The improvement is not from forcing interaction into passive steps -- it is from recognizing that step 8 had a concept worth interacting with.

---

## Path to 9.5+

| Change | Dimension Impact | Effort |
|--------|-----------------|--------|
| Update agentNotes count to "FOUR MICRO-INTERACTIONS" and list step 8 | Feasibility +0.1 | ~10 min |
| Add sub-task decomposition to build-along agentNotes | Feasibility +0.1 | ~20 min |
| Define "accessibility score" as 3-item checklist in canvas-dom | Feasibility +0.05 | ~10 min |
| Specify step 8 Layout indicator fidelity (badge, not DevTools panel) | Feasibility +0.05 | ~5 min |
| **Total** | **~+0.3** | **~45 min** |

All remaining improvements are implementer-facing clarity, not pedagogical design. The section's teaching structure, interaction patterns, prediction gates, wrong-answer feedback, cross-stop synthesis, and difficulty arc are all at or above the quality bar. What remains is making the plan unambiguous enough that an implementer can build it without asking clarifying questions.
