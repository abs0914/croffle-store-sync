import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface InventorySyncStatus {
  transactionId: string;
  receiptNumber: string;
  status: 'success' | 'failed' | 'pending';
  createdAt: string;
  errorMessage?: string;
  itemsProcessed?: number;
}

interface SyncStats {
  totalTransactions: number;
  successfulSyncs: number;
  failedSyncs: number;
  successRate: number;
}

export const InventorySyncMonitor: React.FC = () => {
  const [syncStatuses, setSyncStatuses] = useState<InventorySyncStatus[]>([]);
  const [syncStats, setSyncStats] = useState<SyncStats>({
    totalTransactions: 0,
    successfulSyncs: 0,
    failedSyncs: 0,
    successRate: 0
  });
  const [loading, setLoading] = useState(true);

  const fetchSyncData = async () => {
    try {
      setLoading(true);

      // Get recent transactions with inventory movement data
      const { data: transactions, error: transactionsError } = await supabase
        .from('transactions')
        .select(`
          id,
          receipt_number,
          created_at,
          status,
          store_id
        `)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (transactionsError) throw transactionsError;

      // For each transaction, check if it has inventory movements
      const statusPromises = transactions?.map(async (transaction) => {
        const { data: movements, error: movementsError } = await supabase
          .from('inventory_movements')
          .select('id, movement_type, quantity_change')
          .eq('reference_type', 'transaction')
          .eq('reference_id', transaction.id);

        if (movementsError) {
          console.error('Error fetching movements:', movementsError);
        }

        const hasMovements = movements && movements.length > 0;
        const status: InventorySyncStatus['status'] = hasMovements ? 'success' : 'failed';

        return {
          transactionId: transaction.id,
          receiptNumber: transaction.receipt_number || 'N/A',
          status,
          createdAt: transaction.created_at,
          errorMessage: !hasMovements ? 'No inventory movements found' : undefined,
          itemsProcessed: movements?.length || 0
        };
      }) || [];

      const statuses = await Promise.all(statusPromises);
      setSyncStatuses(statuses);

      // Calculate stats
      const total = statuses.length;
      const successful = statuses.filter(s => s.status === 'success').length;
      const failed = statuses.filter(s => s.status === 'failed').length;
      const successRate = total > 0 ? (successful / total) * 100 : 0;

      setSyncStats({
        totalTransactions: total,
        successfulSyncs: successful,
        failedSyncs: failed,
        successRate: Math.round(successRate * 100) / 100
      });

    } catch (error) {
      console.error('Error fetching sync data:', error);
      toast.error('Failed to load inventory sync data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchSyncData();
    toast.success('Inventory sync data refreshed');
  };

  useEffect(() => {
    fetchSyncData();
    
    // Set up real-time monitoring
    const interval = setInterval(fetchSyncData, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const getStatusIcon = (status: InventorySyncStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'pending':
        return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
  };

  const getStatusBadge = (status: InventorySyncStatus['status']) => {
    const variants = {
      success: 'default',
      failed: 'destructive',
      pending: 'secondary'
    } as const;

    return (
      <Badge variant={variants[status]} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Inventory Sync Monitor</h3>
          <p className="text-sm text-muted-foreground">
            Real-time monitoring of inventory synchronization with transactions
          </p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={loading}
          size="sm"
          variant="outline"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStats.totalTransactions}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Successful Syncs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{syncStats.successfulSyncs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Failed Syncs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{syncStats.failedSyncs}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{syncStats.successRate}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {syncStats.successRate < 90 && syncStats.totalTransactions > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Inventory sync success rate is below 90%. This indicates potential issues with the inventory synchronization system.
          </AlertDescription>
        </Alert>
      )}

      {/* Recent Sync Status */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transaction Sync Status</CardTitle>
          <CardDescription>
            Last 20 completed transactions and their inventory sync status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span className="ml-2">Loading sync data...</span>
            </div>
          ) : (
            <div className="space-y-2">
              {syncStatuses.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No recent transactions found
                </div>
              ) : (
                syncStatuses.map((status) => (
                  <div
                    key={status.transactionId}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="font-medium">Receipt: {status.receiptNumber}</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(status.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      {status.itemsProcessed !== undefined && (
                        <span className="text-sm text-muted-foreground">
                          {status.itemsProcessed} items
                        </span>
                      )}
                      {getStatusBadge(status.status)}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};