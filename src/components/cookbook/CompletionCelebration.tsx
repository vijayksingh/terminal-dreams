"use client";

import { useEffect, useState } from "react";
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";

interface CompletionCelebrationProps {
  totalTime: number; // in minutes
  recipeName: string;
  onClose?: () => void;
}

export function CompletionCelebration({ totalTime, recipeName, onClose }: CompletionCelebrationProps) {
  const [isFlipped, setIsFlipped] = useState(false);
  const [confettiParticles, setConfettiParticles] = useState<Array<{
    id: number;
    x: number;
    y: number;
    color: string;
    rotation: number;
    velocity: { x: number; y: number };
  }>>([]);
  const prefersReducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    // Trigger confetti burst
    if (!prefersReducedMotion) {
      const particles = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        x: 50, // center
        y: 50, // center
        color: ["#4a80e8", "#6b9af0", "#3a6fd8", "#8ab4f8", "#5c8de6"][Math.floor(Math.random() * 5)],
        rotation: Math.random() * 360,
        velocity: {
          x: (Math.random() - 0.5) * 10,
          y: (Math.random() - 0.5) * 10 - 5, // bias upward
        },
      }));
      setConfettiParticles(particles);

      // Clear confetti after animation
      setTimeout(() => setConfettiParticles([]), 2000);
    }

    // Trigger card flip after brief delay
    const flipTimeout = setTimeout(() => setIsFlipped(true), 300);
    return () => clearTimeout(flipTimeout);
  }, [prefersReducedMotion]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-bg)]/95">
      {/* Close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="absolute right-4 top-4 rounded-full bg-[var(--color-surface)] p-2 text-[var(--color-text)] transition-all hover:bg-[var(--color-accent)] hover:text-white"
          aria-label="Close celebration"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      )}
      {/* Confetti particles */}
      {!prefersReducedMotion && confettiParticles.map((particle) => (
        <div
          key={particle.id}
          className="pointer-events-none absolute h-3 w-3 rounded-full"
          style={{
            left: `${particle.x}%`,
            top: `${particle.y}%`,
            backgroundColor: particle.color,
            transform: `rotate(${particle.rotation}deg)`,
            animation: `confetti-fall 2s ease-out forwards`,
            animationDelay: '0s',
            '--particle-x': `${particle.velocity.x * 50}px`,
            '--particle-y': `${particle.velocity.y * 50 + 500}px`,
          } as React.CSSProperties}
        />
      ))}

      {/* 3D flip card */}
      <div
        className="relative h-96 w-full max-w-md"
        style={{
          perspective: "1000px",
        }}
      >
        <div
          className={`relative h-full w-full transition-transform duration-1000`}
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front of card - Recipe name */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-[var(--color-surface)] p-8 shadow-2xl"
            style={{
              backfaceVisibility: "hidden",
            }}
          >
            <div className="text-center">
              <div className="mb-4 text-6xl">🍳</div>
              <h2 className="text-2xl font-bold text-[var(--color-text)]">
                {recipeName}
              </h2>
              <p className="mt-2 text-[var(--color-muted)]">
                Recipe Complete
              </p>
            </div>
          </div>

          {/* Back of card - Bon Appétit! */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center rounded-3xl bg-gradient-to-br from-[var(--color-accent)] to-[var(--color-link)] p-8 shadow-2xl"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div className="text-center text-white">
              <h2 className="mb-6 text-5xl font-bold italic">
                Bon Appétit!
              </h2>
              <div className="mt-4 rounded-2xl bg-white/20 px-6 py-4 backdrop-blur-sm">
                <p className="text-sm font-medium uppercase tracking-wider opacity-90">
                  Total Time
                </p>
                <p className="mt-1 text-4xl font-bold">
                  {totalTime} min
                </p>
              </div>
              <p className="mt-6 text-lg opacity-90">
                Enjoy your meal! ✨
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes confetti-fall {
          to {
            transform: translate(var(--particle-x), var(--particle-y)) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
