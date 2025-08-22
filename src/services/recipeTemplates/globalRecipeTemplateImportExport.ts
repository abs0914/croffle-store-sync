import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RecipeTemplate, RecipeTemplateIngredientInput } from "@/services/recipeManagement/types";

export interface RecipeTemplateCSVRow {
  name: string;
  recipe_category?: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit: number;
  ingredient_category?: string;
}

export const globalRecipeTemplateImportExport = {
  // Generate CSV from recipe templates
  generateCSV: async (templates: RecipeTemplate[]): Promise<string> => {
    const headers = ['name', 'recipe_category', 'ingredient_name', 'quantity', 'unit', 'cost_per_unit', 'ingredient_category'];
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
          
          const row = [
            `"${normalizeText(template.name).replace(/"/g, '""')}"`,
            `"${recipeCategory}"`,
            `"${normalizeText(ingredient.ingredient_name).replace(/"/g, '""')}"`,
            ingredient.quantity.toString(),
            `"${normalizeText(ingredient.unit).replace(/"/g, '""')}"`,
            ingredient.cost_per_unit.toString(),
            `"${formatCategory(ingredientCategory)}"`
          ];
          csvRows.push(row.join(','));
        });
      } else {
        // Template without ingredients
        const row = [
          `"${normalizeText(template.name).replace(/"/g, '""')}"`,
          `"${recipeCategory}"`,
          '""', // empty ingredient_name
          '0', // zero quantity
          '""', // empty unit
          '0', // zero cost
          '""' // empty ingredient category
        ];
        csvRows.push(row.join(','));
      }
    });

    return csvRows.join('\n');
  },

  // Generate CSV template
  generateCSVTemplate: (): string => {
    const headers = ['name', 'recipe_category', 'ingredient_name', 'quantity', 'unit', 'cost_per_unit', 'ingredient_category'];
    const exampleRows = [
      ['Americano (Hot)', 'Espresso', 'Coffee Beans', '18', 'g', '12.00', 'Base Ingredient'],
      ['Americano (Hot)', 'Espresso', 'Water', '120', 'ml', '0.50', 'Base Ingredient'],
      ['Cappuccino (Hot)', 'Espresso', 'Coffee Beans', '18', 'g', '12.00', 'Base Ingredient'],
      ['Cappuccino (Hot)', 'Espresso', 'Milk', '150', 'ml', '8.00', 'Base Ingredient'],
      ['Blueberry Croffle', 'Fruity Croffle', 'Croffle Base', '1', 'pcs', '25.00', 'Base Ingredient'],
      ['Blueberry Croffle', 'Fruity Croffle', 'Blueberry Sauce', '30', 'ml', '15.00', 'Premium Topping'],
      ['Biscoff Crushed', 'Add-on', 'Biscoff Cookies', '30', 'g', '8.50', 'Premium Topping']
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
    const expectedHeaders = ['name', 'recipe_category', 'ingredient_name', 'quantity', 'unit', 'cost_per_unit', 'ingredient_category'];
    const headers = headerLine.split(',').map(h => h.replace(/"/g, '').trim().toLowerCase());
    
    // Validate headers
    const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`Missing required headers: ${missingHeaders.join(', ')}`);
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

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = parseCSVLine(line);
      if (values.length !== headers.length) {
        console.warn(`Skipping row ${i + 1}: column count mismatch`);
        continue;
      }

      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.replace(/"/g, '').trim() || '';
      });

      const recipeName = row.name;
      if (!recipeName) {
        console.warn(`Skipping row ${i + 1}: missing recipe name`);
        continue;
      }

      // Get or create recipe entry
      if (!recipeMap.has(recipeName)) {
        recipeMap.set(recipeName, {
          template: {
            name: recipeName,
            category_name: row.recipe_category || 'Other',
            description: `Imported recipe: ${recipeName}`,
            instructions: 'Please add preparation instructions.',
            yield_quantity: 1,
            serving_size: 1,
            created_by: user.id,
            is_active: true,
            version: 1,
            ingredients: []
          },
          ingredients: []
        });
      }

      // Add ingredient if provided
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

    // Convert to template array and create in database
    const templates: RecipeTemplate[] = [];
    
    for (const [recipeName, recipeData] of recipeMap.entries()) {
      try {
        // Create recipe template
        const { data: template, error: templateError } = await supabase
          .from('recipe_templates')
          .insert({
            name: recipeData.template.name!,
            category_name: recipeData.template.category_name,
            description: recipeData.template.description,
            instructions: recipeData.template.instructions,
            yield_quantity: recipeData.template.yield_quantity!,
            serving_size: recipeData.template.serving_size,
            created_by: recipeData.template.created_by!,
            is_active: recipeData.template.is_active!,
            version: recipeData.template.version!
          })
          .select()
          .single();

        if (templateError) {
          console.error(`Error creating template ${recipeName}:`, templateError);
          continue;
        }

        // Create ingredients if any
        if (recipeData.ingredients.length > 0) {
          const ingredientData = recipeData.ingredients.map(ingredient => ({
            recipe_template_id: template.id,
            ingredient_name: ingredient.ingredient_name,
            quantity: ingredient.quantity,
            unit: ingredient.unit,
            cost_per_unit: ingredient.cost_per_unit,
            location_type: ingredient.location_type || 'all',
            uses_store_inventory: false // Global templates don't link to specific store inventory
          }));

          const { error: ingredientError } = await supabase
            .from('recipe_template_ingredients')
            .insert(ingredientData);

          if (ingredientError) {
            console.error(`Error creating ingredients for ${recipeName}:`, ingredientError);
          }
        }

        templates.push({
          ...template,
          ingredients: recipeData.ingredients.map(ing => ({
            ...ing,
            recipe_template_id: template.id,
            uses_store_inventory: false
          }))
        });

      } catch (error) {
        console.error(`Error processing recipe ${recipeName}:`, error);
      }
    }

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