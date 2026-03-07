"use client";

import { useCallback, useState } from "react";

export interface IngredientState {
  [ingredientId: string]: boolean; // true = prepped/checked off
}

export function useIngredientTracking(initialState: IngredientState = {}) {
  const [preparedIngredients, setPreparedIngredients] = useState<IngredientState>(initialState);

  const toggleIngredient = useCallback((ingredientId: string) => {
    setPreparedIngredients((prev) => ({
      ...prev,
      [ingredientId]: !prev[ingredientId],
    }));
  }, []);

  const markIngredientPrepared = useCallback((ingredientId: string) => {
    setPreparedIngredients((prev) => ({
      ...prev,
      [ingredientId]: true,
    }));
  }, []);

  const markIngredientUnprepared = useCallback((ingredientId: string) => {
    setPreparedIngredients((prev) => ({
      ...prev,
      [ingredientId]: false,
    }));
  }, []);

  const resetAllIngredients = useCallback(() => {
    setPreparedIngredients({});
  }, []);

  const isIngredientPrepared = useCallback(
    (ingredientId: string): boolean => {
      return preparedIngredients[ingredientId] ?? false;
    },
    [preparedIngredients]
  );

  return {
    preparedIngredients,
    toggleIngredient,
    markIngredientPrepared,
    markIngredientUnprepared,
    resetAllIngredients,
    isIngredientPrepared,
  };
}
