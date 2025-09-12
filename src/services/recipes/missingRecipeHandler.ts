import { supabase } from "@/integrations/supabase/client";

/**
 * Missing Recipe Handler
 * Creates basic recipes for products that don't have recipe templates
 */

export interface MissingRecipeResult {
  success: boolean;
  recipesCreated: number;
  errors: string[];
  warnings: string[];
}

/**
 * Create basic recipes for products missing them
 * This ensures all products have some form of recipe for inventory deduction
 */
export const createMissingRecipes = async (
  storeId: string, 
  productIds: string[]
): Promise<MissingRecipeResult> => {
  console.log(`🔧 Creating missing recipes for ${productIds.length} products in store ${storeId}`);
  
  const result: MissingRecipeResult = {
    success: true,
    recipesCreated: 0,
    errors: [],
    warnings: []
  };

  try {
    // Get products that don't have recipes
    const { data: productsWithoutRecipes, error: fetchError } = await supabase
      .from('products')
      .select(`
        id,
        name,
        store_id
      `)
      .in('id', productIds)
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (fetchError) {
      result.errors.push(`Error fetching products: ${fetchError.message}`);
      result.success = false;
      return result;
    }

    if (!productsWithoutRecipes || productsWithoutRecipes.length === 0) {
      result.warnings.push('No products found to create recipes for');
      return result;
    }

    // Filter out products that already have recipes
    const existingRecipesQuery = await supabase
      .from('recipes')
      .select('product_id')
      .in('product_id', productIds)
      .eq('store_id', storeId)
      .eq('is_active', true);

    const existingProductIds = new Set(
      existingRecipesQuery.data?.map(r => r.product_id) || []
    );

    const productsNeedingRecipes = productsWithoutRecipes.filter(
      p => !existingProductIds.has(p.id)
    );

    console.log(`📋 Found ${productsNeedingRecipes.length} products needing recipes`);

    // Create basic recipes for products without them
    for (const product of productsNeedingRecipes) {
      try {
        // Create basic recipe
        const { data: newRecipe, error: recipeError } = await supabase
          .from('recipes')
          .insert({
            name: product.name,
            store_id: product.store_id,
            product_id: product.id,
            is_active: true,
            serving_size: 1,
            total_cost: 0,
            cost_per_serving: 0,
            instructions: `Basic recipe for ${product.name} - requires ingredient setup`
          })
          .select()
          .single();

        if (recipeError) {
          if (recipeError.code === '23505') { // Unique constraint violation
            result.warnings.push(`Recipe already exists for ${product.name}`);
            continue;
          }
          result.errors.push(`Error creating recipe for ${product.name}: ${recipeError.message}`);
          continue;
        }

        // Create basic ingredient based on product name
        const basicIngredientName = inferBasicIngredient(product.name);
        
        if (basicIngredientName && newRecipe) {
          const { error: ingredientError } = await supabase
            .from('recipe_ingredients')
            .insert({
              recipe_id: newRecipe.id,
              inventory_stock_id: null, // Will need to be mapped manually
              quantity: 1,
              unit: 'pieces',
              cost_per_unit: 0
            });

          if (ingredientError) {
            result.warnings.push(`Failed to add ingredient for ${product.name}: ${ingredientError.message}`);
          } else {
            console.log(`✅ Created basic recipe for ${product.name} with ingredient: ${basicIngredientName}`);
          }
        }

        result.recipesCreated++;

      } catch (error) {
        result.errors.push(`Unexpected error creating recipe for ${product.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

  } catch (error) {
    result.success = false;
    result.errors.push(`Unexpected error in createMissingRecipes: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  console.log(`📊 Missing recipe creation completed: ${result.recipesCreated} created, ${result.errors.length} errors`);
  
  return result;
};

/**
 * Infer basic ingredient from product name
 */
function inferBasicIngredient(productName: string): string | null {
  const name = productName.toLowerCase();
  
  // Common mappings for croffle products
  if (name.includes('croffle')) {
    return 'Regular Croissant';
  }
  
  // Coffee products
  if (name.includes('americano') || name.includes('latte') || name.includes('cappuccino')) {
    return 'Espresso Shot';
  }
  
  // Beverages
  if (name.includes('lemonade')) {
    return 'Lemonade Powder';
  }
  
  if (name.includes('water')) {
    return 'Water';
  }
  
  if (name.includes('coke') || name.includes('cola')) {
    return 'Coke';
  }
  
  // Sauces and add-ons
  if (name.includes('chocolate') && name.includes('sauce')) {
    return 'Dark Chocolate Sauce';
  }
  
  if (name.includes('caramel')) {
    return 'Caramel Sauce';
  }
  
  // Default fallback - use the product name itself as ingredient
  return productName;
}

/**
 * Create recipes specifically for the transaction products that were missing recipes
 */
export const createRecipesForTransactionProducts = async (storeId: string): Promise<MissingRecipeResult> => {
  const transactionProductIds = [
    '1ace91f3-3bd0-4bc7-bbb9-0a02922b9d6f', // Caramel Delight Croffle
    '634c1bd5-f87b-415e-9274-e6e84fab13d5', // Cookies Cream Croffle  
    '09f556d7-a37f-4444-9cad-16075041c3bd', // Nutella Croffle
    'cf014c04-9bbf-473c-a0fb-2b7b47866abb', // Mango Croffle
    '4f755085-fa3b-4408-af99-3fc615ce4fa9', // Glaze Croffle
    'd6ec8890-6fed-4b4d-99ac-e1b867c21f4d', // Lemonade
    '357bdddc-c75d-4237-85cd-7d3ebcebff0a', // Oreo Strawberry Blended
    '5567d42a-26d9-4196-8474-d453c0d76fbe', // Vanilla Caramel Iced
    'd9463216-e2c0-4788-8853-e9736c881fd0', // Mini Croffle with Choco Flakes and Tiramisu
    '7642c48b-6493-4db6-b5f3-066fee009fd2', // Cafe Latte Iced
    '14ab3e07-ac9d-4d78-9598-fc30cb80983e', // Coke
    'd4d5a2d6-80ec-467c-8102-dcf909fd999c', // Bottled Water
    '37965192-9f7b-4451-981f-0dd535b9e883'  // Dark Chocolate Sauce
  ];

  return createMissingRecipes(storeId, transactionProductIds);
};