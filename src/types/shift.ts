

export interface Shift {
  id: string;
  userId: string;
  storeId: string;
  startTime: string;
  endTime?: string;
  startingCash: number;
  endingCash?: number;
  status: 'active' | 'closed';
  startPhoto?: string;
  endPhoto?: string;
  startInventoryCount?: Record<string, number>;
  endInventoryCount?: Record<string, number>;
  cashier_id?: string;
}
