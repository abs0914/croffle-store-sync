import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Category Mapping Service
 * 
 * Maps recipe template categories to POS product categories
 * and ensures proper category assignment for product catalog entries.
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
  { templateCategory: 'addon', posCategory: 'Add-on', displayName: 'Add-on' },
  { templateCategory: 'Add-on', posCategory: 'Add-on', displayName: 'Add-on' },
  { templateCategory: 'Add-ons', posCategory: 'Add-on', displayName: 'Add-on' },
  { templateCategory: 'beverages', posCategory: 'Beverages', displayName: 'Beverages' },
  { templateCategory: 'Beverages', posCategory: 'Beverages', displayName: 'Beverages' },
  { templateCategory: 'espresso', posCategory: 'Espresso', displayName: 'Espresso' },
  { templateCategory: 'Espresso', posCategory: 'Espresso', displayName: 'Espresso' },
  { templateCategory: 'combo', posCategory: 'Mix & Match', displayName: 'Mix & Match' },
  { templateCategory: 'Combo', posCategory: 'Mix & Match', displayName: 'Mix & Match' },
  { templateCategory: 'premium', posCategory: 'Premium', displayName: 'Premium' },
  { templateCategory: 'Premium', posCategory: 'Premium', displayName: 'Premium' },
  { templateCategory: 'fruity', posCategory: 'Fruity', displayName: 'Fruity' },
  { templateCategory: 'Fruity', posCategory: 'Fruity', displayName: 'Fruity' },
  { templateCategory: 'others', posCategory: 'Beverages', displayName: 'Beverages' }, // Map 'others' to 'Beverages'
];

/**
 * Get or create a POS category for a recipe template category
 */
export const getOrCreatePOSCategory = async (
  templateCategory: string,
  storeId: string
): Promise<string | null> => {
  try {
    // Find the mapping for this template category
    const mapping = CATEGORY_MAPPINGS.find(
      m => m.templateCategory.toLowerCase() === templateCategory.toLowerCase()
    );
    
    const categoryName = mapping?.posCategory || createCategoryName(templateCategory);
    const displayName = mapping?.displayName || categoryName;
    
    console.log(`🏷️ Mapping template category "${templateCategory}" to POS category "${categoryName}"`);
    
    // Check if the category already exists
    const { data: existingCategory, error: fetchError } = await supabase
      .from('categories')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('name', categoryName)
      .eq('is_active', true)
      .maybeSingle();
    
    if (fetchError) {
      console.error('Error fetching category:', fetchError);
      return null;
    }
    
    if (existingCategory) {
      console.log(`✅ Found existing category: ${existingCategory.name} (${existingCategory.id})`);
      return existingCategory.id;
    }
    
    // Create new category
    console.log(`🆕 Creating new category: ${displayName}`);
    const { data: newCategory, error: createError } = await supabase
      .from('categories')
      .insert({
        name: displayName,
        description: `Category for ${displayName.toLowerCase()} items`,
        store_id: storeId,
        is_active: true
      })
      .select('id, name')
      .single();
    
    if (createError) {
      console.error('Error creating category:', createError);
      return null;
    }
    
    console.log(`✅ Created new category: ${newCategory.name} (${newCategory.id})`);
    return newCategory.id;
    
  } catch (error) {
    console.error('Error in getOrCreatePOSCategory:', error);
    return null;
  }
};

/**
 * Ensure all standard categories exist for a store
 */
export const ensureStandardCategories = async (storeId: string): Promise<void> => {
  try {
    console.log(`🏪 Ensuring standard categories exist for store ${storeId}`);
    
    const standardCategories = [
      'Classic',
      'Premium',
      'Fruity',
      'Add-on',
      'Espresso',
      'Beverages',
      'Mix & Match'
    ];
    
    for (const categoryName of standardCategories) {
      await getOrCreatePOSCategory(categoryName, storeId);
    }
    
    console.log('✅ All standard categories ensured');
    
  } catch (error) {
    console.error('Error ensuring standard categories:', error);
    toast.error('Failed to create standard categories');
  }
};

/**
 * Get the display name for a template category
 */
/**
 * Create a proper category name from template category
 */
const createCategoryName = (templateCategory: string): string => {
  // Convert snake_case or camelCase to Title Case
  return templateCategory
    .replace(/([a-z])([A-Z])/g, '$1 $2') // Handle camelCase
    .replace(/_/g, ' ') // Handle snake_case
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const getCategoryDisplayName = (templateCategory: string): string => {
  const mapping = CATEGORY_MAPPINGS.find(
    m => m.templateCategory.toLowerCase() === templateCategory.toLowerCase()
  );
  
  return mapping?.displayName || createCategoryName(templateCategory);
};

/**
 * Update existing product catalog entries to have proper categories
 */
export const updateProductCatalogCategories = async (storeId: string): Promise<void> => {
  try {
    console.log(`🔄 Updating product catalog categories for store ${storeId}`);
    
    // Get all product catalog entries without categories
    const { data: products, error: fetchError } = await supabase
      .from('product_catalog')
      .select(`
        id,
        product_name,
        recipe_id,
        recipes!inner(
          template_id,
          recipe_templates!inner(
            category_name
          )
        )
      `)
      .eq('store_id', storeId)
      .is('category_id', null);
    
    if (fetchError) {
      console.error('Error fetching products:', fetchError);
      return;
    }
    
    if (!products || products.length === 0) {
      console.log('✅ No products need category updates');
      return;
    }
    
    console.log(`📦 Found ${products.length} products needing category updates`);
    
    for (const product of products) {
      const templateCategory = (product as any).recipes?.recipe_templates?.category_name;
      
      if (templateCategory) {
        const categoryId = await getOrCreatePOSCategory(templateCategory, storeId);
        
        if (categoryId) {
          const { error: updateError } = await supabase
            .from('product_catalog')
            .update({ category_id: categoryId })
            .eq('id', product.id);
          
          if (updateError) {
            console.error(`Error updating product ${product.product_name}:`, updateError);
          } else {
            console.log(`✅ Updated ${product.product_name} with category ${templateCategory}`);
          }
        }
      }
    }
    
    console.log('✅ Product catalog category updates complete');
    
  } catch (error) {
    console.error('Error updating product catalog categories:', error);
    toast.error('Failed to update product categories');
  }
};
