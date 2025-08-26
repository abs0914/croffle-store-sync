import { supabase } from "@/integrations/supabase/client";

export interface ProductCatalogAudit {
  storeId: string;
  storeName: string;
  totalProducts: number;
  availableProducts: number;
  productsWithRecipes: number;
  missingProducts: string[];
  categoryCount: number;
  missingCategories: string[];
  inconsistencies: string[];
}

export interface CategoryStandardization {
  categoryName: string;
  description: string;
  isActive: boolean;
}

export interface CatalogStandardizationResult {
  success: boolean;
  storeId: string;
  storeName: string;
  addedProducts: number;
  updatedProducts: number;
  addedCategories: number;
  fixedLinks: number;
  errors: string[];
}

const SUGBO_MERCADO_ID = 'd7c47e6b-f20a-4543-a6bd-000398f72df5';

/**
 * Get baseline product catalog from Sugbo Mercado to use as standardization template
 */
export const getSugboMercadoBaseline = async () => {
  const { data: baseline, error } = await supabase
    .from('product_catalog')
    .select(`
      product_name,
      description,
      price,
      is_available,
      categories!inner(name, description),
      recipes!inner(name, template_id)
    `)
    .eq('store_id', SUGBO_MERCADO_ID)
    .eq('is_available', true);

  if (error) {
    console.error('Error fetching Sugbo Mercado baseline:', error);
    throw error;
  }

  // Get categories baseline
  const { data: categoriesBaseline, error: catError } = await supabase
    .from('categories')
    .select('name, description, is_active')
    .eq('store_id', SUGBO_MERCADO_ID)
    .eq('is_active', true);

  if (catError) {
    console.error('Error fetching categories baseline:', catError);
    throw catError;
  }

  return {
    products: baseline || [],
    categories: categoriesBaseline || []
  };
};

/**
 * Audit product catalog completeness for all stores (excluding Sugbo Mercado)
 */
