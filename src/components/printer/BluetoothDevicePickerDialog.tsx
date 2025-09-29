import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Bluetooth, Wifi, ChevronRight, AlertCircle, RefreshCw } from 'lucide-react';
import { BluetoothPrinter } from '@/types/printer';
import { PrinterDiscovery } from '@/services/printer/PrinterDiscovery';
import { toast } from 'sonner';

interface BluetoothDevicePickerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onDeviceSelected: (printer: BluetoothPrinter) => void;
}

export function BluetoothDevicePickerDialog({ 
  isOpen, 
  onClose, 
  onDeviceSelected 
}: BluetoothDevicePickerDialogProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [discoveredPrinters, setDiscoveredPrinters] = useState<BluetoothPrinter[]>([]);
  const [scanError, setScanError] = useState<string | null>(null);

  // Auto-start scanning when dialog opens
  useEffect(() => {
    if (isOpen && !isScanning && discoveredPrinters.length === 0) {
      handleScan();
    }
  }, [isOpen]);

  const handleScan = async () => {
    try {
      setIsScanning(true);
      setScanError(null);
      setDiscoveredPrinters([]);
      
      toast.info('Scanning for Bluetooth devices...', { 
        description: 'Make sure your printer is on and in pairing mode' 
      });

      const printers = await PrinterDiscovery.scanForPrinters();
      
      if (printers.length === 0) {
        setScanError('No thermal printers found. Make sure your printer is on and in pairing mode.');
        toast.warning('No printers found', { 
          description: 'Make sure your thermal printer is powered on and in Bluetooth pairing mode' 
        });
      } else {
        setDiscoveredPrinters(printers);
        toast.success(`Found ${printers.length} printer${printers.length > 1 ? 's' : ''}`, { 
          description: 'Select a printer to connect' 
        });
      }
    } catch (error: any) {
      console.error('Bluetooth scanning failed:', error);
      setScanError(error.message || 'Failed to scan for Bluetooth devices');
      toast.error('Scan failed', { 
        description: error.message || 'Failed to scan for Bluetooth devices' 
      });
    } finally {
      setIsScanning(false);
    }
  };

  const handleDeviceSelect = async (printer: BluetoothPrinter) => {
    try {
      toast.info(`Connecting to ${printer.name}...`);
      onDeviceSelected(printer);
      onClose();
    } catch (error: any) {
      console.error('Device selection failed:', error);
      toast.error('Connection failed', { 
        description: error.message || 'Failed to connect to the selected printer' 
      });
    }
  };

  const handleClose = () => {
    setDiscoveredPrinters([]);
    setScanError(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5 text-blue-600" />
            croffle-store-sync wants to pair
          </DialogTitle>
          <DialogDescription>
            Select a Bluetooth thermal printer to connect
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Scanning State */}
          {isScanning && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="relative">
                <Bluetooth className="h-12 w-12 text-blue-600" />
                <div className="absolute -top-1 -right-1">
                  <Spinner className="h-4 w-4 text-blue-600" />
                </div>
              </div>
              <div className="text-center space-y-1">
                <p className="font-medium">Scanning for devices...</p>
                <p className="text-sm text-muted-foreground">
                  Make sure your printer is on and in pairing mode
                </p>
              </div>
            </div>
          )}

          {/* Discovered Devices */}
          {!isScanning && discoveredPrinters.length > 0 && (
            <div className="space-y-2">
              {discoveredPrinters.map((printer) => (
                <button
                  key={printer.id}
                  onClick={() => handleDeviceSelect(printer)}
                  className="w-full flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gray-100 rounded-full">
                      <Wifi className="h-4 w-4 text-gray-600" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium text-gray-900">{printer.name}</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {printer.connectionType === 'web' ? 'Web Bluetooth' : 'Bluetooth LE'}
                        </Badge>
                        {printer.printerType && (
                          <Badge variant="outline" className="text-xs capitalize">
                            {printer.printerType}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
                </button>
              ))}
            </div>
          )}

          {/* Error State */}
          {!isScanning && scanError && discoveredPrinters.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <AlertCircle className="h-12 w-12 text-orange-500" />
              <div className="text-center space-y-2">
                <p className="font-medium text-gray-900">No devices found</p>
                <p className="text-sm text-muted-foreground max-w-sm">
                  {scanError}
                </p>
                <Button
                  onClick={handleScan}
                  variant="outline"
                  size="sm"
                  className="mt-4"
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Bluetooth className="h-3 w-3" />
              <span>
                while scanning for devices...
              </span>
            </div>
            <div className="flex gap-2">
              {!isScanning && discoveredPrinters.length === 0 && !scanError && (
                <Button onClick={handleScan} size="sm">
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Scan
                </Button>
              )}
              <Button onClick={handleClose} variant="outline" size="sm">
                Cancel
              </Button>
            </div>
          </div>

          {/* Help Text */}
          <div className="text-xs text-muted-foreground space-y-1 p-3 bg-blue-50 rounded-lg">
            <p className="font-medium text-blue-900">Troubleshooting Tips:</p>
            <ul className="space-y-1 text-blue-800">
              <li>• Make sure your thermal printer is powered on</li>
              <li>• Enable Bluetooth pairing mode on your printer</li>
              <li>• Check that Bluetooth and Location permissions are enabled</li>
              <li>• Move closer to your printer if not found</li>
            </ul>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}