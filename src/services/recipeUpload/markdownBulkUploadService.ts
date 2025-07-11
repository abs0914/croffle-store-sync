import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ParsedRecipe, ParsedRecipeFile } from './markdownRecipeParser';

export interface UploadProgress {
  currentFile: string;
  currentRecipe: string;
  filesProcessed: number;
  totalFiles: number;
  recipesProcessed: number;
  totalRecipes: number;
  ingredientsProcessed: number;
  totalIngredients: number;
  phase: 'parsing' | 'validating' | 'uploading' | 'complete' | 'error';
}

export interface UploadResult {
  success: boolean;
  totalRecipes: number;
  successfulRecipes: number;
  failedRecipes: number;
  totalIngredients: number;
  successfulIngredients: number;
  createdCommissaryItems: number;
  errors: string[];
  warnings: string[];
  recipeIds: string[];
}

export interface UploadOptions {
  createMissingCommissaryItems: boolean;
  updateExistingRecipes: boolean;
  defaultStockLevel: number;
  onProgress?: (progress: UploadProgress) => void;
}

/**
 * Main bulk upload service for markdown recipe files
 */
export class MarkdownBulkUploadService {
  private currentUserId: string | null = null;
  private progress: UploadProgress = {
    currentFile: '',
    currentRecipe: '',
    filesProcessed: 0,
    totalFiles: 0,
    recipesProcessed: 0,
    totalRecipes: 0,
    ingredientsProcessed: 0,
    totalIngredients: 0,
    phase: 'parsing'
  };

  constructor() {
    this.initializeUser();
  }

  private async initializeUser() {
    const { data: { user } } = await supabase.auth.getUser();
    this.currentUserId = user?.id || null;
  }

  private updateProgress(updates: Partial<UploadProgress>, options?: UploadOptions) {
    this.progress = { ...this.progress, ...updates };
    if (options?.onProgress) {
      options.onProgress(this.progress);
    }
  }

