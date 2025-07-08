
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface RecipeCostBreakdown {
  recipeId: string;
  recipeName: string;
  totalCost: number;
  costPerServing: number;
  ingredients: {
    name: string;
    quantity: number;
    unit: string;
    costPerUnit: number;
    totalCost: number;
    percentageOfTotal: number;
  }[];
  profitability: {
    suggestedPrice: number;
    profitMargin: number;
    competitivePrice: number;
    priceFloor: number;
  };
}

export interface CostTrend {
  date: string;
  totalCost: number;
  majorCostDrivers: string[];
}

export interface IngredientCostAlert {
  ingredientName: string;
  currentCost: number;
  previousCost: number;
  percentageIncrease: number;
  affectedRecipes: string[];
  severity: 'low' | 'medium' | 'high';
}

export const getRecipeCostBreakdown = async (recipeId: string): Promise<RecipeCostBreakdown | null> => {
  try {
    const { data: recipe, error } = await supabase
      .from('recipes')
      .select(`
        *,
        ingredients:recipe_ingredients(
          *,
          inventory_stock:inventory_stock(item, cost),
          commissary_inventory:commissary_inventory(name, unit_cost)
        )
      `)
      .eq('id', recipeId)
      .single();

    if (error) throw error;

    const ingredients = (recipe.ingredients || []).map((ing: any) => {
      const itemName = ing.inventory_stock?.item || ing.commissary_inventory?.name || 'Unknown';
      const costPerUnit = ing.cost_per_unit || ing.inventory_stock?.cost || ing.commissary_inventory?.unit_cost || 0;
      const totalCost = ing.quantity * costPerUnit;

      return {
        name: itemName,
        quantity: ing.quantity,
        unit: ing.unit,
        costPerUnit,
        totalCost,
        percentageOfTotal: 0 // Will be calculated below
      };
    });

    const totalCost = ingredients.reduce((sum, ing) => sum + ing.totalCost, 0);
    const costPerServing = totalCost / (recipe.serving_size || 1);

    // Calculate percentages
    ingredients.forEach(ing => {
      ing.percentageOfTotal = totalCost > 0 ? (ing.totalCost / totalCost) * 100 : 0;
    });

    // Provide cost-based pricing suggestions without automatic markup
    const profitability = {
      suggestedPrice: totalCost, // Base cost - manual markup can be applied
      profitMargin: 0, // No automatic margin
      competitivePrice: totalCost, // Same as base cost
      priceFloor: totalCost // Minimum is the cost
    };

    return {
      recipeId,
      recipeName: recipe.name,
      totalCost,
      costPerServing,
      ingredients,
      profitability
    };
  } catch (error) {
    console.error('Error getting recipe cost breakdown:', error);
    return null;
  }
};

export const getRecipeCostTrends = async (
  recipeId: string,
  days: number = 30
): Promise<CostTrend[]> => {
  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // This would typically pull from historical cost data
    // For now, we'll simulate trend data
    const trends: CostTrend[] = [];
    
    for (let i = 0; i < days; i += 7) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      
      // Simulate cost data - in real implementation, this would come from actual historical records
      trends.push({
        date: date.toISOString().split('T')[0],
        totalCost: 150 + Math.random() * 50, // Simulated cost variation
        majorCostDrivers: ['Flour', 'Milk', 'Sugar'] // Top cost contributors
      });
    }

    return trends;
  } catch (error) {
    console.error('Error getting recipe cost trends:', error);
    return [];
  }
};

export const getIngredientCostAlerts = async (storeId?: string): Promise<IngredientCostAlert[]> => {
  try {
    // Get recent cost changes from commissary purchases
    const { data: recentPurchases, error } = await supabase
      .from('commissary_purchases')
      .select(`
        *,
        commissary_inventory:commissary_item_id(name, unit_cost, category)
      `)
      .gte('purchase_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
      .order('purchase_date', { ascending: false });

    if (error) throw error;

    const alerts: IngredientCostAlert[] = [];
    const processedItems = new Set();

    for (const purchase of recentPurchases || []) {
      const itemName = purchase.commissary_inventory?.name;
      if (!itemName || processedItems.has(itemName)) continue;

      const currentCost = purchase.unit_cost;
      const previousCost = purchase.commissary_inventory?.unit_cost || currentCost;
      
      if (currentCost > previousCost) {
        const percentageIncrease = ((currentCost - previousCost) / previousCost) * 100;
        
        // Get affected recipes
        const { data: affectedRecipes } = await supabase
          .from('recipe_template_ingredients')
          .select(`
            recipe_template:recipe_templates(name)
          `)
          .eq('commissary_item_name', itemName);

        const severity: 'low' | 'medium' | 'high' = 
          percentageIncrease > 25 ? 'high' : 
          percentageIncrease > 10 ? 'medium' : 'low';

        alerts.push({
          ingredientName: itemName,
          currentCost,
          previousCost,
          percentageIncrease,
          affectedRecipes: affectedRecipes?.map((r: any) => r.recipe_template?.name).filter(Boolean) || [],
          severity
        });

        processedItems.add(itemName);
      }
    }

    return alerts.sort((a, b) => b.percentageIncrease - a.percentageIncrease);
  } catch (error) {
    console.error('Error getting ingredient cost alerts:', error);
    return [];
  }
};

export const calculateBatchCost = async (
  recipeId: string,
  batchSize: number
): Promise<{
  totalCost: number;
  costPerUnit: number;
  ingredients: { name: string; totalQuantity: number; totalCost: number }[];
} | null> => {
  try {
    const breakdown = await getRecipeCostBreakdown(recipeId);
    if (!breakdown) return null;

    const multiplier = batchSize / (breakdown.ingredients.length > 0 ? 1 : 1);

    return {
      totalCost: breakdown.totalCost * multiplier,
      costPerUnit: breakdown.costPerServing,
      ingredients: breakdown.ingredients.map(ing => ({
        name: ing.name,
        totalQuantity: ing.quantity * multiplier,
        totalCost: ing.totalCost * multiplier
      }))
    };
  } catch (error) {
    console.error('Error calculating batch cost:', error);
    return null;
  }
};

export const optimizeRecipeCost = async (recipeId: string): Promise<{
  currentCost: number;
  optimizedCost: number;
  savings: number;
  suggestions: {
    type: 'substitute' | 'quantity' | 'supplier';
    description: string;
    impact: number;
  }[];
} | null> => {
  try {
    const breakdown = await getRecipeCostBreakdown(recipeId);
    if (!breakdown) return null;

    // Generate cost optimization suggestions
    const suggestions = [];
    let totalSavings = 0;

    // Identify expensive ingredients (>20% of total cost)
    const expensiveIngredients = breakdown.ingredients.filter(ing => ing.percentageOfTotal > 20);
    
    for (const ingredient of expensiveIngredients) {
      // Suggest quantity optimization
      suggestions.push({
        type: 'quantity' as const,
        description: `Consider reducing ${ingredient.name} by 10% - minimal taste impact`,
        impact: ingredient.totalCost * 0.1
      });

      // Suggest substitution
      suggestions.push({
        type: 'substitute' as const,
        description: `Find alternative supplier for ${ingredient.name}`,
        impact: ingredient.totalCost * 0.15
      });

      totalSavings += ingredient.totalCost * 0.1;
    }

    return {
      currentCost: breakdown.totalCost,
      optimizedCost: breakdown.totalCost - totalSavings,
      savings: totalSavings,
      suggestions
    };
  } catch (error) {
    console.error('Error optimizing recipe cost:', error);
    return null;
  }
};
