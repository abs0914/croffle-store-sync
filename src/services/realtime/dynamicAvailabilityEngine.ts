import { supabase } from "@/integrations/supabase/client";
import { IntelligentValidationService } from "../inventory/intelligentValidationService";
import { toast } from "sonner";

/**
 * Dynamic Product Availability Engine
 * Real-time product availability based on ingredient stock levels
 */
export class DynamicAvailabilityEngine {
  
  private static listeners = new Map<string, any>();
  private static isInitialized = false;
  
  /**
   * Initialize real-time availability monitoring
   */
  static async initialize(): Promise<void> {
    if (this.isInitialized) return;
    
    try {
      console.log('🔄 Initializing Dynamic Availability Engine...');
      
      // Set up real-time listeners for inventory changes
      this.setupInventoryListener();
      this.setupRecipeListener();
      
      // Run initial availability sync
      await this.syncAllProductAvailability();
      
      this.isInitialized = true;
      console.log('✅ Dynamic Availability Engine initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Dynamic Availability Engine:', error);
    }
  }
  
  /**
   * Set up real-time listener for inventory changes
   */
  private static setupInventoryListener(): void {
    const channel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_stock'
        },
        async (payload) => {
          console.log('📦 Inventory change detected:', payload);
          
          if (payload.new && typeof payload.new === 'object' && 'store_id' in payload.new) {
            // Update affected products for this store
            await this.updateStoreProductAvailability(payload.new.store_id as string);
          }
        }
      )
      .subscribe();
      
    this.listeners.set('inventory', channel);
  }
  
  /**
   * Set up real-time listener for recipe changes
   */
  private static setupRecipeListener(): void {
    const channel = supabase
      .channel('recipe-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipe_ingredients'
        },
        async (payload) => {
          console.log('🍽️ Recipe change detected:', payload);
          
          // Get the recipe and update affected products
          if (payload.new && typeof payload.new === 'object' && 'recipe_id' in payload.new) {
            await this.updateRecipeProductAvailability(payload.new.recipe_id as string);
          }
        }
      )
      .subscribe();
      
    this.listeners.set('recipes', channel);
  }
  
  /**
   * Update product availability for a specific store
   */
  private static async updateStoreProductAvailability(storeId: string): Promise<void> {
    try {
      console.log(`🔄 Updating product availability for store: ${storeId}`);
      
      // Get all active products for this store
      const { data: products, error } = await supabase
        .from('product_catalog')
        .select('id, product_name, is_available')
        .eq('store_id', storeId)
        .eq('is_available', true); // Only check currently available products
      
      if (error) throw error;
      
      const updates = [];
      const notifications = [];
      
      for (const product of products || []) {
        // Validate current availability
        const validation = await IntelligentValidationService.validateProductForPOS(product.id);
        
        // If availability changed, update it
        if (product.is_available !== validation.canSell) {
          updates.push({
            id: product.id,
            is_available: validation.canSell,
            updated_at: new Date().toISOString()
          });
          
          // Prepare notification
          if (!validation.canSell) {
            let reason = 'Unknown issue';
            if (validation.missingIngredients.length > 0) {
              reason = `Missing: ${validation.missingIngredients.join(', ')}`;
            } else if (validation.insufficientIngredients.length > 0) {
              reason = `Low stock: ${validation.insufficientIngredients.map(i => i.item).join(', ')}`;
            }
            
            notifications.push({
              product: product.product_name,
              reason
            });
          }
        }
      }
      
      // Batch update availability
      if (updates.length > 0) {
        for (const update of updates) {
          await supabase
            .from('product_catalog')
            .update({
              is_available: update.is_available,
              updated_at: update.updated_at
            })
            .eq('id', update.id);
        }
        
        console.log(`✅ Updated availability for ${updates.length} products`);
        
        // Show notifications for products becoming unavailable
        for (const notification of notifications) {
          toast.warning(`${notification.product} now unavailable: ${notification.reason}`);
        }
      }
    } catch (error) {
      console.error('❌ Failed to update store product availability:', error);
    }
  }
  
  /**
   * Update product availability for products using a specific recipe
   */
  private static async updateRecipeProductAvailability(recipeId: string): Promise<void> {
    try {
      // Get products using this recipe
      const { data: products, error } = await supabase
        .from('product_catalog')
        .select('id, store_id, product_name')
        .eq('recipe_id', recipeId);
      
      if (error) throw error;
      
      for (const product of products || []) {
        await this.updateStoreProductAvailability(product.store_id);
      }
    } catch (error) {
      console.error('❌ Failed to update recipe product availability:', error);
    }
  }
  
  /**
   * Sync availability for all products across all stores
   */
  static async syncAllProductAvailability(): Promise<{
    totalProducts: number;
    availabilityChanged: number;
    nowAvailable: number;
    nowUnavailable: number;
  }> {
    try {
      console.log('🔄 Syncing availability for all products...');
      
      // Get all active products
      const { data: products, error } = await supabase
        .from('product_catalog')
        .select('id, product_name, store_id, is_available');
      
      if (error) throw error;
      
      let availabilityChanged = 0;
      let nowAvailable = 0;
      let nowUnavailable = 0;
      
      // Process products in batches to avoid overwhelming the system
      const batchSize = 20;
      for (let i = 0; i < (products?.length || 0); i += batchSize) {
        const batch = products!.slice(i, i + batchSize);
        
        const batchPromises = batch.map(async (product) => {
          try {
            const validation = await IntelligentValidationService.validateProductForPOS(product.id);
            
            if (product.is_available !== validation.canSell) {
              // Update availability
              await supabase
                .from('product_catalog')
                .update({
                  is_available: validation.canSell,
                  updated_at: new Date().toISOString()
                })
                .eq('id', product.id);
              
              availabilityChanged++;
              
              if (validation.canSell) {
                nowAvailable++;
              } else {
                nowUnavailable++;
              }
            }
          } catch (error) {
            console.error(`Failed to sync product ${product.product_name}:`, error);
          }
        });
        
        await Promise.all(batchPromises);
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log(`✅ Sync completed: ${availabilityChanged} products changed availability`);
      
      return {
        totalProducts: products?.length || 0,
        availabilityChanged,
        nowAvailable,
        nowUnavailable
      };
    } catch (error) {
      console.error('❌ Failed to sync all product availability:', error);
      return {
        totalProducts: 0,
        availabilityChanged: 0,
        nowAvailable: 0,
        nowUnavailable: 0
      };
    }
  }
  
  /**
   * Get real-time availability status for POS display
   */
  static async getRealtimeAvailabilityStatus(storeId: string): Promise<{
    available: Array<{
      id: string;
      name: string;
      maxQuantity: number;
      ingredients: number;
    }>;
    unavailable: Array<{
      id: string;
      name: string;
      reason: string;
      estimatedRestockTime?: string;
    }>;
    summary: {
      totalProducts: number;
      availableCount: number;
      unavailableCount: number;
      lastUpdated: string;
    };
  }> {
    try {
      console.log(`📊 Getting real-time availability for store: ${storeId}`);
      
      // Get sellable products using the intelligent validation service
      const { sellable, unavailable } = await IntelligentValidationService.getSellableProducts(storeId);
      
      // Format available products
      const available = sellable.map(product => ({
        id: product.id,
        name: product.product_name,
        maxQuantity: product.maxQuantityAvailable || 0,
        ingredients: product.validation?.validationDetails?.ingredientsCount || 0
      }));
      
      // Format unavailable products with estimated restock times
      const unavailableFormatted = unavailable.map(product => ({
        id: product.id,
        name: product.product_name,
        reason: product.reason || 'Unknown issue',
        estimatedRestockTime: this.estimateRestockTime(product.reason)
      }));
      
      return {
        available,
        unavailable: unavailableFormatted,
        summary: {
          totalProducts: available.length + unavailableFormatted.length,
          availableCount: available.length,
          unavailableCount: unavailableFormatted.length,
          lastUpdated: new Date().toISOString()
        }
      };
    } catch (error) {
      console.error('❌ Failed to get real-time availability:', error);
      return {
        available: [],
        unavailable: [],
        summary: {
          totalProducts: 0,
          availableCount: 0,
          unavailableCount: 0,
          lastUpdated: new Date().toISOString()
        }
      };
    }
  }
  
  /**
   * Estimate restock time based on unavailability reason
   */
  private static estimateRestockTime(reason: string): string {
    if (reason.includes('Missing ingredients')) {
      return 'Next delivery (1-2 days)';
    } else if (reason.includes('Insufficient stock')) {
      return 'Within 24 hours';
    } else if (reason.includes('No recipe')) {
      return 'Requires setup';
    } else {
      return 'Unknown';
    }
  }
  
  /**
   * Cleanup listeners when not needed
   */
  static cleanup(): void {
    console.log('🧹 Cleaning up Dynamic Availability Engine...');
    
    for (const [name, channel] of this.listeners) {
      supabase.removeChannel(channel);
      console.log(`Removed listener: ${name}`);
    }
    
    this.listeners.clear();
    this.isInitialized = false;
  }
  
  /**
   * Force refresh availability for emergency situations
   */
  static async emergencyRefresh(storeId?: string): Promise<void> {
    console.log('🚨 Emergency availability refresh triggered');
    
    if (storeId) {
      await this.updateStoreProductAvailability(storeId);
      toast.info('Product availability refreshed');
    } else {
      await this.syncAllProductAvailability();
      toast.info('All products availability refreshed');
    }
  }
}