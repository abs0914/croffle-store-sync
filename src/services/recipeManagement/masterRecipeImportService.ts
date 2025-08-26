import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface MasterRecipeImportResult {
  success: boolean;
  templatesCreated: number;
  ingredientsMapped: number;
  unmappedIngredients: string[];
  errors: string[];
  warnings: string[];
}

export interface MasterRecipeData {
  name: string;
  description?: string;
  category_name?: string;
  instructions?: string;
  yield_quantity: number;
  serving_size?: number;
  ingredients: MasterRecipeIngredient[];
}

export interface MasterRecipeIngredient {
  ingredient_name: string;
  quantity: number;
  unit: string;
  cost_per_unit?: number;
  notes?: string;
}

export interface IngredientMapping {
  masterIngredientName: string;
  storeInventoryId: string;
  storeItemName: string;
  conversionFactor: number;
  confidence: 'exact' | 'partial' | 'suggested' | 'manual';
}

export class MasterRecipeImportService {
  
  /**
   * Parse CSV content and extract master recipe data
   */
  static async parseCSVContent(csvContent: string): Promise<MasterRecipeData[]> {
    const lines = csvContent.split('\n').map(line => line.trim()).filter(line => line);
    if (lines.length < 2) {
      throw new Error('CSV file must contain at least a header row and one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    console.log('CSV Headers:', headers);
    
    const recipes: MasterRecipeData[] = [];
    let currentRecipe: MasterRecipeData | null = null;

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim().replace(/"/g, ''));
      console.log('Processing row:', values);
      
      // Check if this is a new recipe (recipe name is not empty)
      const recipeName = values[0]; // name column
      if (recipeName && recipeName !== currentRecipe?.name) {
        // Save previous recipe if exists
        if (currentRecipe) {
          recipes.push(currentRecipe);
        }
        
        // Start new recipe - matching your CSV format
        currentRecipe = {
          name: recipeName,
          description: '',
          category_name: values[1] || 'General', // recipe_category
          instructions: 'Follow standard preparation procedures',
          yield_quantity: 1,
          serving_size: 1,
          ingredients: []
        };
      }

      // Add ingredient to current recipe - matching your CSV format
      if (currentRecipe && values[4]) { // ingredient_name column (index 4)
        const quantityUnit = values[5] || '1 piece'; // quantity_unit column
        const parts = quantityUnit.split(' ');
        const quantity = parseFloat(parts[0]) || 1;
        const unit = parts.slice(1).join(' ') || 'piece';
        const costPerUnit = parseFloat(values[6]) || 0; // cost_per_unit column (index 6)
        
        console.log(`Ingredient: ${values[4]}, Quantity: ${quantity}, Unit: ${unit}, Cost: ${costPerUnit}`);
        
        if (costPerUnit === 0) {
          console.warn(`Zero cost detected for ingredient: ${values[4]} in recipe: ${recipeName}`);
        }
        
        currentRecipe.ingredients.push({
          ingredient_name: values[4], // ingredient_name
          quantity: quantity,
          unit: unit,
          cost_per_unit: costPerUnit,
          notes: values[7] || '' // ingredient_category as notes
        });
      }
    }

    // Add the last recipe
    if (currentRecipe) {
      recipes.push(currentRecipe);
    }

    console.log('Parsed recipes:', recipes);
    return recipes;
  }

  /**
   * Generate ingredient mappings by matching master recipe ingredients to store inventory
   */
  static async generateIngredientMappings(
    masterIngredients: string[]
  ): Promise<IngredientMapping[]> {
    try {
      // Get all store inventory items that are recipe-compatible
      const { data: inventoryItems, error } = await supabase
        .from('inventory_stock')
        .select('id, item, unit, cost, recipe_compatible')
        .eq('is_active', true)
        .eq('recipe_compatible', true);

      if (error) throw error;

      const mappings: IngredientMapping[] = [];

      for (const masterIngredient of masterIngredients) {
        const masterLower = masterIngredient.toLowerCase().trim();
        
        // Try exact match first
        let bestMatch = inventoryItems?.find(item => 
          item.item.toLowerCase().trim() === masterLower
        );
        
        let confidence: 'exact' | 'partial' | 'suggested' | 'manual' = 'exact';

        // Try partial match if no exact match
        if (!bestMatch) {
          bestMatch = inventoryItems?.find(item => 
            item.item.toLowerCase().includes(masterLower) ||
            masterLower.includes(item.item.toLowerCase())
          );
          confidence = 'partial';
        }

        // Try fuzzy matching for common ingredient variations
        if (!bestMatch) {
          bestMatch = this.findByFuzzyMatch(masterIngredient, inventoryItems || []);
          confidence = 'suggested';
        }

        if (bestMatch) {
          mappings.push({
            masterIngredientName: masterIngredient,
            storeInventoryId: bestMatch.id,
            storeItemName: bestMatch.item,
            conversionFactor: 1.0,
            confidence
          });
        }
      }

      return mappings;
    } catch (error) {
      console.error('Error generating ingredient mappings:', error);
      return [];
    }
  }

  /**
   * Fuzzy matching for ingredient variations
   */
  private static findByFuzzyMatch(masterIngredient: string, inventoryItems: any[]): any | null {
    const masterLower = masterIngredient.toLowerCase();
    
    // Common ingredient mappings
    const commonMappings: Record<string, string[]> = {
      'milk': ['milk', 'fresh milk', 'whole milk'],
      'cream': ['cream', 'heavy cream', 'whipping cream'],
      'sugar': ['sugar', 'white sugar', 'granulated sugar'],
      'flour': ['flour', 'all purpose flour', 'wheat flour'],
      'butter': ['butter', 'unsalted butter', 'salted butter'],
      'egg': ['egg', 'eggs', 'fresh egg'],
      'vanilla': ['vanilla', 'vanilla extract', 'vanilla essence'],
      'chocolate': ['chocolate', 'dark chocolate', 'cocoa'],
      'cheese': ['cheese', 'cheddar', 'mozzarella']
    };

    for (const [key, variations] of Object.entries(commonMappings)) {
      if (variations.some(variation => masterLower.includes(variation))) {
        return inventoryItems.find(item => 
          variations.some(variation => 
            item.item.toLowerCase().includes(variation)
          )
        );
      }
    }

    return null;
  }

  /**
   * Import master recipes with ingredient mapping
   */
  static async importMasterRecipes(
    masterRecipes: MasterRecipeData[],
    ingredientMappings: IngredientMapping[]
  ): Promise<MasterRecipeImportResult> {
    const result: MasterRecipeImportResult = {
      success: false,
      templatesCreated: 0,
      ingredientsMapped: 0,
      unmappedIngredients: [],
      errors: [],
      warnings: []
    };

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('User authentication required');
      }

      // Create mapping lookup
      const mappingLookup = new Map(
        ingredientMappings.map(m => [m.masterIngredientName.toLowerCase(), m])
      );

      for (const masterRecipe of masterRecipes) {
        try {
          // Create recipe template
          const { data: template, error: templateError } = await supabase
            .from('recipe_templates')
            .insert({
              name: masterRecipe.name,
              description: masterRecipe.description,
              category_name: masterRecipe.category_name,
              instructions: masterRecipe.instructions,
              yield_quantity: masterRecipe.yield_quantity,
              serving_size: masterRecipe.serving_size,
              created_by: user.id,
              is_active: true,
              version: 1
            })
            .select()
            .single();

          if (templateError) {
            result.errors.push(`Failed to create template ${masterRecipe.name}: ${templateError.message}`);
            continue;
          }

          // Process ingredients
          const ingredientData = [];
          for (const ingredient of masterRecipe.ingredients) {
            const mapping = mappingLookup.get(ingredient.ingredient_name.toLowerCase());
            
            if (mapping) {
              ingredientData.push({
                recipe_template_id: template.id,
                ingredient_name: ingredient.ingredient_name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                cost_per_unit: ingredient.cost_per_unit || 0,
                location_type: 'all',
                inventory_stock_id: mapping.storeInventoryId,
                store_unit: ingredient.unit,
                recipe_to_store_conversion_factor: mapping.conversionFactor,
                uses_store_inventory: true
              });
              result.ingredientsMapped++;
            } else {
              // Add unmapped ingredient with warning
              ingredientData.push({
                recipe_template_id: template.id,
                ingredient_name: ingredient.ingredient_name,
                quantity: ingredient.quantity,
                unit: ingredient.unit,
                cost_per_unit: ingredient.cost_per_unit || 0,
                location_type: 'all',
                inventory_stock_id: null,
                store_unit: ingredient.unit,
                recipe_to_store_conversion_factor: 1,
                uses_store_inventory: false
              });
              result.unmappedIngredients.push(`${masterRecipe.name}: ${ingredient.ingredient_name}`);
            }
          }

          // Insert ingredients
          if (ingredientData.length > 0) {
            const { error: ingredientError } = await supabase
              .from('recipe_template_ingredients')
              .insert(ingredientData);

            if (ingredientError) {
              result.errors.push(`Failed to create ingredients for ${masterRecipe.name}: ${ingredientError.message}`);
              continue;
            }
          }

          result.templatesCreated++;
        } catch (error) {
          result.errors.push(`Error processing recipe ${masterRecipe.name}: ${error}`);
        }
      }

      result.success = result.templatesCreated > 0;
      
      // Add warnings for unmapped ingredients
      if (result.unmappedIngredients.length > 0) {
        result.warnings.push(`${result.unmappedIngredients.length} ingredients could not be mapped to inventory`);
      }

      return result;
    } catch (error) {
      result.errors.push(`Import failed: ${error}`);
      return result;
    }
  }

