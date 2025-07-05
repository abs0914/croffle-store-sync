import { supabase } from "@/integrations/supabase/client";
import { Product } from "@/types/product";
import { toast } from "sonner";

export interface UnifiedProduct extends Product {
  inventory_status?: 'in_stock' | 'low_stock' | 'out_of_stock';
  recipe_ingredients?: Array<{
    id: string;
    name: string;
    quantity: number;
    unit: string;
    current_stock: number;
  }>;
}

// Fetch products with inventory status
export const fetchUnifiedProducts = async (storeId: string): Promise<UnifiedProduct[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(name),
        product_variations(*)
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Process products to add inventory status
    const processedProducts = (data || []).map(product => {
      const inventoryStatus = calculateInventoryStatus(product);
      return {
        ...product,
        inventory_status: inventoryStatus,
        recipe_ingredients: [], // TODO: Implement recipe ingredient fetching
        product_variations: product.product_variations?.map((v: any) => ({
          ...v,
          size: v.size as any // Type assertion to handle database string vs enum
        })) || []
      };
    });

    return processedProducts as UnifiedProduct[];
  } catch (error) {
    console.error('Error fetching unified products:', error);
    toast.error('Failed to fetch products');
    return [];
  }
};

// Calculate inventory status based on product type and stock
function calculateInventoryStatus(product: any): 'in_stock' | 'low_stock' | 'out_of_stock' {
  if (product.product_type === 'direct') {
    // For direct products, check the stock_quantity
    if (product.stock_quantity <= 0) return 'out_of_stock';
    if (product.stock_quantity <= 5) return 'low_stock';
    return 'in_stock';
  }

  // For recipe products, we'll implement ingredient checking later
  // For now, assume they're in stock if the product is active
  return product.is_active ? 'in_stock' : 'out_of_stock';
}

// Bulk operations
export const bulkUpdateProductStatus = async (productIds: string[], isActive: boolean): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .in('id', productIds);

    if (error) throw error;

    toast.success(`${productIds.length} product${productIds.length !== 1 ? 's' : ''} ${isActive ? 'activated' : 'deactivated'} successfully`);
    return true;
  } catch (error) {
    console.error('Error bulk updating product status:', error);
    toast.error('Failed to update product status');
    return false;
  }
};

export const bulkDeleteProducts = async (productIds: string[]): Promise<boolean> => {
  try {
    // First, delete related variations
    const { error: variationsError } = await supabase
      .from('product_variations')
      .delete()
      .in('product_id', productIds);

    if (variationsError) throw variationsError;

    // Then delete the products
    const { error: productsError } = await supabase
      .from('products')
      .delete()
      .in('id', productIds);

    if (productsError) throw productsError;

    toast.success(`${productIds.length} product${productIds.length !== 1 ? 's' : ''} deleted successfully`);
    return true;
  } catch (error) {
    console.error('Error bulk deleting products:', error);
    toast.error('Failed to delete products');
    return false;
  }
};

export const toggleProductAvailability = async (productId: string, isActive: boolean): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('products')
      .update({ is_active: isActive, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (error) throw error;

    toast.success(`Product ${isActive ? 'activated' : 'deactivated'} successfully`);
    return true;
  } catch (error) {
    console.error('Error toggling product availability:', error);
    toast.error('Failed to update product availability');
    return false;
  }
};

export const deleteProduct = async (productId: string): Promise<boolean> => {
  try {
    // First, delete related variations
    const { error: variationsError } = await supabase
      .from('product_variations')
      .delete()
      .eq('product_id', productId);

    if (variationsError) throw variationsError;

    // Then delete the product
    const { error: productError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (productError) throw productError;

    toast.success('Product deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting product:', error);
    toast.error('Failed to delete product');
    return false;
  }
};