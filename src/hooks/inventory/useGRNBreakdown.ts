import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { 
  processGRNWithBulkBreakdown,
  getGRNBreakdownPreview,
  ProcessedDelivery 
} from '@/services/inventory/grnBreakdownService';

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
      const result = await processGRNWithBulkBreakdown(grnId, grnItems);
      
      if (result.success) {
        setLastResults(result.processedItems);
        toast.success(
          `Successfully processed ${result.processedItems.length} items with bulk breakdown`
        );
        options.onProcessComplete?.(result.processedItems);
        return result;
      } else {
        const errorMsg = `Processing completed with errors: ${result.errors.join(', ')}`;
        toast.error(errorMsg);
        options.onError?.(errorMsg);
        return result;
      }
    } catch (error) {
      const errorMsg = `Failed to process bulk breakdown: ${error instanceof Error ? error.message : 'Unknown error'}`;
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
      const preview = await getGRNBreakdownPreview(grnItems);
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