import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  message?: string;
  error?: string;
}

export interface MasterRecipe {
  name: string;
  description?: string;
  instructions?: string;
  category_name: string;
  serving_size: number;
  recipe_type: string;
  ingredients: {
    ingredient_name: string;
    quantity: number;
    unit: string;
    cost_per_unit: number;
  }[];
}

export class MasterDataOrchestrator {
  private steps: WorkflowStep[] = [
    { id: 'verify', name: 'Verify Recipe Templates', status: 'pending', progress: 0 },
    { id: 'mapping', name: 'Map Ingredients to Inventory', status: 'pending', progress: 0 },
    { id: 'deploy', name: 'Deploy to All Stores', status: 'pending', progress: 0 },
    { id: 'catalog', name: 'Update Product Catalog', status: 'pending', progress: 0 },
    { id: 'inventory', name: 'Sync Inventory Units', status: 'pending', progress: 0 }
  ];

  private updateStepCallback?: (steps: WorkflowStep[]) => void;

  constructor(onStepUpdate?: (steps: WorkflowStep[]) => void) {
    this.updateStepCallback = onStepUpdate;
  }

  private updateStep(stepId: string, updates: Partial<WorkflowStep>) {
    const step = this.steps.find(s => s.id === stepId);
    if (step) {
      Object.assign(step, updates);
      this.updateStepCallback?.(this.steps);
    }
  }

  async executeWorkflow(): Promise<boolean> {
    try {
      console.log('🚀 Starting Master Data Workflow (post-recipe import)');

      // Step 1: Verify Recipe Templates exist
      const templateIds = await this.verifyRecipeTemplates();
      if (!templateIds.length) return false;

      // Step 2: Map Ingredients to Inventory
      const mappingSuccess = await this.mapIngredientsToInventory(templateIds);
      if (!mappingSuccess) return false;

      // Step 3: Deploy to All Stores
      const deploySuccess = await this.deployToAllStores();
      if (!deploySuccess) return false;

      // Step 4: Update Product Catalog
      const catalogSuccess = await this.updateProductCatalog();
      if (!catalogSuccess) return false;

      // Step 5: Sync Inventory Units
      const inventorySuccess = await this.syncInventoryUnits();
      if (!inventorySuccess) return false;

      toast.success('✅ Master Data Workflow completed successfully!');
      return true;

    } catch (error) {
      console.error('❌ Master Data Workflow failed:', error);
      toast.error('Workflow failed: ' + (error as Error).message);
      return false;
    }
  }

  private async verifyRecipeTemplates(): Promise<string[]> {
    this.updateStep('verify', { status: 'running', message: 'Checking existing recipe templates...' });
    
    try {
      // Use basic query approach to avoid type recursion
      const result = await (supabase as any)
        .from('recipe_templates')
        .select('id, name')
        .eq('is_active', true)
        .eq('is_approved', true);

      const { data: templates, error } = result;

      if (error) throw error;

      const templateIds: string[] = templates?.map((t: any) => t.id) || [];

      if (templateIds.length === 0) {
        this.updateStep('verify', { 
          status: 'error', 
          error: 'No recipe templates found. Please import recipes through Admin → Recipe Management first.' 
        });
        throw new Error('No recipe templates found');
      }

      this.updateStep('verify', { 
        status: 'completed', 
        progress: 100, 
        message: `Found ${templateIds.length} recipe templates ready for deployment` 
      });

      return templateIds;

    } catch (error) {
      this.updateStep('verify', { 
        status: 'error', 
        error: (error as Error).message 
      });
      throw error;
    }
  }

  private async mapIngredientsToInventory(templateIds: string[]): Promise<boolean> {
    this.updateStep('mapping', { status: 'running', message: 'Creating inventory mappings...' });

    try {
      // Get all active stores
      const storesResult = await (supabase as any)
        .from('stores')
        .select('id, name')
        .eq('is_active', true);

      const { data: stores } = storesResult;

      if (!stores?.length) throw new Error('No active stores found');

      let totalMappings = 0;

      for (let storeIndex = 0; storeIndex < stores.length; storeIndex++) {
        const store = stores[storeIndex];

        // Get unique ingredients from templates
        const ingredientsResult = await (supabase as any)
          .from('recipe_template_ingredients')
          .select('ingredient_name, unit')
          .in('recipe_template_id', templateIds);

        const { data: ingredients } = ingredientsResult;

        if (!ingredients?.length) continue;

        // Create standardized inventory items
        const uniqueIngredients = Array.from(
          new Map(ingredients.map((ing: any) => [
            `${ing.ingredient_name}_${ing.unit}`, 
            { name: ing.ingredient_name, unit: ing.unit }
          ])).values()
        ) as Array<{ name: string; unit: string }>;

        for (const ingredient of uniqueIngredients) {
          // Create inventory stock item
          const inventoryResult = await (supabase as any)
            .from('inventory_stock')
            .insert({
              store_id: store.id,
              item: ingredient.name,
              unit: ingredient.unit,
              stock_quantity: 0,
              minimum_threshold: 5,
              cost: 0,
              is_active: true,
              recipe_compatible: true
            })
            .select('id')
            .single();

          const { error: inventoryError } = inventoryResult;

          if (inventoryError) {
            console.warn(`Failed to create inventory item for ${ingredient.name}:`, inventoryError);
            continue;
          }

          totalMappings++;
        }

        const progress = Math.round(((storeIndex + 1) / stores.length) * 100);
        this.updateStep('mapping', { 
          progress, 
          message: `Mapped ingredients for ${storeIndex + 1}/${stores.length} stores` 
        });
      }

      this.updateStep('mapping', { 
        status: 'completed', 
        progress: 100, 
        message: `Created ${totalMappings} inventory mappings` 
      });

      return true;

    } catch (error) {
      this.updateStep('mapping', { 
        status: 'error', 
        error: (error as Error).message 
      });
      return false;
    }
  }

