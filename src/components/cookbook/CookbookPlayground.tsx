"use client";

import type { CookbookRecipe } from "@/lib/cookbook-types";
import { useIngredientTracking } from "@/hooks/use-ingredient-tracking";
import { useStepNavigation } from "@/hooks/use-step-navigation";
import { RecipeHeader } from "./RecipeHeader";
import { StepCard } from "./StepCard";
import { StepTimeline } from "./StepTimeline";
import { IngredientPanel } from "./IngredientPanel";

interface CookbookPlaygroundProps {
  recipe: CookbookRecipe;
}

export function CookbookPlayground({ recipe }: CookbookPlaygroundProps) {
  const { steps, ingredients } = recipe;

  // Step navigation hook
  const { currentStep, nextStep, previousStep, goToStep, canGoNext, canGoPrevious } =
    useStepNavigation({
      totalSteps: steps.length,
    });

  // Ingredient tracking hook
  const { preparedIngredients, toggleIngredient } = useIngredientTracking();

  const currentStepData = steps[currentStep];
  const currentStepIngredientRefs = currentStepData?.ingredientRefs || [];

  return (
    <div className="flex min-h-screen flex-col bg-[var(--cookbook-bg)]">
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
            onToggleIngredient={toggleIngredient}
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
    </div>
  );
}