  /**
   * Validate master recipe format
   */
  static validateMasterRecipeFormat(recipes: MasterRecipeData[]): string[] {
    const errors: string[] = [];

    for (const recipe of recipes) {
      if (!recipe.name?.trim()) {
        errors.push('Recipe name is required');
      }
      
      if (!recipe.ingredients || recipe.ingredients.length === 0) {
        errors.push(`Recipe "${recipe.name}" has no ingredients`);
      }

      if (recipe.yield_quantity <= 0) {
        errors.push(`Recipe "${recipe.name}" must have positive yield quantity`);
      }

      for (const ingredient of recipe.ingredients) {
        if (!ingredient.ingredient_name?.trim()) {
          errors.push(`Recipe "${recipe.name}" has ingredient with empty name`);
        }
        
        if (ingredient.quantity <= 0) {
          errors.push(`Recipe "${recipe.name}" ingredient "${ingredient.ingredient_name}" must have positive quantity`);
        }
        
        if (!ingredient.unit?.trim()) {
          errors.push(`Recipe "${recipe.name}" ingredient "${ingredient.ingredient_name}" must have unit`);
        }
      }
    }

    return errors;
  }

  /**
   * Get inventory coverage report
   */
  static async getInventoryCoverageReport(): Promise<{
    totalItems: number;
    recipeCompatible: number;
    incompatibleReasons: Record<string, number>;
  }> {
    try {
      const { data: inventory, error } = await supabase
        .from('inventory_stock')
        .select('id, item, unit, recipe_compatible')
        .eq('is_active', true);

      if (error) throw error;

      const total = inventory?.length || 0;
      const compatible = inventory?.filter(item => item.recipe_compatible).length || 0;
      const incompatible = inventory?.filter(item => !item.recipe_compatible) || [];
      
      // Analyze incompatible reasons (simplified)
      const reasons: Record<string, number> = {};
      incompatible.forEach(item => {
        const unit = item.unit?.toLowerCase() || 'unknown';
        if (['boxes', 'packs', 'pack'].some(bulk => unit.includes(bulk))) {
          reasons['Bulk/Packaging Units'] = (reasons['Bulk/Packaging Units'] || 0) + 1;
        } else {
          reasons['Other'] = (reasons['Other'] || 0) + 1;
        }
      });

      return {
        totalItems: total,
        recipeCompatible: compatible,
        incompatibleReasons: reasons
      };
    } catch (error) {
      console.error('Error getting inventory coverage:', error);
      return {
        totalItems: 0,
        recipeCompatible: 0,
        incompatibleReasons: {}
      };
    }
  }
}