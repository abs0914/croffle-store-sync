package com.crofflestore.pos.sync;

import android.content.Context;
import android.util.Log;
import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;
import androidx.work.Data;
import androidx.work.Constraints;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.PeriodicWorkRequest;
import androidx.work.WorkManager;
import androidx.work.BackoffPolicy;
import com.crofflestore.pos.database.CroffleOfflineDatabase;
import com.crofflestore.pos.database.entities.OfflineTransaction;
import com.crofflestore.pos.database.dao.OfflineTransactionDao;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Android WorkManager Worker for Background Sync
 * 
 * Handles:
 * - Periodic background sync of offline transactions
 * - Network-aware sync scheduling
 * - Retry logic with exponential backoff
 * - Battery optimization compliance
 * - Sync progress reporting
 */
public class OfflineSyncWorker extends Worker {
    
    private static final String TAG = "OfflineSyncWorker";
    private static final String WORK_NAME_PERIODIC = "offline_sync_periodic";
    private static final String WORK_NAME_IMMEDIATE = "offline_sync_immediate";
    
    // Input data keys
    public static final String KEY_SYNC_TYPE = "sync_type";
    public static final String KEY_PRIORITY_FILTER = "priority_filter";
    public static final String KEY_BATCH_SIZE = "batch_size";
    public static final String KEY_FORCE_SYNC = "force_sync";
    
    // Sync types
    public static final String SYNC_TYPE_PERIODIC = "periodic";
    public static final String SYNC_TYPE_IMMEDIATE = "immediate";
    public static final String SYNC_TYPE_PRIORITY = "priority";
    
    // Default values
    private static final int DEFAULT_BATCH_SIZE = 10;
    private static final int MAX_RETRY_ATTEMPTS = 3;
    
    private CroffleOfflineDatabase database;
    private OfflineTransactionDao transactionDao;
    
    public OfflineSyncWorker(@NonNull Context context, @NonNull WorkerParameters workerParams) {
        super(context, workerParams);
        database = CroffleOfflineDatabase.getInstance(context);
        transactionDao = database.offlineTransactionDao();
    }
    
    @NonNull
    @Override
    public Result doWork() {
        Log.d(TAG, "Starting background sync work...");
        
        try {
            // Get input parameters
            String syncType = getInputData().getString(KEY_SYNC_TYPE);
            String priorityFilter = getInputData().getString(KEY_PRIORITY_FILTER);
            int batchSize = getInputData().getInt(KEY_BATCH_SIZE, DEFAULT_BATCH_SIZE);
            boolean forceSync = getInputData().getBoolean(KEY_FORCE_SYNC, false);
            
            Log.d(TAG, String.format("Sync parameters: type=%s, priority=%s, batchSize=%d, force=%b", 
                    syncType, priorityFilter, batchSize, forceSync));
            
            // Check if sync is needed
            if (!forceSync && !isSyncNeeded()) {
                Log.d(TAG, "No sync needed, skipping...");
                return Result.success(createOutputData(0, 0, 0, "No sync needed"));
            }
            
            // Perform sync based on type
            SyncResult result;
            switch (syncType != null ? syncType : SYNC_TYPE_PERIODIC) {
                case SYNC_TYPE_IMMEDIATE:
                    result = performImmediateSync(batchSize);
                    break;
                case SYNC_TYPE_PRIORITY:
                    result = performPrioritySync(priorityFilter, batchSize);
                    break;
                case SYNC_TYPE_PERIODIC:
                default:
                    result = performPeriodicSync(batchSize);
                    break;
            }
            
            // Log results
            Log.d(TAG, String.format("Sync completed: synced=%d, failed=%d, conflicts=%d", 
                    result.syncedCount, result.failedCount, result.conflictCount));
            
            // Determine work result
            if (result.failedCount > 0 && result.syncedCount == 0) {
                // All transactions failed - retry
                return Result.retry();
            } else if (result.conflictCount > 0) {
                // Some conflicts - success but with conflicts
                return Result.success(createOutputData(result.syncedCount, result.failedCount, 
                        result.conflictCount, "Sync completed with conflicts"));
            } else {
                // Success
                return Result.success(createOutputData(result.syncedCount, result.failedCount, 
                        result.conflictCount, "Sync completed successfully"));
            }
            
        } catch (Exception e) {
            Log.e(TAG, "Sync work failed", e);
            return Result.failure(createOutputData(0, 0, 0, "Sync failed: " + e.getMessage()));
        }
    }
    
    /**
     * Check if sync is needed
     */
    private boolean isSyncNeeded() {
        try {
            int pendingCount = transactionDao.getPendingTransactionCount();
            int failedCount = transactionDao.getFailedTransactionCount();
            
            Log.d(TAG, String.format("Sync check: pending=%d, failed=%d", pendingCount, failedCount));
            return (pendingCount + failedCount) > 0;
        } catch (Exception e) {
            Log.e(TAG, "Failed to check sync status", e);
            return false;
        }
    }
    
    /**
     * Perform immediate sync (all pending transactions)
     */
    private SyncResult performImmediateSync(int batchSize) {
        Log.d(TAG, "Performing immediate sync...");
        
        List<OfflineTransaction> transactions = transactionDao.getNextBatchForSync(batchSize);
        return syncTransactions(transactions);
    }
    
    /**
     * Perform priority-based sync
     */
    private SyncResult performPrioritySync(String priority, int batchSize) {
        Log.d(TAG, "Performing priority sync for: " + priority);
        
        List<OfflineTransaction> transactions;
        if (priority != null) {
            transactions = transactionDao.getTransactionsByPriority(priority, batchSize);
        } else {
            // Default to high priority
            transactions = transactionDao.getHighPriorityTransactions();
            if (transactions.size() > batchSize) {
                transactions = transactions.subList(0, batchSize);
            }
        }
        
        return syncTransactions(transactions);
    }
    
