import { MasterRecipe } from '@/services/workflow/masterDataOrchestrator';

export const sampleMasterRecipes: MasterRecipe[] = [
  {
    name: "Classic Croffle",
    description: "Traditional croissant waffle with perfect texture",
    instructions: "1. Preheat croffle maker\n2. Place croissant dough in maker\n3. Cook for 3-4 minutes\n4. Serve hot with toppings",
    category_name: "Croffle",
    serving_size: 1,
    recipe_type: "main",
    ingredients: [
      { ingredient_name: "Croissant Dough", quantity: 1, unit: "pieces", cost_per_unit: 15.00 },
      { ingredient_name: "Butter", quantity: 5, unit: "g", cost_per_unit: 0.50 },
      { ingredient_name: "Powdered Sugar", quantity: 3, unit: "g", cost_per_unit: 0.20 }
    ]
  },
  {
    name: "Chocolate Croffle",
    description: "Croffle filled with rich chocolate",
    instructions: "1. Prepare classic croffle base\n2. Add chocolate filling\n3. Cook until golden\n4. Top with chocolate sauce",
    category_name: "Croffle",
    serving_size: 1,
    recipe_type: "main",
    ingredients: [
      { ingredient_name: "Croissant Dough", quantity: 1, unit: "pieces", cost_per_unit: 15.00 },
      { ingredient_name: "Chocolate Chips", quantity: 10, unit: "g", cost_per_unit: 0.80 },
      { ingredient_name: "Chocolate Sauce", quantity: 15, unit: "ml", cost_per_unit: 1.20 },
      { ingredient_name: "Powdered Sugar", quantity: 3, unit: "g", cost_per_unit: 0.20 }
    ]
  },
  {
    name: "Iced Americano",
    description: "Classic iced coffee with perfect balance",
    instructions: "1. Prepare double espresso shot\n2. Add cold water\n3. Pour over ice\n4. Serve immediately",
    category_name: "Coffee",
    serving_size: 1,
    recipe_type: "beverage",
    ingredients: [
      { ingredient_name: "Espresso Shot", quantity: 60, unit: "ml", cost_per_unit: 8.00 },
      { ingredient_name: "Cold Water", quantity: 120, unit: "ml", cost_per_unit: 0.05 },
      { ingredient_name: "Ice Cubes", quantity: 100, unit: "g", cost_per_unit: 0.10 }
    ]
  },
  {
    name: "Caffe Latte",
    description: "Smooth espresso with steamed milk",
    instructions: "1. Prepare espresso shot\n2. Steam milk to 65°C\n3. Pour steamed milk into espresso\n4. Create latte art if desired",
    category_name: "Coffee",
    serving_size: 1,
    recipe_type: "beverage",
    ingredients: [
      { ingredient_name: "Espresso Shot", quantity: 30, unit: "ml", cost_per_unit: 8.00 },
      { ingredient_name: "Fresh Milk", quantity: 150, unit: "ml", cost_per_unit: 2.50 },
      { ingredient_name: "Sugar", quantity: 5, unit: "g", cost_per_unit: 0.15 }
    ]
  },
  {
    name: "Cappuccino",
    description: "Perfect balance of espresso, steamed milk, and foam",
    instructions: "1. Prepare espresso shot\n2. Steam milk with dense foam\n3. Pour milk maintaining foam layer\n4. Dust with cocoa powder",
    category_name: "Coffee",
    serving_size: 1,
    recipe_type: "beverage",
    ingredients: [
      { ingredient_name: "Espresso Shot", quantity: 30, unit: "ml", cost_per_unit: 8.00 },
      { ingredient_name: "Fresh Milk", quantity: 100, unit: "ml", cost_per_unit: 2.50 },
      { ingredient_name: "Cocoa Powder", quantity: 1, unit: "g", cost_per_unit: 0.30 }
    ]
  },
  {
    name: "Iced Matcha Latte",
    description: "Refreshing matcha with cold milk over ice",
    instructions: "1. Whisk matcha powder with hot water\n2. Add sweetener\n3. Pour over ice and cold milk\n4. Stir gently",
    category_name: "Tea",
    serving_size: 1,
    recipe_type: "beverage",
    ingredients: [
      { ingredient_name: "Matcha Powder", quantity: 2, unit: "g", cost_per_unit: 15.00 },
      { ingredient_name: "Hot Water", quantity: 30, unit: "ml", cost_per_unit: 0.02 },
      { ingredient_name: "Fresh Milk", quantity: 150, unit: "ml", cost_per_unit: 2.50 },
      { ingredient_name: "Simple Syrup", quantity: 20, unit: "ml", cost_per_unit: 0.80 },
      { ingredient_name: "Ice Cubes", quantity: 100, unit: "g", cost_per_unit: 0.10 }
    ]
  },
  {
    name: "Fresh Orange Juice",
    description: "Freshly squeezed orange juice",
    instructions: "1. Select ripe oranges\n2. Extract juice using juicer\n3. Strain if desired\n4. Serve immediately over ice",
    category_name: "Juice",
    serving_size: 1,
    recipe_type: "beverage",
    ingredients: [
      { ingredient_name: "Fresh Oranges", quantity: 3, unit: "pieces", cost_per_unit: 8.00 },
      { ingredient_name: "Ice Cubes", quantity: 50, unit: "g", cost_per_unit: 0.10 }
    ]
  },
  {
    name: "Vanilla Ice Cream Croffle",
    description: "Warm croffle topped with vanilla ice cream",
    instructions: "1. Prepare classic croffle\n2. Place hot croffle on plate\n3. Add scoop of vanilla ice cream\n4. Drizzle with caramel sauce",
    category_name: "Dessert",
    serving_size: 1,
    recipe_type: "dessert",
    ingredients: [
      { ingredient_name: "Croissant Dough", quantity: 1, unit: "pieces", cost_per_unit: 15.00 },
      { ingredient_name: "Vanilla Ice Cream", quantity: 60, unit: "g", cost_per_unit: 12.00 },
      { ingredient_name: "Caramel Sauce", quantity: 20, unit: "ml", cost_per_unit: 1.50 },
      { ingredient_name: "Mint Leaves", quantity: 2, unit: "pieces", cost_per_unit: 0.50 }
    ]
  }
];