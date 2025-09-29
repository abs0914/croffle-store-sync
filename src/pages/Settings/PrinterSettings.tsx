import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bluetooth, Printer, RefreshCw, Settings as SettingsIcon, Search } from 'lucide-react';
import { useThermalPrinter } from '@/hooks/useThermalPrinter';
import { BluetoothDevicePickerDialog } from '@/components/printer/BluetoothDevicePickerDialog';
import { BluetoothPermissionManager, type PermissionStatus } from '@/services/permissions/BluetoothPermissionManager';
import { BluetoothPrinter } from '@/types/printer';
import { PrinterTypeManager } from '@/services/printer/PrinterTypeManager';
import { Capacitor } from '@capacitor/core';
import { PrinterWebView } from '@/components/printer/PrinterWebView';

export default function PrinterSettings() {
  const [showDevicePicker, setShowDevicePicker] = useState(false);
  const [perm, setPerm] = useState<PermissionStatus | null>(null);
  const [checkingPerms, setCheckingPerms] = useState(false);
  const [requestingPerms, setRequestingPerms] = useState(false);

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
    testServiceDiscovery,
    checkAvailability,
  } = useThermalPrinter();

  const isCapacitor = useMemo(() => !!(window as any).Capacitor?.isNativePlatform?.(), []);
  const isAndroid = useMemo(() => Capacitor.getPlatform() === 'android', []);
  const shouldUseWebView = useMemo(() => isCapacitor && isAndroid, [isCapacitor, isAndroid]);

  useEffect(() => {
    // Debug plugin availability first
    console.log('🔧 Debugging Capacitor plugin availability:');
    console.log('- Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
    console.log('- Capacitor.getPlatform():', Capacitor.getPlatform());
    console.log('- BluetoothLe plugin available:', Capacitor.isPluginAvailable('BluetoothLe'));
    console.log('- Window.Capacitor:', !!(window as any).Capacitor);

    BluetoothPermissionManager.debugPluginAvailability();

    // Initial check on mount for clear status badges
    refreshPermissions();
  }, []);

  const refreshPermissions = async () => {
    setCheckingPerms(true);
    try {
      const status = await BluetoothPermissionManager.checkPermissions();
      setPerm(status);
      await checkAvailability();
    } finally {
      setCheckingPerms(false);
    }
  };

  const requestPermissions = async () => {
    setRequestingPerms(true);
    try {
      const status = await BluetoothPermissionManager.requestPermissions();
      setPerm(status);
      await checkAvailability();
    } finally {
      setRequestingPerms(false);
    }
  };

  const handleScanClick = async () => {
    if (isCapacitor) {
      setShowDevicePicker(true);
    } else {
      await scanForPrinters(true); // Opens native chooser in Web Bluetooth
    }
  };

  const handleDeviceSelected = async (printer: BluetoothPrinter) => {
    await connectToPrinter(printer);
  };

  const allPermsOk = perm?.bluetooth && perm?.location && perm?.bluetoothEnabled;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Printer Settings</h2>
        <div className="text-xs text-muted-foreground">
          Mode: {shouldUseWebView ? 'Android (WebView)' : isCapacitor ? 'Android (Native)' : 'Web Browser'}
        </div>
      </div>

      {/* Conditional rendering: WebView for Android, Native for others */}
      {shouldUseWebView ? (
        <PrinterWebView
          onPrinterConnected={(printer) => {
            console.log('WebView printer connected:', printer);
            // Update the main app state if needed
          }}
          onPrinterDisconnected={() => {
            console.log('WebView printer disconnected');
            // Update the main app state if needed
          }}
          onPrintComplete={(success) => {
            console.log('WebView print complete:', success);
          }}
        />
      ) : (
        <>
          {/* Original native/web implementation */}

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5" />
            Permissions & Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {perm && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <StatusBadge label="Bluetooth Access" ok={!!perm.bluetooth} />
              <StatusBadge label="Location Access" ok={!!perm.location} />
              <StatusBadge label="Bluetooth Enabled" ok={!!perm.bluetoothEnabled} />
            </div>
          )}

          {!allPermsOk && (
            <Alert>
              <AlertDescription>
                {BluetoothPermissionManager.getPermissionErrorMessage(perm ?? { bluetooth:false, location:false, bluetoothEnabled:false })}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={requestPermissions} disabled={requestingPerms} className="flex-1">
              {requestingPerms ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin"/>Requesting...</>
              ) : (
                <><Bluetooth className="mr-2 h-4 w-4"/>Request Permissions</>
              )}
            </Button>
            {isCapacitor && (
              <Button onClick={() => BluetoothPermissionManager.openSettings()} variant="outline" className="flex-1">
                <SettingsIcon className="mr-2 h-4 w-4"/>Open Settings
              </Button>
            )}
            <Button onClick={refreshPermissions} variant="ghost" disabled={checkingPerms} className="flex-1">
              {checkingPerms ? (
                <><RefreshCw className="mr-2 h-4 w-4 animate-spin"/>Checking...</>
              ) : (
                <><RefreshCw className="mr-2 h-4 w-4"/>Check Again</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Connection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Connect to Printer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? 'default' : 'secondary'} className={isConnected ? 'bg-green-500' : 'bg-gray-500'}>
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              {connectedPrinter && (
                <span className="text-sm text-muted-foreground">{connectedPrinter.name}</span>
              )}
            </div>
            {isConnected && (
              <Button size="sm" variant="outline" onClick={disconnectPrinter}>Disconnect</Button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleScanClick} disabled={isScanning} className="flex-1">
              {isScanning ? (
                <><Spinner className="mr-2 h-4 w-4"/>Scanning...</>
              ) : (
                <><Search className="mr-2 h-4 w-4"/>Scan for Printers</>
              )}
            </Button>
            {isConnected && (
              <Button onClick={printTestReceipt} disabled={isPrinting} variant="outline" className="flex-1">
                {isPrinting ? (
                  <><Spinner className="mr-2 h-4 w-4"/>Printing...</>
                ) : (
                  <>Print Test Receipt</>
                )}
              </Button>
            )}
          </div>

          {/* Available printers list (Capacitor path) */}
          {availablePrinters.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium">Available Printers:</h4>
              {availablePrinters.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{p.name}</span>
                    <div className="flex gap-2 mt-1">
                      <Badge variant="secondary" className="text-xs">{p.connectionType === 'web' ? 'Web Bluetooth' : 'Native Bluetooth'}</Badge>
                      <Badge variant="outline" className="text-xs capitalize">{p.printerType || 'thermal'}</Badge>
                      {connectedPrinter?.id === p.id && (
                        <Badge variant="default" className="text-xs bg-green-500">selected</Badge>
                      )}
                    </div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => connectToPrinter(p)} disabled={p.isConnected}>
                    {p.isConnected ? 'Connected' : 'Connect'}
                  </Button>
                </div>
              ))}
            </div>
          )}

          {/* Debug tools */}
          {isConnected && (
            <div className="flex gap-2">
              <Button onClick={testServiceDiscovery} variant="ghost" size="sm">Debug Service Discovery</Button>
              {connectedPrinter && (
                <Badge variant="outline" className="ml-auto text-xs">
                  {PrinterTypeManager.getMaxLineWidth(connectedPrinter)} chars
                </Badge>
              )}
            </div>
          )}

          {/* Device picker dialog for native */}
          <BluetoothDevicePickerDialog
            isOpen={showDevicePicker}
            onClose={() => setShowDevicePicker(false)}
            onDeviceSelected={handleDeviceSelected}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tips</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-1">
          <p>• Ensure your printer is powered on and in Bluetooth pairing mode.</p>
          <p>• For browsers, use Chrome or Edge on desktop with Bluetooth support.</p>
          <p>• On Android, grant Nearby Devices and Location permissions.</p>
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}

function StatusBadge({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <span className="font-medium">{label}</span>
      <Badge variant={ok ? 'default' : 'destructive'} className={ok ? 'bg-green-500' : 'bg-red-500'}>
        {ok ? 'Granted' : 'Required'}
      </Badge>
    </div>
  );
}

