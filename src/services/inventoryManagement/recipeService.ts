
import { supabase } from "@/integrations/supabase/client";
import { Recipe, RecipeIngredient, InventoryStock } from "@/types/inventoryManagement";
import { toast } from "sonner";

export const fetchRecipes = async (storeId: string): Promise<Recipe[]> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return data || [];
  } catch (error) {
    console.error('Error fetching recipes:', error);
    toast.error('Failed to fetch recipes');
    return [];
  }
};

export const createRecipe = async (recipe: Omit<Recipe, 'id' | 'created_at' | 'updated_at' | 'ingredients'>): Promise<Recipe | null> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .insert(recipe)
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .single();

    if (error) throw error;

    toast.success('Recipe created successfully');
    return data;
  } catch (error) {
    console.error('Error creating recipe:', error);
    toast.error('Failed to create recipe');
    return null;
  }
};

export const updateRecipe = async (id: string, updates: Partial<Recipe>): Promise<Recipe | null> => {
  try {
    const { data, error } = await supabase
      .from('recipes')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .single();

    if (error) throw error;

    toast.success('Recipe updated successfully');
    return data;
  } catch (error) {
    console.error('Error updating recipe:', error);
    toast.error('Failed to update recipe');
    return null;
  }
};

export const deleteRecipe = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipes')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    toast.success('Recipe deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting recipe:', error);
    toast.error('Failed to delete recipe');
    return false;
  }
};

export const addRecipeIngredient = async (recipeIngredient: Omit<RecipeIngredient, 'id' | 'created_at'>): Promise<RecipeIngredient | null> => {
  try {
    const { data, error } = await supabase
      .from('recipe_ingredients')
      .insert(recipeIngredient)
      .select(`
        *,
        inventory_stock:inventory_stock(*)
      `)
      .single();

    if (error) throw error;

    return data;
  } catch (error) {
    console.error('Error adding recipe ingredient:', error);
    toast.error('Failed to add ingredient to recipe');
    return null;
  }
};

export const removeRecipeIngredient = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('recipe_ingredients')
      .delete()
      .eq('id', id);

    if (error) throw error;

    return true;
  } catch (error) {
    console.error('Error removing recipe ingredient:', error);
    toast.error('Failed to remove ingredient from recipe');
    return false;
  }
};

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

export const calculateRecipeCost = (recipe: Recipe): number => {
  return recipe.ingredients?.reduce((total, ingredient) => {
    const cost = ingredient.inventory_stock?.cost || 0;
    return total + (cost * ingredient.quantity);
  }, 0) || 0;
};

// Recipe CSV Import/Export Functions
export const generateRecipeCSVTemplate = (): string => {
  const headers = [
    'recipe_name',
    'description',
    'yield_quantity',
    'instructions',
    'ingredient_1_name',
    'ingredient_1_quantity',
    'ingredient_1_unit',
    'ingredient_2_name',
    'ingredient_2_quantity',
    'ingredient_2_unit',
    'ingredient_3_name',
    'ingredient_3_quantity',
    'ingredient_3_unit',
    'ingredient_4_name',
    'ingredient_4_quantity',
    'ingredient_4_unit',
    'ingredient_5_name',
    'ingredient_5_quantity',
    'ingredient_5_unit'
  ];

  const sampleData = [
    'Chocolate Chip Cookie',
    'Classic chocolate chip cookie recipe',
    '24',
    'Mix dry ingredients, add wet ingredients, fold in chocolate chips, bake at 350F for 12 minutes',
    'All Purpose Flour',
    '2',
    'kg',
    'Sugar',
    '1',
    'kg',
    'Chocolate Chips',
    '0.5',
    'kg',
    'Butter',
    '0.5',
    'kg',
    'Eggs',
    '6',
    'pieces'
  ];

  return [headers.join(','), sampleData.join(',')].join('\n');
};

