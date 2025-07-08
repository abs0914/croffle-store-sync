
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecipeInventoryMapping {
  recipe_template_id: string;
  store_id: string;
  ingredient_mappings: {
    template_ingredient_id: string;
    template_ingredient_name: string;
    store_inventory_id: string;
    store_inventory_item: string;
    quantity_per_serving: number;
    unit: string;
    availability_status: 'available' | 'low_stock' | 'out_of_stock';
    current_stock: number;
  }[];
}

export interface DeploymentValidation {
  canDeploy: boolean;
  missingIngredients: string[];
  lowStockIngredients: string[];
  mappingIssues: string[];
}

/**
 * Create smart mappings between recipe template ingredients and store inventory
 */
export const createRecipeInventoryMapping = async (
  recipeTemplateId: string,
  storeId: string
): Promise<RecipeInventoryMapping | null> => {
  try {
    // Get recipe template with ingredients
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', recipeTemplateId)
      .single();

    if (templateError || !template) {
      throw new Error('Recipe template not found');
    }

    // Get store inventory
    const { data: storeInventory, error: inventoryError } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (inventoryError) {
      throw inventoryError;
    }

    // Create intelligent mappings
    const ingredientMappings = [];
    
    for (const ingredient of template.ingredients || []) {
      // Try to find exact match first
      let matchedInventory = storeInventory?.find(inv => 
        inv.item.toLowerCase() === ingredient.ingredient_name.toLowerCase()
      );

      // If no exact match, try fuzzy matching
      if (!matchedInventory) {
        matchedInventory = storeInventory?.find(inv => 
          inv.item.toLowerCase().includes(ingredient.ingredient_name.toLowerCase()) ||
          ingredient.ingredient_name.toLowerCase().includes(inv.item.toLowerCase())
        );
      }

      if (matchedInventory) {
        const availabilityStatus = getAvailabilityStatus(
          matchedInventory.stock_quantity,
          matchedInventory.minimum_threshold || 10
        );

        ingredientMappings.push({
          template_ingredient_id: ingredient.id,
          template_ingredient_name: ingredient.ingredient_name,
          store_inventory_id: matchedInventory.id,
          store_inventory_item: matchedInventory.item,
          quantity_per_serving: ingredient.quantity,
          unit: ingredient.unit,
          availability_status: availabilityStatus,
          current_stock: matchedInventory.stock_quantity
        });
      }
    }

    return {
      recipe_template_id: recipeTemplateId,
      store_id: storeId,
      ingredient_mappings: ingredientMappings
    };

  } catch (error) {
    console.error('Error creating recipe inventory mapping:', error);
    toast.error('Failed to create recipe inventory mapping');
    return null;
  }
};

/**
 * Validate if a recipe can be deployed to a store
 */
export const validateRecipeDeployment = async (
  recipeTemplateId: string,
  storeId: string
): Promise<DeploymentValidation> => {
  try {
    const mapping = await createRecipeInventoryMapping(recipeTemplateId, storeId);
    
    if (!mapping) {
      return {
        canDeploy: false,
        missingIngredients: [],
        lowStockIngredients: [],
        mappingIssues: ['Failed to create inventory mapping']
      };
    }

    // Get template ingredients to check for missing mappings
    const { data: templateIngredients } = await supabase
      .from('recipe_template_ingredients')
      .select('ingredient_name')
      .eq('recipe_template_id', recipeTemplateId);

    const mappedIngredientNames = mapping.ingredient_mappings.map(m => m.template_ingredient_name);
    const missingIngredients = templateIngredients?.filter(ing => 
      !mappedIngredientNames.includes(ing.ingredient_name)
    ).map(ing => ing.ingredient_name) || [];

    const lowStockIngredients = mapping.ingredient_mappings
      .filter(m => m.availability_status === 'low_stock')
      .map(m => m.store_inventory_item);

    const outOfStockIngredients = mapping.ingredient_mappings
      .filter(m => m.availability_status === 'out_of_stock')
      .map(m => m.store_inventory_item);

    const mappingIssues = [];
    if (missingIngredients.length > 0) {
      mappingIssues.push(`Missing inventory items: ${missingIngredients.join(', ')}`);
    }
    if (outOfStockIngredients.length > 0) {
      mappingIssues.push(`Out of stock items: ${outOfStockIngredients.join(', ')}`);
    }

    return {
      canDeploy: missingIngredients.length === 0 && outOfStockIngredients.length === 0,
      missingIngredients,
      lowStockIngredients,
      mappingIssues
    };

  } catch (error) {
    console.error('Error validating recipe deployment:', error);
    return {
      canDeploy: false,
      missingIngredients: [],
      lowStockIngredients: [],
      mappingIssues: ['Validation failed due to system error']
    };
  }
};

/**
 * Deploy recipe with smart inventory mapping
 */