    /**
     * Perform periodic sync (balanced approach)
     */
    private SyncResult performPeriodicSync(int batchSize) {
        Log.d(TAG, "Performing periodic sync...");
        
        // Prioritize cash transactions and high priority items
        List<OfflineTransaction> cashTransactions = transactionDao.getCashTransactionsForSync();
        List<OfflineTransaction> highPriorityTransactions = transactionDao.getHighPriorityTransactions();
        
        // Combine and limit to batch size
        List<OfflineTransaction> transactions = transactionDao.getNextBatchForSync(batchSize);
        
        return syncTransactions(transactions);
    }
    
    /**
     * Sync a list of transactions
     */
    private SyncResult syncTransactions(List<OfflineTransaction> transactions) {
        SyncResult result = new SyncResult();
        
        if (transactions.isEmpty()) {
            Log.d(TAG, "No transactions to sync");
            return result;
        }
        
        Log.d(TAG, String.format("Syncing %d transactions...", transactions.size()));
        
        for (OfflineTransaction transaction : transactions) {
            try {
                // Mark as syncing
                transaction.markAsSyncing();
                transactionDao.update(transaction);
                
                // Simulate sync process (in real implementation, this would call the web service)
                boolean syncSuccess = simulateTransactionSync(transaction);
                
                if (syncSuccess) {
                    transaction.markAsSynced();
                    transactionDao.update(transaction);
                    result.syncedCount++;
                    Log.d(TAG, "Successfully synced transaction: " + transaction.receiptNumber);
                } else {
                    transaction.markAsFailed("Sync failed - server error");
                    transactionDao.update(transaction);
                    result.failedCount++;
                    Log.w(TAG, "Failed to sync transaction: " + transaction.receiptNumber);
                }
                
            } catch (Exception e) {
                Log.e(TAG, "Error syncing transaction: " + transaction.receiptNumber, e);
                transaction.markAsFailed("Sync failed - " + e.getMessage());
                transactionDao.update(transaction);
                result.failedCount++;
            }
        }
        
        return result;
    }
    
    /**
     * Simulate transaction sync (placeholder for actual implementation)
     */
    private boolean simulateTransactionSync(OfflineTransaction transaction) {
        try {
            // In real implementation, this would:
            // 1. Convert transaction to API format
            // 2. Send HTTP request to server
            // 3. Handle response and conflicts
            // 4. Return success/failure
            
            // For now, simulate success for most transactions
            return Math.random() > 0.1; // 90% success rate
            
        } catch (Exception e) {
            Log.e(TAG, "Sync simulation failed", e);
            return false;
        }
    }
    
    /**
     * Create output data for work result
     */
    private Data createOutputData(int synced, int failed, int conflicts, String message) {
        return new Data.Builder()
                .putInt("synced_count", synced)
                .putInt("failed_count", failed)
                .putInt("conflict_count", conflicts)
                .putString("message", message)
                .putLong("timestamp", System.currentTimeMillis())
                .build();
    }
    
    /**
     * Schedule periodic background sync
     */
    public static void schedulePeriodicSync(Context context) {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .setRequiresBatteryNotLow(true)
                .build();
        
        PeriodicWorkRequest syncWork = new PeriodicWorkRequest.Builder(
                OfflineSyncWorker.class,
                15, TimeUnit.MINUTES // Minimum interval for periodic work
        )
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .setInputData(new Data.Builder()
                        .putString(KEY_SYNC_TYPE, SYNC_TYPE_PERIODIC)
                        .putInt(KEY_BATCH_SIZE, DEFAULT_BATCH_SIZE)
                        .build())
                .build();
        
        WorkManager.getInstance(context)
                .enqueueUniquePeriodicWork(WORK_NAME_PERIODIC, 
                        androidx.work.ExistingPeriodicWorkPolicy.KEEP, syncWork);
        
        Log.d(TAG, "Periodic sync scheduled");
    }
    
    /**
     * Schedule immediate sync
     */
    public static void scheduleImmediateSync(Context context, boolean forceSync) {
        Constraints constraints = new Constraints.Builder()
                .setRequiredNetworkType(NetworkType.CONNECTED)
                .build();
        
        OneTimeWorkRequest syncWork = new OneTimeWorkRequest.Builder(OfflineSyncWorker.class)
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 10, TimeUnit.SECONDS)
                .setInputData(new Data.Builder()
                        .putString(KEY_SYNC_TYPE, SYNC_TYPE_IMMEDIATE)
                        .putBoolean(KEY_FORCE_SYNC, forceSync)
                        .putInt(KEY_BATCH_SIZE, 20) // Larger batch for immediate sync
                        .build())
                .build();
        
        WorkManager.getInstance(context)
                .enqueueUniqueWork(WORK_NAME_IMMEDIATE, 
                        androidx.work.ExistingWorkPolicy.REPLACE, syncWork);
        
        Log.d(TAG, "Immediate sync scheduled");
    }
    
    /**
     * Cancel all sync work
     */
    public static void cancelAllSync(Context context) {
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME_PERIODIC);
        WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME_IMMEDIATE);
        Log.d(TAG, "All sync work cancelled");
    }
    
    /**
     * Sync result class
     */
    private static class SyncResult {
        int syncedCount = 0;
        int failedCount = 0;
        int conflictCount = 0;
    }
}
