import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Trash2,
  Database,
  Wifi,
  WifiOff
} from 'lucide-react';
import { useOfflineMode } from '@/hooks/useOfflineMode';
import { offlineSyncService } from '@/services/offline/offlineSyncService';
import { offlineTransactionQueue } from '@/services/offline/offlineTransactionQueue';
import { offlineProductCache } from '@/services/offline/offlineProductCache';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface OfflineManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  storeId: string | null;
}

export function OfflineManagementDialog({
  open,
  onOpenChange,
  storeId
}: OfflineManagementDialogProps) {
  const {
    isOnline,
    isOfflineCapable,
    pendingTransactions,
    isSyncing,
    cacheAge,
    triggerSync
  } = useOfflineMode(storeId);

  const [isRetrying, setIsRetrying] = React.useState(false);
  const [syncStats, setSyncStats] = React.useState<any>(null);

  React.useEffect(() => {
    if (open && storeId) {
      // Load sync stats
      const stats = offlineSyncService.getSyncStats();
      setSyncStats(stats);
    }
  }, [open, storeId]);

  const handleForceSync = async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }
    
    await triggerSync();
    
    // Refresh stats
    const stats = offlineSyncService.getSyncStats();
    setSyncStats(stats);
  };

  const handleRetryFailed = async () => {
    if (!isOnline) {
      toast.error('Cannot retry while offline');
      return;
    }

    setIsRetrying(true);
    try {
      await offlineSyncService.retryFailedTransactions();
      toast.success('Retry initiated for failed transactions');
      
      // Refresh stats
      setTimeout(() => {
        const stats = offlineSyncService.getSyncStats();
        setSyncStats(stats);
        setIsRetrying(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to retry transactions');
      setIsRetrying(false);
    }
  };

  const handleClearCache = () => {
    if (!storeId) return;
    
    offlineProductCache.clearCache(storeId);
    toast.success('Offline cache cleared');
    onOpenChange(false);
  };

  const handleResetReceiptCounter = () => {
    offlineTransactionQueue.resetReceiptCounter();
    toast.success('Receipt counter reset');
  };

  const getCacheStatus = () => {
    if (!storeId) return null;
    return offlineProductCache.getCacheStatus(storeId);
  };

  const cacheStatus = getCacheStatus();
  const failedTransactions = offlineSyncService.getFailedTransactions();

  const formatAge = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ${minutes % 60}m`;
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Offline Mode Management
          </DialogTitle>
          <DialogDescription>
            Manage offline transactions, cache, and synchronization
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            {/* Connection Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                  {isOnline ? (
                    <><Wifi className="h-4 w-4" /> Connection Status</>
                  ) : (
                    <><WifiOff className="h-4 w-4" /> Connection Status</>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge variant={isOnline ? 'default' : 'destructive'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Badge>
                  {!isOnline && (
                    <Badge variant={isOfflineCapable ? 'secondary' : 'destructive'}>
                      {isOfflineCapable ? 'Offline Ready' : 'No Offline Data'}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Sync Statistics */}
            {syncStats && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Sync Statistics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex justify-between">
                      <span>Pending:</span>
                      <Badge variant="outline">{syncStats.pendingTransactions}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Failed:</span>
                      <Badge variant={syncStats.failedTransactions > 0 ? 'destructive' : 'outline'}>
                        {syncStats.failedTransactions}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Synced:</span>
                      <Badge variant="secondary">{syncStats.syncedTransactions}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Total:</span>
                      <Badge variant="outline">{syncStats.totalTransactions}</Badge>
                    </div>
                  </div>
                  
                  {syncStats.oldestPendingAge && (
                    <div className="mt-3 text-xs text-muted-foreground">
                      Oldest pending: {formatAge(Math.floor(syncStats.oldestPendingAge / (1000 * 60)))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Cache Information */}
            {cacheStatus && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">Cache Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Status:</span>
                      <Badge variant={cacheStatus.isFresh ? 'default' : cacheStatus.isStale ? 'destructive' : 'secondary'}>
                        {cacheStatus.isFresh ? 'Fresh' : cacheStatus.isStale ? 'Stale' : 'Good'}
                      </Badge>
                    </div>
                    
                    {cacheStatus.ageMinutes !== null && (
                      <div className="flex justify-between text-sm">
                        <span>Age:</span>
                        <span>{formatAge(cacheStatus.ageMinutes)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between text-sm">
                      <span>Products:</span>
                      <span>{cacheStatus.totalProducts}</span>
                    </div>
                    
                    {(cacheStatus.lowStockCount > 0 || cacheStatus.criticalStockCount > 0) && (
                      <div className="space-y-1">
                        {cacheStatus.criticalStockCount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Critical stock:</span>
                            <Badge variant="destructive" className="text-xs">
                              {cacheStatus.criticalStockCount} items
                            </Badge>
                          </div>
                        )}
                        {cacheStatus.lowStockCount > 0 && (
                          <div className="flex justify-between text-sm">
                            <span>Low stock:</span>
                            <Badge variant="secondary" className="text-xs">
                              {cacheStatus.lowStockCount} items
                            </Badge>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Failed Transactions */}
            {failedTransactions.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-red-600">Failed Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {failedTransactions.slice(0, 5).map((transaction) => (
                      <div key={transaction.id} className="flex items-center justify-between text-sm p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <span className="font-mono">{transaction.id}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {transaction.syncAttempts} attempts
                          </span>
                          {transaction.lastSyncAttempt && (
                            <span className="text-xs text-muted-foreground">
                              {formatAge(Math.floor((Date.now() - transaction.lastSyncAttempt) / (1000 * 60)))} ago
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {failedTransactions.length > 5 && (
                      <div className="text-xs text-muted-foreground text-center">
                        ... and {failedTransactions.length - 5} more
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Actions */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleForceSync}
                    disabled={!isOnline || isSyncing}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
                    Force Sync
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleRetryFailed}
                    disabled={!isOnline || isRetrying || failedTransactions.length === 0}
                    className="flex items-center gap-2"
                  >
                    <Clock className={cn('h-4 w-4', isRetrying && 'animate-spin')} />
                    Retry Failed
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleClearCache}
                    className="flex items-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear Cache
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResetReceiptCounter}
                    className="flex items-center gap-2"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Reset Counter
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Next Receipt Number */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Next Receipt Number</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <code className="text-lg font-bold">
                    {offlineTransactionQueue.getNextReceiptNumber()}
                  </code>
                </div>
              </CardContent>
            </Card>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}