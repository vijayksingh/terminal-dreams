# Section 03: Web APIs for Complex UI -- Critique (Fourth Pass)

> Reviewer: Adversarial quality critic (fourth independent pass)
> Date: 2026-05-18
> Source: `s03-web-apis.ts` (revised), `types.ts` (format guide)
> Prior score: 9.0/10
> Method: Scored from scratch against the .ts file as source of truth.
> Verified each Round 4 change against the prior critique's top 3 recommendations,
> then checked for new problems the changes may have introduced.

---

## Overall Score: 9.3 / 10

Genuine improvement from 9.0. The prior critique's three recommendations were:
1. Add 2 prediction gates to the RO explorable -- DONE
2. Animate 2-3 more overview failure states -- NOT DONE
3. Add MO-to-RO transitional prose -- DONE

Two of three implemented. The one that was not implemented (overview animated
failures) was the medium-effort one, so that is understandable. The two that
were implemented are exactly as specified in the prior critique. The remaining
0.7-point gap is dominated by the unchanged overview problem plus one new concern
about prediction gate quality distribution.

---

## What Changed Since 9.0 (verified against .ts)

### Recommendation 1: RO Prediction Gates -- DONE

The prior critique specified two exact gates. The .ts now contains both:

| Gate | Prior status | Current status | Match to recommendation |
|------|-------------|----------------|------------------------|
| Before padding slider: "Will contentBoxSize shrink, grow, or stay the same?" | Missing | PRESENT (lines 327-329) | EXACT match. Options (a) Shrink by 40px (b) Grow by 40px (c) Stay the same. Answer: (a). |
| Before heavy callback toggle: "What do you expect? smooth/stutter/freeze" | Missing | PRESENT (lines 335-338) | EXACT match. Options (a) Smooth as before (b) Noticeable stutter (c) Browser freeze. Answer: (b). |

The prior critique projected these two gates would bring RO to "prediction parity"
with other explorables. Verified: every explorable in the section now has at least
one prediction gate:

| Explorable | Prediction gates |
|-----------|-----------------|
| Observer overview | 1 (grouping prediction before buckets) |
| IO explorable | 4 (rootMargin, root toggle, fast scroll, threshold placement) |
| MO explorable | 1 (takeRecords callback vs instant) |
| RO explorable | 2 (contentBoxSize padding, heavy callback jank) |

The inconsistency flagged in the prior critique is resolved. Credit given.

### Recommendation 2: More Animated Overview Failures -- NOT DONE

The overview still has 3 animated failure states and 12 text-only fallbacks. The
spec text is unchanged from the prior round. This was the medium-effort
recommendation and the only one not implemented. The prior critique projected
Engagement +0.3 from this change. That delta remains unrealized.

### Recommendation 3: MO-to-RO Transitional Prose -- DONE

The agentNotes for api-resize now contain (lines 393-395):

> "TRANSITION BRIDGE from MO: 'MutationObserver watches WHAT changed in the DOM.
> ResizeObserver watches HOW BIG things are. Both observe elements -- but MO cares
> about structure, RO cares about geometry.' One sentence at the start of the RO
> context."

This is the exact sentence the prior critique suggested. It is in agentNotes
(implementation guidance), not in the component description. That placement is
correct -- this is prose that belongs in the MDX context, not in the interactive
spec.

### Additional Changes

The agentNotes also now explicitly claim "prediction parity with IO (4 gates) and
MO (1 gate)" (line 392). This is a self-assessment embedded in the spec. Verified
accurate: RO now has 2 gates, which is between IO's 4 and MO's 1. "Parity" is
slightly generous -- IO has double the gates -- but the intent (no explorable is
gate-free) is correct.

---

## Dimension Scores

