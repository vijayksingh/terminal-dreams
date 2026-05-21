"use client";

import { useState } from "react";
import { usePerfContext } from "../perf-context";
import styles from "../WebPerformanceLab.module.css";

const IMAGE_ITEMS = [
  { name: "hero", before: 245, after: 65, correctLazy: false, hint: "Above-fold hero banner, LCP candidate" },
  { name: "card-1", before: 95, after: 33, correctLazy: true, hint: "Product card below the fold" },
  { name: "card-2", before: 110, after: 39, correctLazy: true, hint: "Product card below the fold" },
  { name: "banner", before: 88, after: 31, correctLazy: true, hint: "Promo banner near page bottom" },
];

const HERO_ATTR_BLANKS = [
  { attr: "fetchpriority", correct: "high", options: ["auto", "high", "low"] },
  { attr: "loading", correct: "eager", options: ["eager", "lazy", "auto"] },
  { attr: "width", correct: "1200", options: ["1200", "auto", "100%"] },
  { attr: "height", correct: "675", options: ["675", "auto", "100%"] },
];

export function ImageOptWidget() {
  const { enabledOptimizations } = usePerfContext();
  const on = enabledOptimizations.has("imageOptimization");
  const [lazyAssignments, setLazyAssignments] = useState<Record<string, boolean>>({});
  const [classified, setClassified] = useState(false);
  const [attrFills, setAttrFills] = useState<Record<string, string>>({});
  const [attrSubmitted, setAttrSubmitted] = useState(false);
  const attrAllFilled = HERO_ATTR_BLANKS.every((b) => attrFills[b.attr]);
  const attrCorrectCount = HERO_ATTR_BLANKS.filter((b) => attrFills[b.attr] === b.correct).length;
  const attrAllCorrect = attrCorrectCount === HERO_ATTR_BLANKS.length;

  const allAssigned = IMAGE_ITEMS.every((img) => lazyAssignments[img.name] !== undefined);
  const correctCount = IMAGE_ITEMS.filter((img) => lazyAssignments[img.name] === img.correctLazy).length;
  const allCorrect = correctCount === IMAGE_ITEMS.length;

  const totalBefore = IMAGE_ITEMS.reduce((s, i) => s + i.before, 0);
  const totalAfter = IMAGE_ITEMS.reduce((s, i) => s + (i.correctLazy ? 0 : i.after), 0);

  const showClassification = !on && !classified;

  return (
    <div className={styles.widgetPanel}>
      <div className={styles.widgetTitle}>Image Pipeline</div>

      {showClassification ? (
        <>
          <p className={styles.widgetNote}>
            Classify each image as eager (loads immediately) or lazy (deferred until near viewport). Hint: the LCP element must NEVER be lazy-loaded.
          </p>
          <div className={styles.imageClassifyGrid}>
            {IMAGE_ITEMS.map((img) => (
              <div key={img.name} className={styles.imageClassifyRow}>
                <div className={styles.imageClassifyInfo}>
                  <span className={styles.imageName}>{img.name} ({img.before} KB)</span>
                  <span className={styles.imageClassifyHint}>{img.hint}</span>
                </div>
                <div className={styles.imageClassifyButtons}>
                  <button
                    type="button"
                    className={styles.imageClassifyBtn}
                    data-selected={lazyAssignments[img.name] === false ? "true" : undefined}
                    onClick={() => setLazyAssignments((prev) => ({ ...prev, [img.name]: false }))}
                  >
                    eager
                  </button>
                  <button
                    type="button"
                    className={styles.imageClassifyBtn}
                    data-selected={lazyAssignments[img.name] === true ? "true" : undefined}
                    onClick={() => setLazyAssignments((prev) => ({ ...prev, [img.name]: true }))}
                  >
                    lazy
                  </button>
                </div>
              </div>
            ))}
          </div>
          {allAssigned && (
            <button
              type="button"
              className={styles.cacheSubmitButton}
              onClick={() => setClassified(true)}
            >
              Check classification
            </button>
          )}
        </>
      ) : (
        <>
          {classified && !on && (
            <div className={styles.predictionResult} data-correct={allCorrect ? "true" : undefined}>
              <span className={styles.predictionResultIcon}>{allCorrect ? "✓" : "✗"}</span>
              <span>
                {allCorrect
                  ? "Perfect — hero stays eager (it's the LCP element), everything below the fold is lazy. Now fill in the hero <img> attributes below."
                  : `${correctCount}/${IMAGE_ITEMS.length} correct. The hero must be eager (LCP), below-fold images should be lazy. Now fill in the hero <img> attributes below.`}
              </span>
            </div>
          )}

          {classified && !on && (
            <div className={styles.widgetPanel} style={{ padding: "var(--space-2)", gap: "var(--space-1)" }}>
              <div className={styles.widgetTitle}>Fill the hero &lt;img&gt; attributes</div>
              <pre className={styles.codeFillPre}>
                {'<img\n  src="hero.webp"\n  alt="Hero banner"'}
                {HERO_ATTR_BLANKS.map((b) => {
                  const val = attrFills[b.attr];
                  const isCorrect = attrSubmitted && val === b.correct;
                  const isWrong = attrSubmitted && val && val !== b.correct;
                  return (
                    <span key={b.attr}>
                      {`\n  ${b.attr}="`}
                      <select
                        className={styles.codeFillSelect}
                        data-status={isCorrect ? "correct" : isWrong ? "wrong" : undefined}
                        value={val || ""}
                        onChange={(e) => setAttrFills((p) => ({ ...p, [b.attr]: e.target.value }))}
                        disabled={attrSubmitted}
                      >
                        <option value="">___</option>
                        {b.options.map((o) => <option key={o} value={o}>{o}</option>)}
                      </select>
                      {'"'}
                    </span>
                  );
                })}
                {'\n/>'}
              </pre>
              {!attrSubmitted && attrAllFilled && (
                <button type="button" className={styles.cacheSubmitButton} onClick={() => setAttrSubmitted(true)}>
                  Check attributes
                </button>
              )}
              {attrSubmitted && (
                <div className={styles.predictionResult} data-correct={attrAllCorrect ? "true" : undefined}>
                  <span className={styles.predictionResultIcon}>{attrAllCorrect ? "✓" : "✗"}</span>
                  <span>
                    {attrAllCorrect
                      ? "Every attribute is correct. fetchpriority=\"high\" tells the browser this image is the LCP element. Explicit width/height prevent layout shift."
                      : `${attrCorrectCount}/4 correct. The hero needs fetchpriority="high" (LCP hint), loading="eager" (never lazy-load LCP), and explicit width="1200" height="675" (CLS prevention).`}
                  </span>
                </div>
              )}
            </div>
          )}

          <div className={styles.imageGrid}>
            {IMAGE_ITEMS.map((img) => (
              <div key={img.name} className={styles.imageRow}>
                <span className={styles.imageName}>{img.name}</span>
                <div className={styles.imageBarWrap}>
                  <div
                    className={styles.imageBar}
                    data-state={on ? "optimized" : "original"}
                    style={{
                      width: `${((on ? img.after : img.before) / 245) * 100}%`,
                    }}
                  />
                </div>
                <span className={styles.imageSize}>
                  {on ? `${img.after} KB` : `${img.before} KB`}
                  {on && img.correctLazy && <span className={styles.lazyBadge}>lazy</span>}
                </span>
              </div>
            ))}
          </div>
          <div className={styles.imageSavings}>
            Initial image payload: <strong data-status={on ? "good" : "bad"}>
              {on ? `${totalAfter} KB` : `${totalBefore} KB`}
            </strong>
            {on && ` (saved ${totalBefore - totalAfter} KB — below-fold deferred)`}
          </div>
        </>
      )}
    </div>
  );
}
