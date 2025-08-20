import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { InventorySyncValidator, SyncHealthStatus } from "@/services/inventory/inventorySyncValidator";
import { InventorySyncRetryService, RetryJob } from "@/services/inventory/inventorySyncRetryService";
import { correctTransactionInventory, batchCorrectInventory } from "@/services/inventory/inventoryReconciliation";
import { AlertTriangle, RefreshCw, CheckCircle, XCircle, Clock, TrendingUp, Activity } from "lucide-react";

interface SyncStats {
  totalTransactions: number;
  successfulSyncs: number;
  failedSyncs: number;
  successRate: number;
}

interface FailedTransaction {
  id: string;
  receipt_number: string;
  created_at: string;
  total: number;
  sync_status: string;
  error_details?: string;
  items_processed: number;
}

export const InventorySyncAdminPanel: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [syncHealth, setSyncHealth] = useState<SyncHealthStatus | null>(null);
  const [syncStats, setSyncStats] = useState<SyncStats | null>(null);
  const [failedTransactions, setFailedTransactions] = useState<FailedTransaction[]>([]);
  const [retryJobs, setRetryJobs] = useState<RetryJob[]>([]);
  const [selectedTransactions, setSelectedTransactions] = useState<string[]>([]);

  const syncValidator = InventorySyncValidator.getInstance();
  const retryService = InventorySyncRetryService.getInstance();

  useEffect(() => {
    loadSyncData();
    const interval = setInterval(loadSyncData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadSyncData = async () => {
    try {
      setIsLoading(true);

      // Load sync health
      const health = await syncValidator.validateSyncHealth();
      setSyncHealth(health);

      // Load sync statistics
      const { data: statsData, error: statsError } = await supabase
        .from('inventory_sync_audit')
        .select('sync_status')
        .gte('created_at', new Date(Date.now() - 86400000).toISOString());

      if (!statsError && statsData) {
        const totalTransactions = statsData.length;
        const successfulSyncs = statsData.filter(s => s.sync_status === 'success').length;
        const failedSyncs = statsData.filter(s => s.sync_status === 'failed').length;
        const successRate = totalTransactions > 0 ? (successfulSyncs / totalTransactions) * 100 : 0;
        
        setSyncStats({
          totalTransactions,
          successfulSyncs,
          failedSyncs,
          successRate
        });
      }

      // Load failed transactions
      const { data: failed, error: failedError } = await supabase
        .from('transactions')
        .select(`
          id,
          receipt_number,
          created_at,
          total,
          inventory_sync_audit!inner(
            sync_status,
            error_details,
            items_processed
          )
        `)
        .in('inventory_sync_audit.sync_status', ['failed', 'partial'])
        .gte('created_at', new Date(Date.now() - 86400000).toISOString())
        .order('created_at', { ascending: false })
        .limit(20);

      if (!failedError && failed) {
        const formattedFailed = failed.map(tx => ({
          id: tx.id,
          receipt_number: tx.receipt_number,
          created_at: tx.created_at,
          total: tx.total,
          sync_status: tx.inventory_sync_audit[0]?.sync_status || 'unknown',
          error_details: tx.inventory_sync_audit[0]?.error_details,
          items_processed: tx.inventory_sync_audit[0]?.items_processed || 0
        }));
        setFailedTransactions(formattedFailed);
      }

      // Load retry jobs
      const jobs = retryService.getAllRetryJobs();
      setRetryJobs(jobs);

    } catch (error) {
      console.error('Error loading sync data:', error);
      toast.error('Failed to load sync data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleManualRetry = async (transactionId: string) => {
    try {
      setIsLoading(true);
      toast.info('Starting manual retry...');

      const result = await retryService.manualRetry(transactionId);
      
      if (result.success) {
        toast.success(`✅ Manual retry successful! Processed ${result.processedItems} items`);
      } else {
        toast.error(`❌ Manual retry failed: ${result.errorDetails}`);
      }

      await loadSyncData();
    } catch (error) {
      console.error('Manual retry error:', error);
      toast.error('Manual retry failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBatchRetry = async () => {
    if (selectedTransactions.length === 0) {
      toast.warning('Please select transactions to retry');
      return;
    }

    try {
      setIsLoading(true);
      toast.info(`Starting batch retry for ${selectedTransactions.length} transactions...`);

      let successCount = 0;
      let failCount = 0;

      for (const transactionId of selectedTransactions) {
        try {
          const result = await retryService.manualRetry(transactionId);
          if (result.success) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      toast.success(`Batch retry completed: ${successCount} successful, ${failCount} failed`);
      setSelectedTransactions([]);
      await loadSyncData();

    } catch (error) {
      console.error('Batch retry error:', error);
      toast.error('Batch retry failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReconciliation = async (transactionId: string) => {
    try {
      setIsLoading(true);
      toast.info('Starting inventory reconciliation...');

      const result = await correctTransactionInventory(transactionId);
      
      if (result.success) {
        toast.success(`✅ Reconciliation completed! Made ${result.corrections?.length || 0} corrections`);
      } else {
        toast.error(`❌ Reconciliation failed: ${result.errors?.join(', ') || 'Unknown error'}`);
      }

      await loadSyncData();
    } catch (error) {
      console.error('Reconciliation error:', error);
      toast.error('Reconciliation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefreshHealth = async () => {
    try {
      setIsLoading(true);
      const health = await syncValidator.refreshHealth();
      setSyncHealth(health);
      toast.success('Sync health refreshed');
    } catch (error) {
      toast.error('Failed to refresh sync health');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle className="h-4 w-4 text-success" />;
      case 'failed': return <XCircle className="h-4 w-4 text-destructive" />;
      case 'partial': return <AlertTriangle className="h-4 w-4 text-warning" />;
      case 'pending': return <Clock className="h-4 w-4 text-muted-foreground" />;
      case 'processing': return <RefreshCw className="h-4 w-4 text-primary animate-spin" />;
      default: return <Activity className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      success: 'default',
      failed: 'destructive',
      partial: 'secondary',
      pending: 'outline',
      processing: 'default'
    };

    return (
      <Badge variant={variants[status] || 'outline'} className="flex items-center gap-1">
        {getStatusIcon(status)}
        {status}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Inventory Sync Admin</h1>
          <p className="text-muted-foreground">Monitor and manage inventory synchronization</p>
        </div>
        <Button onClick={handleRefreshHealth} disabled={isLoading}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Sync Health Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Sync Health Status
          </CardTitle>
          <CardDescription>
            Real-time inventory synchronization health monitoring
          </CardDescription>
        </CardHeader>
        <CardContent>
          {syncHealth && (
            <div className="space-y-4">
              {/* Health Alert */}
              <Alert variant={syncHealth.isHealthy ? "default" : "destructive"}>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {syncHealth.isHealthy 
                    ? "✅ Inventory sync is healthy and operational"
                    : `⚠️ Inventory sync issues detected: ${syncHealth.issues.join(', ')}`
                  }
                </AlertDescription>
              </Alert>

              {/* Health Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <p className="text-sm font-medium">Success Rate</p>
                  <div className="space-y-1">
                    <Progress 
                      value={(1 - syncHealth.failureRate) * 100} 
                      className="h-2"
                    />
                    <p className="text-sm text-muted-foreground">
                      {Math.round((1 - syncHealth.failureRate) * 100)}%
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Recent Failures</p>
                  <p className="text-2xl font-bold text-destructive">
                    {syncHealth.recentFailures}
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Last Success</p>
                  <p className="text-sm text-muted-foreground">
                    {syncHealth.lastSuccessfulSync 
                      ? new Date(syncHealth.lastSuccessfulSync).toLocaleString()
                      : 'Never'
                    }
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm font-medium">Sales Status</p>
                  <Badge variant={syncHealth.canProcessSales ? "default" : "destructive"}>
                    {syncHealth.canProcessSales ? "Enabled" : "Disabled"}
                  </Badge>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Statistics */}
      {syncStats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Sync Statistics (Last 24h)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold">{syncStats.totalTransactions}</p>
                <p className="text-sm text-muted-foreground">Total Transactions</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{syncStats.successfulSyncs}</p>
                <p className="text-sm text-muted-foreground">Successful Syncs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-destructive">{syncStats.failedSyncs}</p>
                <p className="text-sm text-muted-foreground">Failed Syncs</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{syncStats.successRate.toFixed(1)}%</p>
                <p className="text-sm text-muted-foreground">Success Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Failed Transactions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Failed Transactions</CardTitle>
              <CardDescription>Transactions requiring manual intervention</CardDescription>
            </div>
            <div className="flex gap-2">
              {selectedTransactions.length > 0 && (
                <Button onClick={handleBatchRetry} disabled={isLoading}>
                  Batch Retry ({selectedTransactions.length})
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {failedTransactions.map((transaction) => (
              <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <input
                    type="checkbox"
                    checked={selectedTransactions.includes(transaction.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedTransactions([...selectedTransactions, transaction.id]);
                      } else {
                        setSelectedTransactions(selectedTransactions.filter(id => id !== transaction.id));
                      }
                    }}
                  />
                  <div>
                    <p className="font-medium">#{transaction.receipt_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(transaction.created_at).toLocaleString()} • ₱{transaction.total}
                    </p>
                    {transaction.error_details && (
                      <p className="text-sm text-destructive">{transaction.error_details}</p>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusBadge(transaction.sync_status)}
                  <Button 
                    size="sm" 
                    onClick={() => handleManualRetry(transaction.id)}
                    disabled={isLoading}
                  >
                    Retry
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => handleReconciliation(transaction.id)}
                    disabled={isLoading}
                  >
                    Reconcile
                  </Button>
                </div>
              </div>
            ))}
            
            {failedTransactions.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No failed transactions found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Retry Jobs */}
      <Card>
        <CardHeader>
          <CardTitle>Active Retry Jobs</CardTitle>
          <CardDescription>Automated retry jobs in progress</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {retryJobs.slice(0, 10).map((job) => (
              <div key={job.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <p className="font-medium">Transaction: {job.transactionId}</p>
                  <p className="text-sm text-muted-foreground">
                    Items: {job.items.length} • Attempt: {job.attempts}/{job.maxAttempts}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Created: {job.createdAt.toLocaleString()}
                  </p>
                  {job.errorDetails && (
                    <p className="text-sm text-destructive">{job.errorDetails}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  {getStatusBadge(job.status)}
                </div>
              </div>
            ))}
            
            {retryJobs.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No active retry jobs
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};