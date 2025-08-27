/**
 * Deploy Missing Products Service
 * 
 * Deploys missing products from recipe templates to all stores that need them.
 * This ensures all stores have a complete product catalog.
 */

import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface StoreProductStatus {
  id: string;
  name: string;
  productCount: number;
  expectedCount: number;
  needsSync: boolean;
}

export interface DeploymentResult {
  success: boolean;
  storesProcessed: number;
  productsDeployed: number;
  errors: string[];
  warnings: string[];
}

/**
 * Get all active stores with their current product counts
 */
export async function getStoreProductStatus(): Promise<StoreProductStatus[]> {
  // Get all active stores
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .eq('is_active', true)
    .order('name');

  if (storesError) {
    throw new Error(`Failed to get stores: ${storesError.message}`);
  }

  // Get expected product count from active recipe templates
  const { data: templates, error: templatesError } = await supabase
    .from('recipe_templates')
    .select('id')
    .eq('is_active', true);

  if (templatesError) {
    throw new Error(`Failed to get recipe templates: ${templatesError.message}`);
  }

  const expectedCount = templates.length;

  // Get current product counts for each store
  const storeStatuses: StoreProductStatus[] = [];

  for (const store of stores) {
    const { data: products, error: productsError } = await supabase
      .from('product_catalog')
      .select('id')
      .eq('store_id', store.id);

    if (productsError) {
      console.warn(`Failed to get products for store ${store.name}: ${productsError.message}`);
      continue;
    }

    const productCount = products.length;
    storeStatuses.push({
      id: store.id,
      name: store.name,
      productCount,
      expectedCount,
      needsSync: productCount < expectedCount
    });
  }

  return storeStatuses.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Deploy missing products to a specific store
 */
export async function deployMissingProductsToStore(storeId: string): Promise<{
  success: boolean;
  productsAdded: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let productsAdded = 0;

  try {
    // Get all active recipe templates
    const { data: templates, error: templatesError } = await supabase
      .from('recipe_templates')
      .select('id, name, category_name')
      .eq('is_active', true)
      .order('name');

    if (templatesError) {
      errors.push(`Failed to get recipe templates: ${templatesError.message}`);
      return { success: false, productsAdded: 0, errors };
    }

    // Get existing products for this store
    const { data: existingProducts, error: existingError } = await supabase
      .from('product_catalog')
      .select('product_name')
      .eq('store_id', storeId);

    if (existingError) {
      errors.push(`Failed to get existing products: ${existingError.message}`);
      return { success: false, productsAdded: 0, errors };
    }

    const existingNames = new Set(
      existingProducts.map(p => p.product_name.toLowerCase().trim())
    );

    // Filter to templates that don't have products yet
    const missingTemplates = templates.filter(
      t => !existingNames.has(t.name.toLowerCase().trim())
    );

    if (missingTemplates.length === 0) {
      return { success: true, productsAdded: 0, errors: [] };
    }

    // Get or create categories
    const categoryNames = [...new Set(missingTemplates.map(t => getPOSCategoryName(t.category_name)))];
    const categoryMap = await ensureCategories(storeId, categoryNames);

    // Get next display order
    const { data: lastProduct } = await supabase
      .from('product_catalog')
      .select('display_order')
      .eq('store_id', storeId)
      .order('display_order', { ascending: false })
      .limit(1)
      .single();

    let nextDisplayOrder = (lastProduct?.display_order || 0) + 1;

    // Create missing products
    const productsToCreate = missingTemplates.map(template => ({
      product_name: template.name,
      description: null,
      price: 0, // Default price - needs to be set later
      category_id: categoryMap[getPOSCategoryName(template.category_name)] || null,
      store_id: storeId,
      image_url: null,
      is_available: false, // Default to disabled until properly configured
      product_status: 'temporarily_unavailable',
      recipe_id: null,
      display_order: nextDisplayOrder++
    }));

    // Insert products in batches to avoid hitting limits
    const batchSize = 50;
    for (let i = 0; i < productsToCreate.length; i += batchSize) {
      const batch = productsToCreate.slice(i, i + batchSize);
      
      const { error: insertError } = await supabase
        .from('product_catalog')
        .insert(batch);

      if (insertError) {
        errors.push(`Failed to insert batch ${Math.floor(i/batchSize) + 1}: ${insertError.message}`);
      } else {
        productsAdded += batch.length;
      }
    }

    return {
      success: errors.length === 0,
      productsAdded,
      errors
    };

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    errors.push(`Deployment failed: ${errorMsg}`);
    return { success: false, productsAdded: 0, errors };
  }
}

/**
 * Deploy missing products to all stores that need them
 */
export async function deployMissingProductsToAllStores(): Promise<DeploymentResult> {
  const result: DeploymentResult = {
    success: true,
    storesProcessed: 0,
    productsDeployed: 0,
    errors: [],
    warnings: []
  };

  try {
    // Get current status
    const storeStatuses = await getStoreProductStatus();
    const storesToSync = storeStatuses.filter(s => s.needsSync);

    if (storesToSync.length === 0) {
      toast.success('✅ All stores already have complete product catalogs!');
      return result;
    }

    toast.info(`🔄 Deploying products to ${storesToSync.length} stores...`);

    // Deploy to each store
    for (const store of storesToSync) {
      const storeResult = await deployMissingProductsToStore(store.id);
      
      result.storesProcessed++;
      result.productsDeployed += storeResult.productsAdded;

      if (!storeResult.success) {
        result.success = false;
        result.errors.push(`${store.name}: ${storeResult.errors.join(', ')}`);
      }

      if (storeResult.productsAdded === 0 && store.needsSync) {
        result.warnings.push(`${store.name}: Expected products but none were deployed`);
      }
    }

    // Show results
    if (result.success) {
      toast.success(`✅ Successfully deployed ${result.productsDeployed} products to ${result.storesProcessed} stores!`);
    } else {
      toast.error(`❌ Deployment completed with errors. ${result.productsDeployed} products deployed to ${result.storesProcessed} stores.`);
    }

    return result;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.success = false;
    result.errors.push(`Deployment failed: ${errorMsg}`);
    toast.error(`❌ Deployment failed: ${errorMsg}`);
    return result;
  }
}

/**
 * Ensure categories exist for a store, create if missing
 */
async function ensureCategories(storeId: string, categoryNames: string[]): Promise<Record<string, string>> {
  const categoryMap: Record<string, string> = {};

  // Get existing categories
  const { data: existingCategories, error: existingError } = await supabase
    .from('categories')
    .select('id, name')
    .eq('store_id', storeId);

  if (existingError) {
    throw new Error(`Failed to get existing categories: ${existingError.message}`);
  }

  // Map existing categories
  for (const cat of existingCategories || []) {
    categoryMap[cat.name] = cat.id;
  }

  // Create missing categories
  const missingCategories = categoryNames.filter(name => !categoryMap[name]);
  
  if (missingCategories.length > 0) {
    const categoriesToCreate = missingCategories.map(name => ({
      name,
      description: `Category for ${name}`,
      store_id: storeId,
      is_active: true
    }));

    const { data: newCategories, error: createError } = await supabase
      .from('categories')
      .insert(categoriesToCreate)
      .select('id, name');

    if (createError) {
      throw new Error(`Failed to create categories: ${createError.message}`);
    }

    // Add new categories to map
    for (const cat of newCategories || []) {
      categoryMap[cat.name] = cat.id;
    }
  }

  return categoryMap;
}

/**
 * Map template category to POS category name
 */
function getPOSCategoryName(templateCategory: string): string {
  const t = String(templateCategory || '').toLowerCase();
  if (t === 'classic') return 'Classic';
  if (t === 'addon' || t === 'add-on' || t === 'add-ons' || t === 'add ons') return 'Add-on';
  if (t === 'beverages' || t === 'beverage') return 'Beverages';
  if (t === 'espresso') return 'Espresso';
  if (t === 'combo') return 'Combo';
  if (t === 'premium') return 'Premium';
  if (t === 'fruity') return 'Fruity';
  if (t === 'glaze') return 'Glaze';
  if (t === 'mix & match' || t === 'mix and match' || t === 'mix_match' || t === 'mix-match') return 'Mix & Match';
  if (t === 'cold') return 'Cold';
  if (t === 'others' || t === 'other') return 'Beverages';
  return createTitleCase(templateCategory);
}

/**
 * Convert string to title case
 */
function createTitleCase(str: string): string {
  return String(str || '')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}