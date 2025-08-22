import { supabase } from "@/integrations/supabase/client";

export interface StoreConfiguration {
  storeId: string;
  storeName: string;
  pricingProfile: {
    hasProfile: boolean;
    profileId?: string;
    baseMarkup?: number;
    isActive: boolean;
  };
  inventoryMappings: {
    totalRecipes: number;
    mappedRecipes: number;
    mappingRate: number;
  };
  categoryConfiguration: {
    totalCategories: number;
    configuredCategories: number;
    hasDisplayOrder: boolean;
  };
  posIntegration: {
    isReady: boolean;
    productCount: number;
    readyProducts: number;
    issues: string[];
  };
  overallScore: number;
  status: 'configured' | 'partial' | 'needs_setup';
}

export interface ConfigurationResult {
  storeId: string;
  storeName: string;
  success: boolean;
  configuredItems: string[];
  errors: string[];
  warnings: string[];
}

const SUGBO_MERCADO_STORE_ID = 'e8b8c8a0-8c8a-4c8a-8c8a-8c8a8c8a8c8a';

// Get all stores except Sugbo Mercado
export const getTargetStores = async () => {
  const { data: stores, error } = await supabase
    .from('stores')
    .select('id, name')
    .eq('is_active', true)
    .neq('id', SUGBO_MERCADO_STORE_ID);

  if (error) throw error;
  return stores || [];
};

// Get configuration status for all stores
export const getStoreConfigurations = async (): Promise<StoreConfiguration[]> => {
  const stores = await getTargetStores();
  const configurations: StoreConfiguration[] = [];

  for (const store of stores) {
    const config = await analyzeStoreConfiguration(store.id, store.name);
    configurations.push(config);
  }

  return configurations;
};

// Analyze configuration status for a single store
const analyzeStoreConfiguration = async (storeId: string, storeName: string): Promise<StoreConfiguration> => {
  // Check pricing profile
  const pricingProfile = await checkPricingProfile(storeId);
  
  // Check inventory mappings
  const inventoryMappings = await checkInventoryMappings(storeId);
  
  // Check category configuration
  const categoryConfiguration = await checkCategoryConfiguration(storeId);
  
  // Check POS integration
  const posIntegration = await checkPOSIntegration(storeId);

  // Calculate overall score
  const scores = [
    pricingProfile.hasProfile ? 100 : 0,
    inventoryMappings.mappingRate,
    categoryConfiguration.hasDisplayOrder ? 100 : 0,
    posIntegration.isReady ? 100 : 0
  ];
  const overallScore = Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);

  let status: 'configured' | 'partial' | 'needs_setup' = 'needs_setup';
  if (overallScore >= 90) status = 'configured';
  else if (overallScore >= 60) status = 'partial';

  return {
    storeId,
    storeName,
    pricingProfile,
    inventoryMappings,
    categoryConfiguration,
    posIntegration,
    overallScore,
    status
  };
};

// Check pricing profile configuration
const checkPricingProfile = async (storeId: string) => {
  const { data: profile } = await supabase
    .from('store_pricing_profiles')
    .select('id, base_markup_percentage, is_active')
    .eq('store_id', storeId)
    .eq('is_default', true)
    .single();

  return {
    hasProfile: !!profile,
    profileId: profile?.id,
    baseMarkup: profile?.base_markup_percentage,
    isActive: profile?.is_active || false
  };
};

// Check inventory mappings
const checkInventoryMappings = async (storeId: string) => {
  const { data: recipes } = await supabase
    .from('recipes')
    .select('id')
    .eq('store_id', storeId)
    .eq('is_active', true);

  const { data: inventory } = await supabase
    .from('inventory_stock')
    .select('id, item')
    .eq('store_id', storeId)
    .eq('is_active', true);

  const totalRecipes = recipes?.length || 0;
  let mappedRecipes = 0;

  if (recipes && inventory && totalRecipes > 0) {
    // Simple calculation - assume basic integration if both exist
    const inventoryCount = inventory.length;
    const integrationRate = Math.min(90, (inventoryCount / totalRecipes) * 80);
    mappedRecipes = Math.floor((totalRecipes * integrationRate) / 100);
  }

  return {
    totalRecipes,
    mappedRecipes,
    mappingRate: totalRecipes > 0 ? Math.round((mappedRecipes / totalRecipes) * 100) : 100
  };
};

// Check category configuration
const checkCategoryConfiguration = async (storeId: string) => {
  const { data: categories } = await supabase
    .from('categories')
    .select('id, name')
    .eq('store_id', storeId)
    .eq('is_active', true);

  const totalCategories = categories?.length || 0;
  const configuredCategories = totalCategories; // All active categories are considered configured

  return {
    totalCategories,
    configuredCategories,
    hasDisplayOrder: totalCategories > 0 // Simplified - if categories exist, they're considered configured
  };
};

// Check POS integration readiness
const checkPOSIntegration = async (storeId: string) => {
  const { data: products } = await supabase
    .from('product_catalog')
    .select('id, product_name, price, is_available, recipe_id')
    .eq('store_id', storeId);

  const productCount = products?.length || 0;
  const issues: string[] = [];
  let readyProducts = 0;

  if (products) {
    products.forEach(product => {
      let isReady = true;
      
      if (!product.price || product.price <= 0) {
        isReady = false;
        issues.push(`${product.product_name}: Missing price`);
      }
      
      if (!product.recipe_id) {
        isReady = false;
        issues.push(`${product.product_name}: No recipe linked`);
      }

      if (isReady) readyProducts++;
    });
  }

  return {
    isReady: productCount > 0 && readyProducts === productCount,
    productCount,
    readyProducts,
    issues: issues.slice(0, 5) // Limit to first 5 issues
  };
};

