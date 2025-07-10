import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getMiniCroffleBreakdownRatio, calculateServingBreakdown } from './bulkToServingService';

export interface BulkDeliveryItem {
  grn_item_id: string;
  inventory_stock_id: string;
  item_name: string;
  bulk_quantity: number;
  bulk_unit: string;
  serving_unit: string;
  breakdown_ratio: number;
  unit_cost: number;
}

export interface ProcessedDelivery {
  inventory_stock_id: string;
  bulk_quantity: number;
  serving_quantity: number;
  cost_per_serving: number;
  total_cost: number;
}

/**
 * Parse bulk delivery description to extract breakdown information
 * Example: "1 box/70pcs Regular Croissant" → { bulk: 1, unit: "box", breakdown: 70, servingUnit: "pcs" }
 */
export const parseBulkDeliveryDescription = (description: string): {
  bulk_quantity: number;
  bulk_unit: string;
  breakdown_count: number;
  serving_unit: string;
} | null => {
  // Pattern: "X unit/Ypcs" or "X unit/Y pieces"
  const bulkPattern = /(\d+(?:\.\d+)?)\s*(box|case|bag|container|pack)\/(\d+)\s*(pcs|pieces|units)/i;
  const match = description.match(bulkPattern);
  
  if (match) {
    return {
      bulk_quantity: parseFloat(match[1]),
      bulk_unit: match[2].toLowerCase(),
      breakdown_count: parseInt(match[3]),
      serving_unit: match[4] === 'pcs' ? 'pieces' : match[4].toLowerCase()
    };
  }
  
  return null;
};

/**
 * Process bulk delivery and update inventory with serving breakdown
 */
export const processBulkDelivery = async (
  deliveryItems: BulkDeliveryItem[]
): Promise<ProcessedDelivery[]> => {
  const processedDeliveries: ProcessedDelivery[] = [];
  
  try {
    for (const item of deliveryItems) {
      // Calculate serving breakdown
      const breakdown = calculateServingBreakdown(
        item.bulk_quantity,
        item.breakdown_ratio,
        item.unit_cost
      );
      
      // Apply Mini Croffle special handling
      const miniCroffleRatio = getMiniCroffleBreakdownRatio(item.item_name);
      const finalServingQuantity = breakdown.servingQuantity * miniCroffleRatio;
      const finalCostPerServing = breakdown.costPerServing / miniCroffleRatio;
      
      // Update inventory stock with breakdown
      const { error } = await supabase
        .from('inventory_stock')
        .update({
          bulk_quantity: breakdown.bulkQuantity,
          bulk_unit: item.bulk_unit,
          serving_quantity: finalServingQuantity,
          serving_unit: item.serving_unit,
          breakdown_ratio: item.breakdown_ratio * miniCroffleRatio,
          cost_per_serving: finalCostPerServing,
          stock_quantity: Math.floor(finalServingQuantity),
          cost: item.unit_cost,
          updated_at: new Date().toISOString()
        })
        .eq('id', item.inventory_stock_id);
      
      if (error) throw error;
      
      // Record the processed delivery
      processedDeliveries.push({
        inventory_stock_id: item.inventory_stock_id,
        bulk_quantity: breakdown.bulkQuantity,
        serving_quantity: finalServingQuantity,
        cost_per_serving: finalCostPerServing,
        total_cost: item.unit_cost * item.bulk_quantity
      });
      
      console.log(`Processed bulk delivery: ${item.item_name}`, {
        bulk: `${item.bulk_quantity} ${item.bulk_unit}`,
        serving: `${finalServingQuantity} ${item.serving_unit}`,
        ratio: item.breakdown_ratio * miniCroffleRatio,
        costPerServing: finalCostPerServing
      });
    }
    
    toast.success(`Successfully processed ${deliveryItems.length} bulk deliveries`);
    return processedDeliveries;
    
  } catch (error) {
    console.error('Error processing bulk deliveries:', error);
    toast.error('Failed to process bulk deliveries');
    throw error;
  }
};

/**
 * Process GRN items and automatically breakdown bulk deliveries
 */
