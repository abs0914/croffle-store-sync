# 📱 Croffle Store POS - Android Mobile App Build Guide

## 🎯 Overview

This guide explains how to build and deploy the Croffle Store POS application as an Android mobile app. The app functions as a browser wrapper that loads `https://crofflestore.pvosyncpos.com/` in a native Android webview.

## 📋 Prerequisites

### Required Software:
1. **Node.js** (v16 or higher)
2. **Android Studio** (latest version)
3. **Java Development Kit (JDK)** (v11 or higher)
4. **Android SDK** (API level 24 or higher)

### Android Studio Setup:
1. Install Android Studio from https://developer.android.com/studio
2. Install Android SDK Platform-Tools
3. Install Android SDK Build-Tools
4. Create an Android Virtual Device (AVD) or connect a physical device

## 🚀 Build Commands

### Development Build:
```bash
# Build and run on connected device/emulator
npm run mobile:dev

# Or step by step:
npm run build:dev
npx cap sync
npx cap run android
```

### Production Build:
```bash
# Build production APK
npm run mobile:build

# Or step by step:
npm run build
npx cap sync
npx cap build android
```

### Individual Commands:
```bash
# Build web assets
npm run build

# Sync with Capacitor
npx cap sync

# Open Android Studio
npx cap open android

# Run on device
npx cap run android

# Build APK
npx cap build android
```

## 📱 App Configuration

### App Details:
- **App ID**: `com.crofflestore.pos`
- **App Name**: `Croffle Store POS`
- **Target URL**: `https://crofflestore.pvosyncpos.com/`
- **Minimum Android Version**: API 24 (Android 7.0)

### Features Included:
- ✅ Native Android webview
- ✅ Status bar configuration
- ✅ Splash screen
- ✅ Keyboard handling
- ✅ Network monitoring
- ✅ Back button handling
- ✅ App state management
- ✅ Bluetooth LE support (for printers)

## 🔧 Customization

### App Icon & Splash Screen:
1. Place your app icon in `android/app/src/main/res/mipmap-*/`
2. Place splash screen images in `android/app/src/main/res/drawable-*/`
3. Update `capacitor.config.ts` for splash screen settings

### App Permissions:
Edit `android/app/src/main/AndroidManifest.xml` to add/remove permissions:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.BLUETOOTH" />
<uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
```

### Webview Settings:
Modify `capacitor.config.ts` to adjust webview behavior:
```typescript
android: {
  allowMixedContent: true,
  captureInput: true,
  webContentsDebuggingEnabled: true, // Set to false for production
  appendUserAgent: "CroffleStorePOS/1.0",
}
```

## 🐛 Troubleshooting

### Common Issues:

1. **Build Fails**:
   - Ensure Android SDK is properly installed
   - Check Java version compatibility
   - Run `npx cap doctor` to verify setup

2. **App Doesn't Load Target URL**:
   - Check internet connectivity
   - Verify URL in `capacitor.config.ts`
   - Check network permissions in AndroidManifest.xml

3. **Plugins Not Working**:
   - Run `npx cap sync` after installing new plugins
   - Check plugin compatibility with Capacitor version

### Debug Mode:
- Enable webview debugging in `capacitor.config.ts`
- Use Chrome DevTools to debug webview content
- Check Android Studio logcat for native errors

## 📦 Distribution

### Generate Signed APK:
1. Open Android Studio: `npx cap open android`
2. Go to Build → Generate Signed Bundle/APK
3. Follow the signing wizard
4. Choose APK and configure signing key
5. Build release APK

### Google Play Store:
1. Generate signed AAB (Android App Bundle)
2. Upload to Google Play Console
3. Complete store listing and compliance
4. Submit for review

## 🔄 Updates

### Updating the App:
1. Make changes to web assets or configuration
2. Run `npm run build`
3. Run `npx cap sync`
4. Rebuild and redistribute

### Updating Capacitor:
```bash
npm update @capacitor/core @capacitor/cli @capacitor/android
npx cap sync
```

## 📞 Support

For issues related to:
- **Capacitor**: https://capacitorjs.com/docs
- **Android Development**: https://developer.android.com/docs
- **App-specific issues**: Check the main project documentation

---

**Note**: This mobile app serves as a browser wrapper for the Croffle Store POS web application. All business logic and data processing happens on the web server at `https://crofflestore.pvosyncpos.com/`.
