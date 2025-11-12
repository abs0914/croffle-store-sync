export interface RecipeUpload {
  name: string;
  category?: string;
  description?: string;
  yield_quantity: number;
  serving_size: number;
  instructions?: string;
  ingredients: {
    commissary_item_name: string;
    uom: string;
    quantity: number;
    cost_per_unit?: number;
  }[];
}

export interface RawIngredientUpload {
  name: string;
  category: 'raw_materials' | 'packaging_materials' | 'supplies' | 'finished_goods';
  uom: string;
  unit_cost?: number;
  current_stock?: number;
  minimum_threshold?: number;
  supplier_name?: string;
  sku?: string;
  storage_location?: string;
  business_category?: string; // Original business category name for display
}

export interface ConversionRecipeUpload {
  name: string;
  description?: string;
  input_item_name: string;
  input_quantity: number;
  input_unit: string;
  output_product_name: string;
  output_product_category: string;
  output_quantity: number;
  output_unit: string;
  output_unit_cost?: number;
  output_sku?: string;
  output_storage_location?: string;
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
const mapCategoryToValidValue = (category: string): 'raw_materials' | 'packaging_materials' | 'supplies' | 'finished_goods' | null => {
  const normalizedCategory = category.toLowerCase().trim();
  
  // Map common category variations
  const categoryMapping: Record<string, 'raw_materials' | 'packaging_materials' | 'supplies' | 'finished_goods'> = {
    // Raw materials variations
    'raw_materials': 'raw_materials',
    'raw_ingredients': 'raw_materials',
    'ingredients': 'raw_materials',
    'raw': 'raw_materials',
    
    // Business-specific categories - Raw Materials
    'croffle items': 'raw_materials',
    'sauces': 'raw_materials',
    'toppings': 'raw_materials',
    'coffee items': 'raw_materials',
    
    // Packaging materials variations
    'packaging_materials': 'packaging_materials',
    'packaging': 'packaging_materials',
    'packages': 'packaging_materials',
    'containers': 'packaging_materials',
    'boxes': 'packaging_materials',
    'miscellaneous': 'packaging_materials',
    
    // Supplies variations
    'supplies': 'supplies',
    'store_equipment': 'supplies',
    'equipment': 'supplies',
    'tools': 'supplies',
    'store_supplies': 'supplies',
    'misc': 'supplies',
    'equipment and supplies': 'supplies',
    
    // Finished goods variations
    'finished_goods': 'finished_goods',
    'finished': 'finished_goods',
    'products': 'finished_goods',
    'final_products': 'finished_goods'
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
      'name': ['name', 'ingredient_name', 'item_name', 'product_name', 'items'],
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

// Updated conversion recipe header mapping
const createConversionRecipeHeaderMapping = (headers: string[]): Record<string, number> => {
  const mapping: Record<string, number> = {};
  
  console.log('Raw CSV headers:', headers);
  
  headers.forEach((header, index) => {
    const normalized = normalizeHeader(header);
    console.log(`Header ${index}: "${header}" -> normalized: "${normalized}"`);
    
    // Updated variations to match your exact CSV format
    const variations: Record<string, string[]> = {
      'name': ['conversion_name', 'recipe_name', 'name', 'conversion'],
      'description': ['description', 'desc', 'notes', 'remarks'],
      'input_item_name': [
        'input_item', 'input_item_name', 'source_item', 'from_item', 
        'raw_material', 'ingredient'
      ],
      'input_quantity': [
        'input_qty', 'input_quantity', 'source_quantity', 'from_quantity', 
        'qty_in', 'quantity_in'
      ],
      'input_unit': [
        'input_uom', 'input_unit', 'source_unit', 'from_unit', 
        'unit_in', 'input_measure'
      ],
      'output_product_name': [
        'output_item', 'output_product_name', 'target_item', 'to_item', 
        'finished_product', 'output_product'
      ],
      'output_product_category': [
        'output_category', 'output_product_category', 'target_category', 
        'product_category'
      ],
      'output_quantity': [
        'output_qty', 'output_quantity', 'target_quantity', 'to_quantity', 
        'qty_out', 'quantity_out'
      ],
      'output_unit': [
        'output_uom', 'output_unit', 'target_unit', 'to_unit', 
        'unit_out', 'output_measure'
      ],
      'output_unit_cost': ['output_unit_cost', 'unit_cost', 'cost_per_unit', 'output_cost'],
      'output_sku': ['output_sku', 'sku', 'product_sku', 'item_code'],
      'output_storage_location': ['output_storage_location', 'storage_location', 'location', 'storage'],
      'instructions': ['conversion_notes', 'instructions', 'process', 'method', 'notes']
    };
    
    Object.entries(variations).forEach(([key, aliases]) => {
      if (aliases.includes(normalized)) {
        mapping[key] = index;
        console.log(`Mapped "${header}" (${normalized}) to field: ${key} at index ${index}`);
      }
    });
  });
  
  console.log('Final header mapping:', mapping);
  return mapping;
};

export const parseRecipesCSV = (csvText: string): RecipeUpload[] => {
  const lines = csvText.trim().split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase());
  const recipes: Map<string, RecipeUpload> = new Map();

  console.log('CSV headers:', headers);
  console.log('Raw first line:', lines[0]);
  console.log('Parsed headers:', headers);

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    
    if (values.length < headers.length) {
      console.log(`Skipping line ${i + 1}: insufficient columns`);
      continue;
    }

    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });

