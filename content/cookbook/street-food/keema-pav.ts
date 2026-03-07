import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "keema-pav",
  title: "Keema Pav",
  description: "Spiced minced meat curry served with buttered pav. Mumbai's answer to sloppy joes, but infinitely better.",
  meta: {
    category: "street-food",
    prepTime: 15,
    cookTime: 35,
    totalTime: 50,
    servings: 4,
    difficulty: "intermediate",
    cuisine: "Mumbai Street Food",
    tags: ["meat", "spicy", "comfort-food"],
  },
  ingredients: [
    {
      items: [
        { id: "oil", name: "Oil", amount: 3, unit: "tbsp" },
        { id: "bay-leaf", name: "Tej patta", amount: 1, unit: "leaf" },
        { id: "cinnamon", name: "Dalchini", amount: 1, unit: "inch stick" },
        { id: "cloves", name: "Laung (cloves)", amount: 3, unit: "whole" },
        { id: "onion", name: "Onions", amount: 2, unit: "large", notes: "finely chopped" },
        { id: "ginger-garlic", name: "Ginger-garlic paste", amount: 2, unit: "tbsp" },
        { id: "green-chili", name: "Hari mirch", amount: 2, unit: "whole", notes: "slit" },
        { id: "tomato", name: "Tomatoes", amount: 2, unit: "large", notes: "finely chopped" },
        { id: "keema", name: "Mutton or chicken keema (mince)", amount: 500, unit: "g" },
        { id: "turmeric", name: "Haldi", amount: 0.5, unit: "tsp" },
        { id: "red-chili", name: "Lal mirch", amount: 1, unit: "tsp" },
        { id: "coriander-powder", name: "Dhania powder", amount: 2, unit: "tsp" },
        { id: "garam-masala", name: "Garam masala", amount: 1, unit: "tsp" },
        { id: "pav-bhaji-masala", name: "Pav bhaji masala", amount: 1, unit: "tsp", notes: "for Mumbai flavor" },
        { id: "salt", name: "Salt", amount: 1, unit: "to taste" },
        { id: "water", name: "Water", amount: 0.5, unit: "cup" },
        { id: "cilantro", name: "Cilantro", amount: 0.25, unit: "cup", notes: "chopped" },
        { id: "lemon-juice", name: "Lemon juice", amount: 2, unit: "tbsp" },
        { id: "pav", name: "Pav (dinner rolls)", amount: 8, unit: "buns" },
        { id: "butter", name: "Butter", amount: 3, unit: "tbsp", notes: "for pav" },
        { id: "onion-garnish", name: "Onions", amount: 1, unit: "small", notes: "finely diced for garnish" },
      ],
    },
  ],
  steps: [
    {
      id: "temper-spices",
      title: "Temper whole spices",
      instruction: "Heat oil in a heavy-bottomed pan over **medium heat**. Add bay leaf, cinnamon, and cloves. Let them sizzle for `30 seconds` until fragrant.",
      ingredientRefs: ["oil", "bay-leaf", "cinnamon", "cloves"],
      timers: [
        { label: "Temper spices", duration: 30, type: "active", alert: "Spices are fragrant!" }
      ],
    },
    {
      id: "cook-onions",
      title: "Cook the onions",
      instruction: "Add chopped onions. Sauté on **medium-high heat** until **golden brown**, about `8-10 minutes`. Add ginger-garlic paste and green chilies. Cook for `2 minutes` until raw smell disappears.",
      ingredientRefs: ["onion", "ginger-garlic", "green-chili"],
      timers: [
        { label: "Sauté onions", duration: 600, type: "active", alert: "Onions should be golden!" }
      ],
      tip: "Well-browned onions = sweet, rich keema. Don't rush this step.",
    },
    {
      id: "cook-tomatoes",
      title: "Add tomatoes and spices",
      instruction: "Add chopped tomatoes. Cook until they **break down completely** and oil starts to separate, about `6-7 minutes`. Add turmeric, red chili powder, coriander powder, and salt. Stir for `1 minute`.",
      ingredientRefs: ["tomato", "turmeric", "red-chili", "coriander-powder", "salt"],
      timers: [
        { label: "Cook tomatoes", duration: 480, type: "active", alert: "Tomatoes are broken down!" }
      ],
    },
    {
      id: "cook-keema",
      title: "Cook the keema",
      instruction: "Add minced meat. Turn heat to **high**. Break up any lumps with a spatula. Cook, stirring frequently, until meat is **browned** and no pink remains, about `8-10 minutes`. The meat should be crumbly and slightly crispy at the edges.",
      ingredientRefs: ["keema"],
      timers: [
        { label: "Brown keema", duration: 600, type: "active", alert: "Keema is browned!" }
      ],
      tip: "High heat helps brown the meat and evaporate moisture. Don't cover — you want a dry keema.",
    },
    {
      id: "simmer",
      title: "Add water and simmer",
      instruction: "Add water, garam masala, and pav bhaji masala. Stir well. Reduce heat to **low** and simmer covered for `10 minutes`. The keema should be moist but not soupy.",
      ingredientRefs: ["water", "garam-masala", "pav-bhaji-masala"],
      timers: [
        { label: "Simmer keema", duration: 600, type: "passive", alert: "Keema is ready!" }
      ],
      tip: "If it gets too dry, add a splash of water. If too wet, cook uncovered for a few more minutes.",
    },
    {
      id: "finish",
      title: "Finish with herbs",
      instruction: "Turn off heat. Stir in chopped cilantro and lemon juice. Adjust salt. The keema should be richly spiced and slightly moist.",
      ingredientRefs: ["cilantro", "lemon-juice"],
    },
    {
      id: "toast-pav",
      title: "Toast the pav",
      instruction: "Heat butter on a griddle or tawa. Slice pav horizontally (don't cut through). Toast cut-side down until **golden and crispy**, about `2 minutes`.",
      ingredientRefs: ["butter", "pav"],
      timers: [
        { label: "Toast pav", duration: 120, type: "active", alert: "Pav is golden!" }
      ],
      parallel: true,
    },
    {
      id: "serve",
      title: "Serve hot",
      instruction: "Serve keema in a bowl with toasted pav on the side. Garnish with finely diced onions and a lemon wedge. Eat by tearing pav and scooping keema.",
      ingredientRefs: ["onion-garnish"],
    },
  ],
  notes: [
    "Pav bhaji masala adds a Mumbai street-food flavor. Don't skip it — it's what makes this keema taste like it's from a Mumbai stall.",
    "Mutton keema is more traditional and flavorful, but chicken works too (and cooks faster).",
    "Leftovers make excellent keema pav the next day, or use in frankie rolls.",
  ],
  variations: [
    {
      title: "Kheema Ghotala",
      description: "Add 2 beaten eggs to the cooked keema, scramble together. Popular Irani cafe version.",
      swaps: [],
    },
    {
      title: "Vegetarian Soya Keema",
      description: "Replace meat with soya granules (rehydrated in hot water). Follow the same recipe.",
      swaps: [{ ingredientId: "keema", replacement: "Soya granules (1.5 cups, rehydrated)" }],
    },
  ],
};
