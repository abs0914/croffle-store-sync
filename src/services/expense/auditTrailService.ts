
import { supabase } from "@/integrations/supabase/client";
import type { ExpenseAuditTrail } from "@/types/expense";

export const auditTrailService = {
  // Create audit trail entry
  async createAuditEntry(entry: {
    entity_type: 'expense' | 'budget' | 'approval' | 'category';
    entity_id: string;
    action: 'create' | 'update' | 'delete' | 'approve' | 'reject';
    old_values?: Record<string, any>;
    new_values?: Record<string, any>;
    store_id?: string;
    reason?: string;
  }): Promise<void> {
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error('User not authenticated');

      // Get user details from app_users
      const { data: appUser } = await supabase
        .from('app_users')
        .select('first_name, last_name, role')
        .eq('user_id', user.user.id)
        .single();

      // Determine changed fields
      const changed_fields = entry.old_values && entry.new_values 
        ? Object.keys(entry.new_values).filter(key => 
            JSON.stringify(entry.old_values![key]) !== JSON.stringify(entry.new_values![key])
          )
        : undefined;

      const auditEntry = {
        entity_type: entry.entity_type,
        entity_id: entry.entity_id,
        action: entry.action,
        old_values: entry.old_values || null,
        new_values: entry.new_values || null,
        changed_fields: changed_fields || null,
        user_id: user.user.id,
        user_name: appUser ? `${appUser.first_name} ${appUser.last_name}` : 'Unknown',
        user_role: appUser?.role || 'unknown',
        store_id: entry.store_id || null,
        reason: entry.reason || null
      };

      // Use any to bypass TypeScript issues until table types are updated
      const { error } = await (supabase as any)
        .from('expense_audit_trail')
        .insert(auditEntry);

      if (error) {
        console.error('Failed to create audit trail entry:', error);
        // Don't throw error to avoid breaking main operation
      }
    } catch (error) {
      console.error('Audit trail service error:', error);
    }
  },

  // Get audit trail for an entity
  async getAuditTrail(entityType: string, entityId: string): Promise<ExpenseAuditTrail[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('expense_audit_trail')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching audit trail:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getAuditTrail:', error);
      return [];
    }
  },

  // Get audit trail for a store
  async getStoreAuditTrail(storeId: string, limit?: number): Promise<ExpenseAuditTrail[]> {
    try {
      let query = (supabase as any)
        .from('expense_audit_trail')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching store audit trail:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getStoreAuditTrail:', error);
      return [];
    }
  },

  // Get recent audit activities
  async getRecentAuditActivities(limit: number = 50): Promise<ExpenseAuditTrail[]> {
    try {
      const { data, error } = await (supabase as any)
        .from('expense_audit_trail')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching recent audit activities:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getRecentAuditActivities:', error);
      return [];
    }
  },

  // Get audit trail by user
  async getUserAuditTrail(userId: string, limit?: number): Promise<ExpenseAuditTrail[]> {
    try {
      let query = (supabase as any)
        .from('expense_audit_trail')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Error fetching user audit trail:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error in getUserAuditTrail:', error);
      return [];
    }
  }
};
