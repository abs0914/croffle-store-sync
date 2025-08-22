import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getOrCreatePOSCategory } from './categoryMappingService';

export interface BatchDeploymentProgress {
  storeId: string;
  storeName: string;
  status: 'pending' | 'processing' | 'validating' | 'deploying' | 'success' | 'error';
  progress: number;
  error?: string;
  warnings?: string[];
  recipeId?: string;
  productId?: string;
}

export interface OptimizedDeploymentOptions {
  actualPrice?: number;
  priceMarkup?: number;
  customName?: string;
  customDescription?: string;
  isActive?: boolean;
  createProduct?: boolean;
  categoryId?: string;
  batchSize?: number;
  onProgress?: (progress: BatchDeploymentProgress[]) => void;
}

export interface DeploymentResult {
  success: boolean;
  storeId: string;
  storeName: string;
  error?: string;
  recipeId?: string;
  productId?: string;
  warnings?: string[];
  missingIngredients?: string[];
}

// Cache for inventory items per store
const inventoryCache = new Map<string, any[]>();

/**
 * Optimized deployment service with parallel processing and progress tracking
 */
export class OptimizedBatchDeploymentService {
  
  /**
   * Pre-fetch and cache inventory for multiple stores in parallel
   */
  static async preloadStoreInventories(storeIds: string[]): Promise<void> {
    console.log('🔄 Preloading inventory for', storeIds.length, 'stores...');
    
    const inventoryPromises = storeIds.map(async (storeId) => {
      if (inventoryCache.has(storeId)) return; // Already cached
      
      const { data: inventory } = await supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true);
      
      if (inventory) {
        inventoryCache.set(storeId, inventory);
        console.log(`✅ Cached ${inventory.length} items for store ${storeId}`);
      }
    });
    
