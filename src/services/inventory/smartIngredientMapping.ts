
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface IngredientMapping {
  recipe_template_name: string;
  commissary_item_name: string;
  store_inventory_item: string;
  quantity_per_serving: number;
  unit: string;
}

export interface MenuItemIngredients {
  [key: string]: IngredientMapping[];
}

// Smart ingredient mapping for specific menu items
export const MENU_INGREDIENT_MAPPINGS: MenuItemIngredients = {
  // Classic Croffles
  'Tiramisu Croffle': [
    { recipe_template_name: 'Tiramisu Croffle', commissary_item_name: 'Croffle Base', store_inventory_item: 'Croffle Base', quantity_per_serving: 1, unit: 'piece' },
    { recipe_template_name: 'Tiramisu Croffle', commissary_item_name: 'Tiramisu Sauce', store_inventory_item: 'Tiramisu Sauce', quantity_per_serving: 30, unit: 'ml' },
    { recipe_template_name: 'Tiramisu Croffle', commissary_item_name: 'Whipped Cream', store_inventory_item: 'Whipped Cream', quantity_per_serving: 25, unit: 'ml' },
    { recipe_template_name: 'Tiramisu Croffle', commissary_item_name: 'Cocoa Powder', store_inventory_item: 'Cocoa Powder', quantity_per_serving: 2, unit: 'g' }
  ],
  'Choco Nut Croffle': [
    { recipe_template_name: 'Choco Nut Croffle', commissary_item_name: 'Croffle Base', store_inventory_item: 'Croffle Base', quantity_per_serving: 1, unit: 'piece' },
    { recipe_template_name: 'Choco Nut Croffle', commissary_item_name: 'Chocolate Sauce', store_inventory_item: 'Chocolate Sauce', quantity_per_serving: 25, unit: 'ml' },
    { recipe_template_name: 'Choco Nut Croffle', commissary_item_name: 'Peanuts', store_inventory_item: 'Peanuts', quantity_per_serving: 15, unit: 'g' },
    { recipe_template_name: 'Choco Nut Croffle', commissary_item_name: 'Whipped Cream', store_inventory_item: 'Whipped Cream', quantity_per_serving: 20, unit: 'ml' }
  ],
  'Caramel Delight Croffle': [
    { recipe_template_name: 'Caramel Delight Croffle', commissary_item_name: 'Croffle Base', store_inventory_item: 'Croffle Base', quantity_per_serving: 1, unit: 'piece' },
    { recipe_template_name: 'Caramel Delight Croffle', commissary_item_name: 'Caramel Sauce', store_inventory_item: 'Caramel Sauce', quantity_per_serving: 30, unit: 'ml' },
    { recipe_template_name: 'Caramel Delight Croffle', commissary_item_name: 'Whipped Cream', store_inventory_item: 'Whipped Cream', quantity_per_serving: 25, unit: 'ml' }
  ],
  
  // Premium Croffles
  'Biscoff Croffle': [
    { recipe_template_name: 'Biscoff Croffle', commissary_item_name: 'Croffle Base', store_inventory_item: 'Croffle Base', quantity_per_serving: 1, unit: 'piece' },
    { recipe_template_name: 'Biscoff Croffle', commissary_item_name: 'Biscoff Spread', store_inventory_item: 'Biscoff Spread', quantity_per_serving: 25, unit: 'g' },
    { recipe_template_name: 'Biscoff Croffle', commissary_item_name: 'Biscoff Biscuit', store_inventory_item: 'Biscoff Biscuit', quantity_per_serving: 2, unit: 'piece' },
    { recipe_template_name: 'Biscoff Croffle', commissary_item_name: 'Whipped Cream', store_inventory_item: 'Whipped Cream', quantity_per_serving: 20, unit: 'ml' }
  ],
  'Nutella Croffle': [
    { recipe_template_name: 'Nutella Croffle', commissary_item_name: 'Croffle Base', store_inventory_item: 'Croffle Base', quantity_per_serving: 1, unit: 'piece' },
    { recipe_template_name: 'Nutella Croffle', commissary_item_name: 'Nutella', store_inventory_item: 'Nutella', quantity_per_serving: 30, unit: 'g' },
    { recipe_template_name: 'Nutella Croffle', commissary_item_name: 'Whipped Cream', store_inventory_item: 'Whipped Cream', quantity_per_serving: 20, unit: 'ml' }
  ],
  
  // Drinks
  'Americano': [
    { recipe_template_name: 'Americano', commissary_item_name: 'Espresso Beans', store_inventory_item: 'Espresso Beans', quantity_per_serving: 18, unit: 'g' },
    { recipe_template_name: 'Americano', commissary_item_name: 'Water', store_inventory_item: 'Water', quantity_per_serving: 150, unit: 'ml' }
  ],
  'Cappuccino': [
    { recipe_template_name: 'Cappuccino', commissary_item_name: 'Espresso Beans', store_inventory_item: 'Espresso Beans', quantity_per_serving: 18, unit: 'g' },
    { recipe_template_name: 'Cappuccino', commissary_item_name: 'Milk', store_inventory_item: 'Milk', quantity_per_serving: 150, unit: 'ml' }
  ],
  'Cafe Latte': [
    { recipe_template_name: 'Cafe Latte', commissary_item_name: 'Espresso Beans', store_inventory_item: 'Espresso Beans', quantity_per_serving: 18, unit: 'g' },
    { recipe_template_name: 'Cafe Latte', commissary_item_name: 'Milk', store_inventory_item: 'Milk', quantity_per_serving: 200, unit: 'ml' }
  ],
  'Iced Latte': [
    { recipe_template_name: 'Iced Latte', commissary_item_name: 'Espresso Beans', store_inventory_item: 'Espresso Beans', quantity_per_serving: 18, unit: 'g' },
    { recipe_template_name: 'Iced Latte', commissary_item_name: 'Milk', store_inventory_item: 'Milk', quantity_per_serving: 200, unit: 'ml' },
    { recipe_template_name: 'Iced Latte', commissary_item_name: 'Ice', store_inventory_item: 'Ice', quantity_per_serving: 100, unit: 'g' }
  ]
};

