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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Bluetooth, 
  MapPin, 
  Settings, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { BluetoothPermissionManager, PermissionStatus } from '@/services/permissions/BluetoothPermissionManager';
import { toast } from 'sonner';

interface BluetoothPermissionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onPermissionsGranted: () => void;
}

export function BluetoothPermissionDialog({ 
  isOpen, 
  onClose, 
  onPermissionsGranted 
}: BluetoothPermissionDialogProps) {
  const [permissionStatus, setPermissionStatus] = useState<PermissionStatus | null>(null);
  const [isRequesting, setIsRequesting] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Check permissions when dialog opens
  useEffect(() => {
    if (isOpen) {
      checkCurrentPermissions();
    }
  }, [isOpen]);

  const checkCurrentPermissions = async () => {
    setIsChecking(true);
    try {
      const status = await BluetoothPermissionManager.checkPermissions();
      setPermissionStatus(status);
      
      // If all permissions are granted, automatically close and proceed
      if (status.bluetooth && status.location && status.bluetoothEnabled) {
        toast.success('All Bluetooth permissions are granted!');
        onPermissionsGranted();
        onClose();
      }
    } catch (error) {
      console.error('Failed to check permissions:', error);
      toast.error('Failed to check permissions');
    } finally {
      setIsChecking(false);
    }
  };

  const requestPermissions = async () => {
    setIsRequesting(true);
    try {
      toast.info('Requesting Bluetooth permissions...', {
        description: 'Please allow all permission requests'
      });

      const status = await BluetoothPermissionManager.requestPermissions();
      setPermissionStatus(status);

      if (status.bluetooth && status.location && status.bluetoothEnabled) {
        toast.success('All permissions granted!');
        onPermissionsGranted();
        onClose();
      } else {
        const errorMessage = BluetoothPermissionManager.getPermissionErrorMessage(status);
        if (errorMessage) {
          toast.error('Permissions incomplete', { description: errorMessage });
        }
      }
    } catch (error: any) {
      console.error('Permission request failed:', error);
      toast.error('Permission request failed', { 
        description: error.message || 'Please try again or check settings manually' 
      });
    } finally {
      setIsRequesting(false);
    }
  };

  const openSettings = async () => {
    try {
      await BluetoothPermissionManager.openSettings();
      toast.info('Opening device settings...', {
        description: 'Please enable Bluetooth and Location permissions, then return to the app'
      });
    } catch (error) {
      toast.error('Could not open settings', {
        description: 'Please manually go to Settings → Apps → Croffle Store POS Kiosk → Permissions'
      });
    }
  };

  const PermissionStatusBadge = ({ granted, label }: { granted: boolean; label: string }) => (
    <div className="flex items-center justify-between p-3 border rounded-lg">
      <span className="font-medium">{label}</span>
      <Badge variant={granted ? "default" : "destructive"} className={granted ? "bg-green-500" : "bg-red-500"}>
        {granted ? (
          <><CheckCircle className="w-3 h-3 mr-1" /> Granted</>
        ) : (
          <><XCircle className="w-3 h-3 mr-1" /> Required</>
        )}
      </Badge>
    </div>
  );

  const allPermissionsGranted = permissionStatus && 
    permissionStatus.bluetooth && 
    permissionStatus.location && 
    permissionStatus.bluetoothEnabled;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bluetooth className="h-5 w-5" />
            Bluetooth Permissions Required
          </DialogTitle>
          <DialogDescription>
            This app needs Bluetooth and Location permissions to connect to thermal printers.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Permission Status */}
          {permissionStatus && (
            <div className="space-y-2">
              <h4 className="font-medium text-sm">Permission Status:</h4>
              <PermissionStatusBadge 
                granted={permissionStatus.bluetooth} 
                label="Bluetooth Access" 
              />
              <PermissionStatusBadge 
                granted={permissionStatus.location} 
                label="Location Access" 
              />
              <PermissionStatusBadge 
                granted={permissionStatus.bluetoothEnabled} 
                label="Bluetooth Enabled" 
              />
            </div>
          )}

          {/* Error Message */}
          {permissionStatus && !allPermissionsGranted && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {BluetoothPermissionManager.getPermissionErrorMessage(permissionStatus)}
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Setup Instructions:</h4>
            <div className="text-sm text-gray-600 space-y-1">
              {BluetoothPermissionManager.getPermissionInstructions().map((instruction, index) => (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-blue-500 font-medium">{index + 1}.</span>
                  <span>{instruction}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            {!allPermissionsGranted && (
              <>
                <Button
                  onClick={requestPermissions}
                  disabled={isRequesting}
                  className="w-full"
                >
                  {isRequesting ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Requesting Permissions...
                    </>
                  ) : (
                    <>
                      <Bluetooth className="mr-2 h-4 w-4" />
                      Request Permissions
                    </>
                  )}
                </Button>

                <Button
                  onClick={openSettings}
                  variant="outline"
                  className="w-full"
                >
                  <Settings className="mr-2 h-4 w-4" />
                  Open Settings
                  <ExternalLink className="ml-2 h-3 w-3" />
                </Button>
              </>
            )}

            <Button
              onClick={checkCurrentPermissions}
              variant="ghost"
              disabled={isChecking}
              className="w-full"
            >
              {isChecking ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Checking...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Check Again
                </>
              )}
            </Button>

            <Button
              onClick={onClose}
              variant="outline"
              className="w-full"
            >
              Cancel
            </Button>
          </div>

          {/* Success Message */}
          {allPermissionsGranted && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                All permissions are granted! You can now scan for Bluetooth printers.
              </AlertDescription>
            </Alert>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
