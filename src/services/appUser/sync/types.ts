
import { User } from '@supabase/supabase-js';

export interface SyncResult {
  created: number;
  errors: string[];
}

export interface UpdateResult {
  updated: number;
  errors: string[];
}

export interface SyncResultItem {
  success: boolean;
  email?: string;
  error: string | null;
}

export interface UpdateResultItem {
  success: boolean;
  updated: boolean;
  email?: string;
  error: string | null;
}
