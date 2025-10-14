
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Printer, Bluetooth, AlertCircle, RefreshCw } from 'lucide-react';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';
import { useBluetoothReconnection } from '@/hooks/useBluetoothReconnection';

export function PrinterStatusIndicator() {
  const { isAvailable, isConnected, connectedPrinter, isPrinting } = useThermalPrinter();
  const { isReconnecting, reconnectFailed } = useBluetoothReconnection();

  if (!isAvailable) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-muted-foreground" />
        <Badge variant="secondary">
          Bluetooth N/A
        </Badge>
      </div>
    );
  }

  const getStatusColor = () => {
    if (isPrinting) return "bg-orange-500 animate-pulse";
    if (isReconnecting) return "bg-yellow-500 animate-pulse";
    if (reconnectFailed) return "bg-red-500";
    if (isConnected) return "bg-green-500";
    return "bg-muted";
  };

  const getStatusText = () => {
    if (isPrinting) return 'Printing...';
    if (isReconnecting) return 'Reconnecting...';
    if (reconnectFailed) return 'Reconnect Failed';
    if (isConnected) return connectedPrinter?.name || 'Connected';
    return 'No Printer';
  };

  const getStatusIcon = () => {
    if (isReconnecting) {
      return <RefreshCw className="h-4 w-4 text-yellow-500 animate-spin" />;
    }
    if (reconnectFailed) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    return <Bluetooth className={`h-4 w-4 ${isConnected ? 'text-blue-500' : 'text-muted-foreground'}`} />;
  };

  return (
    <div className="flex items-center gap-2">
      {getStatusIcon()}
      <Badge
        variant={isConnected ? "default" : "secondary"}
        className={getStatusColor()}
      >
        {getStatusText()}
      </Badge>
    </div>
  );
}
