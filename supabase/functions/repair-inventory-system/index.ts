import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface RepairResult {
  success: boolean;
  recipesLinked: number;
  transactionsProcessed: number;
  inventoryDeducted: number;
  errors: string[];
  warnings: string[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { storeId, processHistoricalTransactions = false } = await req.json()
    
    console.log(`🔧 Starting inventory system repair for store: ${storeId}`)
    
    const result: RepairResult = {
      success: true,
      recipesLinked: 0,
      transactionsProcessed: 0,
      inventoryDeducted: 0,
      errors: [],
      warnings: []
    }

    // Step 1: Link recipes to products by matching names
    console.log('🔗 Step 1: Linking recipes to products...')
    
    const { data: products, error: productsError } = await supabaseClient
      .from('products')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('is_active', true)

    if (productsError) {
      result.errors.push(`Failed to fetch products: ${productsError.message}`)
      result.success = false
    } else {
      const { data: unlinkedRecipes, error: recipesError } = await supabaseClient
        .from('recipes')
        .select('id, name, product_id')
        .eq('store_id', storeId)
        .eq('is_active', true)
        .is('product_id', null)

      if (recipesError) {
        result.errors.push(`Failed to fetch recipes: ${recipesError.message}`)
        result.success = false
      } else {
        console.log(`📋 Found ${unlinkedRecipes?.length || 0} unlinked recipes`)
        
        for (const recipe of unlinkedRecipes || []) {
          // Find matching product by name
          const matchingProduct = products?.find(p => 
            p.name.toLowerCase().trim() === recipe.name.toLowerCase().trim()
          )
          
          if (matchingProduct) {
            const { error: updateError } = await supabaseClient
              .from('recipes')
              .update({ product_id: matchingProduct.id })
              .eq('id', recipe.id)
            
            if (updateError) {
              result.errors.push(`Failed to link recipe ${recipe.name}: ${updateError.message}`)
            } else {
              result.recipesLinked++
              console.log(`✅ Linked recipe "${recipe.name}" to product "${matchingProduct.name}"`)
            }
          } else {
            result.warnings.push(`No matching product found for recipe: ${recipe.name}`)
          }
        }
      }
    }

    // Step 2: Process historical transactions if requested
    if (processHistoricalTransactions && result.success) {
      console.log('🕐 Step 2: Processing historical transactions...')
      
      // Get transactions from the last 30 days that may have missed inventory deductions
      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
      
      const { data: transactions, error: transactionsError } = await supabaseClient
        .from('transactions')
        .select('id, receipt_number, items, created_at')
        .eq('store_id', storeId)
        .eq('status', 'completed')
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })
        .limit(100)

      if (transactionsError) {
        result.errors.push(`Failed to fetch transactions: ${transactionsError.message}`)
      } else {
        console.log(`📦 Processing ${transactions?.length || 0} recent transactions`)
        
        for (const transaction of transactions || []) {
          try {
            // Check if this transaction already has inventory movements
            const { data: existingMovements } = await supabaseClient
              .from('inventory_movements')
              .select('id')
              .eq('reference_id', transaction.id)
              .limit(1)
            
            if (existingMovements && existingMovements.length > 0) {
              continue // Skip if already processed
            }
            
            const transactionItems = JSON.parse(transaction.items || '[]')
            const deductionResult = await processTransactionInventoryDeduction(
              supabaseClient,
              transaction.id,
              storeId,
              transactionItems
            )
            
            if (deductionResult.success) {
              result.transactionsProcessed++
              result.inventoryDeducted += deductionResult.itemsDeducted
              console.log(`✅ Processed transaction ${transaction.receipt_number}: ${deductionResult.itemsDeducted} items deducted`)
            } else {
              result.warnings.push(`Failed to process transaction ${transaction.receipt_number}: ${deductionResult.error}`)
            }
            
          } catch (error) {
            result.warnings.push(`Error processing transaction ${transaction.receipt_number}: ${error.message}`)
          }
        }
      }
    }

    console.log(`🎯 Repair completed: ${result.recipesLinked} recipes linked, ${result.transactionsProcessed} transactions processed`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: result.success ? 200 : 500
    })

  } catch (error) {
    console.error('❌ Repair function error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        recipesLinked: 0,
        transactionsProcessed: 0,
        inventoryDeducted: 0,
        errors: [error.message],
        warnings: []
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    )
  }
})

async function processTransactionInventoryDeduction(
  supabaseClient: any,
  transactionId: string,
  storeId: string,
  items: any[]
): Promise<{ success: boolean; itemsDeducted: number; error?: string }> {
  let itemsDeducted = 0
  
  try {
    for (const item of items) {
      if (!item.productId) continue
      
      // Get recipe for this product
      const { data: recipe, error: recipeError } = await supabaseClient
        .from('recipes')
        .select(`
          id,
          name,
          recipe_ingredients (
            ingredient_name,
            quantity,
            inventory_stock_id,
            inventory_stock (
              id,
              item,
              stock_quantity
            )
          )
        `)
        .eq('product_id', item.productId)
        .eq('store_id', storeId)
        .eq('is_active', true)
        .maybeSingle()

      if (recipeError || !recipe) continue

      // Process each ingredient
      for (const ingredient of recipe.recipe_ingredients || []) {
        if (!ingredient.inventory_stock_id || !ingredient.inventory_stock) continue

        const totalDeduction = ingredient.quantity * (item.quantity || 1)
        const currentStock = ingredient.inventory_stock.stock_quantity
        const newStock = Math.max(0, currentStock - totalDeduction)

        // Update inventory stock
        const { error: updateError } = await supabaseClient
          .from('inventory_stock')
          .update({ 
            stock_quantity: newStock,
            updated_at: new Date().toISOString()
          })
          .eq('id', ingredient.inventory_stock_id)

        if (updateError) {
          console.error(`Failed to update inventory for ${ingredient.ingredient_name}:`, updateError)
          continue
        }

        // Log inventory movement
        const { error: movementError } = await supabaseClient
          .from('inventory_movements')
          .insert({
            inventory_stock_id: ingredient.inventory_stock_id,
            movement_type: 'sale',
            quantity_change: -totalDeduction,
            previous_quantity: currentStock,
            new_quantity: newStock,
            reference_type: 'transaction',
            reference_id: transactionId,
            notes: `Historical repair: ${ingredient.ingredient_name} for ${recipe.name}`,
            created_by: null
          })

        if (!movementError) {
          itemsDeducted++
        }
      }
    }

    return { success: true, itemsDeducted }
  } catch (error) {
    return { success: false, itemsDeducted: 0, error: error.message }
  }
}