import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "chole",
  title: "Chole (Punjabi Chickpea Curry)",
  description: "Bold, tangy chickpeas in a spiced tomato gravy. The backbone of North Indian street food.",
  meta: {
    category: "curries",
    prepTime: 15,
    cookTime: 45,
    totalTime: 60,
    servings: 4,
    difficulty: "beginner",
    cuisine: "Punjabi",
    tags: ["vegetarian", "chickpeas", "street-food", "comfort-food"],
  },
  ingredients: [
    {
      items: [
        { id: "chickpeas", name: "Kabuli chana (chickpeas)", amount: 2, unit: "cups", notes: "soaked overnight or 2 cans" },
        { id: "tea-bags", name: "Tea bags", amount: 2, unit: "bags", notes: "for dark color", optional: true },
        { id: "oil", name: "Oil", amount: 3, unit: "tbsp" },
        { id: "cumin", name: "Jeera (cumin seeds)", amount: 1, unit: "tsp" },
        { id: "bay-leaf", name: "Tej patta", amount: 1, unit: "leaf" },
        { id: "onion", name: "Onions", amount: 2, unit: "large", notes: "finely chopped" },
        { id: "tomato", name: "Tomatoes", amount: 2, unit: "large", notes: "pureed" },
        { id: "ginger-garlic", name: "Ginger-garlic paste", amount: 1, unit: "tbsp" },
        { id: "green-chili", name: "Hari mirch (green chilies)", amount: 2, unit: "whole", notes: "slit lengthwise" },
        { id: "chole-masala", name: "Chole masala", amount: 2, unit: "tbsp", notes: "store-bought or homemade" },
        { id: "turmeric", name: "Haldi (turmeric)", amount: 0.5, unit: "tsp" },
        { id: "red-chili", name: "Lal mirch (red chili powder)", amount: 1, unit: "tsp" },
        { id: "coriander-powder", name: "Dhania powder (coriander)", amount: 1, unit: "tsp" },
        { id: "amchur", name: "Amchur (dry mango powder)", amount: 1, unit: "tsp", notes: "for tang" },
        { id: "salt", name: "Salt", amount: 1, unit: "to taste" },
        { id: "garam-masala", name: "Garam masala", amount: 1, unit: "tsp" },
        { id: "cilantro", name: "Hara dhania (cilantro)", amount: 0.25, unit: "cup", notes: "chopped" },
        { id: "ginger", name: "Ginger", amount: 1, unit: "inch", notes: "julienned for garnish" },
        { id: "lemon", name: "Lemon", amount: 1, unit: "whole", notes: "cut into wedges" },
      ],
    },
  ],
  steps: [
    {
      id: "cook-chickpeas",
      title: "Cook the chickpeas",
      instruction: "If using dried chickpeas: Pressure cook soaked chickpeas with salt, tea bags (for dark color), and water for **4-5 whistles** or `20 minutes` on high. If using canned, drain and rinse well.",
      ingredientRefs: ["chickpeas", "tea-bags", "salt"],
      timers: [
        { label: "Pressure cook chickpeas", duration: 1200, type: "passive", alert: "Chickpeas should be soft!" }
      ],
      tip: "Tea bags give chole its dark color. You can also use a pinch of baking soda.",
    },
    {
      id: "temper-spices",
      title: "Temper the spices",
      instruction: "Heat oil in a heavy-bottomed pan over **medium heat**. Add jeera and tej patta. Let them sizzle for `30 seconds` until fragrant.",
      ingredientRefs: ["oil", "cumin", "bay-leaf"],
      timers: [
        { label: "Temper spices", duration: 30, type: "active", alert: "Spices are fragrant!" }
      ],
    },
    {
      id: "cook-onions",
      title: "Cook the onion base",
      instruction: "Add chopped onions. Sauté on **medium-high heat** until **golden brown**, about `8-10 minutes`. Add ginger-garlic paste and green chilies. Cook for `2 minutes` until raw smell disappears.",
      ingredientRefs: ["onion", "ginger-garlic", "green-chili"],
      timers: [
        { label: "Sauté onions", duration: 600, type: "active", alert: "Onions should be golden!" }
      ],
    },
    {
      id: "add-spices",
      title: "Add the spice powders",
      instruction: "Add turmeric, red chili powder, coriander powder, and chole masala. Stir for `1 minute` on **low heat** to bloom the spices. Don't burn them.",
      ingredientRefs: ["turmeric", "red-chili", "coriander-powder", "chole-masala"],
      timers: [
        { label: "Bloom spices", duration: 60, type: "active", alert: "Spices bloomed!" }
      ],
      tip: "Reduce heat before adding powdered spices — they burn quickly.",
    },
    {
      id: "cook-tomatoes",
      title: "Cook the tomato masala",
      instruction: "Add pureed tomatoes and salt. Cook on **medium heat**, stirring frequently, until oil separates from the masala, about `10-12 minutes`. The gravy should be thick and darker.",
      ingredientRefs: ["tomato", "salt"],
      timers: [
        { label: "Cook masala", duration: 720, type: "active", alert: "Oil should separate from masala!" }
      ],
    },
    {
      id: "simmer-chole",
      title: "Simmer the chole",
      instruction: "Add cooked chickpeas with their cooking liquid (about `1 cup`). Add amchur. Bring to a boil, then **simmer** on low heat for `10 minutes`. Mash a few chickpeas against the side of the pan to thicken the gravy.",
      ingredientRefs: ["chickpeas", "amchur"],
      timers: [
        { label: "Simmer chole", duration: 600, type: "passive", alert: "Chole is ready!" }
      ],
      tip: "The longer you simmer, the better the flavors blend. Add water if it gets too thick.",
    },
    {
      id: "finish",
      title: "Finish and serve",
      instruction: "Sprinkle garam masala on top. Garnish with chopped cilantro and ginger julienne. Serve hot with **bhature, kulcha, or rice**. Squeeze lemon juice on top before eating.",
      ingredientRefs: ["garam-masala", "cilantro", "ginger", "lemon"],
    },
  ],
  notes: [
    "Amchur (dry mango powder) adds the signature tangy flavor. You can substitute with a bit of lemon juice.",
    "For authentic dhaba-style chole, cook on very low heat for 20-30 minutes — the gravy thickens and flavors deepen.",
    "Serve with sliced onions, green chilies, and lemon wedges on the side.",
  ],
  variations: [
    {
      title: "Chole Bhature",
      description: "Serve with fluffy deep-fried bhature (leavened bread). The classic Punjabi breakfast combo.",
      swaps: [],
    },
    {
      title: "Instant Pot Chole",
      description: "Pressure cook everything together (dried chickpeas, onions, tomatoes, spices) for 30 minutes. Quick and easy.",
      swaps: [],
    },
  ],
};
