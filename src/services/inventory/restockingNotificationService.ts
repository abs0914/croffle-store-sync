
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { StockAlert } from "./stockMonitoringService";
import { ReorderRecommendation } from "./consumptionAnalyticsService";

export interface RestockingNotification {
  id: string;
  type: 'stock_alert' | 'reorder_recommendation' | 'consumption_spike' | 'supplier_delay';
  title: string;
  message: string;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  action_required: boolean;
  action_text?: string;
  related_items: string[];
  created_at: string;
  read: boolean;
  dismissed: boolean;
}

export interface NotificationPreferences {
  email_notifications: boolean;
  push_notifications: boolean;
  stock_alerts: boolean;
  reorder_reminders: boolean;
  consumption_spikes: boolean;
  supplier_updates: boolean;
  notification_frequency: 'immediate' | 'hourly' | 'daily';
}

export const createStockAlertNotifications = (alerts: StockAlert[]): RestockingNotification[] => {
  return alerts.map(alert => ({
    id: `notification-${alert.id}`,
    type: 'stock_alert',
    title: getAlertTitle(alert),
    message: alert.message,
    urgency: alert.urgency,
    action_required: alert.urgency === 'critical' || alert.urgency === 'high',
    action_text: alert.recommended_action,
    related_items: [alert.item_name],
    created_at: new Date().toISOString(),
    read: false,
    dismissed: false
  }));
};

export const createReorderNotifications = (recommendations: ReorderRecommendation[]): RestockingNotification[] => {
  return recommendations
    .filter(rec => rec.urgency_level === 'critical' || rec.urgency_level === 'high')
    .map(rec => ({
      id: `reorder-notification-${rec.item_id}`,
      type: 'reorder_recommendation',
      title: `Reorder Recommended: ${rec.item_name}`,
      message: `${rec.item_name} needs restocking. Current: ${rec.current_stock} units, Days until stockout: ${rec.days_until_stockout}`,
      urgency: rec.urgency_level,
      action_required: true,
      action_text: `Order ${rec.recommended_order_quantity} units (₱${rec.cost_impact.toLocaleString()})`,
      related_items: [rec.item_name],
      created_at: new Date().toISOString(),
      read: false,
      dismissed: false
    }));
};

export const sendNotification = async (notification: RestockingNotification, userId: string): Promise<boolean> => {
  try {
    // Store notification in database (would need a notifications table)
    console.log('Sending notification:', notification);
    
    // Show toast notification in UI
    const toastType = notification.urgency === 'critical' ? 'error' : 
                     notification.urgency === 'high' ? 'warning' : 'info';
    
    if (toastType === 'error') {
      toast.error(notification.title, {
        description: notification.message,
        duration: 10000
      });
    } else if (toastType === 'warning') {
      toast.warning(notification.title, {
        description: notification.message,
        duration: 8000
      });
    } else {
      toast.info(notification.title, {
        description: notification.message,
        duration: 5000
      });
    }

    return true;
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
};

export const processRestockingAlerts = async (
  storeId: string,
  userId: string
): Promise<RestockingNotification[]> => {
  try {
    const { monitorStockLevels } = await import('./stockMonitoringService');
    const { generateReorderRecommendations } = await import('./consumptionAnalyticsService');
    
    const [alerts, recommendations] = await Promise.all([
      monitorStockLevels(storeId),
      generateReorderRecommendations(storeId)
    ]);

    const notifications: RestockingNotification[] = [
      ...createStockAlertNotifications(alerts),
      ...createReorderNotifications(recommendations)
    ];

    // Send high priority notifications immediately
    const highPriorityNotifications = notifications.filter(n => 
      n.urgency === 'critical' || n.urgency === 'high'
    );

    for (const notification of highPriorityNotifications) {
      await sendNotification(notification, userId);
    }

    return notifications;
  } catch (error) {
    console.error('Error processing restocking alerts:', error);
    return [];
  }
};

export const scheduleRestockingAlerts = (storeId: string, userId: string) => {
  // Set up periodic checking for restocking alerts
  const interval = setInterval(async () => {
    try {
      await processRestockingAlerts(storeId, userId);
    } catch (error) {
      console.error('Error in scheduled restocking alerts:', error);
    }
  }, 15 * 60 * 1000); // Check every 15 minutes

  return interval;
};

const getAlertTitle = (alert: StockAlert): string => {
  switch (alert.alert_type) {
    case 'out_of_stock':
      return `🚨 Out of Stock: ${alert.item_name}`;
    case 'low_stock':
      return `⚠️ Low Stock Alert: ${alert.item_name}`;
    case 'reorder_point':
      return `📦 Reorder Point: ${alert.item_name}`;
    case 'consumption_spike':
      return `📈 Consumption Spike: ${alert.item_name}`;
    default:
      return `Stock Alert: ${alert.item_name}`;
  }
};

export const getNotificationPreferences = async (userId: string): Promise<NotificationPreferences> => {
  try {
    // Would typically fetch from user preferences table
    return {
      email_notifications: true,
      push_notifications: true,
      stock_alerts: true,
      reorder_reminders: true,
      consumption_spikes: true,
      supplier_updates: true,
      notification_frequency: 'immediate'
    };
  } catch (error) {
    console.error('Error getting notification preferences:', error);
    return {
      email_notifications: false,
      push_notifications: false,
      stock_alerts: true,
      reorder_reminders: true,
      consumption_spikes: false,
      supplier_updates: false,
      notification_frequency: 'daily'
    };
  }
};
