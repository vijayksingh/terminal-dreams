"use client";

import { motion } from "framer-motion";
import { SPRING } from "@/lib/motion";
import { useCwvContext } from "../cwv-context";
import { fieldGap, formatCls, formatInp, rateCls, rateInp, rateLcp } from "../engine/cwv-simulator";
import styles from "../CoreWebVitalsLab.module.css";

export function FieldVsLab() {
  const { deviceQuality, setDeviceQuality, labField } = useCwvContext();
  const gap = fieldGap(deviceQuality);

  const rows = [
    {
      key: "lcp" as const,
      label: "LCP",
      lab: `${(labField.labLcpMs / 1000).toFixed(1)}s`,
      field: `${(labField.fieldLcpMs / 1000).toFixed(1)}s`,
      labRating: rateLcp(labField.labLcpMs / 1000),
      fieldRating: rateLcp(labField.fieldLcpMs / 1000),
    },
    {
      key: "inp" as const,
      label: "INP",
      lab: formatInp(labField.labInpMs),
      field: formatInp(labField.fieldInpMs),
      labRating: rateInp(labField.labInpMs),
      fieldRating: rateInp(labField.fieldInpMs),
    },
    {
      key: "cls" as const,
      label: "CLS",
      lab: formatCls(labField.labCls),
      field: formatCls(labField.fieldCls),
      labRating: rateCls(labField.labCls),
      fieldRating: rateCls(labField.fieldCls),
    },
  ];

  return (
    <div className={styles.fieldRoot}>
      <div className={styles.fieldHeader}>
        <span className={styles.fieldHeaderSpacer} />
        <span className={styles.fieldHeaderCell}>Lab (Lighthouse)</span>
        <span className={styles.fieldHeaderCell}>Field p75 (CrUX)</span>
      </div>
      {rows.map((row) => (
        <div key={row.key} className={styles.fieldRow}>
          <span className={styles.fieldRowLabel}>{row.label}</span>
          <motion.span
            className={styles.fieldRowValue}
            data-rating={row.labRating}
            key={`${row.key}-lab-${row.lab}`}
            initial={false}
            animate={{ opacity: 1 }}
            transition={SPRING.snappy}
          >
            {row.lab}
          </motion.span>
          <motion.span
            className={styles.fieldRowValue}
            data-rating={row.fieldRating}
            key={`${row.key}-field-${row.field}`}
            initial={false}
            animate={{ opacity: 1 }}
            transition={SPRING.snappy}
          >
            {row.field}
          </motion.span>
        </div>
      ))}

      <div className={styles.fieldSlider}>
        <div className={styles.fieldSliderHeader}>
          <span className={styles.fieldSliderLabel}>Device quality of the p75 user</span>
          <span className={styles.fieldSliderGap}>field {gap.toFixed(2)}× lab</span>
        </div>
        <input
          id="cwv-device-quality"
          type="range"
          min={0}
          max={100}
          value={deviceQuality}
          onChange={(e) => setDeviceQuality(Number(e.target.value))}
          className={styles.fieldSliderInput}
          aria-label="p75 device quality"
        />
        <div className={styles.fieldSliderEndpoints}>
          <span>2018 mid-range Android on 3G</span>
          <span>2024 flagship on Wi-Fi</span>
        </div>
      </div>

      <div className={styles.fieldNote}>
        Field is <strong>always</strong> slower than lab. The gap shrinks as the p75 user's hardware improves but never inverts — Lighthouse is a single optimistic device; CrUX is the slowest 25% of real users on 28 days of traffic.
      </div>
    </div>
  );
}
