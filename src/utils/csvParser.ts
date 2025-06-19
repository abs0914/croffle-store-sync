
export interface RecipeUpload {
  name: string;
  category?: string;
  ingredients: {
    name: string;
    unit: string;
    quantity: number;
    cost?: number;
  }[];
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

    const recipeName = row['name'] || row['recipe name'];
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