  /**
   * Upload recipes from parsed markdown files
   */
  async uploadRecipes(parsedFiles: ParsedRecipeFile[], options: UploadOptions): Promise<UploadResult> {
    const result: UploadResult = {
      success: false,
      totalRecipes: 0,
      successfulRecipes: 0,
      failedRecipes: 0,
      totalIngredients: 0,
      successfulIngredients: 0,
      createdCommissaryItems: 0,
      errors: [],
      warnings: [],
      recipeIds: []
    };

    try {
      if (!this.currentUserId) {
        await this.initializeUser();
        if (!this.currentUserId) {
          throw new Error('User not authenticated');
        }
      }

      // Calculate totals
      result.totalRecipes = parsedFiles.reduce((sum, file) => sum + file.recipes.length, 0);
      result.totalIngredients = parsedFiles.reduce((sum, file) => 
        sum + file.recipes.reduce((recipeSum, recipe) => recipeSum + recipe.ingredients.length, 0), 0);

      this.progress = {
        currentFile: '',
        currentRecipe: '',
        filesProcessed: 0,
        totalFiles: parsedFiles.length,
        recipesProcessed: 0,
        totalRecipes: result.totalRecipes,
        ingredientsProcessed: 0,
        totalIngredients: result.totalIngredients,
        phase: 'validating'
      };

      this.updateProgress({}, options);

      // Process each file
      for (let fileIndex = 0; fileIndex < parsedFiles.length; fileIndex++) {
        const file = parsedFiles[fileIndex];
        
        this.updateProgress({
          currentFile: file.filename,
          filesProcessed: fileIndex,
          phase: 'uploading'
        }, options);

        // Add file-level errors to result
        result.errors.push(...file.errors.map(err => `${file.filename}: ${err}`));
        result.warnings.push(...file.warnings.map(warn => `${file.filename}: ${warn}`));

        // Process recipes in this file
        for (const recipe of file.recipes) {
          this.updateProgress({
            currentRecipe: recipe.product
          }, options);

          try {
            const recipeResult = await this.uploadSingleRecipe(recipe, file.filename, options);
            
            if (recipeResult.success) {
              result.successfulRecipes++;
              result.successfulIngredients += recipeResult.ingredientCount;
              result.createdCommissaryItems += recipeResult.createdCommissaryItems;
              if (recipeResult.recipeId) {
                result.recipeIds.push(recipeResult.recipeId);
              }
            } else {
              result.failedRecipes++;
              result.errors.push(...recipeResult.errors);
            }

            result.warnings.push(...recipeResult.warnings);

          } catch (error) {
            result.failedRecipes++;
            result.errors.push(`${file.filename} - ${recipe.product}: ${error instanceof Error ? error.message : 'Unknown error'}`);
          }

          this.updateProgress({
            recipesProcessed: result.successfulRecipes + result.failedRecipes
          }, options);
        }

        this.updateProgress({
          filesProcessed: fileIndex + 1
        }, options);
      }

      result.success = result.successfulRecipes > 0;
      
      this.updateProgress({
        phase: result.success ? 'complete' : 'error'
      }, options);

      return result;

    } catch (error) {
      result.errors.push(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      this.updateProgress({ phase: 'error' }, options);
      return result;
    }
  }

  /**
   * Upload a single recipe with its ingredients
   */
  private async uploadSingleRecipe(
    recipe: ParsedRecipe, 
    filename: string, 
    options: UploadOptions
  ): Promise<{
    success: boolean;
    recipeId?: string;
    ingredientCount: number;
    createdCommissaryItems: number;
    errors: string[];
    warnings: string[];
  }> {
    const result = {
      success: false,
      ingredientCount: 0,
      createdCommissaryItems: 0,
      errors: [] as string[],
      warnings: [] as string[]
    };

    try {
      // Calculate total cost
      const totalCost = recipe.ingredients.reduce((sum, ing) => sum + (ing.cost * ing.quantity), 0);

      // Check if recipe template already exists
      const { data: existingTemplate } = await supabase
        .from('recipe_templates')
        .select('id')
        .eq('name', recipe.product)
        .single();

      let templateId: string;

      if (existingTemplate && options.updateExistingRecipes) {
        // Update existing template
        templateId = existingTemplate.id;
        
        const { error: updateError } = await supabase
          .from('recipe_templates')
          .update({
            description: `${recipe.product} recipe from ${filename}`,
            category_name: recipe.category.toLowerCase(),
            total_cost: totalCost,
            suggested_price: recipe.price,
            updated_at: new Date().toISOString()
          })
          .eq('id', templateId);

        if (updateError) throw updateError;

        // Delete existing ingredients
        await supabase
          .from('recipe_template_ingredients')
          .delete()
          .eq('recipe_template_id', templateId);

        result.warnings.push(`Updated existing recipe template: ${recipe.product}`);

      } else if (existingTemplate && !options.updateExistingRecipes) {
        result.warnings.push(`Recipe "${recipe.product}" already exists, skipping`);
        return result;

      } else {
        // Create new template
        const { data: newTemplate, error: templateError } = await supabase
          .from('recipe_templates')
          .insert({
            name: recipe.product,
            description: `${recipe.product} recipe from ${filename}`,
            category_name: recipe.category.toLowerCase(),
            instructions: `Prepare ${recipe.product} according to ingredient specifications`,
            yield_quantity: 1,
            serving_size: 1,
            total_cost: totalCost,
            suggested_price: recipe.price,
            version: 1,
            is_active: true,
            created_by: this.currentUserId
          })
          .select('id')
          .single();

        if (templateError) throw templateError;
        templateId = newTemplate.id;
      }

      // Process ingredients
      const ingredientInserts = [];
      
      for (const ingredient of recipe.ingredients) {
        try {
          const commissaryResult = await this.findOrCreateCommissaryItem(
            ingredient,
            options
          );

          if (commissaryResult.itemId) {
            ingredientInserts.push({
              recipe_template_id: templateId,
              commissary_item_id: commissaryResult.itemId,
              ingredient_name: ingredient.name,
              commissary_item_name: ingredient.name,
              quantity: ingredient.quantity,
              unit: ingredient.unit,
              cost_per_unit: ingredient.cost,
              recipe_unit: ingredient.unit,
              purchase_unit: ingredient.unit,
              conversion_factor: 1,
              location_type: 'all'
            });

            result.ingredientCount++;

            if (commissaryResult.wasCreated) {
              result.createdCommissaryItems++;
            }
          } else {
            result.warnings.push(`Could not process ingredient: ${ingredient.name} for ${recipe.product}`);
          }

          this.updateProgress({
            ingredientsProcessed: this.progress.ingredientsProcessed + 1
          });

        } catch (error) {
          result.warnings.push(`Error processing ingredient ${ingredient.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Insert ingredients
      if (ingredientInserts.length > 0) {
        const { error: ingredientsError } = await supabase
          .from('recipe_template_ingredients')
          .insert(ingredientInserts);

        if (ingredientsError) throw ingredientsError;
      }

      result.success = true;
      
      return result;

    } catch (error) {
      result.errors.push(`Failed to upload recipe ${recipe.product}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Find existing commissary item or create new one
   */
  private async findOrCreateCommissaryItem(
    ingredient: { name: string; unit: string; cost: number },
    options: UploadOptions
  ): Promise<{ itemId: string | null; wasCreated: boolean }> {
    try {
      // First, try to find existing item
      const { data: existingItem } = await supabase
        .from('commissary_inventory')
        .select('id')
        .eq('name', ingredient.name)
        .eq('is_active', true)
        .single();

      if (existingItem) {
        return { itemId: existingItem.id, wasCreated: false };
      }

      // If not found and creation is enabled, create new item
      if (options.createMissingCommissaryItems) {
        const { data: newItem, error } = await supabase
          .from('commissary_inventory')
          .insert({
            name: ingredient.name,
            category: 'raw_materials',
            item_type: 'raw_material',
            current_stock: options.defaultStockLevel,
            minimum_threshold: Math.max(1, Math.floor(options.defaultStockLevel * 0.1)),
            unit: ingredient.unit,
            unit_cost: ingredient.cost || 0,
            is_active: true
          })
          .select('id')
          .single();

        if (error) {
          console.error(`Error creating commissary item ${ingredient.name}:`, error);
          return { itemId: null, wasCreated: false };
        }

        return { itemId: newItem.id, wasCreated: true };
      }

      return { itemId: null, wasCreated: false };

    } catch (error) {
      console.error(`Error processing commissary item ${ingredient.name}:`, error);
      return { itemId: null, wasCreated: false };
    }
  }

  /**
   * Get current upload progress
   */
  getProgress(): UploadProgress {
    return { ...this.progress };
  }
}
