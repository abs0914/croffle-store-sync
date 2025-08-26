/**
 * DISABLED INVENTORY SERVICES
 * 
 * These services have been disabled to prevent conflicts with the simpleInventoryService.
 * They were causing UUID casting errors and duplicate inventory processing.
 * 
 * Only simpleInventoryService should be used for transaction inventory processing.
 */

// Export disabled functions that return success to maintain compatibility
export const disabledInventoryRollbackService = {
  rollbackTransaction: async () => {
    console.warn('⚠️ InventoryRollbackService is disabled. Use simpleInventoryService only.');
    return { success: true, errors: [] };
  }
};

export const disabledEnhancedInventoryDeduction = async () => {
  console.warn('⚠️ Enhanced inventory deduction is disabled. Use simpleInventoryService only.');
  return { 
    success: true, 
    deductedItems: [], 
    failedItems: [], 
    warnings: ['Enhanced inventory deduction is disabled'] 
  };
};

export const disabledIngredientDeductionService = async () => {
  console.warn('⚠️ Ingredient deduction service is disabled. Use simpleInventoryService only.');
  return true;
};

export const disabledRealTimeAvailabilityService = {
  checkProductAvailability: async () => {
    console.warn('⚠️ Real-time availability service is disabled for transactions. Use simpleInventoryService only.');
    return {
      productName: 'disabled',
      isAvailable: true,
      maxQuantity: 999,
      estimatedCost: 0,
      profitMargin: 0,
      lastChecked: new Date()
    };
  },
  deductInventoryForSale: async () => {
    console.warn('⚠️ Real-time availability deduction is disabled. Use simpleInventoryService only.');
    return true;
  }
};

/**
 * IMPORTANT: Only use simpleInventoryService for all transaction inventory operations
 * This prevents:
 * - UUID casting errors in inventory_movements
 * - Duplicate inventory processing
 * - Conflicting service calls
 * - Data integrity issues
 */