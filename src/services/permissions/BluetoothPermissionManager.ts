import { BleClient } from '@capacitor-community/bluetooth-le';
import { Capacitor } from '@capacitor/core';

export interface PermissionStatus {
  bluetooth: boolean;
  location: boolean;
  bluetoothEnabled: boolean;
}

export class BluetoothPermissionManager {
  
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
      await BleClient.initialize({
        androidNeverForLocation: false
      });
      console.log('✅ BLE client initialized');

      // Step 2: Request location permissions by attempting a scan
      console.log('📍 Requesting location permissions...');
      await BleClient.requestLEScan({}, () => {});
      await BleClient.stopLEScan();
      console.log('✅ Location permissions granted');

      // Step 3: Check if Bluetooth is enabled
      console.log('📡 Checking Bluetooth enabled status...');
      const isEnabled = await BleClient.isEnabled();
      console.log(`📡 Bluetooth enabled: ${isEnabled}`);

      return {
        bluetooth: true,
        location: true,
        bluetoothEnabled: isEnabled
      };

    } catch (error: any) {
      console.error('❌ Permission request failed:', error);
      
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

    // Settings opening is not available in current Capacitor version
    console.log('Please manually enable Bluetooth permissions in device settings');
  }
}
