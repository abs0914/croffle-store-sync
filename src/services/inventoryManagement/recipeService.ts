import { supabase } from "@/integrations/supabase/client";
import { InventoryStock } from "@/types/orderManagement";
import { Recipe } from "@/types/inventoryManagement";
import { toast } from "sonner";
import { unifiedProductService } from "@/services/productManagement/unifiedProductService";
import { syncMonitoringService } from "@/services/productManagement/syncMonitoringService";

export const fetchInventoryStock = async (storeId: string): Promise<InventoryStock[]> => {
  try {
    const { data, error } = await supabase
      .from('inventory_stock')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('item');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching inventory stock:', error);
    toast.error('Failed to fetch inventory stock');
    return [];
  }
};

// Recipe CRUD operations
export const fetchRecipes = async (storeId: string): Promise<Recipe[]> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          inventory_stock:inventory_stock!recipe_ingredients_inventory_stock_id_fkey(*)
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    
    // Cast approval_status to the proper type
    return (data || []).map(recipe => ({
      ...recipe,
      approval_status: recipe.approval_status as 'draft' | 'pending_approval' | 'approved' | 'rejected'
    }));
  } catch (error) {
    console.error('Error fetching recipes:', error);
    toast.error('Failed to fetch recipes');
    return [];
  }
};

export const createRecipe = async (recipeData: Omit<Recipe, 'id' | 'created_at' | 'updated_at'>): Promise<Recipe | null> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .insert(recipeData)
      .select()
      .single();

    if (error) throw error;
    toast.success('Recipe created successfully');
    
    return {
      ...data,
      approval_status: data.approval_status as 'draft' | 'pending_approval' | 'approved' | 'rejected'
    };
  } catch (error) {
    console.error('Error creating recipe:', error);
    toast.error('Failed to create recipe');
    return null;
  }
};

export const updateRecipe = async (recipeId: string, updates: Partial<Recipe>): Promise<Recipe | null> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', recipeId)
      .select()
      .single();

    if (error) throw error;
    
    // Validate sync after recipe update
    if (data.store_id && (updates.total_cost !== undefined || (updates as any).suggested_price !== undefined)) {
      try {
        // Check if product sync is maintained
        const validation = await syncMonitoringService.validateRecipeCostPropagation(recipeId);
        if (!validation.isValid) {
          console.warn('Recipe cost sync issues detected:', validation.issues);
          // Attempt auto-repair
          await unifiedProductService.repairSync(data.store_id, recipeId);
        }
      } catch (syncError) {
        console.warn('Sync validation failed:', syncError);
      }
    }
    
    toast.success('Recipe updated successfully');
    
    return {
      ...data,
      approval_status: data.approval_status as 'draft' | 'pending_approval' | 'approved' | 'rejected'
    };
  } catch (error) {
    console.error('Error updating recipe:', error);
    toast.error('Failed to update recipe');
    return null;
  }
};

export const deleteRecipe = async (recipeId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipes')
      .update({ is_active: false })
      .eq('id', recipeId);

    if (error) throw error;
    toast.success('Recipe deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting recipe:', error);
    toast.error('Failed to delete recipe');
    return false;
  }
};

// Recipe ingredient operations
export const addRecipeIngredient = async (ingredientData: {
  recipe_id: string;
  inventory_stock_id: string;
  quantity: number;
  unit: string;
}): Promise<void> => {
  try {
    const { error } = await supabase
      .from('recipe_ingredients')
      .insert({
        ...ingredientData,
        unit: ingredientData.unit as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs'
      });

    if (error) throw error;
  } catch (error) {
    console.error('Error adding recipe ingredient:', error);
    toast.error('Failed to add ingredient');
    throw error;
  }
};

export const removeRecipeIngredient = async (ingredientId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('id', ingredientId);

    if (error) throw error;
  } catch (error) {
    console.error('Error removing recipe ingredient:', error);
    toast.error('Failed to remove ingredient');
    throw error;
  }
};

