"use client";

import { Children, isValidElement, type ReactNode } from "react";
import { DialSegment } from "@/components/ui/dialkit/DialSegment";
import styles from "./DemoSandbox.module.css";

type DemoSandboxProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

function Controls({ children }: { children: ReactNode }) {
  return (
    <div className={styles.controls}>
      {Children.map(children, (child) =>
        isValidElement(child) ? (
          <div className={styles.controlCell}>{child}</div>
        ) : null
      )}
    </div>
  );
}
Controls.displayName = "DemoSandbox.Controls";

function Tabs<T extends string>({
  options,
  value,
  onChange,
  formatOption,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  formatOption?: (v: T) => string;
}) {
  return (
    <div className={styles.tabsWrapper}>
      <DialSegment
        label=""
        options={options}
        value={value}
        onChange={onChange}
        formatOption={formatOption}
      />
    </div>
  );
}
Tabs.displayName = "DemoSandbox.Tabs";

function Caption({ children }: { children: ReactNode }) {
  return <p className={styles.caption}>{children}</p>;
}
Caption.displayName = "DemoSandbox.Caption";

function DemoSandboxRoot({ title, children, className }: DemoSandboxProps) {
  const tabSlot: ReactNode[] = [];
  const controlSlot: ReactNode[] = [];
  const captionSlot: ReactNode[] = [];
  const body: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (!isValidElement(child)) {
      body.push(child);
      return;
    }
    if (child.type === Controls) {
      controlSlot.push(child);
    } else if (child.type === Tabs) {
      tabSlot.push(child);
    } else if (child.type === Caption) {
      captionSlot.push(child);
    } else {
      body.push(child);
    }
  });

  const hasHeader = title || tabSlot.length > 0;

  return (
    <div className={styles.wrapper}>
      <div className={`${styles.sandbox} ${className ?? ""}`}>
        {hasHeader && (
          <div className={styles.header}>
            {title && <p className={styles.title}>{title}</p>}
            {tabSlot}
          </div>
        )}
        <div className={styles.body}>{body}</div>
        {controlSlot}
      </div>
      {captionSlot}
    </div>
  );
}

export const DemoSandbox = Object.assign(DemoSandboxRoot, {
  Controls,
  Tabs,
  Caption,
});
