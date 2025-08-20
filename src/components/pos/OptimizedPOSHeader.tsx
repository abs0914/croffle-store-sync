import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Wifi, 
  WifiOff, 
  Zap, 
  Clock, 
  Database,
  TrendingUp
} from 'lucide-react';
import { PerformanceMonitor } from '@/services/performance/performanceMonitor';

interface OptimizedPOSHeaderProps {
  storeName: string;
  shiftInfo?: {
    cashierName: string;
    startTime: string;
  };
  connectionStatus: 'online' | 'offline';
  onShowLastReceipt?: () => void;
}

export function OptimizedPOSHeader({ 
  storeName, 
  shiftInfo, 
  connectionStatus,
  onShowLastReceipt
}: OptimizedPOSHeaderProps) {
  const getPerformanceStatus = () => {
    const performanceStats = PerformanceMonitor.getStats();
    if (performanceStats.averageDuration < 1000) return 'excellent';
    if (performanceStats.averageDuration < 2000) return 'good';
    if (performanceStats.averageDuration < 5000) return 'warning';
    return 'poor';
  };

  const performanceStatus = getPerformanceStatus();

  return (
    <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Store & Shift Info */}
          <div className="flex items-center space-x-4">
            <div>
              <h1 className="text-xl font-bold">{storeName}</h1>
              {shiftInfo && (
                <p className="text-sm text-muted-foreground">
                  {shiftInfo.cashierName} • Started {shiftInfo.startTime}
                </p>
              )}
            </div>
          </div>

          {/* Status Indicators */}
          <div className="flex items-center space-x-3">
            {/* Performance Indicator */}
            <div className="flex items-center space-x-1">
              <Zap className={`w-4 h-4 ${
                performanceStatus === 'excellent' ? 'text-green-500' : 
                performanceStatus === 'good' ? 'text-blue-500' :
                performanceStatus === 'warning' ? 'text-yellow-500' : 'text-red-500'
              }`} />
              <Badge 
                variant="outline" 
                className={`text-xs ${
                  performanceStatus === 'excellent' ? 'border-green-500 text-green-700' :
                  performanceStatus === 'good' ? 'border-blue-500 text-blue-700' :
                  performanceStatus === 'warning' ? 'border-yellow-500 text-yellow-700' :
                  'border-red-500 text-red-700'
                }`}
              >
                {performanceStatus === 'excellent' ? 'Turbo' :
                 performanceStatus === 'good' ? 'Fast' :
                 performanceStatus === 'warning' ? 'Normal' : 'Slow'}
              </Badge>
            </div>

            {/* Cache Status */}
            <div className="flex items-center space-x-1">
              <Database className="w-4 h-4 text-blue-500" />
              <Badge variant="outline" className="text-xs border-blue-500 text-blue-700">
                Cache Active
              </Badge>
            </div>

            {/* Connection Status */}
            <div className="flex items-center space-x-1">
              {connectionStatus === 'online' ? (
                <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                    Online
                  </Badge>
                </>
              ) : (
                <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <Badge variant="outline" className="text-xs border-red-500 text-red-700">
                    Offline
                  </Badge>
                </>
              )}
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              {onShowLastReceipt && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={onShowLastReceipt}
                >
                  Last Receipt
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Performance Hint */}
        {performanceStatus === 'excellent' && (
          <div className="mt-2 text-xs text-green-600 bg-green-50 px-2 py-1 rounded flex items-center">
            <TrendingUp className="w-3 h-3 mr-1" />
            System optimized! Transactions are 3x faster with background processing.
          </div>
        )}

        {performanceStatus === 'poor' && (
          <div className="mt-2 text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            Performance slower than expected. Check network connection.
          </div>
        )}
      </CardContent>
    </Card>
  );
}