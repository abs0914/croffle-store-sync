
import { supabase } from "@/integrations/supabase/client";
import { ProductVariation, AddOnItem, MixMatchRule, EnhancedProductCatalogItem } from "@/types/productVariations";
import { toast } from "sonner";

export const fetchProductVariations = async (productCatalogId: string): Promise<ProductVariation[]> => {
  try {
    const { data, error } = await supabase
      .from('product_catalog_variations')
      .select('*')
      .eq('product_catalog_id', productCatalogId)
      .eq('is_available', true)
      .order('display_order');

    if (error) throw error;
    
    // Type cast the data to ensure proper typing
    return (data || []).map(item => ({
      ...item,
      variation_type: item.variation_type as 'size' | 'temperature'
    }));
  } catch (error) {
    console.error('Error fetching product variations:', error);
    toast.error('Failed to fetch product variations');
    return [];
  }
};

export const fetchAddOnItems = async (): Promise<AddOnItem[]> => {
  try {
    const { data, error } = await supabase
      .from('product_addon_items')
      .select('*')
      .eq('is_available', true)
      .order('category, display_order');

    if (error) throw error;
    
    // Type cast the data to ensure proper typing
    return (data || []).map(item => ({
      ...item,
      category: item.category as 'classic_topping' | 'classic_sauce' | 'premium_topping' | 'premium_sauce' | 'biscuits'
    }));
  } catch (error) {
    console.error('Error fetching add-on items:', error);
    toast.error('Failed to fetch add-on items');
    return [];
  }
};

export const fetchMixMatchRules = async (): Promise<MixMatchRule[]> => {
  try {
    const { data, error } = await supabase
      .from('product_combo_rules')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    
    // Transform database data to match our interface
    return (data || []).map(rule => ({
      id: rule.id,
      name: rule.name,
      base_item_category: rule.base_item_category,
      mix_match_item_category: rule.combo_item_category,
      mix_match_price: rule.combo_price,
      discount_amount: rule.discount_amount,
      is_active: rule.is_active,
      created_at: rule.created_at,
      updated_at: rule.updated_at
    }));
  } catch (error) {
    console.error('Error fetching combo rules:', error);
    toast.error('Failed to fetch combo rules');
    return [];
  }
};

export const fetchEnhancedProductCatalog = async (storeId: string): Promise<EnhancedProductCatalogItem[]> => {
  try {
    const { data, error } = await supabase
      .from('product_catalog')
      .select(`
        *,
        variations:product_catalog_variations(*)
      `)
      .eq('store_id', storeId)
      .eq('is_available', true)
      .order('display_order');

    if (error) throw error;
    
    // Type cast the data to ensure proper typing for variations
    return (data || []).map(item => ({
      ...item,
      variations: (item.variations || []).map((variation: any) => ({
        ...variation,
        variation_type: variation.variation_type as 'size' | 'temperature'
      }))
    }));
  } catch (error) {
    console.error('Error fetching enhanced product catalog:', error);
    toast.error('Failed to fetch product catalog');
    return [];
  }
};

export const calculateFinalPrice = (
  basePrice: number, 
  variations: ProductVariation[], 
  addOns: AddOnItem[]
): number => {
  const variationModifier = variations.reduce((sum, variation) => sum + variation.price_modifier, 0);
  const addOnPrice = addOns.reduce((sum, addon) => sum + addon.price, 0);
  return basePrice + variationModifier + addOnPrice;
};

export const findComboDiscount = (
  items: { product: EnhancedProductCatalogItem; variations: ProductVariation[] }[],
  mixMatchRules: MixMatchRule[]
): { rule: MixMatchRule; discount: number } | null => {
  // Check for combo combinations
  for (const rule of mixMatchRules) {
    const hasBaseItem = items.some(item => 
      item.product.product_name.toLowerCase().includes(rule.base_item_category.toLowerCase())
    );
    
    const hasComboItem = items.some(item => {
      if (rule.mix_match_item_category === 'hot_drinks') {
        return item.variations.some(v => v.name === 'Hot') && 
               (item.product.product_name.includes('Coffee') || 
                item.product.product_name.includes('Latte') || 
                item.product.product_name.includes('Cappuccino'));
      }
      if (rule.mix_match_item_category === 'iced_drinks') {
        return item.variations.some(v => v.name === 'Iced') && 
               (item.product.product_name.includes('Coffee') || 
                item.product.product_name.includes('Latte') || 
                item.product.product_name.includes('Cappuccino'));
      }
      return false;
    });

    if (hasBaseItem && hasComboItem) {
      return { rule, discount: rule.discount_amount };
    }
  }
  
  return null;
};
