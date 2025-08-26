import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Recipe data from the markdown table
const CROFFLE_RECIPES_DATA = [
  {
    product: 'Tiramisu',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Tiramisu', unit: 'portion', quantity: 1, cost: 3.5 },
      { name: 'Choco Flakes', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'Choco Nut',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Peanut', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'Caramel Delight',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Caramel', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Colored Sprinkles', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'Choco Marshmallow',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Marshmallow', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'Strawberry',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Strawberry Jam', unit: 'scoop', quantity: 1, cost: 5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'Mango',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Mango Jam', unit: 'scoop', quantity: 1, cost: 7 },
      { name: 'Graham Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'Blueberry',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Blueberry Jam', unit: 'scoop', quantity: 1, cost: 7.5 },
      { name: 'Graham Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'Biscoff',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Biscoff Crushed', unit: 'portion', quantity: 1, cost: 5 },
      { name: 'Biscoff', unit: 'piece', quantity: 1, cost: 5.62 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'Nutella',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Nutella', unit: 'portion', quantity: 1, cost: 4.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'KitKat',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'KitKat', unit: 'piece', quantity: 0.5, cost: 6.25 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'Cookies & Cream',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Oreo Crushed', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Oreo Cookies', unit: 'piece', quantity: 1, cost: 2.9 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'Choco Overload',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Choco Flakes', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'Matcha',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Matcha Crumble', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  },
  {
    product: 'Dark Chocolate',
    category: 'Classic',
    price: 125,
    ingredients: [
      { name: 'Regular Croissant', unit: 'piece', quantity: 1, cost: 30 },
      { name: 'Whipped Cream', unit: 'serving', quantity: 1, cost: 8 },
      { name: 'Dark Chocolate', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chocolate Crumble', unit: 'portion', quantity: 1, cost: 2.5 },
      { name: 'Chopstick', unit: 'pair', quantity: 1, cost: 0.6 },
      { name: 'Wax Paper', unit: 'piece', quantity: 1, cost: 0.7 }
    ]
  }
];

interface RecipeIngredient {
  name: string;
  unit: string;
  quantity: number;
  cost: number;
}

interface RecipeData {
  product: string;
  category: string;
  price: number;
  ingredients: RecipeIngredient[];
}

/**
 * Get current user ID for recipe creation
 */
async function getCurrentUserId(): Promise<string | null> {
  const { data: { user } } = await supabase.auth.getUser();
  return user?.id || null;
}

/**
 * Find or create commissary inventory item
 */
async function findOrCreateCommissaryItem(ingredient: RecipeIngredient): Promise<string | null> {
  try {
    // First, try to find existing item
    const { data: existingItem } = await supabase
      .from('commissary_inventory')
      .select('id')
      .eq('name', ingredient.name)
      .eq('is_active', true)
      .single();

    if (existingItem) {
      console.log(`✅ Found existing commissary item: ${ingredient.name}`);
      return existingItem.id;
    }

    // If not found, create new commissary item
    console.log(`🔄 Creating new commissary item: ${ingredient.name}`);
    
    const { data: newItem, error } = await supabase
      .from('commissary_inventory')
      .insert({
        name: ingredient.name,
        category: 'raw_materials',
        item_type: 'raw_material',
        current_stock: 100, // Default stock
        minimum_threshold: 10, // Default threshold
        unit: ingredient.unit,
        unit_cost: ingredient.cost,
        is_active: true
      })
      .select('id')
      .single();

    if (error) {
      console.error(`❌ Error creating commissary item ${ingredient.name}:`, error);
      return null;
    }

    console.log(`✅ Created new commissary item: ${ingredient.name} (ID: ${newItem.id})`);
    return newItem.id;
  } catch (error) {
    console.error(`❌ Error processing commissary item ${ingredient.name}:`, error);
    return null;
  }
}

/**
 * Create or update recipe template with ingredients
 */
async function createRecipeTemplate(recipe: RecipeData, userId: string): Promise<boolean> {
  try {
    console.log(`🔄 Processing recipe: ${recipe.product}`);
    
    // Calculate total cost
    const totalCost = recipe.ingredients.reduce((sum, ing) => sum + (ing.cost * ing.quantity), 0);
    
    // Check if template already exists
    const { data: existingTemplate } = await supabase
      .from('recipe_templates')
      .select('id')
      .eq('name', recipe.product)
      .single();

    let templateId: string;

    if (existingTemplate) {
      console.log(`📝 Updating existing template: ${recipe.product}`);
      templateId = existingTemplate.id;
      
      // Update the template
      const { error: updateError } = await supabase
        .from('recipe_templates')
        .update({
          description: `${recipe.product} croffle with detailed ingredients`,
          category_name: recipe.category.toLowerCase(),
          total_cost: totalCost,
          suggested_price: recipe.price,
          updated_at: new Date().toISOString()
        })
        .eq('id', templateId);

      if (updateError) {
        console.error(`❌ Error updating template ${recipe.product}:`, updateError);
        return false;
      }

      // Delete existing ingredients
      await supabase
        .from('recipe_template_ingredients')
        .delete()
        .eq('recipe_template_id', templateId);
        
    } else {
      console.log(`➕ Creating new template: ${recipe.product}`);
      
      // Create new template
      const { data: newTemplate, error: templateError } = await supabase
        .from('recipe_templates')
        .insert({
          name: recipe.product,
          description: `${recipe.product} croffle with detailed ingredients`,
          category_name: recipe.category.toLowerCase(),
          instructions: `Prepare ${recipe.product} croffle with all specified ingredients`,
          yield_quantity: 1,
          serving_size: 1,
          total_cost: totalCost,
          suggested_price: recipe.price,
          version: 1,
          is_active: true,
          created_by: userId
        })
        .select('id')
        .single();

      if (templateError) {
        console.error(`❌ Error creating template ${recipe.product}:`, templateError);
        return false;
      }

      templateId = newTemplate.id;
    }

    // Add ingredients
    console.log(`🥄 Adding ${recipe.ingredients.length} ingredients to ${recipe.product}`);
    
    const ingredientInserts = [];
    
    for (const ingredient of recipe.ingredients) {
      const commissaryItemId = await findOrCreateCommissaryItem(ingredient);
      
      if (commissaryItemId) {
        ingredientInserts.push({
          recipe_template_id: templateId,
          commissary_item_id: commissaryItemId,
          ingredient_name: ingredient.name,
          commissary_item_name: ingredient.name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost,
          recipe_unit: ingredient.unit,
          purchase_unit: ingredient.unit,
          conversion_factor: 1,
          location_type: 'all'
        });
      } else {
        console.warn(`⚠️ Could not process ingredient: ${ingredient.name} for ${recipe.product}`);
      }
    }

    if (ingredientInserts.length > 0) {
      const { error: ingredientsError } = await supabase
        .from('recipe_template_ingredients')
        .insert(ingredientInserts);

      if (ingredientsError) {
        console.error(`❌ Error adding ingredients for ${recipe.product}:`, ingredientsError);
        return false;
      }
    }

    console.log(`✅ Successfully processed recipe: ${recipe.product} with ${ingredientInserts.length} ingredients`);
    return true;
  } catch (error) {
    console.error(`❌ Error processing recipe ${recipe.product}:`, error);
    return false;
  }
}

/**
 * Main function to bulk upload all croffle recipes
 */
export async function bulkUploadCroffleRecipes(): Promise<void> {
  try {
    console.log('🚀 Starting bulk upload of croffle recipes...');
    
    const userId = await getCurrentUserId();
    if (!userId) {
      toast.error('User not authenticated');
      return;
    }

    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Process all recipes
    for (const recipe of CROFFLE_RECIPES_DATA) {
      const success = await createRecipeTemplate(recipe, userId);
      if (success) {
        successCount++;
      } else {
        errorCount++;
        errors.push(recipe.product);
      }
    }

    console.log(`📊 Upload Summary:`);
    console.log(`✅ Successful: ${successCount}`);
    console.log(`❌ Failed: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log(`❌ Failed recipes: ${errors.join(', ')}`);
    }

    toast.success(`Bulk upload completed! ${successCount} recipes processed successfully.`);
    
    if (errorCount > 0) {
      toast.error(`${errorCount} recipes failed. Check console for details.`);
    }

  } catch (error) {
    console.error('❌ Error in bulk upload:', error);
    toast.error('Bulk upload failed. Check console for details.');
  }
}

// Export for use in components
export default bulkUploadCroffleRecipes;
