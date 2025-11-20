/**
 * OFFLINE POS SERVICE
 * 
 * Handles POS operations in offline mode.
 * Creates orders, records payments, and queues for sync.
 */

import { offlineDB, OfflineOrder, OfflineOrderItem, OfflinePayment } from './db/schema';
import { deviceIdService } from './deviceIdService';
import { outboxService } from './outboxService';
import { offlineInventoryService } from './offlineInventoryService';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';
import { CartItem } from '@/types';

class OfflinePOSService {
  /**
   * Create order offline
   */
  async createOrder(params: {
    storeId: string;
    userId: string;
    shiftId?: string;
    customerId?: string;
    items: CartItem[];
    orderType: 'dine-in' | 'takeout' | 'delivery';
    deliveryPlatform?: string;
    deliveryOrderNumber?: string;
    subtotal: number;
    tax: number;
    discount: number;
    discountType?: string;
    discountIdNumber?: string;
    total: number;
  }): Promise<{ orderId: string; success: boolean }> {
    try {
      const deviceId = await deviceIdService.getDeviceId();
      const orderId = uuidv4();

      // Create order
      const order: OfflineOrder = {
        id: orderId,
        device_id: deviceId,
        store_id: params.storeId,
        user_id: params.userId,
        shift_id: params.shiftId,
        customer_id: params.customerId,
        order_type: params.orderType,
        delivery_platform: params.deliveryPlatform,
        delivery_order_number: params.deliveryOrderNumber,
        subtotal: params.subtotal,
        tax: params.tax,
        discount: params.discount,
        discount_type: params.discountType,
        discount_id_number: params.discountIdNumber,
        total: params.total,
        status: 'pending',
        created_at: Date.now(),
        synced: false,
        sync_attempts: 0
      };

      await offlineDB.orders.add(order);

      // Create order items
      const orderItems: OfflineOrderItem[] = params.items.map(item => ({
        id: uuidv4(),
        order_id: orderId,
        product_id: item.productId || item.product?.id || '',
        variation_id: item.variationId,
        name: item.product?.name || 'Unknown Item',
        quantity: item.quantity,
        unit_price: item.price || 0,
        total_price: item.quantity * (item.price || 0),
        created_at: Date.now()
      }));

      await offlineDB.order_items.bulkAdd(orderItems);

      // Queue inventory deductions
      for (const item of params.items) {
        await offlineInventoryService.recordSaleDeduction(
          params.storeId,
          item.productId || item.product?.id || '',
          item.quantity,
          orderId,
          params.userId
        );
      }

      // Add to outbox
      await outboxService.addEvent(params.storeId, 'order_created', {
        order_id: orderId,
        order,
        items: orderItems
      }, 7);

      console.log(`✅ Order created offline: ${orderId}`);
      return { orderId, success: true };
    } catch (error) {
      console.error('❌ Failed to create offline order:', error);
      toast.error('Failed to create order');
      return { orderId: '', success: false };
    }
  }

  /**
   * Complete order with payment
   */
  async completeOrder(
    orderId: string,
    paymentMethod: 'cash' | 'card' | 'gcash' | 'paymaya' | 'bank_transfer',
    amountTendered?: number,
    paymentDetails?: any
  ): Promise<boolean> {
    try {
      const order = await offlineDB.orders.get(orderId);
      if (!order) {
        toast.error('Order not found');
        return false;
      }

      // Create payment
      const paymentId = uuidv4();
      const payment: OfflinePayment = {
        id: paymentId,
        order_id: orderId,
        payment_method: paymentMethod,
        amount: order.total,
        amount_tendered: amountTendered,
        change_amount: amountTendered ? amountTendered - order.total : 0,
        reference_number: paymentDetails?.reference_number,
        payment_details: paymentDetails,
        created_at: Date.now(),
        synced: false
      };

      await offlineDB.payments.add(payment);

      // Update order status
      await offlineDB.orders.update(orderId, {
        status: 'completed',
        completed_at: Date.now()
      });

      // Add to outbox
      await outboxService.addEvent(order.store_id, 'order_completed', {
        order_id: orderId,
        payment_id: paymentId,
        payment
      }, 8);

      console.log(`✅ Order completed offline: ${orderId}`);
      
      if (!navigator.onLine) {
        toast.success('Order saved offline - will sync when online', {
          description: `Order: ${orderId.substring(0, 8)}`
        });
      }

      return true;
    } catch (error) {
      console.error('❌ Failed to complete offline order:', error);
      toast.error('Failed to complete order');
      return false;
    }
  }

  /**
   * Get orders for today (this device)
   */
  async getTodayOrders(storeId: string): Promise<OfflineOrder[]> {
    const deviceId = await deviceIdService.getDeviceId();
    const today = new Date().toISOString().split('T')[0];
    const startOfDay = new Date(today).getTime();
    const endOfDay = startOfDay + (24 * 60 * 60 * 1000);

    return await offlineDB.orders
      .where('[device_id+created_at]')
      .between([deviceId, startOfDay], [deviceId, endOfDay])
      .and(o => o.store_id === storeId)
      .reverse()
      .toArray();
  }

  /**
   * Get today's sales totals (this device)
   */
  async getTodaySalesTotals(storeId: string): Promise<{
    orderCount: number;
    grossSales: number;
    netSales: number;
    discounts: number;
  }> {
    const orders = await this.getTodayOrders(storeId);
    const completed = orders.filter(o => o.status === 'completed');

    return {
      orderCount: completed.length,
      grossSales: completed.reduce((sum, o) => sum + o.subtotal, 0),
      netSales: completed.reduce((sum, o) => sum + o.total, 0),
      discounts: completed.reduce((sum, o) => sum + o.discount, 0)
    };
  }

  /**
   * Get order with items and payment
   */
  async getOrderDetails(orderId: string): Promise<{
    order: OfflineOrder;
    items: OfflineOrderItem[];
    payment?: OfflinePayment;
  } | null> {
    const order = await offlineDB.orders.get(orderId);
    if (!order) return null;

    const items = await offlineDB.order_items
      .where('order_id')
      .equals(orderId)
      .toArray();

    const payment = await offlineDB.payments
      .where('order_id')
      .equals(orderId)
      .first();

    return { order, items, payment };
  }

  /**
   * Get unsynced orders count
   */
  async getUnsyncedOrdersCount(storeId: string): Promise<number> {
    return await offlineDB.orders
      .where('[store_id+synced]')
      .equals([storeId, 0])
      .count();
  }
}

// Export singleton instance
export const offlinePOSService = new OfflinePOSService();
