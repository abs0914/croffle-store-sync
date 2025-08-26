
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const fetchIngredientCategories = async (): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('category')
      .eq('is_active', true);

    if (error) throw error;

    // Get unique categories and filter out empty values
    const uniqueCategories = [...new Set(data?.map(item => item.category).filter(Boolean) || [])];
    
    // Sort alphabetically and return
    return uniqueCategories.sort();
  } catch (error) {
    console.error('Error fetching ingredient categories:', error);
    toast.error('Failed to fetch ingredient categories');
    return [];
  }
};

export const getFormattedCategoryName = (category: string): string => {
  return category
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
};
