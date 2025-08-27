import { parseMarkdownTable, ParsedRecipeFile } from './markdownRecipeParser';

// Recipe file contents (these would normally be loaded from the file system)
// CLEANED: Removed hardcoded sample data for fresh system reset
const RECIPE_FILES: Record<string, string> = {
  // Files will be loaded dynamically when uploaded through the UI
| Tiramisu          | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Tiramisu          | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Choco Nut         | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Choco Nut         | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Choco Nut         | Classic  | Chocolate         | Portion         | 1        | 2.5           | 125   |
| Choco Nut         | Classic  | Peanut            | Portion         | 1        | 2.5           | 125   |
| Choco Nut         | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Choco Nut         | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Caramel Delight   | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Caramel Delight   | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Caramel Delight   | Classic  | Caramel           | Portion         | 1        | 2.5           | 125   |
| Caramel Delight   | Classic  | Colored Sprinkles | Portion         | 1        | 2.5           | 125   |
| Caramel Delight   | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Caramel Delight   | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Choco Marshmallow | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Choco Marshmallow | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Choco Marshmallow | Classic  | Chocolate         | Portion         | 1        | 2.5           | 125   |
| Choco Marshmallow | Classic  | Marshmallow       | Portion         | 1        | 2.5           | 125   |
| Choco Marshmallow | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Choco Marshmallow | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Strawberry        | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Strawberry        | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Strawberry        | Classic  | Strawberry Jam    | Scoop           | 1        | 5             | 125   |
| Strawberry        | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Strawberry        | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Mango             | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Mango             | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Mango             | Classic  | Mango Jam         | Scoop           | 1        | 7             | 125   |
| Mango             | Classic  | Graham Crushed    | Portion         | 1        | 2.5           | 125   |
| Mango             | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Mango             | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Blueberry         | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Blueberry         | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Blueberry         | Classic  | Blueberry Jam     | Scoop           | 1        | 7.5           | 125   |
| Blueberry         | Classic  | Graham Crushed    | Portion         | 1        | 2.5           | 125   |
| Blueberry         | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Blueberry         | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Biscoff           | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Biscoff           | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Biscoff           | Classic  | Biscoff Crushed   | Portion         | 1        | 5             | 125   |
| Biscoff           | Classic  | Biscoff           | Piece           | 1        | 5.62          | 125   |
| Biscoff           | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Biscoff           | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Nutella           | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Nutella           | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Nutella           | Classic  | Nutella           | Portion         | 1        | 4.5           | 125   |
| Nutella           | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Nutella           | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| KitKat            | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| KitKat            | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| KitKat            | Classic  | Chocolate         | Portion         | 1        | 2.5           | 125   |
| KitKat            | Classic  | KitKat            | Piece           | 0.5      | 6.25          | 125   |
| KitKat            | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| KitKat            | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Cookies & Cream   | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Cookies & Cream   | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Cookies & Cream   | Classic  | Oreo Crushed      | Portion         | 1        | 2.5           | 125   |
| Cookies & Cream   | Classic  | Oreo Cookies      | Piece           | 1        | 2.9           | 125   |
| Cookies & Cream   | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Cookies & Cream   | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Choco Overload    | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Choco Overload    | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Choco Overload    | Classic  | Chocolate         | Portion         | 1        | 2.5           | 125   |
| Choco Overload    | Classic  | Choco Flakes      | Portion         | 1        | 2.5           | 125   |
| Choco Overload    | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Choco Overload    | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Matcha            | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Matcha            | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Matcha            | Classic  | Matcha Crumble    | Portion         | 1        | 2.5           | 125   |
| Matcha            | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Matcha            | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |
| Dark Chocolate    | Classic  | Regular Croissant | Piece           | 1        | 30            | 125   |
| Dark Chocolate    | Classic  | Whipped Cream     | Serving         | 1        | 8             | 125   |
| Dark Chocolate    | Classic  | Dark Chocolate    | Portion         | 1        | 2.5           | 125   |
| Dark Chocolate    | Classic  | Chocolate Crumble | Portion         | 1        | 2.5           | 125   |
| Dark Chocolate    | Classic  | Chopstick         | Pair            | 1        | 0.6           | 125   |
| Dark Chocolate    | Classic  | Wax Paper         | Piece           | 1        | 0.7           | 125   |`,

  'drinksRecipe.md': `| Product       | category | Ingredient Name | Unit of Measure | Quantity | Cost per Unit | price |
|---------------|----------|-----------------|-----------------|----------|---------------|-------|
| Coke          | Others   | Softdrinks      | piece           | 20       | 11.3          | 15    |
| Sprite        | Others   | Softdrinks      | piece           | 20       | 11.3          | 15    |
| Bottled Water | Others   | Water           | piece           | 20       | 15            | 20    |`,

  'coffeeRecipe.md': `| Product              | Category | Ingredient Name | Unit of Measure | Quantity | Cost per Unit | Price |
| -------------------- | -------- | --------------- | --------------- | -------- | ------------- | ----- |
| Americano (Hot)      | Espresso | Espresso Shot   | Shot            | 1        | —             | 65    |
| Americano (Hot)      | Espresso | Hot Water       | Ml              | 150      | —             | 65    |
| Americano (Iced)     | Espresso | Espresso Shot   | Shot            | 1        | —             | 70    |
| Americano (Iced)     | Espresso | Cold Water      | Ml              | 100      | —             | 70    |
| Americano (Iced)     | Espresso | Ice             | Cubes           | 5        | —             | 70    |
| Cappuccino (Hot)     | Espresso | Espresso Shot   | Shot            | 1        | —             | 75    |
| Cappuccino (Hot)     | Espresso | Steamed Milk    | Ml              | 120      | —             | 75    |
| Cappuccino (Hot)     | Espresso | Milk Foam       | Ml              | 30       | —             | 75    |
| Cappuccino (Iced)    | Espresso | Espresso Shot   | Shot            | 1        | —             | 80    |
| Cappuccino (Iced)    | Espresso | Cold Milk       | Ml              | 120      | —             | 80    |
| Cappuccino (Iced)    | Espresso | Ice             | Cubes           | 5        | —             | 80    |
| Café Latte (Hot)     | Espresso | Espresso Shot   | Shot            | 1        | —             | 75    |
| Café Latte (Hot)     | Espresso | Steamed Milk    | Ml              | 180      | —             | 75    |
| Café Latte (Iced)    | Espresso | Espresso Shot   | Shot            | 1        | —             | 80    |
| Café Latte (Iced)    | Espresso | Cold Milk       | Ml              | 180      | —             | 80    |
| Café Latte (Iced)    | Espresso | Ice             | Cubes           | 5        | —             | 80    |
| Café Mocha (Hot)     | Espresso | Espresso Shot   | Shot            | 1        | —             | 80    |
| Café Mocha (Hot)     | Espresso | Chocolate Syrup | Pump (15 ml)    | 1        | —             | 80    |
| Café Mocha (Hot)     | Espresso | Steamed Milk    | Ml              | 150      | —             | 80    |
| Café Mocha (Iced)    | Espresso | Espresso Shot   | Shot            | 1        | —             | 85    |
| Café Mocha (Iced)    | Espresso | Chocolate Syrup | Pump (15 ml)    | 1        | —             | 85    |
| Café Mocha (Iced)    | Espresso | Cold Milk       | Ml              | 150      | —             | 85    |
| Café Mocha (Iced)    | Espresso | Ice             | Cubes           | 5        | —             | 85    |
| Caramel Latte (Hot)  | Espresso | Espresso Shot   | Shot            | 1        | —             | 80    |
| Caramel Latte (Hot)  | Espresso | Caramel Syrup   | Pump (15 ml)    | 1        | —             | 80    |
| Caramel Latte (Hot)  | Espresso | Steamed Milk    | Ml              | 150      | —             | 80    |
| Caramel Latte (Iced) | Espresso | Espresso Shot   | Shot            | 1        | —             | 85    |
| Caramel Latte (Iced) | Espresso | Caramel Syrup   | Pump (15 ml)    | 1        | —             | 85    |
| Caramel Latte (Iced) | Espresso | Cold Milk       | Ml              | 150      | —             | 85    |
| Caramel Latte (Iced) | Espresso | Ice             | Cubes           | 5        | —             | 85    |`
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
