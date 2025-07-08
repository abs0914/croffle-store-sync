import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export interface NotificationConfig {
  showPriceUpdates: boolean;
  showAvailabilityChanges: boolean;
  showInventoryAlerts: boolean;
  showSystemStatus: boolean;
  soundEnabled: boolean;
}

export interface RealTimeNotification {
  id: string;
  type: 'price_update' | 'availability_change' | 'inventory_alert' | 'system_status';
  title: string;
  message: string;
  timestamp: Date;
  productId?: string;
  productName?: string;
  storeId: string;
  severity: 'info' | 'warning' | 'error' | 'success';
}

class RealTimeNotificationService {
  private config: NotificationConfig = {
    showPriceUpdates: true,
    showAvailabilityChanges: true,
    showInventoryAlerts: true,
    showSystemStatus: true,
    soundEnabled: false
  };

  private notifications: RealTimeNotification[] = [];
  private maxNotifications = 50;

  updateConfig(newConfig: Partial<NotificationConfig>) {
    this.config = { ...this.config, ...newConfig };
    localStorage.setItem('pos_notification_config', JSON.stringify(this.config));
  }

  loadConfig() {
    const saved = localStorage.getItem('pos_notification_config');
    if (saved) {
      try {
        this.config = { ...this.config, ...JSON.parse(saved) };
      } catch (error) {
        console.warn('Failed to load notification config:', error);
      }
    }
  }

  private playNotificationSound() {
    if (!this.config.soundEnabled) return;
    
    try {
      // Create a simple notification sound
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      
      gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.warn('Failed to play notification sound:', error);
    }
  }

  private addNotification(notification: RealTimeNotification) {
    this.notifications.unshift(notification);
    
    // Keep only the latest notifications
    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }
  }

  showPriceUpdateNotification(productName: string, oldPrice: number, newPrice: number, storeId: string, productId: string) {
    if (!this.config.showPriceUpdates) return;

    const notification: RealTimeNotification = {
      id: `price_${productId}_${Date.now()}`,
      type: 'price_update',
      title: 'Price Updated',
      message: `${productName}: ₱${oldPrice.toFixed(2)} → ₱${newPrice.toFixed(2)}`,
      timestamp: new Date(),
      productId,
      productName,
      storeId,
      severity: 'info'
    };

    this.addNotification(notification);
    this.playNotificationSound();

    toast.info(notification.title, {
      description: notification.message,
      duration: 4000
    });
  }

  showAvailabilityChangeNotification(productName: string, isAvailable: boolean, reason: string, storeId: string, productId: string) {
    if (!this.config.showAvailabilityChanges) return;

    const notification: RealTimeNotification = {
      id: `availability_${productId}_${Date.now()}`,
      type: 'availability_change',
      title: isAvailable ? 'Product Available' : 'Product Unavailable',
      message: `${productName}: ${reason}`,
      timestamp: new Date(),
      productId,
      productName,
      storeId,
      severity: isAvailable ? 'success' : 'warning'
    };

    this.addNotification(notification);
    this.playNotificationSound();

    if (isAvailable) {
      toast.success(notification.title, {
        description: notification.message,
        duration: 3000
      });
    } else {
      toast.warning(notification.title, {
        description: notification.message,
        duration: 5000
      });
    }
  }

  showInventoryAlertNotification(itemName: string, currentStock: number, threshold: number, storeId: string) {
    if (!this.config.showInventoryAlerts) return;

    const notification: RealTimeNotification = {
      id: `inventory_${itemName}_${Date.now()}`,
      type: 'inventory_alert',
      title: currentStock <= 0 ? 'Out of Stock' : 'Low Stock Alert',
      message: `${itemName}: ${currentStock} remaining (threshold: ${threshold})`,
      timestamp: new Date(),
      storeId,
      severity: currentStock <= 0 ? 'error' : 'warning'
    };

    this.addNotification(notification);
    this.playNotificationSound();

    if (currentStock <= 0) {
      toast.error(notification.title, {
        description: notification.message,
        duration: 6000
      });
    } else {
      toast.warning(notification.title, {
        description: notification.message,
        duration: 4000
      });
    }
  }

  showSystemStatusNotification(title: string, message: string, severity: 'info' | 'warning' | 'error' | 'success', storeId: string) {
    if (!this.config.showSystemStatus) return;

    const notification: RealTimeNotification = {
      id: `system_${Date.now()}`,
      type: 'system_status',
      title,
      message,
      timestamp: new Date(),
      storeId,
      severity
    };

    this.addNotification(notification);
    
    if (severity === 'error' || severity === 'warning') {
      this.playNotificationSound();
    }

    const toastFunction = {
      info: toast.info,
      success: toast.success,
      warning: toast.warning,
      error: toast.error
    }[severity];

    toastFunction(title, {
      description: message,
      duration: severity === 'error' ? 8000 : 4000
    });
  }

  getNotifications(): RealTimeNotification[] {
    return [...this.notifications];
  }

  clearNotifications() {
    this.notifications = [];
  }

  getConfig(): NotificationConfig {
    return { ...this.config };
  }

  setupRealTimeListeners(storeId: string) {
    this.loadConfig();

    // Listen for product catalog changes
    const productSubscription = supabase
      .channel(`notifications_products_${storeId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'product_catalog',
          filter: `store_id=eq.${storeId}`
        }, 
        (payload) => {
          const { old: oldRecord, new: newRecord } = payload;
          
          // Check for price changes
          if (oldRecord.price !== newRecord.price) {
            this.showPriceUpdateNotification(
              newRecord.product_name,
              oldRecord.price,
              newRecord.price,
              storeId,
              newRecord.id
            );
          }
          
          // Check for availability changes
          if (oldRecord.is_available !== newRecord.is_available || oldRecord.product_status !== newRecord.product_status) {
            const reason = newRecord.product_status === 'out_of_stock' 
              ? 'Insufficient ingredients'
              : newRecord.product_status === 'temporarily_unavailable'
              ? 'Temporarily unavailable'
              : newRecord.product_status === 'discontinued'
              ? 'Product discontinued'
              : 'Now available';
              
            this.showAvailabilityChangeNotification(
              newRecord.product_name,
              newRecord.is_available,
              reason,
              storeId,
              newRecord.id
            );
          }
        }
      )
      .subscribe();

    // Listen for inventory changes
    const inventorySubscription = supabase
      .channel(`notifications_inventory_${storeId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'inventory_stock',
          filter: `store_id=eq.${storeId}`
        }, 
        (payload) => {
          const { old: oldRecord, new: newRecord } = payload;
          
          // Check for low stock alerts
          if (newRecord.stock_quantity <= newRecord.minimum_threshold && 
              oldRecord.stock_quantity > newRecord.minimum_threshold) {
            this.showInventoryAlertNotification(
              newRecord.item,
              newRecord.stock_quantity,
              newRecord.minimum_threshold,
              storeId
            );
          }
        }
      )
      .subscribe();

    return () => {
      productSubscription.unsubscribe();
      inventorySubscription.unsubscribe();
    };
  }
}

export const realTimeNotificationService = new RealTimeNotificationService();
