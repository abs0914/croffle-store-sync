
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Printer, Bluetooth, Search } from 'lucide-react';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';
import { PrinterTypeManager } from '@/services/printer/PrinterTypeManager';
import { BluetoothDevicePickerDialog } from './BluetoothDevicePickerDialog';
import { BluetoothPermissionDialog } from './BluetoothPermissionDialog';
import { BluetoothPrinter } from '@/types/printer';

interface ThermalPrinterSettingsProps {
  children: React.ReactNode;
}

export function ThermalPrinterSettings({ children }: ThermalPrinterSettingsProps) {
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);
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
    printTestReceipt,
    testServiceDiscovery
  } = useThermalPrinter();

  const handleScanClick = async () => {
    // Check if we're in a Capacitor environment
    const isCapacitor = !!(window as any).Capacitor?.isNativePlatform?.();
    
    if (isCapacitor) {
      // For Capacitor (native Android app), show our custom device picker dialog
      setShowDevicePicker(true);
    } else {
      // For web browsers, show the native Web Bluetooth device selection dialog
      await scanForPrinters(true);
    }
  };

  const handleDeviceSelected = async (printer: BluetoothPrinter) => {
    await connectToPrinter(printer);
  };

  if (!isAvailable) {
    return (
      <>
        <Dialog>
          <DialogTrigger asChild>
            {children}
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Thermal Printer</DialogTitle>
              <DialogDescription>
                Bluetooth permissions are required to connect to thermal printers.
              </DialogDescription>
            </DialogHeader>
            <div className="text-center py-8">
              <Bluetooth className="h-12 w-12 mx-auto text-orange-500 mb-4" />
              <p className="text-gray-600 mb-4">
                Bluetooth permissions need to be enabled to use thermal printing.
              </p>
              <Button
                onClick={() => setShowPermissionDialog(true)}
                className="w-full"
              >
                <Bluetooth className="mr-2 h-4 w-4" />
                Enable Bluetooth Permissions
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Permission Dialog */}
        <BluetoothPermissionDialog
          isOpen={showPermissionDialog}
          onClose={() => setShowPermissionDialog(false)}
          onPermissionsGranted={() => {
            setShowPermissionDialog(false);
            // Refresh the availability check
            window.location.reload();
          }}
        />
      </>
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
                <div className="flex flex-col gap-1">
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
                  {connectedPrinter && (
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs capitalize">
                        {connectedPrinter.printerType || 'thermal'}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {PrinterTypeManager.getMaxLineWidth(connectedPrinter)} chars
                      </Badge>
                    </div>
                  )}
                  {connectedPrinter && (
                    <div className="text-xs text-muted-foreground">
                      <div>Features:</div>
                      <div className="flex gap-1 mt-1 flex-wrap">
                        {PrinterTypeManager.supportsCutting(connectedPrinter) && 
                          <Badge variant="outline" className="text-xs">Paper Cutting</Badge>}
                        {PrinterTypeManager.supportsQRCodes(connectedPrinter) && 
                          <Badge variant="outline" className="text-xs">QR Codes</Badge>}
                        {PrinterTypeManager.supportsCashDrawer(connectedPrinter) && 
                          <Badge variant="outline" className="text-xs">Cash Drawer</Badge>}
                      </div>
                    </div>
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
                onClick={handleScanClick}
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
                       <div className="flex flex-col">
                         <span className="text-sm font-medium">{printer.name}</span>
                         <div className="flex gap-2 mt-1">
                           <Badge variant="secondary" className="text-xs">
                             {printer.connectionType === 'web' ? 'Web Bluetooth' : 'Native Bluetooth'}
                           </Badge>
                           <Badge variant="outline" className="text-xs capitalize">
                             {printer.printerType || 'thermal'}
                           </Badge>
                         </div>
                       </div>
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
                <CardTitle className="text-lg">Test & Debug</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
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
                <Button
                  onClick={testServiceDiscovery}
                  disabled={isPrinting}
                  className="w-full"
                  variant="outline"
                  size="sm"
                >
                  Debug Service Discovery
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Device Picker Dialog for Capacitor */}
        <BluetoothDevicePickerDialog
          isOpen={showDevicePicker}
          onClose={() => setShowDevicePicker(false)}
          onDeviceSelected={handleDeviceSelected}
        />
      </DialogContent>
    </Dialog>
  );
}
