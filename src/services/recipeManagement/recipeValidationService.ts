import { supabase } from '@/integrations/supabase/client';

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationWarning {
  field: string;
  message: string;
  code: string;
}

/**
 * Comprehensive recipe template validation
 */
export const validateRecipeTemplate = async (templateData: any, ingredients: any[]): Promise<ValidationResult> => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  // Basic template validation
  if (!templateData.name || templateData.name.trim().length === 0) {
    errors.push({
      field: 'name',
      message: 'Recipe name is required',
      code: 'REQUIRED_FIELD'
    });
  }

  if (templateData.name && templateData.name.length > 100) {
    warnings.push({
      field: 'name',
      message: 'Recipe name is quite long - consider shortening it',
      code: 'LONG_NAME'
    });
  }

  if (!templateData.yield_quantity || templateData.yield_quantity <= 0) {
    errors.push({
      field: 'yield_quantity',
      message: 'Yield quantity must be greater than 0',
      code: 'INVALID_YIELD'
    });
  }

  // Ingredient validation
  if (!ingredients || ingredients.length === 0) {
    errors.push({
      field: 'ingredients',
      message: 'At least one ingredient is required',
      code: 'NO_INGREDIENTS'
    });
  } else {
    ingredients.forEach((ingredient, index) => {
      if (!ingredient.ingredient_name || ingredient.ingredient_name.trim().length === 0) {
        errors.push({
          field: `ingredients[${index}].ingredient_name`,
          message: `Ingredient ${index + 1}: Name is required`,
          code: 'INGREDIENT_NAME_REQUIRED'
        });
      }

      if (!ingredient.quantity || ingredient.quantity <= 0) {
        errors.push({
          field: `ingredients[${index}].quantity`,
          message: `Ingredient ${index + 1}: Quantity must be greater than 0`,
          code: 'INVALID_QUANTITY'
        });
      }

      if (!ingredient.unit || ingredient.unit.trim().length === 0) {
        warnings.push({
          field: `ingredients[${index}].unit`,
          message: `Ingredient ${index + 1}: Unit not specified, will default to 'pieces'`,
          code: 'MISSING_UNIT'
        });
      }

      // Check for potential duplicates
      const duplicates = ingredients.filter((other, otherIndex) => 
        otherIndex !== index && 
        other.ingredient_name && 
        ingredient.ingredient_name &&
        other.ingredient_name.toLowerCase().trim() === ingredient.ingredient_name.toLowerCase().trim()
      );

      if (duplicates.length > 0) {
        warnings.push({
          field: `ingredients[${index}].ingredient_name`,
          message: `Ingredient "${ingredient.ingredient_name}" appears multiple times`,
          code: 'DUPLICATE_INGREDIENT'
        });
      }
    });
  }

  // Check for existing template with same name
  if (templateData.name) {
    try {
      const { data: existingTemplates } = await supabase
        .from('recipe_templates')
        .select('id, name')
        .ilike('name', templateData.name.trim())
        .eq('is_active', true);

      if (existingTemplates && existingTemplates.length > 0) {
        // If we're updating, exclude the current template
        const otherTemplates = templateData.id 
          ? existingTemplates.filter(t => t.id !== templateData.id)
          : existingTemplates;

        if (otherTemplates.length > 0) {
          warnings.push({
            field: 'name',
            message: 'A template with similar name already exists',
            code: 'DUPLICATE_NAME'
          });
        }
      }
    } catch (error) {
      console.warn('Could not check for duplicate template names:', error);
    }
  }

  // Advanced validations
  if (templateData.description && templateData.description.length > 500) {
    warnings.push({
      field: 'description',
      message: 'Description is quite long - consider making it more concise',
      code: 'LONG_DESCRIPTION'
    });
  }

  if (templateData.instructions && templateData.instructions.length > 2000) {
    warnings.push({
      field: 'instructions',
      message: 'Instructions are very long - consider breaking them into smaller steps',
      code: 'LONG_INSTRUCTIONS'
    });
  }

  // Cost validation
  const totalCost = ingredients.reduce((sum, ing) => sum + ((ing.quantity || 0) * (ing.cost_per_unit || 0)), 0);
  if (totalCost === 0) {
    warnings.push({
      field: 'cost',
      message: 'Total recipe cost is zero - verify ingredient costs',
      code: 'ZERO_COST'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validate recipe deployment requirements
 */
export const validateDeploymentRequirements = async (
  templateId: string,
  storeId: string
): Promise<ValidationResult> => {
  const errors: ValidationError[] = [];
  const warnings: ValidationWarning[] = [];

  try {
    // Get template with ingredients
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      errors.push({
        field: 'template',
        message: 'Recipe template not found',
        code: 'TEMPLATE_NOT_FOUND'
      });
      return { isValid: false, errors, warnings };
    }

    // Validate store exists
    const { data: store, error: storeError } = await supabase
      .from('stores')
      .select('id, name, is_active')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      errors.push({
        field: 'store',
        message: 'Target store not found',
        code: 'STORE_NOT_FOUND'
      });
      return { isValid: false, errors, warnings };
    }

    if (!store.is_active) {
      errors.push({
        field: 'store',
        message: 'Target store is not active',
        code: 'STORE_INACTIVE'
      });
    }

    // Check ingredients availability
    if (!template.ingredients || template.ingredients.length === 0) {
      errors.push({
        field: 'ingredients',
        message: 'Template has no ingredients to deploy',
        code: 'NO_INGREDIENTS'
      });
    } else {
      // Get store inventory
      const { data: storeInventory } = await supabase
        .from('inventory_stock')
        .select('item, unit, stock_quantity, is_active')
        .eq('store_id', storeId)
        .eq('is_active', true);

      const inventoryMap = new Map(
        storeInventory?.map(item => [item.item.toLowerCase().trim(), item]) || []
      );

      let missingCount = 0;
      let lowStockCount = 0;

      template.ingredients.forEach((ingredient: any, index: number) => {
        const ingredientName = ingredient.ingredient_name?.toLowerCase().trim();
        
        if (!ingredientName) {
          errors.push({
            field: `ingredients[${index}]`,
            message: `Ingredient ${index + 1} has no name`,
            code: 'INVALID_INGREDIENT_NAME'
          });
          return;
        }

        const storeItem = inventoryMap.get(ingredientName);
        
        if (!storeItem) {
          // Try fuzzy matching
          const fuzzyMatch = Array.from(inventoryMap.keys()).find(key =>
            key.includes(ingredientName) || ingredientName.includes(key)
          );

          if (fuzzyMatch) {
            warnings.push({
              field: `ingredients[${index}]`,
              message: `"${ingredient.ingredient_name}" not found exactly, but "${inventoryMap.get(fuzzyMatch)?.item}" might be a match`,
              code: 'FUZZY_MATCH_FOUND'
            });
          } else {
            missingCount++;
            errors.push({
              field: `ingredients[${index}]`,
              message: `Ingredient "${ingredient.ingredient_name}" not found in store inventory`,
              code: 'INGREDIENT_NOT_FOUND'
            });
          }
        } else {
          // Check stock levels
          if (storeItem.stock_quantity <= 0) {
            warnings.push({
              field: `ingredients[${index}]`,
              message: `"${ingredient.ingredient_name}" is out of stock`,
              code: 'OUT_OF_STOCK'
            });
            lowStockCount++;
          } else if (storeItem.stock_quantity < (ingredient.quantity || 1)) {
            warnings.push({
              field: `ingredients[${index}]`,
              message: `"${ingredient.ingredient_name}" has low stock (${storeItem.stock_quantity} ${storeItem.unit} available, ${ingredient.quantity} needed)`,
              code: 'LOW_STOCK'
            });
            lowStockCount++;
          }
        }
      });

      if (missingCount > 0) {
        errors.push({
          field: 'deployment',
          message: `${missingCount} ingredient(s) missing from store inventory`,
          code: 'MISSING_INGREDIENTS'
        });
      }

      if (lowStockCount > 0) {
        warnings.push({
          field: 'deployment',
          message: `${lowStockCount} ingredient(s) have low or no stock`,
          code: 'LOW_STOCK_WARNING'
        });
      }
    }

    // Check for existing deployment
    const { data: existingRecipe } = await supabase
      .from('recipes')
      .select('id, name, is_active')
      .eq('template_id', templateId)
      .eq('store_id', storeId)
      .maybeSingle();

    if (existingRecipe) {
      if (existingRecipe.is_active) {
        warnings.push({
          field: 'deployment',
          message: 'Recipe already deployed to this store and is active',
          code: 'ALREADY_DEPLOYED'
        });
      } else {
        warnings.push({
          field: 'deployment',
          message: 'Recipe was previously deployed but is inactive',
          code: 'INACTIVE_DEPLOYMENT'
        });
      }
    }

  } catch (error) {
    console.error('Error validating deployment requirements:', error);
    errors.push({
      field: 'system',
      message: 'System error during validation',
      code: 'SYSTEM_ERROR'
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Get validation summary for display
 */
export const getValidationSummary = (result: ValidationResult): string => {
  const { errors, warnings } = result;
  
  if (errors.length === 0 && warnings.length === 0) {
    return 'All validations passed successfully';
  }

  const parts: string[] = [];
  
  if (errors.length > 0) {
    parts.push(`${errors.length} error${errors.length !== 1 ? 's' : ''}`);
  }
  
  if (warnings.length > 0) {
    parts.push(`${warnings.length} warning${warnings.length !== 1 ? 's' : ''}`);
  }

  return parts.join(' and ') + ' found';
};