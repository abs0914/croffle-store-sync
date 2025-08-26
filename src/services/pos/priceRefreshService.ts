/**
 * Price Refresh Service for POS
 * Handles automatic price updates when catalog prices change
 */

export interface PriceRefreshNotification {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  storeId: string;
  timestamp: Date;
}

class PriceRefreshService {
  private listeners = new Set<() => void>();
  
  // Register a listener for price updates
  addRefreshListener(callback: () => void) {
    this.listeners.add(callback);
    
    // Return cleanup function
    return () => {
      this.listeners.delete(callback);
    };
  }
  
  // Notify all listeners of price updates
  notifyPriceUpdate(notification: PriceRefreshNotification) {
    console.log('🔄 Price updated, notifying POS:', notification);
    
    // Call all registered listeners to refresh products
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error calling price refresh listener:', error);
      }
    });
  }
  
  // Trigger manual refresh (can be called from catalog management)
  triggerRefresh() {
    console.log('🔄 Manual price refresh triggered');
    this.listeners.forEach(listener => {
      try {
        listener();
      } catch (error) {
        console.error('Error calling manual refresh listener:', error);
      }
    });
  }
}

export const priceRefreshService = new PriceRefreshService();