import { supabase } from '@/integrations/supabase/client';

export interface AddonItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  cost_per_unit: number;
  category: string;
  is_active: boolean;
  image_url?: string;
}

export interface SelectedAddon {
  addon: AddonItem;
  quantity: number;
}

export interface AddonCategory {
  name: string;
  display_name: string;
  items: AddonItem[];
}

/**
 * Fetch all available addon items from the database
 */
export const fetchAddonRecipes = async (storeId?: string): Promise<AddonItem[]> => {
  try {
    console.log('Fetching addon items from product_catalog for store:', storeId);

    // Build query to fetch products from addon categories
    let query = supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        price,
        is_available,
        category_id,
        store_id,
        categories!inner(name)
      `)
      .eq('is_available', true)
      .order('product_name');

    // Filter by store if provided
    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data: allProducts, error } = await query;

    if (error) {
      console.error('Error fetching products:', error);
      throw error;
    }

    console.log('Raw products data:', allProducts?.length || 0, 'products');

    // Filter products that are in addon categories
    const addonProducts = (allProducts || []).filter(product => {
      const categoryName = product.categories?.name?.toLowerCase() || '';
      return categoryName.includes('addon') || categoryName.includes('add-on');
    });

    console.log('Filtered addon products:', addonProducts.length, 'addon products');

    // Transform the data into AddonItem format and ensure uniqueness by product_name
    const uniqueAddonItems = new Map<string, AddonItem>();
    
    addonProducts.forEach(product => {
      const normalizedName = product.product_name.toLowerCase().trim();
      
      // Only add if not already exists (prevents duplicates by product name)
      if (!uniqueAddonItems.has(normalizedName)) {
        uniqueAddonItems.set(normalizedName, {
          id: product.id,
          name: product.product_name,
          description: undefined,
          price: product.price || 6, // Default price if not set
          cost_per_unit: (product.price || 6) * 0.6, // Estimate cost as 60% of price
          category: product.categories?.name || 'addon',
          is_active: product.is_available,
          image_url: undefined
        });
      }
    });

    const addonItems: AddonItem[] = Array.from(uniqueAddonItems.values());

    console.log('Processed addon items:', addonItems);
    return addonItems;

  } catch (error) {
    console.error('Error in fetchAddonRecipes:', error);
    return [];
  }
};

/**
 * Group addons by category for better organization
 */
export const groupAddonsByCategory = (addons: AddonItem[]): AddonCategory[] => {
  const categories = new Map<string, AddonItem[]>();

  addons.forEach(addon => {
    const categoryKey = getCategoryKey(addon);
    if (!categories.has(categoryKey)) {
      categories.set(categoryKey, []);
    }
    categories.get(categoryKey)!.push(addon);
  });

  return Array.from(categories.entries()).map(([key, items]) => ({
    name: key,
    display_name: getCategoryDisplayName(key),
    items: items.sort((a, b) => a.name.localeCompare(b.name))
  }));
};

/**
 * Get category key based on addon properties
 */
function getCategoryKey(addon: AddonItem): string {
  // Use the actual category from the database
  const categoryName = addon.category.toLowerCase();

  // Normalize category names
  if (categoryName.includes('add-on') || categoryName.includes('addon')) {
    return 'addons';
  } else if (categoryName.includes('topping')) {
    return 'toppings';
  } else if (categoryName.includes('sauce')) {
    return 'sauces';
  } else if (categoryName.includes('biscuit')) {
    return 'biscuits';
  } else {
    return 'other';
  }
}

/**
 * Get display name for category
 */
function getCategoryDisplayName(categoryKey: string): string {
  const displayNames: Record<string, string> = {
    'addons': 'Add-ons',
    'toppings': 'Toppings',
    'sauces': 'Sauces',
    'biscuits': 'Biscuits',
    'other': 'Other'
  };

  return displayNames[categoryKey] || categoryKey;
}

/**
 * Calculate total addon cost for selected addons
 */
export const calculateAddonTotal = (selectedAddons: SelectedAddon[]): number => {
  return selectedAddons.reduce((total, { addon, quantity }) => {
    return total + (addon.price * quantity);
  }, 0);
};

/**
 * Create addon cart item for integration with existing cart system
 */
export const createAddonCartItem = (addon: AddonItem, quantity: number = 1) => {
  return {
    id: `addon-${addon.id}-${Date.now()}`,
    productId: addon.id,
    product: {
      id: addon.id,
      name: addon.name,
      price: addon.price,
      is_active: addon.is_active,
      stock_quantity: 100, // Assume available
      category: addon.category,
      description: addon.description
    },
    quantity,
    price: addon.price,
    addon_info: {
      is_addon: true,
      cost_per_unit: addon.cost_per_unit,
      category: addon.category
    }
  };
};

/**
 * Validate addon selection
 */
export const validateAddonSelection = (selectedAddons: SelectedAddon[]): {
  isValid: boolean;
  errors: string[];
} => {
  const errors: string[] = [];

  // Check for valid quantities
  selectedAddons.forEach(({ addon, quantity }) => {
    if (quantity <= 0) {
      errors.push(`Invalid quantity for ${addon.name}`);
    }
    if (quantity > 10) {
      errors.push(`Maximum 10 ${addon.name} allowed`);
    }
  });

  // Check for reasonable total
  const total = calculateAddonTotal(selectedAddons);
  if (total > 500) {
    errors.push('Total addon cost exceeds reasonable limit');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Get recommended addons based on product type
 */
export const getRecommendedAddons = (
  productName: string, 
  allAddons: AddonItem[]
): AddonItem[] => {
  const productLower = productName.toLowerCase();
  
  // Recommend based on product type
  if (productLower.includes('croffle')) {
    // For croffles, recommend all categories but prioritize basic toppings
    return allAddons
      .filter(addon => addon.is_active)
      .sort((a, b) => {
        // Prioritize basic toppings (₱6 items)
        if (a.price === 6 && b.price !== 6) return -1;
        if (b.price === 6 && a.price !== 6) return 1;
        return a.name.localeCompare(b.name);
      })
      .slice(0, 8); // Show top 8 recommendations
  }
  
  if (productLower.includes('coffee') || productLower.includes('latte') || productLower.includes('americano')) {
    // For coffee drinks, recommend syrups and sweet addons
    return allAddons
      .filter(addon => 
        addon.is_active && 
        (addon.name.toLowerCase().includes('caramel') ||
         addon.name.toLowerCase().includes('chocolate') ||
         addon.name.toLowerCase().includes('nutella'))
      )
      .slice(0, 4);
  }
  
  // Default: return popular addons
  return allAddons
    .filter(addon => addon.is_active)
    .sort((a, b) => a.price - b.price) // Sort by price (cheapest first)
    .slice(0, 6);
};

/**
 * Format addon display name with quantity
 */
export const formatAddonDisplayName = (addon: AddonItem, quantity: number): string => {
  if (quantity === 1) {
    return addon.name;
  }
  return `${addon.name} (${quantity}x)`;
};