| # | Dimension | Prior | Now | Delta | Evidence |
|---|-----------|-------|-----|-------|----------|
| 1 | Teaching Effectiveness | 9.5 | 9.6 | +0.1 | RO predictions deepen box model + callback cost understanding. All explorables now have prediction-gated discoveries. |
| 2 | Engagement Quality | 8.5 | 8.5 | +0.0 | Overview text-only failures unchanged. RO gates help but the overview is the section's first impression and it is still capped. |
| 3 | Active vs Passive Balance | 9.3 | 9.5 | +0.2 | RO explorable rises from ~80% to ~85% with prediction commitment before both new interactions. Section average rises. |
| 4 | Concept Coverage Gaps | 9.5 | 9.5 | +0.0 | No new coverage added. Score holds. |
| 5 | Feasibility | 8.8 | 8.8 | +0.0 | No changes to effort labels or scope. The overview concern persists. |
| 6 | Section Arc | 9.3 | 9.6 | +0.3 | Prediction gates now form a COMPLETE pattern across all explorables. MO-to-RO bridge makes the conceptual progression explicit. The two biggest arc gaps from the prior critique are closed. |

**Average: 9.3 / 10** (55.5 / 60)

---

## Per-Stop Analysis (only stops affected by changes)

### Stop 6: api-resize (explorable, medium effort) -- PRIMARY CHANGE

**What improved**: Two prediction gates added. MO-to-RO transition bridge in
agentNotes.

**What is genuinely strong now**: The RO explorable is no longer the section's odd
stop out. The two predictions target meaningfully different cognitive skills:

1. The padding/contentBoxSize gate tests box model understanding APPLIED to a
   measurement API. This is not recalling "contentBoxSize excludes padding" -- it
   requires reasoning about what happens to the content area when padding is added
   to a fixed-width container. The three options (shrink/grow/stay same) are all
   plausible if you do not have a firm box model mental model. Strong prediction.

2. The heavy callback gate tests performance intuition. "5ms per callback, hundreds
   of callbacks per second during resize -- what do you see?" The three options
   (smooth/stutter/freeze) create a useful triad: (a) underestimates the cost,
   (b) is correct, (c) overestimates. Both wrong answers teach something: if you
   predicted smooth, you underestimate callback frequency; if you predicted freeze,
   you overestimate a 5ms cost. This is a well-designed prediction where both
   wrong answers have pedagogical value.

The MO-to-RO bridge sentence is clean and precise. "MO cares about structure, RO
cares about geometry" is a one-sentence framework that a reader can carry forward
into the capstone where both observers interact.

**Remaining problem**: The RO explorable now has 2 prediction gates, but both are
before SECONDARY interactions (padding slider, heavy callback toggle). Neither is
before the PRIMARY interaction (the element-resize vs. media-query comparison). The
comparison is still a guided two-step with no prediction: "Resize the container"
then "Resize the browser window." This is the stop's core teaching moment and it
has no prediction gate, while the supporting interactions do.

This is not a significant problem. The guided two-step comparison IS designed so
that step 1 creates a natural prediction: once the reader sees RO respond but MQ
not respond to container resize, they implicitly predict what happens with window
resize. The implicit prediction is weaker than an explicit gate, but the two-step
structure compensates. I flag this for completeness, not as a recommendation.

**Active time**: ~85%. Up from ~80%. Two prediction commitments add active time
before existing interactions.

---

### All other stops: UNCHANGED from prior critique.

The IO explorable (stop 2), MO explorable (stop 4), capstone (stop 8), and all
challenge chains remain as scored in the prior round. No regressions detected.

---

## Section Arc Analysis

**What improved**: The two biggest arc problems from the prior critique are both
resolved:

1. **Prediction gate consistency**: All four explorables now have prediction gates.
   The pattern (predict -> manipulate -> verify/correct) is established in the
   overview and maintained through every interactive stop. The reader internalizes
   this rhythm by stop 3 and expects it through the rest of the section.

2. **MO-to-RO transition**: The bridge sentence in agentNotes makes the conceptual
   progression explicit. The section now reads as: observe WHAT (MO structure) ->
   observe HOW BIG (RO geometry) -> observe VISIBILITY (IO intersection). Each
   observer has a clear domain. The capstone tests composition across domains.

**What still does not work**:

### The Overview's Text-Only Failure Paths (unchanged, third consecutive critique)

