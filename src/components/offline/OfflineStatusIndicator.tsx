/**
 * OFFLINE STATUS INDICATOR COMPONENT
 * 
 * Enhanced status display for offline POS system:
 * - Real-time network quality indicator
 * - Transaction queue status
 * - Sync progress and conflicts
 * - Printer connection status
 * - Storage usage metrics
 * - Interactive controls for manual sync
 */

import React, { useState } from 'react';
import { 
  Wifi, 
  WifiOff, 
  Database, 
  Sync, 
  Printer, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  HardDrive,
  Activity,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Separator } from '../ui/separator';
import { useOfflineMode } from '../../hooks/useOfflineMode';
import { toast } from 'sonner';

interface OfflineStatusIndicatorProps {
  storeId?: string;
  compact?: boolean;
  showControls?: boolean;
}

export function OfflineStatusIndicator({ 
  storeId, 
  compact = false, 
  showControls = true 
}: OfflineStatusIndicatorProps) {
  const { offlineStatus, triggerSync } = useOfflineMode(storeId);
  const [isSyncing, setIsSyncing] = useState(false);

  const handleManualSync = async () => {
    if (!offlineStatus.isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    setIsSyncing(true);
    try {
      await triggerSync();
      toast.success('Sync completed successfully');
    } catch (error) {
      toast.error('Sync failed');
      console.error('Manual sync failed:', error);
    } finally {
      setIsSyncing(false);
    }
  };

  const getNetworkQualityColor = (quality?: string) => {
    switch (quality) {
      case 'excellent': return 'text-green-600';
      case 'good': return 'text-blue-600';
      case 'fair': return 'text-yellow-600';
      case 'poor': return 'text-orange-600';
      case 'offline': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getNetworkQualityBadge = (quality?: string) => {
    switch (quality) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'fair': return 'bg-yellow-100 text-yellow-800';
      case 'poor': return 'bg-orange-100 text-orange-800';
      case 'offline': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatLastSync = (timestamp?: number) => {
    if (!timestamp) return 'Never';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  if (compact) {
    return (
      <div className="flex items-center space-x-2">
        {/* Network Status */}
        <div className="flex items-center space-x-1">
          {offlineStatus.isOnline ? (
            <Wifi className={`h-4 w-4 ${getNetworkQualityColor(offlineStatus.networkQuality)}`} />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600" />
          )}
          {offlineStatus.networkQuality && (
            <Badge variant="outline" className={getNetworkQualityBadge(offlineStatus.networkQuality)}>
              {offlineStatus.networkQuality}
            </Badge>
          )}
        </div>

        {/* Transaction Queue */}
        {offlineStatus.pendingTransactions > 0 && (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            <Database className="h-3 w-3 mr-1" />
            {offlineStatus.pendingTransactions}
          </Badge>
        )}

        {/* Sync Status */}
        {offlineStatus.isSyncing && (
          <Badge variant="outline" className="bg-blue-100 text-blue-800">
            <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        )}

        {/* Conflicts */}
        {(offlineStatus.activeConflicts || 0) > 0 && (
          <Badge variant="outline" className="bg-red-100 text-red-800">
            <AlertTriangle className="h-3 w-3 mr-1" />
            {offlineStatus.activeConflicts}
          </Badge>
        )}

        {/* Printer Status */}
        {offlineStatus.printerConnected !== undefined && (
          <div className="flex items-center">
            <Printer className={`h-4 w-4 ${offlineStatus.printerConnected ? 'text-green-600' : 'text-gray-400'}`} />
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="h-5 w-5" />
            <span>Offline POS Status</span>
          </div>
          {showControls && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualSync}
              disabled={!offlineStatus.isOnline || isSyncing}
            >
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Sync className="h-4 w-4 mr-2" />
              )}
              Sync Now
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Network Status */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {offlineStatus.isOnline ? (
              <Wifi className={`h-5 w-5 ${getNetworkQualityColor(offlineStatus.networkQuality)}`} />
            ) : (
              <WifiOff className="h-5 w-5 text-red-600" />
            )}
            <span className="font-medium">
              {offlineStatus.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>
          {offlineStatus.networkQuality && (
            <Badge className={getNetworkQualityBadge(offlineStatus.networkQuality)}>
              {offlineStatus.networkQuality.toUpperCase()}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Transaction Queue Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Database className="h-4 w-4" />
              <span className="text-sm font-medium">Transaction Queue</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Pending:</span>
              <span className="font-medium">{offlineStatus.pendingTransactions}</span>
            </div>
            {offlineStatus.failedTransactions !== undefined && (
              <div className="flex justify-between">
                <span className="text-gray-600">Failed:</span>
                <span className="font-medium text-red-600">{offlineStatus.failedTransactions}</span>
              </div>
            )}
          </div>
        </div>

        {/* Sync Status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {offlineStatus.isSyncing ? (
                <RefreshCw className="h-4 w-4 animate-spin text-blue-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <span className="text-sm font-medium">
                {offlineStatus.isSyncing ? 'Syncing...' : 'Sync Status'}
              </span>
            </div>
          </div>
          
          <div className="text-sm text-gray-600">
            <div className="flex justify-between">
              <span>Last sync:</span>
              <span>{formatLastSync(offlineStatus.lastSyncTime || undefined)}</span>
            </div>
          </div>
        </div>

        {/* Conflicts */}
        {(offlineStatus.activeConflicts || 0) > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm font-medium text-red-600">Conflicts</span>
              </div>
              <Badge variant="destructive">
                {offlineStatus.activeConflicts}
              </Badge>
            </div>
          </>
        )}

        {/* Printer Status */}
        {offlineStatus.printerConnected !== undefined && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Printer className={`h-4 w-4 ${offlineStatus.printerConnected ? 'text-green-600' : 'text-gray-400'}`} />
                <span className="text-sm font-medium">Printer</span>
              </div>
              <Badge variant={offlineStatus.printerConnected ? "default" : "secondary"}>
                {offlineStatus.printerConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>
          </>
        )}

        {/* Enhanced Status Details */}
        {offlineStatus.enhancedStatus && (
          <>
            <Separator />
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <HardDrive className="h-4 w-4" />
                <span className="text-sm font-medium">System Status</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Storage:</span>
                    <span>{offlineStatus.enhancedStatus.storageType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Usage:</span>
                    <span>{Math.round(offlineStatus.enhancedStatus.storageUsage / 1024)}KB</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Success Rate:</span>
                    <span>{Math.round(offlineStatus.enhancedStatus.successRate)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg Sync:</span>
                    <span>{Math.round(offlineStatus.enhancedStatus.averageSyncTime / 1000)}s</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Offline Capabilities */}
        {!offlineStatus.isOnline && (
          <>
            <Separator />
            <div className="bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Offline Mode Active</span>
              </div>
              <div className="text-xs text-blue-700 space-y-1">
                <div>✓ Transactions will be queued for sync</div>
                <div>✓ Bluetooth printing available</div>
                <div>✓ Cached product data accessible</div>
                {offlineStatus.hasCachedData && (
                  <div>✓ {offlineStatus.cacheAge ? `Cache age: ${Math.round(offlineStatus.cacheAge)}min` : 'Fresh cache available'}</div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
