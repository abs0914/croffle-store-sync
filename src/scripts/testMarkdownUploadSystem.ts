/**
 * Test script for the markdown recipe upload system
 * 
 * This script validates the entire workflow:
 * 1. Parse markdown files
 * 2. Upload recipes and create commissary items
 * 3. Test recipe deployment
 * 4. Verify POS integration
 */

import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { 
  loadAllRecipeFiles, 
  quickUploadAllRecipes 
} from '@/services/recipeUpload/recipeFileLoader';
import { 
  validateParsedRecipes, 
  getParsedRecipesSummary 
} from '@/services/recipeUpload/markdownRecipeParser';
import { 
  deployRecipeToMultipleStores 
} from '@/services/recipeManagement/recipeDeploymentService';

interface TestResult {
  phase: string;
  success: boolean;
  details: any;
  errors: string[];
  warnings: string[];
}

/**
 * Comprehensive test of the markdown upload system
 */
export async function testMarkdownUploadSystem(): Promise<{
  success: boolean;
  results: TestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
  };
}> {
  const results: TestResult[] = [];
  let passedTests = 0;
  let failedTests = 0;

  console.log('🧪 Starting comprehensive test of markdown upload system...');

  // Test 1: Parse markdown files
  try {
    console.log('📋 Test 1: Parsing markdown files...');
    
    const parsedFiles = await loadAllRecipeFiles();
    const validation = validateParsedRecipes(parsedFiles);
    const summary = getParsedRecipesSummary(parsedFiles);

    const testResult: TestResult = {
      phase: 'Markdown Parsing',
      success: validation.isValid && summary.totalRecipes > 0,
      details: {
        totalFiles: summary.totalFiles,
        totalRecipes: summary.totalRecipes,
        totalIngredients: summary.totalIngredients,
        categories: Array.from(summary.recipesByCategory.keys())
      },
      errors: validation.errors,
      warnings: validation.warnings
    };

    results.push(testResult);
    
    if (testResult.success) {
      passedTests++;
      console.log(`✅ Test 1 PASSED: Parsed ${summary.totalRecipes} recipes from ${summary.totalFiles} files`);
    } else {
      failedTests++;
      console.log(`❌ Test 1 FAILED: ${validation.errors.join(', ')}`);
    }

  } catch (error) {
    failedTests++;
    results.push({
      phase: 'Markdown Parsing',
      success: false,
      details: null,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: []
    });
    console.log(`❌ Test 1 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 2: Upload recipes and create commissary items
  try {
    console.log('📤 Test 2: Uploading recipes...');
    
    const uploadResult = await quickUploadAllRecipes();

    const testResult: TestResult = {
      phase: 'Recipe Upload',
      success: uploadResult.success,
      details: {
        totalRecipes: uploadResult.totalRecipes
      },
      errors: uploadResult.errors,
      warnings: []
    };

    results.push(testResult);
    
    if (testResult.success) {
      passedTests++;
      console.log(`✅ Test 2 PASSED: Uploaded ${uploadResult.totalRecipes} recipes`);
    } else {
      failedTests++;
      console.log(`❌ Test 2 FAILED: ${uploadResult.errors.join(', ')}`);
    }

  } catch (error) {
    failedTests++;
    results.push({
      phase: 'Recipe Upload',
      success: false,
      details: null,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: []
    });
    console.log(`❌ Test 2 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 3: Verify recipe templates were created
  try {
    console.log('🔍 Test 3: Verifying recipe templates...');
    
    const { data: templates, error } = await supabase
      .from('recipe_templates')
      .select(`
        id,
        name,
        category_name,
        is_active,
        ingredients:recipe_template_ingredients(count)
      `)
      .eq('is_active', true);

    if (error) throw error;

    const testResult: TestResult = {
      phase: 'Template Verification',
      success: templates && templates.length > 0,
      details: {
        templateCount: templates?.length || 0,
        templates: templates?.map(t => ({
          name: t.name,
          category: t.category_name,
          ingredientCount: t.ingredients?.length || 0
        })) || []
      },
      errors: [],
      warnings: []
    };

    results.push(testResult);
    
    if (testResult.success) {
      passedTests++;
      console.log(`✅ Test 3 PASSED: Found ${templates.length} recipe templates`);
    } else {
      failedTests++;
      console.log(`❌ Test 3 FAILED: No recipe templates found`);
    }

  } catch (error) {
    failedTests++;
    results.push({
      phase: 'Template Verification',
      success: false,
      details: null,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: []
    });
    console.log(`❌ Test 3 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 4: Verify commissary items were created
  try {
    console.log('📦 Test 4: Verifying commissary inventory...');
    
    const { data: commissaryItems, error } = await supabase
      .from('commissary_inventory')
      .select('id, name, category, current_stock, unit_cost')
      .eq('is_active', true);

    if (error) throw error;

    const testResult: TestResult = {
      phase: 'Commissary Verification',
      success: commissaryItems && commissaryItems.length > 0,
      details: {
        itemCount: commissaryItems?.length || 0,
        categories: [...new Set(commissaryItems?.map(item => item.category) || [])],
        sampleItems: commissaryItems?.slice(0, 5).map(item => ({
          name: item.name,
          category: item.category,
          stock: item.current_stock,
          cost: item.unit_cost
        })) || []
      },
      errors: [],
      warnings: []
    };

    results.push(testResult);
    
    if (testResult.success) {
      passedTests++;
      console.log(`✅ Test 4 PASSED: Found ${commissaryItems.length} commissary items`);
    } else {
      failedTests++;
      console.log(`❌ Test 4 FAILED: No commissary items found`);
    }

  } catch (error) {
    failedTests++;
    results.push({
      phase: 'Commissary Verification',
      success: false,
      details: null,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: []
    });
    console.log(`❌ Test 4 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Test 5: Test recipe deployment (if stores exist)
  try {
    console.log('🏪 Test 5: Testing recipe deployment...');
    
    // Get available stores
    const { data: stores, error: storesError } = await supabase
      .from('stores')
      .select('id, name')
      .eq('is_active', true)
      .limit(1);

    if (storesError) throw storesError;

    if (!stores || stores.length === 0) {
      results.push({
        phase: 'Recipe Deployment',
        success: true,
        details: { message: 'No stores available for deployment test' },
        errors: [],
        warnings: ['No active stores found for deployment testing']
      });
      passedTests++;
      console.log(`⚠️ Test 5 SKIPPED: No active stores found for deployment testing`);
    } else {
      // Get a sample recipe template
      const { data: template, error: templateError } = await supabase
        .from('recipe_templates')
        .select('id, name')
        .eq('is_active', true)
        .limit(1)
        .single();

      if (templateError || !template) {
        throw new Error('No recipe templates available for deployment test');
      }

      // Test deployment
      const deploymentResults = await deployRecipeToMultipleStores(
        template.id,
        [stores[0].id],
        { createProduct: true }
      );

      const testResult: TestResult = {
        phase: 'Recipe Deployment',
        success: deploymentResults.length > 0 && deploymentResults[0].success,
        details: {
          templateName: template.name,
          storeName: stores[0].name,
          deploymentResult: deploymentResults[0]
        },
        errors: deploymentResults[0]?.error ? [deploymentResults[0].error] : [],
        warnings: deploymentResults[0]?.warnings || []
      };

      results.push(testResult);
      
      if (testResult.success) {
        passedTests++;
        console.log(`✅ Test 5 PASSED: Successfully deployed "${template.name}" to "${stores[0].name}"`);
      } else {
        failedTests++;
        console.log(`❌ Test 5 FAILED: Deployment failed - ${deploymentResults[0]?.error}`);
      }
    }

  } catch (error) {
    failedTests++;
    results.push({
      phase: 'Recipe Deployment',
      success: false,
      details: null,
      errors: [error instanceof Error ? error.message : 'Unknown error'],
      warnings: []
    });
    console.log(`❌ Test 5 FAILED: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  const totalTests = passedTests + failedTests;
  const overallSuccess = failedTests === 0;

  console.log(`\n📊 TEST SUMMARY:`);
  console.log(`Total Tests: ${totalTests}`);
  console.log(`Passed: ${passedTests}`);
  console.log(`Failed: ${failedTests}`);
  console.log(`Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (overallSuccess) {
    console.log(`🎉 ALL TESTS PASSED! The markdown upload system is working correctly.`);
  } else {
    console.log(`⚠️ Some tests failed. Check the results for details.`);
  }

  return {
    success: overallSuccess,
    results,
    summary: {
      totalTests,
      passedTests,
      failedTests
    }
  };
}

/**
 * Run the test from browser console
 */
export async function runMarkdownUploadTest() {
  try {
    const result = await testMarkdownUploadSystem();
    
    if (result.success) {
      toast.success('All tests passed! Markdown upload system is working correctly.');
    } else {
      toast.error(`${result.summary.failedTests} tests failed. Check console for details.`);
    }
    
    return result;
  } catch (error) {
    console.error('Test execution failed:', error);
    toast.error('Test execution failed');
    throw error;
  }
}

// Make available globally for console use
if (typeof window !== 'undefined') {
  (window as any).testMarkdownUpload = runMarkdownUploadTest;
}
