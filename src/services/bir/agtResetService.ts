import { supabase } from '@/integrations/supabase/client';
import { nowInPhilippines } from '@/utils';

export interface AGTResetData {
  id: string;
  store_id: string;
  terminal_id: string;
  reset_counter: number;
  agt_before_reset: number;
  reset_date: string;
  reset_reason: string;
  rdo_notification_sent: boolean;
  rdo_notification_date?: string;
  rdo_office?: string;
  created_by: string;
  created_at: string;
}

export interface AGTResetNotificationData {
  store_name: string;
  store_address: string;
  tin: string;
  terminal_id: string;
  reset_counter: number;
  agt_before_reset: number;
  reset_date: string;
  new_agt_start: number;
  machine_serial: string;
  accreditation_number: string;
}

const AGT_MAXIMUM_DIGITS = 12; // 12 digits including 2 decimals as per BIR requirement
const AGT_MAXIMUM_VALUE = 999999999.99; // Maximum value before reset

export class AGTResetService {
  /**
   * Check if AGT needs to be reset based on maximum digit constraint
   */
  static shouldResetAGT(currentAGT: number): boolean {
    return currentAGT >= AGT_MAXIMUM_VALUE;
  }

  /**
   * Create AGT reset record and update cumulative sales
   */
  static async performAGTReset(
    storeId: string,
    terminalId: string,
    currentAGT: number,
    userId: string,
    reason: string = 'Maximum digit length reached'
  ): Promise<{ success: boolean; resetCounter: number; message: string }> {
    try {
      // Get current reset counter
      const { data: lastReset } = await supabase
        .from('agt_resets')
        .select('reset_counter')
        .eq('store_id', storeId)
        .eq('terminal_id', terminalId)
        .order('reset_date', { ascending: false })
        .limit(1)
        .single();

      const newResetCounter = (lastReset?.reset_counter || 0) + 1;

      // Create reset record
      const { data: resetRecord, error: resetError } = await supabase
        .from('agt_resets')
        .insert({
          store_id: storeId,
          terminal_id: terminalId,
          reset_counter: newResetCounter,
          agt_before_reset: currentAGT,
          reset_date: nowInPhilippines().toISOString(),
          reset_reason: reason,
          rdo_notification_sent: false,
          created_by: userId
        })
        .select()
        .single();

      if (resetError) throw resetError;

      // Reset cumulative sales to 0
      const { error: cumulativeError } = await supabase
        .from('bir_cumulative_sales')
        .update({
          grand_total_sales: 0,
          grand_total_transactions: 0,
          last_transaction_date: nowInPhilippines().toISOString(),
          updated_at: nowInPhilippines().toISOString()
        })
        .eq('store_id', storeId)
        .eq('terminal_id', terminalId);

      if (cumulativeError) throw cumulativeError;

      // Schedule RDO notification (this would typically trigger an email/SMS service)
      await this.scheduleRDONotification(resetRecord.id, storeId, terminalId, newResetCounter);

      return {
        success: true,
        resetCounter: newResetCounter,
        message: `AGT reset successfully. New reset counter: ${newResetCounter}`
      };

    } catch (error) {
      console.error('Error performing AGT reset:', error);
      return {
        success: false,
        resetCounter: 0,
        message: error instanceof Error ? error.message : 'AGT reset failed'
      };
    }
  }

  /**
   * Schedule RDO notification for AGT reset
   */
  private static async scheduleRDONotification(
    resetId: string,
    storeId: string,
    terminalId: string,
    resetCounter: number
  ): Promise<void> {
    try {
      // Get store information for notification
      const { data: storeData, error: storeError } = await supabase
        .from('stores')
        .select(`
          name,
          address,
          tin
        `)
        .eq('id', storeId)
        .single();

      if (storeError || !storeData) {
        console.error('Error fetching store data for RDO notification:', storeError);
        return;
      }

      const notificationData: AGTResetNotificationData = {
        store_name: storeData.name,
        store_address: storeData.address || '',
        tin: storeData.tin || '',
        terminal_id: terminalId,
        reset_counter: resetCounter,
        agt_before_reset: AGT_MAXIMUM_VALUE,
        reset_date: nowInPhilippines().toISOString(),
        new_agt_start: 0,
        machine_serial: 'MACHINE-001',
        accreditation_number: 'ACC-001'
      };

      // TODO: Call edge function to send notification to RDO
      // await supabase.functions.invoke('send-agt-reset-notification', {
      //   body: { resetId, notificationData }
      // });

      console.log('RDO notification scheduled for AGT reset:', notificationData);

    } catch (error) {
      console.error('Error scheduling RDO notification:', error);
    }
  }

