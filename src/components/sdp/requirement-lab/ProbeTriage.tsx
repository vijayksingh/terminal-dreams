"use client";

import { BriefHeader } from "./BriefHeader";
import { FlavorRail } from "./FlavorRail";
import { ProbeWall } from "./ProbeWall";
import { PickStrip } from "./PickStrip";
import { RevealPanel } from "./RevealPanel";
import { ScorePanel } from "./ScorePanel";
import { ScopePane } from "./ScopePane";
import { useProbeTriage } from "./use-probe-triage";
import type { ProbeTriageProps } from "./types";
import styles from "./styles.module.css";

export function ProbeTriage({ config }: ProbeTriageProps) {
  const lab = useProbeTriage(config);
  const recentTs =
    lab.scope.length > 0
      ? Math.max(...lab.scope.map((c) => c.ts))
      : null;

  return (
    <div className={styles.root}>
      <BriefHeader
        title={config.briefTitle}
        body={config.briefBody}
        facts={config.briefFacts}
      />

      <div className={styles.body}>
        <section className={styles.triagePane}>
          {lab.phase === "selecting" ? (
            <>
              <FlavorRail />
              <ProbeWall
                library={lab.shuffledLibrary}
                picks={lab.picks}
                budget={config.budget}
                locked={false}
                onToggle={lab.togglePick}
              />
              <PickStrip
                picks={lab.picks}
                pickedProbes={lab.pickedProbes}
                budget={config.budget}
                canSubmit={lab.picks.length > 0}
                onSubmit={lab.submit}
                onClearAll={lab.reset}
              />
            </>
          ) : (
            <>
              <RevealPanel revealedProbes={lab.revealedProbes} />
              {lab.phase === "complete" ? (
                <ScorePanel scoreboard={lab.scoreboard} onReset={lab.reset} />
              ) : null}
            </>
          )}
        </section>

        <ScopePane
          scope={lab.scope}
          recentProbeTs={recentTs}
          onRemove={() => {
            /* removal disabled in triage mode */
          }}
          readOnly
        />
      </div>
    </div>
  );
}
