import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RecipeTemplate, RecipeTemplateIngredientInput } from "@/services/recipeManagement/types";

export interface RecipeTemplateCSVRow {
  recipe_name: string;
  recipe_category?: string;
  combo_main?: string;
  combo_add_on?: string;
  ingredient_name?: string;
  quantity?: number;
  unit?: string;
  cost_per_unit?: number;
  ingredient_category?: string;
  suggested_price?: number;
}

export const globalRecipeTemplateImportExport = {
  // Generate CSV from recipe templates
  generateCSV: async (templates: RecipeTemplate[]): Promise<string> => {
    const headers = ['recipe_name', 'recipe_category', 'combo_main', 'combo_add_on', 'ingredient_name', 'quantity', 'unit', 'cost_per_unit', 'ingredient_category', 'suggested_price'];
    const csvRows = [headers.join(',')];

    // Format category helper
    const formatCategory = (category?: string) => category?.replace(/[,"]/g, '').trim() || 'Other';

    templates.forEach(template => {
      const recipeCategory = template.category_name || 'Other';

      if (template.ingredients && template.ingredients.length > 0) {
        template.ingredients.forEach(ingredient => {
          // For global templates, we don't have inventory stock categories
          // We'll use a generic ingredient category or derive from ingredient name
          const ingredientCategory = deriveIngredientCategory(ingredient.ingredient_name);
          
          // Determine if this is a combo recipe based on category
          const isCombo = recipeCategory.toLowerCase().includes('combo');
          const comboMain = isCombo ? detectComboMain(template.name) : '';
          const comboAddOn = isCombo ? detectComboAddOn(template.name) : '';
          
          const row = [
            `"${normalizeText(template.name).replace(/"/g, '""')}"`,
            `"${recipeCategory}"`,
            `"${comboMain}"`,
            `"${comboAddOn}"`,
            `"${normalizeText(ingredient.ingredient_name).replace(/"/g, '""')}"`,
            ingredient.quantity.toString(),
            `"${normalizeText(ingredient.unit).replace(/"/g, '""')}"`,
            ingredient.cost_per_unit.toString(),
            `"${formatCategory(ingredientCategory)}"`,
            (template.suggested_price || 0).toString()
          ];
          csvRows.push(row.join(','));
        });
      } else {
        // Template without ingredients
        const isCombo = recipeCategory.toLowerCase().includes('combo');
        const comboMain = isCombo ? detectComboMain(template.name) : '';
        const comboAddOn = isCombo ? detectComboAddOn(template.name) : '';
        
        const row = [
          `"${normalizeText(template.name).replace(/"/g, '""')}"`,
          `"${recipeCategory}"`,
          `"${comboMain}"`,
          `"${comboAddOn}"`,
          '""', // empty ingredient_name
          '0', // zero quantity
          '""', // empty unit
          '0', // zero cost
          '""', // empty ingredient category
          (template.suggested_price || 0).toString()
        ];
        csvRows.push(row.join(','));
      }
    });

    return csvRows.join('\n');
  },

  // Generate CSV template
  generateCSVTemplate: (): string => {
    const headers = ['recipe_name', 'recipe_category', 'suggested_price'];
    const exampleRows = [
      ['16Oz Hot Cups', 'Add-on', '0'],
      ['Biscoff Crushed', 'Add-on', '10'],
      ['Caramel Sauce', 'Add-on', '6'],
      ['Bottled Water', 'Beverages', '20'],
      ['Matcha Blended', 'Blended', '90'],
      ['Caramel Delight Croffle', 'Classic', '125'],
      ['Iced Tea', 'Cold', '60'],
      ['Americano Hot', 'Espresso', '65'],
      ['Americano Iced', 'Espresso', '70'],
      ['Blueberry Croffle', 'Fruity', '125'],
      ['Glaze Croffle', 'Glaze', '79'],
      ['Mini Croffle', 'Mix & Match', '65'],
      ['Croffle Overload', 'Mix & Match', '99'],
      ['Biscoff Croffle', 'Premium', '125']
    ];

    const csvRows = [headers.join(',')];
    exampleRows.forEach(row => {
      csvRows.push(row.map(cell => `"${cell}"`).join(','));
    });

    return csvRows.join('\n');
  },

  // Parse CSV and create recipe templates
  parseCSV: async (csvData: string): Promise<RecipeTemplate[]> => {
    console.log('Starting CSV parsing for recipe templates...');
    
    const lines = csvData.trim().split('\n');
    if (lines.length === 0) {
      throw new Error('CSV file is empty');
    }

    // Parse header
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    
    // Support both simple format (recipe_name, recipe_category, suggested_price) 
    // and complex format (with ingredients)
    const hasSimpleFormat = headers.includes('recipe_name') && headers.includes('recipe_category') && headers.includes('suggested_price') && !headers.includes('ingredient_name');
    const hasComplexFormat = headers.includes('ingredient_name') && headers.includes('quantity') && headers.includes('unit');
    
    // Support legacy 'name' header as well
    const hasLegacyName = headers.includes('name');
    const hasNewRecipeName = headers.includes('recipe_name');
    
    if (!hasLegacyName && !hasNewRecipeName) {
      throw new Error('Missing required header: recipe_name (or legacy name)');
    }
    
    // Validate required headers based on format
    if (hasSimpleFormat) {
      const requiredHeaders = ['recipe_name', 'recipe_category', 'suggested_price'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers for simple format: ${missingHeaders.join(', ')}`);
      }
      console.log('📋 Detected simple CSV format (products only)');
    } else if (hasComplexFormat) {
      const requiredHeaders = ['ingredient_name', 'quantity', 'unit', 'cost_per_unit'];
      const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
      if (missingHeaders.length > 0) {
        throw new Error(`Missing required headers for complex format: ${missingHeaders.join(', ')}`);
      }
      console.log('📋 Detected complex CSV format (with ingredients)');
    } else {
      throw new Error('Invalid CSV format. Expected either simple format (recipe_name, recipe_category, suggested_price) or complex format (with ingredients)');
    }

    // Get current user for created_by field
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('Authentication required');
    }

    // Parse data rows
    const recipeMap = new Map<string, {
      template: Partial<RecipeTemplate>;
      ingredients: RecipeTemplateIngredientInput[];
    }>();
    
    // Track pricing validation for multi-ingredient products
    const recipePriceMap = new Map<string, number>();
    const priceWarnings: string[] = [];
    const importStats = {
      totalRows: 0,
      uniqueRecipes: 0,
      priceConflicts: 0
    };

      for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      importStats.totalRows++;

      const values = parseCSVLine(line);
      if (values.length !== headers.length) {
        console.warn(`Skipping row ${i + 1}: column count mismatch`);
        continue;
      }

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.replace(/"/g, '').trim() || '';
      });

      const recipeName = row.recipe_name || row.name; // Support both new and legacy headers
      if (!recipeName) {
        console.warn(`Skipping row ${i + 1}: missing recipe name`);
        continue;
      }
      
      // Validate pricing consistency for the same recipe
      const currentPrice = parseFloat(row.suggested_price) || 0;
      if (recipePriceMap.has(recipeName)) {
        const existingPrice = recipePriceMap.get(recipeName)!;
        if (existingPrice !== currentPrice) {
          const warningMsg = `Price conflict for "${recipeName}": Found ${existingPrice} and ${currentPrice}. Using first encountered price (${existingPrice}).`;
          priceWarnings.push(warningMsg);
          importStats.priceConflicts++;
          console.warn(warningMsg);
        }
      } else {
        recipePriceMap.set(recipeName, currentPrice);
      }

      // Handle simple format (product catalog only)
      if (hasSimpleFormat) {
        const suggestedPrice = recipePriceMap.get(recipeName)!; // Use validated price
        const category = row.recipe_category || 'Other';
        
        // Only create if not already processed (avoid duplicates)
        if (!recipeMap.has(recipeName)) {
          const recipeData = {
            template: {
              name: recipeName,
              category_name: category,
              description: `${category} product: ${recipeName}`,
              instructions: 'Product template - no preparation required',
              yield_quantity: 1,
              serving_size: 1,
              created_by: user.id,
              is_active: true,
              version: 1,
              ingredients: [],
              suggested_price: suggestedPrice
            },
            ingredients: []
          };
          
          recipeMap.set(recipeName, recipeData);
          importStats.uniqueRecipes++;
        }
        continue; // Skip ingredient processing for simple format
      }

      // Handle complex format (with ingredients) - existing logic
      const comboMain = row.combo_main || '';
      const comboAddOn = row.combo_add_on || '';
      const isCombo = comboMain || comboAddOn || recipeName.toLowerCase().includes('combo');
      
      // Generate combo description if this is a combo recipe
      let description = `Imported recipe: ${recipeName}`;
      let instructions = 'Please add preparation instructions.';
      
      if (isCombo && comboMain && comboAddOn) {
        description = `Combo recipe featuring ${comboMain} with ${comboAddOn}`;
        instructions = `1. Prepare ${comboMain}\n2. Prepare ${comboAddOn}\n3. Serve together as combo meal`;
      }

      // Get suggested price for the recipe (use validated price or fallback to combo detection)
      const suggestedPrice = recipePriceMap.get(recipeName) || detectComboPrice(recipeName, comboMain, comboAddOn);

      // Get or create recipe entry
      if (!recipeMap.has(recipeName)) {
        recipeMap.set(recipeName, {
          template: {
            name: recipeName,
            category_name: isCombo ? 'Combo' : (row.recipe_category || 'Other'),
            description: description,
            instructions: instructions,
            yield_quantity: 1,
            serving_size: 1,
            created_by: user.id,
            is_active: true,
            version: 1,
            ingredients: [],
            suggested_price: suggestedPrice
          },
          ingredients: []
        });
        importStats.uniqueRecipes++;
      }

      // Add ingredient if provided (only for complex format)
      const ingredientName = row.ingredient_name;
      if (ingredientName) {
        const quantity = parseFloat(row.quantity) || 0;
        const costPerUnit = parseFloat(row.cost_per_unit) || 0;

        if (quantity > 0) {
          const recipeData = recipeMap.get(recipeName)!;
          recipeData.ingredients.push({
            ingredient_name: ingredientName,
            quantity: quantity,
            unit: row.unit || 'pcs',
            cost_per_unit: costPerUnit,
            location_type: 'all'
          });
        }
      }
    }

    // Convert to template array and create in database using batch operations
    console.log(`⚡ Starting batch import of ${recipeMap.size} recipe templates...`);
    const templates: RecipeTemplate[] = [];
    
    // Prepare batch data for templates
    const templateBatch = [];
    const ingredientBatch = [];
    
    for (const [recipeName, recipeData] of recipeMap.entries()) {
      templateBatch.push({
        name: recipeData.template.name!,
        category_name: recipeData.template.category_name,
        description: recipeData.template.description,
        instructions: recipeData.template.instructions,
        yield_quantity: recipeData.template.yield_quantity!,
        serving_size: recipeData.template.serving_size,
        created_by: recipeData.template.created_by!,
        is_active: recipeData.template.is_active!,
        version: recipeData.template.version!,
        suggested_price: recipeData.template.suggested_price || 0 // FIX: Ensure price is preserved
      });
    }

    // Batch create templates
    console.log(`⚡ Creating ${templateBatch.length} templates in batch...`);
    const { data: createdTemplates, error: batchTemplateError } = await supabase
      .from('recipe_templates')
      .insert(templateBatch)
      .select();

    if (batchTemplateError) {
      console.error('❌ Batch template creation failed:', batchTemplateError);
      throw new Error(`Failed to create recipe templates: ${batchTemplateError.message}`);
    }

    console.log(`✅ Successfully created ${createdTemplates.length} templates`);

    // Prepare batch data for ingredients
    let templateIndex = 0;
    for (const [recipeName, recipeData] of recipeMap.entries()) {
      const template = createdTemplates[templateIndex];
      
      if (recipeData.ingredients.length > 0) {
        const ingredientData = recipeData.ingredients.map(ingredient => ({
          recipe_template_id: template.id,
          ingredient_name: ingredient.ingredient_name,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost_per_unit, // Preserve zero costs
          location_type: ingredient.location_type || 'all',
          uses_store_inventory: false
        }));
        
        ingredientBatch.push(...ingredientData);
      }

      // Build final template object
      templates.push({
        ...template,
        ingredients: recipeData.ingredients.map(ing => ({
          ...ing,
          recipe_template_id: template.id,
          uses_store_inventory: false
        }))
      });

      templateIndex++;
    }

    // Batch create ingredients if any
    if (ingredientBatch.length > 0) {
      console.log(`⚡ Creating ${ingredientBatch.length} ingredients in batch...`);
      const { error: batchIngredientError } = await supabase
        .from('recipe_template_ingredients')
        .insert(ingredientBatch);

      if (batchIngredientError) {
        console.error('❌ Batch ingredient creation failed:', batchIngredientError);
        // Clean up created templates on ingredient failure
        await supabase
          .from('recipe_templates')
          .delete()
          .in('id', createdTemplates.map(t => t.id));
        throw new Error(`Failed to create ingredients: ${batchIngredientError.message}`);
      }
      console.log(`✅ Successfully created ${ingredientBatch.length} ingredients`);
    }

    // Show import summary with warnings
    console.log(`Import Summary: ${importStats.totalRows} rows processed, ${importStats.uniqueRecipes} unique recipes created`);
    
    if (priceWarnings.length > 0) {
      console.warn(`⚠️  Price Validation Warnings (${importStats.priceConflicts}):`);
      priceWarnings.forEach(warning => console.warn(warning));
      toast.warning(`Import completed with ${importStats.priceConflicts} price conflicts. Check console for details.`);
    }
    
    toast.success(`Successfully imported ${templates.length} recipe templates from ${importStats.totalRows} rows`);
    console.log(`Successfully imported ${templates.length} recipe templates`);
    return templates;
  }
};

// Helper functions
function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^\w\s]/g, '') // Remove special characters except spaces
    .trim();
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
}

function deriveIngredientCategory(ingredientName: string): string {
  const name = ingredientName.toLowerCase();
  
  // Common ingredient categories
  if (name.includes('coffee') || name.includes('espresso') || name.includes('beans')) {
    return 'Coffee';
  }
  if (name.includes('milk') || name.includes('cream') || name.includes('dairy')) {
    return 'Dairy';
  }
  if (name.includes('sugar') || name.includes('syrup') || name.includes('honey')) {
    return 'Sweetener';
  }
  if (name.includes('flour') || name.includes('bread') || name.includes('croffle')) {
    return 'Bakery';
  }
  if (name.includes('sauce') || name.includes('topping') || name.includes('crushed')) {
    return 'Topping';
  }
  if (name.includes('fruit') || name.includes('berry') || name.includes('apple') || name.includes('banana')) {
    return 'Fruit';
  }
  
  return 'Base Ingredient';
}

// Helper functions for combo detection
function detectComboMain(recipeName: string): string {
  const name = recipeName.toLowerCase();
  
  // Detect croffle types
  if (name.includes('mini croffle')) return 'Mini Croffle';
  if (name.includes('glaze croffle')) return 'Glaze Croffle';
  if (name.includes('regular croffle')) return 'Regular Croffle';
  
  // Add more main item patterns as needed
  return '';
}

function detectComboAddOn(recipeName: string): string {
  const name = recipeName.toLowerCase();
  
  // Detect espresso types
  if (name.includes('hot americano') || name.includes('hot espresso')) return 'Hot Americano';
  if (name.includes('ice americano') || name.includes('iced americano') || name.includes('ice espresso')) return 'Ice Americano';
  if (name.includes('hot cappuccino')) return 'Hot Cappuccino';
  if (name.includes('ice cappuccino') || name.includes('iced cappuccino')) return 'Ice Cappuccino';
  
  // Add more add-on patterns as needed
  return '';
}

// Helper function to detect combo pricing based on combo components
function detectComboPrice(recipeName: string, comboMain: string, comboAddOn: string): number {
  // If explicit combo components are provided, use them for pricing
  if (comboMain && comboAddOn) {
    const main = comboMain.toLowerCase();
    const addOn = comboAddOn.toLowerCase();
    
    // Mini Croffle combinations
    if (main.includes('mini croffle')) {
      if (addOn.includes('hot') && (addOn.includes('americano') || addOn.includes('espresso'))) {
        return 110;
      }
      if ((addOn.includes('ice') || addOn.includes('iced')) && (addOn.includes('americano') || addOn.includes('espresso'))) {
        return 115;
      }
    }
    
    // Glaze Croffle combinations
    if (main.includes('glaze croffle')) {
      if (addOn.includes('hot') && (addOn.includes('americano') || addOn.includes('espresso'))) {
        return 125;
      }
      if ((addOn.includes('ice') || addOn.includes('iced')) && (addOn.includes('americano') || addOn.includes('espresso'))) {
        return 130;
      }
    }
    
    // Regular Croffle combinations
    if (main.includes('regular croffle')) {
      if (addOn.includes('hot') && (addOn.includes('americano') || addOn.includes('espresso'))) {
        return 170;
      }
      if ((addOn.includes('ice') || addOn.includes('iced')) && (addOn.includes('americano') || addOn.includes('espresso'))) {
        return 175;
      }
    }
  }
  
  // Fallback: detect from recipe name if no explicit combo components
  const name = recipeName.toLowerCase();
  
  // Mini Croffle + Hot Espresso/Americano = 110
  if (name.includes('mini croffle') && name.includes('hot') && (name.includes('americano') || name.includes('espresso'))) {
    return 110;
  }
  
  // Mini Croffle + Ice Espresso/Americano = 115
  if (name.includes('mini croffle') && (name.includes('ice') || name.includes('iced')) && (name.includes('americano') || name.includes('espresso'))) {
    return 115;
  }
  
  // Glaze Croffle + Hot Espresso/Americano = 125
  if (name.includes('glaze croffle') && name.includes('hot') && (name.includes('americano') || name.includes('espresso'))) {
    return 125;
  }
  
  // Glaze Croffle + Ice Espresso/Americano = 130
  if (name.includes('glaze croffle') && (name.includes('ice') || name.includes('iced')) && (name.includes('americano') || name.includes('espresso'))) {
    return 130;
  }
  
  // Regular Croffle + Hot Espresso/Americano = 170
  if (name.includes('regular croffle') && name.includes('hot') && (name.includes('americano') || name.includes('espresso'))) {
    return 170;
  }
  
  // Regular Croffle + Ice Espresso/Americano = 175
  if (name.includes('regular croffle') && (name.includes('ice') || name.includes('iced')) && (name.includes('americano') || name.includes('espresso'))) {
    return 175;
  }
  
  // Default fallback for non-combo items or unknown combos
  return 0;
}