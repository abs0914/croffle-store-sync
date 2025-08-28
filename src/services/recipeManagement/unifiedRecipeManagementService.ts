/**
 * Unified Recipe Management Service
 * 
 * This service provides a complete, robust pipeline for recipe management:
 * CSV Import → Template Creation → Recipe Deployment → Product Catalog → Category Assignment
 * 
 * Replaces all temporary fixes and provides a single source of truth for recipe operations.
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Types
export interface RecipeImportData {
  name: string;
  recipe_category: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  ingredient_category: string;
  suggested_price?: number;
}

export interface RecipeTemplate {
  id?: string;
  name: string;
  description: string;
  category_name: string;
  instructions: string;
  yield_quantity: number;
  serving_size: number;
  suggested_price: number;
  total_cost: number;
  is_active: boolean;
  ingredients: RecipeTemplateIngredient[];
}

export interface RecipeTemplateIngredient {
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  ingredient_category: string;
}

// NO CATEGORY MAPPING - Use exact CSV values as provided by user
// This follows the principle: "Take what's in the file and use it directly"

/**
 * Parse CSV data into structured recipe data
 */
export const parseRecipeCSV = (csvData: string): RecipeImportData[] => {
  const lines = csvData.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const expectedHeaders = ['name', 'recipe_category', 'ingredient_name', 'quantity', 'unit', 'cost_per_unit', 'ingredient_category'];
  
  // Validate headers
  const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
  if (missingHeaders.length > 0) {
    throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
  }

  const recipes: RecipeImportData[] = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    if (values.length < expectedHeaders.length) continue;

    const recipe: RecipeImportData = {
      name: values[headers.indexOf('name')],
      recipe_category: values[headers.indexOf('recipe_category')] || 'classic',
      ingredient_name: values[headers.indexOf('ingredient_name')],
      quantity: parseFloat(values[headers.indexOf('quantity')]) || 0,
      unit: values[headers.indexOf('unit')],
      cost_per_unit: parseFloat(values[headers.indexOf('cost_per_unit')]) || 0,
      ingredient_category: values[headers.indexOf('ingredient_category')] || 'ingredients'
    };

    // Add suggested price if available
    const priceIndex = headers.indexOf('suggested_price');
    if (priceIndex >= 0 && values[priceIndex]) {
      recipe.suggested_price = parseFloat(values[priceIndex]);
    }

    recipes.push(recipe);
  }

  return recipes;
};

/**
 * Group recipe data by recipe name
 */
export const groupRecipesByName = (recipes: RecipeImportData[]): Map<string, RecipeTemplate> => {
  const recipeMap = new Map<string, RecipeTemplate>();

  recipes.forEach(row => {
    if (!row.name) return;

    if (!recipeMap.has(row.name)) {
      // Calculate suggested price (use provided or calculate from ingredients)
      const recipeRows = recipes.filter(r => r.name === row.name);
      const totalCost = recipeRows.reduce((sum, r) => sum + (r.quantity * r.cost_per_unit), 0);
      const suggestedPrice = row.suggested_price || Math.ceil(totalCost * 1.8); // 80% markup

      recipeMap.set(row.name, {
        name: row.name,
        description: `${row.recipe_category} recipe: ${row.name}`,
        category_name: row.recipe_category, // Use exact CSV value - no conversion
        instructions: 'Follow standard preparation procedures',
        yield_quantity: 1,
        serving_size: 1,
        suggested_price: suggestedPrice,
        total_cost: totalCost,
        is_active: true,
        ingredients: []
      });
    }

    // Add ingredient to recipe
    const recipe = recipeMap.get(row.name)!;
    recipe.ingredients.push({
      ingredient_name: row.ingredient_name,
      quantity: row.quantity,
      unit: row.unit,
      cost_per_unit: row.cost_per_unit,
      ingredient_category: row.ingredient_category
    });
  });

  return recipeMap;
};

/**
 * Create recipe templates in database
 */
