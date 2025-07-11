import { toast } from 'sonner';

export interface ParsedIngredient {
  name: string;
  unit: string;
  quantity: number;
  cost: number;
}

export interface ParsedRecipe {
  product: string;
  category: string;
  price: number;
  ingredients: ParsedIngredient[];
}

export interface ParsedRecipeFile {
  filename: string;
  recipes: ParsedRecipe[];
  errors: string[];
  warnings: string[];
}

/**
 * Parse markdown table content into recipe data
 */
export const parseMarkdownTable = (content: string, filename: string = 'unknown'): ParsedRecipeFile => {
  const result: ParsedRecipeFile = {
    filename,
    recipes: [],
    errors: [],
    warnings: []
  };

  try {
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    if (lines.length < 2) {
      result.errors.push('File must contain at least a header and one data row');
      return result;
    }

    // Find the header line (contains pipe characters)
    let headerIndex = -1;
    let separatorIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes('|') && lines[i].toLowerCase().includes('product')) {
        headerIndex = i;
        // Look for separator line (contains dashes)
        if (i + 1 < lines.length && lines[i + 1].includes('-')) {
          separatorIndex = i + 1;
        }
        break;
      }
    }

    if (headerIndex === -1) {
      result.errors.push('Could not find table header with "Product" column');
      return result;
    }

    // Parse header to get column indices
    const headerCells = lines[headerIndex].split('|').map(cell => cell.trim().toLowerCase());
    const columnMap = {
      product: -1,
      category: -1,
      ingredient: -1,
      unit: -1,
      quantity: -1,
      cost: -1,
      price: -1
    };

    // Map column names to indices
    headerCells.forEach((cell, index) => {
      if (cell.includes('product')) columnMap.product = index;
      else if (cell.includes('category')) columnMap.category = index;
      else if (cell.includes('ingredient')) columnMap.ingredient = index;
      else if (cell.includes('unit') || cell.includes('measure')) columnMap.unit = index;
      else if (cell.includes('quantity')) columnMap.quantity = index;
      else if (cell.includes('cost') && cell.includes('unit')) columnMap.cost = index;
      else if (cell.includes('price') && !cell.includes('unit')) columnMap.price = index;
    });

    // Validate required columns
    const requiredColumns = ['product', 'category', 'ingredient', 'unit', 'quantity', 'price'];
    const missingColumns = requiredColumns.filter(col => columnMap[col as keyof typeof columnMap] === -1);
    
    if (missingColumns.length > 0) {
      result.errors.push(`Missing required columns: ${missingColumns.join(', ')}`);
      return result;
    }

    // Parse data rows
    const dataStartIndex = separatorIndex !== -1 ? separatorIndex + 1 : headerIndex + 1;
    const recipeMap = new Map<string, ParsedRecipe>();

    for (let i = dataStartIndex; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes('|')) continue;

      const cells = line.split('|').map(cell => cell.trim());
      
      if (cells.length < Math.max(...Object.values(columnMap)) + 1) {
        result.warnings.push(`Row ${i + 1}: Insufficient columns, skipping`);
        continue;
      }

      try {
        const productName = cells[columnMap.product];
        const category = cells[columnMap.category];
        const ingredientName = cells[columnMap.ingredient];
        const unit = cells[columnMap.unit];
        const quantityStr = cells[columnMap.quantity];
        const costStr = cells[columnMap.cost];
        const priceStr = cells[columnMap.price];

        // Validate required fields
        if (!productName || !category || !ingredientName || !unit || !quantityStr || !priceStr) {
          result.warnings.push(`Row ${i + 1}: Missing required data, skipping`);
          continue;
        }

        // Parse numeric values
        const quantity = parseFloat(quantityStr);
        const price = parseFloat(priceStr);
        let cost = 0;

        // Handle cost parsing (might be "—" or empty for some ingredients)
        if (costStr && costStr !== '—' && costStr !== '-' && costStr.trim() !== '') {
          cost = parseFloat(costStr);
          if (isNaN(cost)) {
            result.warnings.push(`Row ${i + 1}: Invalid cost value "${costStr}", using 0`);
            cost = 0;
          }
        }

        if (isNaN(quantity) || isNaN(price)) {
          result.warnings.push(`Row ${i + 1}: Invalid numeric values, skipping`);
          continue;
        }

        // Get or create recipe
        if (!recipeMap.has(productName)) {
          recipeMap.set(productName, {
            product: productName,
            category: category,
            price: price,
            ingredients: []
          });
        }

        const recipe = recipeMap.get(productName)!;
        
        // Add ingredient to recipe
        recipe.ingredients.push({
          name: ingredientName,
          unit: unit.toLowerCase(),
          quantity: quantity,
          cost: cost
        });

      } catch (error) {
        result.warnings.push(`Row ${i + 1}: Error parsing data - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Convert map to array
    result.recipes = Array.from(recipeMap.values());

    if (result.recipes.length === 0) {
      result.errors.push('No valid recipes found in the file');
    }

    console.log(`📊 Parsed ${result.recipes.length} recipes from ${filename}`);
    
  } catch (error) {
    result.errors.push(`Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
};

/**
 * Parse multiple markdown files
 */
export const parseMultipleMarkdownFiles = async (files: File[]): Promise<ParsedRecipeFile[]> => {
  const results: ParsedRecipeFile[] = [];

  for (const file of files) {
    try {
      const content = await file.text();
      const parsed = parseMarkdownTable(content, file.name);
      results.push(parsed);
    } catch (error) {
      results.push({
        filename: file.name,
        recipes: [],
        errors: [`Failed to read file: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      });
    }
  }

  return results;
};

/**
 * Validate parsed recipe data
 */
export const validateParsedRecipes = (parsedFiles: ParsedRecipeFile[]): {
  isValid: boolean;
  totalRecipes: number;
  totalIngredients: number;
  errors: string[];
  warnings: string[];
} => {
  let totalRecipes = 0;
  let totalIngredients = 0;
  const allErrors: string[] = [];
  const allWarnings: string[] = [];

  for (const file of parsedFiles) {
    totalRecipes += file.recipes.length;
    allErrors.push(...file.errors.map(err => `${file.filename}: ${err}`));
    allWarnings.push(...file.warnings.map(warn => `${file.filename}: ${warn}`));

    for (const recipe of file.recipes) {
      totalIngredients += recipe.ingredients.length;
      
      // Validate recipe structure
      if (recipe.ingredients.length === 0) {
        allErrors.push(`${file.filename}: Recipe "${recipe.product}" has no ingredients`);
      }
      
      if (recipe.price <= 0) {
        allErrors.push(`${file.filename}: Recipe "${recipe.product}" has invalid price`);
      }

      // Validate ingredients
      for (const ingredient of recipe.ingredients) {
        if (ingredient.quantity <= 0) {
          allWarnings.push(`${file.filename}: Recipe "${recipe.product}" - ingredient "${ingredient.name}" has invalid quantity`);
        }
      }
    }
  }

  return {
    isValid: allErrors.length === 0,
    totalRecipes,
    totalIngredients,
    errors: allErrors,
    warnings: allWarnings
  };
};

/**
 * Get summary statistics from parsed files
 */
export const getParsedRecipesSummary = (parsedFiles: ParsedRecipeFile[]) => {
  const summary = {
    totalFiles: parsedFiles.length,
    totalRecipes: 0,
    totalIngredients: 0,
    recipesByCategory: new Map<string, number>(),
    filesSummary: [] as Array<{
      filename: string;
      recipeCount: number;
      ingredientCount: number;
      hasErrors: boolean;
      hasWarnings: boolean;
    }>
  };

  for (const file of parsedFiles) {
    summary.totalRecipes += file.recipes.length;
    
    let fileIngredientCount = 0;
    for (const recipe of file.recipes) {
      fileIngredientCount += recipe.ingredients.length;
      
      // Count by category
      const count = summary.recipesByCategory.get(recipe.category) || 0;
      summary.recipesByCategory.set(recipe.category, count + 1);
    }
    
    summary.totalIngredients += fileIngredientCount;
    
    summary.filesSummary.push({
      filename: file.filename,
      recipeCount: file.recipes.length,
      ingredientCount: fileIngredientCount,
      hasErrors: file.errors.length > 0,
      hasWarnings: file.warnings.length > 0
    });
  }

  return summary;
};
