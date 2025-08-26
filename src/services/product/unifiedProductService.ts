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
        product_variations(*),
        inventory_item:inventory_stock(*)
      `)
      .eq('store_id', storeId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // Process products to add inventory status
    const processedProducts = await Promise.all((data || []).map(async (product) => {
      const inventoryStatus = await calculateInventoryStatus(product, storeId);
      const recipeIngredients = await fetchRecipeIngredients(product);
      
      return {
        ...product,
        category: product.category?.name || product.category || '', // Handle category properly
        inventory_status: inventoryStatus,
        recipe_ingredients: recipeIngredients,
        product_variations: product.product_variations?.map((v: any) => ({
          ...v,
          size: v.size as any // Type assertion to handle database string vs enum
        })) || []
      };
    }));

    return processedProducts as UnifiedProduct[];
  } catch (error) {
    console.error('Error fetching unified products:', error);
    toast.error('Failed to fetch products');
    return [];
  }
};

// Calculate inventory status based on product type and stock
async function calculateInventoryStatus(product: any, storeId: string): Promise<'in_stock' | 'low_stock' | 'out_of_stock'> {
  if (product.product_type === 'direct') {
    // For direct products, check the linked inventory stock
    if (product.inventory_stock_id && product.inventory_item) {
      const currentStock = product.inventory_item.stock_quantity || 0;
      const threshold = product.inventory_item.minimum_threshold || 10;
      
      if (currentStock <= 0) return 'out_of_stock';
      if (currentStock <= threshold) return 'low_stock';
      return 'in_stock';
    }
    
    // Fallback to product's own stock_quantity if no inventory link
    if (product.stock_quantity <= 0) return 'out_of_stock';
    if (product.stock_quantity <= 5) return 'low_stock';
    return 'in_stock';
  }

  // For recipe products, check ingredient availability
  if (product.product_type === 'recipe') {
    try {
      // Get recipe ingredients from recipe_ingredients table
      const { data: ingredients, error } = await supabase
        .from('recipe_ingredients')
        .select(`
          quantity,
          commissary_item:commissary_inventory(
            current_stock,
            minimum_threshold,
            name,
            unit
          )
        `)
        .eq('recipe_id', product.recipe_id || product.id);

      if (error) {
        console.warn('Error fetching recipe ingredients:', error);
        return product.is_active ? 'in_stock' : 'out_of_stock';
      }

      if (!ingredients || ingredients.length === 0) {
        // No ingredients defined, assume available if product is active
        return product.is_active ? 'in_stock' : 'out_of_stock';
      }

      let hasOutOfStock = false;
      let hasLowStock = false;

      for (const ingredient of ingredients) {
        if (!ingredient.commissary_item) continue;
        
        const requiredQuantity = ingredient.quantity || 1;
        const availableStock = ingredient.commissary_item.current_stock || 0;
        const threshold = ingredient.commissary_item.minimum_threshold || 10;

        if (availableStock < requiredQuantity) {
          hasOutOfStock = true;
          break;
        } else if (availableStock <= threshold) {
          hasLowStock = true;
        }
      }

      if (hasOutOfStock) return 'out_of_stock';
      if (hasLowStock) return 'low_stock';
      return 'in_stock';
    } catch (error) {
      console.error('Error calculating recipe inventory status:', error);
      return product.is_active ? 'in_stock' : 'out_of_stock';
    }
  }

  // Default fallback
  return product.is_active ? 'in_stock' : 'out_of_stock';
}

// Fetch recipe ingredients for display
async function fetchRecipeIngredients(product: any): Promise<Array<{
  id: string;
  name: string;
  quantity: number;
  unit: string;
  current_stock: number;
}>> {
  if (product.product_type !== 'recipe') return [];

  try {
    const { data: ingredients, error } = await supabase
      .from('recipe_ingredients')
      .select(`
        id,
        quantity,
        commissary_item:commissary_inventory(
          id,
          name,
          unit,
          current_stock
        )
      `)
      .eq('recipe_id', product.recipe_id || product.id);

    if (error) throw error;

    return (ingredients || []).map(ingredient => ({
      id: ingredient.id,
      name: ingredient.commissary_item?.name || 'Unknown ingredient',
      quantity: ingredient.quantity || 0,
      unit: ingredient.commissary_item?.unit || 'units',
      current_stock: ingredient.commissary_item?.current_stock || 0
    }));
  } catch (error) {
    console.error('Error fetching recipe ingredients:', error);
    return [];
  }
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