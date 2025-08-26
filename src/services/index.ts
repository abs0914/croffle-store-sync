// CLEAN TRANSACTION SERVICES - SINGLE PATH ONLY
// Only these services should be used for transactions to prevent conflicts

// Core Transaction Service (SINGLE SOURCE OF TRUTH)
export * from './transactions/createTransaction';
export * from './transactions/transactionItemsService'; 
export * from './transactions/transactionValidator';

// Simple Inventory Service (SINGLE INVENTORY PROCESSOR)
export * from './inventory/simpleInventoryService';

// DISABLED SERVICES - DO NOT USE
// export * from './transactions/simplifiedTransactionService'; // DISABLED - causes UUID conflicts
// export * from './pos/reliableTransactionService'; // DISABLED - uses conflicting services
// export * from './inventory/directInventoryService'; // DISABLED - legacy