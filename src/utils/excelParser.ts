import * as XLSX from 'xlsx';

export interface ExcelRecipeData {
  name: string;
  category_name: string;
  description: string;
  yield_quantity: number;
  serving_size: number;
  instructions: string;
  suggested_price?: number;
  combo_main?: boolean;
  combo_add_on?: boolean;
  ingredients: {
    ingredient_name: string;
    unit: string;
    quantity: number;
    cost_per_unit: number;
    ingredient_category?: string;
    combo_main?: boolean;
    combo_add_on?: boolean;
  }[];
}

export interface ExcelParseResult {
  recipes: ExcelRecipeData[];
  addons: any[];
  combos: any[];
  errors: string[];
  warnings: string[];
}

/**
 * Parse Excel file for recipe templates
 */
export const parseExcelFile = async (file: File): Promise<ExcelParseResult> => {
  const result: ExcelParseResult = {
    recipes: [],
    addons: [],
    combos: [],
    errors: [],
    warnings: []
  };

  try {
    // Read the file as array buffer
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });

    // Get the first worksheet
    const worksheetName = workbook.SheetNames[0];
    if (!worksheetName) {
      result.errors.push('No worksheets found in the Excel file');
      return result;
    }

    const worksheet = workbook.Sheets[worksheetName];
    
    // Convert worksheet to JSON with header row
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
      header: 1,
      defval: '',
      raw: false // This ensures dates and numbers are formatted as strings
    }) as string[][];

    if (jsonData.length < 2) {
      result.errors.push('Excel file must have at least a header row and one data row');
      return result;
    }

    // Get headers from first row
    const headers = jsonData[0].map(h => String(h).trim());
    console.log('Excel headers found:', headers);

    // Create header mapping
    const headerMap: Record<string, number> = {};
    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
      headerMap[normalizedHeader] = index;
    });

    console.log('Header mapping:', headerMap);

    // Validate required headers
    const requiredHeaders = ['recipe_name', 'ingredient_name', 'quantity', 'unit'];
    const missingHeaders = requiredHeaders.filter(header => 
      !headers.some(h => h.toLowerCase().replace(/[^a-z0-9]/g, '_') === header)
    );

    if (missingHeaders.length > 0) {
      result.errors.push(`Missing required columns: ${missingHeaders.join(', ')}`);
      return result;
    }

    // Process data rows
    const recipeMap = new Map<string, ExcelRecipeData>();

    for (let i = 1; i < jsonData.length; i++) {
      const row = jsonData[i];
      
      // Skip empty rows
      if (row.every(cell => !cell || String(cell).trim() === '')) {
        continue;
      }

      try {
        // Extract data from row
        const recipeName = String(row[headerMap['recipe_name']] || '').trim();
        const ingredientName = String(row[headerMap['ingredient_name']] || '').trim();
        const category = String(row[headerMap['recipe_category']] || row[headerMap['category']] || 'General').trim();
        const unit = String(row[headerMap['unit']] || row[headerMap['uom']] || '').trim();
        const quantityStr = String(row[headerMap['quantity']] || '0').trim();
        const costStr = String(row[headerMap['cost_per_unit']] || row[headerMap['cost']] || '0').trim();

        // Extract new essential fields
        const ingredientCategory = String(row[headerMap['ingredient_category']] || 'General').trim();
        const suggestedPriceStr = String(row[headerMap['suggested_price']] || '0').trim();
        const comboMainStr = String(row[headerMap['combo_main']] || '').trim().toLowerCase();
        const comboAddOnStr = String(row[headerMap['combo_add_on']] || '').trim().toLowerCase();

        // Parse numeric values
        const quantity = parseFloat(quantityStr) || 0;
        const cost = parseFloat(costStr) || 0;
        const suggestedPrice = parseFloat(suggestedPriceStr) || 0;

        // Parse boolean values (Yes/No, True/False, 1/0)
        const comboMain = comboMainStr === 'yes' || comboMainStr === 'true' || comboMainStr === '1';
        const comboAddOn = comboAddOnStr === 'yes' || comboAddOnStr === 'true' || comboAddOnStr === '1';

        console.log(`Processing row ${i + 1}:`, {
          recipeName,
          ingredientName,
          category,
          unit,
          quantity,
          cost,
          ingredientCategory,
          suggestedPrice,
          comboMain,
          comboAddOn
        });

        // Validate required fields
        if (!recipeName) {
          result.warnings.push(`Row ${i + 1}: Missing recipe name, skipping`);
          continue;
        }

        if (!ingredientName) {
          result.warnings.push(`Row ${i + 1}: Missing ingredient name for recipe "${recipeName}", skipping`);
          continue;
        }

        if (!unit) {
          result.warnings.push(`Row ${i + 1}: Missing unit for ingredient "${ingredientName}" in recipe "${recipeName}", skipping`);
          continue;
        }

        if (quantity <= 0) {
          result.warnings.push(`Row ${i + 1}: Invalid quantity (${quantity}) for ingredient "${ingredientName}" in recipe "${recipeName}", skipping`);
          continue;
        }

        // Find or create recipe
        let recipe = recipeMap.get(recipeName);
        if (!recipe) {
          recipe = {
            name: recipeName,
            category_name: category.toLowerCase(),
            description: `${category} recipe template`,
            yield_quantity: 1,
            serving_size: 1,
            instructions: 'Instructions to be added',
            suggested_price: suggestedPrice > 0 ? suggestedPrice : undefined,
            combo_main: comboMain || undefined,
            combo_add_on: comboAddOn || undefined,
            ingredients: []
          };
          recipeMap.set(recipeName, recipe);
        } else {
          // Update recipe-level fields if they're provided and not already set
          if (suggestedPrice > 0 && !recipe.suggested_price) {
            recipe.suggested_price = suggestedPrice;
          }
          if (comboMain && recipe.combo_main === undefined) {
            recipe.combo_main = comboMain;
          }
          if (comboAddOn && recipe.combo_add_on === undefined) {
            recipe.combo_add_on = comboAddOn;
          }
        }

        // Add ingredient to recipe
        recipe.ingredients.push({
          ingredient_name: ingredientName,
          unit: unit,
          quantity: quantity,
          cost_per_unit: cost,
          ingredient_category: ingredientCategory || undefined,
          combo_main: comboMain || undefined,
          combo_add_on: comboAddOn || undefined
        });

      } catch (error) {
        result.errors.push(`Row ${i + 1}: Error processing row - ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Convert map to array
    result.recipes = Array.from(recipeMap.values());

    console.log(`Successfully parsed ${result.recipes.length} recipes from Excel file`);
    
    // Log summary
    result.recipes.forEach(recipe => {
      console.log(`Recipe: ${recipe.name} - ${recipe.ingredients.length} ingredients`);
    });

  } catch (error) {
    result.errors.push(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  return result;
};

/**
 * Generate Excel template for recipe upload
 */
export const generateExcelTemplate = (): Uint8Array => {
  // Create sample data
  const sampleData = [
    // Headers
    ['recipe_name', 'recipe_category', 'ingredient_name', 'quantity', 'unit', 'cost_per_unit', 'ingredient_category', 'suggested_price', 'combo_main', 'combo_add_on'],
    // Sample rows
    ['Chocolate Croffle', 'Main', 'Croffle Base', 1, 'piece', 15, 'Base Items', 85, 'Yes', 'No'],
    ['Chocolate Croffle', 'Main', 'Chocolate Sauce', 30, 'ml', 2, 'Sauces', '', 'No', 'Yes'],
    ['Chocolate Croffle', 'Main', 'Whipped Cream', 20, 'ml', 1.5, 'Toppings', '', 'No', 'Yes'],
    ['Strawberry Jam', 'Add-on', 'Strawberry Toppings', 1, 'piece', 1.5, 'Toppings', 15, 'No', 'Yes'],
    ['Take out box w cover', 'Add-on', 'Take out box w cover', 1, 'piece', 8, 'Packaging', 8, 'No', 'Yes'],
    ['Iced Coffee', 'Main', 'Coffee Beans', 20, 'grams', 3, 'Beverages', 45, 'Yes', 'Yes'],
    ['Iced Coffee', 'Main', 'Ice Cubes', 100, 'grams', 0.5, 'Beverages', '', 'No', 'No']
  ];

  // Create workbook and worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(sampleData);

  // Set column widths
  worksheet['!cols'] = [
    { width: 20 }, // recipe_name
    { width: 15 }, // recipe_category
    { width: 25 }, // ingredient_name
    { width: 10 }, // quantity
    { width: 10 }, // unit
    { width: 15 }, // cost_per_unit
    { width: 18 }, // ingredient_category
    { width: 15 }, // suggested_price
    { width: 18 }, // combo_main
    { width: 15 }  // combo_add_on
  ];

  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Recipe Templates');

  // Generate Excel file as Uint8Array
  return XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
};

/**
 * Download Excel template file
 */
export const downloadExcelTemplate = () => {
  const excelData = generateExcelTemplate();
  const blob = new Blob([excelData as BlobPart], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'recipe_template.xlsx';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
