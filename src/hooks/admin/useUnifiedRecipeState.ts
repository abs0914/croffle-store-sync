import React, { useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Unified data types for both templates and recipes
export interface UnifiedRecipeItem {
  id: string;
  name: string;
  description?: string;
  instructions?: string;
  category_name?: string;
  image_url?: string;
  images?: any[];
  recipe_type?: 'single' | 'combo' | 'component';
  combo_rules?: {
    pricing_matrix?: Array<{
      primary_component: string;
      secondary_component: string;
      price: number;
    }>;
  };
  yield_quantity: number;
  serving_size: number;
  total_cost: number;
  cost_per_serving: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  
  // Template-specific fields
  template_id?: string;
  version?: number;
  
  // Recipe-specific fields
  store_id?: string;
  approval_status?: string;
  product_id?: string;
  
  // Computed fields
  item_type: 'template' | 'recipe';
  deployment_count?: number;
  deployed_stores?: string[];
  store_name?: string;
  
  // Relations
  ingredients?: any[];
  components?: any[];
}

export interface UnifiedRecipeFilters {
  search: string;
  status: string;
  store: string;
  category: string;
  itemType: 'all' | 'template' | 'recipe';
}

/**
 * Unified hook for managing both recipe templates and deployed recipes
 * with proper caching, real-time updates, and state synchronization
 */
export function useUnifiedRecipeState() {
  const queryClient = useQueryClient();

  // Fetch templates with deployment metadata
  const templatesQuery = useQuery({
    queryKey: ['recipe-templates'],
    queryFn: async (): Promise<UnifiedRecipeItem[]> => {
      const { data, error } = await supabase
        .from('recipe_templates')
        .select(`
          *,
          ingredients:recipe_template_ingredients(*),
          deployed_recipes:recipes(
            id,
            store_id,
            approval_status,
            is_active,
            created_at,
            stores:store_id(name)
          )
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(template => ({
        ...template,
        item_type: 'template' as const,
        recipe_type: (template.recipe_type as 'single' | 'combo' | 'component') || 'single',
        deployment_count: template.deployed_recipes?.length || 0,
        deployed_stores: template.deployed_recipes?.map((r: any) => r.stores?.name).filter(Boolean) || [],
        ingredients: template.ingredients || [],
        images: Array.isArray(template.images) ? template.images : 
                (template.images ? JSON.parse(template.images as string) : []),
        combo_rules: template.combo_rules ? 
                    (typeof template.combo_rules === 'string' ? 
                     JSON.parse(template.combo_rules) : template.combo_rules) : undefined,
        total_cost: 0, // Templates don't have computed costs
        cost_per_serving: 0
      }));
    },
    staleTime: 30000,
    gcTime: 300000
  });

  // Fetch deployed recipes
  const recipesQuery = useQuery({
    queryKey: ['deployed-recipes'],
    queryFn: async (): Promise<UnifiedRecipeItem[]> => {
      const { data, error } = await supabase
        .from('recipes')
        .select(`
          *,
          ingredients:recipe_ingredients(*),
          stores:store_id(name),
          template:template_id(name, version)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(recipe => ({
        ...recipe,
        item_type: 'recipe' as const,
        recipe_type: (recipe.recipe_type as 'single' | 'combo' | 'component') || 'single',
        store_name: recipe.stores?.name,
        template_name: recipe.template?.name,
        template_version: recipe.template?.version,
        ingredients: recipe.ingredients || [],
        images: Array.isArray(recipe.images) ? recipe.images : 
                (recipe.images ? JSON.parse(recipe.images as string) : []),
        combo_rules: recipe.combo_rules ? 
                    (typeof recipe.combo_rules === 'string' ? 
                     JSON.parse(recipe.combo_rules) : recipe.combo_rules) : undefined
      }));
    },
    staleTime: 30000,
    gcTime: 300000
  });

  // Fetch stores for filtering
  const storesQuery = useQuery({
    queryKey: ['stores'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      return data || [];
    },
    staleTime: 300000
  });

  // Template mutations
  const updateTemplateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UnifiedRecipeItem> }) => {
      const { error } = await supabase
        .from('recipe_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { id, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-templates'] });
      toast.success('Template updated successfully');
    },
    onError: (error) => {
      console.error('Template update failed:', error);
      toast.error('Failed to update template');
    }
  });

  // Recipe mutations
  const updateRecipeMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<UnifiedRecipeItem> }) => {
      const { error } = await supabase
        .from('recipes')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      return { id, updates };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployed-recipes'] });
      toast.success('Recipe updated successfully');
    },
    onError: (error) => {
      console.error('Recipe update failed:', error);
      toast.error('Failed to update recipe');
    }
  });

  // Template-Recipe Synchronization
  const syncTemplateToRecipesMutation = useMutation({
    mutationFn: async ({ templateId, updates }: { templateId: string; updates: Partial<UnifiedRecipeItem> }) => {
      // Update template first
      const { error: templateError } = await supabase
        .from('recipe_templates')
        .update(updates)
        .eq('id', templateId);

      if (templateError) throw templateError;

      // Find all deployed recipes using this template
      const { data: deployedRecipes, error: recipesError } = await supabase
        .from('recipes')
        .select('id, store_id')
        .eq('template_id', templateId)
        .eq('is_active', true);

      if (recipesError) throw recipesError;

      // Update all deployed recipes with template changes
      if (deployedRecipes && deployedRecipes.length > 0) {
        const { error: updateError } = await supabase
          .from('recipes')
          .update({
            name: updates.name,
            description: updates.description,
            instructions: updates.instructions,
            yield_quantity: updates.yield_quantity,
            serving_size: updates.serving_size,
            updated_at: new Date().toISOString()
          })
          .in('id', deployedRecipes.map(r => r.id));

        if (updateError) throw updateError;
      }

      return { templateId, affectedRecipes: deployedRecipes?.length || 0 };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['recipe-templates'] });
      queryClient.invalidateQueries({ queryKey: ['deployed-recipes'] });
      toast.success(`Template and ${data.affectedRecipes} deployed recipes synchronized`);
    },
    onError: (error) => {
      console.error('Template synchronization failed:', error);
      toast.error('Failed to synchronize template changes');
    }
  });

  // Delete operations
  const deleteTemplateMutation = useMutation({
    mutationFn: async (templateId: string) => {
      // Check for deployed recipes first
      const { data: deployedRecipes } = await supabase
        .from('recipes')
        .select('id')
        .eq('template_id', templateId);

      if (deployedRecipes && deployedRecipes.length > 0) {
        throw new Error(`Cannot delete template with ${deployedRecipes.length} deployed recipes`);
      }

      // Delete template ingredients first
      await supabase
        .from('recipe_template_ingredients')
        .delete()
        .eq('recipe_template_id', templateId);

      // Delete template
      const { error } = await supabase
        .from('recipe_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;
      return templateId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipe-templates'] });
      toast.success('Template deleted successfully');
    },
    onError: (error) => {
      console.error('Template deletion failed:', error);
      toast.error(error.message);
    }
  });

  // Real-time subscriptions
  useEffect(() => {
    const templatesChannel = supabase
      .channel('recipe-templates-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'recipe_templates'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['recipe-templates'] });
      })
      .subscribe();

    const recipesChannel = supabase
      .channel('recipes-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'recipes'
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['deployed-recipes'] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(templatesChannel);
      supabase.removeChannel(recipesChannel);
    };
  }, [queryClient]);

  return {
    // Data
    templates: templatesQuery.data || [],
    recipes: recipesQuery.data || [],
    stores: storesQuery.data || [],
    
    // Loading states
    isLoadingTemplates: templatesQuery.isLoading,
    isLoadingRecipes: recipesQuery.isLoading,
    isLoadingStores: storesQuery.isLoading,
    
    // Error states
    templatesError: templatesQuery.error,
    recipesError: recipesQuery.error,
    
    // Actions
    updateTemplate: updateTemplateMutation.mutate,
    updateRecipe: updateRecipeMutation.mutate,
    syncTemplateToRecipes: syncTemplateToRecipesMutation.mutate,
    deleteTemplate: deleteTemplateMutation.mutate,
    
    // Action states
    isUpdatingTemplate: updateTemplateMutation.isPending,
    isUpdatingRecipe: updateRecipeMutation.isPending,
    isSyncing: syncTemplateToRecipesMutation.isPending,
    isDeleting: deleteTemplateMutation.isPending,
    
    // Refresh functions
    refetchTemplates: templatesQuery.refetch,
    refetchRecipes: recipesQuery.refetch,
    refetchStores: storesQuery.refetch
  };
}