
// Export all inventory stock service functions from their respective files
export * from './inventoryStockFetch';
export * from './inventoryStockCreate';
export * from './inventoryStockUpdate';
export * from './inventoryStockDelete';
export * from './inventoryStockAdjust';
export * from './inventoryStockTransfer';
export * from './inventoryStockImportExport';

// Flag to indicate inventory_stock table is real, not mock
export const inventoryStockTableMissing = false;
