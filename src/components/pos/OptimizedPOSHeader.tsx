import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, Menu, RefreshCw, RotateCcw } from 'lucide-react';
import { PrinterStatusIndicator } from '@/components/printer/PrinterStatusIndicator';
import { useSidebar } from '@/components/ui/sidebar';
interface OptimizedPOSHeaderProps {
  storeName: string;
  shiftInfo?: {
    cashierName: string;
    startTime: string;
  };
  connectionStatus: 'online' | 'offline';
  onShowLastReceipt?: () => void;
  onRefreshProducts?: () => void;
}
export function OptimizedPOSHeader({
  storeName,
  shiftInfo,
  connectionStatus,
  onShowLastReceipt,
  onRefreshProducts
}: OptimizedPOSHeaderProps) {
  const {
    toggleSidebar
  } = useSidebar();
  return <Card className="mb-4">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          {/* Sidebar Toggle & Store Info */}
          <div className="flex items-center space-x-4">
            {/* Sidebar Toggle */}
            <Button variant="ghost" size="sm" onClick={toggleSidebar} className="mr-3">
              <Menu className="h-4 w-4" />
            </Button>
            
            <div>
              
              {shiftInfo && <p className="text-sm text-muted-foreground">
                  {shiftInfo.cashierName} • Started {shiftInfo.startTime}
                </p>}
            </div>
          </div>

          {/* Status & Actions */}
          <div className="flex items-center space-x-3">
            {/* Connection Status */}
            <div className="flex items-center space-x-1">
              {connectionStatus === 'online' ? <>
                  <Wifi className="w-4 h-4 text-green-500" />
                  <Badge variant="outline" className="text-xs border-green-500 text-green-700">
                    Online
                  </Badge>
                </> : <>
                  <WifiOff className="w-4 h-4 text-red-500" />
                  <Badge variant="outline" className="text-xs border-red-500 text-red-700">
                    Offline
                  </Badge>
                </>}
            </div>

            {/* Printer Status */}
            <PrinterStatusIndicator />

            {/* Refresh Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={onRefreshProducts}
              className="flex items-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>

      </CardContent>
    </Card>;
}