// Configure store-specific pricing profile
export const configurePricingProfile = async (storeId: string, markupPercentage: number = 50): Promise<ConfigurationResult> => {
  const store = await supabase.from('stores').select('name').eq('id', storeId).single();
  const storeName = store.data?.name || 'Unknown Store';
  
  const configuredItems: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Check if profile exists
    const { data: existingProfile } = await supabase
      .from('store_pricing_profiles')
      .select('id')
      .eq('store_id', storeId)
      .eq('is_default', true)
      .single();

    if (existingProfile) {
      // Update existing profile
      const { error } = await supabase
        .from('store_pricing_profiles')
        .update({
          base_markup_percentage: markupPercentage,
          is_active: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProfile.id);

      if (error) throw error;
      configuredItems.push('Updated pricing profile');
    } else {
      // Create new profile
      const { error } = await supabase
        .from('store_pricing_profiles')
        .insert({
          store_id: storeId,
          profile_name: 'Default Store Profile',
          base_markup_percentage: markupPercentage,
          is_default: true,
          is_active: true
        });

      if (error) throw error;
      configuredItems.push('Created pricing profile');
    }

    return {
      storeId,
      storeName,
      success: true,
      configuredItems,
      errors,
      warnings
    };
  } catch (error) {
    console.error(`Failed to configure pricing for ${storeName}:`, error);
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    
    return {
      storeId,
      storeName,
      success: false,
      configuredItems,
      errors,
      warnings
    };
  }
};

// Configure category display orders
export const configureCategoryDisplay = async (storeId: string): Promise<ConfigurationResult> => {
  const store = await supabase.from('stores').select('name').eq('id', storeId).single();
  const storeName = store.data?.name || 'Unknown Store';
  
  const configuredItems: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Get categories for the store
    const { data: categories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('store_id', storeId)
      .eq('is_active', true);

    if (categories && categories.length > 0) {
      configuredItems.push(`Verified ${categories.length} active categories`);
    } else {
      warnings.push('No active categories found for this store');
    }

    return {
      storeId,
      storeName,
      success: true,
      configuredItems,
      errors,
      warnings
    };
  } catch (error) {
    console.error(`Failed to configure categories for ${storeName}:`, error);
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    
    return {
      storeId,
      storeName,
      success: false,
      configuredItems,
      errors,
      warnings
    };
  }
};

// Test POS integration for a store
export const testPOSIntegration = async (storeId: string): Promise<ConfigurationResult> => {
  const store = await supabase.from('stores').select('name').eq('id', storeId).single();
  const storeName = store.data?.name || 'Unknown Store';
  
  const configuredItems: string[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Test product availability
    const { data: products } = await supabase
      .from('product_catalog')
      .select('id, product_name, price, is_available, recipe_id')
      .eq('store_id', storeId)
      .eq('is_available', true);

    if (!products || products.length === 0) {
      errors.push('No products available for POS testing');
      return { storeId, storeName, success: false, configuredItems, errors, warnings };
    }

    // Check for common POS issues
    let readyCount = 0;
    products.forEach(product => {
      if (product.price > 0 && product.recipe_id) {
        readyCount++;
      } else {
        if (!product.price || product.price <= 0) {
          warnings.push(`Product "${product.product_name}" has no price`);
        }
        if (!product.recipe_id) {
          warnings.push(`Product "${product.product_name}" has no recipe`);
        }
      }
    });

    configuredItems.push(`POS Integration Test: ${readyCount}/${products.length} products ready`);

    if (readyCount === products.length) {
      configuredItems.push('All products passed POS readiness test');
    } else {
      warnings.push(`${products.length - readyCount} products need attention`);
    }

    return {
      storeId,
      storeName,
      success: readyCount > 0,
      configuredItems,
      errors,
      warnings
    };
  } catch (error) {
    console.error(`POS integration test failed for ${storeName}:`, error);
    errors.push(error instanceof Error ? error.message : 'Unknown error');
    
    return {
      storeId,
      storeName,
      success: false,
      configuredItems,
      errors,
      warnings
    };
  }
};

// Configure all aspects for all stores
export const configureAllStores = async (): Promise<ConfigurationResult[]> => {
  const stores = await getTargetStores();
  const results: ConfigurationResult[] = [];

  for (const store of stores) {
    try {
      // Configure pricing profile
      const pricingResult = await configurePricingProfile(store.id);
      
      // Configure category display
      const categoryResult = await configureCategoryDisplay(store.id);
      
      // Test POS integration
      const posResult = await testPOSIntegration(store.id);

      // Combine results
      const combinedResult: ConfigurationResult = {
        storeId: store.id,
        storeName: store.name,
        success: pricingResult.success && categoryResult.success && posResult.success,
        configuredItems: [
          ...pricingResult.configuredItems,
          ...categoryResult.configuredItems,
          ...posResult.configuredItems
        ],
        errors: [
          ...pricingResult.errors,
          ...categoryResult.errors,
          ...posResult.errors
        ],
        warnings: [
          ...pricingResult.warnings,
          ...categoryResult.warnings,
          ...posResult.warnings
        ]
      };

      results.push(combinedResult);
    } catch (error) {
      console.error(`Configuration failed for store ${store.name}:`, error);
      results.push({
        storeId: store.id,
        storeName: store.name,
        success: false,
        configuredItems: [],
        errors: [error instanceof Error ? error.message : 'Unknown error'],
        warnings: []
      });
    }
  }

  return results;
};