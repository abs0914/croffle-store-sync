import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductInventorySyncOptions {
  storeId: string;
  onInventoryUpdate?: (data: any) => void;
  onProductStatusChange?: (productId: string, status: 'in_stock' | 'low_stock' | 'out_of_stock') => void;
  enableToastNotifications?: boolean;
}

export class RealTimeProductInventorySync {
  private channels: any[] = [];
  private options: ProductInventorySyncOptions;

  constructor(options: ProductInventorySyncOptions) {
    this.options = options;
  }

  public startSync() {
    this.setupInventoryStockSync();
    this.setupCommissaryInventorySync();
    this.setupProductSync();
  }

  public stopSync() {
    this.channels.forEach(channel => {
      supabase.removeChannel(channel);
    });
    this.channels = [];
  }

  private setupInventoryStockSync() {
    const channel = supabase
      .channel('product-inventory-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_stock',
          filter: `store_id=eq.${this.options.storeId}`
        },
        (payload) => {
          this.handleInventoryChange(payload);
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  private setupCommissaryInventorySync() {
    const channel = supabase
      .channel('commissary-inventory-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'commissary_inventory'
        },
        (payload) => {
          this.handleCommissaryInventoryChange(payload);
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  private setupProductSync() {
    const channel = supabase
      .channel('product-sync')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products',
          filter: `store_id=eq.${this.options.storeId}`
        },
        (payload) => {
          this.handleProductChange(payload);
        }
      )
      .subscribe();

    this.channels.push(channel);
  }

  private async handleInventoryChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    if (this.options.onInventoryUpdate) {
      this.options.onInventoryUpdate({
        eventType,
        item: newRecord || oldRecord,
        previous: oldRecord
      });
    }

    // Find products that use this inventory item
    if (newRecord?.id) {
      await this.updateRelatedProductStatus(newRecord.id, 'inventory_stock');
    }

    if (this.options.enableToastNotifications) {
      this.showInventoryChangeNotification(eventType, newRecord, oldRecord);
    }
  }

  private async handleCommissaryInventoryChange(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    
    // Find recipe products that use this commissary item
    if (newRecord?.id) {
      await this.updateRelatedProductStatus(newRecord.id, 'commissary_inventory');
    }

    if (this.options.enableToastNotifications && eventType === 'UPDATE') {
      const quantityChange = (newRecord?.current_stock || 0) - (oldRecord?.current_stock || 0);
      if (quantityChange !== 0) {
        toast.info(`${newRecord?.name || 'Ingredient'} stock ${quantityChange > 0 ? 'increased' : 'decreased'}`, {
          description: `${quantityChange > 0 ? '+' : ''}${quantityChange} ${newRecord?.unit || 'units'}`
        });
      }
    }
  }

  private async handleProductChange(payload: any) {
    const { eventType, new: newRecord } = payload;
    
    if (this.options.onInventoryUpdate) {
      this.options.onInventoryUpdate({
        eventType,
        item: newRecord,
        type: 'product'
      });
    }
  }

  private async updateRelatedProductStatus(itemId: string, itemType: 'inventory_stock' | 'commissary_inventory') {
    try {
      if (itemType === 'inventory_stock') {
        // Find direct products using this inventory item
        const { data: products, error } = await supabase
          .from('products')
          .select('id, name, product_type')
          .eq('inventory_stock_id', itemId)
          .eq('store_id', this.options.storeId);

        if (error) throw error;

        for (const product of products || []) {
          const status = await this.calculateProductStatus(product.id);
          if (this.options.onProductStatusChange) {
            this.options.onProductStatusChange(product.id, status);
          }
        }
      } else {
        // Find recipe products using this commissary item
        const { data: recipeIngredients, error } = await supabase
          .from('recipe_ingredients')
          .select('recipe_id')
          .eq('commissary_item_id', itemId);

        if (error) throw error;

        if (recipeIngredients && recipeIngredients.length > 0) {
          // Find products that use these recipes
          const recipeIds = recipeIngredients.map(ri => ri.recipe_id);
          
          const { data: products, error: productsError } = await supabase
            .from('products')
            .select('id, name, store_id')
            .in('recipe_id', recipeIds)
            .eq('store_id', this.options.storeId);

          if (productsError) throw productsError;

          for (const product of products || []) {
            const status = await this.calculateProductStatus(product.id);
            if (this.options.onProductStatusChange) {
              this.options.onProductStatusChange(product.id, status);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error updating related product status:', error);
    }
  }

  private async calculateProductStatus(productId: string): Promise<'in_stock' | 'low_stock' | 'out_of_stock'> {
    try {
      const { data: product, error } = await supabase
        .from('products')
        .select(`
          *,
          inventory_item:inventory_stock(*)
        `)
        .eq('id', productId)
        .single();

      if (error) throw error;

      if (product.product_type === 'direct') {
        if (product.inventory_item) {
          const currentStock = product.inventory_item.stock_quantity || 0;
          const threshold = product.inventory_item.minimum_threshold || 10;
          
          if (currentStock <= 0) return 'out_of_stock';
          if (currentStock <= threshold) return 'low_stock';
          return 'in_stock';
        }
        
        if (product.stock_quantity <= 0) return 'out_of_stock';
        if (product.stock_quantity <= 5) return 'low_stock';
        return 'in_stock';
      }

      if (product.product_type === 'recipe') {
        const { data: ingredients, error: ingredientsError } = await supabase
          .from('recipe_ingredients')
          .select(`
            quantity,
            commissary_item:commissary_inventory(
              current_stock,
              minimum_threshold
            )
          `)
          .eq('recipe_id', product.recipe_id || product.id);

        if (ingredientsError || !ingredients || ingredients.length === 0) {
          return product.is_active ? 'in_stock' : 'out_of_stock';
        }

        let hasOutOfStock = false;
        let hasLowStock = false;

        for (const ingredient of ingredients) {
          if (!ingredient.commissary_item) continue;
          
          const requiredQuantity = ingredient.quantity || 1;
          const availableStock = ingredient.commissary_item.current_stock || 0;
          const threshold = ingredient.commissary_item.minimum_threshold || 10;

          if (availableStock < requiredQuantity) {
            hasOutOfStock = true;
            break;
          } else if (availableStock <= threshold) {
            hasLowStock = true;
          }
        }

        if (hasOutOfStock) return 'out_of_stock';
        if (hasLowStock) return 'low_stock';
        return 'in_stock';
      }

      return product.is_active ? 'in_stock' : 'out_of_stock';
    } catch (error) {
      console.error('Error calculating product status:', error);
      return 'out_of_stock';
    }
  }

  private showInventoryChangeNotification(eventType: string, newRecord: any, oldRecord: any) {
    switch (eventType) {
      case 'INSERT':
        if (newRecord) {
          toast.success(`New stock added: ${newRecord.item}`, {
            description: `${newRecord.stock_quantity} ${newRecord.unit} available`
          });
        }
        break;
      
      case 'UPDATE':
        if (newRecord && oldRecord) {
          const quantityChange = newRecord.stock_quantity - oldRecord.stock_quantity;
          if (quantityChange !== 0) {
            const isIncrease = quantityChange > 0;
            toast.info(`${newRecord.item} stock ${isIncrease ? 'increased' : 'decreased'}`, {
              description: `${isIncrease ? '+' : ''}${quantityChange} ${newRecord.unit} (${newRecord.stock_quantity} total)`
            });
          }
        }
        break;
      
      case 'DELETE':
        if (oldRecord) {
          toast.info(`Stock item removed: ${oldRecord.item}`);
        }
        break;
    }
  }

  // Public method to manually check product statuses
  public async performProductStatusAudit() {
    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, product_type')
        .eq('store_id', this.options.storeId);

      if (error) throw error;

      const statusUpdates: { productId: string; status: 'in_stock' | 'low_stock' | 'out_of_stock' }[] = [];

      for (const product of products || []) {
        const status = await this.calculateProductStatus(product.id);
        statusUpdates.push({ productId: product.id, status });
        
        if (this.options.onProductStatusChange) {
          this.options.onProductStatusChange(product.id, status);
        }
      }

      if (this.options.enableToastNotifications) {
        const outOfStockCount = statusUpdates.filter(s => s.status === 'out_of_stock').length;
        const lowStockCount = statusUpdates.filter(s => s.status === 'low_stock').length;
        
        if (outOfStockCount + lowStockCount > 0) {
          toast.warning(`Product audit: ${outOfStockCount} out of stock, ${lowStockCount} low stock`);
        } else {
          toast.success('Product audit: All products properly stocked');
        }
      }

      return statusUpdates;
    } catch (error) {
      console.error('Error performing product status audit:', error);
      if (this.options.enableToastNotifications) {
        toast.error('Failed to perform product status audit');
      }
      throw error;
    }
  }
}