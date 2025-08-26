
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MenuRecipeTemplate {
  id?: string;
  name: string;
  category: 'croffles' | 'drinks' | 'add-ons' | 'combos';
  subcategory?: string;
  base_price: number;
  variations?: {
    size?: { name: string; price: number; is_default: boolean }[];
    temperature?: { name: string; price_modifier: number; is_default: boolean }[];
  };
  ingredients: {
    commissary_item_name: string;
    quantity: number;
    unit: string;
    cost_per_unit?: number;
  }[];
  description?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
}

// Croffle menu data
export const CROFFLE_RECIPES: Partial<MenuRecipeTemplate>[] = [
  // Classic Croffles (₱125)
  { name: 'Tiramisu Croffle', category: 'croffles', subcategory: 'classic', base_price: 125 },
  { name: 'Choco Nut Croffle', category: 'croffles', subcategory: 'classic', base_price: 125 },
  { name: 'Caramel Delight Croffle', category: 'croffles', subcategory: 'classic', base_price: 125 },
  { name: 'Choco Marshmallows Croffle', category: 'croffles', subcategory: 'classic', base_price: 125 },
  
  // Premium Croffles (₱125)
  { name: 'Biscoff Croffle', category: 'croffles', subcategory: 'premium', base_price: 125 },
  { name: 'Nutella Croffle', category: 'croffles', subcategory: 'premium', base_price: 125 },
  { name: 'Kitkat Croffle', category: 'croffles', subcategory: 'premium', base_price: 125 },
  { name: 'Cookies & Cream Croffle', category: 'croffles', subcategory: 'premium', base_price: 125 },
  { name: 'Choco Overload Croffle', category: 'croffles', subcategory: 'premium', base_price: 125 },
  { name: 'Matcha Croffle', category: 'croffles', subcategory: 'premium', base_price: 125 },
  { name: 'Dark Chocolate Croffle', category: 'croffles', subcategory: 'premium', base_price: 125 },
  
  // Fruity Croffles (₱125)
  { name: 'Strawberry Croffle', category: 'croffles', subcategory: 'fruity', base_price: 125 },
  { name: 'Mango Croffle', category: 'croffles', subcategory: 'fruity', base_price: 125 },
  { name: 'Blueberry Croffle', category: 'croffles', subcategory: 'fruity', base_price: 125 },
  
  // Other Varieties
  { name: 'Classic Glaze Croffle', category: 'croffles', subcategory: 'varieties', base_price: 79 },
  { name: 'Mini Croffle', category: 'croffles', subcategory: 'varieties', base_price: 65 },
  { name: 'Croffle Overload', category: 'croffles', subcategory: 'varieties', base_price: 99 },
];

// Drink menu data with variations
export const DRINK_RECIPES: Partial<MenuRecipeTemplate>[] = [
  // Espresso Drinks
  {
    name: 'Americano',
    category: 'drinks',
    subcategory: 'espresso',
    base_price: 65,
    variations: {
      temperature: [
        { name: 'Hot', price_modifier: 0, is_default: true },
        { name: 'Iced', price_modifier: 5, is_default: false }
      ]
    }
  },
  {
    name: 'Cappuccino',
    category: 'drinks',
    subcategory: 'espresso',
    base_price: 75,
    variations: {
      temperature: [
        { name: 'Hot', price_modifier: 0, is_default: true },
        { name: 'Iced', price_modifier: 5, is_default: false }
      ]
    }
  },
  {
    name: 'Cafe Latte',
    category: 'drinks',
    subcategory: 'espresso',
    base_price: 75,
    variations: {
      temperature: [
        { name: 'Hot', price_modifier: 0, is_default: true },
        { name: 'Iced', price_modifier: 5, is_default: false }
      ]
    }
  },
  {
    name: 'Cafe Mocha',
    category: 'drinks',
    subcategory: 'espresso',
    base_price: 80,
    variations: {
      temperature: [
        { name: 'Hot', price_modifier: 0, is_default: true },
        { name: 'Iced', price_modifier: 5, is_default: false }
      ]
    }
  },
  {
    name: 'Caramel Latte',
    category: 'drinks',
    subcategory: 'espresso',
    base_price: 80,
    variations: {
      temperature: [
        { name: 'Hot', price_modifier: 0, is_default: true },
        { name: 'Iced', price_modifier: 5, is_default: false }
      ]
    }
  },
];

// Combo recipes
export const COMBO_RECIPES: Partial<MenuRecipeTemplate>[] = [
  { name: 'Mini Croffle + Any Hot Espresso', category: 'combos', base_price: 110 },
  { name: 'Mini Croffle + Any Iced Espresso', category: 'combos', base_price: 115 },
  { name: 'Glaze Croffle + Any Hot Espresso', category: 'combos', base_price: 125 },
  { name: 'Glaze Croffle + Any Iced Espresso', category: 'combos', base_price: 130 },
  { name: 'Regular Croffle + Any Hot Espresso', category: 'combos', base_price: 170 },
  { name: 'Regular Croffle + Any Iced Espresso', category: 'combos', base_price: 175 },
];

export const createBulkRecipeTemplates = async (templates: Partial<MenuRecipeTemplate>[]) => {
  try {
    // Get the current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError) {
      console.error('Error getting authenticated user:', authError);
      toast.error('Authentication error. Please log in again.');
      return [];
    }

    if (!user) {
      toast.error('You must be logged in to create recipe templates');
      return [];
    }

    const results = [];
    
    for (const template of templates) {
      const { data, error } = await supabase
        .from('recipe_templates')
        .insert({
          name: template.name,
          category_name: `${template.category}_${template.subcategory || 'default'}`,
          description: template.description || `${template.name} recipe`,
          instructions: template.instructions || 'Standard preparation method',
          yield_quantity: template.yield_quantity || 1,
          serving_size: template.serving_size || 1,
          version: 1,
          is_active: true,
          created_by: user.id // Use the authenticated user's UUID instead of 'system'
        })
        .select()
        .single();

      if (error) {
        console.error(`Error creating template for ${template.name}:`, error);
        continue;
      }

      results.push(data);
    }

    toast.success(`Created ${results.length} recipe templates successfully`);
    return results;
  } catch (error: any) {
    console.error('Error creating bulk recipe templates:', error);
    toast.error('Failed to create recipe templates');
    return [];
  }
};
