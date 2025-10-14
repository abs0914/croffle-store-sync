package com.crofflestore.pos.database;

import androidx.room.Database;
import androidx.room.Room;
import androidx.room.RoomDatabase;
import androidx.room.TypeConverters;
import androidx.room.migration.Migration;
import androidx.sqlite.db.SupportSQLiteDatabase;
import android.content.Context;
import com.crofflestore.pos.database.entities.OfflineTransaction;
import com.crofflestore.pos.database.dao.OfflineTransactionDao;
import com.crofflestore.pos.database.converters.DateConverter;
import com.crofflestore.pos.database.converters.TransactionItemConverter;
import com.crofflestore.pos.database.converters.PaymentDetailsConverter;

/**
 * Room Database for Croffle Store POS Offline Data
 * 
 * Provides local SQLite storage for:
 * - Offline transactions with full sync capabilities
 * - Product cache for offline operations
 * - Inventory levels and reservations
 * - User preferences and settings
 */
@Database(
    entities = {OfflineTransaction.class},
    version = 1,
    exportSchema = false
)
@TypeConverters({
    DateConverter.class,
    TransactionItemConverter.class,
    PaymentDetailsConverter.class
})
public abstract class CroffleOfflineDatabase extends RoomDatabase {
    
    private static final String DATABASE_NAME = "croffle_offline_db";
    private static volatile CroffleOfflineDatabase INSTANCE;
    
    // Abstract methods to get DAOs
    public abstract OfflineTransactionDao offlineTransactionDao();
    
    /**
     * Get database instance (Singleton pattern)
     */
    public static CroffleOfflineDatabase getInstance(Context context) {
        if (INSTANCE == null) {
            synchronized (CroffleOfflineDatabase.class) {
                if (INSTANCE == null) {
                    INSTANCE = Room.databaseBuilder(
                            context.getApplicationContext(),
                            CroffleOfflineDatabase.class,
                            DATABASE_NAME
                    )
                    .addCallback(roomCallback)
                    .addMigrations(MIGRATION_1_2) // Future migrations
                    .fallbackToDestructiveMigration() // For development only
                    .build();
                }
            }
        }
        return INSTANCE;
    }
    
    /**
     * Database callback for initialization
     */
    private static RoomDatabase.Callback roomCallback = new RoomDatabase.Callback() {
        @Override
        public void onCreate(SupportSQLiteDatabase db) {
            super.onCreate(db);
            // Database created - could populate with initial data
            android.util.Log.d("CroffleDB", "Database created successfully");
        }
        
        @Override
        public void onOpen(SupportSQLiteDatabase db) {
            super.onOpen(db);
            // Database opened - could perform maintenance tasks
            android.util.Log.d("CroffleDB", "Database opened");
        }
    };
    
    /**
     * Migration from version 1 to 2 (example for future use)
     */
    static final Migration MIGRATION_1_2 = new Migration(1, 2) {
        @Override
        public void migrate(SupportSQLiteDatabase database) {
            // Example migration - add new column
            // database.execSQL("ALTER TABLE offline_transactions ADD COLUMN new_column TEXT");
            android.util.Log.d("CroffleDB", "Migration 1->2 completed");
        }
    };
    
    /**
     * Close database instance
     */
    public static void closeDatabase() {
        if (INSTANCE != null && INSTANCE.isOpen()) {
            INSTANCE.close();
            INSTANCE = null;
        }
    }
    
    /**
     * Clear all data (for testing or reset purposes)
     */
    public void clearAllTables() {
        super.clearAllTables();
    }
    
    /**
     * Get database size in bytes
     */
    public long getDatabaseSize(Context context) {
        return context.getDatabasePath(DATABASE_NAME).length();
    }
    
    /**
     * Vacuum database to reclaim space
     */
    public void vacuumDatabase() {
        this.getOpenHelper().getWritableDatabase().execSQL("VACUUM");
    }
    
    /**
     * Check database integrity
     */
    public boolean checkIntegrity() {
        try {
            android.database.Cursor cursor = this.getOpenHelper()
                .getReadableDatabase()
                .rawQuery("PRAGMA integrity_check", null);
            
            if (cursor != null && cursor.moveToFirst()) {
                String result = cursor.getString(0);
                cursor.close();
                return "ok".equals(result);
            }
            return false;
        } catch (Exception e) {
            android.util.Log.e("CroffleDB", "Integrity check failed", e);
            return false;
        }
    }
    
