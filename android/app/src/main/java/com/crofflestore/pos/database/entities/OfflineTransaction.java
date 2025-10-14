package com.crofflestore.pos.database.entities;

import androidx.room.Entity;
import androidx.room.PrimaryKey;
import androidx.room.ColumnInfo;
import androidx.room.TypeConverters;
import com.crofflestore.pos.database.converters.DateConverter;
import com.crofflestore.pos.database.converters.TransactionItemConverter;
import com.crofflestore.pos.database.converters.PaymentDetailsConverter;
import java.util.Date;
import java.util.List;

/**
 * Room Entity for Offline Transactions
 * 
 * Stores transaction data locally on Android device with:
 * - Complete transaction details
 * - Sync status tracking
 * - Priority-based processing
 * - Conflict resolution data
 */
@Entity(tableName = "offline_transactions")
@TypeConverters({DateConverter.class, TransactionItemConverter.class, PaymentDetailsConverter.class})
public class OfflineTransaction {
    
    @PrimaryKey
    @ColumnInfo(name = "id")
    public String id;
    
    @ColumnInfo(name = "timestamp")
    public Date timestamp;
    
    @ColumnInfo(name = "store_id")
    public String storeId;
    
    @ColumnInfo(name = "user_id")
    public String userId;
    
    @ColumnInfo(name = "shift_id")
    public String shiftId;
    
    @ColumnInfo(name = "customer_id")
    public String customerId;
    
    @ColumnInfo(name = "items")
    public List<TransactionItem> items;
    
    @ColumnInfo(name = "subtotal")
    public double subtotal;
    
    @ColumnInfo(name = "tax")
    public double tax;
    
    @ColumnInfo(name = "discount")
    public double discount;
    
    @ColumnInfo(name = "discount_type")
    public String discountType;
    
    @ColumnInfo(name = "discount_id_number")
    public String discountIdNumber;
    
    @ColumnInfo(name = "total")
    public double total;
    
    @ColumnInfo(name = "amount_tendered")
    public double amountTendered;
    
    @ColumnInfo(name = "change_amount")
    public Double change;
    
    @ColumnInfo(name = "payment_method")
    public String paymentMethod; // 'cash', 'card', 'e-wallet'
    
    @ColumnInfo(name = "payment_details")
    public PaymentDetails paymentDetails;
    
    @ColumnInfo(name = "order_type")
    public String orderType;
    
    @ColumnInfo(name = "delivery_platform")
    public String deliveryPlatform;
    
    @ColumnInfo(name = "delivery_order_number")
    public String deliveryOrderNumber;
    
    @ColumnInfo(name = "sync_status")
    public String syncStatus; // 'pending', 'syncing', 'synced', 'failed', 'conflict'
    
    @ColumnInfo(name = "sync_attempts")
    public int syncAttempts;
    
    @ColumnInfo(name = "last_sync_attempt")
    public Date lastSyncAttempt;
    
    @ColumnInfo(name = "sync_error")
    public String syncError;
    
    @ColumnInfo(name = "priority")
    public String priority; // 'high', 'medium', 'low'
    
    @ColumnInfo(name = "receipt_number")
    public String receiptNumber;
    
    @ColumnInfo(name = "device_id")
    public String deviceId;
    
    @ColumnInfo(name = "network_quality")
    public String networkQuality;
    
    @ColumnInfo(name = "conflict_data")
    public String conflictData; // JSON string for conflict resolution data
    
    @ColumnInfo(name = "created_at")
    public Date createdAt;
    
    @ColumnInfo(name = "updated_at")
    public Date updatedAt;
    
    // Constructors
    public OfflineTransaction() {
        this.createdAt = new Date();
        this.updatedAt = new Date();
        this.syncAttempts = 0;
        this.syncStatus = "pending";
    }
    
    public OfflineTransaction(String id, String storeId, String userId, String shiftId) {
        this();
        this.id = id;
        this.storeId = storeId;
        this.userId = userId;
        this.shiftId = shiftId;
        this.timestamp = new Date();
    }
    
    // Helper methods
    public boolean isPending() {
        return "pending".equals(syncStatus);
    }
    
    public boolean isSyncing() {
        return "syncing".equals(syncStatus);
    }
    
    public boolean isSynced() {
        return "synced".equals(syncStatus);
    }
    
    public boolean hasFailed() {
        return "failed".equals(syncStatus);
    }
    
    public boolean hasConflict() {
        return "conflict".equals(syncStatus);
    }
    
    public boolean isHighPriority() {
        return "high".equals(priority);
    }
    
    public boolean isCashTransaction() {
        return "cash".equals(paymentMethod);
    }
    
    public void markAsSyncing() {
        this.syncStatus = "syncing";
        this.lastSyncAttempt = new Date();
        this.updatedAt = new Date();
    }
    
    public void markAsSynced() {
        this.syncStatus = "synced";
        this.updatedAt = new Date();
    }
    
    public void markAsFailed(String error) {
        this.syncStatus = "failed";
        this.syncError = error;
        this.syncAttempts++;
        this.lastSyncAttempt = new Date();
        this.updatedAt = new Date();
    }
    
    public void markAsConflict(String conflictData) {
        this.syncStatus = "conflict";
        this.conflictData = conflictData;
        this.updatedAt = new Date();
    }
    
    public boolean shouldRetry() {
        return hasFailed() && syncAttempts < 5;
    }
    
    public long getTimeSinceLastSync() {
        if (lastSyncAttempt == null) return Long.MAX_VALUE;
        return System.currentTimeMillis() - lastSyncAttempt.getTime();
    }
    
    // Inner classes for complex data types
    public static class TransactionItem {
        public String productId;
        public String variationId;
        public String name;
        public int quantity;
        public double unitPrice;
        public double totalPrice;
        public String category;
        public String sku;
        public Double taxRate;
        
        public TransactionItem() {}
        
        public TransactionItem(String productId, String name, int quantity, double unitPrice) {
            this.productId = productId;
            this.name = name;
            this.quantity = quantity;
            this.unitPrice = unitPrice;
            this.totalPrice = quantity * unitPrice;
        }
    }
    
    public static class PaymentDetails {
        public String cardType;
        public String cardLastFour;
        public String transactionId;
        public String authCode;
        public String referenceNumber;
        public String processorResponse;
        public Date processedAt;
        
        public PaymentDetails() {}
        
        public PaymentDetails(String cardType, String cardLastFour) {
            this.cardType = cardType;
            this.cardLastFour = cardLastFour;
            this.processedAt = new Date();
        }
    }
    
    @Override
    public String toString() {
        return "OfflineTransaction{" +
                "id='" + id + '\'' +
                ", receiptNumber='" + receiptNumber + '\'' +
                ", total=" + total +
                ", paymentMethod='" + paymentMethod + '\'' +
                ", syncStatus='" + syncStatus + '\'' +
                ", priority='" + priority + '\'' +
                ", timestamp=" + timestamp +
                '}';
    }
}