This has been flagged in every critique since 8.7. The overview has 3 animated
failure states and 12 text-only fallbacks. The prediction gate (added in Round 3)
raised the reader's investment. The two RO prediction gates (added in Round 4)
established section-wide prediction-consequence expectations. Both changes make
the overview's text-only failures MORE conspicuous, not less. The reader arrives
at the overview having read no other stops yet -- but the overview SETS the
standard for what "wrong answer feedback" looks like. If the standard is "text
sentence after a drag," the reader's expectations for the rest of the section are
lowered. The overview should set a HIGH bar for consequence quality, not the
lowest one.

This is now the section's single remaining structural problem. Everything else is
polish.

---

## Top 3 Remaining Weaknesses (ranked by severity)

### 1. Overview Animated Failure States (Medium severity, unchanged x3)

The overview still has 3 animated failure states and 12 text-only fallbacks. The
3 animated failures cover the OBVIOUS wrong answers. The CONFUSING mismatches --
where real learning happens -- still get text.

**Specific fix (unchanged from prior critique)**:
Animate 2-3 additional failure states targeting the genuinely ambiguous mismatches:
- Scenario 4 (element appearing) -> IO: IO sees "visible" but the element was never
  added to DOM. Visual: IO fires with isIntersecting=true on a ghost element.
- Scenario 4 (element appearing) -> RO: RO fires on size change but callback data
  says "width: 500px", not "new element." Visual: RO callback showing geometry, not
  structure.
- Scenario 5 (component needing own width) -> MO: MO watches attributes, nothing
  fires because width is geometry, not an attribute. Visual: MO silently watching
  while layout breaks.

Bringing animated failures from 3 to 5-6 covers the confusion points where
observers' domains genuinely overlap. The remaining 9-10 obvious mismatches can
stay as text.

**Projected impact**: Engagement +0.3, Teaching +0.1, Feasibility -0.1.
**Implementation cost**: Medium. Each animated failure needs a mini-simulation.
This is the only recommendation with non-trivial effort.

### 2. IO Explorable: Fast-Scroll Threshold Skipping Still Lacks Visual Feedback (Low severity, unchanged x2)

The IO explorable has a prediction gate for fast scroll ("How many callbacks
fire?") but the threshold skipping itself has no visual indicator. When the reader
scrolls fast and intermediate thresholds are skipped, the only evidence is in the
callback log. The threshold lines the reader placed should visually indicate they
were skipped (brief red flash, strikethrough, or "skipped" badge).

The prediction gate partially compensates because the reader is primed to look
for the answer. But the gap between "prediction gate exists" and "visual feedback
for the predicted behavior exists" weakens the predict -> verify cycle. The reader
predicts "depends on speed," scrolls fast, then has to READ the callback log to
verify. Reading is not seeing.

**Specific fix**: When a threshold is skipped during fast scroll, briefly flash
the threshold line red or add a "skipped" indicator that decays after 1 second.
This makes the threshold-skipping behavior VISIBLE, not just logged.

**Projected impact**: Teaching +0.1.
**Implementation cost**: Small. One conditional animation on threshold lines.

### 3. Overview Effort Label Still Slightly Optimistic (Low severity, unchanged x2)

The overview is labeled "medium" effort but specifies 5 interactive mini-simulations
with 15 outcome paths (3 animated, 12 text). Even with 12 text-only paths, each of
the 5 scenarios is a 120px interactive vignette with its own behavior, and the 3
animated failures each need a unique visual demonstration. This is at the high end
of "medium" and arguably "large."

An implementer encountering this spec will either: (a) reduce mini-sim fidelity to
fit a "medium" timeline, or (b) spend "large" effort and feel the label was wrong.
Neither outcome is ideal.

**Specific fix**: Either upgrade to "large" or explicitly note in agentNotes that
the 5 vignettes can share a single animated base component with per-scenario
configuration, reducing the effective effort.

**Projected impact**: Feasibility +0.2.
**Implementation cost**: One line change.

---

## Scoring Detail

### Dimension 1: Teaching Effectiveness -- 9.6/10

**What earns the score**: Prediction gates in all 8 stops (if counting chains with
prediction prompts). All four explorables now have gates. The section teaches
through a consistent cycle: predict -> manipulate -> verify/correct. The capstone
Phase 3 gate remains the section's highest-quality prediction (testing the observe()
model). Code bridges in all three explorables connect visual discovery to API shape.
MO chain C3 shatters the "works fine" assumption. The RO padding gate tests box
model understanding applied to a measurement API -- a genuinely novel prediction
target.

