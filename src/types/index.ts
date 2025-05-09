
// Re-export all types from domain-specific files
export * from './user';
export * from './store';
export * from './product';
export * from './inventory';
export * from './recipe';
// Export shift from shift.ts explicitly to avoid collision with transaction.ts
export type { Shift } from './shift';
// Export everything except Shift from transaction.ts to avoid the name collision
export type { 
  CartItem, 
  Transaction, 
  Customer,
  // Remove references to types that don't exist in transaction.ts
  // Payment,
  // DiscountType,
  // ProductVariation
} from './transaction';

// Export the needed types from product.ts again to make them available
// where they're being imported from transaction.ts
export type { ProductVariation } from './product';
