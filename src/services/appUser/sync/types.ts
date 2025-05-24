
export interface SyncResultItem {
  success: boolean;
  email?: string;
  error: string | null;
}

export interface SyncResult {
  created: number;
  errors: string[];
}

export interface UpdateResultItem extends SyncResultItem {
  updated: boolean;
}

export interface UpdateResult {
  updated: number;
  errors: string[];
}
