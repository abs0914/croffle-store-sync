
export * from './user';
export * from './product';
export * from './store';
// Explicitly re-export to avoid ambiguity with the Shift type
export type { Shift as ShiftType } from './shift';
export * from './transaction';
export * from './inventory';
export * from './recipe';
export * from './reports';

// Common Supabase query result type to help with TypeScript inference
export interface SupabaseQueryResult<T> {
  data: T | null;
  error: Error | null;
}
