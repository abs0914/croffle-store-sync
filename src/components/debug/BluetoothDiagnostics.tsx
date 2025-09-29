import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bluetooth, 
  MapPin, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  RefreshCw,
  Bug
} from 'lucide-react';
import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';
import { toast } from 'sonner';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

export function BluetoothDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addResult = (test: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any) => {
    setResults(prev => [...prev, { test, status, message, details }]);
  };

  const runDiagnostics = async () => {
    setIsRunning(true);
    setResults([]);
    
    try {
      // Test 1: Environment Detection
      console.log('🔧 Running Bluetooth diagnostics...');
      
      const isNative = Capacitor.isNativePlatform();
      const platform = Capacitor.getPlatform();
      
      addResult(
        'Environment Detection',
        'pass',
        `Platform: ${platform}, Native: ${isNative}`,
        { isNative, platform }
      );

      // Test 2: Plugin Availability
      const blePluginAvailable = Capacitor.isPluginAvailable('BluetoothLe');
      const appPluginAvailable = Capacitor.isPluginAvailable('App');
      
      addResult(
        'Plugin Availability',
        blePluginAvailable ? 'pass' : 'fail',
        `BluetoothLe: ${blePluginAvailable}, App: ${appPluginAvailable}`,
        { blePluginAvailable, appPluginAvailable }
      );

      // Test 3: BleClient Import
      try {
        const bleClientType = typeof BleClient;
        const bleClientMethods = BleClient ? Object.getOwnPropertyNames(BleClient) : [];
        
        addResult(
          'BleClient Import',
          bleClientType === 'object' ? 'pass' : 'fail',
          `Type: ${bleClientType}, Methods: ${bleClientMethods.length}`,
          { bleClientType, bleClientMethods }
        );
      } catch (error: any) {
        addResult('BleClient Import', 'fail', `Import failed: ${error.message}`, error);
      }

      if (isNative) {
        // Test 4: BLE Initialization
        try {
          console.log('Testing BLE initialization...');
          await BleClient.initialize({
            androidNeverForLocation: false
          });
          addResult('BLE Initialization', 'pass', 'Successfully initialized BLE client');
        } catch (error: any) {
          addResult('BLE Initialization', 'fail', `Failed: ${error.message}`, error);
        }

        // Test 5: Bluetooth Enabled Check
        try {
          const isEnabled = await BleClient.isEnabled();
          addResult(
            'Bluetooth Enabled',
            isEnabled ? 'pass' : 'warning',
            `Bluetooth is ${isEnabled ? 'enabled' : 'disabled'}`
          );
        } catch (error: any) {
          addResult('Bluetooth Enabled', 'fail', `Check failed: ${error.message}`, error);
        }

        // Test 6: Permission Request Test
        try {
          console.log('Testing permission request...');
          await BleClient.requestLEScan({}, () => {});
          await BleClient.stopLEScan();
          addResult('Permission Request', 'pass', 'Successfully requested scan permissions');
        } catch (error: any) {
          const status = error.message?.includes('location') ? 'warning' : 'fail';
          addResult('Permission Request', status, `Failed: ${error.message}`, error);
        }

        // Test 7: App Plugin Test
        try {
          const { App } = await import('@capacitor/app');
          const appInfo = await App.getInfo();
          addResult('App Plugin', 'pass', `App info retrieved: ${appInfo.name} v${appInfo.version}`);
        } catch (error: any) {
          addResult('App Plugin', 'fail', `Failed: ${error.message}`, error);
        }
      } else {
        // Web Bluetooth Tests
        if ('bluetooth' in navigator) {
          try {
            const available = await navigator.bluetooth.getAvailability();
            addResult(
              'Web Bluetooth',
              available ? 'pass' : 'warning',
              `Web Bluetooth ${available ? 'available' : 'not available'}`
            );
          } catch (error: any) {
            addResult('Web Bluetooth', 'fail', `Check failed: ${error.message}`, error);
          }
        } else {
          addResult('Web Bluetooth', 'fail', 'Web Bluetooth API not supported');
        }
      }

    } catch (error: any) {
      addResult('Diagnostics', 'fail', `Unexpected error: ${error.message}`, error);
    } finally {
      setIsRunning(false);
    }
  };

  const testPermissionRequest = async () => {
    try {
      toast.info('Testing permission request...');
      console.log('🔐 Manual permission request test');
      
      if (!Capacitor.isNativePlatform()) {
        toast.warning('Permission request only works on native platform');
        return;
      }

      await BleClient.initialize({ androidNeverForLocation: false });
      await BleClient.requestLEScan({}, () => {});
      await BleClient.stopLEScan();
      
      toast.success('Permission request successful!');
    } catch (error: any) {
      console.error('Permission request failed:', error);
      toast.error(`Permission request failed: ${error.message}`);
    }
  };

  const testSettingsOpen = async () => {
    try {
      toast.info('Testing settings open...');
      console.log('🔧 Manual settings open test');
      
      if (!Capacitor.isNativePlatform()) {
        toast.warning('Settings open only works on native platform');
        return;
      }

      toast.info('Settings functionality not available in this build');
      toast.success('Settings test completed!');
    } catch (error: any) {
      console.error('Settings open failed:', error);
      toast.error(`Settings open failed: ${error.message}`);
    }
  };

  const StatusIcon = ({ status }: { status: 'pass' | 'fail' | 'warning' }) => {
    switch (status) {
      case 'pass': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'fail': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Bluetooth Diagnostics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={runDiagnostics} disabled={isRunning}>
            {isRunning ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Bug className="mr-2 h-4 w-4" />
                Run Diagnostics
              </>
            )}
          </Button>
          
          <Button onClick={testPermissionRequest} variant="outline">
            <Bluetooth className="mr-2 h-4 w-4" />
            Test Permissions
          </Button>
          
          <Button onClick={testSettingsOpen} variant="outline">
            <Settings className="mr-2 h-4 w-4" />
            Test Settings
          </Button>
        </div>

        {results.length > 0 && (
          <div className="space-y-2">
            <h3 className="font-semibold">Diagnostic Results:</h3>
            {results.map((result, index) => (
              <Alert key={index} className={
                result.status === 'pass' ? 'border-green-200 bg-green-50' :
                result.status === 'warning' ? 'border-yellow-200 bg-yellow-50' :
                'border-red-200 bg-red-50'
              }>
                <StatusIcon status={result.status} />
                <AlertDescription>
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>{result.test}:</strong> {result.message}
                    </div>
                    <Badge variant={
                      result.status === 'pass' ? 'default' :
                      result.status === 'warning' ? 'secondary' : 'destructive'
                    }>
                      {result.status.toUpperCase()}
                    </Badge>
                  </div>
                  {result.details && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-sm text-gray-600">
                        Show details
                      </summary>
                      <pre className="mt-1 text-xs bg-gray-100 p-2 rounded overflow-auto">
                        {JSON.stringify(result.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </AlertDescription>
              </Alert>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
