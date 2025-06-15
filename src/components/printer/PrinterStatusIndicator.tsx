
import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Printer } from 'lucide-react';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';

export function PrinterStatusIndicator() {
  const { isAvailable, isConnected, connectedPrinter } = useThermalPrinter();

  if (!isAvailable) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <Printer className="h-4 w-4" />
      <Badge 
        variant={isConnected ? "default" : "secondary"}
        className={isConnected ? "bg-green-500" : "bg-gray-500"}
      >
        {isConnected ? `Connected: ${connectedPrinter?.name}` : 'Not Connected'}
      </Badge>
    </div>
  );
}
