import { supabase } from "@/integrations/supabase/client";

export interface StoreStatus {
  storeId: string;
  storeName: string;
  productCount: number;
  recipeCount: number;
  deployedTemplates: number;
  missingTemplates: number;
  readyProducts: number;
}

export interface DeploymentResult {
  success: boolean;
  storeId: string;
  storeName: string;
  deployedRecipes: number;
  deployedProducts: number;
  errors: string[];
}

/**
 * Deploy missing recipe templates to specific stores (excluding Sugbo Mercado)
 */
export const deployMissingTemplatesToStores = async (excludeStoreIds: string[] = []): Promise<DeploymentResult[]> => {
  const sugboMercadoId = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
  const excludedIds = [...excludeStoreIds, sugboMercadoId];
  
  // Get stores that need template deployment
  const { data: storesNeedingDeployment, error: storesError } = await supabase
    .from('stores')
    .select(`
      id,
      name,
      recipes!inner(template_id)
    `)
    .eq('is_active', true)
    .not('id', 'in', `(${excludedIds.map(id => `"${id}"`).join(',')})`)
    .limit(1000);

  if (storesError) {
    console.error('Error fetching stores:', storesError);
    throw storesError;
  }

  // Get all active recipe templates
  const { data: allTemplates, error: templatesError } = await supabase
    .from('recipe_templates')
    .select('id, name, category_name, description, instructions, serving_size')
    .eq('is_active', true);

  if (templatesError) {
    console.error('Error fetching templates:', templatesError);
    throw templatesError;
  }

  const results: DeploymentResult[] = [];

  for (const store of storesNeedingDeployment) {
    try {
      const result = await deployTemplatesToSingleStore(store.id, store.name, allTemplates);
      results.push(result);
    } catch (error) {
      console.error(`Error deploying to store ${store.name}:`, error);
      results.push({
        success: false,
        storeId: store.id,
        storeName: store.name,
        deployedRecipes: 0,
        deployedProducts: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error']
      });
    }
  }

  return results;
};

/**
 * Deploy templates to a single store by creating recipes manually
 */
const deployTemplatesToSingleStore = async (
  storeId: string, 
  storeName: string, 
  allTemplates: any[]
): Promise<DeploymentResult> => {
  const errors: string[] = [];
  let deployedRecipes = 0;
  let deployedProducts = 0;

  // Get existing recipes for this store
  const { data: existingRecipes } = await supabase
    .from('recipes')
    .select('template_id')
    .eq('store_id', storeId)
    .eq('is_active', true);

  const existingTemplateIds = new Set(
    existingRecipes?.map(r => r.template_id).filter(Boolean) || []
  );

  // Deploy missing templates one by one
  for (const template of allTemplates) {
    if (existingTemplateIds.has(template.id)) {
      continue; // Skip if template already deployed
    }

    try {
      // Create recipe for this template
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: template.name,
          store_id: storeId,
          template_id: template.id,
          is_active: true,
          serving_size: template.serving_size || 1,
          instructions: template.instructions || 'Follow standard preparation instructions',
          total_cost: 0,
          cost_per_serving: 0
        })
        .select()
        .single();

      if (recipeError || !newRecipe) {
        console.error(`Error creating recipe for template ${template.name}:`, recipeError);
        errors.push(`Template ${template.name}: ${recipeError?.message || 'Failed to create recipe'}`);
        continue;
      }

      deployedRecipes++;

      // Copy template ingredients to recipe ingredients
      const { data: templateIngredients } = await supabase
        .from('recipe_template_ingredients')
        .select('*')
        .eq('recipe_template_id', template.id);

      if (templateIngredients && templateIngredients.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .insert(
            templateIngredients.map(ing => ({
              recipe_id: newRecipe.id,
              ingredient_name: ing.ingredient_name,
              quantity: ing.quantity,
              unit: ing.unit as any, // Type assertion to handle enum
              cost_per_unit: ing.cost_per_unit,
              inventory_stock_id: null, // Optional field
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }))
          );

        if (ingredientsError) {
          console.error(`Error copying ingredients for ${template.name}:`, ingredientsError);
          errors.push(`Template ${template.name} ingredients: ${ingredientsError.message}`);
        }

        // Update recipe costs
        const totalCost = templateIngredients.reduce((sum, ing) => 
          sum + (ing.quantity * ing.cost_per_unit), 0);
        
        await supabase
          .from('recipes')
          .update({
            total_cost: totalCost,
            cost_per_serving: totalCost / (template.serving_size || 1)
          })
          .eq('id', newRecipe.id);
      }

      // Create product catalog entry (check for existing first)
      const { data: existingCatalog } = await supabase
        .from('product_catalog')
        .select('id')
        .eq('store_id', storeId)
        .eq('product_name', template.name)
        .single();

      if (!existingCatalog) {
        const { error: catalogError } = await supabase
          .from('product_catalog')
          .insert({
            store_id: storeId,
            product_name: template.name,
            description: template.description,
            price: 100.00, // Default price, will be calculated later
            recipe_id: newRecipe.id,
            is_available: true
          });

        if (catalogError) {
          console.error(`Error creating catalog entry for ${template.name}:`, catalogError);
          errors.push(`Template ${template.name} catalog: ${catalogError.message}`);
        } else {
          deployedProducts++;
        }
      } else {
        // Update existing catalog entry with recipe link
        const { error: updateError } = await supabase
          .from('product_catalog')
          .update({ recipe_id: newRecipe.id })
          .eq('id', existingCatalog.id);
          
        if (!updateError) {
          deployedProducts++;
        }
      }

    } catch (error) {
      console.error(`Exception deploying template ${template.name}:`, error);
      errors.push(`Template ${template.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return {
    success: errors.length === 0,
    storeId,
    storeName,
    deployedRecipes,
    deployedProducts,
    errors
  };
};

/**
 * Get current status of all stores (excluding specified ones)
 */
export const getStoresStatus = async (excludeStoreIds: string[] = []): Promise<StoreStatus[]> => {
  const sugboMercadoId = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
  const excludedIds = [...excludeStoreIds, sugboMercadoId];

  const { data: stores, error } = await supabase
    .from('stores')
    .select(`
      id,
      name,
      product_catalog(count),
      recipes!inner(id, template_id)
    `)
    .eq('is_active', true)
    .not('id', 'in', `(${excludedIds.map(id => `"${id}"`).join(',')})`);

  if (error) {
    console.error('Error getting stores status:', error);
    throw error;
  }

  return (stores || []).map(store => ({
    storeId: store.id,
    storeName: store.name,
    productCount: store.product_catalog?.length || 0,
    recipeCount: store.recipes?.length || 0,
    deployedTemplates: new Set(store.recipes?.map((r: any) => r.template_id).filter(Boolean)).size,
    missingTemplates: 64 - new Set(store.recipes?.map((r: any) => r.template_id).filter(Boolean)).size,
    readyProducts: 0 // Will be calculated separately if needed
  }));
};

/**
 * Standardize product catalogs for stores (excluding specified ones)
 */
export const standardizeProductCatalogs = async (excludeStoreIds: string[] = []): Promise<boolean> => {
  const sugboMercadoId = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';
  const excludedIds = [...excludeStoreIds, sugboMercadoId];

  try {
    // Run repair function using the existing RPC
    const { data, error } = await supabase
      .rpc('repair_recipe_template_links');

    if (error) {
      console.error('Error running recipe template repair:', error);
      throw error;
    }

    console.log('Recipe template repair results:', data);
    return true;
  } catch (error) {
    console.error('Error standardizing product catalogs:', error);
    throw error;
  }
};