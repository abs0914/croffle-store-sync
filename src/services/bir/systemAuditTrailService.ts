import { supabase } from "@/integrations/supabase/client";

export interface UnifiedAuditEntry {
  id: string;
  timestamp: string;
  userId: string | null;
  userName: string | null;
  userRole: string | null;
  activity: string;
  activityType: string;
  dataValues: Record<string, any>;
  sourceTable: string;
  storeId: string | null;
}

export interface AuditTrailFilters {
  storeId: string;
  startDate?: string;
  endDate?: string;
  activityType?: string;
  userId?: string;
  limit?: number;
}

/**
 * System Audit Trail Service - Consolidates audit data from multiple sources
 * for BIR compliance reporting
 */
export class SystemAuditTrailService {
  /**
   * Fetch unified audit trail from multiple sources
   */
  static async getUnifiedAuditTrail(filters: AuditTrailFilters): Promise<UnifiedAuditEntry[]> {
    const { storeId, startDate, endDate, activityType, limit = 500 } = filters;

    const results: UnifiedAuditEntry[] = [];

    // Fetch from multiple audit sources in parallel
    const [birLogs, securityLogs, expenseLogs, userRoleLogs] = await Promise.all([
      this.fetchBirAuditLogs(storeId, startDate, endDate, limit),
      this.fetchSecurityAuditLogs(startDate, endDate, limit),
      this.fetchExpenseAuditLogs(storeId, startDate, endDate, limit),
      this.fetchUserRoleAuditLogs(startDate, endDate, limit)
    ]);

    results.push(...birLogs, ...securityLogs, ...expenseLogs, ...userRoleLogs);

    // Sort by timestamp descending
    results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    // Filter by activity type if specified
    let filtered = results;
    if (activityType && activityType !== 'all') {
      filtered = results.filter(entry => entry.activityType === activityType);
    }

    return filtered.slice(0, limit);
  }

  /**
   * Fetch BIR audit logs (transactions, system events)
   */
  private static async fetchBirAuditLogs(
    storeId: string,
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<UnifiedAuditEntry[]> {
    try {
      let query = supabase
        .from('bir_audit_logs')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error || !data) return [];

      return data.map(log => ({
        id: log.id,
        timestamp: log.created_at,
        userId: log.user_id,
        userName: log.cashier_name || null,
        userRole: null,
        activity: log.event_name,
        activityType: log.log_type === 'transaction' ? 'transaction' : 'system',
        dataValues: {
          ...(typeof log.event_data === 'object' ? log.event_data : {}),
          receipt_number: log.receipt_number,
          terminal_id: log.terminal_id,
          sequence_number: log.sequence_number
        },
        sourceTable: 'bir_audit_logs',
        storeId: log.store_id
      }));
    } catch (error) {
      console.error('Error fetching BIR audit logs:', error);
      return [];
    }
  }

  /**
   * Fetch security audit logs (login, logout, auth events)
   */
  private static async fetchSecurityAuditLogs(
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<UnifiedAuditEntry[]> {
    try {
      let query = supabase
        .from('security_audit_log')
        .select('*')
        .order('created_at', { ascending: false });

      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error || !data) return [];

      return data.map(log => ({
        id: log.id,
        timestamp: log.created_at,
        userId: log.user_id,
        userName: null,
        userRole: null,
        activity: log.event_type,
        activityType: 'security',
        dataValues: typeof log.event_details === 'object' ? log.event_details : {},
        sourceTable: 'security_audit_log',
        storeId: null
      }));
    } catch (error) {
      console.error('Error fetching security audit logs:', error);
      return [];
    }
  }

  /**
   * Fetch expense audit trail logs
   */
  private static async fetchExpenseAuditLogs(
    storeId: string,
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<UnifiedAuditEntry[]> {
    try {
      let query = supabase
        .from('expense_audit_trail')
        .select('*')
        .order('created_at', { ascending: false });

      if (storeId) {
        query = query.eq('store_id', storeId);
      }
      if (startDate) {
        query = query.gte('created_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('created_at', `${endDate}T23:59:59`);
      }
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error || !data) return [];

      return data.map(log => ({
        id: log.id,
        timestamp: log.created_at || '',
        userId: log.user_id,
        userName: log.user_name,
        userRole: log.user_role,
        activity: `${log.action} ${log.entity_type}`,
        activityType: 'expense',
        dataValues: {
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          old_values: log.old_values,
          new_values: log.new_values,
          changed_fields: log.changed_fields,
          reason: log.reason
        },
        sourceTable: 'expense_audit_trail',
        storeId: log.store_id
      }));
    } catch (error) {
      console.error('Error fetching expense audit logs:', error);
      return [];
    }
  }

  /**
   * Fetch user role audit logs
   */
  private static async fetchUserRoleAuditLogs(
    startDate?: string,
    endDate?: string,
    limit?: number
  ): Promise<UnifiedAuditEntry[]> {
    try {
      let query = supabase
        .from('user_role_audit')
        .select('*')
        .order('changed_at', { ascending: false });

      if (startDate) {
        query = query.gte('changed_at', `${startDate}T00:00:00`);
      }
      if (endDate) {
        query = query.lte('changed_at', `${endDate}T23:59:59`);
      }
      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error || !data) return [];

      return data.map(log => ({
        id: log.id,
        timestamp: log.changed_at || '',
        userId: log.user_id,
        userName: null,
        userRole: null,
        activity: 'Role Changed',
        activityType: 'user_management',
        dataValues: {
          old_role: log.old_role,
          new_role: log.new_role,
          changed_by: log.changed_by,
          reason: log.reason
        },
        sourceTable: 'user_role_audit',
        storeId: null
      }));
    } catch (error) {
      console.error('Error fetching user role audit logs:', error);
      return [];
    }
  }

  /**
   * Get activity types for filtering
   */
  static getActivityTypes(): { value: string; label: string }[] {
    return [
      { value: 'all', label: 'All Activities' },
      { value: 'transaction', label: 'Transactions' },
      { value: 'system', label: 'System Events' },
      { value: 'security', label: 'Security/Auth' },
      { value: 'expense', label: 'Expenses' },
      { value: 'user_management', label: 'User Management' }
    ];
  }

  /**
   * Format data values for display
   */
  static formatDataValues(dataValues: Record<string, any>): string {
    const entries: string[] = [];
    
    for (const [key, value] of Object.entries(dataValues)) {
      if (value === null || value === undefined) continue;
      
      // Skip nested objects for simple display
      if (typeof value === 'object') {
        if (key === 'old_values' || key === 'new_values') {
          const changes = Object.entries(value as Record<string, any>)
            .map(([k, v]) => `${k}: ${v}`)
            .join(', ');
          if (changes) entries.push(`${key}: {${changes}}`);
        }
        continue;
      }
      
      // Format key to readable label
      const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      entries.push(`${label}: ${value}`);
    }
    
    return entries.join(' | ') || 'No details';
  }
}
