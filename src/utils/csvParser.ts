import { RawIngredientUpload, RecipeUpload, RecipeIngredientUpload } from "@/types/commissary";

export const parseRawIngredientsCSV = (csvText: string): RawIngredientUpload[] => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim().replace(/"/g, '')); // Remove quotes
    const ingredient: any = {};
    
    headers.forEach((header, index) => {
      const value = values[index];
      
      switch (header) {
        case 'name':
          ingredient.name = value;
          break;
        case 'category':
          // Ensure category values match the database constraint exactly
          const categoryMapping: Record<string, string> = {
            'raw materials': 'raw_materials',
            'raw_materials': 'raw_materials',
            'rawmaterials': 'raw_materials',
            'packaging materials': 'packaging_materials',
            'packaging_materials': 'packaging_materials',
            'packagingmaterials': 'packaging_materials',
            'supplies': 'supplies',
            'supply': 'supplies'
          };
          const normalizedCategory = value.toLowerCase().replace(/[\s-_]/g, '');
          ingredient.category = categoryMapping[normalizedCategory] || categoryMapping[value.toLowerCase()] || 'raw_materials';
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
    
    // Validate and set defaults for required fields
    if (!ingredient.category) {
      ingredient.category = 'raw_materials';
    }
    
    if (!ingredient.unit) {
      ingredient.unit = 'pieces';
    }
    
    return ingredient;
  }).filter(ingredient => ingredient.name && ingredient.name.trim() !== '');
};

export const parseRecipesCSV = (csvText: string): RecipeUpload[] => {
  const lines = csvText.trim().split('\n');
  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const recipes: Map<string, RecipeUpload> = new Map();
  
  console.log('CSV Headers:', headers);
  console.log('Total lines:', lines.length);
  
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
  
  lines.slice(1).forEach((line, index) => {
    if (!line.trim()) return;
    
    const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
    const rowData: any = {};
    
    console.log(`Processing line ${index + 2}:`, values);
    
    // Map CSV headers to data - handle multiple possible column names
    headers.forEach((header, index) => {
      rowData[header] = values[index] || '';
    });
    
    // Flexible column mapping to handle different naming conventions
    const recipeName = rowData['product'] || rowData['name'] || rowData['recipe name'] || rowData['recipename'];
    const recipeCategory = rowData['category'] || rowData['recipe category'] || rowData['recipecategory'];
    const ingredientName = rowData['ingredient name'] || rowData['ingredientname'] || rowData['ingredient'];
    const unitOfMeasure = rowData['unit of measure'] || rowData['unitofmeasure'] || rowData['unit'] || rowData['uom'];
    const quantityUsed = rowData['quantity used'] || rowData['quantityused'] || rowData['quantity'] || rowData['qty'];
    const costPerUnit = rowData['cost per unit'] || rowData['costperunit'] || rowData['cost'] || rowData['unit cost'];
    
    console.log(`Parsed: Recipe=${recipeName}, Ingredient=${ingredientName}, Quantity=${quantityUsed}, Unit=${unitOfMeasure}`);
    
    if (!recipeName || !ingredientName) {
      console.log(`Skipping line ${index + 2}: Missing recipe name or ingredient name`);
      return;
    }
    
    if (!recipes.has(recipeName)) {
      recipes.set(recipeName, {
        name: recipeName,
        category: recipeCategory || 'General',
        description: `Recipe for ${recipeName}`,
        yield_quantity: 1,
        serving_size: 1,
        instructions: `Instructions for preparing ${recipeName}`,
        ingredients: []
      });
      console.log(`Created new recipe: ${recipeName}`);
    }
    
    const recipe = recipes.get(recipeName)!;
    if (ingredientName && quantityUsed) {
      // Apply unit mapping to ensure valid database enum values
      const mappedUnit = unitMapping[unitOfMeasure?.toLowerCase()] || unitOfMeasure || 'pieces';
      
      const ingredient: RecipeIngredientUpload = {
        commissary_item_name: ingredientName,
        quantity: parseFloat(quantityUsed) || 1,
        unit: mappedUnit,
        cost_per_unit: parseFloat(costPerUnit) || undefined
      };
      
      recipe.ingredients.push(ingredient);
      console.log(`Added ingredient to ${recipeName}:`, ingredient);
    }
  });
  
  const result = Array.from(recipes.values());
  console.log(`Final parsed recipes count: ${result.length}`);
  result.forEach(recipe => {
    console.log(`Recipe: ${recipe.name}, Ingredients: ${recipe.ingredients.length}`);
  });
  
  return result;
};
