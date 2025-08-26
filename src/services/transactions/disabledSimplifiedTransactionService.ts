/**
 * DISABLED SIMPLIFIED TRANSACTION SERVICE
 * 
 * This service has been disabled because it imports enhancedInventoryDeduction
 * which causes UUID casting errors in inventory_movements table.
 * 
 * The service was importing '@/services/inventory/enhancedInventoryDeduction'
 * which inserts into inventory_movements without proper reference_id handling.
 * 
 * USE ONLY: createTransaction.ts + simpleInventoryService.ts
 */

export const createSimplifiedTransaction = async () => {
  console.error('❌ DISABLED: createSimplifiedTransaction has been disabled to prevent UUID conflicts');
  console.error('❌ USE INSTEAD: createTransaction from @/services/transactions/createTransaction');
  throw new Error('Service disabled - use createTransaction instead');
};

/**
 * MIGRATION GUIDE:
 * Replace: import { createSimplifiedTransaction } from '...'
 * With: import { createTransaction } from '@/services/transactions/createTransaction'
 */