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
    { id: 'import', name: 'Import Master Recipes', status: 'pending', progress: 0 },
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

  async executeWorkflow(masterRecipes: MasterRecipe[]): Promise<boolean> {
    try {
      console.log('🚀 Starting Master Data Workflow with', masterRecipes.length, 'recipes');

      // Step 1: Import Master Recipes
      const templateIds = await this.importMasterRecipes(masterRecipes);
      if (!templateIds.length) return false;

      // Step 2: Map Ingredients to Inventory
      const mappingSuccess = await this.mapIngredientsToInventory(templateIds);
      if (!mappingSuccess) return false;

      // Step 3: Deploy to All Stores
      const deploySuccess = await this.deployToAllStores(templateIds);
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

  private async importMasterRecipes(recipes: MasterRecipe[]): Promise<string[]> {
    this.updateStep('import', { status: 'running', message: 'Creating recipe templates...' });
    
    try {
      const templateIds: string[] = [];
      const total = recipes.length;

      for (let i = 0; i < total; i++) {
        const recipe = recipes[i];
        
        // Create recipe template
        const { data: template, error: templateError } = await supabase
          .from('recipe_templates')
          .insert({
            name: recipe.name,
            description: recipe.description,
            instructions: recipe.instructions,
            category_name: recipe.category_name,
            serving_size: recipe.serving_size,
            recipe_type: recipe.recipe_type,
            is_active: true,
            is_approved: true
          })
          .select()
          .single();

        if (templateError) throw templateError;

        // Add ingredients
        const ingredientInserts = recipe.ingredients.map(ing => ({
          recipe_template_id: template.id,
          ingredient_name: ing.ingredient_name,
          quantity: ing.quantity,
          unit: ing.unit,
          cost_per_unit: ing.cost_per_unit
        }));

        const { error: ingredientError } = await supabase
          .from('recipe_template_ingredients')
          .insert(ingredientInserts);

        if (ingredientError) throw ingredientError;

        templateIds.push(template.id);
        
        const progress = Math.round(((i + 1) / total) * 100);
        this.updateStep('import', { 
          progress, 
          message: `Created ${i + 1}/${total} templates` 
        });
      }

      this.updateStep('import', { 
        status: 'completed', 
        progress: 100, 
        message: `Created ${templateIds.length} recipe templates` 
      });

      return templateIds;

    } catch (error) {
      this.updateStep('import', { 
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
      const { data: stores } = await supabase
        .from('stores')
        .select('id, name')
        .eq('is_active', true);

      if (!stores?.length) throw new Error('No active stores found');

      let totalMappings = 0;

      for (let storeIndex = 0; storeIndex < stores.length; storeIndex++) {
        const store = stores[storeIndex];

        // Get unique ingredients from templates
        const { data: ingredients } = await supabase
          .from('recipe_template_ingredients')
          .select('ingredient_name, unit')
          .in('recipe_template_id', templateIds);

        if (!ingredients?.length) continue;

        // Create standardized inventory items
        const uniqueIngredients = Array.from(
          new Map(ingredients.map(ing => [
            `${ing.ingredient_name}_${ing.unit}`, 
            { name: ing.ingredient_name, unit: ing.unit }
          ])).values()
        );

        for (const ingredient of uniqueIngredients) {
          // Create inventory stock item
          const { data: inventoryItem, error: inventoryError } = await supabase
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
            .select()
            .single();

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

  private async deployToAllStores(templateIds: string[]): Promise<boolean> {
    this.updateStep('deploy', { status: 'running', message: 'Deploying recipes to stores...' });

    try {
      // Use existing deployment function
      const { data, error } = await supabase.rpc('deploy_and_fix_recipe_templates_to_all_stores');

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
      const { data: recipes } = await supabase
        .from('recipes')
        .select(`
          id,
          name,
          store_id,
          total_cost,
          stores!inner(name)
        `)
        .eq('is_active', true);

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
        const { data: existing } = await supabase
          .from('product_catalog')
          .select('id')
          .eq('recipe_id', recipe.id)
          .eq('store_id', recipe.store_id)
          .single();

        if (!existing) {
          // Create catalog entry
          const { error } = await supabase
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
      const { data: inventoryItems } = await supabase
        .from('inventory_stock')
        .select('id, item, unit')
        .eq('is_active', true);

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

          const { error } = await supabase
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