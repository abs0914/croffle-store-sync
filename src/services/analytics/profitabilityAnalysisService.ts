
import { supabase } from '@/integrations/supabase/client';
import { mapRecipeToInventory } from '../inventory/smartIngredientMapping';

export interface ProductProfitability {
  productName: string;
  sellingPrice: number;
  totalCost: number;
  profitMargin: number;
  profitAmount: number;
  ingredients: {
    name: string;
    cost: number;
    percentage: number;
  }[];
}

export interface StoreAnalytics {
  storeId: string;
  storeName: string;
  totalRevenue: number;
  totalCost: number;
  totalProfit: number;
  profitMargin: number;
  topPerformingProducts: ProductProfitability[];
  lowProfitabilityItems: ProductProfitability[];
}

export const calculateProductProfitability = async (
  productName: string,
  sellingPrice: number,
  storeId: string
): Promise<ProductProfitability> => {
  try {
    const ingredients = await mapRecipeToInventory(productName, storeId);
    
    const totalCost = ingredients.reduce((sum, ingredient) => {
      return sum + (ingredient.cost_per_unit * ingredient.quantity_required);
    }, 0);

    const profitAmount = sellingPrice - totalCost;
    const profitMargin = sellingPrice > 0 ? (profitAmount / sellingPrice) * 100 : 0;

    const ingredientCosts = ingredients.map(ingredient => {
      const cost = ingredient.cost_per_unit * ingredient.quantity_required;
      return {
        name: ingredient.ingredient_name,
        cost,
        percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0
      };
    });

    return {
      productName,
      sellingPrice,
      totalCost,
      profitMargin,
      profitAmount,
      ingredients: ingredientCosts
    };
  } catch (error) {
    console.error('Error calculating product profitability:', error);
    return {
      productName,
      sellingPrice,
      totalCost: 0,
      profitMargin: 0,
      profitAmount: sellingPrice,
      ingredients: []
    };
  }
};

export const generateStoreAnalytics = async (
  storeId: string,
  dateRange: { startDate: Date; endDate: Date }
): Promise<StoreAnalytics> => {
  try {
    // Get store info
    const { data: store } = await supabase
      .from('stores')
      .select('name')
      .eq('id', storeId)
      .single();

    // Get product catalog for the store
    const { data: products } = await supabase
      .from('product_catalog')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_available', true);

    // Get transaction data for the date range
    const { data: transactions } = await supabase
      .from('transactions')
      .select('*')
      .eq('store_id', storeId)
      .gte('created_at', dateRange.startDate.toISOString())
      .lte('created_at', dateRange.endDate.toISOString())
      .eq('status', 'completed');

    const productProfitabilities: ProductProfitability[] = [];
    let totalRevenue = 0;
    let totalCost = 0;

    if (products) {
      for (const product of products) {
        const profitability = await calculateProductProfitability(
          product.product_name,
          product.price,
          storeId
        );
        productProfitabilities.push(profitability);
      }
    }

    // Calculate revenue from transactions
    if (transactions) {
      totalRevenue = transactions.reduce((sum, tx) => sum + tx.total, 0);
    }

    // Calculate total cost based on items sold
    // This is a simplified calculation - in practice, you'd track actual costs per transaction
    totalCost = productProfitabilities.reduce((sum, product) => {
      return sum + product.totalCost;
    }, 0);

    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // Sort by profit margin for insights
    const topPerformingProducts = [...productProfitabilities]
      .filter(p => p.profitMargin > 0)
      .sort((a, b) => b.profitMargin - a.profitMargin)
      .slice(0, 10);

    const lowProfitabilityItems = [...productProfitabilities]
      .filter(p => p.profitMargin < 30) // Less than 30% margin
      .sort((a, b) => a.profitMargin - b.profitMargin)
      .slice(0, 10);

    return {
      storeId,
      storeName: store?.name || 'Unknown Store',
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      topPerformingProducts,
      lowProfitabilityItems
    };
  } catch (error) {
    console.error('Error generating store analytics:', error);
    return {
      storeId,
      storeName: 'Error',
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,
      topPerformingProducts: [],
      lowProfitabilityItems: []
    };
  }
};

export const getTopSellingItems = async (
  storeId: string,
  dateRange: { startDate: Date; endDate: Date },
  limit: number = 10
) => {
  try {
    // This would require parsing transaction items JSON
    // For now, return a placeholder structure
    const { data: transactions } = await supabase
      .from('transactions')
      .select('items')
      .eq('store_id', storeId)
      .gte('created_at', dateRange.startDate.toISOString())
      .lte('created_at', dateRange.endDate.toISOString())
      .eq('status', 'completed');

    // Parse and aggregate items from transactions
    const itemCounts = new Map<string, { count: number; revenue: number }>();
    
    transactions?.forEach(tx => {
      if (tx.items && Array.isArray(tx.items)) {
        tx.items.forEach((item: any) => {
          const current = itemCounts.get(item.name) || { count: 0, revenue: 0 };
          itemCounts.set(item.name, {
            count: current.count + (item.quantity || 1),
            revenue: current.revenue + (item.price * (item.quantity || 1))
          });
        });
      }
    });

    return Array.from(itemCounts.entries())
      .map(([name, data]) => ({
        productName: name,
        quantitySold: data.count,
        revenue: data.revenue
      }))
      .sort((a, b) => b.quantitySold - a.quantitySold)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting top selling items:', error);
    return [];
  }
};
