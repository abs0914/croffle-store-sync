import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

export interface PermissionStatus {
  bluetooth: boolean;
  location: boolean;
  bluetoothEnabled: boolean;
}

export class BluetoothPermissionManager {

  /**
   * Debug method to check plugin availability
   */
  static debugPluginAvailability(): void {
    console.log('🔧 Debugging Capacitor plugin availability:');
    console.log('- Capacitor.isNativePlatform():', Capacitor.isNativePlatform());
    console.log('- Capacitor.getPlatform():', Capacitor.getPlatform());
    console.log('- BluetoothLe plugin available:', Capacitor.isPluginAvailable('BluetoothLe'));
    console.log('- App plugin available:', Capacitor.isPluginAvailable('App'));
    console.log('- BleClient available:', typeof BleClient !== 'undefined');
    console.log('- Window.Capacitor:', !!(window as any).Capacitor);
  }

  /**
   * Check current permission status
   */
  static async checkPermissions(): Promise<PermissionStatus> {
    const status: PermissionStatus = {
      bluetooth: false,
      location: false,
      bluetoothEnabled: false
    };

    if (!Capacitor.isNativePlatform()) {
      // For web, we can only check if Web Bluetooth is available
      if ('bluetooth' in navigator) {
        try {
          const available = await navigator.bluetooth.getAvailability();
          status.bluetooth = true;
          status.location = true; // Web doesn't need location permission
          status.bluetoothEnabled = available;
        } catch (error) {
          console.log('Web Bluetooth check failed:', error);
        }
      }
      return status;
    }

    try {
      // Try to initialize BLE client to check permissions
      await BleClient.initialize({
        androidNeverForLocation: false
      });
      
      // If initialization succeeds, we have basic permissions
      status.bluetooth = true;
      
      // Check if Bluetooth is enabled
      try {
        const isEnabled = await BleClient.isEnabled();
        status.bluetoothEnabled = isEnabled;
      } catch (error) {
        console.log('Could not check Bluetooth enabled status:', error);
        status.bluetoothEnabled = false;
      }

      // Try a quick scan to check location permissions
      try {
        await BleClient.requestLEScan({}, () => {});
        await BleClient.stopLEScan();
        status.location = true;
      } catch (error: any) {
        console.log('Location permission check failed:', error);
        if (error.message?.includes('location')) {
          status.location = false;
        } else {
          // If it's not a location error, assume we have location permission
          status.location = true;
        }
      }

    } catch (error: any) {
      console.log('Bluetooth permission check failed:', error);
      
      if (error.message?.includes('location')) {
        status.bluetooth = true; // BLE is available but location is not
        status.location = false;
      } else if (error.message?.includes('permission')) {
        status.bluetooth = false;
        status.location = false;
      }
    }

    return status;
  }

  /**
   * Request all necessary permissions
   */
  static async requestPermissions(): Promise<PermissionStatus> {
    console.log('🔐 Requesting Bluetooth permissions...');

    if (!Capacitor.isNativePlatform()) {
      // For web, just check availability
      return await this.checkPermissions();
    }

    try {
      // Step 1: Initialize BLE client (this requests basic Bluetooth permissions)
      console.log('📱 Initializing BLE client...');

      // Check if BleClient is available
      if (typeof BleClient === 'undefined') {
        throw new Error('BleClient is not available - Capacitor Bluetooth LE plugin not loaded');
      }

      await BleClient.initialize({
        androidNeverForLocation: false
      });
      console.log('✅ BLE client initialized');

      // Step 2: Request location permissions by attempting a scan
      console.log('📍 Requesting location permissions...');

      // Use a timeout to prevent hanging
      const scanPromise = new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Permission request timeout'));
        }, 10000); // 10 second timeout

        BleClient.requestLEScan({}, () => {})
          .then(() => BleClient.stopLEScan())
          .then(() => {
            clearTimeout(timeout);
            resolve();
          })
          .catch((error) => {
            clearTimeout(timeout);
            reject(error);
          });
      });

      await scanPromise;
      console.log('✅ Location permissions granted');

      // Step 3: Check if Bluetooth is enabled
      console.log('📡 Checking Bluetooth enabled status...');
      let isEnabled = false;
      try {
        isEnabled = await BleClient.isEnabled();
        console.log(`📡 Bluetooth enabled: ${isEnabled}`);
      } catch (enabledError) {
        console.warn('Could not check Bluetooth enabled status:', enabledError);
        // Assume enabled if we can't check
        isEnabled = true;
      }

      return {
        bluetooth: true,
        location: true,
        bluetoothEnabled: isEnabled
      };

    } catch (error: any) {
      console.error('❌ Permission request failed:', error);

      // Provide more specific error information
      if (error.message?.includes('timeout')) {
        console.error('Permission request timed out - this may indicate a system issue');
      } else if (error.message?.includes('not available')) {
        console.error('BLE plugin not available - check Capacitor configuration');
      }

      // Return current status even if some permissions failed
      return await this.checkPermissions();
    }
  }

  /**
   * Get user-friendly error message based on permission status
   */
  static getPermissionErrorMessage(status: PermissionStatus): string | null {
    if (!status.bluetooth) {
      return 'Bluetooth permissions are required. Please enable Bluetooth permissions in your device settings.';
    }
    
    if (!status.location) {
      return 'Location permissions are required for Bluetooth scanning on Android. Please enable Location permissions in your device settings.';
    }
    
    if (!status.bluetoothEnabled) {
      return 'Bluetooth is not enabled. Please turn on Bluetooth in your device settings.';
    }
    
    return null; // All permissions are good
  }

  /**
   * Get detailed permission instructions for the user
   */
  static getPermissionInstructions(): string[] {
    if (!Capacitor.isNativePlatform()) {
      return [
        'Make sure you\'re using Chrome or Edge browser',
        'Ensure Bluetooth is enabled on your device',
        'Allow Bluetooth access when prompted by the browser'
      ];
    }

    return [
      'Go to Settings → Apps → Croffle Store POS Kiosk → Permissions',
      'Enable "Nearby devices" or "Bluetooth" permission',
      'Enable "Location" permission (required for Bluetooth scanning)',
      'Make sure Bluetooth is turned on in your device settings',
      'Restart the app and try again'
    ];
  }

  /**
   * Open device settings (Android only)
   */
  static async openSettings(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Cannot open settings on web platform');
      return;
    }

    try {
      // This will open the app's permission settings page
      const { App } = await import('@capacitor/app');
      await App.openUrl({ url: 'app-settings:' });
    } catch (error) {
      console.error('Failed to open settings:', error);
      // Fallback: try to open general settings
      try {
        const { App } = await import('@capacitor/app');
        await App.openUrl({ url: 'settings:' });
      } catch (fallbackError) {
        console.error('Failed to open settings (fallback):', fallbackError);
      }
    }
  }
}
