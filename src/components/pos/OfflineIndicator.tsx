import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Clock, RotateCcw, AlertTriangle } from "lucide-react";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { cn } from "@/lib/utils";

interface OfflineIndicatorProps {
  storeId: string | null;
  className?: string;
}

export function OfflineIndicator({ storeId, className }: OfflineIndicatorProps) {
  const {
    isOnline,
    isOfflineCapable,
    pendingTransactions,
    lastSyncTime,
    isSyncing,
    cacheAge,
    triggerSync
  } = useOfflineMode(storeId);

  const handleSync = async () => {
    if (!isOnline) return;
    await triggerSync();
  };

  const formatLastSync = (timestamp: number | null): string => {
    if (!timestamp) return 'Never';
    
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  const getCacheStatusColor = (): string => {
    if (!cacheAge) return 'text-muted-foreground';
    if (cacheAge < 60) return 'text-green-600'; // Fresh (< 1 hour)
    if (cacheAge < 360) return 'text-yellow-600'; // Moderate (< 6 hours)
    return 'text-red-600'; // Stale (> 6 hours)
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* Connection Status */}
      <Badge 
        variant={isOnline ? "default" : "destructive"}
        className="flex items-center gap-1"
      >
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

      {/* Offline Capability */}
      {!isOnline && (
        <Badge 
          variant={isOfflineCapable ? "secondary" : "outline"}
          className="flex items-center gap-1"
        >
          {isOfflineCapable ? (
            <>
              ✓ Ready
            </>
          ) : (
            <>
              <AlertTriangle className="h-3 w-3" />
              No Cache
            </>
          )}
        </Badge>
      )}

      {/* Pending Transactions */}
      {pendingTransactions > 0 && (
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {pendingTransactions} pending
        </Badge>
      )}

      {/* Cache Age (when offline) */}
      {!isOnline && cacheAge !== null && (
        <Badge variant="outline" className="flex items-center gap-1">
          <span className={cn("text-xs", getCacheStatusColor())}>
            Cache: {cacheAge < 60 ? `${cacheAge}m` : `${Math.floor(cacheAge / 60)}h`} old
          </span>
        </Badge>
      )}

      {/* Sync Button */}
      {isOnline && pendingTransactions > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing}
          className="h-6 px-2 text-xs"
        >
          <RotateCcw className={cn("h-3 w-3 mr-1", isSyncing && "animate-spin")} />
          {isSyncing ? 'Syncing...' : 'Sync'}
        </Button>
      )}

      {/* Last Sync Info */}
      {isOnline && lastSyncTime && (
        <span className="text-xs text-muted-foreground">
          Last sync: {formatLastSync(lastSyncTime)}
        </span>
      )}
    </div>
  );
}