    const recipeName = row['recipe_name'] || row['name'] || row['recipe name'] || row['product'];
    const category = row['recipe_category'] || row['category'];
    const ingredientName = row['ingredient_name'] || row['ingredient name'];
    const uom = row['unit'] || row['uom'] || row['unit of measure'];
    const quantity = parseFloat(row['quantity'] || row['quantity used']) || 0;
    
    // More comprehensive cost parsing - handle exact column name from user's CSV
    const costValue = row['cost_per_unit'] || row['cost per unit'] || row['unit cost'] || row['cost'];
    let cost = 0;
    
    if (costValue && costValue.trim() !== '') {
      const numericValue = parseFloat(costValue.toString().replace(/[^0-9.-]/g, ''));
      if (!isNaN(numericValue)) {
        cost = numericValue;
      }
    }
    
    // Enhanced debugging - show first few rows in detail
    if (i <= 3) {
      console.log(`🔍 Line ${i + 1} DETAILED DEBUG:`, {
        recipeName,
        ingredientName,
        costValue: `"${costValue}"`,
        parsedCost: cost,
        allHeaders: headers,
        allValues: values,
        rowKeys: Object.keys(row),
        costRelatedKeys: Object.keys(row).filter(k => k.toLowerCase().includes('cost'))
      });
    }
    
    // Log cost parsing issues
    if (!costValue || costValue.trim() === '') {
      console.warn(`⚠️  Line ${i + 1}: Empty cost for "${ingredientName}" in "${recipeName}"`);
    } else if (cost === 0) {
      console.warn(`⚠️  Line ${i + 1}: Zero cost parsed from "${costValue}" for "${ingredientName}" in "${recipeName}"`);
    }

    console.log(`Processing line ${i + 1}:`, { recipeName, category, ingredientName, uom, quantity, cost, originalCostValue: costValue });

    if (!recipeName || !ingredientName || !uom || quantity <= 0) {
      console.log(`Skipping line ${i + 1}: missing required fields`);
      continue;
    }

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
      commissary_item_name: ingredientName,
      uom: uom,
      quantity: quantity,
      cost_per_unit: cost
    });
  }

  const parsedRecipes = Array.from(recipes.values()).filter(recipe => 
    recipe.ingredients.length > 0 && recipe.category
  );

  console.log(`Parsed ${parsedRecipes.length} recipes with ingredients:`, parsedRecipes);
  
  return parsedRecipes;
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

    const name = values[headerMapping['name']] || '';
    const rawCategory = values[headerMapping['category']] || '';
    const uom = values[headerMapping['uom']] || '';
    const unit_cost = parseFloat(values[headerMapping['unit_cost']] || '0') || undefined;
    const current_stock = parseFloat(values[headerMapping['current_stock']] || '0') || undefined;
    const minimum_threshold = parseFloat(values[headerMapping['minimum_threshold']] || '0') || undefined;
    const supplier_name = values[headerMapping['supplier_name']] || undefined;
    const sku = values[headerMapping['sku']] || undefined;
    const storage_location = values[headerMapping['storage_location']] || undefined;

    console.log(`Extracted data for line ${i}:`, { name, category: rawCategory, uom, unit_cost });

    if (!name || !rawCategory || !uom) {
      console.log(`Skipping line ${i}: missing required fields (name: ${name}, category: ${rawCategory}, uom: ${uom})`);
      continue;
    }

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
      storage_location: storage_location?.trim(),
      business_category: rawCategory.trim() // Preserve original business category
    };

    console.log(`Adding ingredient:`, ingredient);
    ingredients.push(ingredient);
  }

  console.log(`Parsed ${ingredients.length} valid ingredients`);
  return ingredients;
};

