import { supabase } from '@/integrations/supabase/client';
import { unifiedRecipeService, UnifiedRecipe, CreateRecipeData } from '@/services/unifiedRecipeService';

export interface UnifiedRecipeCSVRow {
  name: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
}

export const unifiedRecipeImportExport = {
  // Generate CSV from unified recipes
  generateCSV: (recipes: UnifiedRecipe[]): string => {
    const headers = ['name', 'ingredient_name', 'quantity', 'unit', 'cost_per_unit'];
    const csvRows = [headers.join(',')];

    recipes.forEach(recipe => {
      if (recipe.ingredients && recipe.ingredients.length > 0) {
        recipe.ingredients.forEach(ingredient => {
          const row = [
            `"${recipe.name.replace(/"/g, '""')}"`,
            `"${ingredient.ingredient_name.replace(/"/g, '""')}"`,
            ingredient.quantity.toString(),
            `"${ingredient.unit.replace(/"/g, '""')}"`,
            ingredient.cost_per_unit.toString()
          ];
          csvRows.push(row.join(','));
        });
      } else {
        // Recipe without ingredients
        const row = [
          `"${recipe.name.replace(/"/g, '""')}"`,
          '""', // empty ingredient_name
          '0', // zero quantity
          '""', // empty unit
          '0' // zero cost
        ];
        csvRows.push(row.join(','));
      }
    });

    return csvRows.join('\n');
  },

  // Generate CSV template
  generateCSVTemplate: (): string => {
    const headers = ['name', 'ingredient_name', 'quantity', 'unit', 'cost_per_unit'];
    const exampleRows = [
      ['Adobo Chicken', 'Chicken Thigh', '500', 'g', '15.50'],
      ['Adobo Chicken', 'Soy Sauce', '100', 'ml', '2.25'],
      ['Adobo Chicken', 'Vinegar', '50', 'ml', '1.80'],
      ['Fried Rice', 'Rice', '200', 'g', '8.00'],
      ['Fried Rice', 'Egg', '2', 'pcs', '6.00']
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
      .select('id, item, unit, cost')
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

    // Create recipes
    const createdRecipes: UnifiedRecipe[] = [];
    
    for (const [recipeName, ingredients] of Object.entries(recipeGroups)) {
      if (!recipeName.trim()) continue;

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