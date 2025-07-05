import { supabase } from "@/integrations/supabase/client";
import { GoodsReceivedNote, GRNItem, PurchaseOrder } from "@/types/orderManagement";
import { toast } from "sonner";
import { logAuditTrailEntry } from "./auditTrailService";
import { triggerInventoryUpdateFromGRN } from "./inventoryUpdateService";

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
      .in('status', ['delivered', 'fulfilled'])
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

export const createGRNWithItems = async (
  purchaseOrderId: string,
  receivedBy: string,
  grnItems: {
    purchase_order_item_id: string;
    received_quantity: number;
    quality_status: 'good' | 'damaged' | 'missing' | 'partial';
    item_remarks?: string;
  }[],
  overallRemarks?: string,
  digitalSignature?: string
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
    
    // Determine overall quality check status
    const hasAnyIssues = grnItems.some(item => 
      item.quality_status !== 'good' || item.received_quantity === 0
    );
    
    // Create GRN
    const { data: grn, error: grnError } = await supabase
      .from('goods_received_notes')
      .insert({
        grn_number: grnNumber,
        purchase_order_id: purchaseOrderId,
        received_by: receivedBy,
        quality_check_passed: !hasAnyIssues,
        remarks: overallRemarks,
        digital_signature: digitalSignature
      })
      .select()
      .single();

    if (grnError) throw grnError;

    // Get purchase order items to get ordered quantities
    const { data: purchaseOrderItems, error: poItemsError } = await supabase
      .from('purchase_order_items')
      .select('id, quantity')
      .eq('purchase_order_id', purchaseOrderId);

    if (poItemsError) throw poItemsError;

    // Create GRN items with ordered quantities
    const grnItemsToInsert = grnItems.map(item => {
      const poItem = purchaseOrderItems?.find(poi => poi.id === item.purchase_order_item_id);
      return {
        grn_id: grn.id,
        purchase_order_item_id: item.purchase_order_item_id,
        ordered_quantity: poItem?.quantity || 0,
        received_quantity: item.received_quantity,
        quality_status: item.quality_status,
        item_remarks: item.item_remarks
      };
    });

    const { error: itemsError } = await supabase
      .from('grn_items')
      .insert(grnItemsToInsert);

    if (itemsError) throw itemsError;

    // Get the full GRN with relationships for return
    const { data: fullGRN, error: fetchError } = await supabase
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
      .eq('id', grn.id)
      .single();

    if (fetchError) throw fetchError;

    // Create discrepancy resolutions for items with issues
    await createItemDiscrepancyResolutions(fullGRN, grnItems);

    // Log audit trail entry
    const itemsWithIssues = grnItems.filter(item => 
      item.quality_status !== 'good' || item.received_quantity === 0
    ).length;

    await logAuditTrailEntry(
      grn.id,
      'grn',
      'created',
      undefined,
      'completed',
      `Enhanced GRN created with ${grnItems.length} items (${itemsWithIssues} with issues)`
    );

    // Trigger automatic inventory update
    await triggerInventoryUpdateFromGRN(fullGRN);

    toast.success('GRN created successfully with item-level tracking');
    return fullGRN;
  } catch (error) {
    console.error('Error creating GRN with items:', error);
    toast.error('Failed to create goods received note');
    return null;
  }
};

const createItemDiscrepancyResolutions = async (
  grn: GoodsReceivedNote, 
  grnItems: { purchase_order_item_id: string; received_quantity: number; quality_status: string; item_remarks?: string }[]
) => {
  try {
    const itemsWithIssues = grnItems.filter(item => 
      item.quality_status !== 'good' || item.received_quantity === 0
    );

    if (itemsWithIssues.length === 0) return;

    for (const item of itemsWithIssues) {
      let resolutionType: 'replace' | 'refund' = 'replace';
      let resolutionNotes = `Item-level discrepancy: ${item.quality_status}`;
      
      if (item.item_remarks) {
        resolutionNotes += ` - ${item.item_remarks}`;
      }

      // Determine resolution type based on issue
      if (item.quality_status === 'missing' || item.received_quantity === 0) {
        resolutionType = 'refund';
      } else if (item.quality_status === 'damaged') {
        const damageKeywords = ['completely damaged', 'totally damaged', 'unusable'];
        if (damageKeywords.some(keyword => 
          item.item_remarks?.toLowerCase().includes(keyword)
        )) {
          resolutionType = 'refund';
        }
      }

      await supabase
        .from('grn_discrepancy_resolutions')
        .insert({
          grn_id: grn.id,
          purchase_order_id: grn.purchase_order_id,
          resolution_type: resolutionType,
          resolution_notes: resolutionNotes,
          financial_adjustment: 0,
          processed_by: (await supabase.auth.getUser()).data.user?.id
        });
    }

    console.log(`Created discrepancy resolutions for ${itemsWithIssues.length} items`);
  } catch (error) {
    console.error('Error creating item discrepancy resolutions:', error);
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

    // Check if this new GRN indicates a discrepancy that needs resolution
    if (data && shouldCreateDiscrepancyResolution(data)) {
      await createAutomaticDiscrepancyResolution(data);
    }

    // Log audit trail entry
    await logAuditTrailEntry(
      data.id,
      'grn',
      'created',
      undefined,
      'completed',
      'Basic GRN created'
    );

    // Trigger automatic inventory update
    await triggerInventoryUpdateFromGRN(data);

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

// New function to retroactively create discrepancy resolutions for existing GRNs
export const createDiscrepancyResolutionsForExistingGRNs = async (): Promise<void> => {
  try {
    console.log('Scanning existing GRNs for discrepancies...');
    
    // Fetch all GRNs that have quality issues or discrepancy keywords in remarks
    const { data: grns, error } = await supabase
      .from('goods_received_notes')
      .select(`
        *,
        purchase_order:purchase_orders(*)
      `)
      .or('quality_check_passed.eq.false,remarks.ilike.%damage%,remarks.ilike.%broken%,remarks.ilike.%defective%,remarks.ilike.%missing%,remarks.ilike.%shortage%,remarks.ilike.%discrepancy%');

    if (error) throw error;

    if (!grns || grns.length === 0) {
      console.log('No GRNs with discrepancies found');
      return;
    }

    console.log(`Found ${grns.length} GRNs with potential discrepancies`);

    // Process each GRN
    for (const grn of grns) {
      if (shouldCreateDiscrepancyResolution(grn)) {
        await createAutomaticDiscrepancyResolution(grn);
      }
    }

    console.log('Finished creating discrepancy resolutions for existing GRNs');
  } catch (error) {
    console.error('Error creating discrepancy resolutions for existing GRNs:', error);
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

export const deleteGRNItem = async (itemId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('grn_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;

    toast.success('GRN item deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting GRN item:', error);
    toast.error('Failed to delete GRN item');
    return false;
  }
};