export const generateRecipesCSV = async (recipes: Recipe[]): Promise<string> => {
  const headers = [
    'recipe_name',
    'description',
    'yield_quantity',
    'instructions',
    'total_cost',
    'cost_per_unit',
    'ingredients_count',
    'ingredients_list'
  ];

  const rows = recipes.map(recipe => {
    const totalCost = calculateRecipeCost(recipe);
    const costPerUnit = recipe.yield_quantity > 0 ? totalCost / recipe.yield_quantity : 0;
    const ingredientsList = recipe.ingredients?.map(ing =>
      `${ing.inventory_stock?.item || 'Unknown'} (${ing.quantity} ${ing.unit})`
    ).join('; ') || '';

    return [
      `"${recipe.name}"`,
      `"${recipe.description || ''}"`,
      recipe.yield_quantity,
      `"${recipe.instructions || ''}"`,
      totalCost.toFixed(2),
      costPerUnit.toFixed(2),
      recipe.ingredients?.length || 0,
      `"${ingredientsList}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
};

export const parseRecipesCSV = async (csvData: string, storeId: string): Promise<Recipe[]> => {
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const importedRecipes: Recipe[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));

    if (values.length < headers.length) continue;

    const recipeData: any = {};
    headers.forEach((header, index) => {
      recipeData[header] = values[index] || '';
    });

    // Validate required fields
    if (!recipeData.recipe_name) {
      console.warn(`Skipping row ${i + 1}: Missing recipe name`);
      continue;
    }

    try {
      // Create the recipe
      const recipe = await createRecipe({
        name: recipeData.recipe_name,
        description: recipeData.description || '',
        yield_quantity: parseFloat(recipeData.yield_quantity) || 1,
        instructions: recipeData.instructions || '',
        store_id: storeId,
        product_id: '',
        is_active: true,
        version: 1
      });

      if (recipe) {
        // Process ingredients (up to 5 ingredients from CSV)
        for (let j = 1; j <= 5; j++) {
          const ingredientName = recipeData[`ingredient_${j}_name`];
          const ingredientQuantity = recipeData[`ingredient_${j}_quantity`];
          const ingredientUnit = recipeData[`ingredient_${j}_unit`];

          if (ingredientName && ingredientQuantity && ingredientUnit) {
            // Find matching inventory stock item
            const { data: inventoryStock } = await supabase
              .from('inventory_stock')
              .select('id')
              .eq('store_id', storeId)
              .ilike('item', `%${ingredientName}%`)
              .limit(1)
              .single();

            if (inventoryStock) {
              await addRecipeIngredient({
                recipe_id: recipe.id,
                inventory_stock_id: inventoryStock.id,
                quantity: parseFloat(ingredientQuantity),
                unit: ingredientUnit as any
              });
            } else {
              console.warn(`Ingredient "${ingredientName}" not found in inventory for recipe "${recipe.name}"`);
            }
          }
        }

        importedRecipes.push(recipe);
      }
    } catch (error) {
      console.error(`Error importing recipe from row ${i + 1}:`, error);
      toast.error(`Failed to import recipe from row ${i + 1}: ${recipeData.recipe_name}`);
    }
  }

  return importedRecipes;
};

// JSON Import/Export Functions
export const generateRecipesJSON = async (recipes: Recipe[]): Promise<string> => {
  const exportData = {
    export_date: new Date().toISOString(),
    version: "1.0",
    recipes: recipes.map(recipe => ({
      name: recipe.name,
      description: recipe.description,
      yield_quantity: recipe.yield_quantity,
      instructions: recipe.instructions,
      ingredients: recipe.ingredients?.map(ing => ({
        name: ing.inventory_stock?.item || '',
        quantity: ing.quantity,
        unit: ing.unit,
        cost: ing.inventory_stock?.cost || 0
      })) || [],
      total_cost: calculateRecipeCost(recipe),
      cost_per_unit: recipe.yield_quantity > 0 ? calculateRecipeCost(recipe) / recipe.yield_quantity : 0
    }))
  };

  return JSON.stringify(exportData, null, 2);
};

export const parseRecipesJSON = async (jsonData: string, storeId: string): Promise<Recipe[]> => {
  try {
    const data = JSON.parse(jsonData);

    if (!data.recipes || !Array.isArray(data.recipes)) {
      throw new Error('Invalid JSON format: recipes array not found');
    }

    const importedRecipes: Recipe[] = [];

    for (const recipeData of data.recipes) {
      if (!recipeData.name) {
        console.warn('Skipping recipe: Missing name');
        continue;
      }

      try {
        // Create the recipe
        const recipe = await createRecipe({
          name: recipeData.name,
          description: recipeData.description || '',
          yield_quantity: recipeData.yield_quantity || 1,
          instructions: recipeData.instructions || '',
          store_id: storeId,
          product_id: '',
          is_active: true,
          version: 1
        });

        if (recipe && recipeData.ingredients) {
          // Process ingredients
          for (const ingredientData of recipeData.ingredients) {
            if (ingredientData.name && ingredientData.quantity && ingredientData.unit) {
              // Find matching inventory stock item
              const { data: inventoryStock } = await supabase
                .from('inventory_stock')
                .select('id')
                .eq('store_id', storeId)
                .ilike('item', `%${ingredientData.name}%`)
                .limit(1)
                .single();

              if (inventoryStock) {
                await addRecipeIngredient({
                  recipe_id: recipe.id,
                  inventory_stock_id: inventoryStock.id,
                  quantity: ingredientData.quantity,
                  unit: ingredientData.unit
                });
              } else {
                console.warn(`Ingredient "${ingredientData.name}" not found in inventory for recipe "${recipe.name}"`);
              }
            }
          }
        }

        importedRecipes.push(recipe);
      } catch (error) {
        console.error(`Error importing recipe "${recipeData.name}":`, error);
        toast.error(`Failed to import recipe: ${recipeData.name}`);
      }
    }

    return importedRecipes;
  } catch (error) {
    console.error('Error parsing JSON:', error);
    throw new Error('Invalid JSON format');
  }
};