export const createRecipeTemplates = async (
  recipes: Map<string, RecipeTemplate>,
  userId: string
): Promise<{ success: boolean; created: number; errors: string[] }> => {
  const errors: string[] = [];
  let created = 0;

  for (const [name, recipe] of recipes) {
    try {
      // Create recipe template
      const { data: template, error: templateError } = await supabase
        .from('recipe_templates')
        .insert({
          name: recipe.name,
          description: recipe.description,
          category_name: recipe.category_name,
          instructions: recipe.instructions,
          yield_quantity: recipe.yield_quantity,
          serving_size: recipe.serving_size,
          suggested_price: recipe.suggested_price,
          total_cost: recipe.total_cost,
          is_active: recipe.is_active,
          created_by: userId,
          version: 1
        })
        .select()
        .single();

      if (templateError) {
        errors.push(`Failed to create template for ${name}: ${templateError.message}`);
        continue;
      }

      // Create template ingredients
      if (recipe.ingredients.length > 0) {
        const ingredients = recipe.ingredients.map(ing => ({
          recipe_template_id: template.id,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: ing.cost_per_unit,
          ingredient_category: ing.ingredient_category,
          ingredient_type: ing.ingredient_category === 'packaging' ? 'packaging' : 'base',
          ingredient_group_name: 'Base Ingredients',
          group_selection_type: 'required_all',
          is_optional: false
        }));

        const { error: ingredientsError } = await supabase
          .from('recipe_template_ingredients')
          .insert(ingredients);

        if (ingredientsError) {
          errors.push(`Failed to create ingredients for ${name}: ${ingredientsError.message}`);
          continue;
        }
      }

      created++;
    } catch (error) {
      errors.push(`Unexpected error creating ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { success: errors.length === 0, created, errors };
};

/**
 * Ensure categories exist in all stores
 */
export const ensureStoreCategories = async (): Promise<void> => {
  // Get all active stores
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .eq('is_active', true);

  if (storesError || !stores) {
    throw new Error('Failed to fetch stores');
  }

  // Get unique category names from active recipe templates (exact CSV values)
  const { data: templates } = await supabase
    .from('recipe_templates')
    .select('category_name')
    .eq('is_active', true);

  const categoryNames = [...new Set(
    templates?.map(t => t.category_name).filter(Boolean) || []
  )];

  for (const store of stores) {
    for (const categoryName of categoryNames) {
      // Check if category exists
      const { data: existing } = await supabase
        .from('categories')
        .select('id')
        .eq('store_id', store.id)
        .eq('name', categoryName)
        .eq('is_active', true)
        .maybeSingle();

      if (!existing) {
        // Create category
        await supabase
          .from('categories')
          .insert({
            store_id: store.id,
            name: categoryName,
            description: `Category for ${categoryName} items`,
            is_active: true
          });
      }
    }
  }
};

/**
 * Deploy recipe templates to all stores
 */
export const deployRecipeTemplatesToAllStores = async (
  templateIds?: string[]
): Promise<{ success: boolean; deployed: number; errors: string[] }> => {
  const errors: string[] = [];
  let deployed = 0;

  // Get templates to deploy
  let query = supabase
    .from('recipe_templates')
    .select(`
      id, name, description, category_name, instructions, 
      yield_quantity, serving_size, suggested_price, total_cost,
      recipe_template_ingredients(*)
    `)
    .eq('is_active', true);

  if (templateIds && templateIds.length > 0) {
    query = query.in('id', templateIds);
  }

  const { data: templates, error: templatesError } = await query;

  if (templatesError || !templates) {
    return { success: false, deployed: 0, errors: ['Failed to fetch templates'] };
  }

  // Get all active stores
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .eq('is_active', true);

  if (storesError || !stores) {
    return { success: false, deployed: 0, errors: ['Failed to fetch stores'] };
  }

  // Ensure categories exist
  await ensureStoreCategories();

  // Deploy each template to each store
  for (const template of templates) {
    for (const store of stores) {
      try {
        await deployTemplateToStore(template, store.id);
        deployed++;
      } catch (error) {
        errors.push(`Failed to deploy ${template.name} to ${store.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  return { success: errors.length === 0, deployed, errors };
};

/**
 * Deploy a single template to a single store
 */
const deployTemplateToStore = async (template: any, storeId: string): Promise<void> => {
  // Check if recipe already exists
  const { data: existingRecipe } = await supabase
    .from('recipes')
    .select('id')
    .eq('template_id', template.id)
    .eq('store_id', storeId)
    .maybeSingle();

  if (existingRecipe) {
    return; // Already deployed
  }

  // Create recipe
  const { data: recipe, error: recipeError } = await supabase
    .from('recipes')
    .insert({
      name: template.name,
      description: template.description,
      instructions: template.instructions,
      yield_quantity: template.yield_quantity,
      serving_size: template.serving_size,
      total_cost: template.total_cost,
      suggested_price: template.suggested_price,
      store_id: storeId,
      template_id: template.id,
      is_active: true,
      approval_status: 'approved'
    })
    .select()
    .single();

  if (recipeError) {
    throw new Error(`Failed to create recipe: ${recipeError.message}`);
  }

  // Get category for product catalog - use exact template category name
  const categoryName = template.category_name; // Use exact CSV value
  const { data: category } = await supabase
    .from('categories')
    .select('id')
    .eq('store_id', storeId)
    .eq('name', categoryName) // Use exact category name from CSV
    .eq('is_active', true)
    .maybeSingle();

  // Create product catalog entry
  await supabase
    .from('product_catalog')
    .insert({
      store_id: storeId,
      recipe_id: recipe.id,
      product_name: template.name,
      description: template.description,
      price: template.suggested_price || 0,
      category_id: category?.id || null,
      is_available: true,
      display_order: 0
    });
};

/**
 * Complete recipe import pipeline
 */
export const importRecipesFromCSV = async (
  csvData: string,
  userId: string
): Promise<{ success: boolean; message: string; stats: any }> => {
  try {
    // Step 1: Parse CSV
    const recipeData = parseRecipeCSV(csvData);
    if (recipeData.length === 0) {
      throw new Error('No valid recipe data found in CSV');
    }

    // Step 2: Group by recipe name
    const recipes = groupRecipesByName(recipeData);

    // Step 3: Create recipe templates
    const templateResult = await createRecipeTemplates(recipes, userId);
    if (!templateResult.success) {
      throw new Error(`Template creation failed: ${templateResult.errors.join(', ')}`);
    }

    // Step 4: Deploy to all stores
    const deployResult = await deployRecipeTemplatesToAllStores();

    const stats = {
      recipesProcessed: recipes.size,
      templatesCreated: templateResult.created,
      recipesDeployed: deployResult.deployed,
      errors: [...templateResult.errors, ...deployResult.errors]
    };

    return {
      success: deployResult.success,
      message: `Successfully imported ${stats.recipesProcessed} recipes, created ${stats.templatesCreated} templates, and deployed ${stats.recipesDeployed} recipes to stores`,
      stats
    };

  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
      stats: { errors: [error instanceof Error ? error.message : 'Unknown error'] }
    };
  }
};

/**
 * Clear all recipe data safely
 */
export const clearAllRecipeData = async (): Promise<{ success: boolean; message: string }> => {
  try {
    // Step 1: Clear product catalog recipe references
    await supabase
      .from('product_catalog')
      .update({ recipe_id: null })
      .not('recipe_id', 'is', null);

    // Step 2: Deactivate all recipes and templates (safer than deletion)
    await supabase
      .from('recipes')
      .update({ is_active: false })
      .eq('is_active', true);

    await supabase
      .from('recipe_templates')
      .update({ is_active: false })
      .eq('is_active', true);

    return {
      success: true,
      message: 'All recipe data cleared successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to clear recipe data'
    };
  }
};
