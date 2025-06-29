
interface ConversionRecipeRow {
  'Conversion Name': string;
  'Input Item': string;
  'Input Qty': string;
  'Input UOM': string;
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
  const recipes: ParsedConversionRecipe[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
    
    if (values.length < headers.length) continue;

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    // Type assertion with proper validation
    const typedRow = row as unknown as ConversionRecipeRow;

    if (!typedRow['Conversion Name'] || !typedRow['Input Item'] || !typedRow['Output Item']) {
      console.warn(`Skipping row ${i + 1}: Missing required fields`);
      continue;
    }

    const recipe: ParsedConversionRecipe = {
      name: typedRow['Conversion Name'],
      description: typedRow['Notes'] || `Convert ${typedRow['Input Item']} to ${typedRow['Output Item']}`,
      input_items: [{
        commissary_item_name: typedRow['Input Item'],
        quantity: parseFloat(typedRow['Input Qty']) || 1,
        unit: typedRow['Input UOM'] || 'pieces'
      }],
      output_item: {
        name: typedRow['Output Item'],
        quantity: parseFloat(typedRow['Output Qty']) || 1,
        uom: typedRow['Output UOM'] || 'pieces',
        category: 'supplies', // Default category for finished products
        unit_cost: 0,
        sku: '',
        storage_location: ''
      }
    };

    recipes.push(recipe);
  }

  return recipes;
};
