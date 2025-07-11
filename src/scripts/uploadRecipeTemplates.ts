import { supabase } from "@/integrations/supabase/client";

const recipeData = [
  { product: "Tiramisu", category: "Classic", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Tiramisu", category: "Classic", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Tiramisu", category: "Classic", ingredient: "Tiramisu", unit: "portion", quantity: 1, costPerUnit: 3.5, price: 125 },
  { product: "Tiramisu", category: "Classic", ingredient: "Choco Flakes", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Tiramisu", category: "Classic", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Tiramisu", category: "Classic", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Choco Nut", category: "Classic", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Choco Nut", category: "Classic", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Choco Nut", category: "Classic", ingredient: "Chocolate", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Choco Nut", category: "Classic", ingredient: "Peanut", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Choco Nut", category: "Classic", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Choco Nut", category: "Classic", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Caramel Delight", category: "Classic", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Caramel Delight", category: "Classic", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Caramel Delight", category: "Classic", ingredient: "Caramel", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Caramel Delight", category: "Classic", ingredient: "Colored Sprinkles", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Caramel Delight", category: "Classic", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Caramel Delight", category: "Classic", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Choco Marshmallow", category: "Classic", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Choco Marshmallow", category: "Classic", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Choco Marshmallow", category: "Classic", ingredient: "Chocolate", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Choco Marshmallow", category: "Classic", ingredient: "Marshmallow", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Choco Marshmallow", category: "Classic", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Choco Marshmallow", category: "Classic", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Strawberry", category: "Fruity", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Strawberry", category: "Fruity", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Strawberry", category: "Fruity", ingredient: "Strawberry Jam", unit: "scoop", quantity: 1, costPerUnit: 5, price: 125 },
  { product: "Strawberry", category: "Fruity", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Strawberry", category: "Fruity", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Mango", category: "Fruity", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Mango", category: "Fruity", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Mango", category: "Fruity", ingredient: "Mango Jam", unit: "scoop", quantity: 1, costPerUnit: 7, price: 125 },
  { product: "Mango", category: "Fruity", ingredient: "Graham Crushed", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Mango", category: "Fruity", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Mango", category: "Fruity", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Blueberry", category: "Fruity", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Blueberry", category: "Fruity", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Blueberry", category: "Fruity", ingredient: "Blueberry Jam", unit: "scoop", quantity: 1, costPerUnit: 7.5, price: 125 },
  { product: "Blueberry", category: "Fruity", ingredient: "Graham Crushed", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Blueberry", category: "Fruity", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Blueberry", category: "Fruity", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Biscoff", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Biscoff", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Biscoff", category: "Premium", ingredient: "Biscoff Crushed", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Biscoff", category: "Premium", ingredient: "Biscoff", unit: "piece", quantity: 1, costPerUnit: 5.62, price: 125 },
  { product: "Biscoff", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Biscoff", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Nutella", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Nutella", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Nutella", category: "Premium", ingredient: "Nutella", unit: "portion", quantity: 1, costPerUnit: 4.5, price: 125 },
  { product: "Nutella", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Nutella", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Kitkat", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Kitkat", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Kitkat", category: "Premium", ingredient: "Chocolate", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Kitkat", category: "Premium", ingredient: "Kitkat", unit: "piece", quantity: 0.5, costPerUnit: 6.25, price: 125 },
  { product: "Kitkat", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Kitkat", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Cookies & Cream", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Cookies & Cream", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Cookies & Cream", category: "Premium", ingredient: "Oreo Crushed", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Cookies & Cream", category: "Premium", ingredient: "Oreo Cookies", unit: "piece", quantity: 1, costPerUnit: 2.9, price: 125 },
  { product: "Cookies & Cream", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Cookies & Cream", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Choco Overload", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Choco Overload", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Choco Overload", category: "Premium", ingredient: "Chocolate", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Choco Overload", category: "Premium", ingredient: "Choco Flakes", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Choco Overload", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Choco Overload", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Matcha", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Matcha", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Matcha", category: "Premium", ingredient: "Matcha crumble", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Matcha", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Matcha", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 },
  { product: "Dark Chocolate", category: "Premium", ingredient: "REGULAR CROISSANT", unit: "piece", quantity: 1, costPerUnit: 30, price: 125 },
  { product: "Dark Chocolate", category: "Premium", ingredient: "WHIPPED CREAM", unit: "serving", quantity: 1, costPerUnit: 8, price: 125 },
  { product: "Dark Chocolate", category: "Premium", ingredient: "Dark Chocolate", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Dark Chocolate", category: "Premium", ingredient: "Chocolate crumble", unit: "portion", quantity: 1, costPerUnit: 2.5, price: 125 },
  { product: "Dark Chocolate", category: "Premium", ingredient: "Chopstick", unit: "pair", quantity: 1, costPerUnit: 0.6, price: 125 },
  { product: "Dark Chocolate", category: "Premium", ingredient: "Wax Paper", unit: "piece", quantity: 1, costPerUnit: 0.7, price: 125 }
];

export const uploadRecipeTemplates = async () => {
  try {
    console.log("Starting recipe template upload...");
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Group data by product
    const recipes = recipeData.reduce((acc, item) => {
      if (!acc[item.product]) {
        acc[item.product] = {
          name: item.product,
          category: item.category,
          price: item.price,
          ingredients: []
        };
      }
      acc[item.product].ingredients.push({
        ingredient_name: item.ingredient,
        quantity: item.quantity,
        unit: item.unit,
        cost_per_unit: item.costPerUnit
      });
      return acc;
    }, {} as Record<string, any>);

    let successCount = 0;
    let errorCount = 0;

    // Create each recipe template
    for (const [productName, recipe] of Object.entries(recipes)) {
      try {
        console.log(`Creating template for ${productName}...`);
        
        // Create recipe template
        const { data: template, error: templateError } = await supabase
          .from('recipe_templates')
          .insert({
            name: recipe.name,
            description: `Recipe template for ${recipe.name}`,
            category_name: recipe.category,
            instructions: 'Instructions to be added',
            yield_quantity: 1,
            serving_size: 1,
            version: 1,
            is_active: true,
            created_by: user.id
          })
          .select()
          .single();

        if (templateError) {
          console.error(`Error creating template for ${productName}:`, templateError);
          errorCount++;
          continue;
        }

        // Create ingredients
        const ingredientInserts = recipe.ingredients.map((ing: any) => ({
          recipe_template_id: template.id,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: ing.cost_per_unit,
          location_type: 'all'
        }));

        const { error: ingredientsError } = await supabase
          .from('recipe_template_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) {
          console.error(`Error creating ingredients for ${productName}:`, ingredientsError);
          errorCount++;
        } else {
          console.log(`Successfully created template for ${productName} with ${recipe.ingredients.length} ingredients`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing ${productName}:`, error);
        errorCount++;
      }
    }

    console.log(`Upload complete! Successfully created ${successCount} templates, ${errorCount} errors`);
    return { success: successCount, errors: errorCount };
  } catch (error) {
    console.error('Upload failed:', error);
    throw error;
  }
};

// Auto-run the upload
uploadRecipeTemplates()
  .then(result => {
    console.log('Upload result:', result);
  })
  .catch(error => {
    console.error('Upload failed:', error);
  });