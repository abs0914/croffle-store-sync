/**
 * Inventory Deduction Service
 *
 * This service handles automatic inventory deduction when transactions are completed.
 * It ensures that inventory levels are properly maintained and tracked.
 */

import { supabase } from '@/integrations/supabase/client';
import { findInventoryMatch } from '@/services/inventory/inventoryMatcher';

export interface TransactionItem {
  product_id?: string; // product_catalog.id when available
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface InventoryDeductionResult {
  success: boolean;
  deductedItems: Array<{
    ingredient: string;
    deducted: number;
    unit: string;
    previousStock: number;
    newStock: number;
  }>;
  errors: string[];
  warnings: string[];
}

/**
 * Deducts inventory for a completed transaction
 */
export async function deductInventoryForTransaction(
  transactionId: string,
  storeId: string,
  transactionItems: TransactionItem[]
): Promise<InventoryDeductionResult> {
  const result: InventoryDeductionResult = {
    success: true,
    deductedItems: [],
    errors: [],
    warnings: []
  };

  console.log(`🔄 STARTING INVENTORY DEDUCTION`);
  console.log(`   Transaction ID: ${transactionId}`);
  console.log(`   Store ID: ${storeId}`);
  console.log(`   Items to process: ${transactionItems.length}`);
  console.log(`   Items:`, transactionItems.map(item => `${item.name} (qty: ${item.quantity})`));

  try {
    for (const item of transactionItems) {
      console.log(`\n🔍 PROCESSING ITEM: ${item.name} (quantity: ${item.quantity})`);

      // Prefer mapping via product_catalog -> product_ingredients when product_id is present
      let ingredients: any[] | null = null;
      let source: 'catalog' | 'template' = 'template';
      let recipe: { id: string; name: string } | null = null;

      if (item.product_id) {
        console.log(`   🔗 Resolving via product_catalog.id: ${item.product_id}`);
        const { data: productIngredients, error: piError } = await supabase
          .from('product_ingredients')
          .select(`
            id, required_quantity, unit,
            inventory_item:inventory_stock(id, item, unit, stock_quantity, is_active)
          `)
          .eq('product_catalog_id', item.product_id);

        if (piError) {
          console.log(`   ⚠️ Failed catalog-based resolution: ${piError.message}`);
        } else if (productIngredients && productIngredients.length > 0) {
          source = 'catalog';
          // Normalize to expected ingredient fields
          ingredients = productIngredients.map(pi => ({
            ingredient_name: pi.inventory_item?.item,
            unit: pi.unit,
            quantity: pi.required_quantity,
            inventory_stock_id: pi.inventory_item?.id
          }));
          console.log(`   ✅ Found ${ingredients.length} ingredients via product_ingredients`);
        }
      }

      // Fallback via product_catalog.recipe_id -> recipes.template_id -> recipe_template_ingredients
      if (!ingredients) {
        let templateId: string | null = null;

        if (item.product_id) {
          console.log(`   🔗 Resolving via product_catalog.recipe_id for product_id=${item.product_id}`);
          const { data: pc, error: pcErr } = await supabase
            .from('product_catalog')
            .select('id, recipe_id, product_name')
            .eq('id', item.product_id)
            .maybeSingle();

          if (pcErr) {
            console.warn('   ⚠️ product_catalog lookup error:', pcErr.message);
          }

          if (pc?.recipe_id) {
            const { data: rec, error: recErr } = await supabase
              .from('recipes')
              .select('id, template_id, name')
              .eq('id', pc.recipe_id)
              .maybeSingle();

            if (!recErr && rec?.template_id) {
              templateId = rec.template_id as string;
              recipe = { id: templateId, name: pc.product_name || item.name } as any;
              console.log(`   ✅ Using template_id from recipes: ${templateId}`);
            } else {
              console.warn('   ⚠️ recipes lookup failed or missing template_id:', recErr?.message);
            }
          }
        }

        // Last resort: name->recipe_templates (pick first active)
        if (!templateId) {
          console.log(`   📋 Fallback: looking up recipe_templates by name: ${item.name}`);
          const { data: rtRows, error: rtErr } = await supabase
            .from('recipe_templates')
            .select('id, name')
            .eq('name', item.name)
            .eq('is_active', true)
            .limit(1);

          if (rtErr || !rtRows || rtRows.length === 0) {
            const warningMsg = `Recipe not found for product: ${item.name} (Error: ${rtErr?.message || 'Not found'})`;
            console.log(`   ❌ ${warningMsg}`);
            result.warnings.push(warningMsg);
            continue;
          }

          recipe = rtRows[0];
          templateId = rtRows[0].id;
          console.log(`   ✅ Found template by name: ${recipe.name} (ID: ${templateId})`);
        }

        console.log(`   🧪 Getting ingredients for template: ${templateId}`);
        let ingredientsDataRes = await supabase
          .from('recipe_template_ingredients')
          .select('*')
          .eq('recipe_template_id', templateId);

        if (ingredientsDataRes.error) {
          const errorMsg = `Failed to get ingredients for ${item.name}: ${ingredientsDataRes.error.message}`;
          console.log(`   ❌ ${errorMsg}`);
          result.errors.push(errorMsg);
          continue;
        }

        let ingredientsData = ingredientsDataRes.data || [];

        // Fallback: if no rows via template_id, try name-normalized template lookup
        if (ingredientsData.length === 0) {
          const baseName = item.name
            .replace(/\s*\(from[^)]*\)/i, '') // strip "(from ...)"
            .replace(/\s+with\s+.+$/i, '')     // strip " with ..."
            .trim();
          if (baseName && baseName !== item.name) {
            console.log(`   🔁 No ingredients via template_id. Fallback by normalized name: ${baseName}`);
            const { data: rtRows2, error: rtErr2 } = await supabase
              .from('recipe_templates')
              .select('id, name')
              .eq('name', baseName)
              .eq('is_active', true)
              .limit(1);
            if (!rtErr2 && rtRows2 && rtRows2.length > 0) {
              const altTemplateId = rtRows2[0].id;
              console.log(`   ✅ Found alternate template ${rtRows2[0].name} (${altTemplateId})`);
              const altRes = await supabase
                .from('recipe_template_ingredients')
                .select('*')
                .eq('recipe_template_id', altTemplateId);
              if (!altRes.error && altRes.data && altRes.data.length > 0) {
                ingredientsData = altRes.data;
              }
            }
          }
        }

        if (!ingredientsData || ingredientsData.length === 0) {
          const warningMsg = `No ingredients defined for ${item.name} (template: ${templateId})`;
          console.log(`   ⚠️ ${warningMsg}`);
          result.warnings.push(warningMsg);
          continue;
        }

        ingredients = ingredientsData;
        console.log(`   ✅ Found ${ingredients.length} ingredients via recipe template`);
      }

      // Process each ingredient
      for (const ingredient of ingredients) {
        const requiredQuantity = ingredient.quantity * item.quantity;

        console.log(`\n      🔍 Processing ingredient: ${ingredient.ingredient_name}`);
        console.log(`         Required: ${requiredQuantity} ${ingredient.unit} (${ingredient.quantity} × ${item.quantity})`);

        // Get inventory via robust matcher (category-aware) and prefer serving_ready_quantity when available
        console.log(`         📦 Resolving inventory for: ${ingredient.ingredient_name}`);

        // 1) Find inventory item ID and conversion factor
        let inventoryId: string | null = ingredient.inventory_stock_id || null;
        let conversionFactor = 1;
        if (!inventoryId) {
          try {
            const match = await findInventoryMatch(ingredient.ingredient_name, ingredient.unit, storeId);
            if (match && match.match_type !== 'none') {
              inventoryId = match.inventory_item_id;
              conversionFactor = match.conversion_factor || 1;
              console.log(`         🎯 Match → ${match.inventory_item_name} (type: ${match.match_type}, conv: ${conversionFactor})`);
            }
          } catch (e) {
            console.warn('         ⚠️ Matcher error:', e);
          }
        }

        if (!inventoryId) {
          const errorMsg = `Inventory not found for ${ingredient.ingredient_name} at store ${storeId}`;
          console.log(`         ❌ ${errorMsg}`);
          result.errors.push(errorMsg);
          continue;
        }

        // 2) Load inventory row
        const { data: inventory, error: invErr } = await supabase
          .from('inventory_stock')
          .select('*')
          .eq('id', inventoryId)
          .eq('store_id', storeId)
          .single();

        if (invErr || !inventory) {
          const errorMsg = `Inventory row not accessible for ${ingredient.ingredient_name} (id: ${inventoryId})`;
          console.log(`         ❌ ${errorMsg}`);
          result.errors.push(errorMsg);
          continue;
        }

        // 3) Compute final required quantity with conversion
        const finalRequired = requiredQuantity * conversionFactor;
        const available = (typeof inventory.serving_ready_quantity === 'number' && inventory.serving_ready_quantity !== null)
          ? inventory.serving_ready_quantity
          : (inventory.stock_quantity || 0);
        const fieldToUpdate = (typeof inventory.serving_ready_quantity === 'number' && inventory.serving_ready_quantity !== null)
          ? 'serving_ready_quantity'
          : 'stock_quantity';

        if (available < finalRequired) {
          result.warnings.push(`Insufficient stock for ${ingredient.ingredient_name}: required ${finalRequired}, available ${available}`);
        }

        const newQuantity = Math.max(0, available - finalRequired);

        // 4) Update inventory
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({
            [fieldToUpdate]: newQuantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', inventory.id);
        if (updateError) {
          result.errors.push(`Failed to update inventory for ${ingredient.ingredient_name}: ${updateError.message}`);
          continue;
        }

        // Record the deduction
        result.deductedItems.push({
          ingredient: ingredient.ingredient_name,
          deducted: finalRequired,
          unit: ingredient.unit,
          previousStock: available,
          newStock: newQuantity
        });

        console.log(`    ✅ Updated ${ingredient.ingredient_name}: ${available} → ${newQuantity} (${fieldToUpdate})`);

        // 5) Movement records (primary: inventory_transactions, fallback: inventory_movements)
        try {
          const userRes = await supabase.auth.getUser();
          const createdBy = userRes.data.user?.id || userRes.data.user?.email || 'system';

          const insertPayload = {
            store_id: storeId,
            product_id: inventory.id,
            transaction_type: 'sale',
            quantity: -finalRequired,
            previous_quantity: available,
            new_quantity: newQuantity,
            reference_id: transactionId,
            notes: `Automatic deduction for transaction ${transactionId}`,
            created_by: createdBy,
            created_at: new Date().toISOString()
          } as const;

          let movementError: any = null;
          try {
            const { error } = await supabase.from('inventory_transactions').insert(insertPayload);
            movementError = error;
          } catch (e) {
            movementError = e;
          }

          if (movementError) {
            console.warn('⚠️ inventory_transactions insert failed, trying inventory_movements fallback:', movementError);
            try {
              const { error: mvErr } = await supabase
                .from('inventory_movements')
                .insert({
                  inventory_stock_id: inventory.id,
                  movement_type: 'sale',
                  quantity_change: -finalRequired,
                  previous_quantity: available,
                  new_quantity: newQuantity,
                  reference_type: 'transaction',
                  reference_id: transactionId,
                  notes: `Product sale: ${ingredient.ingredient_name}`,
                  created_by: userRes.data.user?.id,
                  created_at: new Date().toISOString()
                });
              if (mvErr) {
                result.warnings.push(`Movement record failed in both tables for ${ingredient.ingredient_name}: ${mvErr.message}`);
              }
            } catch (fallbackErr) {
              result.warnings.push(`Movement record fallback threw for ${ingredient.ingredient_name}: ${fallbackErr}`);
            }
          }
        } catch (movementError) {
          console.warn('⚠️ Movement insert threw:', movementError);
          result.warnings.push(`Movement record failed for ${ingredient.ingredient_name}: ${movementError}`);
        }
      }
    }

    // Set overall success based on whether we had any critical errors
    result.success = result.errors.length === 0;

    console.log(`✅ Inventory deduction completed. Success: ${result.success}, Deducted: ${result.deductedItems.length} items`);

  } catch (error) {
    result.success = false;
    result.errors.push(`Inventory deduction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    console.error('❌ Inventory deduction error:', error);
  }

  return result;
}

/**
 * Validates that sufficient inventory exists for a transaction before processing
 */
export async function validateInventoryForTransaction(
  storeId: string,
  transactionItems: TransactionItem[]
): Promise<{
  valid: boolean;
  insufficientItems: Array<{
    ingredient: string;
    required: number;
    available: number;
    unit: string;
  }>;
}> {
  const insufficientItems: Array<{
    ingredient: string;
    required: number;
    available: number;
    unit: string;
  }> = [];

  try {
    for (const item of transactionItems) {
      // Get recipe template
      const { data: recipe } = await supabase
        .from('recipe_templates')
        .select('id')
        .eq('name', item.name)
        .eq('is_active', true)
        .single();

      if (!recipe) continue;

      // Get recipe ingredients
      const { data: ingredients } = await supabase
        .from('recipe_template_ingredients')
        .select('*')
        .eq('recipe_template_id', recipe.id);

      if (!ingredients) continue;

      // Check each ingredient
      for (const ingredient of ingredients) {
        const requiredQuantity = ingredient.quantity * item.quantity;

        const { data: inventory } = await supabase
          .from('inventory_stock')
          .select('stock_quantity')
          .eq('store_id', storeId)
          .eq('item', ingredient.ingredient_name)
          .eq('is_active', true)
          .single();

        if (!inventory || inventory.stock_quantity < requiredQuantity) {
          insufficientItems.push({
            ingredient: ingredient.ingredient_name,
            required: requiredQuantity,
            available: inventory?.stock_quantity || 0,
            unit: ingredient.unit
          });
        }
      }
    }
  } catch (error) {
    console.error('Inventory validation error:', error);
  }

  return {
    valid: insufficientItems.length === 0,
    insufficientItems
  };
}

/**
 * Rolls back inventory deduction for a transaction (in case of cancellation)
 */
export async function rollbackInventoryDeduction(
  transactionId: string,
  storeId: string,
  transactionItems: TransactionItem[]
): Promise<{ success: boolean; errors: string[] }> {
  const errors: string[] = [];

  try {
    console.log(`🔄 Rolling back inventory for transaction: ${transactionId}`);

    for (const item of transactionItems) {
      const { data: recipe } = await supabase
        .from('recipe_templates')
        .select('id')
        .eq('name', item.name)
        .eq('is_active', true)
        .single();

      if (!recipe) continue;

      const { data: ingredients } = await supabase
        .from('recipe_template_ingredients')
        .select('*')
        .eq('recipe_template_id', recipe.id);

      if (!ingredients) continue;

      for (const ingredient of ingredients) {
        const returnQuantity = ingredient.quantity * item.quantity;

        const { data: inventory } = await supabase
          .from('inventory_stock')
          .select('*')
          .eq('store_id', storeId)
          .eq('item', ingredient.ingredient_name)
          .eq('is_active', true)
          .single();

        if (inventory) {
          const newStock = inventory.stock_quantity + returnQuantity;

          const { error: updateError } = await supabase
            .from('inventory_stock')
            .update({ 
              stock_quantity: newStock,
              updated_at: new Date().toISOString()
            })
            .eq('id', inventory.id);

          if (updateError) {
            errors.push(`Failed to rollback ${ingredient.ingredient_name}: ${updateError.message}`);
          } else {
            console.log(`    ✅ Rolled back ${ingredient.ingredient_name}: ${inventory.stock_quantity} → ${newStock}`);
          }
        }
      }
    }
  } catch (error) {
    errors.push(`Rollback failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return {
    success: errors.length === 0,
    errors
  };
}

/**
 * Gets inventory status for a store
 */
export async function getInventoryStatus(storeId: string) {
  const { data: inventory, error } = await supabase
    .from('inventory_stock')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .order('item');

  if (error) {
    throw new Error(`Failed to get inventory status: ${error.message}`);
  }

  const lowStockItems = inventory?.filter(item => 
    item.stock_quantity <= (item.minimum_threshold || 5)
  ) || [];

  return {
    totalItems: inventory?.length || 0,
    lowStockItems: lowStockItems.length,
    lowStockDetails: lowStockItems,
    inventory: inventory || []
  };
}
