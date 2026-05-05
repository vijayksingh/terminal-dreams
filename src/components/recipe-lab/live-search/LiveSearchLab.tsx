"use client";

import { SearchDemo } from "./search-demo";
import { getPhase } from "./search-context";

type LiveSearchLabProps = {
  activeStep: number;
};

export function LiveSearchLab({ activeStep }: LiveSearchLabProps) {
  const phase = getPhase(activeStep);

  return (
    <SearchDemo.Root activeStep={activeStep}>
      {phase === "basics" && <BasicsView />}
      {phase === "growing" && <GrowingView activeStep={activeStep} />}
      {phase === "composition" && <CompositionView />}
    </SearchDemo.Root>
  );
}

// ── Steps 1-6: Building the search ────────────────────────────────

function BasicsView() {
  return (
    <>
      <SearchDemo.Toolbar />
      <SearchDemo.NaiveToggle />
      <SearchDemo.ScrollArea>
        <SearchDemo.StaleIndicator />
        <SearchDemo.Panel>
          <SearchDemo.Input />
          <SearchDemo.List>
            {(item) => <SearchDemo.Highlight text={item} />}
          </SearchDemo.List>
        </SearchDemo.Panel>
        <SearchDemo.Inspector />
      </SearchDemo.ScrollArea>
    </>
  );
}

// ── Steps 7-8: The monolith grows, then breaks ───────────────────

function GrowingView({ activeStep }: { activeStep: number }) {
  return (
    <>
      <SearchDemo.LockedToolbar />
      <SearchDemo.ExtraToolbar />
      <SearchDemo.ScrollArea>
        <SearchDemo.GrowingPanel />
        {activeStep === 8 && <SearchDemo.LayoutPicker />}
        <SearchDemo.Inspector />
      </SearchDemo.ScrollArea>
    </>
  );
}

// ── Step 9: Compound components — the payoff ─────────────────────

function CompositionView() {
  return (
    <>
      <SearchDemo.ScrollArea>
        <SearchDemo.SlotArranger />
        <SearchDemo.JsxPreview />
        <SearchDemo.ComposedPanel />
      </SearchDemo.ScrollArea>
    </>
  );
}