    await Promise.all(inventoryPromises);
    console.log('✅ All store inventories preloaded');
  }
  
  /**
   * Enhanced ingredient matching using cached inventory
   */
  static findMatchingInventoryItem(ingredientName: string, storeId: string): any {
    const storeInventory = inventoryCache.get(storeId) || [];
    const cleanIngredientName = ingredientName.toLowerCase().trim();
    
    // Try exact match first
    let exactMatch = storeInventory.find(item => 
      item.item.toLowerCase().trim() === cleanIngredientName
    );
    
    if (exactMatch) return exactMatch;
    
    // Fuzzy matching
    for (const item of storeInventory) {
      const itemName = item.item.toLowerCase().trim();
      
      const cleanItemName = itemName
        .replace(/^(regular|mini|small|large|jumbo)\s+/i, '')
        .replace(/\s+(sauce|syrup|powder|mix)$/i, '');
      
      const cleanIngredient = cleanIngredientName
        .replace(/^(regular|mini|small|large|jumbo)\s+/i, '')
        .replace(/\s+(sauce|syrup|powder|mix)$/i, '');

      if (
        cleanItemName.includes(cleanIngredient) ||
        cleanIngredient.includes(cleanItemName) ||
        cleanItemName.replace(/s$/, '') === cleanIngredient.replace(/s$/, '')
      ) {
        return item;
      }
    }
    
    return null;
  }
  
  /**
   * Validate ingredients in batch for better performance
   */
  static async validateIngredientsBatch(ingredients: any[], storeId: string): Promise<any[]> {
    const validIngredients = [];
    
    for (const ingredient of ingredients) {
      if (ingredient.ingredient_name && typeof ingredient.ingredient_name === 'string') {
        let cleanName = ingredient.ingredient_name;
        
        // Clean up malformed JSON strings
        if (cleanName.includes('ingredient_name')) {
          const match = cleanName.match(/ingredient_name[""'\s]*:\s*[""']\s*([^""']+)/);
          if (match) {
            cleanName = match[1].trim();
          }
        }
        
        cleanName = cleanName
          .replace(/^"?\[?\{?"?ingredient_name"?: ?"?/, '')
          .replace(/["'}].*$/, '')
          .replace(/[{}\[\]"']/g, '')
          .trim();
        
        if (cleanName.length > 0) {
          const storeItem = this.findMatchingInventoryItem(cleanName, storeId);
          
          const validatedIngredient = {
            ingredient_name: cleanName,
            quantity: ingredient.quantity || 1,
            unit: ingredient.unit || 'pieces',
            cost_per_unit: ingredient.cost_per_unit || storeItem?.unit_cost || 0,
            inventory_stock_id: storeItem?.id || null,
            commissary_item_id: ingredient.commissary_item_id || null
          };
          
          validIngredients.push(validatedIngredient);
        }
      }
    }
    
    return validIngredients;
  }
  
  /**
   * Optimized deployment to multiple stores with parallel processing
   */
  static async deployRecipeToMultipleStoresOptimized(
    templateId: string,
    storeIds: string[],
    options: OptimizedDeploymentOptions = {}
  ): Promise<DeploymentResult[]> {
    const batchSize = options.batchSize || 3; // Process 3 stores at a time
    const progress: BatchDeploymentProgress[] = storeIds.map(storeId => ({
      storeId,
      storeName: '',
      status: 'pending',
      progress: 0
    }));
    
    console.log('🚀 Starting optimized batch deployment for template:', templateId);
    console.log('📊 Processing', storeIds.length, 'stores in batches of', batchSize);
    
    try {
      // Fetch template and stores in parallel
      const [templateResult, storesResult] = await Promise.all([
        supabase
          .from('recipe_templates')
          .select(`*, ingredients:recipe_template_ingredients(*)`)
          .eq('id', templateId)
          .single(),
        supabase
          .from('stores')
          .select('id, name')
          .in('id', storeIds)
      ]);
      
      if (templateResult.error) throw templateResult.error;
      if (storesResult.error) throw storesResult.error;
      
      const template = templateResult.data;
      const stores = storesResult.data;
      
      // Update progress with store names
      stores.forEach(store => {
        const progressItem = progress.find(p => p.storeId === store.id);
        if (progressItem) progressItem.storeName = store.name;
      });
      
      // Preload all store inventories
      await this.preloadStoreInventories(storeIds);
      
      // Update progress
      progress.forEach(p => { p.status = 'processing'; p.progress = 10; });
      options.onProgress?.(progress);
      
      const results: DeploymentResult[] = [];
      
      // Process stores in batches
      for (let i = 0; i < stores.length; i += batchSize) {
        const batch = stores.slice(i, i + batchSize);
        console.log(`🔄 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(stores.length/batchSize)}`);
        
        // Process batch in parallel
        const batchPromises = batch.map(async (store) => {
          const progressItem = progress.find(p => p.storeId === store.id);
          if (progressItem) {
            progressItem.status = 'validating';
            progressItem.progress = 20;
            options.onProgress?.(progress);
          }
          
          try {
            const result = await this.deployToSingleStoreOptimized(
              template,
              store,
              options,
              (storeProgress) => {
                if (progressItem) {
                  progressItem.progress = storeProgress;
                  options.onProgress?.(progress);
                }
              }
            );
            
            if (progressItem) {
              progressItem.status = result.success ? 'success' : 'error';
              progressItem.progress = 100;
              progressItem.error = result.error;
              progressItem.warnings = result.warnings;
              progressItem.recipeId = result.recipeId;
              progressItem.productId = result.productId;
              options.onProgress?.(progress);
            }
            
            return result;
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            
            if (progressItem) {
              progressItem.status = 'error';
              progressItem.progress = 100;
              progressItem.error = errorMessage;
              options.onProgress?.(progress);
            }
            
            return {
              success: false,
              storeId: store.id,
              storeName: store.name,
              error: errorMessage
            };
          }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
        
        // Small delay between batches to avoid overwhelming the database
        if (i + batchSize < stores.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
      
      // Final progress update
      options.onProgress?.(progress);
      
      console.log('✅ Optimized batch deployment completed');
      return results;
      
    } catch (error) {
      console.error('❌ Critical error in optimized batch deployment:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Update all progress items to error status
      progress.forEach(p => {
        p.status = 'error';
        p.progress = 100;
        p.error = errorMessage;
      });
      options.onProgress?.(progress);
      
      return storeIds.map(storeId => ({
        success: false,
        storeId,
        storeName: progress.find(p => p.storeId === storeId)?.storeName || 'Unknown',
        error: errorMessage
      }));
    }
  }
  
  /**
   * Optimized deployment to a single store
   */
  static async deployToSingleStoreOptimized(
    template: any,
    store: any,
    options: OptimizedDeploymentOptions,
    onProgress?: (progress: number) => void
  ): Promise<DeploymentResult> {
    try {
      onProgress?.(30);
      
      // Validate ingredients using cached inventory
      const validIngredients = await this.validateIngredientsBatch(template.ingredients, store.id);
      
      if (validIngredients.length === 0) {
        throw new Error('No valid ingredients found after validation');
      }
      
      onProgress?.(50);
      
      // Calculate costs
      const totalCost = validIngredients.reduce((sum, ingredient) => {
        return sum + (ingredient.quantity * (ingredient.cost_per_unit || 0));
      }, 0);
      
      const costPerServing = template.yield_quantity > 0 ? totalCost / template.yield_quantity : 0;
      const finalPrice = options.actualPrice || template.suggested_price || (costPerServing * (1 + (options.priceMarkup || 0.5)));
      
      // Check for existing recipe
      const { data: existingRecipe } = await supabase
        .from('recipes')
        .select('id, product_id')
        .eq('name', options.customName || template.name)
        .eq('store_id', store.id)
        .maybeSingle();
      
      if (existingRecipe) {
        return {
          success: true,
          storeId: store.id,
          storeName: store.name,
          recipeId: existingRecipe.id,
          productId: existingRecipe.product_id,
          warnings: ['Recipe already exists in this store']
        };
      }
      
      onProgress?.(70);
      
      // Create recipe and ingredients in a single transaction-like operation
      const { data: recipe, error: recipeError } = await supabase
        .from('recipes')
        .insert({
          name: options.customName || template.name,
          description: options.customDescription || template.description,
          instructions: template.instructions || 'Follow template instructions',
          yield_quantity: template.yield_quantity || 1,
          total_cost: totalCost,
          cost_per_serving: costPerServing,
          suggested_price: finalPrice,
          store_id: store.id,
          template_id: template.id,
          product_id: null,
          is_active: options.isActive !== false,
          approval_status: 'approved'
        })
        .select()
        .single();
      
      if (recipeError) throw recipeError;
      
      onProgress?.(80);
      
      // Batch insert ingredients
      const ingredientInserts = validIngredients.map(ingredient => ({
        recipe_id: recipe.id,
        ingredient_name: ingredient.ingredient_name,
        quantity: ingredient.quantity || 1,
        unit: this.normalizeUnit(ingredient.unit || 'pieces') as 'pieces' | 'kg' | 'g' | 'liters' | 'ml' | 'boxes' | 'packs',
        cost_per_unit: ingredient.cost_per_unit || 0,
        inventory_stock_id: ingredient.inventory_stock_id,
        commissary_item_id: ingredient.commissary_item_id
      }));
      
      const { error: ingredientsError } = await supabase
        .from('recipe_ingredients')
        .insert(ingredientInserts);
      
      if (ingredientsError) throw ingredientsError;
      
      onProgress?.(90);
      
      // Create product if requested
      let productId: string | undefined;
      let productWarnings: string[] = [];
      
      if (options.createProduct !== false) {
        try {
          const productResult = await this.createProductCatalogOptimized(recipe, template, {
            ...options,
            actualPrice: finalPrice
          });
          
          if (productResult.success) {
            productId = productResult.productId;
            
            // Update recipe with product reference
            await supabase
              .from('recipes')
              .update({ product_id: productId })
              .eq('id', recipe.id);
          } else {
            productWarnings.push(productResult.error || 'Failed to create product');
          }
        } catch (error) {
          productWarnings.push('Product creation failed');
        }
      }
      
      onProgress?.(100);
      
      const allWarnings = [
        ...(validIngredients.length < template.ingredients.length ? 
          [`${template.ingredients.length - validIngredients.length} invalid ingredients were skipped`] : []),
        ...productWarnings
      ];
      
      return {
        success: true,
        storeId: store.id,
        storeName: store.name,
        recipeId: recipe.id,
        productId,
        warnings: allWarnings.length > 0 ? allWarnings : undefined
      };
      
    } catch (error) {
      return {
        success: false,
        storeId: store.id,
        storeName: store.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
  
  /**
   * Optimized product catalog creation
   */
  static async createProductCatalogOptimized(
    recipe: any,
    template: any,
    options: OptimizedDeploymentOptions
  ): Promise<{ success: boolean; productId?: string; error?: string }> {
    try {
      // Get or create category
      const categoryId = await getOrCreatePOSCategory(
        template.category_name || 'Recipe Items',
        recipe.store_id
      );
      
      // Create product catalog entry
      const { data: productCatalog, error: catalogError } = await supabase
        .from('product_catalog')
        .insert({
          product_name: recipe.name,
          description: recipe.description,
          price: options.actualPrice || recipe.suggested_price,
          category_id: categoryId,
          store_id: recipe.store_id,
          recipe_id: recipe.id,
          is_available: options.isActive !== false,
          image_url: template.image_url
        })
        .select()
        .single();
      
      if (catalogError) throw catalogError;
      
      return {
        success: true,
        productId: productCatalog.id
      };
      
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Product creation failed'
      };
    }
  }
  
  /**
   * Normalize units to match database enum values
   */
  static normalizeUnit(unit: string): 'pieces' | 'kg' | 'g' | 'liters' | 'ml' | 'boxes' | 'packs' {
    const unitLower = unit.toLowerCase().trim();
    
    const unitMap: Record<string, 'pieces' | 'kg' | 'g' | 'liters' | 'ml' | 'boxes' | 'packs'> = {
      'piece': 'pieces',
      'pieces': 'pieces',
      'pcs': 'pieces',
      'pc': 'pieces',
      'serving': 'pieces',
      'servings': 'pieces',
      'portion': 'pieces',
      'portions': 'pieces',
      'box': 'boxes',
      'boxes': 'boxes',
      'pack': 'packs',
      'packs': 'packs',
      'gram': 'g',
      'grams': 'g',
      'g': 'g',
      'kilogram': 'kg',
      'kilograms': 'kg',
      'kg': 'kg',
      'liter': 'liters',
      'liters': 'liters',
      'l': 'liters',
      'milliliter': 'ml',
      'milliliters': 'ml',
      'ml': 'ml'
    };
    
    return unitMap[unitLower] || 'pieces';
  }
  
  /**
   * Clear inventory cache for memory management
   */
  static clearInventoryCache(): void {
    inventoryCache.clear();
  }
}