/**
 * OFFLINE STATUS BANNER
 * 
 * Enhanced connectivity indicator that shows offline status, sync progress, and cache age.
 * Displays prominently when offline or syncing.
 */

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Wifi, 
  WifiOff, 
  Cloud, 
  CloudOff, 
  RefreshCw, 
  AlertTriangle,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OfflineStatusBannerProps {
  isOnline: boolean;
  isSyncing: boolean;
  pendingSync: number;
  cacheAge: number | null; // in minutes
  onSync: () => void;
  className?: string;
}

export function OfflineStatusBanner({
  isOnline,
  isSyncing,
  pendingSync,
  cacheAge,
  onSync,
  className
}: OfflineStatusBannerProps) {
  const { justReconnected } = useNetworkStatus();

  // Don't show if online and nothing pending
  if (isOnline && !isSyncing && pendingSync === 0 && !justReconnected) {
    return null;
  }

  const getCacheStatus = () => {
    if (!cacheAge) return { color: 'text-muted-foreground', text: 'No cache' };
    if (cacheAge < 60) return { color: 'text-green-600', text: 'Fresh cache' };
    if (cacheAge < 360) return { color: 'text-yellow-600', text: 'Cache OK' };
    return { color: 'text-red-600', text: 'Stale cache' };
  };

  const cacheStatus = getCacheStatus();

  return (
    <Alert 
      className={cn(
        'border-2 transition-all duration-300',
        !isOnline && 'border-orange-500 bg-orange-50 dark:bg-orange-950',
        isOnline && pendingSync > 0 && 'border-blue-500 bg-blue-50 dark:bg-blue-950',
        isSyncing && 'border-purple-500 bg-purple-50 dark:bg-purple-950',
        className
      )}
    >
      <div className="flex items-center gap-3">
        {/* Status Icon */}
        {!isOnline ? (
          <WifiOff className="h-5 w-5 text-orange-600" />
        ) : isSyncing ? (
          <RefreshCw className="h-5 w-5 text-purple-600 animate-spin" />
        ) : pendingSync > 0 ? (
          <CloudOff className="h-5 w-5 text-blue-600" />
        ) : (
          <CheckCircle2 className="h-5 w-5 text-green-600" />
        )}

        {/* Status Message */}
        <div className="flex-1">
          <AlertDescription className="space-y-1">
            <div className="font-semibold">
              {!isOnline && '📴 Offline Mode'}
              {isOnline && isSyncing && '🔄 Syncing...'}
              {isOnline && !isSyncing && pendingSync > 0 && '☁️ Ready to Sync'}
              {isOnline && !isSyncing && pendingSync === 0 && justReconnected && '✅ Back Online'}
            </div>
            
            <div className="text-sm text-muted-foreground">
              {!isOnline && (
                <span>
                  Transactions saved locally • Will sync when connection restored
                </span>
              )}
              {isOnline && isSyncing && (
                <span>Uploading pending transactions to server...</span>
              )}
              {isOnline && !isSyncing && pendingSync > 0 && (
                <span>{pendingSync} transaction(s) pending sync</span>
              )}
              {isOnline && !isSyncing && pendingSync === 0 && justReconnected && (
                <span>All transactions synced successfully</span>
              )}
            </div>
          </AlertDescription>
        </div>

        {/* Status Badges */}
        <div className="flex items-center gap-2">
          {/* Connection Status */}
          <Badge variant={isOnline ? 'default' : 'destructive'} className="gap-1">
            {isOnline ? (
              <>
                <Wifi className="h-3 w-3" />
                Online
              </>
            ) : (
              <>
                <WifiOff className="h-3 w-3" />
                Offline
              </>
            )}
          </Badge>

          {/* Pending Count */}
          {pendingSync > 0 && (
            <Badge variant="secondary" className="gap-1">
              <Cloud className="h-3 w-3" />
              {pendingSync} pending
            </Badge>
          )}

          {/* Cache Age */}
          {!isOnline && cacheAge !== null && (
            <Badge 
              variant={cacheAge > 360 ? 'destructive' : 'outline'} 
              className="gap-1"
            >
              <Clock className="h-3 w-3" />
              <span className={cacheStatus.color}>
                {cacheAge < 60 ? `${cacheAge}m` : `${Math.floor(cacheAge / 60)}h`}
              </span>
            </Badge>
          )}

          {/* Cache Warning */}
          {!isOnline && (!cacheAge || cacheAge > 360) && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              Stale data
            </Badge>
          )}

          {/* Sync Button */}
          {isOnline && pendingSync > 0 && !isSyncing && (
            <Button
              size="sm"
              variant="outline"
              onClick={onSync}
              className="h-7"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Sync Now
            </Button>
          )}
        </div>
      </div>
    </Alert>
  );
}