  private async deployToAllStores(): Promise<boolean> {
    this.updateStep('deploy', { status: 'running', message: 'Deploying recipes to stores...' });

    try {
      // Use existing deployment function
      const { data, error } = await (supabase as any).rpc('deploy_and_fix_recipe_templates_to_all_stores');

      if (error) throw error;

      this.updateStep('deploy', { 
        status: 'completed', 
        progress: 100, 
        message: `Deployed ${data[0]?.deployed_recipes || 0} recipes to ${data[0]?.total_stores || 0} stores` 
      });

      return true;

    } catch (error) {
      this.updateStep('deploy', { 
        status: 'error', 
        error: (error as Error).message 
      });
      return false;
    }
  }

  private async updateProductCatalog(): Promise<boolean> {
    this.updateStep('catalog', { status: 'running', message: 'Updating product catalog...' });

    try {
      // Sync recipes with product catalog
      const recipesResult = await (supabase as any)
        .from('recipes')
        .select('id, name, store_id, total_cost')
        .eq('is_active', true);

      const { data: recipes } = recipesResult;

      if (!recipes?.length) {
        this.updateStep('catalog', { 
          status: 'completed', 
          progress: 100, 
          message: 'No recipes to catalog' 
        });
        return true;
      }

      let catalogUpdates = 0;

      for (let i = 0; i < recipes.length; i++) {
        const recipe = recipes[i];

        // Check if catalog entry exists
        const existingResult = await (supabase as any)
          .from('product_catalog')
          .select('id')
          .eq('recipe_id', recipe.id)
          .eq('store_id', recipe.store_id)
          .single();

        const { data: existing } = existingResult;

        if (!existing) {
          // Create catalog entry
          const { error } = await (supabase as any)
            .from('product_catalog')
            .insert({
              store_id: recipe.store_id,
              product_name: recipe.name,
              description: `Recipe-based product: ${recipe.name}`,
              price: Math.max(recipe.total_cost * 2, 50), // 100% markup, minimum 50
              recipe_id: recipe.id,
              is_available: true
            });

          if (!error) catalogUpdates++;
        }

        const progress = Math.round(((i + 1) / recipes.length) * 100);
        this.updateStep('catalog', { 
          progress, 
          message: `Updated ${i + 1}/${recipes.length} catalog entries` 
        });
      }

      this.updateStep('catalog', { 
        status: 'completed', 
        progress: 100, 
        message: `Updated ${catalogUpdates} catalog entries` 
      });

      return true;

    } catch (error) {
      this.updateStep('catalog', { 
        status: 'error', 
        error: (error as Error).message 
      });
      return false;
    }
  }

  private async syncInventoryUnits(): Promise<boolean> {
    this.updateStep('inventory', { status: 'running', message: 'Syncing inventory units...' });

    try {
      // Ensure all inventory items have standardized units
      const inventoryResult = await (supabase as any)
        .from('inventory_stock')
        .select('id, item, unit')
        .eq('is_active', true);

      const { data: inventoryItems } = inventoryResult;

      if (!inventoryItems?.length) {
        this.updateStep('inventory', { 
          status: 'completed', 
          progress: 100, 
          message: 'No inventory items to sync' 
        });
        return true;
      }

      let syncCount = 0;

      for (let i = 0; i < inventoryItems.length; i++) {
        const item = inventoryItems[i];

        // Standardize unit if needed
        let standardUnit = item.unit;
        if (!standardUnit || standardUnit === 'pieces') {
          // Determine standard unit based on item name
          if (item.item.toLowerCase().includes('milk') || 
              item.item.toLowerCase().includes('cream') ||
              item.item.toLowerCase().includes('syrup')) {
            standardUnit = 'ml';
          } else if (item.item.toLowerCase().includes('sugar') ||
                     item.item.toLowerCase().includes('flour') ||
                     item.item.toLowerCase().includes('powder')) {
            standardUnit = 'g';
          } else {
            standardUnit = 'pieces';
          }

          const { error } = await (supabase as any)
            .from('inventory_stock')
            .update({ unit: standardUnit })
            .eq('id', item.id);

          if (!error) syncCount++;
        }

        const progress = Math.round(((i + 1) / inventoryItems.length) * 100);
        this.updateStep('inventory', { 
          progress, 
          message: `Synced ${i + 1}/${inventoryItems.length} units` 
        });
      }

      this.updateStep('inventory', { 
        status: 'completed', 
        progress: 100, 
        message: `Synced ${syncCount} inventory units` 
      });

      return true;

    } catch (error) {
      this.updateStep('inventory', { 
        status: 'error', 
        error: (error as Error).message 
      });
      return false;
    }
  }

  getSteps(): WorkflowStep[] {
    return this.steps;
  }
}