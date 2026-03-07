import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "filter-coffee",
  title: "South Indian Filter Coffee",
  description: "Strong, aromatic coffee brewed in a traditional filter, mixed with frothy milk. South India's morning ritual.",
  meta: {
    category: "drinks",
    prepTime: 5,
    cookTime: 15,
    totalTime: 20,
    servings: 2,
    difficulty: "intermediate",
    cuisine: "South Indian",
    tags: ["coffee", "traditional", "strong", "frothy"],
  },
  ingredients: [
    {
      items: [
        { id: "coffee-powder", name: "Filter coffee powder", amount: 4, unit: "tbsp", notes: "80% coffee + 20% chicory blend" },
        { id: "hot-water", name: "Hot water", amount: 1, unit: "cup", notes: "just boiled" },
        { id: "milk", name: "Milk", amount: 2, unit: "cups", notes: "whole milk" },
        { id: "sugar", name: "Sugar", amount: 3, unit: "tsp", notes: "or to taste" },
      ],
    },
  ],
  steps: [
    {
      id: "prepare-filter",
      title: "Prepare the coffee filter",
      instruction: "Place the filter coffee powder in the upper chamber of the traditional filter. Gently press down with the filter disc — don't pack it too tight. Place the filter over the lower chamber.",
      ingredientRefs: ["coffee-powder"],
      tip: "A traditional South Indian filter has two parts: upper (with perforated bottom) and lower (collection chamber).",
    },
    {
      id: "brew-decoction",
      title: "Brew the decoction",
      instruction: "Pour hot water over the coffee powder, filling the upper chamber. Cover with the lid. Let it **drip slowly** through the filter into the lower chamber for `10-15 minutes`. The resulting dark, concentrated liquid is called **'decoction'**. You should get about `0.5 cup` of decoction.",
      ingredientRefs: ["hot-water"],
      timers: [
        { label: "Brew decoction", duration: 900, type: "passive", alert: "Decoction is ready!" }
      ],
      tip: "Slow drip = strong decoction. If it drips too fast, the coffee powder was too coarse or packed too loose.",
    },
    {
      id: "heat-milk",
      title: "Heat and froth the milk",
      instruction: "While the coffee brews, heat milk in a small pot until **just boiling**. Remove from heat. Pour milk between two vessels (like a tumbler and a dabara) from a height, **8-10 times**, creating froth. This is the traditional 'meter' coffee technique.",
      ingredientRefs: ["milk"],
      timers: [
        { label: "Heat milk", duration: 300, type: "active", alert: "Milk is hot!" }
      ],
      tip: "Pouring from height aerates and cools the milk slightly while creating froth. Classic filter coffee technique.",
    },
    {
      id: "mix-coffee",
      title: "Mix the coffee",
      instruction: "In a tumbler, add `2-3 tbsp` of decoction (adjust for strength). Add sugar. Pour in the hot frothed milk, filling the tumbler. Stir well or pour between tumbler and dabara a few times to mix and create more froth.",
      ingredientRefs: ["coffee-powder", "sugar", "milk"],
      tip: "Standard ratio: 1 part decoction to 3-4 parts milk. Adjust based on how strong you like it.",
    },
    {
      id: "serve",
      title: "Serve in traditional style",
      instruction: "Serve in a **steel tumbler** with a **dabara** (small bowl) underneath. The coffee should be hot, frothy, and aromatic. Sip from the dabara to cool it slightly.",
      ingredientRefs: [],
    },
  ],
  notes: [
    "The coffee-chicory blend is traditional. Chicory adds body and slight bitterness. Pure coffee works too but tastes different.",
    "Decoction keeps in the fridge for 2-3 days. Make a batch and use as needed.",
    "The secret to great filter coffee is the 'pouring' technique — it aerates, mixes, and cools the coffee perfectly.",
  ],
  variations: [
    {
      title: "Strong Kaapi (Madras Style)",
      description: "Use more decoction (4-5 tbsp) and less milk for a very strong, dark coffee.",
      swaps: [],
    },
    {
      title: "Iced Filter Coffee",
      description: "Mix decoction with sugar and cold milk. Pour over ice. Add a scoop of vanilla ice cream for indulgence.",
      swaps: [],
    },
  ],
};
