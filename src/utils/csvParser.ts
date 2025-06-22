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

export interface ConversionRecipeUpload {
  name: string;
  description?: string;
  input_item_name: string;
  input_quantity: number;
  input_unit: string;
  output_product_name: string;
  output_quantity: number;
  output_unit: string;
  instructions?: string;
}

// Helper function to parse CSV properly
const parseCSVLine = (line: string): string[] => {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current.trim());
  return result;
};

// Helper function to normalize header names
const normalizeHeader = (header: string): string => {
  return header.toLowerCase().trim().replace(/[^a-z0-9]/g, '_');
};

// Helper function to map category variations to valid database categories
const mapCategoryToValidValue = (category: string): 'raw_materials' | 'packaging_materials' | 'supplies' | null => {
  const normalizedCategory = category.toLowerCase().trim();
  
  // Map common category variations
  const categoryMapping: Record<string, 'raw_materials' | 'packaging_materials' | 'supplies'> = {
    // Raw materials variations
    'raw_materials': 'raw_materials',
    'raw_ingredients': 'raw_materials',
    'ingredients': 'raw_materials',
    'raw': 'raw_materials',
    
    // Packaging materials variations
    'packaging_materials': 'packaging_materials',
    'packaging': 'packaging_materials',
    'packages': 'packaging_materials',
    'containers': 'packaging_materials',
    
    // Supplies variations
    'supplies': 'supplies',
    'store_equipment': 'supplies',
    'equipment': 'supplies',
    'tools': 'supplies',
    'store_supplies': 'supplies',
    'misc': 'supplies',
    'miscellaneous': 'supplies'
  };
  
  return categoryMapping[normalizedCategory] || null;
};

// Create mapping for common header variations
const createHeaderMapping = (headers: string[]): Record<string, number> => {
  const mapping: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    
    // Map common variations
    const variations: Record<string, string[]> = {
      'name': ['name', 'ingredient_name', 'item_name', 'product_name'],
      'category': ['category', 'type', 'item_type'],
      'uom': ['uom', 'unit', 'unit_of_measure', 'measure', 'units'],
      'unit_cost': ['unit_cost', 'cost', 'price', 'cost_per_unit'],
      'current_stock': ['current_stock', 'stock', 'quantity', 'qty'],
      'minimum_threshold': ['minimum_threshold', 'min_threshold', 'reorder_point', 'minimum'],
      'supplier_name': ['supplier_name', 'supplier', 'vendor', 'vendor_name'],
      'sku': ['sku', 'code', 'item_code', 'product_code'],
      'storage_location': ['storage_location', 'location', 'storage', 'warehouse']
    };
    
    Object.entries(variations).forEach(([key, aliases]) => {
      if (aliases.includes(normalized)) {
        mapping[key] = index;
      }
    });
  });
  
  return mapping;
};

// Create mapping for conversion recipe headers
const createConversionRecipeHeaderMapping = (headers: string[]): Record<string, number> => {
  const mapping: Record<string, number> = {};
  
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    
    // Map common variations
    const variations: Record<string, string[]> = {
      'name': ['conversion_name', 'recipe_name', 'name'],
      'description': ['description', 'desc', 'notes'],
      'input_item_name': ['input_item_name', 'input_item', 'source_item', 'from_item'],
      'input_quantity': ['input_quantity', 'input_qty', 'source_quantity', 'from_quantity'],
      'input_unit': ['input_unit', 'input_uom', 'source_unit', 'from_unit'],
      'output_product_name': ['output_product_name', 'output_item', 'target_item', 'to_item'],
      'output_quantity': ['output_quantity', 'output_qty', 'target_quantity', 'to_quantity'],
      'output_unit': ['output_unit', 'output_uom', 'target_unit', 'to_unit'],
      'instructions': ['conversion_notes', 'instructions', 'process', 'method']
    };
    
    Object.entries(variations).forEach(([key, aliases]) => {
      if (aliases.includes(normalized)) {
        mapping[key] = index;
      }
    });
  });
  
  return mapping;
};

