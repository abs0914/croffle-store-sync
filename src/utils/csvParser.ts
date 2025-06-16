
import { RawIngredientUpload, RecipeUpload, RecipeIngredientUpload } from "@/types/commissary";

export const parseRawIngredientsCSV = (csvText: string): RawIngredientUpload[] => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const ingredient: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      
      switch (header) {
        case 'name':
          ingredient.name = value;
          break;
        case 'category':
          ingredient.category = value as 'raw_materials' | 'packaging_materials' | 'supplies';
          break;
        case 'unit':
          ingredient.unit = value;
          break;
        case 'unit_cost':
        case 'cost':
          ingredient.unit_cost = parseFloat(value) || 0;
          break;
        case 'current_stock':
        case 'stock':
          ingredient.current_stock = parseFloat(value) || 0;
          break;
        case 'minimum_threshold':
        case 'min_threshold':
          ingredient.minimum_threshold = parseFloat(value) || 0;
          break;
        case 'supplier':
        case 'supplier_name':
          ingredient.supplier_name = value;
          break;
        case 'sku':
          ingredient.sku = value;
          break;
        case 'storage_location':
        case 'location':
          ingredient.storage_location = value;
          break;
      }
    });
    
    return ingredient;
  }).filter(ingredient => ingredient.name);
};

export const parseRecipesCSV = (csvText: string): RecipeUpload[] => {
  const lines = csvText.trim().split('\n');
  const recipes: Map<string, RecipeUpload> = new Map();
  
  lines.slice(1).forEach(line => {
    const values = line.split(',').map(v => v.trim());
    const [recipeName, description, yieldQty, servingSize, instructions, ingredientName, quantity, unit, costPerUnit] = values;
    
    if (!recipes.has(recipeName)) {
      recipes.set(recipeName, {
        name: recipeName,
        description: description || undefined,
        yield_quantity: parseFloat(yieldQty) || 1,
        serving_size: parseFloat(servingSize) || 1,
        instructions: instructions || undefined,
        ingredients: []
      });
    }
    
    const recipe = recipes.get(recipeName)!;
    if (ingredientName && quantity) {
      recipe.ingredients.push({
        commissary_item_name: ingredientName,
        quantity: parseFloat(quantity),
        unit: unit || 'g',
        cost_per_unit: parseFloat(costPerUnit) || undefined
      });
    }
  });
  
  return Array.from(recipes.values());
};
