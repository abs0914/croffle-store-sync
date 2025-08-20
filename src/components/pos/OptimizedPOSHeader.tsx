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

          {/* Actions */}
          <div className="flex items-center space-x-2">
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