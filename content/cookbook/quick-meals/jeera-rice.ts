import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "jeera-rice",
  title: "Jeera Rice (Cumin Rice)",
  description: "Fragrant basmati rice tempered with cumin and ghee. The perfect accompaniment to any Indian curry.",
  meta: {
    category: "quick-meals",
    prepTime: 5,
    cookTime: 20,
    totalTime: 25,
    servings: 4,
    difficulty: "beginner",
    cuisine: "Indian",
    tags: ["rice", "side-dish", "aromatic", "quick"],
  },
  ingredients: [
    {
      items: [
        { id: "basmati", name: "Basmati rice", amount: 1.5, unit: "cups", notes: "aged rice works best" },
        { id: "water", name: "Water", amount: 2.5, unit: "cups", notes: "for cooking rice" },
        { id: "ghee", name: "Ghee", amount: 2, unit: "tbsp" },
        { id: "oil", name: "Oil", amount: 1, unit: "tbsp" },
        { id: "cumin", name: "Jeera (cumin seeds)", amount: 1.5, unit: "tsp" },
        { id: "bay-leaf", name: "Tej patta (bay leaf)", amount: 1, unit: "leaf" },
        { id: "cinnamon", name: "Dalchini (cinnamon stick)", amount: 1, unit: "inch" },
        { id: "cloves", name: "Laung (cloves)", amount: 3, unit: "whole" },
        { id: "green-chili", name: "Hari mirch (green chili)", amount: 1, unit: "whole", notes: "slit", optional: true },
        { id: "salt", name: "Salt", amount: 1, unit: "tsp", notes: "or to taste" },
        { id: "cilantro", name: "Cilantro", amount: 2, unit: "tbsp", notes: "chopped for garnish", optional: true },
      ],
    },
  ],
  steps: [
    {
      id: "rinse-rice",
      title: "Rinse and soak rice",
      instruction: "Rinse basmati rice **thoroughly** under cold water until water runs clear — this removes excess starch. Soak in fresh water for `15-20 minutes`. Drain well before cooking.",
      ingredientRefs: ["basmati"],
      timers: [
        { label: "Soak rice", duration: 1200, type: "passive", alert: "Rice is ready!" }
      ],
      tip: "Soaking makes rice fluffier and less likely to break during cooking.",
    },
    {
      id: "temper-spices",
      title: "Temper the spices",
      instruction: "Heat ghee and oil in a heavy-bottomed pot over **medium heat**. Add cumin seeds — they should **sizzle immediately**. Add bay leaf, cinnamon, cloves, and green chili (if using). Sauté for `30 seconds` until **fragrant**.",
      ingredientRefs: ["ghee", "oil", "cumin", "bay-leaf", "cinnamon", "cloves", "green-chili"],
      timers: [
        { label: "Temper spices", duration: 30, type: "active", alert: "Spices are fragrant!" }
      ],
      tip: "The ghee should be hot enough for cumin to sizzle, but not so hot that it burns.",
    },
    {
      id: "add-rice",
      title: "Toast the rice",
      instruction: "Add drained rice to the pot. Stir gently to coat each grain with ghee and spices. Toast for `1-2 minutes` — rice should look glossy and smell aromatic.",
      ingredientRefs: ["basmati"],
      timers: [
        { label: "Toast rice", duration: 120, type: "active", alert: "Rice is toasted!" }
      ],
      tip: "Toasting rice in ghee before cooking adds depth and prevents grains from sticking.",
    },
    {
      id: "cook-rice",
      title: "Cook the rice",
      instruction: "Add water and salt. Stir once gently. Bring to a **rolling boil** over **high heat**. Once boiling, reduce heat to **lowest setting**, cover tightly with a lid, and cook for `12-15 minutes` without opening the lid. The rice should absorb all water.",
      ingredientRefs: ["water", "salt"],
      timers: [
        { label: "Cook rice", duration: 900, type: "passive", alert: "Check if rice is done!" }
      ],
      tip: "Don't open the lid while cooking — steam escapes and rice won't cook evenly.",
    },
    {
      id: "rest-fluff",
      title: "Rest and fluff",
      instruction: "Turn off heat. Let rice rest **covered** for `5 minutes`. This lets grains finish cooking in residual heat. Uncover, fluff gently with a fork. Garnish with cilantro if using.",
      ingredientRefs: ["cilantro"],
      timers: [
        { label: "Rest rice", duration: 300, type: "passive", alert: "Rice is ready to serve!" }
      ],
      tip: "Fluff with a fork, not a spoon — keeps grains separate and prevents mushiness.",
    },
    {
      id: "serve",
      title: "Serve hot",
      instruction: "Serve immediately with **dal, curry, raita, or any Indian gravy dish**. Jeera rice is the perfect neutral canvas for bold curries.",
      ingredientRefs: [],
    },
  ],
  notes: [
    "The ratio is key: 1 cup rice to 1.5-1.75 cups water for fluffy basmati. Adjust based on your rice variety.",
    "Use aged basmati if possible — it's less starchy and grains stay separate.",
    "Leftover jeera rice makes excellent fried rice the next day.",
  ],
  variations: [
    {
      title: "Peas Pulao",
      description: "Add 1 cup fresh or frozen peas after toasting rice. Cook together. Simple one-pot meal.",
      swaps: [],
    },
    {
      title: "Lemon Rice",
      description: "Skip whole spices. After rice is cooked, add lemon juice (3 tbsp), turmeric (1/2 tsp), and a tadka of mustard seeds, peanuts, curry leaves. South Indian favorite.",
      swaps: [],
    },
  ],
};
