"use client";

import { motion, AnimatePresence } from "framer-motion";
import { TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { StateInspector } from "@/components/recipe-lab/StateInspector";
import { CSSPerfProvider, useCSSPerfContext } from "./css-perf-context";
import { FCPBudgetBar } from "./ui/FCPBudgetBar";
import { RenderBlockingView } from "./ui/RenderBlockingView";
import { SpecificityCalculator } from "./ui/SpecificityCalculator";
import { CriticalCSSView } from "./ui/CriticalCSSView";
import { UnusedCSSView } from "./ui/UnusedCSSView";
import { ModernCSSView } from "./ui/ModernCSSView";
import { WinsRecapView } from "./ui/WinsRecapView";
import styles from "./CSSPerfLab.module.css";

// ── Public component ────────────────────────────────────────────────

export function CSSPerfLab({ activeStep }: { activeStep: number }) {
  const safeStep = Math.min(Math.max(activeStep, 1), STEP_CODES.length);
  return (
    <CSSPerfProvider activeStep={safeStep}>
      <LabBody activeStep={safeStep} />
    </CSSPerfProvider>
  );
}

// ── Step indicator ──────────────────────────────────────────────────

const STEP_CODES = ["Rb", "Sp", "Cc", "Uc", "Mc", "Wn"];
const STEP_TITLES = [
  "Render-blocking",
  "Specificity",
  "Critical CSS",
  "Unused audit",
  "Modern CSS",
  "WINS recap",
];

function StepBar({ activeStep }: { activeStep: number }) {
  return (
    <div className={styles.stepBar} role="list" aria-label="Lesson progress">
      {STEP_CODES.map((code, i) => {
        const stepNum = i + 1;
        return (
          <span
            key={code}
            role="listitem"
            className={styles.stepDot}
            data-active={stepNum <= activeStep ? "true" : undefined}
            data-current={stepNum === activeStep ? "true" : undefined}
            aria-current={stepNum === activeStep ? "step" : undefined}
            aria-label={`Step ${stepNum}: ${STEP_TITLES[i]}`}
          >
            {code}
          </span>
        );
      })}
    </div>
  );
}

// ── Lab body ────────────────────────────────────────────────────────

function LabBody({ activeStep }: { activeStep: number }) {
  const reducedMotion = usePrefersReducedMotion();
  const ctx = useCSSPerfContext();

  return (
    <div className={styles.labRoot}>
      <FCPBudgetBar fcpMs={ctx.fcpMs} wins={ctx.winsAchieved} />
      <StepBar activeStep={activeStep} />

      <div className={styles.scrollArea}>
        <AnimatePresence mode="wait">
          <motion.div
            key={`step-${activeStep}`}
            className={styles.stepPanel}
            initial={reducedMotion ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
            transition={TRANSITION.enterCard}
          >
            <StepHeader step={activeStep} />
            <StepView step={activeStep} />
          </motion.div>
        </AnimatePresence>

        <StateInspector entries={ctx.stateEntries} title="CSS Perf State" />
      </div>
    </div>
  );
}

function StepHeader({ step }: { step: number }) {
  return (
    <div className={styles.stepHeader}>
      <span className={styles.stepEyebrow}>Step {String(step).padStart(2, "0")}</span>
      <span className={styles.stepTitle}>{STEP_TITLES[step - 1]}</span>
    </div>
  );
}

function StepView({ step }: { step: number }) {
  const ctx = useCSSPerfContext();

  switch (step) {
    case 1:
      return (
        <RenderBlockingView
          mode={ctx.renderMode}
          setMode={ctx.setRenderMode}
          timeline={ctx.blockingTimeline}
        />
      );
    case 2:
      return (
        <SpecificityCalculator
          selectorA={ctx.selectorA}
          selectorB={ctx.selectorB}
          tokensA={ctx.tokensA}
          tokensB={ctx.tokensB}
          specA={ctx.specA}
          specB={ctx.specB}
          validA={ctx.validA}
          validB={ctx.validB}
          winner={ctx.winner}
          onChangeA={ctx.setSelectorA}
          onChangeB={ctx.setSelectorB}
        />
      );
    case 3:
      return (
        <CriticalCSSView
          rules={ctx.rules}
          extracted={ctx.extracted}
          onToggle={() => ctx.setExtracted(!ctx.extracted)}
          fcpMs={ctx.fcpMs}
        />
      );
    case 4:
      return (
        <UnusedCSSView
          rules={ctx.unusedRules}
          judgments={ctx.judgments}
          onJudge={ctx.judgeRule}
          onReset={ctx.resetAudit}
          onCommit={ctx.commitAudit}
          committed={ctx.auditCommitted}
          auditResult={ctx.auditResult}
        />
      );
    case 5:
      return (
        <ModernCSSView
          layerRules={ctx.layerRules}
          layersEnabled={ctx.layersEnabled}
          setLayersEnabled={ctx.setLayersEnabled}
          layerOutcome={ctx.layerOutcome}
          visibilityCards={ctx.visibilityCards}
          cvEnabled={ctx.cvEnabled}
          setCvEnabled={ctx.setCvEnabled}
          renderMs={ctx.renderMs}
          cssInJsMode={ctx.cssInJsMode}
          setCssInJsMode={ctx.setCssInJsMode}
        />
      );
    case 6:
    default:
      return (
        <WinsRecapView
          extracted={ctx.extracted}
          auditCommitted={ctx.auditCommitted}
          brokenJsCount={ctx.auditResult.brokenJsRules.length}
          bytesSavedSafely={ctx.auditResult.bytesSavedSafely}
          layersEnabled={ctx.layersEnabled}
          cvEnabled={ctx.cvEnabled}
          fcpMs={ctx.fcpMs}
          wins={ctx.winsAchieved}
        />
      );
  }
}
