import { supabase } from '@/integrations/supabase/client';
import { unifiedRecipeService, UnifiedRecipe, CreateRecipeData } from '@/services/unifiedRecipeService';
import { formatCategory } from '@/utils/categoryFormatting';

// Normalize text to remove special characters and accents for better matching
const normalizeText = (text: string): string => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
    .replace(/[^\w\s-]/g, '') // Remove special characters except spaces and hyphens
    .trim();
};

// Enhanced recipe name matching for imports
const normalizeRecipeName = (name: string): string => {
  return normalizeText(name)
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, '') // Remove parentheses and their content
    .replace(/\s+/g, ' ') // Normalize multiple spaces to single space
    .trim();
};

export interface UnifiedRecipeCSVRow {
  name: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  ingredient_category?: string;
}

export const unifiedRecipeImportExport = {
  // Generate CSV from unified recipes
  generateCSV: async (recipes: UnifiedRecipe[]): Promise<string> => {
    const headers = ['name', 'ingredient_name', 'quantity', 'unit', 'cost_per_unit', 'ingredient_category'];
    const csvRows = [headers.join(',')];

    // Get inventory stock for category information
    const allInventoryIds = recipes
      .flatMap(recipe => recipe.ingredients || [])
      .map(ingredient => ingredient.inventory_stock_id)
      .filter(Boolean);
    
    const { data: inventoryStock } = await supabase
      .from('inventory_stock')
      .select('id, item_category')
      .in('id', allInventoryIds);

    const categoryMap = new Map(
      inventoryStock?.map(item => [item.id, item.item_category]) || []
    );

    recipes.forEach(recipe => {
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(ingredient => {
          const category = categoryMap.get(ingredient.inventory_stock_id);
          const row = [
            `"${normalizeText(recipe.name).replace(/"/g, '""')}"`,
            `"${normalizeText(ingredient.ingredient_name).replace(/"/g, '""')}"`,
            ingredient.quantity.toString(),
            `"${normalizeText(ingredient.unit).replace(/"/g, '""')}"`,
            ingredient.cost_per_unit.toString(),
            `"${formatCategory(category)}"`
          ];
          csvRows.push(row.join(','));
        });
      } else {
        // Recipe without ingredients
        const row = [
          `"${normalizeText(recipe.name).replace(/"/g, '""')}"`,
          '""', // empty ingredient_name
          '0', // zero quantity
          '""', // empty unit
          '0', // zero cost
          '""' // empty category
        ];
        csvRows.push(row.join(','));
      }
    });

    return csvRows.join('\n');
  },

  // Generate CSV template
  generateCSVTemplate: (): string => {
    const headers = ['name', 'ingredient_name', 'quantity', 'unit', 'cost_per_unit', 'ingredient_category'];
    const exampleRows = [
      ['Adobo Chicken', 'Chicken Thigh', '500', 'g', '15.50', 'Base Ingredient'],
      ['Adobo Chicken', 'Soy Sauce', '100', 'ml', '2.25', 'Classic Sauce'],
      ['Adobo Chicken', 'Vinegar', '50', 'ml', '1.80', 'Classic Sauce'],
      ['Fried Rice', 'Rice', '200', 'g', '8.00', 'Base Ingredient'],
      ['Fried Rice', 'Egg', '2', 'pcs', '6.00', 'Base Ingredient']
    ];

    const csvRows = [headers.join(',')];
    exampleRows.forEach(row => {
      csvRows.push(row.map(cell => `"${cell}"`).join(','));
    });

    return csvRows.join('\n');
  },

  // Parse CSV and create unified recipes
  parseCSV: async (csvData: string, storeId: string): Promise<UnifiedRecipe[]> => {
    const lines = csvData.trim().split('\n');
    if (lines.length < 2) throw new Error('Invalid CSV format');

    const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
    const expectedHeaders = ['name', 'ingredient_name', 'quantity', 'unit', 'cost_per_unit'];
    
    // Validate headers
    const hasAllHeaders = expectedHeaders.every(header => 
      headers.some(h => h.toLowerCase() === header.toLowerCase())
    );
    if (!hasAllHeaders) {
      throw new Error(`CSV must contain headers: ${expectedHeaders.join(', ')}`);
    }

    // Get inventory stock for ingredient matching
    const { data: inventoryStock, error: inventoryError } = await supabase
      .from('inventory_stock')
      .select('id, item, unit, cost, item_category')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (inventoryError) throw new Error('Failed to fetch inventory data');

    // Group rows by recipe name
    const recipeGroups: { [recipeName: string]: UnifiedRecipeCSVRow[] } = {};
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
      const row: any = {};
      
      headers.forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9_]/g, '_');
        row[normalizedHeader] = values[index] || '';
      });

      const recipeName = row.name;
      if (!recipeName || !row.ingredient_name) continue;

      if (!recipeGroups[recipeName]) {
        recipeGroups[recipeName] = [];
      }

      recipeGroups[recipeName].push({
        name: recipeName,
        ingredient_name: row.ingredient_name,
        quantity: parseFloat(row.quantity) || 0,
        unit: row.unit,
        cost_per_unit: parseFloat(row.cost_per_unit) || 0
      });
    }

    // Create recipes with improved duplicate detection
    const createdRecipes: UnifiedRecipe[] = [];
    
    // First, get existing recipes for this store to check for duplicates
    const { data: existingRecipes } = await supabase
      .from('unified_recipes')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('is_active', true);
    
    for (const [recipeName, ingredients] of Object.entries(recipeGroups)) {
      if (!recipeName.trim()) continue;

      const normalizedNewName = normalizeRecipeName(recipeName);
      
      // Check if a recipe with similar name already exists
      const existingRecipe = existingRecipes?.find(recipe => 
        normalizeRecipeName(recipe.name) === normalizedNewName
      );
      
      if (existingRecipe) {
        console.log(`Skipping duplicate recipe: "${recipeName}" matches existing "${existingRecipe.name}"`);
        continue;
      }

      // Match ingredients to inventory
      const matchedIngredients: CreateRecipeData['ingredients'] = [];
      
      for (const ingredient of ingredients) {
        if (!ingredient.ingredient_name.trim()) continue;

        // Find matching inventory item
        const inventoryItem = inventoryStock?.find(item => 
          item.item.toLowerCase() === ingredient.ingredient_name.toLowerCase() ||
          item.item.toLowerCase().includes(ingredient.ingredient_name.toLowerCase()) ||
          ingredient.ingredient_name.toLowerCase().includes(item.item.toLowerCase())
        );

        if (inventoryItem) {
          matchedIngredients.push({
            inventory_stock_id: inventoryItem.id,
            ingredient_name: ingredient.ingredient_name,
            quantity: ingredient.quantity,
            unit: ingredient.unit || inventoryItem.unit,
            cost_per_unit: ingredient.cost_per_unit || inventoryItem.cost || 0
          });
        }
      }

      if (matchedIngredients.length > 0) {
        const recipeData: CreateRecipeData = {
          name: recipeName,
          store_id: storeId,
          ingredients: matchedIngredients
        };

        const createdRecipe = await unifiedRecipeService.createRecipe(recipeData);
        if (createdRecipe) {
          createdRecipes.push(createdRecipe);
        }
      }
    }

    return createdRecipes;
  }
};