import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RepairResult {
  success: boolean;
  message: string;
  repaired?: boolean;
  productId?: string;
  recipeId?: string;
}

interface TransactionItem {
  id: string;
  product_name: string;
  quantity: number;
  price: number;
}

class TransactionRepairService {
  private static instance: TransactionRepairService;

  static getInstance(): TransactionRepairService {
    if (!TransactionRepairService.instance) {
      TransactionRepairService.instance = new TransactionRepairService();
    }
    return TransactionRepairService.instance;
  }

  /**
   * Enhanced repair system for checkout process
   * Attempts to fix recipe/template issues during transaction
   */
  async repairTransactionItems(
    items: TransactionItem[], 
    storeId: string
  ): Promise<{ items: TransactionItem[]; repairLog: RepairResult[] }> {
    const repairLog: RepairResult[] = [];
    const repairedItems: TransactionItem[] = [];

    console.log('🔧 Starting transaction repair for', items.length, 'items');

    for (const item of items) {
      try {
        const repairResult = await this.repairSingleItem(item, storeId);
        repairLog.push(repairResult);
        
        if (repairResult.success) {
          repairedItems.push(item);
        } else {
          console.warn('❌ Could not repair item:', item.product_name, repairResult.message);
        }
      } catch (error) {
        console.error('🚨 Repair error for', item.product_name, error);
        repairLog.push({
          success: false,
          message: `Repair failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        });
      }
    }

    return { items: repairedItems, repairLog };
  }

  /**
   * Repair individual item by finding or creating recipe
   */
  private async repairSingleItem(item: TransactionItem, storeId: string): Promise<RepairResult> {
    // First, check if the product already has a proper recipe
    const { data: product, error: productError } = await supabase
      .from('product_catalog')
      .select(`
        id,
        recipe_id,
        recipes!inner(
          id,
          template_id,
          recipe_templates(id, name, is_active)
        )
      `)
      .eq('product_name', item.product_name)
      .eq('store_id', storeId)
      .maybeSingle();

    if (productError) {
      return { success: false, message: `Database error: ${productError.message}` };
    }

    if (product?.recipes?.recipe_templates?.is_active) {
      return { success: true, message: 'Product already has valid recipe' };
    }

    // Try to find a matching template
    const { data: template } = await supabase
      .from('recipe_templates')
      .select('id, name')
      .ilike('name', `%${item.product_name}%`)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (template) {
      // Create a recipe from the template
      const { data: newRecipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: item.product_name,
          store_id: storeId,
          template_id: template.id,
          is_active: true,
          serving_size: 1,
          total_cost: 0,
          cost_per_serving: 0,
          instructions: `Auto-generated recipe from template: ${template.name}`
        })
        .select('id')
        .single();

      if (recipeError) {
        return { success: false, message: `Failed to create recipe: ${recipeError.message}` };
      }

      // Link the product to the new recipe
      const { error: updateError } = await supabase
        .from('product_catalog')
        .update({ recipe_id: newRecipe.id })
        .eq('product_name', item.product_name)
        .eq('store_id', storeId);

      if (updateError) {
        return { success: false, message: `Failed to link recipe: ${updateError.message}` };
      }

      return {
        success: true,
        message: `Created recipe from template: ${template.name}`,
        repaired: true,
        recipeId: newRecipe.id
      };
    }

    // Last resort: create a basic template and recipe
    const { data: newTemplate, error: templateError } = await supabase
      .from('recipe_templates')
      .insert({
        name: item.product_name,
        category_name: 'Auto-Generated',
        description: `Auto-generated template for ${item.product_name}`,
        instructions: 'Basic auto-generated recipe. Please add proper ingredients.',
        serving_size: 1,
        is_active: true
      })
      .select('id')
      .single();

    if (templateError) {
      return { success: false, message: `Failed to create template: ${templateError.message}` };
    }

    // Create recipe from new template
    const { data: newRecipe, error: recipeError } = await supabase
      .from('recipes')
      .insert({
        name: item.product_name,
        store_id: storeId,
        template_id: newTemplate.id,
        is_active: true,
        serving_size: 1,
        total_cost: 0,
        cost_per_serving: 0,
        instructions: 'Auto-generated recipe. Please add proper ingredients.'
      })
      .select('id')
      .single();

    if (recipeError) {
      return { success: false, message: `Failed to create recipe: ${recipeError.message}` };
    }

    // Link product to recipe
    const { error: updateError } = await supabase
      .from('product_catalog')
      .update({ recipe_id: newRecipe.id })
      .eq('product_name', item.product_name)
      .eq('store_id', storeId);

    if (updateError) {
      return { success: false, message: `Failed to link recipe: ${updateError.message}` };
    }

    return {
      success: true,
      message: 'Created basic template and recipe - needs ingredients',
      repaired: true,
      recipeId: newRecipe.id
    };
  }

  /**
   * Run the database repair function
   */
  async runDatabaseRepair(): Promise<{ success: boolean; results: any[] | null; error?: string }> {
    try {
      console.log('🔧 Running database repair function...');
      
      const { data, error } = await supabase.rpc('repair_recipe_template_links');
      
      if (error) {
        console.error('❌ Database repair failed:', error);
        return { success: false, results: null, error: error.message };
      }

      const results = data || [];
      console.log('✅ Database repair completed:', results.length, 'operations');
      
      return { success: true, results };
    } catch (error) {
      console.error('🚨 Database repair error:', error);
      return {
        success: false,
        results: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get repair status summary
   */
  async getRepairStatus(): Promise<any> {
    try {
      const { data, error } = await supabase.rpc('get_recipe_repair_status');
      
      if (error) {
        console.error('❌ Failed to get repair status:', error);
        return null;
      }

      return data?.[0] || null;
    } catch (error) {
      console.error('🚨 Repair status error:', error);
      return null;
    }
  }
}

export const transactionRepairService = TransactionRepairService.getInstance();