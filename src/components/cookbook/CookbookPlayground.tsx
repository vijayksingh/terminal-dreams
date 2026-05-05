"use client";

import { useState, useEffect } from "react";
import type { CookbookRecipe } from "@/lib/cookbook-types";
import { useIngredientTracking } from "@/hooks/use-ingredient-tracking";
import { useStepNavigation } from "@/hooks/use-step-navigation";
import { useSound } from "@/hooks/use-sound";
import { CookbookTimerProvider } from "./CookbookTimerProvider";
import { CookbookLayout } from "./CookbookLayout";
import { RecipeHeader } from "./RecipeHeader";
import { StepCard } from "./StepCard";
import { IngredientPanel } from "./IngredientPanel";
import { CompletionCelebration } from "./CompletionCelebration";

interface CookbookPlaygroundProps {
  recipe: CookbookRecipe;
}

/**
 * Controller component for the cookbook playground.
 * Coordinates hooks (sound, step navigation, ingredient tracking, timers)
 * and passes state + callbacks into CookbookLayout slots.
 */
export function CookbookPlayground({ recipe }: CookbookPlaygroundProps) {
  const { steps, ingredients, meta } = recipe;
  const [showCelebration, setShowCelebration] = useState(false);
  const [hasCelebrated, setHasCelebrated] = useState(false);

  const { play: playSound } = useSound();

  const { currentStep, nextStep, previousStep, goToStep, canGoNext, canGoPrevious, progress } =
    useStepNavigation({
      totalSteps: steps.length,
      onStepChange: () => playSound("page-turn", 0.7),
      recipeSlug: recipe.slug,
    });

  const { preparedIngredients, toggleIngredient: baseToggleIngredient } = useIngredientTracking();

  const handleToggleIngredient = (id: string) => {
    baseToggleIngredient(id);
    playSound("knife-tap", 0.6);
  };

  const currentStepData = steps[currentStep];
  const currentStepIngredientRefs = currentStepData?.ingredientRefs || [];
  const isComplete = currentStep === steps.length - 1 && currentStep > 0;

  useEffect(() => {
    if (isComplete && !hasCelebrated) {
      const timer = setTimeout(() => {
        setShowCelebration(true);
        setHasCelebrated(true);
        playSound("celebration", 0.8);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isComplete, hasCelebrated, playSound]);

  return (
    <CookbookTimerProvider>
      <CookbookLayout
        progress={progress}
        header={<RecipeHeader recipe={recipe} />}
        stepCard={
          currentStepData ? (
            <StepCard
              step={currentStepData}
              stepNumber={currentStep + 1}
              totalSteps={steps.length}
              onNext={nextStep}
              onPrevious={previousStep}
              canGoNext={canGoNext}
              canGoPrevious={canGoPrevious}
            />
          ) : null
        }
        ingredientPanel={
          <IngredientPanel
            ingredientGroups={ingredients}
            currentStepIngredientRefs={currentStepIngredientRefs}
            preparedIngredients={preparedIngredients}
            onToggleIngredient={handleToggleIngredient}
          />
        }
        celebration={
          showCelebration ? (
            <CompletionCelebration
              totalTime={meta.totalTime}
              recipeName={recipe.title}
              onClose={() => setShowCelebration(false)}
            />
          ) : null
        }
        steps={steps}
        currentStepIndex={currentStep}
        onStepClick={goToStep}
      />
    </CookbookTimerProvider>
  );
}
