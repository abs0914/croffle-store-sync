import { supabase } from '@/integrations/supabase/client';
import { ComboRule } from '@/types/productVariations';

/**
 * Fetch combo pricing rules from the database
 */
export const fetchComboRules = async (): Promise<ComboRule[]> => {
  try {
    console.log('Fetching combo pricing rules...');
    
    const { data, error } = await supabase
      .from('combo_pricing_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: true });

    if (error) {
      console.error('Error fetching combo rules:', error);
      throw error;
    }

    console.log('Fetched combo rules:', data);
    
    // Transform to match our interface
    const comboRules: ComboRule[] = (data || []).map(rule => ({
      id: rule.id,
      name: rule.name,
      base_item_category: rule.base_category,
      combo_item_category: rule.combo_category,
      combo_price: rule.combo_price,
      discount_amount: rule.discount_amount || 0,
      is_active: rule.is_active,
      created_at: rule.created_at,
      updated_at: rule.updated_at
    }));

    return comboRules;

  } catch (error) {
    console.error('Error in fetchComboRules:', error);
    return [];
  }
};

/**
 * Get applicable combo rules for a specific product category
 */
export const getApplicableComboRules = (
  productCategory: string, 
  comboRules: ComboRule[]
): ComboRule[] => {
  return comboRules.filter(rule => 
    rule.is_active && 
    (rule.base_item_category === productCategory ||
     rule.base_item_category.toLowerCase().includes(productCategory.toLowerCase()))
  );
};

/**
 * Calculate combo price based on rules and selections
 */
export const calculateComboPrice = (
  baseCategory: string,
  selectedItems: { category: string; price: number }[],
  comboRules: ComboRule[]
): number => {
  const applicableRules = getApplicableComboRules(baseCategory, comboRules);
  
  if (applicableRules.length === 0) {
    // No combo rules, return sum of individual prices
    return selectedItems.reduce((sum, item) => sum + item.price, 0);
  }
  
  // Use the first applicable rule (highest priority)
  const rule = applicableRules[0];
  
  // If combo has a fixed price, use that
  if (rule.combo_price > 0) {
    return rule.combo_price;
  }
  
  // Otherwise, apply discount to individual prices
  const totalIndividualPrice = selectedItems.reduce((sum, item) => sum + item.price, 0);
  return Math.max(0, totalIndividualPrice - rule.discount_amount);
};

/**
 * Validate combo selection against rules
 */
export const validateComboSelection = (
  baseCategory: string,
  selectedItems: { category: string; quantity: number }[],
  comboRules: ComboRule[]
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const applicableRules = getApplicableComboRules(baseCategory, comboRules);
  
  if (applicableRules.length === 0) {
    return { isValid: true, errors: [] };
  }
  
  // Check minimum requirements based on combo rules
  for (const rule of applicableRules) {
    const requiredCategory = rule.combo_item_category;
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