**What prevents 10**: The overview's 12 text-only failure paths still weaken
consequence-based teaching for the majority of wrong answers. The IO fast-scroll
prediction lacks visual feedback for the predicted behavior. These are the same
two gaps from the prior round, reduced in severity but not eliminated.

### Dimension 2: Engagement Quality -- 8.5/10

**What earns the score**: Stretch goals on all 4 chains. MO chain C3 (debug-a-bug).
Capstone cross-observer bugs. Prediction gates throughout add investment.

**What prevents 9+**: The overview is unchanged. Its 12 text-only failure paths
are flat for all audience levels. This is the section's first interactive stop --
it sets the engagement bar. The bar it sets is: "animated consequence for 3 easy
wrong answers, text sentence for 12 harder ones." The rest of the section exceeds
this bar, which makes the overview feel like the weakest link even though it is the
reader's first impression.

The stretch goals remain optional and unwoven into the main path. A senior who
skips them gets a speed-run. This is by design (correctly), but it means the main
path's engagement ceiling is set by the mandatory interactions, not the optional
depth.

This dimension is the hardest to move without structural changes to the overview.

### Dimension 3: Active vs Passive Balance -- 9.5/10

**Stop-by-stop estimates (active %)**:
| Stop | Prior | Now | Delta | Driver |
|------|-------|-----|-------|--------|
| Overview | ~72% | ~72% | +0% | No changes |
| IO explorable | ~85% | ~85% | +0% | No changes |
| IO chain | ~87% | ~87% | +0% | No changes |
| MO explorable | ~78% | ~78% | +0% | No changes |
| MO chain | ~88% | ~88% | +0% | No changes |
| RO explorable | ~80% | ~85% | +5% | 2 prediction gates |
| RO chain | ~87% | ~87% | +0% | No changes |
| Capstone | ~92% | ~92% | +0% | No changes |

**Section average**: ~84.3%. Up from ~83.6%. No stop below 72%.

The RO explorable's rise from 80% to 85% brings it into line with the IO
explorable. The section average is comfortably above the 70% target.

### Dimension 4: Concept Coverage Gaps -- 9.5/10

Unchanged. The coverage was already strong. The RO prediction gates do not add
NEW concepts -- they add prediction-gated access to concepts that were already in
the spec (contentBoxSize vs borderBoxSize, callback cost). The coverage score
reflects what is taught, not how it is gated.

### Dimension 5: Feasibility -- 8.8/10

Unchanged. The two RO prediction gates are trivial additions (text overlay before
existing interactions). The MO-to-RO bridge is one sentence of prose. Neither
changes the implementation effort profile. The overview's effort label concern
persists.

### Dimension 6: Section Arc -- 9.6/10

**What earns the score**: The prediction gate pattern is now COMPLETE across all
explorables. The MO-to-RO bridge makes the conceptual progression explicit. The
section reads as a coherent arc:

1. Overview: classify by consequence (which observer solves which problem?)
2. IO explorable: discover through manipulation (how do thresholds, rootMargin,
   root option work?)
3. IO chain: build with understanding (lazy loading, infinite scroll, progress)
4. MO explorable: discover through progressive unlocking (which config catches
   which mutation type?)
5. MO chain: build + debug (attributeFilter decisions, infinite loop debugging)
6. RO explorable: discover through comparison + measurement (element vs viewport,
   contentBoxSize vs borderBoxSize, callback cost)
7. RO chain: build + compare (data-columns, responsive sidebar, CQ polyfill)
8. Capstone: compose all three (IO + RO + MO, cross-observer bugs, cleanup)

The difficulty ramp is clear. The prediction gates create rhythm. The transition
bridges (overview lifecycle summary, MO-to-RO bridge) connect the sub-arcs.

**What prevents 10**: The overview remains the only stop with text-only consequence
for the majority of wrong answers. In an otherwise prediction-rich, consequence-
driven section, the overview's text fallbacks break the pattern at the very start.

---

## Comparison to Prior Critique Projections