export const processGRNWithBulkBreakdown = async (
  grnId: string,
  grnItems: Array<{
    id: string;
    inventory_stock_id?: string;
    item_name: string;
    received_quantity: number;
    ordered_quantity: number;
    unit_cost?: number;
    bulk_description?: string;
  }>
): Promise<{
  success: boolean;
  processedItems: ProcessedDelivery[];
  errors: string[];
}> => {
  const processedItems: ProcessedDelivery[] = [];
  const errors: string[] = [];
  
  try {
    const bulkDeliveryItems: BulkDeliveryItem[] = [];
    
    for (const grnItem of grnItems) {
      try {
        // Skip items without inventory mapping
        if (!grnItem.inventory_stock_id) {
          console.log(`Skipping GRN item without inventory mapping: ${grnItem.item_name}`);
          continue;
        }
        
        // Parse bulk description if available
        let breakdown_ratio = 1;
        let serving_unit = 'pieces';
        let bulk_unit = 'units';
        
        if (grnItem.bulk_description) {
          const parsed = parseBulkDeliveryDescription(grnItem.bulk_description);
          if (parsed) {
            breakdown_ratio = parsed.breakdown_count / parsed.bulk_quantity;
            serving_unit = parsed.serving_unit;
            bulk_unit = parsed.bulk_unit;
          }
        } else {
          // Default breakdown for known items
          const miniCroffleRatio = getMiniCroffleBreakdownRatio(grnItem.item_name);
          if (miniCroffleRatio !== 1) {
            breakdown_ratio = miniCroffleRatio;
            serving_unit = 'servings';
          }
        }
        
        bulkDeliveryItems.push({
          grn_item_id: grnItem.id,
          inventory_stock_id: grnItem.inventory_stock_id,
          item_name: grnItem.item_name,
          bulk_quantity: grnItem.received_quantity,
          bulk_unit,
          serving_unit,
          breakdown_ratio,
          unit_cost: grnItem.unit_cost || 0
        });
        
      } catch (itemError) {
        const errorMsg = `Error processing GRN item ${grnItem.item_name}: ${itemError instanceof Error ? itemError.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg, itemError);
      }
    }
    
    // Process all bulk deliveries
    if (bulkDeliveryItems.length > 0) {
      const processed = await processBulkDelivery(bulkDeliveryItems);
      processedItems.push(...processed);
    }
    
    // Log breakdown summary
    await logGRNBreakdownSummary(grnId, processedItems);
    
    return {
      success: errors.length === 0,
      processedItems,
      errors
    };
    
  } catch (error) {
    const errorMsg = `System error during GRN breakdown processing: ${error instanceof Error ? error.message : 'Unknown error'}`;
    errors.push(errorMsg);
    console.error('Error in processGRNWithBulkBreakdown:', error);
    
    return {
      success: false,
      processedItems,
      errors
    };
  }
};

/**
 * Log breakdown summary for audit trail
 */
const logGRNBreakdownSummary = async (
  grnId: string,
  processedItems: ProcessedDelivery[]
): Promise<void> => {
  try {
    const summary = {
      grn_id: grnId,
      processed_at: new Date().toISOString(),
      total_items: processedItems.length,
      total_bulk_cost: processedItems.reduce((sum, item) => sum + item.total_cost, 0),
      breakdown_details: processedItems.map(item => ({
        inventory_stock_id: item.inventory_stock_id,
        bulk_quantity: item.bulk_quantity,
        serving_quantity: item.serving_quantity,
        cost_per_serving: item.cost_per_serving
      }))
    };
    
    console.log('GRN Breakdown Summary:', summary);
    
    // TODO: Store in audit log table if needed
    
  } catch (error) {
    console.error('Error logging GRN breakdown summary:', error);
  }
};

/**
 * Get breakdown preview for GRN items before processing
 */
export const getGRNBreakdownPreview = async (
  grnItems: Array<{
    item_name: string;
    received_quantity: number;
    unit_cost?: number;
    bulk_description?: string;
  }>
): Promise<Array<{
  item_name: string;
  bulk_input: string;
  serving_output: string;
  cost_breakdown: string;
  special_handling?: string;
}>> => {
  const preview = [];
  
  for (const item of grnItems) {
    let breakdown_ratio = 1;
    let serving_unit = 'pieces';
    let bulk_unit = 'units';
    
    // Parse bulk description
    if (item.bulk_description) {
      const parsed = parseBulkDeliveryDescription(item.bulk_description);
      if (parsed) {
        breakdown_ratio = parsed.breakdown_count / parsed.bulk_quantity;
        serving_unit = parsed.serving_unit;
        bulk_unit = parsed.bulk_unit;
      }
    }
    
    // Apply Mini Croffle special handling
    const miniCroffleRatio = getMiniCroffleBreakdownRatio(item.item_name);
    const finalBreakdownRatio = breakdown_ratio * miniCroffleRatio;
    const finalServingQuantity = item.received_quantity * finalBreakdownRatio;
    const costPerServing = (item.unit_cost || 0) / finalBreakdownRatio;
    
    preview.push({
      item_name: item.item_name,
      bulk_input: `${item.received_quantity} ${bulk_unit}`,
      serving_output: `${finalServingQuantity} ${serving_unit}`,
      cost_breakdown: `₱${costPerServing.toFixed(2)} per ${serving_unit}`,
      special_handling: miniCroffleRatio !== 1 ? `Mini Croffle (${miniCroffleRatio}x)` : undefined
    });
  }
  
  return preview;
};