export const auditProductCatalogs = async (excludeStoreIds: string[] = []): Promise<ProductCatalogAudit[]> => {
  const excludedIds = [...excludeStoreIds, SUGBO_MERCADO_ID];
  
  // Get baseline from Sugbo Mercado
  const baseline = await getSugboMercadoBaseline();
  const baselineProductNames = new Set(baseline.products.map(p => p.product_name));
  const baselineCategoryNames = new Set(baseline.categories.map(c => c.name));

  // Get all stores to audit
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .eq('is_active', true)
    .not('id', 'in', `(${excludedIds.map(id => `"${id}"`).join(',')})`);

  if (storesError) throw storesError;

  const audits: ProductCatalogAudit[] = [];

  for (const store of stores || []) {
    try {
      // Get store's current catalog
      const { data: storeCatalog } = await supabase
        .from('product_catalog')
        .select(`
          product_name,
          is_available,
          recipe_id,
          categories(name)
        `)
        .eq('store_id', store.id);

      // Get store's categories
      const { data: storeCategories } = await supabase
        .from('categories')
        .select('name')
        .eq('store_id', store.id)
        .eq('is_active', true);

      const storeProductNames = new Set(
        (storeCatalog || [])
          .filter(p => p.is_available)
          .map(p => p.product_name)
      );
      
      const storeCategoryNames = new Set(
        (storeCategories || []).map(c => c.name)
      );

      // Calculate missing products and categories
      const missingProducts = Array.from(baselineProductNames)
        .filter(name => !storeProductNames.has(name));
      
      const missingCategories = Array.from(baselineCategoryNames)
        .filter(name => !storeCategoryNames.has(name));

      // Find inconsistencies
      const inconsistencies: string[] = [];
      const productsWithoutRecipes = (storeCatalog || [])
        .filter(p => p.is_available && !p.recipe_id);
      
      if (productsWithoutRecipes.length > 0) {
        inconsistencies.push(`${productsWithoutRecipes.length} products without recipes`);
      }

      audits.push({
        storeId: store.id,
        storeName: store.name,
        totalProducts: (storeCatalog || []).length,
        availableProducts: (storeCatalog || []).filter(p => p.is_available).length,
        productsWithRecipes: (storeCatalog || []).filter(p => p.is_available && p.recipe_id).length,
        missingProducts,
        categoryCount: (storeCategories || []).length,
        missingCategories,
        inconsistencies
      });

    } catch (error) {
      console.error(`Error auditing store ${store.name}:`, error);
      audits.push({
        storeId: store.id,
        storeName: store.name,
        totalProducts: 0,
        availableProducts: 0,
        productsWithRecipes: 0,
        missingProducts: [],
        categoryCount: 0,
        missingCategories: [],
        inconsistencies: [`Audit failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      });
    }
  }

  return audits;
};

/**
 * Standardize product catalog for a single store
 */
export const standardizeStoreCatalog = async (
  storeId: string, 
  storeName: string
): Promise<CatalogStandardizationResult> => {
  const errors: string[] = [];
  let addedProducts = 0;
  let updatedProducts = 0;
  let addedCategories = 0;
  let fixedLinks = 0;

  try {
    // Get baseline from Sugbo Mercado
    const baseline = await getSugboMercadoBaseline();

    // 1. Standardize Categories First
    for (const baseCategory of baseline.categories) {
      const { data: existingCategory } = await supabase
        .from('categories')
        .select('id')
        .eq('store_id', storeId)
        .eq('name', baseCategory.name)
        .single();

      if (!existingCategory) {
        const { error: categoryError } = await supabase
          .from('categories')
          .insert({
            store_id: storeId,
            name: baseCategory.name,
            description: baseCategory.description,
            is_active: true
          });

        if (categoryError) {
          errors.push(`Category ${baseCategory.name}: ${categoryError.message}`);
        } else {
          addedCategories++;
        }
      }
    }

    // 2. Get updated category mappings
    const { data: storeCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('store_id', storeId);

    const categoryMap = new Map(
      (storeCategories || []).map(c => [c.name, c.id])
    );

    // 3. Standardize Products
    for (const baseProduct of baseline.products) {
      // Check if product already exists
      const { data: existingProduct } = await supabase
        .from('product_catalog')
        .select('id, recipe_id, category_id')
        .eq('store_id', storeId)
        .eq('product_name', baseProduct.product_name)
        .single();

      // Find matching recipe for this product
      const { data: storeRecipe } = await supabase
        .from('recipes')
        .select('id')
        .eq('store_id', storeId)
        .eq('template_id', baseProduct.recipes.template_id)
        .eq('is_active', true)
        .single();

      const categoryId = baseProduct.categories?.name ? 
        categoryMap.get(baseProduct.categories.name) : null;

      if (!existingProduct) {
        // Add missing product
        const { error: productError } = await supabase
          .from('product_catalog')
          .insert({
            store_id: storeId,
            product_name: baseProduct.product_name,
            description: baseProduct.description,
            price: baseProduct.price,
            recipe_id: storeRecipe?.id || null,
            category_id: categoryId,
            is_available: true
          });

        if (productError) {
          errors.push(`Product ${baseProduct.product_name}: ${productError.message}`);
        } else {
          addedProducts++;
        }
      } else {
        // Update existing product if needed
        let needsUpdate = false;
        const updates: any = {};

        if (!existingProduct.recipe_id && storeRecipe) {
          updates.recipe_id = storeRecipe.id;
          needsUpdate = true;
          fixedLinks++;
        }

        if (!existingProduct.category_id && categoryId) {
          updates.category_id = categoryId;
          needsUpdate = true;
        }

        if (needsUpdate) {
          const { error: updateError } = await supabase
            .from('product_catalog')
            .update(updates)
            .eq('id', existingProduct.id);

          if (updateError) {
            errors.push(`Update ${baseProduct.product_name}: ${updateError.message}`);
          } else {
            updatedProducts++;
          }
        }
      }
    }

    return {
      success: errors.length === 0,
      storeId,
      storeName,
      addedProducts,
      updatedProducts,
      addedCategories,
      fixedLinks,
      errors
    };

  } catch (error) {
    console.error(`Error standardizing catalog for ${storeName}:`, error);
    return {
      success: false,
      storeId,
      storeName,
      addedProducts: 0,
      updatedProducts: 0,
      addedCategories: 0,
      fixedLinks: 0,
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

/**
 * Execute Phase 2: Product Catalog Standardization for all stores
 */
export const executePhase2Standardization = async (
  excludeStoreIds: string[] = []
): Promise<CatalogStandardizationResult[]> => {
  const excludedIds = [...excludeStoreIds, SUGBO_MERCADO_ID];

  // Get stores that need standardization
  const { data: stores, error: storesError } = await supabase
    .from('stores')
    .select('id, name')
    .eq('is_active', true)
    .not('id', 'in', `(${excludedIds.map(id => `"${id}"`).join(',')})`);

  if (storesError) {
    throw storesError;
  }

  const results: CatalogStandardizationResult[] = [];

  for (const store of stores || []) {
    console.log(`Standardizing catalog for: ${store.name}`);
    const result = await standardizeStoreCatalog(store.id, store.name);
    results.push(result);
  }

  return results;
};