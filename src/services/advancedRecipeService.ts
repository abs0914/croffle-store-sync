import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type {
  RecipeIngredientGroup,
  RecipePricingMatrix,
  AddonCategory,
  ComboPricingRule,
  PricingCalculationInput,
  PricingCalculationResult
} from '@/types/advancedRecipe';

// Ingredient Groups Management
export const fetchIngredientGroups = async (templateId: string): Promise<RecipeIngredientGroup[]> => {
  try {
    const { data, error } = await supabase
      .from('recipe_ingredient_groups')
      .select('*')
      .eq('recipe_template_id', templateId)
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      selection_type: item.selection_type as RecipeIngredientGroup['selection_type']
    }));
  } catch (error) {
    console.error('Error fetching ingredient groups:', error);
    return [];
  }
};

export const createIngredientGroup = async (
  templateId: string,
  groupData: Omit<RecipeIngredientGroup, 'id' | 'recipe_template_id' | 'created_at' | 'updated_at'>
): Promise<RecipeIngredientGroup | null> => {
  try {
    const { data, error } = await supabase
      .from('recipe_ingredient_groups')
      .insert({
        recipe_template_id: templateId,
        ...groupData
      })
      .select()
      .single();

    if (error) throw error;
    return data ? {
      ...data,
      selection_type: data.selection_type as RecipeIngredientGroup['selection_type']
    } : null;
  } catch (error) {
    console.error('Error creating ingredient group:', error);
    toast.error('Failed to create ingredient group');
    return null;
  }
};

// Pricing Matrix Management
export const fetchPricingMatrix = async (templateId: string): Promise<RecipePricingMatrix[]> => {
  try {
    const { data, error } = await supabase
      .from('recipe_pricing_matrix')
      .select('*')
      .eq('recipe_template_id', templateId)
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching pricing matrix:', error);
    return [];
  }
};

export const upsertPricingMatrix = async (
  templateId: string,
  pricingData: Omit<RecipePricingMatrix, 'id' | 'recipe_template_id' | 'created_at' | 'updated_at'>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipe_pricing_matrix')
      .upsert({
        recipe_template_id: templateId,
        ...pricingData
      }, {
        onConflict: 'recipe_template_id,size_category,temperature_category'
      });

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error upserting pricing matrix:', error);
    toast.error('Failed to update pricing matrix');
    return false;
  }
};

// Addon Categories Management
export const fetchAddonCategories = async (): Promise<AddonCategory[]> => {
  try {
    const { data, error } = await supabase
      .from('addon_categories')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (error) throw error;
    return (data || []).map(item => ({
      ...item,
      category_type: item.category_type as AddonCategory['category_type']
    }));
  } catch (error) {
    console.error('Error fetching addon categories:', error);
    return [];
  }
};

export const fetchAddonItems = async (categoryId?: string) => {
  try {
    let query = supabase
      .from('product_addon_items')
      .select('*')
      .eq('is_available', true)
      .order('display_order');

    if (categoryId) {
      query = query.eq('addon_category_id', categoryId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching addon items:', error);
    return [];
  }
};

// Combo Pricing Rules Management
export const fetchComboPricingRules = async (): Promise<ComboPricingRule[]> => {
  try {
    const { data, error } = await supabase
      .from('combo_pricing_rules')
      .select('*')
      .eq('is_active', true)
      .order('priority', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching combo pricing rules:', error);
    return [];
  }
};

export const createComboPricingRule = async (
  ruleData: Omit<ComboPricingRule, 'id' | 'created_at' | 'updated_at'>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('combo_pricing_rules')
      .insert(ruleData);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error creating combo pricing rule:', error);
    toast.error('Failed to create combo pricing rule');
    return false;
  }
};

// Advanced Pricing Calculation
export const calculateAdvancedPrice = async (
  input: PricingCalculationInput
): Promise<PricingCalculationResult> => {
  try {
    // Fetch relevant pricing data
    const [addonItems, comboRules] = await Promise.all([
      fetchAddonItems(),
      fetchComboPricingRules()
    ]);

    // Calculate base price from combo rules
    let basePrice = 0;
    let comboDiscount = 0;

    // Find matching combo rule
    const matchingCombo = comboRules.find(rule => 
      rule.base_category === input.base_category &&
      input.combo_items?.includes(rule.combo_category)
    );

    if (matchingCombo) {
      basePrice = matchingCombo.combo_price;
      comboDiscount = matchingCombo.discount_amount;
    }

    // Calculate addon total
    const selectedAddons = addonItems.filter(addon => 
      input.selected_addons.includes(addon.id)
    );
    
    const addonTotal = selectedAddons.reduce((sum, addon) => sum + addon.price, 0);

    // Final calculation
    const finalPrice = basePrice + addonTotal - comboDiscount;

    return {
      base_price: basePrice,
      addon_total: addonTotal,
      combo_discount: comboDiscount,
      final_price: Math.max(0, finalPrice), // Ensure non-negative
      breakdown: {
        base: basePrice,
        addons: selectedAddons.map(addon => ({
          name: addon.name,
          price: addon.price
        })),
        combo_savings: comboDiscount
      }
    };
  } catch (error) {
    console.error('Error calculating advanced price:', error);
    return {
      base_price: 0,
      addon_total: 0,
      combo_discount: 0,
      final_price: 0,
      breakdown: {
        base: 0,
        addons: [],
        combo_savings: 0
      }
    };
  }
};

// Validation helpers
export const validatePricingMatrix = (matrix: RecipePricingMatrix[]): string[] => {
  const errors: string[] = [];
  
  // Check for duplicate combinations
  const combinations = new Set();
  matrix.forEach(entry => {
    const key = `${entry.size_category}-${entry.temperature_category}`;
    if (combinations.has(key)) {
      errors.push(`Duplicate pricing entry for ${entry.size_category} ${entry.temperature_category}`);
    }
    combinations.add(key);
  });

  // Check for negative prices
  matrix.forEach(entry => {
    if (entry.base_price < 0) {
      errors.push(`Negative base price for ${entry.size_category} ${entry.temperature_category}`);
    }
  });

  return errors;
};

export const validateIngredientGroup = (group: RecipeIngredientGroup): string[] => {
  const errors: string[] = [];

  if (!group.name.trim()) {
    errors.push('Group name is required');
  }

  if (group.min_selections < 0) {
    errors.push('Minimum selections cannot be negative');
  }

  if (group.max_selections && group.max_selections < group.min_selections) {
    errors.push('Maximum selections cannot be less than minimum selections');
  }

  return errors;
};