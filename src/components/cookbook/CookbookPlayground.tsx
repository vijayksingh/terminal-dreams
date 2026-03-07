"use client";

import { useState, useEffect } from "react";
import type { CookbookRecipe } from "@/lib/cookbook-types";
import { useIngredientTracking } from "@/hooks/use-ingredient-tracking";
import { useStepNavigation } from "@/hooks/use-step-navigation";
import { useSound } from "@/hooks/use-sound";
import { CookbookTimerProvider } from "./CookbookTimerProvider";
import { RecipeHeader } from "./RecipeHeader";
import { StepCard } from "./StepCard";
import { StepTimeline } from "./StepTimeline";
import { IngredientPanel } from "./IngredientPanel";
import { ProgressBar } from "./ProgressBar";
import { CompletionCelebration } from "./CompletionCelebration";
import { SoundToggle } from "./SoundToggle";
import { TimerTray } from "./TimerTray";

interface CookbookPlaygroundProps {
  recipe: CookbookRecipe;
}

export function CookbookPlayground({ recipe }: CookbookPlaygroundProps) {
  const { steps, ingredients, meta } = recipe;
  const [showCelebration, setShowCelebration] = useState(false);

  // Sound hook
  const { play: playSound } = useSound();

  // Step navigation hook with sound callback
  const handleStepChange = () => {
    playSound("page-turn", 0.7);
  };

  const { currentStep, nextStep, previousStep, goToStep, canGoNext, canGoPrevious, progress } =
    useStepNavigation({
      totalSteps: steps.length,
      onStepChange: handleStepChange,
      recipeSlug: recipe.slug,
    });

  // Ingredient tracking hook with sound
  const { preparedIngredients, toggleIngredient: baseToggleIngredient } = useIngredientTracking();

  const handleToggleIngredient = (id: string) => {
    baseToggleIngredient(id);
    playSound("knife-tap", 0.6);
  };

  const currentStepData = steps[currentStep];
  const currentStepIngredientRefs = currentStepData?.ingredientRefs || [];

  // Check if all steps are complete (user is on the last step)
  const isComplete = currentStep === steps.length - 1 && currentStep > 0;

  // Trigger celebration when completing the last step
  useEffect(() => {
    if (isComplete && !showCelebration) {
      const timer = setTimeout(() => {
        setShowCelebration(true);
        playSound("celebration", 0.8);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, showCelebration, playSound]);

  return (
    <CookbookTimerProvider>
      <div className="flex min-h-screen flex-col bg-[var(--color-bg)]">
      {/* Progress Bar */}
      <ProgressBar progress={progress} />

      {/* Sound Toggle - Fixed position top right */}
      <div className="fixed top-6 right-6 z-50">
        <SoundToggle />
      </div>

      {/* Completion Celebration */}
      {showCelebration && (
        <CompletionCelebration
          totalTime={meta.totalTime}
          recipeName={recipe.title}
          onClose={() => setShowCelebration(false)}
        />
      )}

      {/* Recipe Header */}
      <RecipeHeader recipe={recipe} />

      {/* Main playground area */}
      <div className="flex flex-1 flex-col lg:flex-row">
        {/* Ingredient Panel (sidebar on desktop, drawer on mobile) */}
        <div className="order-2 border-t border-[var(--color-border)] lg:order-1 lg:w-80 lg:border-r lg:border-t-0">
          <IngredientPanel
            ingredientGroups={ingredients}
            currentStepIngredientRefs={currentStepIngredientRefs}
            preparedIngredients={preparedIngredients}
            onToggleIngredient={handleToggleIngredient}
          />
        </div>

        {/* Step Card (main content area) */}
        <div className="order-1 flex-1 p-6 lg:order-2 lg:p-8">
          <div className="mx-auto max-w-3xl">
            {currentStepData && (
              <StepCard
                step={currentStepData}
                stepNumber={currentStep + 1}
                totalSteps={steps.length}
                onNext={nextStep}
                onPrevious={previousStep}
                canGoNext={canGoNext}
                canGoPrevious={canGoPrevious}
              />
            )}
          </div>
        </div>
      </div>

      {/* Step Timeline (bottom navigation) */}
      <div className="sticky bottom-0 z-10">
        <StepTimeline steps={steps} currentStepIndex={currentStep} onStepClick={goToStep} />
      </div>

      {/* Timer Tray - floating, global across all steps */}
      <TimerTray />
    </div>
    </CookbookTimerProvider>
  );
}
