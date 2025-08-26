import { supabase } from '@/integrations/supabase/client';
import { MixMatchRule } from '@/types/productVariations';

/**
 * Fetch mix & match pricing rules from the database
 */
export const fetchMixMatchRules = async (): Promise<MixMatchRule[]> => {
  try {
    console.log('Fetching mix & match pricing rules...');
    
    const { data, error } = await supabase
      .from('combo_pricing_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching mix & match rules:', error);
      throw error;
    }

    console.log('Fetched mix & match rules:', data);
    
    // Transform to match our interface
    const mixMatchRules: MixMatchRule[] = (data || []).map(rule => ({
      id: rule.id,
      name: rule.name,
      base_item_category: rule.base_category,
      mix_match_item_category: rule.combo_category,
      mix_match_price: rule.combo_price,
      discount_amount: rule.discount_amount || 0,
      is_active: rule.is_active,
      created_at: rule.created_at,
      updated_at: rule.updated_at
    }));

    return mixMatchRules;

  } catch (error) {
    console.error('Error in fetchMixMatchRules:', error);
    return [];
  }
};

/**
 * Get applicable mix & match rules for a specific product category
 */
export const getApplicableMixMatchRules = (
  productCategory: string, 
  mixMatchRules: MixMatchRule[]
): MixMatchRule[] => {
  return mixMatchRules.filter(rule => 
    rule.is_active && 
    (rule.base_item_category === productCategory ||
     rule.base_item_category.toLowerCase().includes(productCategory.toLowerCase()))
  );
};

/**
 * Calculate mix & match price based on rules and selections
 */
export const calculateMixMatchPrice = (
  baseCategory: string,
  selectedItems: { category: string; price: number }[],
  mixMatchRules: MixMatchRule[]
): number => {
  const applicableRules = getApplicableMixMatchRules(baseCategory, mixMatchRules);
  
  if (applicableRules.length === 0) {
    // No mix & match rules, return sum of individual prices
    return selectedItems.reduce((sum, item) => sum + item.price, 0);
  }
  
  // Use the first applicable rule (highest priority)
  const rule = applicableRules[0];
  
  // If mix & match has a fixed price, use that
  if (rule.mix_match_price > 0) {
    return rule.mix_match_price;
  }
  
  // Otherwise, apply discount to individual prices
  const totalIndividualPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);
  return Math.max(0, totalIndividualPrice - rule.discount_amount);
};

/**
 * Validate mix & match selection against rules
 */
export const validateMixMatchSelection = (
  baseCategory: string,
  selectedItems: { category: string; quantity: number }[],
  mixMatchRules: MixMatchRule[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const applicableRules = getApplicableMixMatchRules(baseCategory, mixMatchRules);
  
  if (applicableRules.length === 0) {
    return { isValid: true, errors: [] };
  }
  
  // Check minimum requirements based on mix & match rules
  for (const rule of applicableRules) {
    const requiredCategory = rule.mix_match_item_category;
    const hasRequiredItems = selectedItems.some(item => 
      item.category === requiredCategory && item.quantity > 0
    );
    
    if (!hasRequiredItems) {
      errors.push(`Please select items from ${requiredCategory} category`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};
