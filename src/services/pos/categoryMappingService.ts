import { supabase } from '@/integrations/supabase/client';
import { Category } from '@/types';

/**
 * POS Category Mapping Service
 * 
 * This service provides category mapping for the POS system,
 * mapping recipe template categories to proper POS categories.
 */

export interface CategoryMapping {
  templateCategory: string;
  posCategory: string;
  displayName: string;
}

// Standard category mappings from recipe templates to POS categories
export const CATEGORY_MAPPINGS: CategoryMapping[] = [
  { templateCategory: 'classic', posCategory: 'Classic', displayName: 'Classic' },
  { templateCategory: 'Classic', posCategory: 'Classic', displayName: 'Classic' },
  { templateCategory: 'addon', posCategory: 'Add-ons', displayName: 'Add-ons' },
  { templateCategory: 'Add-ons', posCategory: 'Add-ons', displayName: 'Add-ons' },
  { templateCategory: 'beverages', posCategory: 'Beverages', displayName: 'Beverages' },
  { templateCategory: 'Beverages', posCategory: 'Beverages', displayName: 'Beverages' },
  { templateCategory: 'espresso', posCategory: 'Espresso', displayName: 'Espresso' },
  { templateCategory: 'Espresso', posCategory: 'Espresso', displayName: 'Espresso' },
  { templateCategory: 'croffle_overload', posCategory: 'Croffle Overload', displayName: 'Croffle Overload' },
  { templateCategory: 'mini_croffle', posCategory: 'Mini Croffle', displayName: 'Mini Croffle' },
  { templateCategory: 'combo', posCategory: 'Combo', displayName: 'Combo' },
  { templateCategory: 'others', posCategory: 'Beverages', displayName: 'Beverages' }, // Map 'others' to 'Beverages'
];

/**
 * Get the POS category name for a recipe template category
 */
export const getPOSCategoryName = (templateCategory: string): string => {
  const mapping = CATEGORY_MAPPINGS.find(
    m => m.templateCategory.toLowerCase() === templateCategory.toLowerCase()
  );
  
  return mapping?.displayName || 'Other';
};

/**
 * Get or create POS categories for a store based on deployed products
 */
export const getOrCreatePOSCategories = async (storeId: string): Promise<Category[]> => {
  try {
    // Get all unique template categories from deployed recipes in this store
    const { data: recipes, error: recipesError } = await supabase
      .from('recipes')
      .select(`
        id,
        recipe_templates!inner(
          category_name
        )
      `)
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (recipesError) {
      console.error('Error fetching recipes:', recipesError);
      return [];
    }

    // Get unique template categories
    const templateCategories = [...new Set(
      recipes?.map((r: any) => r.recipe_templates?.category_name).filter(Boolean) || []
    )];

    console.log('Template categories found:', templateCategories);

    // Map to POS categories
    const posCategoryNames = [...new Set(
      templateCategories.map(tc => getPOSCategoryName(tc))
    )];

    console.log('POS categories needed:', posCategoryNames);

    // Get existing categories for this store
    const { data: existingCategories, error: categoriesError } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (categoriesError) {
      console.error('Error fetching categories:', categoriesError);
      return [];
    }

    const existingCategoryNames = existingCategories?.map(c => c.name) || [];
    const categoriesToCreate = posCategoryNames.filter(name => !existingCategoryNames.includes(name));

    // Create missing categories
    if (categoriesToCreate.length > 0) {
      console.log('Creating missing categories:', categoriesToCreate);
      
      const newCategories = categoriesToCreate.map(name => ({
        name,
        description: `Category for ${name.toLowerCase()} items`,
        store_id: storeId,
        is_active: true
      }));

      const { error: createError } = await supabase
        .from('categories')
        .insert(newCategories);

      if (createError) {
        console.error('Error creating categories:', createError);
      }
    }

    // Fetch all categories again
    const { data: allCategories, error: finalError } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (finalError) {
      console.error('Error fetching final categories:', finalError);
      return [];
    }

    // Apply custom POS ordering
    const { sortCategoriesForPOS } = await import('@/utils/categoryOrdering');
    return sortCategoriesForPOS(allCategories || []);

  } catch (error) {
    console.error('Error in getOrCreatePOSCategories:', error);
    return [];
  }
};

