"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    hack: () => string;
  }
}

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

export function useRetroEffects(): void {
  useEffect(() => {
    installConsoleEasterEgg();
  }, []);
}