export const parseRecipesCSV = (csvText: string): RecipeUpload[] => {
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const recipes: Map<string, RecipeUpload> = new Map();

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
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
  console.log('Starting CSV parsing, input length:', csvText.length);
  
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  console.log('Total lines found:', lines.length);
  
  if (lines.length < 2) {
    console.log('Not enough lines in CSV');
    return [];
  }

  const headers = parseCSVLine(lines[0]);
  console.log('Headers found:', headers);
  
  const headerMapping = createHeaderMapping(headers);
  console.log('Header mapping:', headerMapping);
  
  const ingredients: RawIngredientUpload[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    console.log(`Processing line ${i}:`, values);
    
    if (values.length < headers.length) {
      console.log(`Skipping line ${i}: insufficient columns`);
      continue;
    }

    // Extract values using header mapping
    const name = values[headerMapping['name']] || '';
    const rawCategory = values[headerMapping['category']] || '';
    const uom = values[headerMapping['uom']] || '';
    const unit_cost = parseFloat(values[headerMapping['unit_cost']] || '0') || undefined;
    const current_stock = parseFloat(values[headerMapping['current_stock']] || '0') || undefined;
    const minimum_threshold = parseFloat(values[headerMapping['minimum_threshold']] || '0') || undefined;
    const supplier_name = values[headerMapping['supplier_name']] || undefined;
    const sku = values[headerMapping['sku']] || undefined;
    const storage_location = values[headerMapping['storage_location']] || undefined;

    console.log(`Extracted data for line ${i}:`, { name, category: rawCategory, uom });

    // Validate required fields
    if (!name || !rawCategory || !uom) {
      console.log(`Skipping line ${i}: missing required fields (name: ${name}, category: ${rawCategory}, uom: ${uom})`);
      continue;
    }

    // Map category to valid database value
    const mappedCategory = mapCategoryToValidValue(rawCategory);
    if (!mappedCategory) {
      console.log(`Skipping line ${i}: invalid category "${rawCategory}" - could not map to valid category`);
      continue;
    }

    console.log(`Mapped category "${rawCategory}" to "${mappedCategory}"`);

    const ingredient: RawIngredientUpload = {
      name: name.trim(),
      category: mappedCategory,
      uom: uom.trim(),
      unit_cost,
      current_stock,
      minimum_threshold,
      supplier_name: supplier_name?.trim(),
      sku: sku?.trim(),
      storage_location: storage_location?.trim()
    };

    console.log(`Adding ingredient:`, ingredient);
    ingredients.push(ingredient);
  }

  console.log(`Parsed ${ingredients.length} valid ingredients`);
  return ingredients;
};

export const parseConversionRecipesCSV = (csvText: string): ConversionRecipeUpload[] => {
  console.log('Starting conversion recipe CSV parsing, input length:', csvText.length);
  
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  console.log('Total lines found:', lines.length);
  
  if (lines.length < 2) {
    console.log('Not enough lines in CSV');
    return [];
  }

  const headers = parseCSVLine(lines[0]);
  console.log('Headers found:', headers);
  
  const headerMapping = createConversionRecipeHeaderMapping(headers);
  console.log('Header mapping:', headerMapping);
  
  const recipes: ConversionRecipeUpload[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    console.log(`Processing line ${i}:`, values);
    
    if (values.length < headers.length) {
      console.log(`Skipping line ${i}: insufficient columns`);
      continue;
    }

    // Extract values using header mapping
    const name = values[headerMapping['name']] || '';
    const description = values[headerMapping['description']] || '';
    const input_item_name = values[headerMapping['input_item_name']] || '';
    const input_quantity = parseFloat(values[headerMapping['input_quantity']] || '0') || 0;
    const input_unit = values[headerMapping['input_unit']] || '';
    const output_product_name = values[headerMapping['output_product_name']] || '';
    const output_quantity = parseFloat(values[headerMapping['output_quantity']] || '0') || 0;
    const output_unit = values[headerMapping['output_unit']] || '';
    const instructions = values[headerMapping['instructions']] || '';

    console.log(`Extracted data for line ${i}:`, { 
      name, 
      input_item_name, 
      input_quantity, 
      input_unit, 
      output_product_name, 
      output_quantity, 
      output_unit 
    });

    // Validate required fields
    if (!name || !input_item_name || !input_unit || !output_product_name || !output_unit || input_quantity <= 0 || output_quantity <= 0) {
      console.log(`Skipping line ${i}: missing required fields or invalid quantities`);
      continue;
    }

    const recipe: ConversionRecipeUpload = {
      name: name.trim(),
      description: description.trim() || undefined,
      input_item_name: input_item_name.trim(),
      input_quantity,
      input_unit: input_unit.trim(),
      output_product_name: output_product_name.trim(),
      output_quantity,
      output_unit: output_unit.trim(),
      instructions: instructions.trim() || undefined
    };

    console.log(`Adding conversion recipe:`, recipe);
    recipes.push(recipe);
  }

  console.log(`Parsed ${recipes.length} valid conversion recipes`);
  return recipes;
};
