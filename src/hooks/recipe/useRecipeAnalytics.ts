
import { useState, useEffect } from 'react';
import { 
  getRecipeTemplatesWithMetrics,
  getTemplateDeploymentSummary,
  RecipeTemplateWithMetrics,
  TemplateDeploymentSummary
} from '@/services/recipeManagement/recipeTemplateService';
import { 
  getRecipeCostBreakdown,
  getIngredientCostAlerts,
  getRecipeCostTrends,
  RecipeCostBreakdown,
  IngredientCostAlert,
  CostTrend
} from '@/services/recipeManagement/recipeCostAnalytics';

export interface RecipeAnalyticsData {
  templates: RecipeTemplateWithMetrics[];
  costAlerts: IngredientCostAlert[];
  topPerformingTemplates: RecipeTemplateWithMetrics[];
  totalRevenue: number;
  averageProfitMargin: number;
  mostDeployedTemplate: RecipeTemplateWithMetrics | null;
}

export function useRecipeAnalytics() {
  const [data, setData] = useState<RecipeAnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [templates, alerts] = await Promise.all([
        getRecipeTemplatesWithMetrics(),
        getIngredientCostAlerts()
      ]);

      // Calculate analytics
      const totalRevenue = templates.reduce((sum, t) => sum + t.totalRevenue, 0);
      const averageProfitMargin = templates.length > 0 
        ? templates.reduce((sum, t) => sum + t.profitMargin, 0) / templates.length 
        : 0;

      const topPerformingTemplates = [...templates]
        .sort((a, b) => b.popularityScore - a.popularityScore)
        .slice(0, 5);

      const mostDeployedTemplate = templates.reduce((max, template) => 
        template.deploymentCount > (max?.deploymentCount || 0) ? template : max, 
        null as RecipeTemplateWithMetrics | null
      );

      setData({
        templates,
        costAlerts: alerts,
        topPerformingTemplates,
        totalRevenue,
        averageProfitMargin,
        mostDeployedTemplate
      });
    } catch (err) {
      console.error('Error loading recipe analytics:', err);
      setError('Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, []);

  return {
    data,
    loading,
    error,
    refresh: loadAnalytics
  };
}

export function useRecipeCostAnalysis(recipeId: string | null) {
  const [costBreakdown, setCostBreakdown] = useState<RecipeCostBreakdown | null>(null);
  const [costTrends, setCostTrends] = useState<CostTrend[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!recipeId) return;

    const loadCostAnalysis = async () => {
      setLoading(true);
      try {
        const [breakdown, trends] = await Promise.all([
          getRecipeCostBreakdown(recipeId),
          getRecipeCostTrends(recipeId, 30)
        ]);

        setCostBreakdown(breakdown);
        setCostTrends(trends);
      } catch (error) {
        console.error('Error loading cost analysis:', error);
      } finally {
        setLoading(false);
      }
    };

    loadCostAnalysis();
  }, [recipeId]);

  return {
    costBreakdown,
    costTrends,
    loading
  };
}

export function useTemplateDeployment(templateId: string | null) {
  const [deploymentSummary, setDeploymentSummary] = useState<TemplateDeploymentSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!templateId) return;

    const loadDeploymentData = async () => {
      setLoading(true);
      try {
        const summary = await getTemplateDeploymentSummary(templateId);
        setDeploymentSummary(summary);
      } catch (error) {
        console.error('Error loading deployment data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDeploymentData();
  }, [templateId]);

  return {
    deploymentSummary,
    loading
  };
}
