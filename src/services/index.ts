// CLEAN, SIMPLIFIED SERVICES ARCHITECTURE
// Single-responsibility services that actually work

// Core Transaction Services (CLEAN PATH)
export * from './transactions/streamlinedTransactionService';
export * from './transactions/transactionItemsService';
export * from './transactions/comboExpansionService';

// ENHANCED TRANSACTION INVENTORY INTEGRATION (Mix & Match Support)
export * from './transactions/simplifiedTransactionInventoryIntegration';
export * from './inventory/smartMixMatchDeductionService';
export * from './inventory/enhancedInventoryDeductionService';

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
 * NEW: ENHANCED INVENTORY DEDUCTION SYSTEM WITH MIX & MATCH SUPPORT
 * - Smart detection of Mix & Match products (Croffle Overload, Mini Croffle)
 * - Intelligent ingredient categorization (base, choice, packaging)
 * - Only deducts base + selected choices + packaging (not ALL ingredients)
 * - Automatic fallback to regular deduction for standard products
 * - Comprehensive logging and debug information
 * 
 * PREVIOUS: SIMPLIFIED INVENTORY AUDIT SYSTEM
 * - inventory_movements: SINGLE audit table (all inventory changes)
 * - Simple deductWithAudit method for all deductions
 * - Non-blocking audit logging with retry mechanism
 * - Maintains feature compatibility while simplifying architecture
 * 
 * USAGE:
 * - Use SimplifiedTransactionInventoryIntegration.processTransactionInventory() for ALL transactions
 * - System automatically detects Mix & Match products and uses smart deduction
 * - Regular products continue to use standard deduction logic
 * - All audit records go to inventory_movements only
 * 
 * RESULT: Accurate inventory deduction for Mix & Match products, eliminating over-deduction issues
 */