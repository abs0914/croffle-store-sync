import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RecipeAuditResult {
  template_name: string;
  store_name: string;
  ingredient_name: string;
  template_quantity: number;
  template_unit: string;
  deployed_quantity: number;
  deployed_unit: string;
  status: string;
  issue_type: string;
  // Legacy compatibility properties
  recipe_id?: string;
  recipe_name?: string;
  template_id?: string;
  store_id?: string;
  missing_ingredients?: string[];
  recipe_ingredients_count?: number;
  template_ingredients_count?: number;
}

export interface RecipeSyncResult {
  recipes_updated: number;
  ingredients_updated: number;
  stores_affected: number;
  sync_details: any;
  // Legacy compatibility properties
  success?: boolean;
  error?: string;
  recipes_repaired?: number;
  incomplete_recipes_found?: number;
  total_ingredients_added?: number;
  total_mappings_created?: number;
  errors?: string[];
}

export const auditRecipeTemplateConsistency = async (): Promise<RecipeAuditResult[]> => {
  try {
    console.log('🔍 Running recipe template consistency audit...');
    
    const { data, error } = await supabase.rpc('audit_recipe_template_consistency');
    
    if (error) {
      console.error('Audit error:', error);
      throw new Error(`Recipe audit failed: ${error.message}`);
    }
    
    console.log('📊 Audit results:', data);
    return data || [];
  } catch (error) {
    console.error('Recipe audit service error:', error);
    toast.error('Failed to run recipe audit');
    throw error;
  }
};

export const syncRecipesWithTemplates = async (templateIds?: string[]): Promise<RecipeSyncResult> => {
  try {
    console.log('🔄 Syncing recipes with templates...', templateIds);
    
    const { data, error } = await supabase.rpc('sync_recipes_with_templates', {
      p_template_ids: templateIds || null
    });
    
    if (error) {
      console.error('Sync error:', error);
      throw new Error(`Recipe sync failed: ${error.message}`);
    }
    
    console.log('✅ Sync completed:', data);
    
    if (data && data.length > 0) {
      const result = data[0];
      const enhancedResult: RecipeSyncResult = {
        ...result,
        success: true,
        recipes_repaired: result.recipes_updated,
        incomplete_recipes_found: result.recipes_updated,
        total_ingredients_added: result.ingredients_updated,
        total_mappings_created: 0,
        errors: []
      };
      
      toast.success(
        `Successfully synced ${result.recipes_updated} recipes with ${result.ingredients_updated} ingredients across ${result.stores_affected} stores`
      );
      return enhancedResult;
    }
    
    return { 
      recipes_updated: 0, 
      ingredients_updated: 0, 
      stores_affected: 0, 
      sync_details: {},
      success: true,
      recipes_repaired: 0,
      incomplete_recipes_found: 0,
      total_ingredients_added: 0,
      total_mappings_created: 0,
      errors: []
    };
  } catch (error) {
    console.error('Recipe sync service error:', error);
    toast.error('Failed to sync recipes');
    
    return {
      recipes_updated: 0,
      ingredients_updated: 0,
      stores_affected: 0,
      sync_details: {},
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      recipes_repaired: 0,
      incomplete_recipes_found: 0,
      total_ingredients_added: 0,
      total_mappings_created: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

export const exportRecipeAuditReport = (auditData: RecipeAuditResult[]): void => {
  try {
    console.log('📤 Exporting recipe audit report...');
    
    // Prepare CSV headers
    const headers = [
      'Template Name',
      'Store Name', 
      'Ingredient Name',
      'Template Quantity',
      'Template Unit',
      'Deployed Quantity', 
      'Deployed Unit',
      'Status',
      'Issue Type'
    ];
    
    // Convert data to CSV rows
    const csvRows = auditData.map(item => [
      item.template_name,
      item.store_name,
      item.ingredient_name,
      item.template_quantity,
      item.template_unit,
      item.deployed_quantity,
      item.deployed_unit,
      item.status,
      item.issue_type
    ]);
    
    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => 
        row.map(field => 
          typeof field === 'string' && field.includes(',') 
            ? `"${field}"` 
            : field
        ).join(',')
      )
    ].join('\n');
    
    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `recipe-audit-report-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Recipe audit report exported successfully');
    console.log('✅ Export completed');
  } catch (error) {
    console.error('Export error:', error);
    toast.error('Failed to export audit report');
  }
};

export const getAuditSummary = (auditData: RecipeAuditResult[]) => {
  const summary = {
    total: auditData.length,
    consistent: 0,
    quantity_mismatch: 0,
    unit_mismatch: 0, 
    missing_deployment: 0,
    templates_affected: new Set<string>(),
    stores_affected: new Set<string>()
  };
  
  auditData.forEach(item => {
    summary.templates_affected.add(item.template_name);
    if (item.store_name !== 'Missing Deployment') {
      summary.stores_affected.add(item.store_name);
    }
    
    switch (item.issue_type) {
      case 'consistent':
        summary.consistent++;
        break;
      case 'quantity_mismatch':
        summary.quantity_mismatch++;
        break;
      case 'unit_mismatch':
        summary.unit_mismatch++;
        break;
      case 'missing_deployment':
        summary.missing_deployment++;
        break;
    }
  });
  
  return {
    ...summary,
    templates_count: summary.templates_affected.size,
    stores_count: summary.stores_affected.size
  };
};

// Legacy function signatures for backward compatibility
export const repairIncompleteRecipe = async (recipeId: string, templateId: string, storeId: string): Promise<RecipeSyncResult> => {
  // Convert single recipe repair to template sync
  return await syncRecipesWithTemplates([templateId]);
};

// Legacy exports for backward compatibility with existing components
export const auditRecipeCompleteness = auditRecipeTemplateConsistency;
export const bulkRepairIncompleteRecipes = syncRecipesWithTemplates;
export interface BulkRepairSummary extends RecipeSyncResult {}