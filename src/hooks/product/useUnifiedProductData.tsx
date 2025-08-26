import { useState, useCallback } from "react";
import { unifiedProductService, SyncResult } from "@/services/product/unifiedProductService";
import { toast } from "sonner";

export function useUnifiedProductData() {
  const [isUpdating, setIsUpdating] = useState(false);

  const updateProduct = useCallback(async (
    productCatalogId: string,
    updates: {
      name?: string;
      description?: string;
      price?: number;
      image_url?: string;
      category_id?: string | null;
      is_active?: boolean;
      display_order?: number;
    }
  ): Promise<SyncResult> => {
    setIsUpdating(true);
    try {
      const result = await unifiedProductService.updateProduct(productCatalogId, updates);
      
      if (result.success) {
        let message = 'Product updated successfully';
        if (result.productCatalogUpdated && result.productsTableUpdated) {
          message += ' (synced across all systems)';
        } else if (result.productCatalogUpdated) {
          message += ' (catalog updated)';
        }
        
        console.log('✅ Unified update result:', {
          catalogUpdated: result.productCatalogUpdated,
          productsUpdated: result.productsTableUpdated
        });
      } else {
        toast.error(result.error || 'Failed to update product');
      }
      
      return result;
    } catch (error) {
      console.error('Error in useUnifiedProductData:', error);
      toast.error('Failed to update product');
      return {
        success: false,
        productCatalogUpdated: false,
        productsTableUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const updateFromProductsTable = useCallback(async (
    productId: string,
    updates: {
      name?: string;
      description?: string;
      price?: number;
      image_url?: string;
      category_id?: string | null;
      is_active?: boolean;
    }
  ): Promise<SyncResult> => {
    setIsUpdating(true);
    try {
      const result = await unifiedProductService.updateFromProductsTable(productId, updates);
      
      if (result.success) {
        let message = 'Product updated successfully';
        if (result.productCatalogUpdated && result.productsTableUpdated) {
          message += ' (synced across all systems)';
        } else if (result.productsTableUpdated) {
          message += ' (inventory updated)';
        }
        
        console.log('✅ Products table update result:', {
          catalogUpdated: result.productCatalogUpdated,
          productsUpdated: result.productsTableUpdated
        });
      } else {
        toast.error(result.error || 'Failed to update product');
      }
      
      return result;
    } catch (error) {
      console.error('Error in useUnifiedProductData (products table):', error);
      toast.error('Failed to update product');
      return {
        success: false,
        productCatalogUpdated: false,
        productsTableUpdated: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    } finally {
      setIsUpdating(false);
    }
  }, []);

  const checkProductSync = useCallback(async (productCatalogId: string) => {
    try {
      const result = await unifiedProductService.getUnifiedProduct(productCatalogId);
      
      if (!result.inSync && result.catalog && result.product) {
        console.warn('⚠️ Product sync issue detected:', {
          catalogId: productCatalogId,
          catalogName: result.catalog.product_name,
          productName: result.product.name,
          catalogPrice: result.catalog.price,
          productPrice: result.product.price
        });
        
        toast.warning('Product data may be out of sync between systems');
      }
      
      return result;
    } catch (error) {
      console.error('Error checking product sync:', error);
      return { catalog: null, product: null, inSync: false };
    }
  }, []);

  return {
    updateProduct,
    updateFromProductsTable,
    checkProductSync,
    isUpdating
  };
}