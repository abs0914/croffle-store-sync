
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Printer, Bluetooth, Search } from 'lucide-react';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';

interface ThermalPrinterSettingsProps {
  children: React.ReactNode;
}

export function ThermalPrinterSettings({ children }: ThermalPrinterSettingsProps) {
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
      <Dialog>
        <DialogTrigger asChild>
          {children}
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Thermal Printer</DialogTitle>
            <DialogDescription>
              Bluetooth thermal printing is not available on this device.
            </DialogDescription>
          </DialogHeader>
          <div className="text-center py-8">
            <Bluetooth className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-600">
              This feature requires a mobile device with Bluetooth capabilities.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Thermal Printer Settings
          </DialogTitle>
          <DialogDescription>
            Manage your Bluetooth thermal printer connection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Connection Status */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Connection Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={isConnected ? "default" : "secondary"}
                    className={isConnected ? "bg-green-500" : "bg-gray-500"}
                  >
                    {isConnected ? 'Connected' : 'Disconnected'}
                  </Badge>
                  {connectedPrinter && (
                    <span className="text-sm text-gray-600">
                      {connectedPrinter.name}
                    </span>
                  )}
                </div>
                {isConnected && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={disconnectPrinter}
                  >
                    Disconnect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Scanner */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Find Printers</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={scanForPrinters}
                disabled={isScanning}
                className="w-full"
              >
                {isScanning ? (
                  <>
                    <Spinner className="mr-2 h-4 w-4" />
                    Scanning...
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
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span className="text-sm">{printer.name}</span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => connectToPrinter(printer)}
                        disabled={printer.isConnected}
                      >
                        {printer.isConnected ? 'Connected' : 'Connect'}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Test Print */}
          {isConnected && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Test Print</CardTitle>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={printTestReceipt}
                  disabled={isPrinting}
                  className="w-full"
                  variant="outline"
                >
                  {isPrinting ? (
                    <>
                      <Spinner className="mr-2 h-4 w-4" />
                      Printing...
                    </>
                  ) : (
                    <>
                      <Printer className="mr-2 h-4 w-4" />
                      Print Test Receipt
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
