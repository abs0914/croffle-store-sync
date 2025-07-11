import { supabase } from '@/integrations/supabase/client';
import { createRecipeTemplate } from './recipeTemplateService';
import { toast } from 'sonner';

interface UploadProgress {
  current: number;
  total: number;
  message: string;
}

interface UploadResult {
  successful: number;
  total: number;
  errors: string[];
}

interface ChoiceGroup {
  group_name: string;
  group_type: 'required' | 'optional' | 'multiple';
  selection_min: number;
  selection_max: number;
  description?: string;
  ingredients: {
    ingredient_name: string;
    quantity: number;
    unit: string;
    cost_per_unit?: number;
    is_default_selection?: boolean;
    choice_order?: number;
  }[];
}

interface BulkUploadData {
  recipes?: any[];
  addons?: any[];
  combos?: any[];
}

export const bulkUploadRecipeTemplates = async (
  data: BulkUploadData,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> => {
  const errors: string[] = [];
  let successful = 0;
  
  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    throw new Error('User not authenticated');
  }

  const totalItems = (data.recipes?.length || 0) + (data.addons?.length || 0) + (data.combos?.length || 0);
  let currentItem = 0;

  // Process recipe templates
  if (data.recipes) {
    onProgress?.({
      current: currentItem,
      total: totalItems,
      message: 'Uploading recipe templates...'
    });

    for (const recipe of data.recipes) {
      try {
        await uploadRecipeTemplate(recipe, user.id);
        successful++;
      } catch (error) {
        const errorMsg = `Recipe "${recipe.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('Recipe upload error:', error);
      }
      
      currentItem++;
      onProgress?.({
        current: currentItem,
        total: totalItems,
        message: `Processing recipe ${currentItem}/${data.recipes.length}...`
      });
    }
  }

  // Process add-ons
  if (data.addons) {
    onProgress?.({
      current: currentItem,
      total: totalItems,
      message: 'Uploading add-ons...'
    });

    for (const addon of data.addons) {
      try {
        await uploadAddon(addon);
        successful++;
      } catch (error) {
        const errorMsg = `Addon "${addon.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('Addon upload error:', error);
      }
      
      currentItem++;
      onProgress?.({
        current: currentItem,
        total: totalItems,
        message: `Processing addon ${currentItem - (data.recipes?.length || 0)}/${data.addons.length}...`
      });
    }
  }

  // Process combos
  if (data.combos) {
    onProgress?.({
      current: currentItem,
      total: totalItems,
      message: 'Uploading combo rules...'
    });

    for (const combo of data.combos) {
      try {
        await uploadCombo(combo);
        successful++;
      } catch (error) {
        const errorMsg = `Combo "${combo.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error('Combo upload error:', error);
      }
      
      currentItem++;
      onProgress?.({
        current: currentItem,
        total: totalItems,
        message: `Processing combo ${currentItem - (data.recipes?.length || 0) - (data.addons?.length || 0)}/${data.combos.length}...`
      });
    }
  }

  onProgress?.({
    current: totalItems,
    total: totalItems,
    message: 'Upload complete!'
  });

  return {
    successful,
    total: totalItems,
    errors
  };
};

const uploadRecipeTemplate = async (recipe: any, userId: string): Promise<void> => {
  // Validate required fields
  if (!recipe.name) {
    throw new Error('Recipe name is required');
  }
  if (!recipe.yield_quantity || recipe.yield_quantity <= 0) {
    throw new Error('Valid yield quantity is required');
  }

  const templateData = {
    name: recipe.name,
    description: recipe.description || '',
    category_name: recipe.category_name || 'main',
    instructions: recipe.instructions || '',
    yield_quantity: Number(recipe.yield_quantity),
    serving_size: Number(recipe.serving_size) || 1,
    image_url: recipe.image_url || '',
    created_by: userId,
    is_active: true,
    version: 1,
    has_choice_groups: !!(recipe.choice_groups && recipe.choice_groups.length > 0),
    base_price_includes: recipe.base_price_includes || '',
    choice_configuration: recipe.choice_configuration || {}
  };

  // Check if this is a choice-based recipe
  if (recipe.choice_groups && recipe.choice_groups.length > 0) {
    await createChoiceBasedTemplate(templateData, recipe.choice_groups, userId);
  } else {
    // Process regular ingredients
    const ingredients = (recipe.ingredients || []).map((ingredient: any) => ({
      ingredient_name: ingredient.ingredient_name || ingredient.name,
      quantity: Number(ingredient.quantity) || 0,
      unit: ingredient.unit || 'pieces',
      cost_per_unit: Number(ingredient.cost_per_unit) || 0,
      location_type: ingredient.location_type || 'all',
      inventory_stock_id: ingredient.inventory_stock_id || null,
      store_unit: ingredient.store_unit || ingredient.unit || 'pieces',
      recipe_to_store_conversion_factor: Number(ingredient.recipe_to_store_conversion_factor) || 1,
      uses_store_inventory: ingredient.uses_store_inventory !== false
    }));

    await createRecipeTemplate(templateData, ingredients);
  }
};

const createChoiceBasedTemplate = async (
  templateData: any,
  choiceGroups: ChoiceGroup[],
  userId: string
): Promise<void> => {
  // Create the recipe template
  const { data: template, error: templateError } = await supabase
    .from('recipe_templates')
    .insert(templateData)
    .select()
    .single();

  if (templateError) {
    throw new Error(`Failed to create recipe template: ${templateError.message}`);
  }

  // Create choice groups and their ingredients
  for (const group of choiceGroups) {
    // Create the choice group
    const { data: choiceGroup, error: groupError } = await supabase
      .from('recipe_choice_groups')
      .insert({
        recipe_template_id: template.id,
        group_name: group.group_name,
        group_type: group.group_type,
        selection_min: group.selection_min,
        selection_max: group.selection_max,
        description: group.description || '',
        display_order: 0
      })
      .select()
      .single();

    if (groupError) {
      throw new Error(`Failed to create choice group "${group.group_name}": ${groupError.message}`);
    }

    // Create ingredients for this choice group
    const ingredientInserts = group.ingredients.map((ingredient, index) => ({
      recipe_template_id: template.id,
      ingredient_name: ingredient.ingredient_name,
      commissary_item_name: ingredient.ingredient_name,
      quantity: Number(ingredient.quantity),
      unit: ingredient.unit,
      cost_per_unit: Number(ingredient.cost_per_unit) || 0,
      recipe_unit: ingredient.unit,
      purchase_unit: ingredient.unit,
      conversion_factor: 1,
      location_type: 'all',
      choice_group_name: group.group_name,
      choice_group_type: group.group_type,
      selection_min: group.selection_min,
      selection_max: group.selection_max,
      is_default_selection: ingredient.is_default_selection || false,
      choice_order: ingredient.choice_order || index
    }));

    const { error: ingredientsError } = await supabase
      .from('recipe_template_ingredients')
      .insert(ingredientInserts);

    if (ingredientsError) {
      throw new Error(`Failed to create ingredients for choice group "${group.group_name}": ${ingredientsError.message}`);
    }
  }
};

const uploadAddon = async (addon: any): Promise<void> => {
  // Validate required fields
  if (!addon.name) {
    throw new Error('Addon name is required');
  }
  if (!addon.category) {
    throw new Error('Addon category is required');
  }
  if (addon.price === undefined || addon.price < 0) {
    throw new Error('Valid price is required');
  }

  // Check if category exists, create if not
  let categoryId = await findOrCreateAddonCategory(addon.category);

  const addonData = {
    name: addon.name,
    category: addon.category,
    price: Number(addon.price),
    description: addon.description || '',
    is_available: addon.is_available !== false,
    is_premium: addon.is_premium === true,
    display_order: Number(addon.display_order) || 0,
    addon_category_id: categoryId
  };

  const { error } = await supabase
    .from('product_addon_items')
    .insert(addonData);

  if (error) throw error;
};

const uploadCombo = async (combo: any): Promise<void> => {
  // Validate required fields
  if (!combo.name) {
    throw new Error('Combo name is required');
  }
  if (!combo.base_category) {
    throw new Error('Base category is required');
  }
  if (!combo.combo_category) {
    throw new Error('Combo category is required');
  }
  if (combo.combo_price === undefined || combo.combo_price < 0) {
    throw new Error('Valid combo price is required');
  }

  const comboData = {
    name: combo.name,
    base_category: combo.base_category,
    combo_category: combo.combo_category,
    combo_price: Number(combo.combo_price),
    discount_amount: Number(combo.discount_amount) || 0,
    is_active: combo.is_active !== false,
    priority: Number(combo.priority) || 0
  };

  const { error } = await supabase
    .from('combo_pricing_rules')
    .insert(comboData);

  if (error) throw error;
};

const findOrCreateAddonCategory = async (categoryName: string): Promise<string | null> => {
  try {
    // First, try to find existing category
    const { data: existingCategory } = await supabase
      .from('addon_categories')
      .select('id')
      .eq('name', categoryName)
      .eq('is_active', true)
      .single();

    if (existingCategory) {
      return existingCategory.id;
    }

    // Create new category if not found
    const { data: newCategory, error } = await supabase
      .from('addon_categories')
      .insert({
        name: categoryName,
        description: `Auto-created category for ${categoryName}`,
        category_type: 'topping',
        is_active: true,
        display_order: 0
      })
      .select('id')
      .single();

    if (error) {
      console.warn('Could not create addon category:', error);
      return null;
    }

    return newCategory.id;
  } catch (error) {
    console.warn('Error finding/creating addon category:', error);
    return null;
  }
};

// Utility function to validate upload data structure
export const validateUploadData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    errors.push('Invalid data format');
    return { isValid: false, errors };
  }

  // Validate recipes
  if (data.recipes) {
    if (!Array.isArray(data.recipes)) {
      errors.push('Recipes must be an array');
    } else {
      data.recipes.forEach((recipe: any, index: number) => {
        if (!recipe.name) {
          errors.push(`Recipe ${index + 1}: Name is required`);
        }
        if (!recipe.yield_quantity || recipe.yield_quantity <= 0) {
          errors.push(`Recipe ${index + 1}: Valid yield quantity is required`);
        }
      });
    }
  }

  // Validate addons
  if (data.addons) {
    if (!Array.isArray(data.addons)) {
      errors.push('Addons must be an array');
    } else {
      data.addons.forEach((addon: any, index: number) => {
        if (!addon.name) {
          errors.push(`Addon ${index + 1}: Name is required`);
        }
        if (!addon.category) {
          errors.push(`Addon ${index + 1}: Category is required`);
        }
        if (addon.price === undefined || addon.price < 0) {
          errors.push(`Addon ${index + 1}: Valid price is required`);
        }
      });
    }
  }

  // Validate combos
  if (data.combos) {
    if (!Array.isArray(data.combos)) {
      errors.push('Combos must be an array');
    } else {
      data.combos.forEach((combo: any, index: number) => {
        if (!combo.name) {
          errors.push(`Combo ${index + 1}: Name is required`);
        }
        if (!combo.base_category) {
          errors.push(`Combo ${index + 1}: Base category is required`);
        }
        if (!combo.combo_category) {
          errors.push(`Combo ${index + 1}: Combo category is required`);
        }
        if (combo.combo_price === undefined || combo.combo_price < 0) {
          errors.push(`Combo ${index + 1}: Valid combo price is required`);
        }
      });
    }
  }

  return { isValid: errors.length === 0, errors };
};