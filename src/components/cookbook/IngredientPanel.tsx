"use client";

import type { Ingredient, IngredientGroup } from "@/lib/cookbook-types";

interface IngredientPanelProps {
  ingredientGroups: IngredientGroup[];
  currentStepIngredientRefs?: string[];
  preparedIngredients: { [id: string]: boolean };
  onToggleIngredient: (id: string) => void;
}

export function IngredientPanel({
  ingredientGroups,
  currentStepIngredientRefs = [],
  preparedIngredients,
  onToggleIngredient,
}: IngredientPanelProps) {
  const isCurrentStepIngredient = (id: string) => currentStepIngredientRefs.includes(id);

  const renderIngredient = (ingredient: Ingredient) => {
    const isPrepared = preparedIngredients[ingredient.id];
    const isCurrent = isCurrentStepIngredient(ingredient.id);

    return (
      <li key={ingredient.id} className="group">
        <label
          className={`flex cursor-pointer items-start gap-3 rounded-md px-3 py-2 transition-all ${
            isCurrent
              ? "bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border)]"
              : "hover:bg-[var(--color-muted)]/10"
          }`}
        >
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={isPrepared}
            onChange={() => onToggleIngredient(ingredient.id)}
            className="mt-1 h-4 w-4 cursor-pointer rounded border-[var(--color-border)] text-[var(--accent-weak)] focus:ring-2 focus:ring-[var(--color-border)]"
          />

          {/* Ingredient details */}
          <div className="flex-1">
            <div
              className={`flex items-baseline gap-2 text-sm ${
                isPrepared ? "text-[var(--color-muted)] line-through" : "text-[var(--color-text)]"
              }`}
            >
              <span className="font-medium">{ingredient.name}</span>
              <span className="text-xs text-[var(--color-muted)]">
                {ingredient.amount} {ingredient.unit}
              </span>
            </div>
            {ingredient.notes && (
              <span className="mt-0.5 block text-xs italic text-[var(--color-muted)]">
                {ingredient.notes}
              </span>
            )}
            {ingredient.optional && (
              <span className="mt-0.5 block text-xs text-[var(--accent-weak)]">Optional</span>
            )}
          </div>

          {/* Current step indicator */}
          {isCurrent && (
            <svg
              className="mt-1 h-4 w-4 flex-shrink-0 text-[var(--accent-weak)]"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </label>
      </li>
    );
  };

  return (
    <aside className="h-full overflow-y-auto bg-[var(--color-surface)] p-6">
      <div className="sticky top-0 mb-4 bg-[var(--color-surface)] pb-2">
        <h2 className="text-lg font-bold text-[var(--color-text)]">Ingredients</h2>
        <p className="mt-1 text-xs text-[var(--color-muted)]">
          Check off as you prep each ingredient
        </p>
      </div>

      <div className="space-y-6">
        {ingredientGroups.map((group, groupIndex) => (
          <div key={groupIndex}>
            {group.group && (
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-[var(--accent-weak)]">
                {group.group}
              </h3>
            )}
            <ul className="space-y-1">{group.items.map(renderIngredient)}</ul>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 border-t border-[var(--color-border)] pt-4">
        <div className="space-y-2 text-xs text-[var(--color-muted)]">
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center rounded bg-[var(--color-surface-2)] ring-1 ring-[var(--color-border)]">
              ●
            </span>
            <span>Current step ingredient</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-4 w-4 items-center justify-center">
              <input type="checkbox" checked readOnly className="h-3 w-3" />
            </span>
            <span>Prepped and ready</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