| Change | Projected impact | Actual impact | Accurate? |
|--------|-----------------|---------------|-----------|
| 2 RO prediction gates | Arc +0.2, Teaching +0.1, Engagement +0.1 | Arc +0.3, Teaching +0.1, Engagement +0.0 | PARTIAL -- Arc exceeded projection because completing the prediction pattern across ALL explorables had compounding value. Engagement did not move because the overview caps it. |
| 2-3 more animated overview failures | Engagement +0.3, Teaching +0.1, Feasibility -0.1 | Not implemented | N/A |
| MO-to-RO transitional prose | Arc +0.1 | Included in Arc +0.3 (combined with gates) | YES |
| Visual indicator for IO threshold skipping | Teaching +0.1 | Not implemented | N/A |

The prior critique projected "~9.2-9.3" if recommendations 1 and 3 were
implemented but recommendation 2 was not. Actual: 9.3. The projection was
accurate to within 0.1.

---

## Actionable Recommendations

### 1. Animate 2-3 More Overview Failure States (Medium effort, third time flagged)

This is the section's single remaining structural problem. Everything else is
polish. The specific fix is unchanged from the prior two critiques. Target the
confusing mismatches where observer domains overlap:

- Scenario 4 -> IO: Ghost visibility detection
- Scenario 4 -> RO: Geometry callback on appearance
- Scenario 5 -> MO: Silent attribute watch while layout breaks

Bringing animated failures from 3 to 5-6 would close the engagement gap and
raise the section's opening impression to match the quality of stops 2-8.

**Projected impact**: Engagement +0.3, Teaching +0.1, Feasibility -0.1.
If implemented, projected overall: 9.5-9.6.

### 2. Visual Indicator for IO Threshold Skipping (Small effort, second time flagged)

When fast scrolling skips intermediate thresholds, flash the skipped threshold
lines briefly (red highlight or "skipped" badge). This completes the
predict -> verify cycle for the fast-scroll prediction gate.

**Projected impact**: Teaching +0.1.
If implemented, projected overall: +0.02 average.

### 3. Overview Effort Label Clarification (Trivial effort, second time flagged)

Either upgrade to "large" or add agentNotes guidance that the 5 vignettes share
a single animated base component to keep effective effort at "medium."

**Projected impact**: Feasibility +0.2.
If implemented, projected overall: +0.03 average.

---

## Path to 9.5+

| Change | Effort | Dimensions Affected | Projected Delta |
|--------|--------|--------------------|-----------------| 
| 2-3 more animated overview failures | Medium | Engagement +0.3, Teaching +0.1, Feasibility -0.1 | +0.08 avg |
| Visual indicator for IO threshold skipping | Small | Teaching +0.1 | +0.02 avg |
| Overview effort label clarification | Trivial | Feasibility +0.2 | +0.03 avg |

**Current**: 9.3 (avg of 9.6, 8.5, 9.5, 9.5, 8.8, 9.6)
**After all recommendations**: ~9.5 (avg of 9.7, 8.8, 9.5, 9.5, 9.0, 9.6)

The ceiling is now very close. The only change that meaningfully moves the needle
is the overview animated failures. The other two are correct but minor. Going
beyond 9.5 would require either rethinking the overview entirely (fewer scenarios
with deeper consequence coverage per scenario) or accepting that 15 outcome paths
inherently create a text-fallback floor.

---

## Verdict

**9.3 / 10** -- the section's prediction architecture is now complete.

The Round 4 changes were small in scope (2 prediction gates + 1 bridge sentence)
but disproportionately impactful because they completed a section-wide pattern.
Before this round, the RO explorable was the only prediction-free interactive.
Now every explorable has gates. Before this round, the MO-to-RO transition was
implicit. Now it is explicit. These are the kinds of changes where the last 10%
of consistency matters more than the first 90%.

The section's remaining problem is singular and concrete: the overview teaches
through consequence for 3 of 15 wrong answers and through text for 12. This has
been flagged three times. It is the only recommendation that would move the score
meaningfully. Everything else is polish on an already strong foundation.

The honest assessment: this section at 9.3 is ready for implementation with the
understanding that the overview's animated failure coverage should be expanded
during build if time permits. Stops 2-8 are solidly designed and need no further
plan-level changes.
