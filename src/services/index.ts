// CLEAN, SIMPLIFIED SERVICES ARCHITECTURE
// Single-responsibility services that actually work

// Core Transaction Services (CLEAN PATH)
export * from './transactions/streamlinedTransactionService';
export * from './transactions/transactionItemsService';

// SIMPLIFIED TRANSACTION INVENTORY INTEGRATION
export * from './transactions/simplifiedTransactionInventoryIntegration';

// Optimized Inventory Services (BATCH PROCESSING)
export * from './inventory/batchInventoryService';
export * from './inventory/simpleInventoryService';

// SIMPLIFIED INVENTORY AUDIT SYSTEM (SINGLE TABLE)
export * from './inventory/simplifiedInventoryAuditService';

// LEGACY UNIFIED INVENTORY AUDIT SYSTEM (STANDARDIZED)
export * from './inventory/unifiedInventoryAuditService';
export * from './inventory/standardizedInventoryMigration';

// Recipe Management Services  
export * from './recipes/missingRecipeHandler';

/**
 * ARCHITECTURE CLEANUP COMPLETED ✅
 * 
 * NEW: SIMPLIFIED INVENTORY AUDIT SYSTEM
 * - inventory_movements: SINGLE audit table (all inventory changes)
 * - Simple deductWithAudit method for all deductions
 * - Non-blocking audit logging with retry mechanism
 * - Maintains feature compatibility while simplifying architecture
 * 
 * USAGE:
 * - Use SimplifiedInventoryAuditService.deductWithAudit() for all deductions
 * - Use SimplifiedInventoryAuditService.deductTransactionItems() for POS transactions
 * - All audit records go to inventory_movements only
 * - inventory_transactions table is deprecated for new operations
 * 
 * RESULT: Clean, reliable, single-table audit system
 */