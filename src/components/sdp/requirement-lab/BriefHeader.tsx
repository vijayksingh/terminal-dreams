"use client";

import styles from "./styles.module.css";

type BriefHeaderProps = {
  title: string;
  body: string;
  facts: string[];
};

export function BriefHeader({ title, body, facts }: BriefHeaderProps) {
  return (
    <div className={styles.brief}>
      <div className={styles.briefMain}>
        <div className={styles.briefEyebrow}>the brief</div>
        <h2 className={styles.briefTitle}>{title}</h2>
        <p className={styles.briefBody}>{body}</p>
      </div>
      <div className={styles.briefFacts}>
        {facts.map((f) => (
          <div key={f} className={styles.briefFact}>
            <span className={styles.briefFactBullet}>▸</span>
            {f}
          </div>
        ))}
      </div>
    </div>
  );
}
