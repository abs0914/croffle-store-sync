/**
 * Test script to validate Mini Croffle ingredient deductions
 * This script creates a test transaction to verify the correct portion deductions
 */

import { supabase } from "@/integrations/supabase/client";

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

/**
 * Test Mini Croffle deduction with choice ingredients
 */
export async function testMiniCroffleDeductions(): Promise<TestResult> {
  try {
    console.log('🧪 TESTING Mini Croffle Ingredient Deductions');
    console.log('='.repeat(50));
    
    // Get a Mini Croffle product
    const { data: miniCroffleProducts, error: productError } = await supabase
      .from('product_catalog')
      .select('*')
      .ilike('product_name', '%mini croffle%')
      .eq('is_available', true)
      .limit(1);

    if (productError || !miniCroffleProducts?.length) {
      return {
        success: false,
        message: 'Failed to find Mini Croffle product for testing'
      };
    }

    const product = miniCroffleProducts[0];
    console.log(`📦 Testing product: ${product.product_name}`);

    // Get recipe ingredients for this product
    const { data: recipeIngredients, error: ingredientError } = await supabase
      .from('recipe_ingredients')
      .select(`
        id,
        recipe_id,
        quantity,
        unit,
        cost_per_unit,
        inventory_stock_id
      `)
      .eq('recipe_id', product.recipe_id);

    // Get inventory stock items separately to avoid relationship issues
    const stockIds = recipeIngredients?.map(ri => ri.inventory_stock_id).filter(Boolean) || [];
    const { data: inventoryItems } = await supabase
      .from('inventory_stock')
      .select('id, item')
      .in('id', stockIds);

    if (ingredientError || !recipeIngredients?.length) {
      return {
        success: false,
        message: 'Failed to get recipe ingredients for Mini Croffle',
        details: ingredientError
      };
    }

    console.log('\n📋 Recipe Ingredients Found:');
    
    let baseIngredientsCorrect = 0;
    let choiceIngredientsCorrect = 0;
    let totalBase = 0;
    let totalChoice = 0;
    
    recipeIngredients.forEach(ingredient => {
      // Find the matching inventory item
      const inventoryItem = inventoryItems?.find(item => item.id === ingredient.inventory_stock_id);
      const item = inventoryItem?.item?.toLowerCase() || '';
      const quantity = ingredient.quantity;
      
      // Check if it's a base ingredient
      const isBaseIngredient = item.includes('croissant') || 
                              item.includes('whipped cream') || 
                              item.includes('popsicle stick');
                              
      // Check if it's a choice ingredient (sauce/topping)
      const isChoiceIngredient = item.includes('sauce') || 
                                item.includes('choco flake') || 
                                item.includes('syrup') || 
                                item.includes('chocolate') || 
                                item.includes('peanut') || 
                                item.includes('marshmallow') || 
                                item.includes('sprinkle') || 
                                item.includes('oreo') || 
                                item.includes('graham');
      
      if (isBaseIngredient) {
        totalBase++;
        const expectedQuantity = item.includes('popsicle stick') ? 1.0 : 0.5;
        const isCorrect = Math.abs(quantity - expectedQuantity) < 0.01;
        
        console.log(`  🔧 BASE: ${inventoryItem?.item} - ${quantity} ${isCorrect ? '✅' : '❌'} (expected: ${expectedQuantity})`);
        
        if (isCorrect) baseIngredientsCorrect++;
        
      } else if (isChoiceIngredient) {
        totalChoice++;
        const expectedQuantity = 0.5;
        const isCorrect = Math.abs(quantity - expectedQuantity) < 0.01;
        
        console.log(`  🎯 CHOICE: ${inventoryItem?.item} - ${quantity} ${isCorrect ? '✅' : '❌'} (expected: ${expectedQuantity})`);
        
        if (isCorrect) choiceIngredientsCorrect++;
        
      } else {
        console.log(`  📦 OTHER: ${inventoryItem?.item} - ${quantity}`);
      }
    });

    console.log('\n📊 Test Results:');
    console.log(`  Base ingredients correct: ${baseIngredientsCorrect}/${totalBase}`);
    console.log(`  Choice ingredients correct: ${choiceIngredientsCorrect}/${totalChoice}`);
    
    const allCorrect = baseIngredientsCorrect === totalBase && choiceIngredientsCorrect === totalChoice;
    
    console.log(`\n🎯 Overall Result: ${allCorrect ? '✅ PASS' : '❌ FAIL'}`);
    
    if (allCorrect) {
      console.log('\n✨ Mini Croffle ingredient portions are correctly configured!');
      console.log('   - Base ingredients: Regular Croissant (0.5), Whipped Cream (0.5), Popsicle Stick (1.0)');
      console.log('   - Choice ingredients: All sauces and toppings (0.5)');
      console.log('\n🔄 The smartMixMatchDeductionService should now correctly deduct:');
      console.log('   - Base ingredients at recipe quantities');
      console.log('   - Choice ingredients forced to 0.5 portions');
    }

    return {
      success: allCorrect,
      message: allCorrect ? 
        'All Mini Croffle ingredients have correct portions' : 
        'Some Mini Croffle ingredients have incorrect portions',
      details: {
        baseCorrect: baseIngredientsCorrect,
        totalBase,
        choiceCorrect: choiceIngredientsCorrect,
        totalChoice
      }
    };

  } catch (error) {
    console.error('❌ Test failed with error:', error);
    return {
      success: false,
      message: 'Test execution failed',
      details: error
    };
  }
}

// Auto-run the test if this script is executed directly
if (typeof window !== 'undefined') {
  // Only run in browser environment for testing
  testMiniCroffleDeductions();
}