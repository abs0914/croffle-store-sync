package com.crofflestore.pos.database.dao;

import androidx.room.Dao;
import androidx.room.Delete;
import androidx.room.Insert;
import androidx.room.OnConflictStrategy;
import androidx.room.Query;
import androidx.room.Update;
import com.crofflestore.pos.database.entities.OfflineTransaction;
import java.util.Date;
import java.util.List;

/**
 * Data Access Object for Offline Transactions
 * 
 * Provides methods for:
 * - CRUD operations on offline transactions
 * - Priority-based querying
 * - Sync status management
 * - Statistics and reporting
 */
@Dao
public interface OfflineTransactionDao {
    
    // Basic CRUD operations
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insert(OfflineTransaction transaction);
    
    @Insert(onConflict = OnConflictStrategy.REPLACE)
    void insertAll(List<OfflineTransaction> transactions);
    
    @Update
    void update(OfflineTransaction transaction);
    
    @Delete
    void delete(OfflineTransaction transaction);
    
    @Query("DELETE FROM offline_transactions WHERE id = :transactionId")
    void deleteById(String transactionId);
    
    // Query operations
    
    @Query("SELECT * FROM offline_transactions WHERE id = :transactionId LIMIT 1")
    OfflineTransaction getById(String transactionId);
    
    @Query("SELECT * FROM offline_transactions ORDER BY timestamp DESC")
    List<OfflineTransaction> getAll();
    
    @Query("SELECT * FROM offline_transactions WHERE store_id = :storeId ORDER BY timestamp DESC")
    List<OfflineTransaction> getByStoreId(String storeId);
    
    // Sync status queries
    
    @Query("SELECT * FROM offline_transactions WHERE sync_status = 'pending' ORDER BY priority DESC, timestamp ASC")
    List<OfflineTransaction> getPendingTransactions();
    
    @Query("SELECT * FROM offline_transactions WHERE sync_status = 'failed' AND sync_attempts < 5 ORDER BY priority DESC, last_sync_attempt ASC")
    List<OfflineTransaction> getFailedTransactionsForRetry();
    
    @Query("SELECT * FROM offline_transactions WHERE sync_status = 'syncing' ORDER BY last_sync_attempt ASC")
    List<OfflineTransaction> getSyncingTransactions();
    
    @Query("SELECT * FROM offline_transactions WHERE sync_status = 'conflict' ORDER BY timestamp DESC")
    List<OfflineTransaction> getConflictTransactions();
    
    @Query("SELECT * FROM offline_transactions WHERE sync_status = 'synced' AND timestamp < :cutoffDate")
    List<OfflineTransaction> getSyncedTransactionsOlderThan(Date cutoffDate);
    
    // Priority-based queries
    
    @Query("SELECT * FROM offline_transactions WHERE priority = :priority AND sync_status IN ('pending', 'failed') ORDER BY timestamp ASC LIMIT :limit")
    List<OfflineTransaction> getTransactionsByPriority(String priority, int limit);
    
    @Query("SELECT * FROM offline_transactions WHERE priority = 'high' AND sync_status IN ('pending', 'failed') ORDER BY timestamp ASC")
    List<OfflineTransaction> getHighPriorityTransactions();
    
    @Query("SELECT * FROM offline_transactions WHERE payment_method = 'cash' AND sync_status IN ('pending', 'failed') ORDER BY timestamp ASC")
    List<OfflineTransaction> getCashTransactionsForSync();
    
    // Batch operations for sync
    
    @Query("SELECT * FROM offline_transactions WHERE sync_status IN ('pending', 'failed') ORDER BY " +
           "CASE priority WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, " +
           "timestamp ASC LIMIT :batchSize")
    List<OfflineTransaction> getNextBatchForSync(int batchSize);
    
    @Query("UPDATE offline_transactions SET sync_status = 'syncing', last_sync_attempt = :syncTime, updated_at = :syncTime WHERE id IN (:transactionIds)")
    void markTransactionsAsSyncing(List<String> transactionIds, Date syncTime);
    
    @Query("UPDATE offline_transactions SET sync_status = 'synced', updated_at = :syncTime WHERE id = :transactionId")
    void markTransactionAsSynced(String transactionId, Date syncTime);
    
    @Query("UPDATE offline_transactions SET sync_status = 'failed', sync_error = :error, sync_attempts = sync_attempts + 1, last_sync_attempt = :syncTime, updated_at = :syncTime WHERE id = :transactionId")
    void markTransactionAsFailed(String transactionId, String error, Date syncTime);
    
