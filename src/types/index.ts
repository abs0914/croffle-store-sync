
export * from './user';
export * from './product';
export * from './store';
// Explicitly re-export to avoid ambiguity with the Shift type
export { Shift as ShiftType } from './shift';
export * from './transaction';
export * from './inventory';
export * from './recipe';

// Common Supabase query result type to help with TypeScript inference
export interface SupabaseQueryResult<T> {
  data: T | null;
  error: Error | null;
}
