"use client";

import React from "react";
import styles from "./retro.module.css";

interface CursorGlowProps {
  x: number;
  y: number;
}

export function ScanlineOverlay() {
  return <div className={styles.scanline} />;
}

export function CursorGlow({ x, y }: CursorGlowProps) {
  const glowStyle: React.CSSProperties = {
    left: x - 200,
    top: y - 200,
  };
  return <div className={styles.cursorGlow} style={glowStyle} />;
}