    @Query("UPDATE offline_transactions SET sync_status = 'conflict', conflict_data = :conflictData, updated_at = :updateTime WHERE id = :transactionId")
    void markTransactionAsConflict(String transactionId, String conflictData, Date updateTime);
    
    // Statistics and reporting
    
    @Query("SELECT COUNT(*) FROM offline_transactions")
    int getTotalTransactionCount();
    
    @Query("SELECT COUNT(*) FROM offline_transactions WHERE sync_status = 'pending'")
    int getPendingTransactionCount();
    
    @Query("SELECT COUNT(*) FROM offline_transactions WHERE sync_status = 'failed'")
    int getFailedTransactionCount();
    
    @Query("SELECT COUNT(*) FROM offline_transactions WHERE sync_status = 'syncing'")
    int getSyncingTransactionCount();
    
    @Query("SELECT COUNT(*) FROM offline_transactions WHERE sync_status = 'conflict'")
    int getConflictTransactionCount();
    
    @Query("SELECT COUNT(*) FROM offline_transactions WHERE priority = 'high' AND sync_status IN ('pending', 'failed')")
    int getHighPriorityPendingCount();
    
    @Query("SELECT COUNT(*) FROM offline_transactions WHERE priority = 'medium' AND sync_status IN ('pending', 'failed')")
    int getMediumPriorityPendingCount();
    
    @Query("SELECT COUNT(*) FROM offline_transactions WHERE priority = 'low' AND sync_status IN ('pending', 'failed')")
    int getLowPriorityPendingCount();
    
    @Query("SELECT MIN(timestamp) FROM offline_transactions WHERE sync_status IN ('pending', 'failed')")
    Date getOldestPendingTransactionTime();
    
    @Query("SELECT MAX(timestamp) FROM offline_transactions WHERE sync_status IN ('pending', 'failed')")
    Date getNewestPendingTransactionTime();
    
    @Query("SELECT SUM(total) FROM offline_transactions WHERE sync_status = 'pending'")
    Double getTotalPendingAmount();
    
    @Query("SELECT SUM(total) FROM offline_transactions WHERE sync_status = 'synced' AND DATE(timestamp) = DATE('now')")
    Double getTodaysSyncedAmount();
    
    // Cleanup operations
    
    @Query("DELETE FROM offline_transactions WHERE sync_status = 'synced' AND timestamp < :cutoffDate")
    int deleteSyncedTransactionsOlderThan(Date cutoffDate);
    
    @Query("DELETE FROM offline_transactions WHERE sync_status = 'failed' AND sync_attempts >= 5 AND timestamp < :cutoffDate")
    int deleteFailedTransactionsOlderThan(Date cutoffDate);
    
    // Search and filtering
    
    @Query("SELECT * FROM offline_transactions WHERE receipt_number LIKE :receiptNumber LIMIT 1")
    OfflineTransaction getByReceiptNumber(String receiptNumber);
    
    @Query("SELECT * FROM offline_transactions WHERE customer_id = :customerId ORDER BY timestamp DESC")
    List<OfflineTransaction> getByCustomerId(String customerId);
    
    @Query("SELECT * FROM offline_transactions WHERE payment_method = :paymentMethod AND sync_status = :syncStatus ORDER BY timestamp DESC")
    List<OfflineTransaction> getByPaymentMethodAndStatus(String paymentMethod, String syncStatus);
    
    @Query("SELECT * FROM offline_transactions WHERE total >= :minAmount AND total <= :maxAmount ORDER BY timestamp DESC")
    List<OfflineTransaction> getByAmountRange(double minAmount, double maxAmount);
    
    @Query("SELECT * FROM offline_transactions WHERE timestamp BETWEEN :startDate AND :endDate ORDER BY timestamp DESC")
    List<OfflineTransaction> getByDateRange(Date startDate, Date endDate);
    
    // Advanced queries for reporting
    
    @Query("SELECT payment_method, COUNT(*) as count, SUM(total) as total_amount FROM offline_transactions WHERE sync_status = 'synced' AND DATE(timestamp) = DATE('now') GROUP BY payment_method")
    List<PaymentMethodSummary> getTodaysPaymentMethodSummary();
    
    @Query("SELECT priority, COUNT(*) as count FROM offline_transactions WHERE sync_status IN ('pending', 'failed') GROUP BY priority")
    List<PrioritySummary> getPendingTransactionsByPriority();
    
    // Inner classes for query results
    class PaymentMethodSummary {
        public String paymentMethod;
        public int count;
        public double totalAmount;
    }
    
    class PrioritySummary {
        public String priority;
        public int count;
    }
}