// Recipe cost calculation
export const calculateRecipeCost = (recipe: Recipe): number => {
  if (!recipe.ingredients) return 0;
  
  return recipe.ingredients.reduce((total, ingredient) => {
    const cost = ingredient.inventory_stock?.cost || 0;
    return total + (ingredient.quantity * cost);
  }, 0);
};

// Import/Export functions
export const generateRecipesCSV = async (recipes: Recipe[]): Promise<string> => {
  const headers = [
    'Recipe Name',
    'Description', 
    'Yield Quantity',
    'Instructions',
    'Ingredient',
    'Quantity',
    'Unit',
    'Cost'
  ];

  const rows = [headers.join(',')];

  recipes.forEach(recipe => {
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach(ingredient => {
        const row = [
          `"${recipe.name}"`,
          `"${recipe.description || ''}"`,
          recipe.yield_quantity,
          `"${recipe.instructions || ''}"`,
          `"${ingredient.inventory_stock?.item || ''}"`,
          ingredient.quantity,
          ingredient.unit,
          ingredient.inventory_stock?.cost || 0
        ];
        rows.push(row.join(','));
      });
    } else {
      const row = [
        `"${recipe.name}"`,
        `"${recipe.description || ''}"`,
        recipe.yield_quantity,
        `"${recipe.instructions || ''}"`,
        '', '', '', ''
      ];
      rows.push(row.join(','));
    }
  });

  return rows.join('\n');
};

export const generateRecipeCSVTemplate = (): string => {
  const headers = [
    'Recipe Name',
    'Description',
    'Yield Quantity', 
    'Instructions',
    'Ingredient',
    'Quantity',
    'Unit'
  ];

  const sampleRows = [
    [
      'Sample Recipe',
      'A sample recipe description',
      '4',
      'Mix all ingredients together',
      'Flour',
      '2',
      'kg'
    ],
    [
      'Sample Recipe',
      '',
      '',
      '',
      'Sugar',
      '1',
      'kg'
    ]
  ];

  const rows = [
    headers.join(','),
    ...sampleRows.map(row => row.join(','))
  ];

  return rows.join('\n');
};

export const generateRecipesJSON = async (recipes: Recipe[]): Promise<string> => {
  return JSON.stringify(recipes, null, 2);
};

export const parseRecipesCSV = async (csvData: string, storeId: string): Promise<Recipe[]> => {
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length < 2) throw new Error('Invalid CSV format');

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const recipes: Map<string, Recipe> = new Map();

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    
    const recipeName = values[0];
    if (!recipeName) continue;

    if (!recipes.has(recipeName)) {
      recipes.set(recipeName, {
        id: crypto.randomUUID(),
        name: recipeName,
        description: values[1] || '',
        yield_quantity: parseFloat(values[2]) || 1,
        instructions: values[3] || '',
        store_id: storeId,
        product_id: '',
        is_active: true,
        version: 1,
        ingredients: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        approval_status: 'draft' as const
      });
    }

    const recipe = recipes.get(recipeName)!;
    
    if (values[4]) { // If ingredient name exists
      recipe.ingredients?.push({
        id: crypto.randomUUID(),
        recipe_id: recipe.id,
        inventory_stock_id: '', // Will need to be mapped
        quantity: parseFloat(values[5]) || 0,
        unit: values[6] || 'kg',
        created_at: new Date().toISOString(),
        inventory_stock: {
          id: '',
          item: values[4],
          cost: parseFloat(values[7]) || 0,
          unit: values[6] || 'kg',
          stock_quantity: 0,
          store_id: storeId
        }
      });
    }
  }

  return Array.from(recipes.values());
};

export const parseRecipesJSON = async (jsonData: string, storeId: string): Promise<Recipe[]> => {
  try {
    const recipes = JSON.parse(jsonData);
    
    if (!Array.isArray(recipes)) {
      throw new Error('JSON must contain an array of recipes');
    }

    return recipes.map(recipe => ({
      ...recipe,
      id: crypto.randomUUID(),
      store_id: storeId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      approval_status: 'draft' as const
    }));
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
};
