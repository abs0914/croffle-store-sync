import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle, Clock, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
// Legacy service removed - using AtomicInventoryService
interface FailedTransaction {
  id: string;
  receipt_number: string;
  created_at: string;
  total: number;
  movement_count: number;
  transaction_count: number;
}
export const InventoryDeductionDiagnostic: React.FC = () => {
  const [testing, setTesting] = useState(false);
  const [recovering, setRecovering] = useState(false);
  const [failedTransactions, setFailedTransactions] = useState<FailedTransaction[]>([]);
  const [diagnosticResult, setDiagnosticResult] = useState<string>('');
  const testInventoryDeduction = async () => {
    // Legacy test removed - using new AtomicInventoryService
    toast.info('This diagnostic tool has been replaced with the new atomic inventory system');
    setDiagnosticResult('⚠️ Legacy diagnostic removed - using AtomicInventoryService now');
  };
  const identifyFailedTransactions = async () => {
    setRecovering(true);
    try {
      console.log('🔍 Identifying failed transactions since Sep 11 01:56:15');

      // Query transactions that should have inventory movements but don't
      const {
        data: transactions,
        error
      } = await supabase.from('transactions').select(`
          id,
          receipt_number,
          created_at,
          total
        `).gte('created_at', '2025-09-11 01:56:15').order('created_at', {
        ascending: false
      });
      if (error) {
        throw error;
      }

      // Check each transaction for missing inventory movements
      const failed: FailedTransaction[] = [];
      for (const txn of transactions || []) {
        const {
          data: movements
        } = await supabase.from('inventory_movements').select('id').eq('reference_id', txn.id);
        const {
          data: inventoryTxns
        } = await supabase.from('inventory_transactions').select('id').eq('reference_id', txn.id);
        failed.push({
          ...txn,
          movement_count: movements?.length || 0,
          transaction_count: inventoryTxns?.length || 0
        });
      }
      setFailedTransactions(failed);
      toast.success(`Found ${failed.length} transactions to analyze`);
    } catch (error) {
      console.error('Failed to identify transactions:', error);
      toast.error('Failed to identify failed transactions');
    } finally {
      setRecovering(false);
    }
  };
  const recoverFailedTransaction = async (transaction: FailedTransaction) => {
    try {
      console.log(`🔧 Recovering transaction ${transaction.receipt_number}`);

      // Get transaction items
      const {
        data: items,
        error
      } = await supabase.from('transaction_items').select('*').eq('transaction_id', transaction.id);
      if (error || !items) {
        throw new Error('Failed to get transaction items');
      }

      // Legacy recovery removed - manual correction needed
      toast.info('Transaction recovery has been replaced with manual correction workflow');
    } catch (error) {
      console.error('Recovery failed:', error);
      toast.error(`Recovery failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };
  return <div className="space-y-4">
      

      {failedTransactions.length > 0 && <Card>
          <CardHeader>
            <CardTitle>Failed Transactions ({failedTransactions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {failedTransactions.map(txn => <div key={txn.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge variant={txn.movement_count === 0 ? "destructive" : "secondary"}>
                      {txn.receipt_number}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(txn.created_at).toLocaleString()}
                    </span>
                    <span className="text-sm">₱{txn.total}</span>
                    <span className="text-xs text-muted-foreground">
                      Movements: {txn.movement_count} | Txns: {txn.transaction_count}
                    </span>
                  </div>
                  
                  {txn.movement_count === 0 && <Button size="sm" onClick={() => recoverFailedTransaction(txn)} className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      Recover
                    </Button>}
                </div>)}
            </div>
          </CardContent>
        </Card>}
    </div>;
};