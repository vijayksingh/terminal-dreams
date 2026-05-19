"use client";

import { ProbeTriage } from "./ProbeTriage";
import { IMAGE_GALLERY_TRIAGE } from "./data";
import styles from "./styles.module.css";

export function ProbeTriagePage() {
  return (
    <div className={styles.page}>
      <div className={styles.pageInner}>
        <header className={styles.pageHeader}>
          <div className={styles.pageEyebrow}>step 1 · requirement lab</div>
          <h1 className={styles.pageTitle}>Triage the stakeholder questions.</h1>
          <p className={styles.pageSummary}>
            You don't get unlimited stakeholder time. You get five questions.
            Twelve candidates are on the table — some surface real architectural
            pressure, some are answered by the brief itself, some are traps.
            Pick the five worth asking. Quality is hidden until you submit; the
            cognitive work is judgment.
          </p>
        </header>

        <ProbeTriage config={IMAGE_GALLERY_TRIAGE} />
      </div>
    </div>
  );
}