export const deployRecipeWithMapping = async (
  recipeTemplateId: string,
  storeId: string
): Promise<{ success: boolean; recipeId?: string; productId?: string; errors: string[] }> => {
  try {
    // First validate deployment
    const validation = await validateRecipeDeployment(recipeTemplateId, storeId);
    
    if (!validation.canDeploy) {
      return {
        success: false,
        errors: validation.mappingIssues
      };
    }

    // Get recipe template
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', recipeTemplateId)
      .single();

    if (templateError || !template) {
      return {
        success: false,
        errors: ['Recipe template not found']
      };
    }

    // Create product first
    const { data: product, error: productError } = await supabase
      .from('products')
      .insert({
        name: template.name,
        description: template.description,
        sku: `RCP-${template.name.replace(/\s+/g, '-').toUpperCase()}-${Date.now()}`,
        price: 0, // Will be calculated based on ingredients
        cost: 0,
        stock_quantity: 0,
        store_id: storeId,
        is_active: true,
        image_url: template.image_url
      })
      .select()
      .single();

    if (productError) {
      return {
        success: false,
        errors: [`Failed to create product: ${productError.message}`]
      };
    }

    // Create product catalog entry
    const { data: catalogProduct, error: catalogError } = await supabase
      .from('product_catalog')
      .insert({
        product_name: template.name,
        description: template.description,
        price: 0, // Will be updated after calculating ingredient costs
        store_id: storeId,
        is_available: true,
        display_order: 0,
        image_url: template.image_url
      })
      .select()
      .single();

    if (catalogError) {
      return {
        success: false,
        errors: [`Failed to create product catalog entry: ${catalogError.message}`]
      };
    }

    // Create recipe
    const { data: recipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        name: template.name,
        description: template.description,
        instructions: template.instructions,
        yield_quantity: template.yield_quantity,
        serving_size: template.serving_size || 1,
        store_id: storeId,
        product_id: product.id,
        category_name: template.category_name,
        approval_status: 'approved', // Auto-approve template deployments
        is_active: true,
        version: template.version || 1
      })
      .select()
      .single();

    if (recipeError) {
      return {
        success: false,
        errors: [`Failed to create recipe: ${recipeError.message}`]
      };
    }

    // Update product catalog with recipe_id
    await supabase
      .from('product_catalog')
      .update({ recipe_id: recipe.id })
      .eq('id', catalogProduct.id);

    // Create smart ingredient mappings
    const mapping = await createRecipeInventoryMapping(recipeTemplateId, storeId);
    if (mapping) {
      const recipeIngredients = [];
      const productIngredients = [];
      let totalCost = 0;

      for (const ingredientMapping of mapping.ingredient_mappings) {
        const cost = await getIngredientCost(ingredientMapping.store_inventory_id);
        const ingredientCost = ingredientMapping.quantity_per_serving * cost;
        totalCost += ingredientCost;

        // Create recipe ingredient
        recipeIngredients.push({
          recipe_id: recipe.id,
          inventory_stock_id: ingredientMapping.store_inventory_id,
          quantity: ingredientMapping.quantity_per_serving,
          unit: ingredientMapping.unit,
          cost_per_unit: cost
        });

        // Create product ingredient
        productIngredients.push({
          product_catalog_id: catalogProduct.id,
          inventory_stock_id: ingredientMapping.store_inventory_id,
          required_quantity: ingredientMapping.quantity_per_serving,
          unit: ingredientMapping.unit
        });
      }

      // Insert recipe ingredients
      if (recipeIngredients.length > 0) {
        await supabase.from('recipe_ingredients').insert(recipeIngredients);
      }

      // Insert product ingredients
      if (productIngredients.length > 0) {
        await supabase.from('product_ingredients').insert(productIngredients);
      }

      // Update pricing based on total cost
      const markupPrice = totalCost * 1.5; // 50% markup
      await Promise.all([
        supabase.from('products').update({ cost: totalCost, price: markupPrice }).eq('id', product.id),
        supabase.from('product_catalog').update({ price: markupPrice }).eq('id', catalogProduct.id),
        supabase.from('recipes').update({ total_cost: totalCost, cost_per_serving: totalCost / (template.serving_size || 1) }).eq('id', recipe.id)
      ]);
    }

    toast.success(`Recipe "${template.name}" deployed successfully to store`);
    
    return {
      success: true,
      recipeId: recipe.id,
      productId: product.id,
      errors: []
    };

  } catch (error) {
    console.error('Error deploying recipe with mapping:', error);
    return {
      success: false,
      errors: [`Deployment failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
};

// Helper functions
const getAvailabilityStatus = (currentStock: number, minimumThreshold: number): 'available' | 'low_stock' | 'out_of_stock' => {
  if (currentStock <= 0) return 'out_of_stock';
  if (currentStock <= minimumThreshold) return 'low_stock';
  return 'available';
};

const getIngredientCost = async (inventoryStockId: string): Promise<number> => {
  try {
    const { data } = await supabase
      .from('inventory_stock')
      .select('cost')
      .eq('id', inventoryStockId)
      .single();
    
    return data?.cost || 0;
  } catch {
    return 0;
  }
};

/**
 * Get deployment preview for a recipe template
 */
export const getDeploymentPreview = async (
  recipeTemplateId: string,
  storeId: string
): Promise<{
  template: any;
  validation: DeploymentValidation;
  mapping: RecipeInventoryMapping | null;
  estimatedCost: number;
  estimatedPrice: number;
}> => {
  try {
    const [template, validation, mapping] = await Promise.all([
      supabase.from('recipe_templates').select('*').eq('id', recipeTemplateId).single(),
      validateRecipeDeployment(recipeTemplateId, storeId),
      createRecipeInventoryMapping(recipeTemplateId, storeId)
    ]);

    let estimatedCost = 0;
    if (mapping) {
      for (const ingredientMapping of mapping.ingredient_mappings) {
        const cost = await getIngredientCost(ingredientMapping.store_inventory_id);
        estimatedCost += ingredientMapping.quantity_per_serving * cost;
      }
    }

    const estimatedPrice = estimatedCost * 1.5; // 50% markup

    return {
      template: template.data,
      validation,
      mapping,
      estimatedCost,
      estimatedPrice
    };
  } catch (error) {
    console.error('Error getting deployment preview:', error);
    throw error;
  }
};
