import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "bombay-sandwich",
  title: "Bombay Sandwich",
  description: "Layers of vegetables, green chutney, and butter, toasted to golden perfection. Mumbai's iconic street snack.",
  meta: {
    category: "street-food",
    prepTime: 15,
    cookTime: 10,
    totalTime: 25,
    servings: 4,
    difficulty: "beginner",
    cuisine: "Mumbai Street Food",
    tags: ["vegetarian", "quick", "snack", "grilled"],
  },
  ingredients: [
    {
      items: [
        { id: "bread", name: "White bread", amount: 8, unit: "slices", notes: "fresh, soft" },
        { id: "butter", name: "Butter", amount: 4, unit: "tbsp", notes: "softened" },
        { id: "green-chutney", name: "Green chutney", amount: 0.5, unit: "cup", notes: "cilantro-mint-chili" },
        { id: "potatoes", name: "Potatoes", amount: 2, unit: "medium", notes: "boiled, thinly sliced" },
        { id: "cucumber", name: "Cucumber", amount: 1, unit: "large", notes: "thinly sliced" },
        { id: "tomato", name: "Tomatoes", amount: 2, unit: "medium", notes: "thinly sliced" },
        { id: "onion", name: "Onions", amount: 1, unit: "small", notes: "thinly sliced", optional: true },
        { id: "beetroot", name: "Beetroot", amount: 1, unit: "small", notes: "boiled, thinly sliced" },
        { id: "cheese", name: "Processed cheese slices", amount: 4, unit: "slices", notes: "Amul or similar" },
        { id: "sandwich-masala", name: "Sandwich masala", amount: 2, unit: "tsp", notes: "or chaat masala" },
        { id: "salt", name: "Salt", amount: 1, unit: "to taste" },
        { id: "black-pepper", name: "Black pepper", amount: 0.5, unit: "tsp", notes: "freshly ground" },
        { id: "lemon-juice", name: "Lemon juice", amount: 1, unit: "tbsp" },
      ],
    },
  ],
  steps: [
    {
      id: "prep-vegetables",
      title: "Prepare the vegetables",
      instruction: "Slice all vegetables **very thin** — about `2mm` thick. Arrange them on a plate. Sprinkle vegetables lightly with salt, black pepper, and lemon juice. Let sit for `5 minutes` to release excess water.",
      ingredientRefs: ["potatoes", "cucumber", "tomato", "onion", "beetroot", "salt", "black-pepper", "lemon-juice"],
      timers: [
        { label: "Marinate vegetables", duration: 300, type: "passive", alert: "Vegetables are ready!" }
      ],
      tip: "Pat vegetables dry with a paper towel before assembling — prevents soggy sandwiches.",
    },
    {
      id: "assemble",
      title: "Assemble the sandwiches",
      instruction: "Lay out 4 bread slices. **Generously** spread green chutney on each. Layer: potato slices, cucumber, tomato, onion (if using), beetroot. Sprinkle sandwich masala. Place a cheese slice on top. Spread butter on the other 4 bread slices and close the sandwiches.",
      ingredientRefs: ["bread", "green-chutney", "potatoes", "cucumber", "tomato", "onion", "beetroot", "sandwich-masala", "cheese", "butter"],
      tip: "Layer vegetables in that order — potatoes on bottom provide structure, cheese on top helps seal everything.",
    },
    {
      id: "grill-sandwiches",
      title: "Grill the sandwiches",
      instruction: "Heat a sandwich griller or panini press. Spread butter on the **outside** of both bread slices. Place sandwich in griller. Cook for `3-4 minutes` until **golden brown and crispy** with grill marks. Press down gently.",
      ingredientRefs: ["butter", "bread"],
      timers: [
        { label: "Grill sandwiches", duration: 240, type: "active", alert: "Sandwiches are golden!" }
      ],
      tip: "No griller? Use a pan with a heavy pot on top to press down. Or use a toaster and pan-fry after.",
    },
    {
      id: "serve",
      title: "Cut and serve",
      instruction: "Remove sandwiches, let cool for `1 minute`, then cut **diagonally** into triangles. Serve immediately with **extra green chutney** and **potato chips** on the side.",
      ingredientRefs: ["green-chutney"],
      timers: [
        { label: "Cool slightly", duration: 60, type: "passive", alert: "Ready to cut!" }
      ],
    },
  ],
  notes: [
    "The secret is the green chutney — make it spicy and tangy. It's the flavor backbone.",
    "Processed cheese (like Amul) melts better than natural cheese for this sandwich.",
    "Some street vendors add chaat masala to the vegetables — adds a tangy, savory punch.",
  ],
  variations: [
    {
      title: "Cheese Chutney Sandwich",
      description: "Skip all vegetables except cheese. Just bread, chutney, cheese, and butter. Simpler but equally delicious.",
      swaps: [],
    },
    {
      title: "Grilled Masala Corn Sandwich",
      description: "Add boiled sweet corn mixed with butter and chaat masala as an extra layer.",
      swaps: [],
    },
  ],
};
