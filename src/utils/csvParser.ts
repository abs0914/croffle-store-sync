
export interface RecipeUpload {
  name: string;
  category?: string;
  description?: string;
  yield_quantity: number;
  serving_size: number;
  instructions?: string;
  ingredients: {
    name: string;
    uom: string; // Changed from unit to uom
    quantity: number;
    cost?: number;
  }[];
}

export interface RawIngredientUpload {
  name: string;
  category: 'raw_materials' | 'packaging_materials' | 'supplies';
  uom: string; // Changed from unit to uom
  unit_cost?: number;
  current_stock?: number;
  minimum_threshold?: number;
  supplier_name?: string;
  sku?: string;
  storage_location?: string;
}

export const parseRecipesCSV = (csvText: string): RecipeUpload[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const recipes: Map<string, RecipeUpload> = new Map();

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const recipeName = row['name'] || row['recipe name'] || row['product'];
    const category = row['category'];
    const ingredientName = row['ingredient name'];
    const uom = row['uom'] || row['unit of measure'] || row['unit']; // Support both UOM and unit columns
    const quantity = parseFloat(row['quantity used'] || row['quantity']) || 0;
    const cost = parseFloat(row['cost per unit']) || 0;

    if (!recipeName || !ingredientName || !uom || quantity <= 0) continue;

    if (!recipes.has(recipeName)) {
      recipes.set(recipeName, {
        name: recipeName,
        category: category || 'General',
        description: `${category || 'General'} recipe template`,
        yield_quantity: 1,
        serving_size: 1,
        instructions: 'Instructions to be added',
        ingredients: []
      });
    }

    const recipe = recipes.get(recipeName)!;
    recipe.ingredients.push({
      name: ingredientName,
      uom: uom,
      quantity: quantity,
      cost: cost
    });
  }

  return Array.from(recipes.values()).filter(recipe => 
    recipe.ingredients.length > 0 && recipe.category
  );
};

export const parseRawIngredientsCSV = (csvText: string): RawIngredientUpload[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
  const ingredients: RawIngredientUpload[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const name = row['name'];
    const category = row['category'] as 'raw_materials' | 'packaging_materials' | 'supplies';
    const uom = row['uom'] || row['unit']; // Support both UOM and unit columns
    const unit_cost = parseFloat(row['unit_cost']) || undefined;
    const current_stock = parseFloat(row['current_stock']) || undefined;
    const minimum_threshold = parseFloat(row['minimum_threshold']) || undefined;
    const supplier_name = row['supplier_name'] || undefined;
    const sku = row['sku'] || undefined;
    const storage_location = row['storage_location'] || undefined;

    if (!name || !category || !uom) continue;

    // Validate category values
    const validCategories = ['raw_materials', 'packaging_materials', 'supplies'];
    if (!validCategories.includes(category)) continue;

    ingredients.push({
      name,
      category,
      uom,
      unit_cost,
      current_stock,
      minimum_threshold,
      supplier_name,
      sku,
      storage_location
    });
  }

  return ingredients;
};
