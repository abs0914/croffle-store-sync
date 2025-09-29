import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface InventoryAuditRecord {
  id: string;
  store_id: string;
  product_id: string;
  transaction_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reference_id: string;
  notes: string;
  created_by: string;
  created_at: string;
}

export interface AuditReportSummary {
  totalTransactions: number;
  todayTransactions: number;
  recentTransactions: InventoryAuditRecord[];
  transactionsByType: Record<string, number>;
}

export const useInventoryAuditReport = (storeId: string) => {
  const [summary, setSummary] = useState<AuditReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAuditReport = async () => {
    if (!storeId) return;
    
    setLoading(true);
    setError(null);

    try {
      // Fetch recent inventory transactions
      const { data: transactions, error: transactionError } = await supabase
        .from('inventory_transactions')
        .select('*')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(50);

      if (transactionError) {
        throw new Error(`Failed to fetch audit records: ${transactionError.message}`);
      }

      // Calculate summary statistics
      const today = new Date().toISOString().split('T')[0];
      const todayTransactions = transactions?.filter(t => 
        t.created_at.startsWith(today)
      ).length || 0;

      const transactionsByType = transactions?.reduce((acc, transaction) => {
        acc[transaction.transaction_type] = (acc[transaction.transaction_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>) || {};

      setSummary({
        totalTransactions: transactions?.length || 0,
        todayTransactions,
        recentTransactions: transactions || [],
        transactionsByType
      });

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      console.error('Error fetching inventory audit report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditReport();
  }, [storeId]);

  return {
    summary,
    loading,
    error,
    refetch: fetchAuditReport
  };
};