
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
          // Map common unit names to valid database units
          const unitMapping: Record<string, string> = {
            'piece': 'pieces',
            'serving': 'g',
            'portion': 'g',
            'scoop': 'g',
            'pair': 'pieces',
            'gram': 'g',
            'grams': 'g',
            'kilogram': 'kg',
            'kilograms': 'kg',
            'liter': 'liters',
            'litre': 'liters',
            'milliliter': 'ml',
            'millilitre': 'ml',
            'box': 'boxes',
            'pack': 'packs',
            'package': 'packs'
          };
          ingredient.unit = unitMapping[value.toLowerCase()] || value;
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
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const recipes: Map<string, RecipeUpload> = new Map();
  
  // Enhanced unit mapping for recipe ingredients
  const unitMapping: Record<string, string> = {
    'piece': 'pieces',
    'serving': 'g',
    'portion': 'g',
    'scoop': 'g',
    'pair': 'pieces',
    'gram': 'g',
    'grams': 'g',
    'kilogram': 'kg',
    'kilograms': 'kg',
    'liter': 'liters',
    'litre': 'liters',
    'milliliter': 'ml',
    'millilitre': 'ml',
    'box': 'boxes',
    'pack': 'packs',
    'package': 'packs'
  };
  
  lines.slice(1).forEach(line => {
    if (!line.trim()) return;
    
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const rowData: any = {};
    
    // Map CSV headers to data
    headers.forEach((header, index) => {
      rowData[header] = values[index] || '';
    });
    
    const recipeName = rowData['name'] || rowData['recipe name'] || rowData['recipename'];
    const recipeCategory = rowData['category'] || rowData['recipe category'] || rowData['recipecategory'];
    const ingredientName = rowData['ingredient name'] || rowData['ingredientname'] || rowData['ingredient'];
    const unitOfMeasure = rowData['unit of measure'] || rowData['unitofmeasure'] || rowData['unit'] || rowData['uom'];
    const quantityUsed = rowData['quantity used'] || rowData['quantityused'] || rowData['quantity'] || rowData['qty'];
    const costPerUnit = rowData['cost per unit'] || rowData['costperunit'] || rowData['cost'] || rowData['unit cost'];
    
    if (!recipeName || !ingredientName) return;
    
    if (!recipes.has(recipeName)) {
      recipes.set(recipeName, {
        name: recipeName,
        category: recipeCategory || undefined, // Add category support
        description: `Recipe for ${recipeName}`,
        yield_quantity: 1,
        serving_size: 1,
        instructions: `Instructions for preparing ${recipeName}`,
        ingredients: []
      });
    }
    
    const recipe = recipes.get(recipeName)!;
    if (ingredientName && quantityUsed) {
      // Apply unit mapping to ensure valid database enum values
      const mappedUnit = unitMapping[unitOfMeasure?.toLowerCase()] || unitOfMeasure || 'pieces';
      
      recipe.ingredients.push({
        commissary_item_name: ingredientName,
        quantity: parseFloat(quantityUsed) || 1,
        unit: mappedUnit,
        cost_per_unit: parseFloat(costPerUnit) || undefined
      });
    }
  });
  
  return Array.from(recipes.values());
};
