import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "pani-puri",
  title: "Pani Puri (Golgappa)",
  description: "Crispy puris filled with spiced potato and chickpeas, dunked in tangy, spicy water. India's most joyful street food.",
  meta: {
    category: "street-food",
    prepTime: 30,
    cookTime: 15,
    totalTime: 45,
    servings: 6,
    difficulty: "intermediate",
    cuisine: "Indian Street Food",
    tags: ["vegetarian", "tangy", "spicy", "interactive"],
  },
  ingredients: [
    {
      group: "For the pani (spiced water)",
      items: [
        { id: "mint", name: "Pudina (mint leaves)", amount: 1, unit: "cup", notes: "packed" },
        { id: "cilantro", name: "Cilantro", amount: 0.5, unit: "cup" },
        { id: "green-chili", name: "Hari mirch", amount: 3, unit: "whole", notes: "adjust for heat" },
        { id: "ginger", name: "Ginger", amount: 0.5, unit: "inch" },
        { id: "cumin-powder", name: "Jeera powder (roasted)", amount: 2, unit: "tsp" },
        { id: "black-salt", name: "Kala namak (black salt)", amount: 1, unit: "tsp" },
        { id: "chaat-masala", name: "Chaat masala", amount: 1, unit: "tsp" },
        { id: "tamarind", name: "Tamarind pulp", amount: 2, unit: "tbsp" },
        { id: "jaggery", name: "Gud (jaggery)", amount: 2, unit: "tsp", notes: "or sugar" },
        { id: "salt", name: "Salt", amount: 1, unit: "to taste" },
        { id: "water-pani", name: "Ice-cold water", amount: 4, unit: "cups" },
      ],
    },
    {
      group: "For the filling",
      items: [
        { id: "potatoes", name: "Potatoes", amount: 3, unit: "medium", notes: "boiled, small dice" },
        { id: "chickpeas", name: "White chickpeas", amount: 1, unit: "cup", notes: "boiled or canned" },
        { id: "onion", name: "Onions", amount: 1, unit: "small", notes: "finely chopped", optional: true },
        { id: "sev", name: "Boondi or sev", amount: 0.5, unit: "cup", notes: "crispy chickpea noodles" },
        { id: "chaat-masala-filling", name: "Chaat masala", amount: 1, unit: "tsp" },
        { id: "red-chili-powder", name: "Lal mirch", amount: 0.5, unit: "tsp" },
        { id: "salt-filling", name: "Salt", amount: 1, unit: "to taste" },
      ],
    },
    {
      group: "For assembly",
      items: [
        { id: "puris", name: "Pani puri shells", amount: 36, unit: "pieces", notes: "store-bought" },
        { id: "tamarind-chutney", name: "Sweet tamarind chutney", amount: 0.25, unit: "cup", optional: true },
      ],
    },
  ],
  steps: [
    {
      id: "make-pani",
      title: "Make the pani (spiced water)",
      instruction: "In a blender, combine mint, cilantro, green chilies, ginger, cumin powder, black salt, chaat masala, tamarind, jaggery, and regular salt. Add `1 cup` of water. Blend to a **smooth paste**. Strain through a fine sieve into a large bowl. Add the remaining `3 cups` of **ice-cold water**. Mix well. Taste and adjust seasoning — it should be tangy, spicy, and slightly sweet. Refrigerate.",
      ingredientRefs: ["mint", "cilantro", "green-chili", "ginger", "cumin-powder", "black-salt", "chaat-masala", "tamarind", "jaggery", "salt", "water-pani"],
      tip: "The pani should be COLD. Add ice cubes if needed. The contrast of cold pani with room-temp filling is key.",
    },
    {
      id: "prepare-filling",
      title: "Prepare the potato-chickpea filling",
      instruction: "In a bowl, mix boiled potatoes, chickpeas, onions (if using), chaat masala, red chili powder, and salt. Mash lightly — keep some texture. Set aside.",
      ingredientRefs: ["potatoes", "chickpeas", "onion", "chaat-masala-filling", "red-chili-powder", "salt-filling"],
      tip: "Filling should be moist but not wet. Pat dry if needed.",
    },
    {
      id: "assemble",
      title: "Assemble the pani puri",
      instruction: "**To eat:** Take a puri. Gently crack a hole on top with your thumb. Fill with `1-2 tsp` of potato-chickpea filling. Add a pinch of boondi/sev. Optionally add a drop of tamarind chutney. Dunk the puri **completely** into the pani to fill it. Immediately pop the whole thing into your mouth. Repeat. Speed is key — soggy puri = sad puri.",
      ingredientRefs: ["puris", "potatoes", "chickpeas", "sev", "tamarind-chutney", "water-pani"],
      tip: "Assemble and eat one at a time. Never fill all puris in advance — they get soggy.",
    },
    {
      id: "serve",
      title: "Serve family-style",
      instruction: "Set up a pani puri station: bowl of puris, bowl of filling, bowl of boondi, bowl of chilled pani. Let everyone assemble their own. It's an interactive experience!",
      ingredientRefs: [],
    },
  ],
  notes: [
    "Pani puri is best enjoyed standing, with friends, straight from the street vendor's cart. But homemade is pretty close.",
    "Kala namak (black salt) is essential — it gives the pani its distinctive savory, slightly sulfurous flavor.",
    "Some people like 'sukha' (dry) puri with just filling, some like extra pani. Customize to taste.",
  ],
  variations: [
    {
      title: "Dahi Puri",
      description: "Skip the pani. Fill puris with potato-chickpea mix, top with sweetened yogurt, tamarind chutney, sev, and chaat masala. Eaten with a spoon.",
      swaps: [],
    },
    {
      title: "Ragda Puri",
      description: "Replace chickpeas with spiced white pea curry (ragda). Popular in Mumbai.",
      swaps: [{ ingredientId: "chickpeas", replacement: "Ragda (spiced white pea curry)" }],
    },
  ],
};
