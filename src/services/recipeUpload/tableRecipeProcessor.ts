import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface TableRecipeRow {
  product: string;
  category: string;
  ingredientName: string;
  unitOfMeasure: string;
  quantity: number;
  costPerUnit: number;
  price: number;
}

interface ProcessedRecipe {
  name: string;
  category: string;
  price: number;
  ingredients: {
    ingredient_name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
  }[];
}

export const parseTableData = (tableData: string): TableRecipeRow[] => {
  const lines = tableData.trim().split('\n');
  const rows: TableRecipeRow[] = [];
  
  // Skip header lines (first 2 lines)
  for (let i = 2; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('|---')) continue;
    
    const columns = line.split('|').map(col => col.trim()).filter(col => col !== '');
    
    if (columns.length >= 6) {
      rows.push({
        product: columns[0],
        category: columns[1],
        ingredientName: columns[2],
        unitOfMeasure: columns[3],
        quantity: parseFloat(columns[4]) || 0,
        costPerUnit: parseFloat(columns[5]) || 0,
        price: parseFloat(columns[6]) || 0
      });
    }
  }
  
  return rows;
};

export const groupRecipesByProduct = (rows: TableRecipeRow[]): ProcessedRecipe[] => {
  const recipeMap = new Map<string, ProcessedRecipe>();
  
  rows.forEach(row => {
    if (!recipeMap.has(row.product)) {
      recipeMap.set(row.product, {
        name: row.product,
        category: row.category,
        price: row.price,
        ingredients: []
      });
    }
    
    const recipe = recipeMap.get(row.product)!;
    recipe.ingredients.push({
      ingredient_name: row.ingredientName,
      quantity: row.quantity,
      unit: row.unitOfMeasure,
      cost_per_unit: row.costPerUnit
    });
  });
  
  return Array.from(recipeMap.values());
};

export const processTableRecipes = async (tableData: string): Promise<boolean> => {
  try {
    console.log('Starting table recipe processing...');
    
    // Parse table data
    const rows = parseTableData(tableData);
    console.log(`Parsed ${rows.length} ingredient rows`);
    
    // Group by product
    const recipes = groupRecipesByProduct(rows);
    console.log(`Found ${recipes.length} unique recipes`);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error('No authenticated user found');
      return false;
    }
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];
    
    // Process each recipe
    for (const recipe of recipes) {
      try {
        console.log(`Processing recipe: ${recipe.name}`);
        
        // Calculate total cost
        const totalCost = recipe.ingredients.reduce((sum, ing) => 
          sum + (ing.quantity * ing.cost_per_unit), 0
        );
        
        // Create recipe template
        const { data: template, error: templateError } = await supabase
          .from('recipe_templates')
          .insert({
            name: recipe.name,
            description: `${recipe.category} croffle with premium ingredients`,
            category_name: recipe.category,
            instructions: `1. Prepare ${recipe.name.toLowerCase()} base\n2. Add all ingredients as specified\n3. Serve with chopsticks and wax paper`,
            yield_quantity: 1,
            serving_size: 1,
            version: 1,
            is_active: true,
            created_by: user.id,
            total_cost: totalCost,
            suggested_price: recipe.price
          })
          .select()
          .single();
        
        if (templateError) {
          console.error(`Error creating template for ${recipe.name}:`, templateError);
          errorCount++;
          errors.push(`Failed to create template for "${recipe.name}": ${templateError.message}`);
          continue;
        }
        
        console.log(`Created template ${template.id} for ${recipe.name}`);
        
        // Add ingredients
        const ingredientInserts = recipe.ingredients.map(ingredient => ({
          recipe_template_id: template.id,
          ingredient_name: ingredient.ingredient_name,
          commissary_item_name: ingredient.ingredient_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost_per_unit,
          recipe_unit: ingredient.unit,
          purchase_unit: ingredient.unit,
          conversion_factor: 1,
          location_type: 'all'
        }));
        
        const { error: ingredientsError } = await supabase
          .from('recipe_template_ingredients')
          .insert(ingredientInserts);
        
        if (ingredientsError) {
          console.error(`Error adding ingredients for ${recipe.name}:`, ingredientsError);
          errorCount++;
          errors.push(`Failed to add ingredients for "${recipe.name}": ${ingredientsError.message}`);
          
          // Clean up template
          await supabase
            .from('recipe_templates')
            .delete()
            .eq('id', template.id);
          continue;
        }
        
        console.log(`Successfully added ${ingredientInserts.length} ingredients to ${recipe.name}`);
        successCount++;
        
      } catch (error) {
        console.error(`Error processing recipe ${recipe.name}:`, error);
        errorCount++;
        errors.push(`Error processing "${recipe.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    console.log(`Processing complete: ${successCount} successful, ${errorCount} failed`);
    
    // Show results to user
    if (successCount > 0) {
      toast.success(`Successfully created ${successCount} recipe template${successCount !== 1 ? 's' : ''}${errorCount > 0 ? ` (${errorCount} failed)` : ''}`);
    }
    
    if (errorCount > 0) {
      if (successCount === 0) {
        toast.error(`Failed to create recipe templates. Please check the console for details.`);
      } else {
        toast.warning(`${errorCount} recipe templates failed to create. Check console for details.`);
      }
      
      // Log errors for debugging
      errors.forEach(error => console.error('Processing error:', error));
    }
    
    return successCount > 0;
    
  } catch (error) {
    console.error('Error processing table recipes:', error);
    toast.error('Failed to process recipe table');
    return false;
  }
};