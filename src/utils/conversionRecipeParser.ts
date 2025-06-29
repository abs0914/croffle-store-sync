
interface ConversionRecipeRow {
  'Conversion Name': string;
  'Input Item'?: string;
  'Input Items'?: string; // For pipe-separated format
  'Input Qty'?: string;
  'Input Quantities'?: string; // For pipe-separated format
  'Input UOM'?: string;
  'Input UOMs'?: string; // For pipe-separated format
  'Output Item': string;
  'Output Qty': string;
  'Output UOM': string;
  'Notes'?: string;
}

export interface ParsedConversionRecipe {
  name: string;
  description?: string;
  input_items: {
    commissary_item_name: string;
    quantity: number;
    unit: string;
    is_missing?: boolean;
  }[];
  output_item: {
    name: string;
    quantity: number;
    uom: string;
    category: string;
    unit_cost?: number;
    sku?: string;
    storage_location?: string;
  };
}

export const parseConversionRecipesCSV = (csvText: string): ParsedConversionRecipe[] => {
  const lines = csvText.trim().split('\n');
  if (lines.length < 2) {
    throw new Error('CSV must have at least a header and one data row');
  }

  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const recipeMap = new Map<string, ParsedConversionRecipe>();

  // Check if we're using pipe-separated format or multi-row format
  const hasPipeSeparatedHeaders = headers.includes('Input Items') && headers.includes('Input Quantities') && headers.includes('Input UOMs');
  
  console.log('CSV Headers:', headers);
  console.log('Using pipe-separated format:', hasPipeSeparatedHeaders);

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Type assertion with proper validation
    const typedRow = row as unknown as ConversionRecipeRow;

    if (!typedRow['Conversion Name'] || !typedRow['Output Item']) {
      console.warn(`Skipping row ${i + 1}: Missing required fields`);
      continue;
    }

    const recipeName = typedRow['Conversion Name'];
    
    // Initialize recipe if it doesn't exist
    if (!recipeMap.has(recipeName)) {
      recipeMap.set(recipeName, {
        name: recipeName,
        description: typedRow['Notes'] || `Convert ingredients to ${typedRow['Output Item']}`,
        input_items: [],
        output_item: {
          name: typedRow['Output Item'],
          quantity: parseFloat(typedRow['Output Qty']) || 1,
          uom: typedRow['Output UOM'] || 'pieces',
          category: 'supplies',
          unit_cost: 0,
          sku: '',
          storage_location: ''
        }
      });
    }

    const recipe = recipeMap.get(recipeName)!;

    if (hasPipeSeparatedHeaders) {
      // Handle pipe-separated format (single row with multiple ingredients)
      const inputItems = (typedRow['Input Items'] || '').split('|').map(s => s.trim()).filter(s => s.length > 0);
      const inputQuantities = (typedRow['Input Quantities'] || '').split('|').map(s => s.trim()).filter(s => s.length > 0);
      const inputUOMs = (typedRow['Input UOMs'] || '').split('|').map(s => s.trim()).filter(s => s.length > 0);

      if (inputItems.length !== inputQuantities.length || inputItems.length !== inputUOMs.length) {
        console.warn(`Skipping row ${i + 1}: Mismatched pipe-separated input counts`);
        continue;
      }

      for (let j = 0; j < inputItems.length; j++) {
        recipe.input_items.push({
          commissary_item_name: inputItems[j],
          quantity: parseFloat(inputQuantities[j]) || 1,
          unit: inputUOMs[j] || 'pieces'
        });
      }
    } else {
      // Handle multi-row format (traditional single ingredient per row)
      if (!typedRow['Input Item']) {
        console.warn(`Skipping row ${i + 1}: Missing input item`);
        continue;
      }

      recipe.input_items.push({
        commissary_item_name: typedRow['Input Item'],
        quantity: parseFloat(typedRow['Input Qty'] || '1') || 1,
        unit: typedRow['Input UOM'] || 'pieces'
      });
    }
  }

  return Array.from(recipeMap.values()).filter(recipe => 
    recipe.input_items.length > 0
  );
};
