import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Wifi, WifiOff, Clock, RotateCcw, AlertTriangle, Database } from "lucide-react";
import { useOfflineMode } from "@/hooks/useOfflineMode";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

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

  const getCacheStatusText = (): string => {
    if (!cacheAge) return 'No cache';
    if (cacheAge < 60) return 'Fresh';
    if (cacheAge < 360) return 'Good';
    return 'Stale';
  };

  const shouldShowDataWarning = !isOnline && (cacheAge === null || cacheAge > 360);

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

      {/* Offline Capability with enhanced status */}
      {!isOnline && (
        <Badge 
          variant={isOfflineCapable ? "secondary" : "destructive"}
          className="flex items-center gap-1"
        >
          <Database className="h-3 w-3" />
          {isOfflineCapable ? getCacheStatusText() : 'No Cache'}
        </Badge>
      )}

      {/* Enhanced Pending Transactions */}
      {pendingTransactions > 0 && (
        <Badge 
          variant={pendingTransactions > 10 ? "destructive" : "outline"} 
          className="flex items-center gap-1"
        >
          <Clock className="h-3 w-3" />
          {pendingTransactions} pending
        </Badge>
      )}

      {/* Cache Age with warning colors */}
      {!isOnline && cacheAge !== null && (
        <Badge 
          variant={cacheAge > 360 ? "destructive" : cacheAge > 60 ? "secondary" : "outline"} 
          className="flex items-center gap-1"
        >
          <AlertTriangle className="h-3 w-3" />
          <span className="text-xs">
            {cacheAge < 60 ? `${cacheAge}m` : `${Math.floor(cacheAge / 60)}h`}
          </span>
        </Badge>
      )}

      {/* Data Accuracy Warning */}
      {shouldShowDataWarning && (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          <span className="text-xs">Data may be outdated</span>
        </Badge>
      )}

      {/* Enhanced Sync Button */}
      {isOnline && pendingTransactions > 0 && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing}
          className="h-6 px-2 text-xs"
        >
          <RotateCcw className={cn("h-3 w-3 mr-1", isSyncing && "animate-spin")} />
          {isSyncing ? 'Syncing...' : `Sync ${pendingTransactions}`}
        </Button>
      )}

      {/* Offline Mode Notice */}
      {!isOnline && isOfflineCapable && (
        <span className="text-xs text-muted-foreground">
          Operating offline - transactions will sync when online
        </span>
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