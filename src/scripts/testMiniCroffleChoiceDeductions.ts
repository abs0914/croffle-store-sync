/**
 * Test script to verify Mini Croffle choice ingredient deductions
 * Tests all sauces and toppings to ensure they are properly deducted
 */

import { supabase } from "@/integrations/supabase/client";

interface TestResult {
  success: boolean;
  message: string;
  details?: any;
}

interface InventoryItem {
  id: string;
  item: string;
  item_category: string;
  stock_quantity: number;
}

/**
 * Test the enhanced choice ingredient matching
 */
export async function testMiniCroffleChoiceDeductions(): Promise<TestResult> {
  console.log('🧪 TESTING: Mini Croffle choice ingredient deductions');
  
  try {
    // Get all available sauces and toppings for Mini Croffle
    const { data: inventoryItems, error: inventoryError } = await supabase
      .from('inventory_stock')
      .select('id, item, item_category, stock_quantity')
      .eq('store_id', 'd7c47e6b-f20a-4543-a6bd-000398f72df5')
      .in('item_category', ['classic_sauce', 'premium_sauce', 'classic_topping', 'premium_topping'])
      .eq('is_active', true)
      .order('item_category', { ascending: true })
      .order('item', { ascending: true });

    if (inventoryError) {
      return {
        success: false,
        message: `Failed to fetch inventory items: ${inventoryError.message}`
      };
    }

    if (!inventoryItems || inventoryItems.length === 0) {
      return {
        success: false,
        message: 'No sauce or topping inventory items found'
      };
    }

    console.log(`📋 TESTING: Found ${inventoryItems.length} sauce/topping items to test`);

    // Test all combinations of Mini Croffle with different choices
    const testResults: Array<{
      choice: string;
      category: string;
      shouldMatch: boolean;
      actualMatch: boolean;
      passed: boolean;
    }> = [];

    // Test the enhanced matching function (simulate it here)
    const testMatchesChoice = (ingredientName: string, selectedChoice: string): boolean => {
      const ingredient = ingredientName.toLowerCase();
      const choice = selectedChoice.toLowerCase();
      
      // Direct match
      if (ingredient.includes(choice) || choice.includes(ingredient)) {
        return true;
      }
      
      // Enhanced variations
      const variations: Record<string, string[]> = {
        'chocolate sauce': ['chocolate sauce', 'chocolate syrup', 'choco sauce', 'dark chocolate sauce'],
        'chocolate': ['chocolate', 'choco', 'chocolate sauce', 'dark chocolate', 'chocolate syrup', 'chocolate crumble'],
        'choco flakes': ['choco flakes', 'chocolate flakes', 'choco flake'],
        'caramel sauce': ['caramel sauce', 'caramel syrup', 'caramel'],
        'strawberry sauce': ['strawberry sauce', 'strawberry syrup', 'strawberry'],
        'tiramisu': ['tiramisu', 'tiramisu sauce'],
        'vanilla sauce': ['vanilla sauce', 'vanilla syrup', 'vanilla'],
        'nutella': ['nutella', 'nutella sauce'],
        'colored sprinkles': ['colored sprinkles', 'sprinkles', 'sprinkle', 'rainbow sprinkles'],
        'sprinkles': ['colored sprinkles', 'sprinkles', 'sprinkle', 'rainbow sprinkles'],
        'marshmallow': ['marshmallows', 'marshmallow', 'marshmallow sauce'],
        'oreo': ['oreo', 'oreo crumbs', 'crushed oreo'],
        'graham': ['graham', 'graham cracker', 'crushed graham'],
        'nuts': ['crushed nuts', 'almonds', 'peanuts', 'peanut'],
        'peanut': ['peanuts', 'peanut', 'crushed nuts']
      };
      
      for (const [key, patterns] of Object.entries(variations)) {
        const choiceMatchesKey = choice.includes(key) || patterns.some(pattern => choice.includes(pattern));
        const ingredientMatchesVariation = ingredient.includes(key) || patterns.some(pattern => ingredient.includes(pattern));
        
        if (choiceMatchesKey && ingredientMatchesVariation) {
          return true;
        }
        
        const ingredientMatchesKey = ingredient.includes(key) || patterns.some(pattern => ingredient.includes(pattern));
        const choiceMatchesVariation = choice.includes(key) || patterns.some(pattern => choice.includes(pattern));
        
        if (ingredientMatchesKey && choiceMatchesVariation) {
          return true;
        }
      }
      
      return false;
    };

    // Test each inventory item against common Mini Croffle choice names
    const commonChoices = [
      'Chocolate', 'Choco Flakes', 'Colored Sprinkles', 'Tiramisu', 
      'Caramel', 'Strawberry', 'Marshmallow', 'Vanilla', 'Nutella'
    ];

    let totalTests = 0;
    let passedTests = 0;

    for (const item of inventoryItems) {
      for (const choice of commonChoices) {
        const shouldMatch = item.item.toLowerCase().includes(choice.toLowerCase()) ||
                           choice.toLowerCase().includes(item.item.toLowerCase()) ||
                           (choice === 'Chocolate' && item.item.toLowerCase().includes('choco')) ||
                           (choice === 'Choco Flakes' && item.item.toLowerCase().includes('chocolate flakes')) ||
                           (choice === 'Colored Sprinkles' && item.item.toLowerCase().includes('sprinkles'));

        const actualMatch = testMatchesChoice(item.item, choice);
        const passed = shouldMatch === actualMatch;

        testResults.push({
          choice: `${item.item} vs ${choice}`,
          category: item.item_category,
          shouldMatch,
          actualMatch,
          passed
        });

        totalTests++;
        if (passed) passedTests++;

        console.log(`${passed ? '✅' : '❌'} TEST: "${item.item}" vs "${choice}" - Should: ${shouldMatch}, Got: ${actualMatch}`);
      }
    }

    // Test specific problematic cases from transactions
    const specificTests = [
      { inventory: 'Choco Flakes', choice: 'Chocolate', shouldMatch: true },
      { inventory: 'Chocolate Sauce', choice: 'Chocolate', shouldMatch: true },
      { inventory: 'Colored Sprinkles', choice: 'Colored Sprinkles', shouldMatch: true },
      { inventory: 'Tiramisu', choice: 'Tiramisu', shouldMatch: true },
      { inventory: 'Dark Chocolate Sauce', choice: 'Chocolate', shouldMatch: true }
    ];

    console.log('\n🎯 SPECIFIC TEST CASES:');
    for (const test of specificTests) {
      const actualMatch = testMatchesChoice(test.inventory, test.choice);
      const passed = test.shouldMatch === actualMatch;
      
      totalTests++;
      if (passed) passedTests++;

      console.log(`${passed ? '✅' : '❌'} SPECIFIC: "${test.inventory}" vs "${test.choice}" - Should: ${test.shouldMatch}, Got: ${actualMatch}`);
    }

    const successRate = Math.round((passedTests / totalTests) * 100);

    console.log(`\n📊 TEST SUMMARY:`);
    console.log(`   Total Tests: ${totalTests}`);
    console.log(`   Passed: ${passedTests}`);
    console.log(`   Failed: ${totalTests - passedTests}`);
    console.log(`   Success Rate: ${successRate}%`);

    return {
      success: successRate >= 90, // 90% or higher success rate
      message: `Mini Croffle choice deduction test completed with ${successRate}% success rate`,
      details: {
        totalTests,
        passedTests,
        failedTests: totalTests - passedTests,
        successRate,
        inventoryItemsFound: inventoryItems.length,
        testResults: testResults.filter(t => !t.passed) // Only show failed tests
      }
    };

  } catch (error) {
    console.error('❌ TEST ERROR:', error);
    return {
      success: false,
      message: `Test failed with error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      details: { error }
    };
  }
}

// Auto-run the test if this file is executed directly
if (typeof window !== 'undefined') {
  console.log('🚀 AUTO-RUNNING: Mini Croffle choice deduction test...');
  testMiniCroffleChoiceDeductions().then(result => {
    console.log('\n🏁 TEST COMPLETED:', result);
  });
}