
import { supabase } from "@/integrations/supabase/client";
import { GoodsReceivedNote, GRNItem, PurchaseOrder } from "@/types/orderManagement";
import { toast } from "sonner";

export const fetchGRNs = async (storeId?: string): Promise<GoodsReceivedNote[]> => {
  try {
    let query = supabase
      .from('goods_received_notes')
      .select(`
        *,
        purchase_order:purchase_orders(
          *,
          items:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        ),
        items:grn_items(
          *,
          purchase_order_item:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (storeId) {
      query = query.eq('purchase_order.store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching GRNs:', error);
    toast.error('Failed to fetch goods received notes');
    return [];
  }
};

export const fetchDeliveredPurchaseOrders = async (storeId?: string): Promise<PurchaseOrder[]> => {
  try {
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        store:stores(id, name, address),
        items:purchase_order_items(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false });

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching delivered purchase orders:', error);
    toast.error('Failed to fetch delivered purchase orders');
    return [];
  }
};

export const fetchAvailableOrdersForGRN = async (storeId?: string): Promise<PurchaseOrder[]> => {
  try {
    // First, get all purchase order IDs that already have GRNs
    const { data: existingGRNs, error: grnError } = await supabase
      .from('goods_received_notes')
      .select('purchase_order_id');

    if (grnError) throw grnError;

    const existingOrderIds = existingGRNs?.map(grn => grn.purchase_order_id) || [];

    // Then fetch delivered orders that don't have GRNs yet
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        store:stores(id, name, address),
        items:purchase_order_items(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false });

    // Filter out orders that already have GRNs
    if (existingOrderIds.length > 0) {
      query = query.not('id', 'in', `(${existingOrderIds.join(',')})`);
    }

    if (storeId) {
      query = query.eq('store_id', storeId);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching available orders for GRN:', error);
    toast.error('Failed to fetch available orders');
    return [];
  }
};

export const createGRN = async (
  purchaseOrderId: string,
  receivedBy: string
): Promise<GoodsReceivedNote | null> => {
  try {
    // Check if GRN already exists for this purchase order
    const { data: existingGRN, error: checkError } = await supabase
      .from('goods_received_notes')
      .select('id')
      .eq('purchase_order_id', purchaseOrderId)
      .maybeSingle();

    if (checkError) throw checkError;
    
    if (existingGRN) {
      toast.error('A GRN already exists for this purchase order');
      return null;
    }

    const grnNumber = await generateGRNNumber();
    
    const { data, error } = await supabase
      .from('goods_received_notes')
      .insert({
        grn_number: grnNumber,
        purchase_order_id: purchaseOrderId,
        received_by: receivedBy
      })
      .select(`
        *,
        purchase_order:purchase_orders(
          *,
          items:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        )
      `)
      .single();

    if (error) throw error;
    toast.success('GRN created successfully - Purchase order automatically completed');
    return data;
  } catch (error) {
    console.error('Error creating GRN:', error);
    toast.error('Failed to create goods received note');
    return null;
  }
};

export const updateGRN = async (
  id: string,
  updates: Partial<GoodsReceivedNote>
): Promise<GoodsReceivedNote | null> => {
  try {
    const { data, error } = await supabase
      .from('goods_received_notes')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        purchase_order:purchase_orders(
          *,
          items:purchase_order_items(
            *,
            inventory_stock:inventory_stock(*)
          )
        )
      `)
      .single();

    if (error) throw error;

    // Check if this update indicates a discrepancy that needs resolution
    if (data && shouldCreateDiscrepancyResolution(data)) {
      await createAutomaticDiscrepancyResolution(data);
    }

    toast.success('GRN updated successfully');
    return data;
  } catch (error) {
    console.error('Error updating GRN:', error);
    toast.error('Failed to update goods received note');
    return null;
  }
};

// Helper function to determine if a discrepancy resolution should be created
const shouldCreateDiscrepancyResolution = (grn: GoodsReceivedNote): boolean => {
  // Create resolution if quality check failed
  if (grn.quality_check_passed === false) {
    return true;
  }
  
  // Create resolution if remarks contain discrepancy indicators
  if (grn.remarks) {
    const discrepancyKeywords = ['damage', 'damaged', 'broken', 'defective', 'missing', 'shortage', 'discrepancy'];
    const remarksLower = grn.remarks.toLowerCase();
    return discrepancyKeywords.some(keyword => remarksLower.includes(keyword));
  }
  
  return false;
};

// Helper function to automatically create discrepancy resolution
const createAutomaticDiscrepancyResolution = async (grn: GoodsReceivedNote): Promise<void> => {
  try {
    // Check if resolution already exists for this GRN
    const { data: existingResolution } = await supabase
      .from('grn_discrepancy_resolutions')
      .select('id')
      .eq('grn_id', grn.id)
      .maybeSingle();

    if (existingResolution) {
      return; // Resolution already exists
    }

    // Determine resolution type based on the issue
    let resolutionType: 'replace' | 'refund' = 'replace';
    let resolutionNotes = 'Automatic discrepancy resolution created due to quality check failure';

    if (grn.remarks) {
      resolutionNotes = `Automatic resolution: ${grn.remarks}`;
      
      // If damage is severe or item is completely unusable, suggest refund
      const refundKeywords = ['completely damaged', 'totally damaged', 'unusable', 'destroyed'];
      if (refundKeywords.some(keyword => grn.remarks!.toLowerCase().includes(keyword))) {
        resolutionType = 'refund';
      }
    }

    const { error } = await supabase
      .from('grn_discrepancy_resolutions')
      .insert({
        grn_id: grn.id,
        purchase_order_id: grn.purchase_order_id,
        resolution_type: resolutionType,
        resolution_notes: resolutionNotes,
        financial_adjustment: 0,
        processed_by: (await supabase.auth.getUser()).data.user?.id
      });

    if (error) {
      console.error('Error creating automatic discrepancy resolution:', error);
    } else {
      console.log('Automatic discrepancy resolution created for GRN:', grn.grn_number);
    }
  } catch (error) {
    console.error('Error in createAutomaticDiscrepancyResolution:', error);
  }
};

export const addGRNItem = async (
  item: Omit<GRNItem, 'id' | 'created_at'>
): Promise<GRNItem | null> => {
  try {
    const { data, error } = await supabase
      .from('grn_items')
      .insert(item)
      .select(`
        *,
        purchase_order_item:purchase_order_items(
          *,
          inventory_stock:inventory_stock(*)
        )
      `)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error adding GRN item:', error);
    toast.error('Failed to add item to GRN');
    return null;
  }
};

const generateGRNNumber = async (): Promise<string> => {
  try {
    // Generate a simple GRN number with timestamp
    const timestamp = Date.now();
    const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `GRN${timestamp}${randomSuffix}`;
  } catch (error) {
    console.error('Error generating GRN number:', error);
    return `GRN${Date.now()}`;
  }
};