    /**
     * Get database statistics
     */
    public DatabaseStats getDatabaseStats() {
        DatabaseStats stats = new DatabaseStats();
        
        try {
            OfflineTransactionDao dao = offlineTransactionDao();
            
            stats.totalTransactions = dao.getTotalTransactionCount();
            stats.pendingTransactions = dao.getPendingTransactionCount();
            stats.failedTransactions = dao.getFailedTransactionCount();
            stats.syncingTransactions = dao.getSyncingTransactionCount();
            stats.conflictTransactions = dao.getConflictTransactionCount();
            
            stats.highPriorityPending = dao.getHighPriorityPendingCount();
            stats.mediumPriorityPending = dao.getMediumPriorityPendingCount();
            stats.lowPriorityPending = dao.getLowPriorityPendingCount();
            
            stats.totalPendingAmount = dao.getTotalPendingAmount();
            stats.todaysSyncedAmount = dao.getTodaysSyncedAmount();
            
            stats.oldestPendingTransaction = dao.getOldestPendingTransactionTime();
            stats.newestPendingTransaction = dao.getNewestPendingTransactionTime();
            
        } catch (Exception e) {
            android.util.Log.e("CroffleDB", "Failed to get database stats", e);
        }
        
        return stats;
    }
    
    /**
     * Cleanup old data
     */
    public CleanupResult performCleanup() {
        CleanupResult result = new CleanupResult();
        
        try {
            OfflineTransactionDao dao = offlineTransactionDao();
            
            // Calculate cutoff dates
            long sevenDaysAgo = System.currentTimeMillis() - (7 * 24 * 60 * 60 * 1000);
            long thirtyDaysAgo = System.currentTimeMillis() - (30 * 24 * 60 * 60 * 1000);
            
            java.util.Date sevenDaysCutoff = new java.util.Date(sevenDaysAgo);
            java.util.Date thirtyDaysCutoff = new java.util.Date(thirtyDaysAgo);
            
            // Delete old synced transactions (older than 7 days)
            result.deletedSyncedTransactions = dao.deleteSyncedTransactionsOlderThan(sevenDaysCutoff);
            
            // Delete old failed transactions (older than 30 days)
            result.deletedFailedTransactions = dao.deleteFailedTransactionsOlderThan(thirtyDaysCutoff);
            
            // Vacuum database to reclaim space
            vacuumDatabase();
            result.vacuumPerformed = true;
            
            result.success = true;
            
        } catch (Exception e) {
            android.util.Log.e("CroffleDB", "Cleanup failed", e);
            result.success = false;
            result.error = e.getMessage();
        }
        
        return result;
    }
    
    /**
     * Database statistics class
     */
    public static class DatabaseStats {
        public int totalTransactions = 0;
        public int pendingTransactions = 0;
        public int failedTransactions = 0;
        public int syncingTransactions = 0;
        public int conflictTransactions = 0;
        
        public int highPriorityPending = 0;
        public int mediumPriorityPending = 0;
        public int lowPriorityPending = 0;
        
        public Double totalPendingAmount = 0.0;
        public Double todaysSyncedAmount = 0.0;
        
        public java.util.Date oldestPendingTransaction;
        public java.util.Date newestPendingTransaction;
        
        @Override
        public String toString() {
            return "DatabaseStats{" +
                    "totalTransactions=" + totalTransactions +
                    ", pendingTransactions=" + pendingTransactions +
                    ", failedTransactions=" + failedTransactions +
                    ", syncingTransactions=" + syncingTransactions +
                    ", conflictTransactions=" + conflictTransactions +
                    ", highPriorityPending=" + highPriorityPending +
                    ", totalPendingAmount=" + totalPendingAmount +
                    '}';
        }
    }
    
    /**
     * Cleanup result class
     */
    public static class CleanupResult {
        public boolean success = false;
        public int deletedSyncedTransactions = 0;
        public int deletedFailedTransactions = 0;
        public boolean vacuumPerformed = false;
        public String error;
        
        @Override
        public String toString() {
            return "CleanupResult{" +
                    "success=" + success +
                    ", deletedSyncedTransactions=" + deletedSyncedTransactions +
                    ", deletedFailedTransactions=" + deletedFailedTransactions +
                    ", vacuumPerformed=" + vacuumPerformed +
                    ", error='" + error + '\'' +
                    '}';
        }
    }
}
