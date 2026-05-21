"use client";

import { motion } from "framer-motion";
import { SPRING, TRANSITION } from "@/lib/motion";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  CSS_IN_JS_MODES,
  LAYER_ORDER,
  formatTuple,
  type LayerRule,
  type VisibilityCard,
} from "../engine/css-perf-simulator";
import styles from "../CSSPerfLab.module.css";

export function ModernCSSView({
  layerRules,
  layersEnabled,
  setLayersEnabled,
  layerOutcome,
  visibilityCards,
  cvEnabled,
  setCvEnabled,
  renderMs,
  cssInJsMode,
  setCssInJsMode,
}: {
  layerRules: LayerRule[];
  layersEnabled: boolean;
  setLayersEnabled: (b: boolean) => void;
  layerOutcome: { winner: LayerRule; reason: string };
  visibilityCards: VisibilityCard[];
  cvEnabled: boolean;
  setCvEnabled: (b: boolean) => void;
  renderMs: number;
  cssInJsMode: "runtime" | "zero-runtime";
  setCssInJsMode: (m: "runtime" | "zero-runtime") => void;
}) {
  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Modern CSS Performance</div>

      <LayerSection
        rules={layerRules}
        enabled={layersEnabled}
        onToggle={setLayersEnabled}
        outcome={layerOutcome}
      />

      <ContentVisibilitySection
        cards={visibilityCards}
        enabled={cvEnabled}
        onToggle={setCvEnabled}
        renderMs={renderMs}
      />

      <CSSInJSSection mode={cssInJsMode} onChange={setCssInJsMode} />
    </div>
  );
}

// ── @layer cascade ──────────────────────────────────────────────────

