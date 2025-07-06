
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface DeploymentResult {
  success: boolean;
  storeId: string;
  storeName: string;
  recipeId?: string;
  error?: string;
  details?: string;
}

export interface DeploymentValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  templateInfo: {
    hasIngredients: boolean;
    ingredientCount: number;
    hasInstructions: boolean;
    isActive: boolean;
  };
}

export interface EnhancedDeploymentResult extends DeploymentResult {
  validationDetails?: DeploymentValidation;
  inventoryMappings?: any[];
}

export interface DeploymentPreview {
  storeId: string;
  storeName: string;
  validation?: {
    canDeploy: boolean;
    missingIngredients?: string[];
    lowStockIngredients?: string[];
    mappingIssues?: string[];
  };
  mapping?: {
    ingredient_mappings: any[];
  };
  estimatedCost?: number;
  estimatedPrice?: number;
}

export class EnhancedRecipeDeploymentService {
  /**
   * Validate a template before deployment
   */
  static async validateTemplate(templateId: string): Promise<DeploymentValidation> {
    console.log('Validating template:', templateId);
    
    try {
      // Get template with ingredients
      const { data: template, error: templateError } = await supabase
        .from('recipe_templates')
        .select(`
          *,
          ingredients:recipe_template_ingredients(*)
        `)
        .eq('id', templateId)
        .single();

      if (templateError) {
        return {
          isValid: false,
          errors: [`Template not found: ${templateError.message}`],
          warnings: [],
          templateInfo: {
            hasIngredients: false,
            ingredientCount: 0,
            hasInstructions: false,
            isActive: false
          }
        };
      }

      const errors: string[] = [];
      const warnings: string[] = [];

      // Check if template exists
      if (!template) {
        errors.push('Template not found');
      }

      // Check if template is active
      if (template && !template.is_active) {
        errors.push('Template is not active');
      }

      // Check if template has ingredients
      const hasIngredients = template?.ingredients && template.ingredients.length > 0;
      if (!hasIngredients) {
        errors.push('Template has no ingredients defined');
      }

      // Check if template has instructions
      if (!template?.instructions || template.instructions.trim() === '') {
        warnings.push('Template has no instructions defined');
      }

      // Check ingredient completeness
      if (hasIngredients && template.ingredients) {
        const incompleteIngredients = template.ingredients.filter((ing: any) => 
          !ing.ingredient_name || !ing.quantity || !ing.unit
        );
        
        if (incompleteIngredients.length > 0) {
          errors.push(`${incompleteIngredients.length} ingredients are incomplete (missing name, quantity, or unit)`);
        }

        // Check for commissary mapping
        const unmappedIngredients = template.ingredients.filter((ing: any) => 
          !ing.commissary_item_name && !ing.commissary_item_id
        );
        
        if (unmappedIngredients.length > 0) {
          warnings.push(`${unmappedIngredients.length} ingredients may not map to commissary items`);
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings,
        templateInfo: {
          hasIngredients,
          ingredientCount: template?.ingredients?.length || 0,
          hasInstructions: !!(template?.instructions && template.instructions.trim()),
          isActive: template?.is_active || false
        }
      };

    } catch (error) {
      console.error('Template validation error:', error);
      return {
        isValid: false,
        errors: [`Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`],
        warnings: [],
        templateInfo: {
          hasIngredients: false,
          ingredientCount: 0,
          hasInstructions: false,
          isActive: false
        }
      };
    }
  }

  /**
   * Get deployment preview for multiple stores
   */
  static async getMultiStoreDeploymentPreview(
    templateId: string,
    storeIds: string[]
  ): Promise<DeploymentPreview[]> {
    console.log('Getting multi-store deployment preview for template:', templateId);
    
    const previews: DeploymentPreview[] = [];
    
    // Get stores data
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .in('id', storeIds);

    const storeMap = new Map(stores?.map(s => [s.id, s.name]) || []);

    // Get template data
    const { data: template } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', templateId)
      .single();

    if (!template) {
      return storeIds.map(storeId => ({
        storeId,
        storeName: storeMap.get(storeId) || 'Unknown Store',
        validation: {
          canDeploy: false,
          missingIngredients: ['Template not found']
        }
      }));
    }

    // Create preview for each store
    for (const storeId of storeIds) {
      const preview: DeploymentPreview = {
        storeId,
        storeName: storeMap.get(storeId) || 'Unknown Store',
        validation: {
          canDeploy: true,
          missingIngredients: [],
          lowStockIngredients: [],
          mappingIssues: []
        },
        mapping: {
          ingredient_mappings: []
        },
        estimatedCost: 0,
        estimatedPrice: 0
      };

      // Calculate estimated costs
      if (template.ingredients) {
        const totalCost = template.ingredients.reduce((sum: number, ingredient: any) => 
          sum + (ingredient.quantity * (ingredient.cost_per_unit || 0)), 0
        );
        preview.estimatedCost = totalCost;
        preview.estimatedPrice = totalCost * 1.5; // 50% markup
      }

      previews.push(preview);
    }

    return previews;
  }

  /**
   * Enhanced deployment with validation and better error handling
   */
  static async deployTemplateToStores(
    templateId: string,
    stores: Array<{ id: string; name: string }>
  ): Promise<DeploymentResult[]> {
    console.log('Starting enhanced deployment for template:', templateId, 'to stores:', stores);

    // Pre-deployment validation
    const validation = await this.validateTemplate(templateId);
    
    if (!validation.isValid) {
      const errorMessage = `Template validation failed: ${validation.errors.join(', ')}`;
      console.error(errorMessage);
      
      return stores.map(store => ({
        success: false,
        storeId: store.id,
        storeName: store.name,
        error: 'Template Validation Failed',
        details: validation.errors.join('; ')
      }));
    }

    // Show warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Template warnings:', validation.warnings);
      toast.warning(`Template has warnings: ${validation.warnings.join(', ')}`);
    }

    // Get validated template data
    const { data: template, error: templateError } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', templateId)
      .single();

    if (templateError || !template) {
      const errorMessage = `Failed to fetch template: ${templateError?.message || 'Template not found'}`;
      console.error(errorMessage);
      
      return stores.map(store => ({
        success: false,
        storeId: store.id,
        storeName: store.name,
        error: 'Template Fetch Failed',
        details: errorMessage
      }));
    }

    // Deploy to each store
    const results: DeploymentResult[] = [];
    
    for (const store of stores) {
      try {
        console.log(`Deploying template "${template.name}" to store "${store.name}"`);
        
        const result = await this.deployToSingleStore(template, store);
        results.push(result);
        
        // Small delay between deployments to avoid overwhelming the database
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.error(`Deployment to store ${store.name} failed:`, error);
        results.push({
          success: false,
          storeId: store.id,
          storeName: store.name,
          error: 'Deployment Failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    return results;
  }

  /**
   * Enhanced deployment for multiple stores
   */
  static async deployRecipeToMultipleStoresEnhanced(
    templateId: string,
    storeIds: string[]
  ): Promise<EnhancedDeploymentResult[]> {
    console.log('Enhanced deployment for template:', templateId, 'to stores:', storeIds);
    
    // Get stores data
    const { data: stores } = await supabase
      .from('stores')
      .select('id, name')
      .in('id', storeIds);

    const storesWithNames = stores?.map(s => ({ id: s.id, name: s.name })) || [];
    
    const results = await this.deployTemplateToStores(templateId, storesWithNames);
    
    return results.map(result => ({
      ...result,
      validationDetails: undefined, // Add validation details if needed
      inventoryMappings: [] // Add inventory mappings if needed
    }));
  }

  /**
   * Deploy template to a single store with improved inventory mapping
   */
  private static async deployToSingleStore(
    template: any,
    store: { id: string; name: string }
  ): Promise<DeploymentResult> {
    try {
      // Check for existing recipe to prevent duplicates
      const { data: existingRecipe } = await supabase
        .from('recipes')
        .select('id')
        .eq('name', template.name)
        .eq('store_id', store.id)
        .maybeSingle();

      if (existingRecipe) {
        return {
          success: false,
          storeId: store.id,
          storeName: store.name,
          error: 'Recipe Already Exists',
          details: `Recipe "${template.name}" already deployed to ${store.name}`
        };
      }

      // Create the recipe with correct field names
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: template.name,
          description: template.description,
          instructions: template.instructions,
          yield_quantity: template.yield_quantity,
          serving_size: template.serving_size,
          store_id: store.id,
          approval_status: 'approved',
          is_active: true,
          total_cost: 0,
          cost_per_serving: 0,
          product_id: null // Set as nullable initially
        })
        .select()
        .single();

      if (recipeError) {
        throw new Error(`Recipe creation failed: ${recipeError.message}`);
      }

      console.log(`Created recipe ${recipe.id} for store ${store.name}`);

      // Process ingredients with improved mapping
      const ingredientResults = await this.processRecipeIngredients(
        recipe.id,
        template.ingredients,
        store.id
      );

      // Calculate total cost
      const totalCost = ingredientResults.reduce((sum, ing) => sum + (ing.totalCost || 0), 0);
      const costPerServing = template.serving_size > 0 ? totalCost / template.serving_size : totalCost;

      // Update recipe with calculated costs
      await supabase
        .from('recipes')
        .update({
          total_cost: totalCost,
          cost_per_serving: costPerServing
        })
        .eq('id', recipe.id);

      console.log(`Successfully deployed "${template.name}" to "${store.name}" with ${ingredientResults.length} ingredients`);

      return {
        success: true,
        storeId: store.id,
        storeName: store.name,
        recipeId: recipe.id,
        details: `Recipe deployed with ${ingredientResults.length} ingredients. Total cost: $${totalCost.toFixed(2)}`
      };

    } catch (error) {
      console.error(`Deployment to ${store.name} failed:`, error);
      throw error;
    }
  }

  /**
   * Process recipe ingredients with smart inventory mapping
   */
  private static async processRecipeIngredients(
    recipeId: string,
    ingredients: any[],
    storeId: string
  ) {
    const results = [];

    for (const ingredient of ingredients) {
      try {
        // Try to find matching inventory stock
        const inventoryStock = await this.findBestInventoryMatch(
          ingredient.ingredient_name || ingredient.commissary_item_name,
          storeId
        );

        const recipeIngredient = {
          recipe_id: recipeId,
          inventory_stock_id: inventoryStock?.id || null,
          quantity: ingredient.quantity,
          unit: ingredient.unit,
          cost_per_unit: ingredient.cost_per_unit || inventoryStock?.cost || 0,
          notes: inventoryStock ? null : 'No inventory mapping found - manual review needed'
        };

        const { data: insertedIngredient, error: ingredientError } = await supabase
          .from('recipe_ingredients')
          .insert(recipeIngredient)
          .select()
          .single();

        if (ingredientError) {
          console.error(`Failed to create ingredient for ${ingredient.ingredient_name}:`, ingredientError);
          throw new Error(`Ingredient creation failed: ${ingredientError.message}`);
        }

        results.push({
          ...insertedIngredient,
          totalCost: (ingredient.quantity || 0) * (ingredient.cost_per_unit || inventoryStock?.cost || 0),
          hasInventoryMapping: !!inventoryStock
        });

        console.log(`Created ingredient: ${ingredient.ingredient_name} (${inventoryStock ? 'mapped' : 'unmapped'})`);

      } catch (error) {
        console.error(`Error processing ingredient ${ingredient.ingredient_name}:`, error);
        throw error;
      }
    }

    return results;
  }

  /**
   * Smart inventory matching algorithm
   */
  private static async findBestInventoryMatch(itemName: string, storeId: string) {
    if (!itemName) return null;

    try {
      // Try exact match first
      const { data: exactMatch } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('item', itemName)
        .eq('is_active', true)
        .maybeSingle();

      if (exactMatch) {
        return exactMatch;
      }

      // Try case-insensitive match
      const { data: caseInsensitiveMatch } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .ilike('item', itemName)
        .eq('is_active', true)
        .limit(1)
        .maybeSingle();

      if (caseInsensitiveMatch) {
        return caseInsensitiveMatch;
      }

      // Try partial match (contains)
      const { data: partialMatches } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .or(`item.ilike.%${itemName}%,item.ilike.%${itemName.toLowerCase()}%`)
        .eq('is_active', true)
        .limit(5);

      if (partialMatches && partialMatches.length > 0) {
        // Return the first match (could be improved with fuzzy matching)
        return partialMatches[0];
      }

      return null;
    } catch (error) {
      console.error('Error finding inventory match:', error);
      return null;
    }
  }
}
