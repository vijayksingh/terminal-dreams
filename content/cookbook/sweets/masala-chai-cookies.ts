import { CookbookRecipe } from "@/lib/cookbook-types";

export const recipe: CookbookRecipe = {
  slug: "masala-chai-cookies",
  title: "Masala Chai Cookies",
  description: "Buttery cookies spiced with cardamom, ginger, and cinnamon. Chai time, but crunchy.",
  meta: {
    category: "sweets",
    prepTime: 20,
    cookTime: 15,
    totalTime: 35,
    servings: 24,
    difficulty: "beginner",
    cuisine: "Indian-inspired Baking",
    tags: ["cookies", "spiced", "tea-time", "baking"],
  },
  ingredients: [
    {
      items: [
        { id: "butter", name: "Butter", amount: 150, unit: "g", notes: "softened" },
        { id: "sugar", name: "Sugar", amount: 0.75, unit: "cup", notes: "granulated" },
        { id: "brown-sugar", name: "Brown sugar", amount: 0.25, unit: "cup" },
        { id: "egg", name: "Egg", amount: 1, unit: "large" },
        { id: "vanilla", name: "Vanilla extract", amount: 1, unit: "tsp" },
        { id: "flour", name: "All-purpose flour", amount: 2, unit: "cups" },
        { id: "baking-soda", name: "Baking soda", amount: 0.5, unit: "tsp" },
        { id: "salt", name: "Salt", amount: 0.25, unit: "tsp" },
        { id: "cardamom", name: "Elaichi (cardamom) powder", amount: 1, unit: "tsp" },
        { id: "ginger", name: "Ground ginger", amount: 1, unit: "tsp" },
        { id: "cinnamon", name: "Cinnamon powder", amount: 0.5, unit: "tsp" },
        { id: "cloves", name: "Ground cloves", amount: 0.25, unit: "tsp" },
        { id: "black-pepper", name: "Black pepper", amount: 0.125, unit: "tsp", notes: "tiny pinch", optional: true },
      ],
    },
  ],
  steps: [
    {
      id: "cream-butter",
      title: "Cream butter and sugars",
      instruction: "In a large bowl, beat softened butter, granulated sugar, and brown sugar with an electric mixer on **medium speed** until **light and fluffy**, about `3-4 minutes`. Scrape down sides as needed.",
      ingredientRefs: ["butter", "sugar", "brown-sugar"],
      timers: [
        { label: "Cream butter", duration: 240, type: "active", alert: "Butter is fluffy!" }
      ],
      tip: "Softened butter should be room temperature — it should dent when pressed but not be greasy.",
    },
    {
      id: "add-wet",
      title: "Add egg and vanilla",
      instruction: "Beat in the egg and vanilla extract until **well combined**, about `1 minute`. The mixture should look smooth and emulsified.",
      ingredientRefs: ["egg", "vanilla"],
      timers: [
        { label: "Mix wet ingredients", duration: 60, type: "active", alert: "Mixed!" }
      ],
    },
    {
      id: "mix-dry",
      title: "Mix dry ingredients",
      instruction: "In a separate bowl, whisk together flour, baking soda, salt, cardamom powder, ground ginger, cinnamon, cloves, and black pepper (if using). Whisk well to distribute spices evenly.",
      ingredientRefs: ["flour", "baking-soda", "salt", "cardamom", "ginger", "cinnamon", "cloves", "black-pepper"],
      tip: "Whisking dry ingredients ensures even spice distribution in every cookie.",
    },
    {
      id: "combine",
      title: "Combine wet and dry",
      instruction: "Add dry ingredients to the butter mixture. Mix on **low speed** (or fold with a spatula) until **just combined**. Don't overmix — you want tender cookies, not tough ones.",
      ingredientRefs: ["flour"],
      tip: "Stop mixing as soon as no flour streaks remain. Overmixing develops gluten = tough cookies.",
    },
    {
      id: "chill",
      title: "Chill the dough",
      instruction: "Cover the bowl with plastic wrap. Refrigerate for **at least 30 minutes** (or up to 3 days). This firms up the dough and intensifies the spice flavors.",
      ingredientRefs: [],
      timers: [
        { label: "Chill dough", duration: 1800, type: "passive", alert: "Dough is chilled!" }
      ],
      tip: "Chilled dough = cookies that hold their shape and don't spread too much.",
    },
    {
      id: "shape-bake",
      title: "Shape and bake",
      instruction: "Preheat oven to `350°F (175°C)`. Line baking sheets with parchment paper. Scoop dough into **24 balls** (about 1.5 tbsp each). Place on sheets, spacing `2 inches` apart. **Flatten slightly** with your palm. Bake for `12-14 minutes` until edges are **golden** but centers still look slightly underbaked. They firm up as they cool.",
      ingredientRefs: [],
      timers: [
        { label: "Bake cookies", duration: 840, type: "active", alert: "Cookies are done!" }
      ],
      tip: "Don't overbake! Cookies should look slightly underdone in the center when you remove them.",
    },
    {
      id: "cool",
      title: "Cool completely",
      instruction: "Let cookies cool on the baking sheet for `5 minutes`, then transfer to a wire rack to cool completely. They will crisp up as they cool.",
      ingredientRefs: [],
      timers: [
        { label: "Cool on sheet", duration: 300, type: "passive", alert: "Move to cooling rack!" }
      ],
    },
  ],
  notes: [
    "These cookies get better the next day as the spice flavors meld. Store in an airtight container for up to a week.",
    "For extra crunch, roll dough balls in coarse sugar before baking.",
    "Perfect with (what else?) a cup of masala chai.",
  ],
  variations: [
    {
      title: "Chai Chocolate Chip Cookies",
      description: "Fold in 1 cup of dark chocolate chips to the dough after mixing.",
      swaps: [],
    },
    {
      title: "Vegan Chai Cookies",
      description: "Replace butter with vegan butter, egg with flax egg (1 tbsp flaxseed meal + 3 tbsp water).",
      swaps: [
        { ingredientId: "butter", replacement: "Vegan butter (150g)" },
        { ingredientId: "egg", replacement: "Flax egg (1 tbsp flaxseed + 3 tbsp water)" },
      ],
    },
  ],
};
