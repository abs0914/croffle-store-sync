
// Export only services that are compatible with the existing database schema
// Currently, inventory_stock table doesn't exist in the database
// These exports are kept for reference but will need proper database tables before they can be used

// Disabled exports due to missing table:
// export * from './inventoryStockFetch';
// export * from './inventoryStockCreate';
// export * from './inventoryStockUpdate';
// export * from './inventoryStockDelete';
// export * from './inventoryStockAdjust';
// export * from './inventoryStockTransfer';
// export * from './inventoryStockImportExport';

// Empty placeholder export to avoid build errors
export const inventoryStockTableMissing = true;
