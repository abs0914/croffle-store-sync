/**
 * Inventory System Validator
 * Phase 4: Data Verification - Complete system validation
 */

import { supabase } from "@/integrations/supabase/client";
import { batchDeductInventoryForTransaction } from "./batchInventoryService";

export interface ValidationResult {
  success: boolean;
  message: string;
  details: any;
  timestamp: string;
}

export interface SystemValidationReport {
  overallSuccess: boolean;
  validations: ValidationResult[];
  summary: {
    passed: number;
    failed: number;
    total: number;
  };
  generatedAt: string;
}

/**
 * Complete end-to-end validation of inventory deduction system
 */
export const validateInventoryDeductionSystem = async (
  storeId: string,
  testTransactionItems: Array<{
    name: string;
    product_id?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>
): Promise<SystemValidationReport> => {
  console.log(`🧪 Starting COMPLETE inventory system validation for store: ${storeId}`);
  
  const validations: ValidationResult[] = [];
  const timestamp = new Date().toISOString();
  const testTransactionId = `validation-${Date.now()}`;

  // Validation 1: Recipe Template Integrity
  try {
    const templateValidation = await validateRecipeTemplates();
    validations.push(templateValidation);
  } catch (error) {
    validations.push({
      success: false,
      message: 'Recipe template validation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    });
  }

  // Validation 2: Store Recipe Deployment
  try {
    const deploymentValidation = await validateStoreRecipeDeployment(storeId);
    validations.push(deploymentValidation);
  } catch (error) {
    validations.push({
      success: false,
      message: 'Store recipe deployment validation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    });
  }

  // Validation 3: Inventory Mapping Completeness
  try {
    const mappingValidation = await validateInventoryMappings(storeId);
    validations.push(mappingValidation);
  } catch (error) {
    validations.push({
      success: false,
      message: 'Inventory mapping validation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    });
  }

  // Validation 4: End-to-End Transaction Processing
  try {
    const transactionValidation = await validateTransactionProcessing(
      storeId, 
      testTransactionId, 
      testTransactionItems
    );
    validations.push(transactionValidation);
  } catch (error) {
    validations.push({
      success: false,
      message: 'Transaction processing validation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    });
  }

  // Validation 5: Audit Trail Completeness
  try {
    const auditValidation = await validateAuditTrail(testTransactionId);
    validations.push(auditValidation);
  } catch (error) {
    validations.push({
      success: false,
      message: 'Audit trail validation failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      timestamp
    });
  }

  // Calculate summary
  const summary = {
    passed: validations.filter(v => v.success).length,
    failed: validations.filter(v => !v.success).length,
    total: validations.length
  };

  const report: SystemValidationReport = {
    overallSuccess: summary.failed === 0,
    validations,
    summary,
    generatedAt: timestamp
  };

  console.log(`🧪 System validation completed. Success: ${report.overallSuccess}`, summary);
  return report;
};

/**
 * Validate recipe templates have proper data
 */
async function validateRecipeTemplates(): Promise<ValidationResult> {
  // Check for "Espresso Shot" → should be "Coffee Beans" now
  const { data: espressoCheck, error: espressoError } = await supabase
    .from('recipe_template_ingredients')
    .select('ingredient_name')
    .eq('ingredient_name', 'Espresso Shot');

  if (espressoError) {
    throw new Error(`Template check failed: ${espressoError.message}`);
  }

  if (espressoCheck && espressoCheck.length > 0) {
    return {
      success: false,
      message: `Found ${espressoCheck.length} templates still using "Espresso Shot" instead of "Coffee Beans"`,
      details: { espressoShotCount: espressoCheck.length },
      timestamp: new Date().toISOString()
    };
  }

  // Check for proper quantities (not "1 piece")
  const { data: genericQuantities, error: quantityError } = await supabase
    .from('recipe_template_ingredients')
    .select('ingredient_name, quantity, unit')
    .eq('unit', 'piece')
    .in('ingredient_name', ['Coffee Beans', 'Milk', 'Caramel Syrup', 'Chocolate Syrup']);

  if (quantityError) {
    throw new Error(`Quantity check failed: ${quantityError.message}`);
  }

  if (genericQuantities && genericQuantities.length > 0) {
    return {
      success: false,
      message: `Found ${genericQuantities.length} ingredients with generic "1 piece" quantities`,
      details: { 
        genericQuantities: genericQuantities.length,
        items: genericQuantities
      },
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: true,
    message: 'All recipe templates have proper ingredients and quantities',
    details: { espressoShotCount: 0, genericQuantities: 0 },
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate store has proper recipe deployment
 */
async function validateStoreRecipeDeployment(storeId: string): Promise<ValidationResult> {
  // Get active templates
  const { data: templates, error: templateError } = await supabase
    .from('recipe_templates')
    .select('id, name')
    .eq('is_active', true);

  if (templateError) {
    throw new Error(`Template fetch failed: ${templateError.message}`);
  }

  // Get deployed recipes for this store
  const { data: recipes, error: recipeError } = await supabase
    .from('recipes')
    .select('id, name, template_id')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .not('template_id', 'is', null);

  if (recipeError) {
    throw new Error(`Recipe fetch failed: ${recipeError.message}`);
  }

  const totalTemplates = templates?.length || 0;
  const deployedRecipes = recipes?.length || 0;
  const deploymentRate = totalTemplates > 0 ? (deployedRecipes / totalTemplates) * 100 : 0;

  if (deploymentRate < 100) {
    const missingTemplates = templates?.filter(template => 
      !recipes?.some(recipe => recipe.template_id === template.id)
    ) || [];

    return {
      success: false,
      message: `Only ${deploymentRate.toFixed(1)}% of templates deployed (${deployedRecipes}/${totalTemplates})`,
      details: { 
        deploymentRate,
        totalTemplates,
        deployedRecipes,
        missingTemplates: missingTemplates.map(t => t.name)
      },
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: true,
    message: `All ${totalTemplates} templates successfully deployed as recipes`,
    details: { deploymentRate: 100, totalTemplates, deployedRecipes },
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate inventory mappings exist for all recipe ingredients
 */
async function validateInventoryMappings(storeId: string): Promise<ValidationResult> {
  // Get all recipe ingredients for this store  
  const { data: recipeIngredients, error: ingredientError } = await supabase
    .from('recipe_ingredients')
    .select(`
      inventory_stock_id,
      inventory_stock:inventory_stock!inventory_stock_id(item),
      recipes!inner (
        store_id
      )
    `)
    .eq('recipes.store_id', storeId);

  if (ingredientError) {
    throw new Error(`Recipe ingredients fetch failed: ${ingredientError.message}`);
  }

  // Get store inventory items
  const { data: inventoryItems, error: inventoryError } = await supabase
    .from('inventory_stock')
    .select('id, item')
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (inventoryError) {
    throw new Error(`Inventory fetch failed: ${inventoryError.message}`);
  }

  const uniqueIngredients = [...new Set(recipeIngredients?.map(ri => ri.inventory_stock?.item).filter(Boolean) || [])];
  const inventoryItemNames = inventoryItems?.map(item => item.item) || [];

  const unmappedIngredients = uniqueIngredients.filter(ingredient => {
    // Check for exact match or fuzzy match
    return !inventoryItemNames.some(item => 
      item.toLowerCase().includes(ingredient.toLowerCase()) ||
      ingredient.toLowerCase().includes(item.toLowerCase())
    );
  });

  if (unmappedIngredients.length > 0) {
    return {
      success: false,
      message: `${unmappedIngredients.length} recipe ingredients have no inventory mapping`,
      details: { 
        totalIngredients: uniqueIngredients.length,
        unmappedIngredients,
        mappingRate: ((uniqueIngredients.length - unmappedIngredients.length) / uniqueIngredients.length) * 100
      },
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: true,
    message: `All ${uniqueIngredients.length} recipe ingredients have inventory mappings`,
    details: { 
      totalIngredients: uniqueIngredients.length,
      unmappedIngredients: 0,
      mappingRate: 100
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate end-to-end transaction processing
 */
async function validateTransactionProcessing(
  storeId: string,
  testTransactionId: string,
  testItems: Array<{
    name: string;
    product_id?: string;
    quantity: number;
    unit_price: number;
    total_price: number;
  }>
): Promise<ValidationResult> {
  console.log(`🧪 Testing transaction processing with ${testItems.length} items`);

  // Run the actual batch inventory deduction
  const result = await batchDeductInventoryForTransaction(
    testTransactionId,
    storeId,
    testItems
  );

  if (!result.success) {
    return {
      success: false,
      message: `Transaction processing failed: ${result.errors.join(', ')}`,
      details: {
        errors: result.errors,
        warnings: result.warnings,
        itemsProcessed: result.itemsProcessed,
        deductedItems: result.deductedItems.length,
        processingTimeMs: result.processingTimeMs
      },
      timestamp: new Date().toISOString()
    };
  }

  if (result.errors.length > 0) {
    return {
      success: false,
      message: `Transaction processed with errors: ${result.errors.join(', ')}`,
      details: {
        errors: result.errors,
        warnings: result.warnings,
        itemsProcessed: result.itemsProcessed,
        deductedItems: result.deductedItems.length,
        processingTimeMs: result.processingTimeMs
      },
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: true,
    message: `Transaction processed successfully: ${result.deductedItems.length} items deducted`,
    details: {
      errors: result.errors,
      warnings: result.warnings,
      itemsProcessed: result.itemsProcessed,
      deductedItems: result.deductedItems.length,
      processingTimeMs: result.processingTimeMs,
      deductionDetails: result.deductedItems
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Validate audit trail was created
 */
async function validateAuditTrail(testTransactionId: string): Promise<ValidationResult> {
  // Check inventory sync audit
  const { data: syncAudit, error: syncError } = await supabase
    .from('inventory_sync_audit')
    .select('*')
    .eq('transaction_id', testTransactionId);

  if (syncError) {
    throw new Error(`Sync audit check failed: ${syncError.message}`);
  }

  // Check inventory movements
  const { data: movements, error: movementError } = await supabase
    .from('inventory_movements')
    .select('*')
    .eq('reference_id', testTransactionId);

  if (movementError) {
    throw new Error(`Movement audit check failed: ${movementError.message}`);
  }

  const hasSyncAudit = syncAudit && syncAudit.length > 0;
  const hasMovements = movements && movements.length > 0;

  if (!hasSyncAudit && !hasMovements) {
    return {
      success: false,
      message: 'No audit trail found - neither sync audit nor inventory movements recorded',
      details: { syncAuditRecords: 0, movementRecords: 0 },
      timestamp: new Date().toISOString()
    };
  }

  if (!hasSyncAudit) {
    return {
      success: false,
      message: 'Sync audit missing - inventory movements found but no sync record',
      details: { 
        syncAuditRecords: 0, 
        movementRecords: movements?.length || 0 
      },
      timestamp: new Date().toISOString()
    };
  }

  return {
    success: true,
    message: 'Complete audit trail created',
    details: { 
      syncAuditRecords: syncAudit?.length || 0,
      movementRecords: movements?.length || 0,
      syncStatus: syncAudit?.[0]?.sync_status,
      processingTime: syncAudit?.[0]?.sync_duration_ms
    },
    timestamp: new Date().toISOString()
  };
}

/**
 * Quick validation for specific items
 */
export const validateSpecificItems = async (
  storeId: string,
  itemNames: string[]
): Promise<{
  success: boolean;
  validItems: string[];
  invalidItems: string[];
  details: any;
}> => {
  console.log(`🧪 Validating specific items: ${itemNames.join(', ')}`);
  
  const validItems: string[] = [];
  const invalidItems: string[] = [];
  const details: any = {};

  for (const itemName of itemNames) {
    try {
      // Check if item has a recipe
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          recipe_ingredients (
            inventory_stock_id,
            quantity
          )
        `)
        .eq('store_id', storeId)
        .eq('name', itemName)
        .eq('is_active', true)
        .single();

      if (recipeError || !recipe) {
        invalidItems.push(itemName);
        details[itemName] = { error: 'No recipe found' };
        continue;
      }

      // Check if recipe has ingredients
      if (!recipe.recipe_ingredients || recipe.recipe_ingredients.length === 0) {
        invalidItems.push(itemName);
        details[itemName] = { error: 'Recipe has no ingredients' };
        continue;
      }

      validItems.push(itemName);
      details[itemName] = { 
        success: true,
        recipeId: recipe.id,
        ingredientCount: recipe.recipe_ingredients.length
      };

    } catch (error) {
      invalidItems.push(itemName);
      details[itemName] = { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  return {
    success: invalidItems.length === 0,
    validItems,
    invalidItems,
    details
  };
};