export const parseConversionRecipesCSV = (csvContent: string): ConversionRecipeUpload[] => {
  try {
    console.log('Starting conversion recipe CSV parsing...');
    
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      console.warn('CSV file appears to be empty or has no data rows');
      return [];
    }

    const headers = parseCSVLine(lines[0]);
    console.log('CSV Headers found:', headers);
    
    const headerMapping = createConversionRecipeHeaderMapping(headers);
    console.log('Header mapping result:', headerMapping);
    
    const requiredFields = ['name', 'input_item_name', 'input_quantity', 'input_unit', 'output_product_name', 'output_quantity', 'output_unit'];
    const missingFields = requiredFields.filter(field => headerMapping[field] === undefined);
    
    if (missingFields.length > 0) {
      console.error('Missing required headers after mapping:', missingFields);
      console.log('Available header mappings:', Object.keys(headerMapping));
      console.log('Available normalized headers:', headers.map(h => normalizeHeader(h)));
      throw new Error(`Missing required columns. Expected fields not found: ${missingFields.join(', ')}. Please check your CSV headers match the template format.`);
    }

    const recipes: ConversionRecipeUpload[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      console.log(`Processing row ${i + 1}:`, values);
      
      if (values.every(v => !v.trim())) {
        console.log(`Skipping empty row ${i + 1}`);
        continue;
      }
      
      try {
        const recipe: ConversionRecipeUpload = {
          name: values[headerMapping['name']]?.trim() || '',
          description: values[headerMapping['description']]?.trim() || '',
          input_item_name: values[headerMapping['input_item_name']]?.trim() || '',
          input_quantity: parseFloat(values[headerMapping['input_quantity']] || '0'),
          input_unit: values[headerMapping['input_unit']]?.trim() || '',
          output_product_name: values[headerMapping['output_product_name']]?.trim() || '',
          output_product_category: values[headerMapping['output_product_category']]?.trim() || 'raw_materials',
          output_quantity: parseFloat(values[headerMapping['output_quantity']] || '0'),
          output_unit: values[headerMapping['output_unit']]?.trim() || '',
          output_unit_cost: parseFloat(values[headerMapping['output_unit_cost']] || '0') || undefined,
          output_sku: values[headerMapping['output_sku']]?.trim() || undefined,
          output_storage_location: values[headerMapping['output_storage_location']]?.trim() || undefined,
          instructions: values[headerMapping['instructions']]?.trim() || undefined
        };

        console.log(`Parsed recipe data for row ${i + 1}:`, recipe);

        if (!recipe.name || !recipe.input_item_name || !recipe.output_product_name) {
          console.warn(`Skipping row ${i + 1}: Missing required fields - name: "${recipe.name}", input_item: "${recipe.input_item_name}", output_product: "${recipe.output_product_name}"`);
          continue;
        }

        if (recipe.input_quantity <= 0 || recipe.output_quantity <= 0) {
          console.warn(`Skipping row ${i + 1}: Invalid quantities - input: ${recipe.input_quantity}, output: ${recipe.output_quantity}`);
          continue;
        }

        console.log(`Adding valid conversion recipe: ${recipe.name}`);
        recipes.push(recipe);
        
      } catch (error) {
        console.error(`Error parsing row ${i + 1}:`, error);
        continue;
      }
    }
    
    console.log(`Successfully parsed ${recipes.length} valid conversion recipes`);
    return recipes;
    
  } catch (error) {
    console.error('Error parsing conversion recipes CSV:', error);
    throw error;
  }
};
