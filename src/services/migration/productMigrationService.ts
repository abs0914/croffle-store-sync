
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProductMigrationResult {
  success: boolean;
  migratedCount: number;
  errors: string[];
}

/**
 * Simple migration service to manually move products from products table to product_catalog
 */
export const migrateProductsToProductCatalog = async (storeId: string): Promise<ProductMigrationResult> => {
  const errors: string[] = [];
  let migratedCount = 0;

  try {
    console.log('Starting product migration for store:', storeId);
    
    // First, fetch existing products from the old table
    const { data: existingProducts, error: fetchError } = await supabase
      .from('products')
      .select('*')
      .eq('store_id', storeId);

    if (fetchError) {
      throw fetchError;
    }

    if (!existingProducts || existingProducts.length === 0) {
      return {
        success: true,
        migratedCount: 0,
        errors: ['No products found to migrate']
      };
    }

    // Migrate each product individually to avoid JSONB issues
    for (const product of existingProducts) {
      try {
        // Check if product already exists in product_catalog
        const { data: existingCatalogProduct } = await supabase
          .from('product_catalog')
          .select('id')
          .eq('store_id', product.store_id)
          .eq('product_name', product.name)
          .single();

        if (existingCatalogProduct) {
          console.log(`Product ${product.name} already exists in catalog, skipping`);
          continue;
        }

        // Insert into product_catalog
        const { error: insertError } = await supabase
          .from('product_catalog')
          .insert({
            store_id: product.store_id,
            product_name: product.name,
            description: product.description,
            price: product.price,
            is_available: product.is_active,
            display_order: 0
          });

        if (insertError) {
          errors.push(`Failed to migrate product ${product.name}: ${insertError.message}`);
        } else {
          migratedCount++;
          console.log(`Successfully migrated product: ${product.name}`);
        }
      } catch (error) {
        const errorMsg = `Error migrating product ${product.name}: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);
      }
    }

    const success = errors.length === 0;
    
    if (success) {
      toast.success(`Successfully migrated ${migratedCount} products to Product Catalog`);
    } else {
      toast.warning(`Migrated ${migratedCount} products with ${errors.length} errors`);
    }

    return {
      success,
      migratedCount,
      errors
    };

  } catch (error) {
    console.error('Migration failed:', error);
    const errorMsg = `Migration failed: ${error}`;
    toast.error(errorMsg);
    return {
      success: false,
      migratedCount,
      errors: [...errors, errorMsg]
    };
  }
};

/**
 * Validate that migration completed successfully
 */
export const validateProductMigration = async (storeId: string): Promise<{
  oldProductCount: number;
  newProductCount: number;
  isValid: boolean;
}> => {
  try {
    const [oldProductsResponse, newProductsResponse] = await Promise.all([
      supabase.from('products').select('id').eq('store_id', storeId),
      supabase.from('product_catalog').select('id').eq('store_id', storeId)
    ]);

    const oldProductCount = oldProductsResponse.data?.length || 0;
    const newProductCount = newProductsResponse.data?.length || 0;

    return {
      oldProductCount,
      newProductCount,
      isValid: newProductCount >= oldProductCount
    };
  } catch (error) {
    console.error('Error validating migration:', error);
    return {
      oldProductCount: 0,
      newProductCount: 0,
      isValid: false
    };
  }
};
