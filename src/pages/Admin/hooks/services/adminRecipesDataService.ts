
import { supabase } from '@/integrations/supabase/client';
import { Recipe } from '@/types/inventoryManagement';
import { Store } from '@/types';

export const fetchRecipes = async (storeFilter: string): Promise<Recipe[]> => {
  console.log('Fetching deployed recipes for store filter:', storeFilter);
  
  // Build the query based on store filter with more detailed selection
  let query = supabase
    .from('recipes')
    .select(`
      *,
      recipe_ingredients (
        *,
        inventory_stock (*)
      ),
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
    `)
    .order('created_at', { ascending: false });

  // Apply store filter if not "all"
  if (storeFilter !== 'all' && storeFilter) {
    console.log('Filtering by store:', storeFilter);
    query = query.eq('store_id', storeFilter);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recipes:', error);
    throw error;
  }

  console.log('Fetched raw recipes:', data?.length || 0);
  console.log('Sample recipe data:', data?.[0]);
  
  if (data && data.length > 0) {
    // Check for duplicates before transformation
    const duplicateCheck = data.reduce((acc: any, recipe: any) => {
      const key = `${recipe.name}-${recipe.store_id}`;
      if (!acc[key]) {
        acc[key] = 0;
      }
      acc[key]++;
      return acc;
    }, {});
    
    const duplicates = Object.entries(duplicateCheck).filter(([_, count]) => (count as number) > 1);
    if (duplicates.length > 0) {
      console.warn('Duplicates detected in raw data:', duplicates);
      console.warn('Duplicate recipes by store:', duplicates.map(([key, count]) => `${key}: ${count} copies`));
    }
  }
  
  // Transform the data to match our Recipe interface
  const transformedRecipes = (data || []).map(recipe => ({
    ...recipe,
    ingredients: recipe.recipe_ingredients || [],
    store_name: recipe.stores?.name || 'Unknown Store',
    product_info: recipe.products || null,
    // Add debugging info
    _debug: {
      raw_store_id: recipe.store_id,
      store_name: recipe.stores?.name,
      ingredient_count: recipe.recipe_ingredients?.length || 0,
      has_product: !!recipe.product_id,
      created_at: recipe.created_at
    }
  })) as Recipe[];
  
  console.log('Transformed recipes:', transformedRecipes.length);
  console.log('Recipe transformation sample:', {
    original: data?.[0],
    transformed: transformedRecipes[0]
  });
  
  // Additional duplicate check after transformation
  const transformedDuplicateCheck = transformedRecipes.reduce((acc: any, recipe: any) => {
    const key = `${recipe.name}-${recipe.store_id}`;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push({
      id: recipe.id,
      created_at: recipe.created_at,
      approval_status: recipe.approval_status
    });
    return acc;
  }, {});
  
  const transformedDuplicates = Object.entries(transformedDuplicateCheck).filter(([_, recipes]) => (recipes as any[]).length > 1);
  if (transformedDuplicates.length > 0) {
    console.error('CRITICAL: Duplicates found in transformed data:', transformedDuplicates);
    transformedDuplicates.forEach(([key, duplicateRecipes]) => {
      console.error(`Duplicate set for ${key}:`, duplicateRecipes);
    });
  }
  
  return transformedRecipes;
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
