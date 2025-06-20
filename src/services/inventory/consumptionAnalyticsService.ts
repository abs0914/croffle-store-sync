
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ConsumptionPattern {
  item_id: string;
  item_name: string;
  daily_average: number;
  weekly_trend: number;
  seasonal_factor: number;
  forecast_accuracy: number;
  last_updated: string;
}

export interface MenuSalesConsumption {
  product_id: string;
  product_name: string;
  total_sales: number;
  ingredient_consumption: {
    item_id: string;
    item_name: string;
    total_consumed: number;
    consumption_rate: number;
  }[];
}

export interface ReorderRecommendation {
  item_id: string;
  item_name: string;
  current_stock: number;
  minimum_threshold: number;
  recommended_order_quantity: number;
  consumption_rate: number;
  days_until_stockout: number;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  cost_impact: number;
  supplier_lead_time: number;
  last_order_date?: string;
}

export const analyzeMenuSalesConsumption = async (
  storeId: string,
  days: number = 30
): Promise<MenuSalesConsumption[]> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get transaction data with product sales
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('items, created_at')
      .eq('store_id', storeId)
      .eq('status', 'completed')
      .gte('created_at', startDate.toISOString());

    if (transError) throw transError;

    // Get recipe ingredients to map products to inventory consumption
    const { data: recipes, error: recipeError } = await supabase
      .from('recipes')
      .select(`
        product_id,
        name,
        ingredients:recipe_ingredients(
          inventory_stock_id,
          quantity,
          inventory_stock:inventory_stock(item)
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (recipeError) throw recipeError;

    const productConsumption: Record<string, MenuSalesConsumption> = {};

    // Process transactions to calculate ingredient consumption
    transactions?.forEach(tx => {
      const items = typeof tx.items === 'string' ? JSON.parse(tx.items) : tx.items;
      
      items.forEach((item: any) => {
        const recipe = recipes?.find(r => r.product_id === item.productId);
        if (!recipe) return;

        if (!productConsumption[item.productId]) {
          productConsumption[item.productId] = {
            product_id: item.productId,
            product_name: item.name,
            total_sales: 0,
            ingredient_consumption: []
          };
        }

        productConsumption[item.productId].total_sales += item.quantity;

        // Calculate ingredient consumption
        recipe.ingredients?.forEach((ingredient: any) => {
          const consumedQuantity = ingredient.quantity * item.quantity;
          
          let existingIngredient = productConsumption[item.productId].ingredient_consumption
            .find(ing => ing.item_id === ingredient.inventory_stock_id);
          
          if (!existingIngredient) {
            productConsumption[item.productId].ingredient_consumption.push({
              item_id: ingredient.inventory_stock_id,
              item_name: ingredient.inventory_stock?.item || 'Unknown',
              total_consumed: consumedQuantity,
              consumption_rate: consumedQuantity / days
            });
          } else {
            existingIngredient.total_consumed += consumedQuantity;
            existingIngredient.consumption_rate = existingIngredient.total_consumed / days;
          }
        });
      });
    });

    return Object.values(productConsumption);
  } catch (error) {
    console.error('Error analyzing menu sales consumption:', error);
    return [];
  }
};

export const calculateConsumptionPatterns = async (storeId: string): Promise<ConsumptionPattern[]> => {
  try {
    const salesConsumption = await analyzeMenuSalesConsumption(storeId, 30);
    const patterns: ConsumptionPattern[] = [];

    // Aggregate consumption patterns across all products
    const itemConsumption: Record<string, {
      total_consumed: number;
      consumption_rate: number;
      item_name: string;
    }> = {};

    salesConsumption.forEach(product => {
      product.ingredient_consumption.forEach(ingredient => {
        if (!itemConsumption[ingredient.item_id]) {
          itemConsumption[ingredient.item_id] = {
            total_consumed: 0,
            consumption_rate: 0,
            item_name: ingredient.item_name
          };
        }
        
        itemConsumption[ingredient.item_id].total_consumed += ingredient.total_consumed;
        itemConsumption[ingredient.item_id].consumption_rate += ingredient.consumption_rate;
      });
    });

    // Convert to consumption patterns with analysis
    Object.entries(itemConsumption).forEach(([itemId, data]) => {
      patterns.push({
        item_id: itemId,
        item_name: data.item_name,
        daily_average: data.consumption_rate,
        weekly_trend: data.consumption_rate * 7,
        seasonal_factor: 1.0, // Could be enhanced with seasonal analysis
        forecast_accuracy: 85.0, // Could be calculated based on historical accuracy
        last_updated: new Date().toISOString()
      });
    });

    return patterns;
  } catch (error) {
    console.error('Error calculating consumption patterns:', error);
    return [];
  }
};

export const generateReorderRecommendations = async (storeId: string): Promise<ReorderRecommendation[]> => {
  try {
    const [patterns, inventory] = await Promise.all([
      calculateConsumptionPatterns(storeId),
      supabase
        .from('inventory_stock')
        .select('*')
        .eq('store_id', storeId)
        .eq('is_active', true)
    ]);

    if (inventory.error) throw inventory.error;

    const recommendations: ReorderRecommendation[] = [];

    inventory.data?.forEach(item => {
      const pattern = patterns.find(p => p.item_id === item.id);
      if (!pattern) return;

      const consumptionRate = pattern.daily_average;
      const currentStock = item.stock_quantity;
      const minimumThreshold = item.minimum_threshold || 10;
      
      // Calculate days until stockout
      const daysUntilStockout = consumptionRate > 0 ? Math.floor(currentStock / consumptionRate) : 999;
      
      // Determine urgency level
      let urgencyLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (daysUntilStockout <= 1) urgencyLevel = 'critical';
      else if (daysUntilStockout <= 3) urgencyLevel = 'high';
      else if (daysUntilStockout <= 7) urgencyLevel = 'medium';
      
      // Calculate recommended order quantity (30 days supply)
      const recommendedOrderQuantity = Math.max(
        Math.ceil(consumptionRate * 30),
        minimumThreshold * 2
      );
      
      // Calculate cost impact
      const costImpact = recommendedOrderQuantity * (item.cost || 0);
      
      // Only recommend if stock is low or consumption rate is high
      if (currentStock <= minimumThreshold || urgencyLevel !== 'low') {
        recommendations.push({
          item_id: item.id,
          item_name: item.item,
          current_stock: currentStock,
          minimum_threshold: minimumThreshold,
          recommended_order_quantity: recommendedOrderQuantity,
          consumption_rate: consumptionRate,
          days_until_stockout: daysUntilStockout,
          urgency_level: urgencyLevel,
          cost_impact: costImpact,
          supplier_lead_time: 3, // Default lead time
          last_order_date: item.last_restocked?.split('T')[0]
        });
      }
    });

    return recommendations.sort((a, b) => {
      const urgencyOrder = { critical: 4, high: 3, medium: 2, low: 1 };
      return urgencyOrder[b.urgency_level] - urgencyOrder[a.urgency_level];
    });
  } catch (error) {
    console.error('Error generating reorder recommendations:', error);
    toast.error('Failed to generate reorder recommendations');
    return [];
  }
};
