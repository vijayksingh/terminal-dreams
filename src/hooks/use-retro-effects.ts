"use client";

import { useEffect, useState } from "react";

declare global {
  interface Window {
    hack: () => string;
  }
}

type PointerPosition = {
  x: number;
  y: number;
};

const INITIAL_POINTER_POSITION: PointerPosition = { x: 0, y: 0 };

function installConsoleEasterEgg() {
  window.hack = () => {
    console.log(
      "%cACCESS GRANTED",
      "color: #00ff00; font-size: 20px; font-family: monospace;"
    );
    console.log(
      "%cYou are now part of the resistance.",
      "color: #00ff00; font-family: monospace;"
    );
    return "1337";
  };

  console.log(
    "%c\nWelcome to the Underground, Hacker\nThe Gibson awaits your commands...\nType: hack() to begin\n",
    "color: #00ff00; font-family: monospace;"
  );
}

export function useRetroEffects(enabled = true): PointerPosition {
  const [mousePosition, setMousePosition] = useState<PointerPosition>(INITIAL_POINTER_POSITION);

  useEffect(() => {
    installConsoleEasterEgg();
  }, []);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    document.addEventListener("mousemove", handleMouseMove);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
    };
  }, [enabled]);

  return mousePosition;
}
