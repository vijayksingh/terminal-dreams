"use client";

import FuzzyText from "@/components/interactions/FuzzyText";
import FaultyTerminal from "@/components/interactions/FaultyTerminal";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import Link from "next/link";
import { useMemo } from "react";

const RETRO_MESSAGES = [
  {
    line1: "SECTOR NOT FOUND",
    line2: "The disk you inserted is not readable by this computer.",
    prompt: "[ Eject ]  [ Initialize ]",
  },
  {
    line1: "GURU MEDITATION",
    line2: "Software Failure. Press left mouse button to continue.",
    prompt: "Error #00000004.0000AAC0",
  },
  {
    line1: "BAD COMMAND OR FILE NAME",
    line2: "The path you seek does not exist in this directory tree.",
    prompt: "C:\\> _",
  },
  {
    line1: "SEGMENTATION FAULT",
    line2: "Core dumped. The page you requested caused an illegal operation.",
    prompt: "(core dumped)",
  },
  {
    line1: "NO CARRIER",
    line2: "The remote host has disconnected. Your page was lost in transmission.",
    prompt: "ATH0 OK",
  },
  {
    line1: "KEYBOARD NOT FOUND",
    line2: "Press F1 to continue. Press F2 to enter this page.",
    prompt: "... wait.",
  },
  {
    line1: "GENERAL PROTECTION FAULT",
    line2: "This page performed an illegal operation and will be shut down.",
    prompt: "[ Close ]  [ Details >> ]",
  },
  {
    line1: "OUT OF MEMORY",
    line2: "Insufficient RAM to load this page. Try closing some windows.",
    prompt: "640K ought to be enough for anybody.",
  },
  {
    line1: "TAPE LOAD ERROR",
    line2: "Press PLAY on tape and try again. R Tape Loading Error, 0:1",
    prompt: "READY.",
  },
  {
    line1: "ABORT, RETRY, FAIL?",
    line2: "Not ready reading drive A:. The floppy has no page here.",
    prompt: "A>_",
  },
  {
    line1: "STACK OVERFLOW",
    line2: "Too many recursive lookups. This URL calls itself endlessly.",
    prompt: "*** BREAK ***",
  },
  {
    line1: "UNRECOVERABLE APPLICATION ERROR",
    line2: "This page has been swapped to a disk that no longer exists.",
    prompt: "Terminating current session.",
  },
];

export default function NotFound() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const message = useMemo(
    () => RETRO_MESSAGES[Math.floor(Math.random() * RETRO_MESSAGES.length)],
    [],
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        background: "var(--color-bg)",
      }}
    >
      {!prefersReducedMotion && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 0,
            opacity: 0.3,
          }}
        >
          <FaultyTerminal
            scale={1.5}
            gridMul={[2, 1]}
            digitSize={1.2}
            timeScale={0.3}
            scanlineIntensity={1}
            glitchAmount={1.5}
            flickerAmount={1}
            noiseAmp={1}
            curvature={0}
            mouseReact={false}
            brightness={0.5}
            tint="#4a80e8"
            pageLoadAnimation
          />
        </div>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "var(--space-6)",
          padding: "var(--space-6)",
          maxWidth: 700,
          textAlign: "center",
        }}
      >
        <FuzzyText
          fontSize="clamp(4rem, 15vw, 12rem)"
          fontWeight={900}
          fontFamily="var(--font-mono)"
          color="var(--color-accent)"
          baseIntensity={0.15}
          hoverIntensity={0.6}
          clickEffect
          enableHover
          direction="horizontal"
        >
          404
        </FuzzyText>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "var(--space-3)",
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-lg)",
              fontWeight: 700,
              color: "var(--color-text)",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            {message.line1}
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
              color: "var(--color-muted)",
              lineHeight: 1.6,
              maxWidth: 480,
            }}
          >
            {message.line2}
          </p>
          <p
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-xs)",
              color: "var(--color-accent)",
              opacity: 0.7,
              marginTop: "var(--space-1)",
            }}
          >
            {message.prompt}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            gap: "var(--space-4)",
            marginTop: "var(--space-4)",
          }}
        >
          <Link
            href="/"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
              color: "var(--color-bg)",
              background: "var(--color-accent)",
              padding: "var(--space-2) var(--space-5)",
              borderRadius: "var(--radius-1)",
              textDecoration: "none",
              fontWeight: 600,
              letterSpacing: "0.03em",
            }}
          >
            cd ~
          </Link>
          <Link
            href="/blog"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: "var(--text-sm)",
              color: "var(--color-accent)",
              background: "transparent",
              padding: "var(--space-2) var(--space-5)",
              borderRadius: "var(--radius-1)",
              border: "1px solid var(--color-accent)",
              textDecoration: "none",
              fontWeight: 600,
              letterSpacing: "0.03em",
            }}
          >
            ls ~/archive
          </Link>
        </div>

        <p
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 10,
            color: "var(--color-muted)",
            opacity: 0.5,
            marginTop: "var(--space-6)",
          }}
        >
          {">"} System halted. Press any key to return to reality.
        </p>
      </div>
    </div>
  );
}
