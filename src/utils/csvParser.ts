
export interface RecipeUpload {
  name: string;
  category?: string;
  description?: string;
  yield_quantity: number;
  serving_size: number;
  instructions?: string;
  ingredients: {
    name: string;
    unit: string;
    quantity: number;
    cost?: number;
  }[];
}

export interface RawIngredientUpload {
  name: string;
  category: 'raw_materials' | 'packaging_materials' | 'supplies';
  unit: 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs' | 'serving' | 'portion' | 'scoop' | 'pair';
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
    const unit = row['unit of measure'] || row['unit'];
    const quantity = parseFloat(row['quantity used'] || row['quantity']) || 0;
    const cost = parseFloat(row['cost per unit']) || 0;

    if (!recipeName || !ingredientName || !unit || quantity <= 0) continue;

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
      unit: unit,
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
    const unit = row['unit'] as 'kg' | 'g' | 'pieces' | 'liters' | 'ml' | 'boxes' | 'packs' | 'serving' | 'portion' | 'scoop' | 'pair';
    const unit_cost = parseFloat(row['unit_cost']) || undefined;
    const current_stock = parseFloat(row['current_stock']) || undefined;
    const minimum_threshold = parseFloat(row['minimum_threshold']) || undefined;
    const supplier_name = row['supplier_name'] || undefined;
    const sku = row['sku'] || undefined;
    const storage_location = row['storage_location'] || undefined;

    if (!name || !category || !unit) continue;

    // Validate category and unit values
    const validCategories = ['raw_materials', 'packaging_materials', 'supplies'];
    const validUnits = ['kg', 'g', 'pieces', 'liters', 'ml', 'boxes', 'packs', 'serving', 'portion', 'scoop', 'pair'];

    if (!validCategories.includes(category) || !validUnits.includes(unit)) continue;

    ingredients.push({
      name,
      category,
      unit,
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
