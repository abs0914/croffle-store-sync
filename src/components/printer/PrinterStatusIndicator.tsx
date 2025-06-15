
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Printer, Bluetooth, AlertCircle } from 'lucide-react';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';

export function PrinterStatusIndicator() {
  const { isAvailable, isConnected, connectedPrinter, isPrinting } = useThermalPrinter();

  if (!isAvailable) {
    return (
      <div className="flex items-center gap-2">
        <AlertCircle className="h-4 w-4 text-gray-400" />
        <Badge variant="secondary" className="bg-gray-100 text-gray-600">
          Bluetooth N/A
        </Badge>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Bluetooth className={`h-4 w-4 ${isConnected ? 'text-blue-500' : 'text-gray-400'}`} />
      <Badge
        variant={isConnected ? "default" : "secondary"}
        className={
          isPrinting
            ? "bg-orange-500 animate-pulse"
            : isConnected
              ? "bg-green-500"
              : "bg-gray-500"
        }
      >
        {isPrinting
          ? 'Printing...'
          : isConnected
            ? `${connectedPrinter?.name || 'Connected'}`
            : 'No Printer'
        }
      </Badge>
    </div>
  );
}
