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
 * Fetch all available addon recipes from the database
 */
export const fetchAddonRecipes = async (): Promise<AddonItem[]> => {
  try {
    console.log('Fetching addon recipes...');
    
    const { data, error } = await supabase
      .from('recipe_templates')
      .select(`
        id,
        name,
        description,
        category_name,
        is_active,
        recipe_template_ingredients (
          id,
          ingredient_name,
          quantity,
          unit,
          cost_per_unit
        )
      `)
      .eq('is_active', true)
      .eq('category_name', 'addon');

    if (error) {
      console.error('Error fetching addon recipes:', error);
      throw error;
    }

    console.log('Raw addon recipes data:', data);

    // Transform the data into AddonItem format
    const addonItems: AddonItem[] = (data || []).map(template => {
      // Calculate price based on cost with markup
      const ingredient = template.recipe_template_ingredients?.[0];
      const costPerUnit = ingredient?.cost_per_unit || 0;
      
      // Determine price based on cost (matching our uploaded data)
      let price = 6; // Default basic topping price
      if (costPerUnit >= 7) {
        price = 10; // Premium jams
      } else if (costPerUnit >= 4.5) {
        price = 8; // Premium spreads
      } else if (costPerUnit >= 3.5) {
        price = 10; // Premium toppings
      }

      return {
        id: template.id,
        name: template.name,
        description: template.description,
        price: price,
        cost_per_unit: costPerUnit,
        category: template.category_name,
        is_active: template.is_active,
        image_url: undefined
      };
    });

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
  if (addon.price === 6) {
    return 'basic_toppings';
  } else if (addon.price === 8) {
    return 'premium_spreads';
  } else if (addon.name.toLowerCase().includes('jam')) {
    return 'fruit_jams';
  } else {
    return 'premium_toppings';
  }
}

/**
 * Get display name for category
 */
function getCategoryDisplayName(categoryKey: string): string {
  const displayNames: Record<string, string> = {
    'basic_toppings': 'Basic Toppings (₱6)',
    'premium_spreads': 'Premium Spreads (₱8)',
    'premium_toppings': 'Premium Toppings (₱10)',
    'fruit_jams': 'Fruit Jams (₱10)'
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
