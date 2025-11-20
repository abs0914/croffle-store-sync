/**
 * DEVICE ID SERVICE
 * 
 * Manages unique device identification for offline operations.
 * Uses Capacitor Device API to get stable hardware identifiers.
 */

import { Device } from '@capacitor/device';
import { Capacitor } from '@capacitor/core';
import { offlineDB } from './db/schema';

class DeviceIdService {
  private deviceId: string | null = null;
  private readonly DEVICE_ID_KEY = 'offline_device_id';

  /**
   * Initialize and get stable device ID
   */
  async getDeviceId(): Promise<string> {
    if (this.deviceId) {
      return this.deviceId;
    }

    // Try to load from IndexedDB first
    const stored = await offlineDB.device_config.get({ device_id: await this.loadStoredDeviceId() } as any);
    if (stored?.device_id) {
      this.deviceId = stored.device_id;
      console.log('📱 Device ID loaded from storage:', this.deviceId);
      return this.deviceId;
    }

    // Generate new device ID based on platform
    if (Capacitor.isNativePlatform()) {
      // Use Capacitor Device API for native platforms
      this.deviceId = await this.generateNativeDeviceId();
    } else {
      // Use browser fingerprinting for web
      this.deviceId = await this.generateWebDeviceId();
    }

    // Store device ID
    await this.storeDeviceId(this.deviceId);
    
    console.log('📱 Device ID generated and stored:', this.deviceId);
    return this.deviceId;
  }

  /**
   * Generate device ID for native platforms using Capacitor
   */
  private async generateNativeDeviceId(): Promise<string> {
    try {
      const info = await Device.getId();
      const deviceInfo = await Device.getInfo();
      
      // Use hardware UUID if available (Android/iOS)
      if (info.identifier) {
        return `native_${info.identifier}`;
      }
      
      // Fallback to combination of device properties
      const fingerprint = `${deviceInfo.platform}_${deviceInfo.manufacturer}_${deviceInfo.model}_${deviceInfo.osVersion}`;
      return `native_${this.hashString(fingerprint)}`;
    } catch (error) {
      console.error('Error getting native device ID:', error);
      return this.generateFallbackDeviceId();
    }
  }

  /**
   * Generate device ID for web platforms
   */
  private async generateWebDeviceId(): Promise<string> {
    // Try to use existing localStorage ID first
    const stored = localStorage.getItem(this.DEVICE_ID_KEY);
    if (stored) {
      return stored;
    }

    // Create browser fingerprint
    const fingerprint = [
      navigator.userAgent,
      navigator.language,
      screen.width,
      screen.height,
      screen.colorDepth,
      new Date().getTimezoneOffset(),
      navigator.hardwareConcurrency || 'unknown',
      (navigator as any).deviceMemory || 'unknown'
    ].join('|');

    const deviceId = `web_${this.hashString(fingerprint)}_${Date.now()}`;
    localStorage.setItem(this.DEVICE_ID_KEY, deviceId);
    return deviceId;
  }

  /**
   * Generate fallback device ID if all else fails
   */
  private generateFallbackDeviceId(): string {
    const random = Math.random().toString(36).substring(2, 15);
    const timestamp = Date.now().toString(36);
    return `fallback_${timestamp}_${random}`;
  }

  /**
   * Simple hash function for strings
   */
  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Load stored device ID
   */
  private async loadStoredDeviceId(): Promise<string> {
    // Try localStorage first (backward compatibility)
    const storedInLocalStorage = localStorage.getItem(this.DEVICE_ID_KEY);
    if (storedInLocalStorage) {
      return storedInLocalStorage;
    }

    // Try IndexedDB
    const configs = await offlineDB.device_config.toArray();
    if (configs.length > 0) {
      return configs[0].device_id;
    }

    return '';
  }

  /**
   * Store device ID in both localStorage and IndexedDB
   */
  private async storeDeviceId(deviceId: string): Promise<void> {
    // Store in localStorage for quick access
    localStorage.setItem(this.DEVICE_ID_KEY, deviceId);

    // Store in IndexedDB with additional metadata
    const deviceInfo = Capacitor.isNativePlatform() ? await Device.getInfo() : null;
    
    await offlineDB.device_config.put({
      device_id: deviceId,
      device_name: deviceInfo ? `${deviceInfo.manufacturer} ${deviceInfo.model}` : 'Web Browser',
      created_at: Date.now(),
      updated_at: Date.now()
    });
  }

  /**
   * Get device info for diagnostics
   */
  async getDeviceInfo(): Promise<{
    deviceId: string;
    platform: string;
    manufacturer?: string;
    model?: string;
    osVersion?: string;
    isNative: boolean;
  }> {
    const deviceId = await this.getDeviceId();
    const isNative = Capacitor.isNativePlatform();

    if (isNative) {
      const info = await Device.getInfo();
      return {
        deviceId,
        platform: info.platform,
        manufacturer: info.manufacturer,
        model: info.model,
        osVersion: info.osVersion,
        isNative: true
      };
    }

    return {
      deviceId,
      platform: 'web',
      manufacturer: 'Browser',
      model: navigator.userAgent,
      isNative: false
    };
  }

  /**
   * Update last online timestamp
   */
  async updateLastOnlineAt(): Promise<void> {
    const deviceId = await this.getDeviceId();
    const config = await offlineDB.device_config.get(deviceId);
    
    if (config) {
      await offlineDB.device_config.update(deviceId, {
        last_online_at: Date.now(),
        updated_at: Date.now()
      });
    }
  }

  /**
   * Associate device with a store
   */
  async setStoreId(storeId: string): Promise<void> {
    const deviceId = await this.getDeviceId();
    await offlineDB.device_config.update(deviceId, {
      store_id: storeId,
      updated_at: Date.now()
    });
  }

  /**
   * Get current store ID for this device
   */
  async getStoreId(): Promise<string | null> {
    const deviceId = await this.getDeviceId();
    const config = await offlineDB.device_config.get(deviceId);
    return config?.store_id || null;
  }
}

// Export singleton instance
export const deviceIdService = new DeviceIdService();
