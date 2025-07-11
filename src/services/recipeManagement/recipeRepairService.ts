import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RepairResult {
  repaired_count: number;
  errors: string[];
}

/**
 * Repair missing product catalog entries for deployed recipes
 */
export const repairMissingProductCatalogEntries = async (): Promise<RepairResult> => {
  try {
    console.log('🔧 Starting repair of missing product catalog entries...');
    
    const { data, error } = await supabase.rpc('repair_missing_product_catalog_entries');
    
    if (error) {
      console.error('❌ Repair function error:', error);
      throw error;
    }
    
    const result = data[0] as RepairResult;
    
    console.log('✅ Repair completed:', result);
    
    if (result.repaired_count > 0) {
      toast.success(`Successfully repaired ${result.repaired_count} missing product catalog entries`);
    } else {
      toast.info('No missing product catalog entries found');
    }
    
    if (result.errors.length > 0) {
      console.warn('⚠️ Repair errors:', result.errors);
      toast.warning(`${result.errors.length} items had errors during repair`);
    }
    
    return result;
  } catch (error) {
    console.error('❌ Error running repair function:', error);
    toast.error('Failed to repair missing product catalog entries');
    return { repaired_count: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] };
  }
};

/**
 * Check how many recipes are missing product catalog entries
 */
export const checkMissingProductCatalogEntries = async (): Promise<number> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        store_id,
        product_catalog!left(id)
      `)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .is('product_catalog.id', null);
    
    if (error) throw error;
    
    return data?.length || 0;
  } catch (error) {
    console.error('Error checking missing product catalog entries:', error);
    return 0;
  }
};

/**
 * Get list of recipes missing product catalog entries for inspection
 */
export const getMissingProductCatalogEntries = async () => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        id,
        name,
        store_id,
        total_cost,
        suggested_price,
        created_at,
        stores!inner(name)
      `)
      .eq('is_active', true)
      .eq('approval_status', 'approved')
      .not('id', 'in', `(
        SELECT recipe_id 
        FROM product_catalog 
        WHERE recipe_id IS NOT NULL
      )`);
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error('Error getting missing product catalog entries:', error);
    return [];
  }
};