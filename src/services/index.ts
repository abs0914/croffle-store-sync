// CLEAN, SIMPLIFIED SERVICES ARCHITECTURE
// Single-responsibility services that actually work

// Core Transaction Services (CLEAN PATH)
export * from './transactions/streamlinedTransactionService';
export * from './transactions/transactionItemsService';

// Optimized Inventory Services (BATCH PROCESSING)
export * from './inventory/batchInventoryService';
export * from './inventory/simpleInventoryService';

// UNIFIED INVENTORY AUDIT SYSTEM (STANDARDIZED)
export * from './inventory/unifiedInventoryAuditService';
export * from './inventory/standardizedInventoryMigration';

// Recipe Management Services  
export * from './recipes/missingRecipeHandler';

/**
 * ARCHITECTURE CLEANUP COMPLETED ✅
 * 
 * NEW: UNIFIED INVENTORY AUDIT SYSTEM
 * - inventory_movements: Primary audit table (raw inventory changes)
 * - inventory_transactions: Secondary audit table (product-specific operations)
 * - Consistent audit trails with proper reference tracking
 * - Migration layer for backward compatibility
 * 
 * USAGE:
 * - Use unifiedInventoryAuditService for all new inventory operations
 * - Existing services automatically use migration layer
 * - inventory_movements = primary audit trail
 * - inventory_transactions = product sales/returns only
 * 
 * RESULT: Standardized, reliable inventory audit system
 */