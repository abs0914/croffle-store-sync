import { supabase } from '@/integrations/supabase/client';

export interface RecipeCostBreakdown {
  templateId: string;
  totalCost: number;
  costPerServing: number;
  suggestedPrice: number;
  profitability: number; // For backward compatibility
  ingredients: Array<{ // For backward compatibility
    ingredient_name: string;
    cost_per_unit: number;
    quantity: number;
    total_cost: number;
    percentage_of_total: number;
  }>;
  ingredientCosts: Array<{
    name: string;
    unit: string;
    ingredient_name: string;
    cost_per_unit: number;
    quantity: number;
    total_cost: number;
    totalCost: number; // For backwards compatibility
    percentage_of_total: number;
    percentageOfTotal: number; // For backwards compatibility
  }>;
  laborCost?: number;
  overheadCost?: number;
}

export interface IngredientCostAlert {
  templateId: string;
  templateName: string;
  ingredient_name: string;
  ingredientName: string; // For backward compatibility
  current_cost: number;
  average_cost: number;
  variance_percentage: number;
  percentageIncrease: number; // For backward compatibility
  alert_type: 'high' | 'low' | 'stable';
  severity: 'high' | 'medium' | 'low'; // For backward compatibility
  recommendation: string;
}

export interface CostTrend {
  templateId: string;
  templateName: string;
  period: string;
  cost_data: Array<{
    date: string;
    cost: number;
  }>;
  trend: 'increasing' | 'decreasing' | 'stable';
}

/**
 * Calculate detailed cost breakdown for a recipe template
 */
export const getRecipeCostBreakdown = async (templateId: string): Promise<RecipeCostBreakdown> => {
  try {
    const { data: template, error } = await supabase
      .from('recipe_templates')
      .select(`
        *,
        ingredients:recipe_template_ingredients(*)
      `)
      .eq('id', templateId)
      .single();

    if (error) throw error;

    const ingredientCosts = template.ingredients.map((ingredient: any) => {
      const totalCost = ingredient.quantity * (ingredient.cost_per_unit || 0);
      return {
        name: ingredient.ingredient_name,
        unit: ingredient.unit || 'piece',
        ingredient_name: ingredient.ingredient_name,
        cost_per_unit: ingredient.cost_per_unit || 0,
        quantity: ingredient.quantity,
        total_cost: totalCost,
        totalCost, // For backwards compatibility
        percentage_of_total: 0, // Will be calculated after total
        percentageOfTotal: 0 // For backwards compatibility
      };
    });

    const totalCost = ingredientCosts.reduce((sum, ing) => sum + ing.total_cost, 0);
    
    // Calculate percentages
    ingredientCosts.forEach(ingredient => {
      ingredient.percentage_of_total = totalCost > 0 ? (ingredient.total_cost / totalCost) * 100 : 0;
      ingredient.percentageOfTotal = ingredient.percentage_of_total; // For backwards compatibility
    });

    const costPerServing = template.yield_quantity > 0 ? totalCost / template.yield_quantity : 0;

    return {
      templateId,
      totalCost,
      costPerServing,
      suggestedPrice: costPerServing * 1.5, // 50% markup
      profitability: totalCost > 0 ? ((100 - totalCost) / totalCost) * 100 : 0,
      ingredients: ingredientCosts,
      ingredientCosts,
      laborCost: 0, // Can be enhanced later
      overheadCost: 0 // Can be enhanced later
    };
  } catch (error) {
    console.error('Error calculating cost breakdown:', error);
    return {
      templateId,
      totalCost: 0,
      costPerServing: 0,
      suggestedPrice: 0,
      ingredientCosts: [],
      laborCost: 0,
      overheadCost: 0
    };
  }
};

/**
 * Get cost alerts for ingredients that have significant price changes
 */
export const getIngredientCostAlerts = async (): Promise<IngredientCostAlert[]> => {
  try {
    // For now, return mock data. This can be enhanced with actual cost tracking
    const alerts: IngredientCostAlert[] = [
      {
        templateId: 'template-1',
        templateName: 'Classic Croffle',
        ingredient_name: 'Flour',
        ingredientName: 'Flour',
        current_cost: 45.0,
        average_cost: 40.0,
        variance_percentage: 12.5,
        percentageIncrease: 12.5,
        alert_type: 'high',
        severity: 'high',
        recommendation: 'Consider bulk purchasing or alternative suppliers'
      },
      {
        templateId: 'template-2',
        templateName: 'Chocolate Croffle',
        ingredient_name: 'Chocolate Chips',
        current_cost: 180.0,
        average_cost: 200.0,
        variance_percentage: -10.0,
        alert_type: 'low',
        recommendation: 'Good time to stock up on this ingredient'
      }
    ];

    return alerts;
  } catch (error) {
    console.error('Error fetching cost alerts:', error);
    return [];
  }
};

/**
 * Get cost trends for recipe templates over time
 */
export const getRecipeCostTrends = async (templateId?: string): Promise<CostTrend[]> => {
  try {
    // Mock data for demonstration
    const trends: CostTrend[] = [
      {
        templateId: 'template-1',
        templateName: 'Classic Croffle',
        period: 'last_30_days',
        cost_data: [
          { date: '2024-01-01', cost: 35.0 },
          { date: '2024-01-15', cost: 37.5 },
          { date: '2024-01-30', cost: 40.0 }
        ],
        trend: 'increasing'
      }
    ];

    return templateId ? trends.filter(t => t.templateId === templateId) : trends;
  } catch (error) {
    console.error('Error fetching cost trends:', error);
    return [];
  }
};

/**
 * Calculate cost variance for an ingredient compared to historical average
 */
export const calculateCostVariance = (currentCost: number, averageCost: number): number => {
  if (averageCost === 0) return 0;
  return ((currentCost - averageCost) / averageCost) * 100;
};

/**
 * Get cost efficiency recommendations for a recipe template
 */
export const getCostOptimizationRecommendations = async (templateId: string): Promise<string[]> => {
  try {
    const costBreakdown = await getRecipeCostBreakdown(templateId);
    const recommendations: string[] = [];

    // Find most expensive ingredients (>30% of total cost)
    const expensiveIngredients = costBreakdown.ingredientCosts.filter(
      ing => ing.percentage_of_total > 30
    );

    if (expensiveIngredients.length > 0) {
      recommendations.push(
        `Consider alternative sources for ${expensiveIngredients.map(ing => ing.ingredient_name).join(', ')} as they represent ${expensiveIngredients.reduce((sum, ing) => sum + ing.percentage_of_total, 0).toFixed(1)}% of total cost`
      );
    }

    // Check for optimization opportunities
    if (costBreakdown.totalCost > 50) {
      recommendations.push('Recipe cost is above ₱50. Consider portion size optimization.');
    }

    if (costBreakdown.ingredientCosts.length > 10) {
      recommendations.push('Recipe complexity is high. Consider consolidating similar ingredients.');
    }

    return recommendations;
  } catch (error) {
    console.error('Error generating cost recommendations:', error);
    return [];
  }
};