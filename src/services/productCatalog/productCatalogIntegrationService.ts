
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ProductCatalogItem {
  id?: string;
  product_name: string;
  description?: string;
  price: number;
  store_id: string;
  category: 'croffles' | 'drinks' | 'add-ons' | 'combos';
  subcategory?: string;
  variations?: ProductVariation[];
  recipe_id?: string;
  is_available: boolean;
  display_order?: number;
  image_url?: string;
}

export interface ProductVariation {
  id?: string;
  name: string;
  type: 'size' | 'temperature';
  price_modifier: number;
  is_default: boolean;
  is_available: boolean;
}

export interface AddOnItem {
  id?: string;
  name: string;
  category: 'classic_topping' | 'classic_sauce' | 'premium_topping' | 'premium_sauce' | 'biscuits';
  price: number;
  is_available: boolean;
}

// Size variations with exact pricing
export const SIZE_VARIATIONS: ProductVariation[] = [
  { name: 'Mini', type: 'size', price_modifier: -60, is_default: false, is_available: true }, // ₱65 (₱125 - ₱60)
  { name: 'Regular', type: 'size', price_modifier: 0, is_default: true, is_available: true }, // ₱125 (base)
  { name: 'Overload', type: 'size', price_modifier: -26, is_default: false, is_available: true } // ₱99 (₱125 - ₱26)
];

// Temperature variations
export const TEMPERATURE_VARIATIONS: ProductVariation[] = [
  { name: 'Hot', type: 'temperature', price_modifier: 0, is_default: true, is_available: true },
  { name: 'Iced', type: 'temperature', price_modifier: 5, is_default: false, is_available: true }
];

// Add-on items with exact pricing
export const ADD_ON_ITEMS: AddOnItem[] = [
  // Classic Toppings (₱6)
  { name: 'Colored Sprinkles', category: 'classic_topping', price: 6, is_available: true },
  { name: 'Marshmallow', category: 'classic_topping', price: 6, is_available: true },
  { name: 'Chocolate Flakes', category: 'classic_topping', price: 6, is_available: true },
  { name: 'Peanuts', category: 'classic_topping', price: 6, is_available: true },
  
  // Classic Sauces (₱6)
  { name: 'Caramel Sauce', category: 'classic_sauce', price: 6, is_available: true },
  { name: 'Chocolate Sauce', category: 'classic_sauce', price: 6, is_available: true },
  { name: 'Tiramisu Sauce', category: 'classic_sauce', price: 6, is_available: true },
  
  // Premium Toppings (₱10)
  { name: 'Biscoff Topping', category: 'premium_topping', price: 10, is_available: true },
  { name: 'Oreo Topping', category: 'premium_topping', price: 10, is_available: true },
  { name: 'Strawberry Topping', category: 'premium_topping', price: 10, is_available: true },
  { name: 'Mango Topping', category: 'premium_topping', price: 10, is_available: true },
  { name: 'Blueberry Topping', category: 'premium_topping', price: 10, is_available: true },
  { name: 'Nutella Topping', category: 'premium_topping', price: 10, is_available: true },
  
  // Premium Sauces (₱8)
  { name: 'Nutella Sauce', category: 'premium_sauce', price: 8, is_available: true },
  { name: 'Dark Chocolate Sauce', category: 'premium_sauce', price: 8, is_available: true },
  
  // Biscuits (₱10)
  { name: 'Biscoff Biscuit', category: 'biscuits', price: 10, is_available: true },
  { name: 'Oreo Biscuit', category: 'biscuits', price: 10, is_available: true },
  { name: 'Kitkat Biscuit', category: 'biscuits', price: 10, is_available: true },
];

export const deployRecipeToProductCatalog = async (
  recipeId: string,
  storeId: string,
  productData: Partial<ProductCatalogItem>
) => {
  try {
    // Create main product catalog entry
    const { data: product, error: productError } = await supabase
      .from('product_catalog')
      .insert({
        product_name: productData.product_name,
        description: productData.description,
        price: productData.price,
        store_id: storeId,
        recipe_id: recipeId,
        is_available: true,
        display_order: productData.display_order || 0
      })
      .select()
      .single();

    if (productError) throw productError;

    toast.success(`Product ${productData.product_name} deployed successfully`);
    return product;
  } catch (error: any) {
    console.error('Error deploying recipe to product catalog:', error);
    toast.error('Failed to deploy recipe to product catalog');
    return null;
  }
};

export const createAddOnCatalog = async (storeId: string) => {
  try {
    const addOnProducts = ADD_ON_ITEMS.map(addon => ({
      product_name: addon.name,
      description: `${addon.category.replace('_', ' ')} add-on`,
      price: addon.price,
      store_id: storeId,
      is_available: addon.is_available,
      display_order: 999 // Put add-ons at the end
    }));

    const { data, error } = await supabase
      .from('product_catalog')
      .insert(addOnProducts)
      .select();

    if (error) throw error;

    toast.success(`Created ${data.length} add-on items`);
    return data;
  } catch (error: any) {
    console.error('Error creating add-on catalog:', error);
    toast.error('Failed to create add-on catalog');
    return [];
  }
};

export const calculateVariationPrice = (
  basePrice: number,
  variations: ProductVariation[]
): number => {
  const totalModifier = variations.reduce((sum, variation) => sum + variation.price_modifier, 0);
  return Math.max(0, basePrice + totalModifier);
};

export const getAvailableAddOns = async (category?: string) => {
  try {
    let query = supabase
      .from('product_catalog')
      .select('*')
      .like('description', '%add-on%')
      .eq('is_available', true);

    if (category) {
      query = query.like('description', `%${category}%`);
    }

    const { data, error } = await query.order('price', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('Error fetching available add-ons:', error);
    return [];
  }
};
