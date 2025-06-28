
import { supabase } from "@/integrations/supabase/client";
import { ConversionRequest } from "@/types/commissary";
import { toast } from "sonner";

export const executeConversion = async (request: ConversionRequest): Promise<boolean> => {
  try {
    console.log('Executing conversion:', request);

    // Step 1: Check if we have enough raw materials
    for (const inputItem of request.input_items) {
      const { data: rawMaterial, error } = await supabase
        .from('commissary_inventory')
        .select('current_stock, name')
        .eq('id', inputItem.commissary_item_id)
        .eq('is_active', true)
        .single();

      if (error || !rawMaterial) {
        toast.error(`Raw material not found: ${inputItem.commissary_item_id}`);
        return false;
      }

      if (rawMaterial.current_stock < inputItem.quantity) {
        toast.error(`Insufficient stock for ${rawMaterial.name}. Available: ${rawMaterial.current_stock}, Required: ${inputItem.quantity}`);
        return false;
      }
    }

    // Step 2: Deduct raw materials
    for (const inputItem of request.input_items) {
      const { error: deductError } = await supabase.rpc('deduct_commissary_stock', {
        item_id: inputItem.commissary_item_id,
        quantity_to_deduct: inputItem.quantity
      });

      if (deductError) {
        console.error('Error deducting raw material stock:', deductError);
        toast.error('Failed to deduct raw material stock');
        return false;
      }
    }

    // Step 3: Create or update the finished product
    const { data: existingProduct, error: findError } = await supabase
      .from('commissary_inventory')
      .select('id, current_stock')
      .eq('name', request.output_item.name)
      .eq('item_type', 'orderable_item')
      .eq('is_active', true)
      .maybeSingle();

    if (findError) {
      console.error('Error finding existing product:', findError);
      toast.error('Failed to check existing products');
      return false;
    }

    if (existingProduct) {
      // Update existing product stock
      const { error: updateError } = await supabase
        .from('commissary_inventory')
        .update({
          current_stock: existingProduct.current_stock + request.output_item.quantity,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingProduct.id);

      if (updateError) {
        console.error('Error updating product stock:', updateError);
        toast.error('Failed to update product stock');
        return false;
      }
    } else {
      // Create new finished product
      const { error: createError } = await supabase
        .from('commissary_inventory')
        .insert({
          name: request.output_item.name,
          category: 'supplies', // Finished products are supplies
          item_type: 'orderable_item',
          current_stock: request.output_item.quantity,
          minimum_threshold: 0,
          unit: request.output_item.uom,
          unit_cost: request.output_item.unit_cost || 0,
          sku: request.output_item.sku || `FG-${Date.now()}`,
          storage_location: request.output_item.storage_location || 'Finished Goods',
          is_active: true
        });

      if (createError) {
        console.error('Error creating finished product:', createError);
        toast.error('Failed to create finished product');
        return false;
      }
    }

    toast.success(`Successfully converted raw materials into ${request.output_item.quantity} ${request.output_item.uom} of ${request.output_item.name}`);
    return true;
  } catch (error) {
    console.error('Error executing conversion:', error);
    toast.error('Failed to execute conversion');
    return false;
  }
};
