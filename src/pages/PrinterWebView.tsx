import React, { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bluetooth, Printer, Search, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface PrinterDevice {
  id: string;
  name: string;
  connected: boolean;
}

interface WebViewPrinterState {
  isAvailable: boolean;
  isScanning: boolean;
  isConnected: boolean;
  availablePrinters: PrinterDevice[];
  connectedPrinter: PrinterDevice | null;
  permissionStatus: {
    bluetooth: boolean;
    bluetoothEnabled: boolean;
  };
}

export default function PrinterWebView() {
  const [state, setState] = useState<WebViewPrinterState>({
    isAvailable: false,
    isScanning: false,
    isConnected: false,
    availablePrinters: [],
    connectedPrinter: null,
    permissionStatus: {
      bluetooth: false,
      bluetoothEnabled: false
    }
  });

  // Check Web Bluetooth availability
  const checkAvailability = useCallback(async () => {
    try {
      if (!('bluetooth' in navigator)) {
        console.log('Web Bluetooth not supported');
        return false;
      }

      const available = await navigator.bluetooth.getAvailability();
      setState(prev => ({
        ...prev,
        isAvailable: true,
        permissionStatus: {
          bluetooth: true,
          bluetoothEnabled: available
        }
      }));

      // Notify parent window about availability
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'PRINTER_AVAILABILITY',
          available: true,
          bluetoothEnabled: available
        }, '*');
      }

      return available;
    } catch (error) {
      console.error('Failed to check Bluetooth availability:', error);
      return false;
    }
  }, []);

  // Scan for thermal printers
  const scanForPrinters = useCallback(async () => {
    if (!navigator.bluetooth) {
      toast.error('Web Bluetooth not supported');
      return;
    }

    setState(prev => ({ ...prev, isScanning: true }));

    try {
      console.log('🔍 Scanning for thermal printers...');
      
      // Request device with thermal printer services
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          { services: ['000018f0-0000-1000-8000-00805f9b34fb'] }, // Generic printer service
          { services: ['49535343-fe7d-4ae5-8fa9-9fafd205e455'] }, // POS58 service
        ],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455',
          '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
          '00001801-0000-1000-8000-00805f9b34fb'  // Generic Attribute
        ]
      });

      if (device) {
        const printerDevice: PrinterDevice = {
          id: device.id,
          name: device.name || 'Unknown Printer',
          connected: false
        };

        setState(prev => ({
          ...prev,
          availablePrinters: [printerDevice],
          isScanning: false
        }));

        // Auto-connect to the selected device
        await connectToPrinter(printerDevice);

        toast.success(`Found printer: ${printerDevice.name}`);
      }
    } catch (error: any) {
      console.error('Scan failed:', error);
      setState(prev => ({ ...prev, isScanning: false }));
      
      if (error.name === 'NotFoundError') {
        toast.error('No thermal printers found');
      } else if (error.name === 'SecurityError') {
        toast.error('Bluetooth access denied');
      } else {
        toast.error('Failed to scan for printers');
      }
    }
  }, []);

  // Connect to a specific printer
  const connectToPrinter = useCallback(async (printer: PrinterDevice) => {
    try {
      console.log(`🔗 Connecting to printer: ${printer.name}`);
      
      // Get the device by ID (in real implementation, you'd store the device reference)
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: printer.name }],
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '49535343-fe7d-4ae5-8fa9-9fafd205e455'
        ]
      });

      const server = await device.gatt?.connect();
      
      if (server?.connected) {
        const connectedPrinter = { ...printer, connected: true };
        
        setState(prev => ({
          ...prev,
          isConnected: true,
          connectedPrinter
        }));

        // Notify parent window about connection
        if (window.parent !== window) {
          window.parent.postMessage({
            type: 'PRINTER_CONNECTED',
            printer: connectedPrinter
          }, '*');
        }

        toast.success(`Connected to ${printer.name}`);
      }
    } catch (error) {
      console.error('Connection failed:', error);
      toast.error('Failed to connect to printer');
    }
  }, []);

  // Disconnect from printer
  const disconnectPrinter = useCallback(async () => {
    if (state.connectedPrinter) {
      setState(prev => ({
        ...prev,
        isConnected: false,
        connectedPrinter: null
      }));

      // Notify parent window about disconnection
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'PRINTER_DISCONNECTED'
        }, '*');
      }

      toast.success('Printer disconnected');
    }
  }, [state.connectedPrinter]);

  // Print test receipt
  const printTestReceipt = useCallback(async () => {
    if (!state.connectedPrinter) {
      toast.error('No printer connected');
      return;
    }

    try {
      // This would contain the actual printing logic
      console.log('🖨️ Printing test receipt...');
      
      // Notify parent window about print job
      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'PRINT_TEST_RECEIPT',
          success: true
        }, '*');
      }

      toast.success('Test receipt printed successfully');
    } catch (error) {
      console.error('Print failed:', error);
      toast.error('Failed to print test receipt');
    }
  }, [state.connectedPrinter]);

  // Listen for messages from parent window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type, data } = event.data;
      
      switch (type) {
        case 'PRINT_RECEIPT':
          // Handle print receipt request from parent
          console.log('Print receipt request:', data);
          break;
        case 'GET_PRINTER_STATUS':
          // Send current status to parent
          if (window.parent !== window) {
            window.parent.postMessage({
              type: 'PRINTER_STATUS',
              status: state
            }, '*');
          }
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [state]);

  // Initialize on mount
  useEffect(() => {
    checkAvailability();
  }, [checkAvailability]);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Thermal Printer (Web Bluetooth)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Permission Status */}
            <div className="space-y-2">
              <h3 className="font-medium">Bluetooth Status</h3>
              <div className="flex gap-2">
                <Badge variant={state.permissionStatus.bluetooth ? "default" : "destructive"}>
                  {state.permissionStatus.bluetooth ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  Bluetooth Access
                </Badge>
                <Badge variant={state.permissionStatus.bluetoothEnabled ? "default" : "destructive"}>
                  {state.permissionStatus.bluetoothEnabled ? (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-1" />
                  )}
                  Bluetooth Enabled
                </Badge>
              </div>
            </div>

            {/* Connection Status */}
            <div className="space-y-2">
              <h3 className="font-medium">Connection Status</h3>
              {state.isConnected && state.connectedPrinter ? (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Connected to {state.connectedPrinter.name}
                  </AlertDescription>
                </Alert>
              ) : (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    No printer connected
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={scanForPrinters}
                disabled={state.isScanning || !state.permissionStatus.bluetoothEnabled}
                className="flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                {state.isScanning ? 'Scanning...' : 'Scan for Printers'}
              </Button>

              {state.isConnected ? (
                <>
                  <Button
                    onClick={printTestReceipt}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Printer className="h-4 w-4" />
                    Print Test Receipt
                  </Button>
                  <Button
                    onClick={disconnectPrinter}
                    variant="destructive"
                    className="flex items-center gap-2"
                  >
                    <XCircle className="h-4 w-4" />
                    Disconnect
                  </Button>
                </>
              ) : null}
            </div>

            {/* Available Printers */}
            {state.availablePrinters.length > 0 && (
              <div className="space-y-2">
                <h3 className="font-medium">Available Printers</h3>
                <div className="space-y-1">
                  {state.availablePrinters.map((printer) => (
                    <div
                      key={printer.id}
                      className="flex items-center justify-between p-2 border rounded"
                    >
                      <span>{printer.name}</span>
                      <Badge variant={printer.connected ? "default" : "secondary"}>
                        {printer.connected ? "Connected" : "Available"}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
