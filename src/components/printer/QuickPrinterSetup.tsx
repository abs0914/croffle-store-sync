import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Bluetooth, Search, Printer, CheckCircle, AlertCircle } from 'lucide-react';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';

interface QuickPrinterSetupProps {
  children: React.ReactNode;
}

export function QuickPrinterSetup({ children }: QuickPrinterSetupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    isAvailable,
    isConnected,
    availablePrinters,
    isScanning,
    isPrinting,
    connectedPrinter,
    scanForPrinters,
    connectToPrinter,
    disconnectPrinter,
    printTestReceipt
  } = useThermalPrinter();

  if (!isAvailable) {
    return (
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bluetooth className="h-5 w-5" />
              Bluetooth Printer Setup
            </DialogTitle>
            <DialogDescription>
              Bluetooth thermal printing is not available on this device.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              This feature requires a mobile device with Bluetooth capabilities.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5" />
            Quick Printer Setup
          </DialogTitle>
          <DialogDescription>
            Connect your Bluetooth thermal printer for fast receipt printing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Current Status */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Printer className="h-4 w-4" />
                  <span className="font-medium">Status:</span>
                  <Badge 
                    variant={isConnected ? "default" : "secondary"}
                    className={isConnected ? "bg-green-500" : "bg-gray-500"}
                  >
                    {isConnected ? 'Connected' : 'Not Connected'}
                  </Badge>
                </div>
                {isConnected && connectedPrinter && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectPrinter}
                  >
                    Disconnect
                  </Button>
                )}
              </div>
              
              {connectedPrinter && (
                <div className="mt-2 text-sm text-gray-600">
                  Connected to: {connectedPrinter.name}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Actions */}
          {!isConnected && (
            <div className="space-y-3">
              <Button
                onClick={scanForPrinters}
                disabled={isScanning}
                className="w-full flex items-center justify-center"
              >
                {isScanning ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Scanning for Printers...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Scan for Printers
                  </>
                )}
              </Button>

              {/* Available Printers */}
              {availablePrinters.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Available Printers:</h4>
                  {availablePrinters.map((printer) => (
                    <div
                      key={printer.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-2">
                        <Printer className="h-4 w-4" />
                        <span className="text-sm font-medium">{printer.name}</span>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => connectToPrinter(printer)}
                        disabled={printer.isConnected}
                      >
                        {printer.isConnected ? (
                          <>
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Connected
                          </>
                        ) : (
                          'Connect'
                        )}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Test Print */}
          {isConnected && (
            <Button
              onClick={printTestReceipt}
              disabled={isPrinting}
              variant="outline"
              className="w-full"
            >
              {isPrinting ? (
                <>
                  <Spinner className="mr-2 h-4 w-4" />
                  Printing Test...
                </>
              ) : (
                <>
                  <Printer className="mr-2 h-4 w-4" />
                  Print Test Receipt
                </>
              )}
            </Button>
          )}

          {/* Debug Information */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-500 space-y-1 p-2 bg-gray-50 rounded">
              <p><strong>Debug Info:</strong></p>
              <p>Bluetooth Available: {isAvailable ? 'Yes' : 'No'}</p>
              <p>Currently Scanning: {isScanning ? 'Yes' : 'No'}</p>
              <p>Found Printers: {availablePrinters.length}</p>
              <p>Connected: {isConnected ? 'Yes' : 'No'}</p>
              {connectedPrinter && (
                <>
                  <p>Connected to: {connectedPrinter.name}</p>
                  <p>Connection Type: {connectedPrinter.connectionType}</p>
                  <p>Device ID: {connectedPrinter.id}</p>
                </>
              )}
              {availablePrinters.length > 0 && (
                <div className="mt-2">
                  <p><strong>Available Printers:</strong></p>
                  {availablePrinters.map((printer, index) => (
                    <p key={printer.id} className="ml-2">
                      {index + 1}. {printer.name} ({printer.connectionType})
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Instructions */}
          <div className="text-xs text-gray-500 space-y-1">
            <p><strong>Setup Instructions:</strong></p>
            <p>1. Turn on your thermal printer</p>
            <p>2. Enable Bluetooth pairing mode</p>
            <p>3. Click "Scan for Printers"</p>
            <p>4. Select your printer from the list</p>
            <p>5. Test the connection</p>
            <p className="text-orange-600 mt-2">
              <strong>Note:</strong> This feature works best on mobile devices with Bluetooth support.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