/**
 * Get the category for a product based on its recipe template
 */
export const getProductCategory = async (productId: string): Promise<Category | null> => {
  try {
    const { data: product, error } = await supabase
      .from('product_catalog')
      .select(`
        id,
        store_id,
        recipes!inner(
          template_id,
          recipe_templates!inner(
            category_name
          )
        )
      `)
      .eq('id', productId)
      .single();

    if (error || !product) {
      return null;
    }

    const templateCategory = (product as any).recipes?.recipe_templates?.category_name;
    if (!templateCategory) {
      return null;
    }

    const posCategoryName = getPOSCategoryName(templateCategory);
    
    // Find the category in the store
    const { data: category, error: categoryError } = await supabase
      .from('categories')
      .select('*')
      .eq('store_id', product.store_id)
      .eq('name', posCategoryName)
      .eq('is_active', true)
      .single();

    if (categoryError) {
      return null;
    }

    return category;

  } catch (error) {
    console.error('Error getting product category:', error);
    return null;
  }
};

/**
 * Enhance products with category information based on recipe templates
 */
export const enhanceProductsWithCategories = async (products: any[], storeId: string): Promise<any[]> => {
  try {
    console.log(`🔄 [CATEGORY MAPPING] Enhancing ${products.length} products with categories for store ${storeId}`);
    console.log(`🔄 [CATEGORY MAPPING] Store ID: ${storeId}`);
    console.log(`🔄 [CATEGORY MAPPING] Products:`, products.map(p => p.name));

    // Get all categories for this store
    const categories = await getOrCreatePOSCategories(storeId);
    const categoryMap = new Map(categories.map(c => [c.name, c]));

    console.log(`🏷️ [CATEGORY MAPPING] Available categories:`, Array.from(categoryMap.keys()));
    console.log(`🏷️ [CATEGORY MAPPING] Category details:`, categories);

    // Get all recipes with their template categories in one query for efficiency
    const recipeIds = products.map(p => p.recipe_id).filter(Boolean);

    let recipeTemplateMap = new Map();

    if (recipeIds.length > 0) {
      const { data: recipes, error } = await supabase
        .from('recipes')
        .select(`
          id,
          template_id,
          recipe_templates!inner(
            category_name
          )
        `)
        .in('id', recipeIds);

      if (!error && recipes) {
        recipes.forEach(recipe => {
          const templateCategory = (recipe as any).recipe_templates?.category_name;
          recipeTemplateMap.set(recipe.id, templateCategory);
        });
      }
    }

    // Enhance each product
    const enhancedProducts = products.map((product) => {
      if (!product.recipe_id) {
        // Product without recipe - assign to "Classic" category as default
        const defaultCategory = categoryMap.get('Classic') || categoryMap.get('Other');
        console.log(`📦 ${product.name}: No recipe, using default category "${defaultCategory?.name}"`);
        return {
          ...product,
          category_id: defaultCategory?.id,
          category: defaultCategory,
          template_category: 'none'
        };
      }

      const templateCategory = recipeTemplateMap.get(product.recipe_id);
      const posCategoryName = getPOSCategoryName(templateCategory || 'Classic');
      const category = categoryMap.get(posCategoryName);

      console.log(`📦 [CATEGORY MAPPING] ${product.name}: template="${templateCategory}" → POS="${posCategoryName}" → category="${category?.name}" (${category?.id})`);

      return {
        ...product,
        category_id: category?.id,
        category: category,
        template_category: templateCategory // For debugging
      };
    });

    console.log(`✅ [CATEGORY MAPPING] Enhanced ${enhancedProducts.length} products with categories`);
    console.log(`✅ [CATEGORY MAPPING] Final products:`, enhancedProducts.map(p => ({ name: p.name, category: p.category?.name, category_id: p.category_id })));
    return enhancedProducts;

  } catch (error) {
    console.error('Error enhancing products with categories:', error);
    return products;
  }
};
