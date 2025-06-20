
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
  const validCategories = ['raw_materials', 'packaging_materials', 'supplies'];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    console.log(`Processing line ${i}:`, values);
    
    if (values.length < headers.length) {
      console.log(`Skipping line ${i}: insufficient columns`);
      continue;
    }

    // Extract values using header mapping
    const name = values[headerMapping['name']] || '';
    const category = values[headerMapping['category']] || '';
    const uom = values[headerMapping['uom']] || '';
    const unit_cost = parseFloat(values[headerMapping['unit_cost']] || '0') || undefined;
    const current_stock = parseFloat(values[headerMapping['current_stock']] || '0') || undefined;
    const minimum_threshold = parseFloat(values[headerMapping['minimum_threshold']] || '0') || undefined;
    const supplier_name = values[headerMapping['supplier_name']] || undefined;
    const sku = values[headerMapping['sku']] || undefined;
    const storage_location = values[headerMapping['storage_location']] || undefined;

    console.log(`Extracted data for line ${i}:`, { name, category, uom });

    // Validate required fields
    if (!name || !category || !uom) {
      console.log(`Skipping line ${i}: missing required fields (name: ${name}, category: ${category}, uom: ${uom})`);
      continue;
    }

    // Validate category
    if (!validCategories.includes(category as any)) {
      console.log(`Skipping line ${i}: invalid category "${category}"`);
      continue;
    }

    const ingredient: RawIngredientUpload = {
      name: name.trim(),
      category: category as 'raw_materials' | 'packaging_materials' | 'supplies',
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
