import React from 'react';
import { BluetoothDiagnostics } from '@/components/debug/BluetoothDiagnostics';
import { BluetoothPermissionDialog } from '@/components/printer/BluetoothPermissionDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Bluetooth } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export function BluetoothDebugPage() {
  const navigate = useNavigate();
  const [showPermissionDialog, setShowPermissionDialog] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Bluetooth Debug & Testing</h1>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bluetooth className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button 
                onClick={() => setShowPermissionDialog(true)}
                className="flex items-center gap-2"
              >
                <Bluetooth className="h-4 w-4" />
                Test Permission Dialog
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Diagnostics Component */}
        <BluetoothDiagnostics />

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Debug Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">How to use this debug page:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                <li><strong>Run Diagnostics:</strong> Click "Run Diagnostics" to test all Bluetooth functionality</li>
                <li><strong>Test Permissions:</strong> Click "Test Permissions" to manually trigger permission requests</li>
                <li><strong>Test Settings:</strong> Click "Test Settings" to test opening device settings</li>
                <li><strong>Permission Dialog:</strong> Click "Test Permission Dialog" to test the UI component</li>
                <li><strong>Check Console:</strong> Open browser dev tools to see detailed logs</li>
              </ol>
            </div>
            
            <div>
              <h3 className="font-semibold mb-2">What to look for:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li><strong>Green results:</strong> Everything working correctly</li>
                <li><strong>Yellow results:</strong> Warnings that may need attention</li>
                <li><strong>Red results:</strong> Failures that need to be fixed</li>
                <li><strong>Console logs:</strong> Detailed error messages and debugging info</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Common issues to check:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>BleClient not available (plugin not loaded)</li>
                <li>Permission requests not triggering system dialogs</li>
                <li>Settings not opening (incorrect URL schemes)</li>
                <li>Environment detection issues (web vs native)</li>
                <li>Bluetooth not enabled on device</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Permission Dialog */}
        <BluetoothPermissionDialog
          isOpen={showPermissionDialog}
          onClose={() => setShowPermissionDialog(false)}
          onPermissionsGranted={() => {
            setShowPermissionDialog(false);
            console.log('✅ Permissions granted callback triggered');
          }}
        />
      </div>
    </div>
  );
}
