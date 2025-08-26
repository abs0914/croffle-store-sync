// CLEAN, SIMPLIFIED SERVICES ARCHITECTURE
// Single-responsibility services that actually work

// Core Transaction Services (CLEAN PATH)
export * from './transactions/streamlinedTransactionService';
export * from './transactions/transactionItemsService';

// Simple Inventory Service (SINGLE SOURCE OF TRUTH)
export * from './inventory/simpleInventoryService';

/**
 * ARCHITECTURE CLEANUP COMPLETED ✅
 * 
 * REMOVED COMPLEX/ORPHANED SERVICES:
 * - masterControlService (complex stubs)
 * - intelligentValidationService (over-engineered)
 * - realTimeAvailabilityService (complex real-time)
 * - predictive services (unused)
 * - advanced analytics engines (over-complex)
 * - workflow automation (unnecessary)
 * - real-time sync validators (complex)
 * - disabled transaction services (broken)
 * 
 * RESULT: Clean, maintainable, working transaction flow
 */