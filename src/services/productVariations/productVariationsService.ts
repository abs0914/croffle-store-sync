
import { supabase } from "@/integrations/supabase/client";
import { ProductVariation, AddOnItem, ComboRule, EnhancedProductCatalogItem } from "@/types/productVariations";
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
    return data || [];
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
    return data || [];
  } catch (error) {
    console.error('Error fetching add-on items:', error);
    toast.error('Failed to fetch add-on items');
    return [];
  }
};

export const fetchComboRules = async (): Promise<ComboRule[]> => {
  try {
    const { data, error } = await supabase
      .from('product_combo_rules')
      .select('*')
      .eq('is_active', true);

    if (error) throw error;
    return data || [];
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
    return data || [];
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
  comboRules: ComboRule[]
): { rule: ComboRule; discount: number } | null => {
  // Check for combo combinations
  for (const rule of comboRules) {
    const hasBaseItem = items.some(item => 
      item.product.product_name.toLowerCase().includes(rule.base_item_category.toLowerCase())
    );
    
    const hasComboItem = items.some(item => {
      if (rule.combo_item_category === 'hot_drinks') {
        return item.variations.some(v => v.name === 'Hot') && 
               (item.product.product_name.includes('Coffee') || 
                item.product.product_name.includes('Latte') || 
                item.product.product_name.includes('Cappuccino'));
      }
      if (rule.combo_item_category === 'iced_drinks') {
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
