import { useState, useCallback } from 'react';
import { toast } from 'sonner';
// Simplified GRN breakdown - using direct processing
interface ProcessedDelivery {
  id: string;
  item_name: string;
  processed_quantity: number;
}

export interface UseGRNBreakdownOptions {
  onProcessComplete?: (results: ProcessedDelivery[]) => void;
  onError?: (error: string) => void;
}

export function useGRNBreakdown(options: UseGRNBreakdownOptions = {}) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [lastResults, setLastResults] = useState<ProcessedDelivery[]>([]);

  /**
   * Process GRN with automatic bulk breakdown
   */
  const processBreakdown = useCallback(async (
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
  ) => {
    setIsProcessing(true);
    try {
      // Simplified processing - direct 1:1 mapping
      const processedItems: ProcessedDelivery[] = grnItems.map(item => ({
        id: item.id,
        item_name: item.item_name,
        processed_quantity: item.received_quantity
      }));
      
      setLastResults(processedItems);
      toast.success(`Successfully processed ${processedItems.length} items`);
      options.onProcessComplete?.(processedItems);
      
      return {
        success: true,
        processedItems,
        errors: []
      };
    } catch (error) {
      const errorMsg = `Failed to process breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Error processing breakdown:', error);
      toast.error(errorMsg);
      options.onError?.(errorMsg);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  }, [options]);

  /**
   * Generate breakdown preview
   */
  const generatePreview = useCallback(async (
    grnItems: Array<{
      item_name: string;
      received_quantity: number;
      unit_cost?: number;
      bulk_description?: string;
    }>
  ) => {
    setIsPreviewLoading(true);
    try {
      // Simplified preview - direct mapping
      const preview = grnItems.map(item => ({
        item_name: item.item_name,
        bulk_input: `${item.received_quantity} units`,
        serving_output: `${item.received_quantity} servings`,
        cost_breakdown: `₱${(item.unit_cost || 0).toFixed(2)} per unit`,
        special_handling: item.bulk_description ? 'Bulk item' : null
      }));
      return preview;
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate breakdown preview');
      throw error;
    } finally {
      setIsPreviewLoading(false);
    }
  }, []);

  /**
   * Calculate breakdown summary statistics
   */
  const calculateSummary = useCallback((
    grnItems: Array<{
      item_name: string;
      received_quantity: number;
      unit_cost?: number;
      bulk_description?: string;
    }>
  ) => {
    const totalItems = grnItems.length;
    const itemsWithBulkInfo = grnItems.filter(item => item.bulk_description).length;
    const miniCroffleItems = grnItems.filter(item => 
      ['Croissant', 'Whipped Cream', 'Chocolate Sauce', 'Caramel Sauce', 
       'Tiramisu Sauce', 'Colored Sprinkle', 'Peanut', 'Choco Flakes', 'Marshmallow']
      .some(mini => item.item_name.toLowerCase().includes(mini.toLowerCase()))
    ).length;
    
    const totalValue = grnItems.reduce((sum, item) => 
      sum + (item.received_quantity * (item.unit_cost || 0)), 0
    );

    return {
      totalItems,
      itemsWithBulkInfo,
      miniCroffleItems,
      totalValue,
      processingReadiness: itemsWithBulkInfo / totalItems
    };
  }, []);

  return {
    // State
    isProcessing,
    isPreviewLoading,
    lastResults,

    // Actions
    processBreakdown,
    generatePreview,
    calculateSummary,

    // Utilities
    resetResults: () => setLastResults([])
  };
}