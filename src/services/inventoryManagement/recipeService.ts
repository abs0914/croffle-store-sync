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
  const template = `Name,Ingredient Name,Unit of Measure,Quantity Used,Cost per Unit,Total Cost
Classic - Tiramisu,Croissant,piece,1,30,
Classic - Tiramisu,Whipped Cream,serving,1,8,
Classic - Tiramisu,Tiramisu Sauce,portion,1,3.5,
Classic - Tiramisu,Choco Flakes,portion,1,2.5,51.3
Classic - Tiramisu,Take out Box,piece,1,6,
Classic - Tiramisu,Chopstick,pair,1,0.6,
Classic - Tiramisu,Waxpaper,piece,1,0.7,
Classic - Choco Nut,Croissant,piece,1,30,
Classic - Choco Nut,Whipped Cream,serving,1,8,
Classic - Choco Nut,Chocolate Sauce,portion,1,2.5,
Classic - Choco Nut,Peanut,portion,1,2.5,50.3
Classic - Choco Nut,Take out Box,piece,1,6,
Classic - Choco Nut,Chopstick,pair,1,0.6,
Classic - Choco Nut,Waxpaper,piece,1,0.7,
Croffle Overload,Croissant,piece,0.5,15,
Croffle Overload,Vanilla Ice Cream,scoop,1,15.44,
Croffle Overload,Colored Sprinkle,portion,1,2.5,37.74
Croffle Overload,Peanut,portion,1,2.5,
Croffle Overload,Choco Flakes,portion,1,2.5,
Croffle Overload,Marshmallow,portion,1,2.5,
Croffle Overload,Overload Cup,piece,1,4,
Croffle Overload,Popsicle,piece,1,0.3,
Croffle Overload,Spoon,piece,1,0.5,`;

  return template;
};

export const generateRecipesCSV = async (recipes: Recipe[]): Promise<string> => {
  const rows: string[] = ['Name,Ingredient Name,Unit of Measure,Quantity Used,Cost per Unit,Total Cost'];

  recipes.forEach(recipe => {
    const totalCost = calculateRecipeCost(recipe);
    
    if (recipe.ingredients && recipe.ingredients.length > 0) {
      recipe.ingredients.forEach((ingredient, index) => {
        const isLastIngredient = index === recipe.ingredients!.length - 1;
        const row = [
          `"${recipe.name}"`,
          `"${ingredient.inventory_stock?.item || 'Unknown'}"`,
          ingredient.unit,
          ingredient.quantity,
          ingredient.inventory_stock?.cost || 0,
          isLastIngredient ? totalCost.toFixed(2) : ''
        ].join(',');
        rows.push(row);
      });
    } else {
      // If no ingredients, still add a row with recipe name
      const row = [
        `"${recipe.name}"`,
        '',
        '',
        '',
        '',
        totalCost.toFixed(2)
      ].join(',');
      rows.push(row);
    }
  });

  return rows.join('\n');
};

export const parseRecipesCSV = async (csvData: string, storeId: string): Promise<Recipe[]> => {
  const lines = csvData.split('\n').filter(line => line.trim());
  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, '').toLowerCase());
  const recipes: Map<string, any> = new Map();

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));

    if (values.length < headers.length) continue;

    const rowData: any = {};
    headers.forEach((header, index) => {
      rowData[header] = values[index] || '';
    });

    const recipeName = rowData['name'];
    const ingredientName = rowData['ingredient name'] || rowData['ingredientname'];
    const unit = rowData['unit of measure'] || rowData['unitofmeasure'] || rowData['unit'];
    const quantity = rowData['quantity used'] || rowData['quantityused'] || rowData['quantity'];
    const costPerUnit = rowData['cost per unit'] || rowData['costperunit'] || rowData['cost'];

    if (!recipeName) {
      console.warn(`Skipping row ${i + 1}: Missing recipe name`);
      continue;
    }

    if (!recipes.has(recipeName)) {
      recipes.set(recipeName, {
        name: recipeName,
        description: `Recipe for ${recipeName}`,
        yield_quantity: 1,
        instructions: `Instructions for preparing ${recipeName}`,
        store_id: storeId,
        product_id: '',
        is_active: true,
        version: 1,
        ingredients: []
      });
    }

    const recipe = recipes.get(recipeName);
    if (ingredientName && quantity) {
      // Find matching inventory stock item
      const { data: inventoryStock } = await supabase
        .from('inventory_stock')
        .select('id')
        .eq('store_id', storeId)
        .ilike('item', `%${ingredientName}%`)
        .limit(1)
        .single();

      recipe.ingredients.push({
        ingredient_name: ingredientName,
        inventory_stock_id: inventoryStock?.id || '00000000-0000-0000-0000-000000000000',
        quantity: parseFloat(quantity) || 1,
        unit: unit || 'pieces',
        cost_per_unit: parseFloat(costPerUnit) || 0
      });
    }
  }

  const importedRecipes: Recipe[] = [];

  for (const recipeData of recipes.values()) {
    try {
      const recipe = await createRecipe(recipeData);
      if (recipe) {
        // Add ingredients to the recipe
        for (const ingredientData of recipeData.ingredients) {
          await addRecipeIngredient({
            recipe_id: recipe.id,
            inventory_stock_id: ingredientData.inventory_stock_id,
            quantity: ingredientData.quantity,
            unit: ingredientData.unit as any
          });
        }
        importedRecipes.push(recipe);
      }
    } catch (error) {
      console.error(`Error importing recipe "${recipeData.name}":`, error);
      toast.error(`Failed to import recipe: ${recipeData.name}`);
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
