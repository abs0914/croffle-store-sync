# 📱 Croffle Store POS - Kiosk APK Documentation

## 🎯 Overview

The Croffle Store POS Kiosk APK is a dedicated Android application that serves as a native browser wrapper for the croffle-store-sync POS web application. It provides a secure, kiosk-style interface that loads exclusively from `https://crofflestore.pvosyncpos.com/` while maintaining all existing functionality including thermal printer integration and camera-based scanning.

## 🏗️ Architecture

### Core Components

1. **MainActivity.java** - Custom Android Activity that replaces Capacitor's default behavior
   - Implements WebView-based kiosk browser
   - Handles URL filtering and navigation restrictions
   - Manages permissions and device lifecycle

2. **AndroidManifest.xml** - Configured for kiosk operation
   - Required permissions for camera, Bluetooth, and location
   - Kiosk mode intent filters
   - Hardware acceleration and security settings

3. **Build Configuration** - Optimized for production deployment
   - Separate debug and release builds
   - ProGuard optimization for release
   - Kiosk-specific application ID

## 🔧 Key Features

### Kiosk Mode Functionality
- **URL Restriction**: Only allows navigation within `crofflestore.pvosyncpos.com` domain
- **Immersive UI**: Full-screen mode with hidden system navigation
- **Back Button Disabled**: Prevents accidental navigation away from POS
- **Screen Wake Lock**: Keeps screen active during POS operations
- **Auto-Retry**: Automatic reconnection on network failures

### POS Integration
- **Thermal Printer Support**: Web Bluetooth API enabled for printer connectivity
- **Camera Access**: Runtime permissions for barcode/QR code scanning
- **Touch Optimization**: Responsive touch handling for POS hardware
- **Landscape Orientation**: Optimized for typical POS tablet setups

### Security & Reliability
- **Network Monitoring**: Automatic detection and handling of connectivity issues
- **Permission Management**: Runtime permission requests for required features
- **Error Handling**: Graceful degradation and user feedback
- **Hardware Acceleration**: Optimized performance for smooth operation

## 🚀 Building the APK

### Prerequisites
- Node.js (v16 or higher)
- Android Studio with SDK
- Java Development Kit (JDK 8 or higher)
- Capacitor CLI

### Build Commands

#### Using Build Scripts (Recommended)
```bash
# Linux/macOS
chmod +x build-kiosk-apk.sh
./build-kiosk-apk.sh

# Windows
build-kiosk-apk.bat
```

#### Manual Build Process
```bash
# 1. Build web application
npm run build

# 2. Sync Capacitor
npx cap sync android

# 3. Build APK
cd android
./gradlew assembleDebug    # For testing
./gradlew assembleRelease  # For production
```

### Output Files
- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk`
- **Release APK**: `android/app/build/outputs/apk/release/app-release-unsigned.apk`

## 📋 Installation & Deployment

### Development Testing
```bash
# Install debug APK via ADB
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Enable USB debugging on target device
# Allow installation from unknown sources
```

### Production Deployment
1. **Sign the Release APK**
   ```bash
   # Generate keystore (first time only)
   keytool -genkey -v -keystore croffle-pos.jks -keyalg RSA -keysize 2048 -validity 10000 -alias croffle-pos

   # Sign the APK
   jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore croffle-pos.jks app-release-unsigned.apk croffle-pos
   
   # Align the APK
   zipalign -v 4 app-release-unsigned.apk croffle-pos-kiosk.apk
   ```

2. **Distribute to Devices**
   - Install via ADB for individual devices
   - Use Mobile Device Management (MDM) for fleet deployment
   - Upload to private app store or distribution platform

## 🧪 Testing Checklist

### Core Functionality
- [ ] App launches and loads target URL
- [ ] Kiosk mode prevents navigation away from domain
- [ ] Back button is disabled/blocked
- [ ] Immersive mode hides system UI
- [ ] Screen stays active during use

### POS Features
- [ ] Camera permissions granted and functional
- [ ] Barcode/QR scanning works within WebView
- [ ] Bluetooth permissions granted
- [ ] Thermal printer discovery and connection
- [ ] Receipt printing functionality
- [ ] Touch interactions responsive

### Network & Error Handling
- [ ] Graceful handling of network disconnection
- [ ] Auto-retry mechanism works
- [ ] Error page displays on connection failure
- [ ] Recovery when network restored

### Device Integration
- [ ] Orientation lock to landscape works
- [ ] Hardware acceleration enabled
- [ ] Performance acceptable on target hardware
- [ ] Memory usage within acceptable limits

## 🔧 Configuration Options

### URL Configuration
To change the target URL, modify `MainActivity.java`:
```java
private static final String TARGET_URL = "https://your-domain.com/";
```

### Kiosk Restrictions
To modify URL filtering, update the `shouldOverrideUrlLoading` method in `KioskWebViewClient`.

### Permissions
Add or remove permissions in `AndroidManifest.xml` based on your requirements.

## 🐛 Troubleshooting

### Common Issues

**APK Won't Install**
- Check if device allows installation from unknown sources
- Verify APK is properly signed for production
- Ensure sufficient storage space

**Camera Not Working**
- Verify camera permissions granted
- Check if device has camera hardware
- Test camera access in device settings

**Bluetooth Printer Issues**
- Confirm Bluetooth permissions granted
- Check if Web Bluetooth API is supported
- Verify printer compatibility with existing web app

**Network Connection Problems**
- Test network connectivity outside the app
- Check firewall/proxy settings
- Verify target URL is accessible

### Debug Information
Enable debug mode by modifying `capacitor.config.ts`:
```typescript
android: {
  webContentsDebuggingEnabled: true,
  loggingBehavior: "debug",
}
```

## 📞 Support

For technical support:
1. Check existing documentation in the project repository
2. Review Android logs using `adb logcat`
3. Test functionality in a standard web browser first
4. Verify all prerequisites are properly installed

## 🔄 Updates

To update the kiosk APK:
1. Increment version numbers in `android/app/build.gradle`
2. Rebuild and test the APK
3. Sign with the same keystore for production
4. Deploy to devices using your chosen distribution method

---

**Note**: This kiosk APK is specifically designed for dedicated POS hardware. For general mobile use, consider the standard Capacitor mobile app configuration.
