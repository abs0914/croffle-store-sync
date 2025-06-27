
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Keyboard } from '@capacitor/keyboard';
import { App } from '@capacitor/app';
import { Network } from '@capacitor/network';

export class CapacitorMobileInit {
  static async initialize(): Promise<void> {
    if (!Capacitor.isNativePlatform()) {
      console.log('Running in web browser - skipping native plugin initialization');
      return;
    }

    console.log('Initializing Capacitor mobile plugins...');

    try {
      // Configure Status Bar
      await this.configureStatusBar();
      
      // Configure Splash Screen
      await this.configureSplashScreen();
      
      // Configure Keyboard
      await this.configureKeyboard();
      
      // Configure App Listeners
      await this.configureAppListeners();
      
      // Configure Network Monitoring
      await this.configureNetworkMonitoring();
      
      console.log('Capacitor mobile plugins initialized successfully');
    } catch (error) {
      console.error('Error initializing Capacitor plugins:', error);
    }
  }

  private static async configureStatusBar(): Promise<void> {
    if (!Capacitor.isPluginAvailable('StatusBar')) {
      console.log('StatusBar plugin not available');
      return;
    }

    try {
      await StatusBar.setStyle({ style: Style.Light });
      await StatusBar.setBackgroundColor({ color: '#ffffff' });
      await StatusBar.show();
      console.log('Status bar configured');
    } catch (error) {
      console.error('Error configuring status bar:', error);
    }
  }

  private static async configureSplashScreen(): Promise<void> {
    if (!Capacitor.isPluginAvailable('SplashScreen')) {
      console.log('SplashScreen plugin not available');
      return;
    }

    try {
      // Hide splash screen after a short delay to ensure app is ready
      setTimeout(async () => {
        await SplashScreen.hide();
        console.log('Splash screen hidden');
      }, 2000);
    } catch (error) {
      console.error('Error configuring splash screen:', error);
    }
  }

  private static async configureKeyboard(): Promise<void> {
    if (!Capacitor.isPluginAvailable('Keyboard')) {
      console.log('Keyboard plugin not available');
      return;
    }

    try {
      // Configure keyboard behavior
      Keyboard.addListener('keyboardWillShow', (info) => {
        console.log('Keyboard will show with height:', info.keyboardHeight);
        // Adjust UI if needed
        document.body.style.paddingBottom = `${info.keyboardHeight}px`;
      });

      Keyboard.addListener('keyboardWillHide', () => {
        console.log('Keyboard will hide');
        // Reset UI
        document.body.style.paddingBottom = '0px';
      });

      console.log('Keyboard listeners configured');
    } catch (error) {
      console.error('Error configuring keyboard:', error);
    }
  }

  private static async configureAppListeners(): Promise<void> {
    if (!Capacitor.isPluginAvailable('App')) {
      console.log('App plugin not available');
      return;
    }

    try {
      // Handle app state changes
      App.addListener('appStateChange', ({ isActive }) => {
        console.log('App state changed. Is active:', isActive);
        if (isActive) {
          // App became active - refresh if needed
          console.log('App became active');
        } else {
          // App went to background
          console.log('App went to background');
        }
      });

      // Handle app URL open (deep links)
      App.addListener('appUrlOpen', (event) => {
        console.log('App opened with URL:', event.url);
        // Handle deep links if needed
      });

      // Handle back button on Android
      App.addListener('backButton', ({ canGoBack }) => {
        console.log('Back button pressed. Can go back:', canGoBack);
        if (canGoBack) {
          window.history.back();
        } else {
          // Exit app or show confirmation
          App.exitApp();
        }
      });

      console.log('App listeners configured');
    } catch (error) {
      console.error('Error configuring app listeners:', error);
    }
  }

  private static async configureNetworkMonitoring(): Promise<void> {
    if (!Capacitor.isPluginAvailable('Network')) {
      console.log('Network plugin not available');
      return;
    }

    try {
      // Monitor network status
      const status = await Network.getStatus();
      console.log('Network status:', status);

      Network.addListener('networkStatusChange', (status) => {
        console.log('Network status changed:', status);
        if (!status.connected) {
          // Show offline message
          console.warn('Device is offline');
        } else {
          // Hide offline message
          console.log('Device is online');
        }
      });

      console.log('Network monitoring configured');
    } catch (error) {
      console.error('Error configuring network monitoring:', error);
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

    if (!Capacitor.isPluginAvailable('Device')) {
      console.log('Device plugin not available');
      return null;
    }

    try {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();
      console.log('Device info:', info);
      return info;
    } catch (error) {
      console.error('Error getting device info:', error);
      return null;
    }
  }
}
