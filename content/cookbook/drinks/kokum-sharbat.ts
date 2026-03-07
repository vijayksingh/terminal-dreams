import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "kokum-sharbat",
  title: "Kokum Sharbat (Sol Kadhi Base)",
  description: "Tangy, cooling drink made from dried kokum fruit. Konkan coast's answer to lemonade, but better.",
  meta: {
    category: "drinks",
    prepTime: 10,
    cookTime: 15,
    totalTime: 25,
    servings: 4,
    difficulty: "beginner",
    cuisine: "Konkani",
    tags: ["cooling", "digestive", "summer", "tangy"],
  },
  ingredients: [
    {
      group: "For the kokum concentrate",
      items: [
        { id: "kokum", name: "Dried kokum", amount: 10, unit: "pieces", notes: "aamsul or kokum petals" },
        { id: "water-kokum", name: "Water", amount: 2, unit: "cups", notes: "for soaking" },
        { id: "jaggery", name: "Gud (jaggery)", amount: 0.5, unit: "cup", notes: "grated, or sugar" },
        { id: "cumin", name: "Jeera (cumin seeds)", amount: 1, unit: "tsp", notes: "roasted and ground" },
        { id: "black-salt", name: "Kala namak (black salt)", amount: 0.5, unit: "tsp" },
        { id: "regular-salt", name: "Regular salt", amount: 0.25, unit: "tsp" },
      ],
    },
    {
      group: "For serving",
      items: [
        { id: "water-serving", name: "Chilled water", amount: 4, unit: "cups" },
        { id: "ice", name: "Ice cubes", amount: 8, unit: "cubes" },
        { id: "mint", name: "Pudina (mint leaves)", amount: 8, unit: "leaves", notes: "for garnish", optional: true },
      ],
    },
  ],
  steps: [
    {
      id: "soak-kokum",
      title: "Soak the kokum",
      instruction: "Rinse dried kokum pieces. Place in a bowl with `2 cups` warm water. Let soak for `15-20 minutes` until soft and plump. The water will turn deep pink-red.",
      ingredientRefs: ["kokum", "water-kokum"],
      timers: [
        { label: "Soak kokum", duration: 1200, type: "passive", alert: "Kokum is soft!" }
      ],
      tip: "The longer you soak, the more concentrated the flavor. Some people soak overnight.",
    },
    {
      id: "extract-juice",
      title: "Extract kokum juice",
      instruction: "Once soft, **squeeze and mash** the kokum pieces in the water with your hands to extract maximum flavor. Strain through a fine sieve, pressing the kokum to extract all liquid. Discard the pulp. You should have about `1.5 cups` of deep red kokum concentrate.",
      ingredientRefs: ["kokum"],
      tip: "Really squeeze the kokum — the flavor is in the pulp. Don't be gentle.",
    },
    {
      id: "make-concentrate",
      title: "Make the sharbat concentrate",
      instruction: "In a small pot, combine kokum juice, grated jaggery, roasted cumin powder, black salt, and regular salt. Heat on **low heat**, stirring, until jaggery dissolves completely, about `3-4 minutes`. Don't boil. Let cool completely. Refrigerate.",
      ingredientRefs: ["kokum", "jaggery", "cumin", "black-salt", "regular-salt"],
      timers: [
        { label: "Dissolve jaggery", duration: 240, type: "active", alert: "Concentrate is ready!" }
      ],
      tip: "This concentrate keeps in the fridge for 2 weeks. Make a big batch.",
    },
    {
      id: "serve",
      title: "Dilute and serve",
      instruction: "To serve: In a glass, add `3-4 tbsp` of kokum concentrate (adjust to taste). Fill with chilled water and ice cubes. Stir well. Garnish with mint leaves. The drink should be tangy, slightly sweet, and very refreshing.",
      ingredientRefs: ["water-serving", "ice", "mint"],
      tip: "Taste and adjust — add more concentrate for stronger flavor, more water for lighter. Everyone's preference differs.",
    },
  ],
  notes: [
    "Kokum is rich in antioxidants and aids digestion — traditionally served after heavy meals.",
    "The black salt adds a savory note that balances the sweetness and tang perfectly.",
    "If kokum is unavailable, you can substitute with tamarind, but the flavor will be different.",
  ],
  variations: [
    {
      title: "Sol Kadhi (Savory Version)",
      description: "Skip the jaggery. Add coconut milk (1 cup) to the kokum concentrate. Season with more cumin, green chilies, and cilantro. Served as a digestive curry.",
      swaps: [],
    },
    {
      title: "Kokum Mojito",
      description: "Add crushed mint, lime juice, and a splash of soda water to the sharbat for a fizzy twist.",
      swaps: [],
    },
  ],
};