  /**
   * Mark RDO notification as sent
   */
  static async markRDONotificationSent(
    resetId: string,
    rdoOffice: string
  ): Promise<{ success: boolean; message: string }> {
    try {
      const { error } = await supabase
        .from('agt_resets')
        .update({
          rdo_notification_sent: true,
          rdo_notification_date: nowInPhilippines().toISOString(),
          rdo_office: rdoOffice
        })
        .eq('id', resetId);

      if (error) throw error;

      return {
        success: true,
        message: 'RDO notification marked as sent'
      };

    } catch (error) {
      console.error('Error marking RDO notification as sent:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to mark notification as sent'
      };
    }
  }

  /**
   * Get AGT reset history for a store
   */
  static async getAGTResetHistory(
    storeId: string,
    terminalId?: string,
    limit: number = 50
  ): Promise<AGTResetData[]> {
    try {
      let query = supabase
        .from('agt_resets')
        .select('*')
        .eq('store_id', storeId)
        .order('reset_date', { ascending: false })
        .limit(limit);

      if (terminalId) {
        query = query.eq('terminal_id', terminalId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Error fetching AGT reset history:', error);
      return [];
    }
  }

  /**
   * Check for pending RDO notifications
   */
  static async getPendingRDONotifications(
    storeId?: string
  ): Promise<AGTResetData[]> {
    try {
      let query = supabase
        .from('agt_resets')
        .select('*')
        .eq('rdo_notification_sent', false)
        .order('reset_date', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data || [];

    } catch (error) {
      console.error('Error fetching pending RDO notifications:', error);
      return [];
    }
  }

  /**
   * Get current AGT status for a store/terminal
   */
  static async getCurrentAGTStatus(
    storeId: string,
    terminalId: string
  ): Promise<{
    currentAGT: number;
    resetCounter: number;
    lastResetDate?: string;
    needsReset: boolean;
    daysUntilMaximum?: number;
  }> {
    try {
      // Get current cumulative sales
      const { data: cumulativeData } = await supabase
        .from('bir_cumulative_sales')
        .select('grand_total_sales')
        .eq('store_id', storeId)
        .eq('terminal_id', terminalId)
        .single();

      const currentAGT = cumulativeData?.grand_total_sales || 0;

      // Get last reset info
      const { data: lastReset } = await supabase
        .from('agt_resets')
        .select('reset_counter, reset_date')
        .eq('store_id', storeId)
        .eq('terminal_id', terminalId)
        .order('reset_date', { ascending: false })
        .limit(1)
        .single();

      const resetCounter = lastReset?.reset_counter || 0;
      const needsReset = this.shouldResetAGT(currentAGT);
      
      // Calculate days until maximum (rough estimate based on current growth rate)
      let daysUntilMaximum: number | undefined;
      if (!needsReset && currentAGT > 0) {
        // This is a simplified calculation - in reality, you'd want to analyze historical growth
        const remainingAmount = AGT_MAXIMUM_VALUE - currentAGT;
        const dailyAverage = currentAGT / 365; // Assuming 1 year of data
        if (dailyAverage > 0) {
          daysUntilMaximum = Math.floor(remainingAmount / dailyAverage);
        }
      }

      return {
        currentAGT,
        resetCounter,
        lastResetDate: lastReset?.reset_date,
        needsReset,
        daysUntilMaximum
      };

    } catch (error) {
      console.error('Error getting current AGT status:', error);
      return {
        currentAGT: 0,
        resetCounter: 0,
        needsReset: false
      };
    }
  }
}