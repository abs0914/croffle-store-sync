/**
 * Offline Queue Manager Component
 * UI for reviewing and approving queued offline transactions
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Loader2 
} from 'lucide-react';
import { OfflineQueueService, QueuedTransaction } from '@/services/inventory/offlineQueueService';
import { useAuth } from '@/contexts/auth';
import { toast } from 'sonner';

interface OfflineQueueManagerProps {
  storeId: string;
}

export const OfflineQueueManager: React.FC<OfflineQueueManagerProps> = ({ storeId }) => {
  const { user } = useAuth();
  const [queuedTransactions, setQueuedTransactions] = useState<QueuedTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadQueue = async () => {
    setLoading(true);
    try {
      const transactions = await OfflineQueueService.getPendingTransactions(storeId);
      setQueuedTransactions(transactions);
    } catch (error) {
      console.error('Failed to load queue:', error);
      toast.error('Failed to load queued transactions');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncAll = async () => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setSyncing(true);
    try {
      await OfflineQueueService.syncAllPending(storeId, user.id);
      await loadQueue(); // Reload to show updated status
    } catch (error) {
      console.error('Sync failed:', error);
      toast.error('Failed to sync transactions');
    } finally {
      setSyncing(false);
    }
  };

  const handleApprove = async (queued: QueuedTransaction) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setProcessingId(queued.id);
    try {
      const result = await OfflineQueueService.approveTransaction(
        queued.id,
        queued.transaction_data,
        queued.store_id,
        user.id
      );

      if (result.success) {
        await loadQueue();
      } else {
        toast.error(result.error || 'Failed to approve transaction');
      }
    } catch (error) {
      console.error('Approval failed:', error);
      toast.error('Failed to approve transaction');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (queued: QueuedTransaction) => {
    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setProcessingId(queued.id);
    try {
      await OfflineQueueService.rejectTransaction(queued.id, user.id);
      await loadQueue();
    } catch (error) {
      console.error('Rejection failed:', error);
      toast.error('Failed to reject transaction');
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    loadQueue();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadQueue, 30000);
    return () => clearInterval(interval);
  }, [storeId]);

  const pendingCount = queuedTransactions.filter(t => t.status === 'pending').length;
  const insufficientCount = queuedTransactions.filter(t => t.status === 'insufficient_stock').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Offline Transaction Queue
            </CardTitle>
            <CardDescription>
              Review and approve queued offline transactions
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadQueue}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {pendingCount > 0 && (
              <Button
                size="sm"
                onClick={handleSyncAll}
                disabled={syncing}
              >
                <RefreshCw className={`h-4 w-4 mr-1 ${syncing ? 'animate-spin' : ''}`} />
                Sync All ({pendingCount})
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 gap-4">
          <Card className="border-blue-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">{pendingCount}</div>
              <div className="text-sm text-blue-600">Pending Sync</div>
            </CardContent>
          </Card>
          <Card className="border-yellow-200">
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-yellow-600">{insufficientCount}</div>
              <div className="text-sm text-yellow-600">Need Approval</div>
            </CardContent>
          </Card>
        </div>

        {/* Queue Items */}
        {loading && queuedTransactions.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Loading queue...</span>
          </div>
        ) : queuedTransactions.length === 0 ? (
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              No queued transactions. All transactions have been processed.
            </AlertDescription>
          </Alert>
        ) : (
          <div className="space-y-3">
            {queuedTransactions.map((queued) => (
              <Card 
                key={queued.id} 
                className={`border-l-4 ${
                  queued.status === 'pending' ? 'border-l-blue-500' : 'border-l-yellow-500'
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Transaction Info */}
                      <div className="flex items-center gap-2">
                        <Badge variant={queued.status === 'pending' ? 'secondary' : 'destructive'}>
                          {queued.status === 'pending' ? 'Pending Sync' : 'Insufficient Stock'}
                        </Badge>
                        <span className="text-sm font-mono">
                          {queued.transaction_data?.transaction_id?.slice(0, 8) || 'N/A'}...
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(queued.created_at || '').toLocaleString()}
                        </span>
                      </div>

                      {/* Items */}
                      <div className="text-sm">
                        <strong>Items ({queued.transaction_data?.items?.length || 0}):</strong>
                        <ul className="list-disc list-inside ml-2 text-muted-foreground">
                          {(queued.transaction_data?.items || []).slice(0, 3).map((item: any, idx: number) => (
                            <li key={idx}>
                              {item.productName} (×{item.quantity})
                            </li>
                          ))}
                          {(queued.transaction_data?.items?.length || 0) > 3 && (
                            <li className="text-xs">
                              +{(queued.transaction_data?.items?.length || 0) - 3} more items
                            </li>
                          )}
                        </ul>
                      </div>

                      {/* Stock Validation Errors */}
                      {queued.stock_validation_errors && (
                        <Alert variant="destructive" className="py-2">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription className="text-xs">
                            <strong>Stock errors:</strong>{' '}
                            {Array.isArray(queued.stock_validation_errors.errors) 
                              ? queued.stock_validation_errors.errors.join(', ')
                              : 'Validation failed'}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Notes */}
                      {queued.notes && (
                        <div className="text-xs text-muted-foreground">
                          Note: {queued.notes}
                        </div>
                      )}

                      {/* Processed Info */}
                      {queued.processed_at && (
                        <div className="text-xs text-muted-foreground">
                          Processed: {new Date(queued.processed_at).toLocaleString()}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      {queued.status === 'insufficient_stock' ? (
                        <>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleApprove(queued)}
                            disabled={processingId === queued.id}
                          >
                            {processingId === queued.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-1" />
                            )}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleReject(queued)}
                            disabled={processingId === queued.id}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReject(queued)}
                          disabled={processingId === queued.id}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Cancel
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
