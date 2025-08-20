import { useState, useCallback } from 'react';
import { toast } from 'sonner';

interface OrderDiagnostics {
  orderId: string;
  itemCount: number;
  totalAmount: number;
  timestamp: string;
  storeId: string;
  error?: string;
  validationResults?: any;
  inventoryStatus?: any;
}

/**
 * Hook for diagnosing large order failures
 */
export const useLargeOrderDiagnostics = () => {
  const [diagnosticsHistory, setDiagnosticsHistory] = useState<OrderDiagnostics[]>([]);

  const logOrderAttempt = useCallback((orderData: {
    items: any[];
    total: number;
    storeId: string;
    error?: string;
    validationResults?: any;
    inventoryStatus?: any;
  }) => {
    const diagnostics: OrderDiagnostics = {
      orderId: `order_${Date.now()}`,
      itemCount: orderData.items.length,
      totalAmount: orderData.total,
      timestamp: new Date().toISOString(),
      storeId: orderData.storeId,
      error: orderData.error,
      validationResults: orderData.validationResults,
      inventoryStatus: orderData.inventoryStatus
    };

    setDiagnosticsHistory(prev => [diagnostics, ...prev.slice(0, 9)]); // Keep last 10

    // Enhanced logging for large orders (7+ items)
    if (orderData.items.length >= 7) {
      console.log('🔍 LARGE ORDER DIAGNOSTICS:', {
        ...diagnostics,
        items: orderData.items.map(item => ({
          name: item.product?.name || item.name,
          productId: item.productId,
          quantity: item.quantity,
          price: item.price
        }))
      });

      // Show diagnostic toast for large orders
      if (orderData.error) {
        toast.error(`Large Order Failure Logged (${orderData.items.length} items)`, {
          description: `Order ID: ${diagnostics.orderId.slice(-8)} - ${orderData.error.slice(0, 50)}...`
        });
      } else {
        toast.info(`Large Order Attempt Logged (${orderData.items.length} items)`, {
          description: `Order ID: ${diagnostics.orderId.slice(-8)}`
        });
      }
    }

    return diagnostics.orderId;
  }, []);

  const getDiagnosticsForStore = useCallback((storeId: string) => {
    return diagnosticsHistory.filter(d => d.storeId === storeId);
  }, [diagnosticsHistory]);

  const getFailedLargeOrders = useCallback(() => {
    return diagnosticsHistory.filter(d => d.itemCount >= 7 && d.error);
  }, [diagnosticsHistory]);

  return {
    logOrderAttempt,
    getDiagnosticsForStore,
    getFailedLargeOrders,
    diagnosticsHistory
  };
};