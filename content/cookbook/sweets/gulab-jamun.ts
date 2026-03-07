import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "gulab-jamun",
  title: "Gulab Jamun",
  description: "Soft, spongy milk dumplings soaked in rose-cardamom syrup. India's most beloved dessert.",
  meta: {
    category: "sweets",
    prepTime: 20,
    cookTime: 40,
    totalTime: 60,
    servings: 15,
    difficulty: "advanced",
    cuisine: "North Indian",
    tags: ["fried", "sweet", "festive", "mithai"],
  },
  ingredients: [
    {
      group: "For the jamuns",
      items: [
        { id: "khoya", name: "Khoya (mawa)", amount: 200, unit: "g", notes: "crumbled" },
        { id: "paneer", name: "Paneer", amount: 50, unit: "g", notes: "grated fine" },
        { id: "flour", name: "All-purpose flour (maida)", amount: 3, unit: "tbsp" },
        { id: "semolina", name: "Sooji (semolina)", amount: 1, unit: "tbsp" },
        { id: "baking-soda", name: "Baking soda", amount: 0.125, unit: "tsp", notes: "tiny pinch" },
        { id: "cardamom", name: "Elaichi powder", amount: 0.25, unit: "tsp" },
        { id: "milk", name: "Milk", amount: 2, unit: "tbsp", notes: "to bind" },
        { id: "ghee-frying", name: "Ghee", amount: 2, unit: "cups", notes: "for deep frying" },
      ],
    },
    {
      group: "For the sugar syrup",
      items: [
        { id: "sugar", name: "Sugar", amount: 2, unit: "cups" },
        { id: "water", name: "Water", amount: 2, unit: "cups" },
        { id: "cardamom-syrup", name: "Elaichi (green cardamom)", amount: 4, unit: "pods", notes: "crushed" },
        { id: "rose-water", name: "Rose water", amount: 1, unit: "tsp" },
        { id: "saffron", name: "Kesar (saffron)", amount: 4, unit: "strands", optional: true },
      ],
    },
  ],
  steps: [
    {
      id: "make-syrup",
      title: "Make the sugar syrup",
      instruction: "In a wide pan, combine sugar, water, and crushed cardamom. Bring to a **boil** on **medium-high heat**. Stir until sugar dissolves. Boil for `5-6 minutes` until syrup is **slightly sticky** (one-thread consistency). Add rose water and saffron. Turn off heat. Keep warm.",
      ingredientRefs: ["sugar", "water", "cardamom-syrup", "rose-water", "saffron"],
      timers: [
        { label: "Make syrup", duration: 360, type: "active", alert: "Syrup is ready!" }
      ],
      tip: "Test syrup: dip your finger, touch thumb and finger — you should feel a sticky thread. Don't overcook.",
    },
    {
      id: "prepare-dough",
      title: "Prepare the jamun dough",
      instruction: "In a bowl, mix crumbled khoya, grated paneer, flour, semolina, cardamom powder, and a tiny pinch of baking soda. **Knead gently** with milk to form a soft, **crack-free dough**. Don't overwork it. The dough should be smooth and pliable, not sticky.",
      ingredientRefs: ["khoya", "paneer", "flour", "semolina", "baking-soda", "cardamom", "milk"],
      tip: "The dough must be smooth with no cracks. Cracks = broken jamuns in hot ghee.",
    },
    {
      id: "shape-jamuns",
      title: "Shape the jamuns",
      instruction: "Grease your palms with ghee. Divide dough into **15 equal portions** (about marble-sized). Roll each into a **perfectly smooth ball** with no cracks. They should feel dense and compact, not airy.",
      ingredientRefs: ["khoya"],
      tip: "Roll between your palms, applying gentle pressure. Perfect spheres = even frying.",
    },
    {
      id: "fry-jamuns",
      title: "Fry the jamuns (slowly)",
      instruction: "Heat ghee in a kadhai to **medium-low heat** (`150°C` — not too hot!). Gently slide in 4-5 jamuns. Fry on **low heat**, stirring **constantly and gently** with a slotted spoon, for `12-15 minutes` until **deep golden brown**. They will double in size. Remove and drain.",
      ingredientRefs: ["ghee-frying", "khoya"],
      timers: [
        { label: "Fry jamuns (batch 1)", duration: 900, type: "active", alert: "Batch 1 done!" }
      ],
      tip: "LOW HEAT is crucial. High heat = burnt outside, raw inside. Stir constantly for even browning.",
    },
    {
      id: "soak-syrup",
      title: "Soak in syrup",
      instruction: "Immediately transfer hot jamuns into the warm sugar syrup. They will **absorb syrup and expand**. Let them soak for **at least 2 hours** (or overnight) before serving. They soften and become spongy as they soak.",
      ingredientRefs: ["sugar"],
      timers: [
        { label: "Soak jamuns", duration: 7200, type: "passive", alert: "Gulab jamuns are ready to serve!" }
      ],
      tip: "Jamuns should be hot when they go into the syrup — helps absorption.",
    },
    {
      id: "serve",
      title: "Serve warm or cold",
      instruction: "Serve gulab jamun warm or chilled in a bowl with extra syrup. Garnish with slivered pistachios or almonds if desired.",
      ingredientRefs: [],
    },
  ],
  notes: [
    "The secret to soft gulab jamun is LOW heat frying and proper kneading. Patience is key.",
    "Khoya quality matters. Use good quality, fresh khoya for best results.",
    "Store in the fridge in syrup for up to a week. They taste even better the next day.",
  ],
  variations: [
    {
      title: "Kala Jamun",
      description: "Fry jamuns longer until very dark brown (almost black). These are denser and less sweet.",
      swaps: [],
    },
    {
      title: "Instant Gulab Jamun (MTR Mix)",
      description: "Use store-bought gulab jamun mix. Follow package directions. Much easier but not quite the same.",
      swaps: [],
    },
  ],
};