function LayerSection({
  rules,
  enabled,
  onToggle,
  outcome,
}: {
  rules: LayerRule[];
  enabled: boolean;
  onToggle: (b: boolean) => void;
  outcome: { winner: LayerRule; reason: string };
}) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className={styles.subSection}>
      <div className={styles.subHeader}>
        <span className={styles.subTitle}>@layer cascade</span>
        <ToggleSwitch on={enabled} onChange={onToggle} label="Layers" />
      </div>

      <div className={styles.layerStack}>
        {LAYER_ORDER.map((layer) => {
          const layerRules = rules.filter((r) => r.layer === layer);
          if (layerRules.length === 0) return null;
          return (
            <div
              key={layer}
              className={styles.layerBlock}
              data-layered={enabled ? "true" : undefined}
              data-winning-layer={enabled && layer === outcome.winner.layer ? "true" : undefined}
            >
              <span className={styles.layerName}>@layer {layer}</span>
              {layerRules.map((r) => (
                <div
                  key={`${layer}-${r.selector}-${r.property}`}
                  className={styles.layerRule}
                  data-wins={!enabled && r === outcome.winner ? "true" : undefined}
                  data-layer-wins={enabled && r === outcome.winner ? "true" : undefined}
                >
                  <span className={styles.layerRuleSelector}>{r.selector}</span>
                  <span className={styles.layerRuleBody}>
                    {r.property}: {r.value};
                  </span>
                  <span className={styles.layerRuleSpec}>{formatTuple(r.specificity)}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      <motion.p
        key={enabled ? "on" : "off"}
        className={styles.captionInline}
        initial={reducedMotion ? false : { opacity: 0, y: 2 }}
        animate={{ opacity: 1, y: 0 }}
        transition={reducedMotion ? { duration: 0 } : TRANSITION.enterCard}
      >
        Winner: <strong>{outcome.winner.selector}</strong> ({outcome.winner.property}: {outcome.winner.value}) — {outcome.reason}.
      </motion.p>
    </div>
  );
}

// ── content-visibility scroll list ──────────────────────────────────

function ContentVisibilitySection({
  cards,
  enabled,
  onToggle,
  renderMs,
}: {
  cards: VisibilityCard[];
  enabled: boolean;
  onToggle: (b: boolean) => void;
  renderMs: number;
}) {
  const reducedMotion = usePrefersReducedMotion();

  return (
    <div className={styles.subSection}>
      <div className={styles.subHeader}>
        <span className={styles.subTitle}>content-visibility: auto</span>
        <ToggleSwitch on={enabled} onChange={onToggle} label="Skip off-screen" />
      </div>

      <div className={styles.cardGridFrame}>
        <div className={styles.cardGridViewport}>viewport</div>
        <div className={styles.cardGridList}>
          {cards.map((c) => (
            <motion.div
              key={c.id}
              className={styles.miniCard}
              data-rendered={!enabled || c.inViewport ? "true" : undefined}
              initial={reducedMotion ? false : { opacity: 0.4 }}
              animate={{ opacity: !enabled || c.inViewport ? 1 : 0.35 }}
              transition={reducedMotion ? { duration: 0 } : SPRING.gentle}
            >
              <span className={styles.miniCardTitle}>{c.title}</span>
              <span className={styles.miniCardRender}>{c.renderMs}ms</span>
            </motion.div>
          ))}
        </div>
      </div>

      <div className={styles.renderMsRow}>
        <span className={styles.renderMsLabel}>Initial render</span>
        <motion.span
          key={renderMs}
          className={styles.renderMsValue}
          data-tone={enabled ? "good" : "warn"}
          initial={reducedMotion ? false : { scale: 1.1 }}
          animate={{ scale: 1 }}
          transition={reducedMotion ? { duration: 0 } : SPRING.snappy}
        >
          {renderMs}ms
        </motion.span>
        <span className={styles.renderMsNote}>
          {enabled
            ? `${cards.length - 4} off-screen cards skipped`
            : `all ${cards.length} cards rendered up-front`}
        </span>
      </div>
    </div>
  );
}

// ── CSS-in-JS runtime vs zero-runtime ───────────────────────────────

function CSSInJSSection({
  mode,
  onChange,
}: {
  mode: "runtime" | "zero-runtime";
  onChange: (m: "runtime" | "zero-runtime") => void;
}) {
  const active = CSS_IN_JS_MODES.find((m) => m.id === mode)!;

  return (
    <div className={styles.subSection}>
      <div className={styles.subHeader}>
        <span className={styles.subTitle}>CSS-in-JS runtime cost</span>
        <div className={styles.modeChipsInline} role="radiogroup" aria-label="CSS-in-JS mode">
          {CSS_IN_JS_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              className={styles.modeChipInline}
              data-active={m.id === mode ? "true" : undefined}
              onClick={() => onChange(m.id)}
              role="radio"
              aria-checked={m.id === mode}
            >
              {m.id === "runtime" ? "runtime" : "zero-runtime"}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.cssInJsCard}>
        <span className={styles.cssInJsLabel}>{active.label}</span>
        <span className={styles.cssInJsDesc}>{active.description}</span>
        <div className={styles.cssInJsMetrics}>
          <div className={styles.cssInJsMetric}>
            <span className={styles.cssInJsMetricLabel}>Hydration</span>
            <span
              className={styles.cssInJsMetricValue}
              data-tone={active.hydrationCostMs > 0 ? "warn" : "good"}
            >
              +{active.hydrationCostMs}ms
            </span>
          </div>
          <div className={styles.cssInJsMetric}>
            <span className={styles.cssInJsMetricLabel}>FCP impact</span>
            <span
              className={styles.cssInJsMetricValue}
              data-tone={active.fcpDeltaMs > 0 ? "warn" : "good"}
            >
              +{active.fcpDeltaMs}ms
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── toggle ───────────────────────────────────────────────────────────

function ToggleSwitch({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (b: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      className={styles.toggleSwitch}
      data-on={on ? "true" : undefined}
      onClick={() => onChange(!on)}
      aria-pressed={on}
      aria-label={label}
    >
      <span className={styles.toggleSwitchKnob} />
    </button>
  );
}
