<<<<<<< HEAD
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.croffle.storesync',
  appName: 'Croffle Store Sync',
  webDir: 'dist'
=======

import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crofflestore.pos',
  appName: 'Croffle Store POS Kiosk',
  webDir: 'dist',
  // Note: For kiosk mode, the URL is handled directly in MainActivity
  // This configuration is kept for compatibility but not used in kiosk mode
  server: {
    url: 'https://crofflestore.pvosyncpos.com/',
    cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000,
      launchAutoHide: true,
      backgroundColor: "#ffffff",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: true,
      androidSpinnerStyle: "large",
      iosSpinnerStyle: "small",
      spinnerColor: "#007bff",
      splashFullScreen: true,
      splashImmersive: true,
      layoutName: "launch_screen",
      useDialog: false,
    },
    StatusBar: {
      style: "LIGHT",
      backgroundColor: "#ffffff",
      overlay: false,
    },
    Keyboard: {
      resize: "body",
      style: "light",
      resizeOnFullScreen: true,
    },
    App: {
      appendUserAgent: "CroffleStorePOSKiosk/1.0",
    },
    Device: {
      // Enable device info for debugging
    },
    Network: {
      // Enable network monitoring
    },
    Haptics: {
      // Enable haptic feedback for touch interactions
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false, // Disable in production
    appendUserAgent: "CroffleStorePOSKiosk/1.0",
    overrideUserAgent: "Mozilla/5.0 (Linux; Android 12; SM-T870) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 CroffleStorePOSKiosk/1.0",
    backgroundColor: "#ffffff",
    loggingBehavior: "none", // Disable logging in production
    mixedContentMode: "always_allow",
    themeColor: "#ffffff",
    toolbarColor: "#ffffff",
    // Kiosk-specific settings
    hideLogs: true,
    minWebViewVersion: 120,
    // Enable hardware acceleration
    hardwareAccelerated: true,
    // Optimize for kiosk performance
    useLegacyBridge: false,
    // Viewport and scaling optimizations
    initialScale: 1.0,
    minimumScale: 1.0,
    maximumScale: 1.0,
    userScalable: false,
    // WebView performance settings
    cacheMode: "LOAD_DEFAULT",
    mixedContentMode: "always_allow",
  },
>>>>>>> 84181ad48801591cc84f3da69c5078f7b74dbb92
};

export default config;
