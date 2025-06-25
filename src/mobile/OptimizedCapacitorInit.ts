
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';

export class OptimizedCapacitorInit {
  private static initializationPromise: Promise<void> | null = null;
  
  static async initialize(): Promise<void> {
    // Prevent multiple initializations
    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.performInitialization();
    return this.initializationPromise;
  }

  private static async performInitialization(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('📱 Running in web browser - skipping native plugin initialization');
      return Promise.resolve();
    }

    console.log('📱 Initializing Capacitor mobile plugins...');

    // Use Promise.allSettled to prevent any single failure from blocking the entire init
    const initPromises = [
      this.configureStatusBarWithTimeout(),
      this.configureSplashScreenWithTimeout(),
      this.configureKeyboardWithTimeout(),
      this.configureAppListenersWithTimeout(),
      this.configureNetworkMonitoringWithTimeout()
    ];

    const results = await Promise.allSettled(initPromises);
    
    // Log any failures but don't throw
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        console.warn(`📱 Plugin initialization ${index} failed:`, result.reason);
      }
    });

    console.log('📱 Capacitor mobile plugins initialization completed');
  }

  private static async configureStatusBarWithTimeout(): Promise<void> {
    return Promise.race([
      this.configureStatusBar(),
      this.createTimeout(2000, 'Status bar configuration')
    ]);
  }

  private static async configureSplashScreenWithTimeout(): Promise<void> {
    return Promise.race([
      this.configureSplashScreen(),
      this.createTimeout(3000, 'Splash screen configuration')
    ]);
  }

  private static async configureKeyboardWithTimeout(): Promise<void> {
    return Promise.race([
      this.configureKeyboard(),
      this.createTimeout(1000, 'Keyboard configuration')
    ]);
  }

  private static async configureAppListenersWithTimeout(): Promise<void> {
    return Promise.race([
      this.configureAppListeners(),
      this.createTimeout(1000, 'App listeners configuration')
    ]);
  }

  private static async configureNetworkMonitoringWithTimeout(): Promise<void> {
    return Promise.race([
      this.configureNetworkMonitoring(),
      this.createTimeout(2000, 'Network monitoring configuration')
    ]);
  }

  private static createTimeout(ms: number, operation: string): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${operation} timeout after ${ms}ms`)), ms);
    });
  }

  private static async configureStatusBar(): Promise<void> {
    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
      await StatusBar.show();
      console.log('📱 Status bar configured');
    } catch (error) {
      console.error('📱 Error configuring status bar:', error);
      throw error;
    }
  }

  private static async configureSplashScreen(): Promise<void> {
    try {
      // Hide splash screen after app is ready
      setTimeout(async () => {
        try {
          await SplashScreen.hide();
          console.log('📱 Splash screen hidden');
        } catch (error) {
          console.warn('📱 Error hiding splash screen:', error);
        }
      }, 1500); // Reduced timeout
    } catch (error) {
      console.error('📱 Error configuring splash screen:', error);
      throw error;
    }
  }

  private static async configureKeyboard(): Promise<void> {
    try {
      Keyboard.addListener('keyboardWillShow', (info) => {
        console.log('📱 Keyboard showing:', info.keyboardHeight);
        document.body.style.paddingBottom = `${info.keyboardHeight}px`;
      });

      Keyboard.addListener('keyboardWillHide', () => {
        console.log('📱 Keyboard hiding');
        document.body.style.paddingBottom = '0px';
      });

      console.log('📱 Keyboard listeners configured');
    } catch (error) {
      console.error('📱 Error configuring keyboard:', error);
      throw error;
    }
  }

  private static async configureAppListeners(): Promise<void> {
    try {
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('📱 App state changed. Active:', isActive);
      });

      App.addListener('backButton', ({ canGoBack }) => {
        console.log('📱 Back button pressed. Can go back:', canGoBack);
        if (canGoBack) {
          window.history.back();
        } else {
          App.exitApp();
        }
      });

      console.log('📱 App listeners configured');
    } catch (error) {
      console.error('📱 Error configuring app listeners:', error);
      throw error;
    }
  }

  private static async configureNetworkMonitoring(): Promise<void> {
    try {
      const status = await Network.getStatus();
      console.log('📱 Network status:', status);

      Network.addListener('networkStatusChange', (status) => {
        console.log('📱 Network status changed:', status);
      });

      console.log('📱 Network monitoring configured');
    } catch (error) {
      console.error('📱 Error configuring network monitoring:', error);
      throw error;
    }
  }

  static async getDeviceInfo(): Promise<any> {
    if (!Capacitor.isNativePlatform()) {
      return {
        platform: 'web',
        model: 'Browser',
        operatingSystem: navigator.platform,
        osVersion: navigator.userAgent,
        manufacturer: 'Unknown',
        isVirtual: false,
        webViewVersion: 'N/A'
      };
    }

    try {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();
      console.log('📱 Device info:', info);
      return info;
    } catch (error) {
      console.error('📱 Error getting device info:', error);
      return null;
    }
  }
}
