import { parseMarkdownTable, ParsedRecipeFile } from './markdownRecipeParser';

// Recipe file contents (these would normally be loaded from the file system)
// CLEANED: Removed hardcoded sample data for fresh system reset
const RECIPE_FILES: Record<string, string> = {
  // Files will be loaded dynamically when uploaded through the UI
  'crofflesRecipe.md': `| Product       | category | Ingredient Name | Unit of Measure | Quantity | Cost per Unit | price |
|---------------|----------|-----------------|-----------------|----------|---------------|-------|
| Tiramisu          | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Tiramisu          | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Choco Nut         | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Choco Nut         | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Choco Nut         | Classic  | Chocolate         | Portion         | 1        | 2.5           | 125   |
| Choco Nut         | Classic  | Peanut            | Portion         | 1        | 2.5           | 125   |
| Choco Nut         | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Choco Nut         | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |`,

  'drinksRecipe.md': `| Product       | category | Ingredient Name | Unit of Measure | Quantity | Cost per Unit | price |
|---------------|----------|-----------------|-----------------|----------|---------------|-------|
| Coke          | Others   | Softdrinks      | piece           | 20       | 11.3          | 15    |
| Sprite        | Others   | Softdrinks      | piece           | 20       | 11.3          | 15    |
| Bottled Water | Others   | Water           | piece           | 20       | 15            | 20    |`,

  'coffeeRecipe.md': `| Product              | Category | Ingredient Name | Unit of Measure | Quantity | Cost per Unit | Price |
| -------------------- | -------- | --------------- | --------------- | -------- | ------------- | ----- |
| Americano (Hot)      | Espresso | Espresso Shot   | Shot            | 1        | 25            | 65    |
| Americano (Hot)      | Espresso | Hot Water       | Ml              | 150      | 0.1           | 65    |
| Americano (Iced)     | Espresso | Espresso Shot   | Shot            | 1        | 25            | 70    |
| Americano (Iced)     | Espresso | Cold Water      | Ml              | 100      | 0.1           | 70    |
| Americano (Iced)     | Espresso | Ice             | Cubes           | 5        | 0.5           | 70    |`
};

/**
 * Load and parse all recipe files from the scripts/recipes directory
 */
export const loadAllRecipeFiles = async (): Promise<ParsedRecipeFile[]> => {
  const parsedFiles: ParsedRecipeFile[] = [];

  for (const [filename, content] of Object.entries(RECIPE_FILES)) {
    try {
      const parsed = parseMarkdownTable(content, filename);
      parsedFiles.push(parsed);
    } catch (error) {
      parsedFiles.push({
        filename,
        recipes: [],
        errors: [`Failed to parse ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: []
      });
    }
  }

  return parsedFiles;
};

/**
 * Load a specific recipe file by name
 */
export const loadRecipeFile = async (filename: string): Promise<ParsedRecipeFile | null> => {
  const content = RECIPE_FILES[filename as keyof typeof RECIPE_FILES];
  
  if (!content) {
    return null;
  }

  try {
    return parseMarkdownTable(content, filename);
  } catch (error) {
    return {
      filename,
      recipes: [],
      errors: [`Failed to parse ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: []
    };
  }
};

/**
 * Get list of available recipe files
 */
export const getAvailableRecipeFiles = (): string[] => {
  return Object.keys(RECIPE_FILES);
};

/**
 * Quick upload function for existing recipe files
 */
export const quickUploadAllRecipes = async (): Promise<{
  success: boolean;
  totalRecipes: number;
  errors: string[];
}> => {
  try {
    const { MarkdownBulkUploadService } = await import('./markdownBulkUploadService');
    
    const parsedFiles = await loadAllRecipeFiles();
    const uploadService = new MarkdownBulkUploadService();
    
    const result = await uploadService.uploadRecipes(parsedFiles, {
      createMissingCommissaryItems: true,
      updateExistingRecipes: true,
      defaultStockLevel: 100
    });

    return {
      success: result.success,
      totalRecipes: result.totalRecipes,
      errors: result.errors
    };
  } catch (error) {
    return {
      success: false,
      totalRecipes: 0,
      errors: [`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
};