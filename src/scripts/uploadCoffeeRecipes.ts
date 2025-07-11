import { supabase } from "@/integrations/supabase/client";

const coffeeRecipesData = [
  { product: "Americano (Hot)", category: "Espresso", ingredient: "Espresso shot", unit: "shot", quantity: 1, costPerUnit: 8, price: 65 },
  { product: "Americano (Hot)", category: "Espresso", ingredient: "Hot water", unit: "ml", quantity: 150, costPerUnit: 0.01, price: 65 },
  { product: "Americano (Iced)", category: "Espresso", ingredient: "Espresso shot", unit: "shot", quantity: 1, costPerUnit: 8, price: 70 },
  { product: "Americano (Iced)", category: "Espresso", ingredient: "Cold water", unit: "ml", quantity: 100, costPerUnit: 0.01, price: 70 },
  { product: "Americano (Iced)", category: "Espresso", ingredient: "Ice", unit: "cubes", quantity: 5, costPerUnit: 0.1, price: 70 },
  { product: "Cappuccino (Hot)", category: "Espresso", ingredient: "Espresso shot", unit: "shot", quantity: 1, costPerUnit: 8, price: 75 },
  { product: "Cappuccino (Hot)", category: "Espresso", ingredient: "Steamed milk", unit: "ml", quantity: 120, costPerUnit: 0.05, price: 75 },
  { product: "Cappuccino (Hot)", category: "Espresso", ingredient: "Milk foam", unit: "ml", quantity: 30, costPerUnit: 0.05, price: 75 },
  { product: "Cappuccino (Iced)", category: "Espresso", ingredient: "Espresso shot", unit: "shot", quantity: 1, costPerUnit: 8, price: 80 },
  { product: "Cappuccino (Iced)", category: "Espresso", ingredient: "Cold milk", unit: "ml", quantity: 120, costPerUnit: 0.05, price: 80 },
  { product: "Cappuccino (Iced)", category: "Espresso", ingredient: "Ice", unit: "cubes", quantity: 5, costPerUnit: 0.1, price: 80 },
  { product: "Cafe Latte (Hot)", category: "Espresso", ingredient: "Espresso shot", unit: "shot", quantity: 1, costPerUnit: 8, price: 75 },
  { product: "Cafe Latte (Hot)", category: "Espresso", ingredient: "Steamed milk", unit: "ml", quantity: 180, costPerUnit: 0.05, price: 75 },
  { product: "Cafe Latte (Iced)", category: "Espresso", ingredient: "Espresso shot", unit: "shot", quantity: 1, costPerUnit: 8, price: 80 },
  { product: "Cafe Latte (Iced)", category: "Espresso", ingredient: "Cold milk", unit: "ml", quantity: 180, costPerUnit: 0.05, price: 80 },
  { product: "Cafe Latte (Iced)", category: "Espresso", ingredient: "Ice", unit: "cubes", quantity: 5, costPerUnit: 0.1, price: 80 },
  { product: "Cafe Mocha (Hot)", category: "Espresso", ingredient: "Espresso shot", unit: "shot", quantity: 1, costPerUnit: 8, price: 80 },
  { product: "Cafe Mocha (Hot)", category: "Espresso", ingredient: "Chocolate syrup", unit: "pump (15 ml)", quantity: 1, costPerUnit: 2, price: 80 },
  { product: "Cafe Mocha (Hot)", category: "Espresso", ingredient: "Steamed milk", unit: "ml", quantity: 150, costPerUnit: 0.05, price: 80 },
  { product: "Cafe Mocha (Iced)", category: "Espresso", ingredient: "Espresso shot", unit: "shot", quantity: 1, costPerUnit: 8, price: 85 },
  { product: "Cafe Mocha (Iced)", category: "Espresso", ingredient: "Chocolate syrup", unit: "pump (15 ml)", quantity: 1, costPerUnit: 2, price: 85 },
  { product: "Cafe Mocha (Iced)", category: "Espresso", ingredient: "Cold milk", unit: "ml", quantity: 150, costPerUnit: 0.05, price: 85 },
  { product: "Cafe Mocha (Iced)", category: "Espresso", ingredient: "Ice", unit: "cubes", quantity: 5, costPerUnit: 0.1, price: 85 },
  { product: "Caramel Latte (Hot)", category: "Espresso", ingredient: "Espresso shot", unit: "shot", quantity: 1, costPerUnit: 8, price: 80 },
  { product: "Caramel Latte (Hot)", category: "Espresso", ingredient: "Caramel syrup", unit: "pump (15 ml)", quantity: 1, costPerUnit: 2, price: 80 },
  { product: "Caramel Latte (Hot)", category: "Espresso", ingredient: "Steamed milk", unit: "ml", quantity: 150, costPerUnit: 0.05, price: 80 },
  { product: "Caramel Latte (Iced)", category: "Espresso", ingredient: "Espresso shot", unit: "shot", quantity: 1, costPerUnit: 8, price: 85 },
  { product: "Caramel Latte (Iced)", category: "Espresso", ingredient: "Caramel syrup", unit: "pump (15 ml)", quantity: 1, costPerUnit: 2, price: 85 },
  { product: "Caramel Latte (Iced)", category: "Espresso", ingredient: "Cold milk", unit: "ml", quantity: 150, costPerUnit: 0.05, price: 85 },
  { product: "Caramel Latte (Iced)", category: "Espresso", ingredient: "Ice", unit: "cubes", quantity: 5, costPerUnit: 0.1, price: 85 }
];

export const uploadCoffeeRecipes = async () => {
  try {
    console.log("Starting coffee recipes upload...");
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Group data by product
    const coffeeProducts = coffeeRecipesData.reduce((acc, item) => {
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

    // Create each coffee recipe template
    for (const [productName, product] of Object.entries(coffeeProducts)) {
      try {
        console.log(`Creating coffee template for ${productName}...`);
        
        // Create recipe template
        const { data: template, error: templateError } = await supabase
          .from('recipe_templates')
          .insert({
            name: product.name,
            description: `Coffee recipe template for ${product.name}`,
            category_name: product.category,
            instructions: 'Follow standard coffee brewing procedures',
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
        const ingredientInserts = product.ingredients.map((ing: any) => ({
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
          console.log(`Successfully created coffee template for ${productName} with ${product.ingredients.length} ingredients`);
          successCount++;
        }
      } catch (error) {
        console.error(`Error processing ${productName}:`, error);
        errorCount++;
      }
    }

    console.log(`Coffee recipes upload complete! Successfully created ${successCount} templates, ${errorCount} errors`);
    return { success: successCount, errors: errorCount };
  } catch (error) {
    console.error('Coffee recipes upload failed:', error);
    throw error;
  }
};

// Auto-run the upload
uploadCoffeeRecipes()
  .then(result => {
    console.log('Coffee recipes upload result:', result);
  })
  .catch(error => {
    console.error('Coffee recipes upload failed:', error);
  });