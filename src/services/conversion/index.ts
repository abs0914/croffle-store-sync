
import { supabase } from "@/integrations/supabase/client";
import { ConversionRequest, CommissaryInventoryItem } from "@/types/commissary";
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
      const { data: currentItem } = await supabase
        .from('commissary_inventory')
        .select('current_stock')
        .eq('id', inputItem.commissary_item_id)
        .single();

      if (currentItem) {
        const { error: deductError } = await supabase
          .from('commissary_inventory')
          .update({
            current_stock: currentItem.current_stock - inputItem.quantity,
            updated_at: new Date().toISOString()
          })
          .eq('id', inputItem.commissary_item_id);

        if (deductError) {
          console.error('Error deducting raw material stock:', deductError);
          toast.error('Failed to deduct raw material stock');
          return false;
        }
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

export const fetchConversionHistory = async (): Promise<any[]> => {
  try {
    console.log('Fetching conversion history...');
    
    // For now, return empty array as we don't have a conversion history table yet
    // This can be implemented later when we create proper conversion tracking
    return [];
  } catch (error) {
    console.error('Error fetching conversion history:', error);
    toast.error('Failed to fetch conversion history');
    return [];
  }
};

export const fetchAvailableRawMaterials = async (): Promise<CommissaryInventoryItem[]> => {
  try {
    console.log('Fetching available raw materials...');
    
    const { data, error } = await supabase
      .from('commissary_inventory')
      .select('*')
      .eq('item_type', 'raw_material')
      .eq('is_active', true)
      .gt('current_stock', 0)
      .order('name');

    if (error) {
      console.error('Supabase error fetching raw materials:', error);
      throw error;
    }
    
    console.log('Raw materials fetched successfully:', data);
    
    return (data || []).map(item => ({
      ...item,
      uom: item.unit || 'units',
      category: item.category as 'raw_materials' | 'packaging_materials' | 'supplies',
      item_type: item.item_type as 'raw_material' | 'supply' | 'orderable_item'
    }));
  } catch (error) {
    console.error('Error fetching raw materials:', error);
    toast.error('Failed to fetch raw materials');
    return [];
  }
};
