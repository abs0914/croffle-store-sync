/**
 * Utility to manually trigger POS price refresh
 */

import { priceRefreshService } from '@/services/pos/priceRefreshService';
import { toast } from 'sonner';

export const triggerPriceRefresh = () => {
  try {
    console.log('🔄 Manually triggering POS price refresh');
    priceRefreshService.triggerRefresh();
    toast.success('POS prices refreshed successfully', {
      description: 'All point-of-sale systems have been notified to update their prices'
    });
  } catch (error) {
    console.error('Failed to trigger POS refresh:', error);
    toast.error('Failed to refresh POS prices');
  }
};
