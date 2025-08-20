import { supabase } from "@/integrations/supabase/client";
import { validateProductForInventory } from "./inventoryValidationService";

export interface RealTimeValidationEvent {
  eventType: 'product_created' | 'product_updated' | 'recipe_modified' | 'template_changed';
  productId: string;
  productName: string;
  storeId: string;
  timestamp: string;
  validationResult: {
    isValid: boolean;
    issues: string[];
    autoRepaired: boolean;
  };
}

export interface SyncValidationSubscription {
  channel: any;
  unsubscribe: () => void;
}

/**
 * Real-Time Inventory Sync Validator - Phase 2
 * Monitors database changes and validates sync integrity in real-time
 */
export class RealTimeSyncValidator {
  private static activeSubscriptions = new Map<string, SyncValidationSubscription>();
  private static validationQueue: RealTimeValidationEvent[] = [];
  private static isProcessingQueue = false;

  /**
   * Start real-time monitoring for inventory sync validation
   */
  static startRealTimeMonitoring(storeId?: string): SyncValidationSubscription {
    console.log('🔄 Starting real-time inventory sync monitoring...');
    
    const subscriptionKey = storeId || 'global';
    
    // Close existing subscription if any
    if (this.activeSubscriptions.has(subscriptionKey)) {
      this.activeSubscriptions.get(subscriptionKey)?.unsubscribe();
    }

    const channel = supabase
      .channel('inventory-sync-monitor')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          ...(storeId && { filter: `store_id=eq.${storeId}` })
        },
        (payload) => this.handleProductChange(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipes'
        },
        (payload) => this.handleRecipeChange(payload)
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'recipe_templates'
        },
        (payload) => this.handleTemplateChange(payload)
      )
      .subscribe();

    const subscription: SyncValidationSubscription = {
      channel,
      unsubscribe: () => {
        supabase.removeChannel(channel);
        this.activeSubscriptions.delete(subscriptionKey);
        console.log(`🔄 Stopped real-time monitoring for: ${subscriptionKey}`);
      }
    };

    this.activeSubscriptions.set(subscriptionKey, subscription);
    
    // Start processing queue if not already running
    if (!this.isProcessingQueue) {
      this.startQueueProcessor();
    }

    console.log(`✅ Real-time inventory sync monitoring started for: ${subscriptionKey}`);
    return subscription;
  }

  /**
   * Stop all real-time monitoring
   */
  static stopAllMonitoring(): void {
    console.log('🛑 Stopping all real-time inventory sync monitoring...');
    
    this.activeSubscriptions.forEach((subscription) => {
      subscription.unsubscribe();
    });
    
    this.activeSubscriptions.clear();
    this.isProcessingQueue = false;
    this.validationQueue = [];
    
    console.log('✅ All real-time monitoring stopped');
  }

  /**
   * Get current validation queue status
   */
  static getQueueStatus(): {
    queueLength: number;
    isProcessing: boolean;
    activeSubscriptions: number;
    recentEvents: RealTimeValidationEvent[];
  } {
    return {
      queueLength: this.validationQueue.length,
      isProcessing: this.isProcessingQueue,
      activeSubscriptions: this.activeSubscriptions.size,
      recentEvents: this.validationQueue.slice(-10)
    };
  }

  /**
   * Force validation of specific product
   */
  static async forceValidateProduct(productId: string): Promise<RealTimeValidationEvent | null> {
    try {
      // Get product details
      const { data: product, error } = await supabase
        .from('products')
        .select('id, name, store_id')
        .eq('id', productId)
        .single();

      if (error || !product) {
        console.error('Product not found for validation:', productId);
        return null;
      }

      // Validate the product
      const validationResult = await validateProductForInventory(productId);
      
      const event: RealTimeValidationEvent = {
        eventType: 'product_updated',
        productId: product.id,
        productName: product.name,
        storeId: product.store_id,
        timestamp: new Date().toISOString(),
        validationResult: {
          isValid: validationResult.canDeductInventory,
          issues: validationResult.reason ? [validationResult.reason] : [],
          autoRepaired: false
        }
      };

      // Attempt auto-repair if needed
      if (!validationResult.canDeductInventory) {
        const repairAttempted = await this.attemptAutoRepair(event);
        event.validationResult.autoRepaired = repairAttempted;
      }

      console.log('🔍 Force validated product:', {
        productId,
        productName: product.name,
        isValid: event.validationResult.isValid,
        autoRepaired: event.validationResult.autoRepaired
      });

      return event;

    } catch (error) {
      console.error('Error in force validation:', error);
      return null;
    }
  }

  // Private methods
  private static async handleProductChange(payload: any): Promise<void> {
    try {
      const { eventType, new: newRecord, old: oldRecord } = payload;
      
      if (!newRecord?.id) return;

      const event: RealTimeValidationEvent = {
        eventType: eventType === 'INSERT' ? 'product_created' : 'product_updated',
        productId: newRecord.id,
        productName: newRecord.name || 'Unknown Product',
        storeId: newRecord.store_id,
        timestamp: new Date().toISOString(),
        validationResult: {
          isValid: false,
          issues: [],
          autoRepaired: false
        }
      };

      // Add to validation queue
      this.validationQueue.push(event);
      
      console.log(`📝 Product change detected: ${event.eventType} - ${event.productName}`);

    } catch (error) {
      console.error('Error handling product change:', error);
    }
  }

  private static async handleRecipeChange(payload: any): Promise<void> {
    try {
      const { new: newRecord } = payload;
      
      if (!newRecord?.id) return;

      // Find products using this recipe
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, store_id')
        .eq('recipe_id', newRecord.id);

      if (error || !products) return;

      // Queue validation for all affected products
      for (const product of products) {
        const event: RealTimeValidationEvent = {
          eventType: 'recipe_modified',
          productId: product.id,
          productName: product.name,
          storeId: product.store_id,
          timestamp: new Date().toISOString(),
          validationResult: {
            isValid: false,
            issues: [],
            autoRepaired: false
          }
        };

        this.validationQueue.push(event);
      }

      console.log(`🍳 Recipe change detected, queued ${products.length} products for validation`);

    } catch (error) {
      console.error('Error handling recipe change:', error);
    }
  }

  private static async handleTemplateChange(payload: any): Promise<void> {
    try {
      const { new: newRecord } = payload;
      
      if (!newRecord?.id) return;

      // Find products using this template
      const { data: products, error } = await supabase
        .from('products')
        .select(`
          id, name, store_id,
          recipes!inner (
            id,
            recipe_templates!inner (id)
          )
        `)
        .eq('recipes.recipe_templates.id', newRecord.id);

      if (error || !products) return;

      // Queue validation for all affected products
      for (const product of products) {
        const event: RealTimeValidationEvent = {
          eventType: 'template_changed',
          productId: product.id,
          productName: product.name,
          storeId: product.store_id,
          timestamp: new Date().toISOString(),
          validationResult: {
            isValid: false,
            issues: [],
            autoRepaired: false
          }
        };

        this.validationQueue.push(event);
      }

      console.log(`📋 Template change detected, queued ${products.length} products for validation`);

    } catch (error) {
      console.error('Error handling template change:', error);
    }
  }

  private static async startQueueProcessor(): Promise<void> {
    this.isProcessingQueue = true;
    
    console.log('🔄 Started validation queue processor');

    const processQueue = async () => {
      while (this.isProcessingQueue && this.validationQueue.length > 0) {
        const event = this.validationQueue.shift();
        if (!event) continue;

        try {
          // Validate the product
          const validationResult = await validateProductForInventory(event.productId);
          
          event.validationResult = {
            isValid: validationResult.canDeductInventory,
            issues: validationResult.reason ? [validationResult.reason] : [],
            autoRepaired: false
          };

          // Attempt auto-repair if validation failed
          if (!validationResult.canDeductInventory) {
            const repairAttempted = await this.attemptAutoRepair(event);
            event.validationResult.autoRepaired = repairAttempted;
          }

          console.log(`✅ Processed validation event:`, {
            productName: event.productName,
            isValid: event.validationResult.isValid,
            autoRepaired: event.validationResult.autoRepaired
          });

          // Small delay to prevent overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error('Error processing validation event:', error);
          event.validationResult.issues.push(`Processing error: ${error}`);
        }
      }

      // Schedule next processing cycle
      if (this.isProcessingQueue) {
        setTimeout(processQueue, 5000); // Process every 5 seconds
      }
    };

    processQueue();
  }

  private static async attemptAutoRepair(event: RealTimeValidationEvent): Promise<boolean> {
    try {
      console.log(`🔧 Attempting auto-repair for: ${event.productName}`);
      
      // Import auto-repair functionality
      const { ProactiveSyncMonitor } = await import('./proactiveSyncMonitor');
      const repairResult = await ProactiveSyncMonitor.attemptAutoRepair(event.storeId);
      
      // Check if this specific product was repaired
      const productRepair = repairResult.repairLog.find(log => log.productId === event.productId);
      
      if (productRepair?.success) {
        console.log(`✅ Auto-repair successful for: ${event.productName}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('Auto-repair failed:', error);
      return false;
    }
  }
}