export const mapRecipeToInventory = async (recipeTemplateName: string, storeId: string) => {
  try {
    const mappings = MENU_INGREDIENT_MAPPINGS[recipeTemplateName];
    if (!mappings) {
      console.warn(`No ingredient mapping found for ${recipeTemplateName}`);
      return [];
    }

    const mappedIngredients = [];

    for (const mapping of mappings) {
      // Find corresponding store inventory item
      const { data: storeItem, error } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('item', mapping.store_inventory_item)
        .single();

      if (error || !storeItem) {
        console.warn(`Store inventory item not found: ${mapping.store_inventory_item}`);
        continue;
      }

      // Find corresponding commissary item
      const { data: commissaryItem } = await supabase
        .from('commissary_inventory')
        .select('*')
        .eq('name', mapping.commissary_item_name)
        .single();

      mappedIngredients.push({
        store_inventory_id: storeItem.id,
        commissary_item_id: commissaryItem?.id,
        ingredient_name: mapping.store_inventory_item,
        quantity_required: mapping.quantity_per_serving,
        unit: mapping.unit,
        current_stock: storeItem.stock_quantity,
        cost_per_unit: storeItem.cost || 0
      });
    }

    return mappedIngredients;
  } catch (error) {
    console.error('Error mapping recipe to inventory:', error);
    return [];
  }
};

export const checkIngredientAvailability = async (
  recipeTemplateName: string,
  storeId: string,
  quantityNeeded: number = 1
) => {
  try {
    const mappedIngredients = await mapRecipeToInventory(recipeTemplateName, storeId);
    
    const availabilityResults = {
      canMake: true,
      maxQuantity: Infinity,
      insufficientIngredients: [] as string[],
      ingredientDetails: mappedIngredients.map(ingredient => {
        const totalRequired = ingredient.quantity_required * quantityNeeded;
        const canFulfill = ingredient.current_stock >= totalRequired;
        const maxPossible = Math.floor(ingredient.current_stock / ingredient.quantity_required);
        
        if (!canFulfill) {
          availabilityResults.canMake = false;
          availabilityResults.insufficientIngredients.push(ingredient.ingredient_name);
        }
        
        availabilityResults.maxQuantity = Math.min(availabilityResults.maxQuantity, maxPossible);
        
        return {
          ...ingredient,
          total_required: totalRequired,
          can_fulfill: canFulfill,
          max_possible: maxPossible
        };
      })
    };

    return availabilityResults;
  } catch (error) {
    console.error('Error checking ingredient availability:', error);
    return {
      canMake: false,
      maxQuantity: 0,
      insufficientIngredients: ['System error'],
      ingredientDetails: []
    };
  }
};
