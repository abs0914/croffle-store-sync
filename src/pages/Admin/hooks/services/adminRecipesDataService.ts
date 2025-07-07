import { supabase } from '@/integrations/supabase/client';
import { Recipe } from '@/types/inventoryManagement';
import { Store } from '@/types';

export const fetchRecipes = async (storeFilter: string): Promise<Recipe[]> => {
  console.log('Fetching recipe templates with deployment status for store filter:', storeFilter);
  
  // Fetch recipe templates instead of deployed recipes
  const { data: templates, error: templatesError } = await supabase
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
        stores:store_id (
          id,
          name,
          location_type
        ),
        products:product_id (
          id,
          name,
          sku,
          price
        )
      )
    `)
    .eq('is_active', true)
    .order('created_at', { ascending: false });

  if (templatesError) {
    console.error('Error fetching recipe templates:', templatesError);
    throw templatesError;
  }

  console.log('Fetched recipe templates:', templates?.length || 0);
  
  // Transform templates to show deployment status
  const transformedRecipes = (templates || []).map(template => {
    // Filter deployments by store if specified
    let deployments = template.deployed_recipes || [];
    if (storeFilter !== 'all' && storeFilter) {
      deployments = deployments.filter((deployment: any) => deployment.store_id === storeFilter);
    }

    // Create a summary entry representing the template with deployment info
    return {
      id: template.id, // Use template ID
      name: template.name,
      description: template.description || '',
      instructions: template.instructions || '',
      category: template.category_name || 'General',
      ingredients: template.ingredients || [],
      template_id: template.id,
      // Required Recipe fields
      version: 1,
      approval_status: 'approved' as const,
      yield_quantity: template.yield_quantity || 1,
      serving_size: template.serving_size || 1,
      total_cost: 0, // Templates don't have costs
      cost_per_serving: 0,
      product_id: null,
      store_id: storeFilter !== 'all' ? storeFilter : null,
      created_at: template.created_at,
      updated_at: template.updated_at,
      is_active: template.is_active,
      // Custom fields for template display
      deployment_count: deployments.length,
      deployed_stores: deployments.map((d: any) => d.stores?.name).filter(Boolean),
      is_deployed: deployments.length > 0,
      deployment_status: deployments.length > 0 ? 'deployed' : 'not_deployed',
      ingredient_count: template.ingredients?.length || 0,
      store_name: deployments.length === 1 ? deployments[0].stores?.name : `${deployments.length} stores`,
      deployments: deployments
    };
  });
  
  console.log('Transformed recipe templates:', transformedRecipes.length);
  return transformedRecipes as any;
};

export const fetchStores = async (): Promise<Store[]> => {
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .eq('is_active', true)
    .order('name');

  if (error) {
    throw error;
  }

  console.log('Fetched stores:', data?.length || 0);
  return (data as Store[]) || [];
};