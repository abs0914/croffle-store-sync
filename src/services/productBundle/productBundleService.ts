
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductBundle, ProductBundleInput, ProductBundleComponent } from "@/types/productBundle";

export const fetchProductBundles = async (): Promise<ProductBundle[]> => {
  try {
    const { data, error } = await supabase
      .from('product_bundles')
      .select(`
        *,
        components:product_bundle_components(
          *,
          commissary_item:commissary_inventory(
            id,
            name,
            unit,
            current_stock,
            unit_cost
          )
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching product bundles:', error);
    toast.error('Failed to fetch product bundles');
    return [];
  }
};

export const createProductBundle = async (
  bundleData: ProductBundleInput
): Promise<ProductBundle | null> => {
  try {
    // Create the bundle
    const { data: bundle, error: bundleError } = await supabase
      .from('product_bundles')
      .insert({
        name: bundleData.name,
        description: bundleData.description,
        total_price: bundleData.total_price,
        unit_description: bundleData.unit_description,
        is_active: true
      })
      .select()
      .single();

    if (bundleError) throw bundleError;

    // Create the components
    if (bundleData.components.length > 0) {
      const { error: componentsError } = await supabase
        .from('product_bundle_components')
        .insert(
          bundleData.components.map(component => ({
            bundle_id: bundle.id,
            commissary_item_id: component.commissary_item_id,
            quantity: component.quantity,
            unit: component.unit
          }))
        );

      if (componentsError) throw componentsError;
    }

    toast.success('Product bundle created successfully');
    return bundle;
  } catch (error: any) {
    console.error('Error creating product bundle:', error);
    toast.error('Failed to create product bundle');
    return null;
  }
};

export const updateProductBundle = async (
  id: string,
  updates: Partial<ProductBundleInput>
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_bundles')
      .update({
        name: updates.name,
        description: updates.description,
        total_price: updates.total_price,
        unit_description: updates.unit_description,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) throw error;

    // If components are provided, update them
    if (updates.components) {
      // Delete existing components
      await supabase
        .from('product_bundle_components')
        .delete()
        .eq('bundle_id', id);

      // Insert new components
      if (updates.components.length > 0) {
        await supabase
          .from('product_bundle_components')
          .insert(
            updates.components.map(component => ({
              bundle_id: id,
              commissary_item_id: component.commissary_item_id,
              quantity: component.quantity,
              unit: component.unit
            }))
          );
      }
    }

    toast.success('Product bundle updated successfully');
    return true;
  } catch (error: any) {
    console.error('Error updating product bundle:', error);
    toast.error('Failed to update product bundle');
    return false;
  }
};

export const deleteProductBundle = async (id: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('product_bundles')
      .update({ is_active: false })
      .eq('id', id);

    if (error) throw error;

    toast.success('Product bundle deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting product bundle:', error);
    toast.error('Failed to delete product bundle');
    return false;
  }
};

export const calculateBundleComponentCost = (bundle: ProductBundle): number => {
  if (!bundle.components) return 0;
  
  return bundle.components.reduce((total, component) => {
    if (component.commissary_item) {
      return total + (component.quantity * component.commissary_item.unit_cost);
    }
    return total;
  }, 0);
};
