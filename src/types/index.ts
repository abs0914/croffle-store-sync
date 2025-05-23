
export * from './user';
export * from './product';
export * from './store';
export * from './shift';
export * from './transaction';
export * from './inventory';

// Common Supabase query result type to help with TypeScript inference
export interface SupabaseQueryResult<T> {
  data: T | null;
  error: Error | null;
}
