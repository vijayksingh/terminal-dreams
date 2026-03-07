"use client";

import { useCallback, useEffect, useState } from "react";

interface UseStepNavigationOptions {
  totalSteps: number;
  onStepChange?: (stepIndex: number) => void;
}

export function useStepNavigation({ totalSteps, onStepChange }: UseStepNavigationOptions) {
  const [currentStep, setCurrentStep] = useState(0);

  const goToStep = useCallback(
    (index: number) => {
      if (index >= 0 && index < totalSteps) {
        setCurrentStep(index);
        onStepChange?.(index);
      }
    },
    [totalSteps, onStepChange]
  );

  const nextStep = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      const nextIndex = currentStep + 1;
      setCurrentStep(nextIndex);
      onStepChange?.(nextIndex);
    }
  }, [currentStep, totalSteps, onStepChange]);

  const previousStep = useCallback(() => {
    if (currentStep > 0) {
      const prevIndex = currentStep - 1;
      setCurrentStep(prevIndex);
      onStepChange?.(prevIndex);
    }
  }, [currentStep, onStepChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextStep();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        previousStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextStep, previousStep]);

  // Swipe gesture support (basic touch events)
  useEffect(() => {
    let touchStartX = 0;
    let touchEndX = 0;

    const handleTouchStart = (e: TouchEvent) => {
      touchStartX = e.changedTouches[0].screenX;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    };

    const handleSwipe = () => {
      const swipeThreshold = 50;
      if (touchStartX - touchEndX > swipeThreshold) {
        // Swipe left -> next step
        nextStep();
      } else if (touchEndX - touchStartX > swipeThreshold) {
        // Swipe right -> previous step
        previousStep();
      }
    };

    window.addEventListener("touchstart", handleTouchStart);
    window.addEventListener("touchend", handleTouchEnd);

    return () => {
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  }, [nextStep, previousStep]);

  return {
    currentStep,
    goToStep,
    nextStep,
    previousStep,
    canGoNext: currentStep < totalSteps - 1,
    canGoPrevious: currentStep > 0,
    progress: totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0,
  };
}
