
import { supabase } from '@/integrations/supabase/client';
import { checkIngredientAvailability } from './smartIngredientMapping';
import { toast } from 'sonner';

export interface RealTimeAvailabilityCheck {
  productName: string;
  isAvailable: boolean;
  maxQuantity: number;
  estimatedCost: number;
  profitMargin: number;
  lastChecked: Date;
}

export interface ComboAvailabilityCheck {
  comboName: string;
  comboItems: {
    itemName: string;
    isAvailable: boolean;
    maxQuantity: number;
  }[];
  isComboAvailable: boolean;
  maxComboQuantity: number;
  totalCost: number;
  profitMargin: number;
}

class RealTimeAvailabilityService {
  private availabilityCache = new Map<string, RealTimeAvailabilityCheck>();
  private cacheExpiry = 30000; // 30 seconds

  async checkProductAvailability(
    productName: string,
    storeId: string,
    quantityNeeded: number = 1,
    sellingPrice: number = 0
  ): Promise<RealTimeAvailabilityCheck> {
    const cacheKey = `${productName}-${storeId}-${quantityNeeded}`;
    
    // Check cache first
    const cached = this.availabilityCache.get(cacheKey);
    if (cached && Date.now() - cached.lastChecked.getTime() < this.cacheExpiry) {
      return cached;
    }

    try {
      const availability = await checkIngredientAvailability(productName, storeId, quantityNeeded);
      
      // Calculate estimated cost
      const estimatedCost = availability.ingredientDetails.reduce((total, ingredient) => {
        return total + (ingredient.cost_per_unit * ingredient.quantity_required * quantityNeeded);
      }, 0);

      // Calculate profit margin
      const profitMargin = sellingPrice > 0 ? ((sellingPrice - estimatedCost) / sellingPrice) * 100 : 0;

      const result: RealTimeAvailabilityCheck = {
        productName,
        isAvailable: availability.canMake,
        maxQuantity: availability.maxQuantity === Infinity ? 0 : availability.maxQuantity,
        estimatedCost,
        profitMargin,
        lastChecked: new Date()
      };

      // Cache the result
      this.availabilityCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.error('Error checking product availability:', error);
      return {
        productName,
        isAvailable: false,
        maxQuantity: 0,
        estimatedCost: 0,
        profitMargin: 0,
        lastChecked: new Date()
      };
    }
  }

  async checkComboAvailability(
    comboName: string,
    comboItems: { itemName: string; quantity: number; price: number }[],
    storeId: string,
    quantityNeeded: number = 1
  ): Promise<ComboAvailabilityCheck> {
    try {
      const itemChecks = await Promise.all(
        comboItems.map(async (item) => {
          const availability = await this.checkProductAvailability(
            item.itemName,
            storeId,
            item.quantity * quantityNeeded,
            item.price
          );
          
          return {
            itemName: item.itemName,
            isAvailable: availability.isAvailable,
            maxQuantity: Math.floor(availability.maxQuantity / item.quantity),
            cost: availability.estimatedCost
          };
        })
      );

      const isComboAvailable = itemChecks.every(check => check.isAvailable);
      const maxComboQuantity = isComboAvailable 
        ? Math.min(...itemChecks.map(check => check.maxQuantity))
        : 0;
      
      const totalCost = itemChecks.reduce((sum, check) => sum + check.cost, 0);
      const comboPrice = comboItems.reduce((sum, item) => sum + item.price, 0);
      const profitMargin = comboPrice > 0 ? ((comboPrice - totalCost) / comboPrice) * 100 : 0;

      return {
        comboName,
        comboItems: itemChecks.map(check => ({
          itemName: check.itemName,
          isAvailable: check.isAvailable,
          maxQuantity: check.maxQuantity
        })),
        isComboAvailable,
        maxComboQuantity,
        totalCost,
        profitMargin
      };
    } catch (error) {
      console.error('Error checking combo availability:', error);
      return {
        comboName,
        comboItems: comboItems.map(item => ({
          itemName: item.itemName,
          isAvailable: false,
          maxQuantity: 0
        })),
        isComboAvailable: false,
        maxComboQuantity: 0,
        totalCost: 0,
        profitMargin: 0
      };
    }
  }

  clearCache() {
    this.availabilityCache.clear();
  }

  async deductInventoryForSale(
    productName: string,
    storeId: string,
    quantitySold: number,
    transactionId: string,
    userId: string
  ): Promise<boolean> {
    try {
      const availability = await checkIngredientAvailability(productName, storeId, quantitySold);
      
      if (!availability.canMake) {
        toast.error(`Cannot fulfill order: insufficient ${availability.insufficientIngredients.join(', ')}`);
        return false;
      }

      // Deduct ingredients from inventory
      for (const ingredient of availability.ingredientDetails) {
        const newQuantity = ingredient.current_stock - ingredient.total_required;
        
        // Update inventory stock
        const { error: updateError } = await supabase
          .from('inventory_stock')
          .update({ stock_quantity: newQuantity })
          .eq('id', ingredient.store_inventory_id);

        if (updateError) {
          console.error('Error updating inventory:', updateError);
          toast.error(`Failed to update inventory for ${ingredient.ingredient_name}`);
          return false;
        }

        // Log inventory movement
        await supabase
          .from('inventory_movements')
          .insert({
            inventory_stock_id: ingredient.store_inventory_id,
            movement_type: 'sale',
            quantity_change: -ingredient.total_required,
            previous_quantity: ingredient.current_stock,
            new_quantity: newQuantity,
            created_by: userId,
            reference_type: 'transaction',
            reference_id: transactionId,
            notes: `Sale: ${productName} (${quantitySold} units)`
          });
      }

      // Clear cache to force refresh
      this.clearCache();
      
      return true;
    } catch (error) {
      console.error('Error deducting inventory for sale:', error);
      toast.error('Failed to process inventory deduction');
      return false;
    }
  }
}

export const realTimeAvailabilityService = new RealTimeAvailabilityService();
