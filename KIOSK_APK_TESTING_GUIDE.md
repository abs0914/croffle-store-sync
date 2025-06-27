# 🧪 Croffle Store POS Kiosk - Testing & Deployment Guide

## 📱 APK Build Results

### Generated Files
- **Debug APK**: `android/app/build/outputs/apk/debug/app-debug.apk` (3.92 MB)
- **Release APK**: `android/app/build/outputs/apk/release/app-release-unsigned.apk` (0.79 MB)

### APK Details
- **Application ID**: `com.crofflestore.pos.kiosk`
- **Version**: 2.0.0-kiosk
- **Target URL**: https://crofflestore.pvosyncpos.com/
- **Minimum Android**: API 24 (Android 7.0)
- **Target Android**: Latest stable

## 🔧 Installation Instructions

### For Testing (Debug APK)
```bash
# Enable USB debugging on your Android device
# Connect device via USB
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or install directly on device:
# 1. Transfer APK to device
# 2. Enable "Install from unknown sources"
# 3. Tap APK file to install
```

### For Production (Release APK)
```bash
# Sign the release APK first
keytool -genkey -v -keystore croffle-pos-kiosk.jks -keyalg RSA -keysize 2048 -validity 10000 -alias croffle-pos

# Sign the APK
jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore croffle-pos-kiosk.jks app-release-unsigned.apk croffle-pos

# Align the APK
zipalign -v 4 app-release-unsigned.apk croffle-pos-kiosk-signed.apk
```

## ✅ Testing Checklist

### Core Kiosk Functionality
- [ ] **App Launch**: App starts and shows loading screen
- [ ] **URL Loading**: Target URL loads successfully
- [ ] **Kiosk Mode**: Full-screen immersive mode active
- [ ] **Navigation Blocking**: Cannot navigate away from target domain
- [ ] **Back Button**: Back button disabled/blocked
- [ ] **System UI**: Status bar and navigation hidden
- [ ] **Screen Wake**: Screen stays active during use

### Network & Connectivity
- [ ] **Initial Load**: App loads target URL on first launch
- [ ] **Network Error**: Shows error page when offline
- [ ] **Auto Retry**: Automatically retries connection when network restored
- [ ] **WiFi Switch**: Handles WiFi network changes gracefully
- [ ] **Mobile Data**: Works on mobile data connections

### Permissions & Hardware
- [ ] **Camera Permission**: Requests and grants camera access
- [ ] **Bluetooth Permission**: Requests and grants Bluetooth access
- [ ] **Location Permission**: Requests location for Bluetooth scanning
- [ ] **Camera Function**: Camera works for barcode/QR scanning
- [ ] **Bluetooth Discovery**: Can discover Bluetooth devices

### POS Integration
- [ ] **Web App Load**: POS web application loads completely
- [ ] **User Authentication**: Login/authentication works
- [ ] **Inventory Management**: Product scanning and inventory features
- [ ] **Sales Processing**: Transaction processing works
- [ ] **Thermal Printer**: Bluetooth printer discovery and connection
- [ ] **Receipt Printing**: Print receipts successfully
- [ ] **Touch Interface**: Responsive touch interactions

### Performance & Stability
- [ ] **Load Time**: App loads within 5 seconds
- [ ] **Memory Usage**: Stable memory usage during operation
- [ ] **Battery Impact**: Reasonable battery consumption
- [ ] **Long Running**: Stable during extended use (8+ hours)
- [ ] **Orientation**: Handles device rotation properly

## 🚨 Known Issues & Limitations

### Current Limitations
1. **Back Navigation**: Completely disabled - may need admin unlock mechanism
2. **System Access**: Limited access to Android system settings
3. **App Updates**: Requires manual APK replacement
4. **Debugging**: Limited debugging in production builds

### Bluetooth Warnings
- Some deprecation warnings in Bluetooth LE plugin (non-critical)
- Bluetooth permissions may need manual grant on Android 12+

### WebView Compatibility
- Requires Chrome WebView 120+ for optimal performance
- Some older devices may have limited Web Bluetooth support

## 🔧 Configuration Options

### Changing Target URL
Edit `MainActivity.java`:
```java
private static final String TARGET_URL = "https://your-new-domain.com/";
```

### Modifying Permissions
Edit `AndroidManifest.xml` to add/remove permissions as needed.

### Kiosk Behavior
Modify `KioskWebViewClient.shouldOverrideUrlLoading()` to adjust URL filtering.

## 📊 Performance Benchmarks

### Expected Performance
- **App Launch**: 2-3 seconds
- **URL Load**: 3-5 seconds (depending on network)
- **Memory Usage**: 50-100 MB typical
- **Battery Life**: 8-12 hours continuous use

### Optimization Tips
1. Use WiFi for best performance
2. Ensure stable network connection
3. Keep device plugged in for extended use
4. Regular device restarts for long-term stability

## 🚀 Deployment Strategies

### Single Device
1. Install APK directly via USB or file transfer
2. Configure device settings for kiosk mode
3. Set app as default launcher (optional)

### Fleet Deployment
1. Use Mobile Device Management (MDM) solution
2. Create signed APK for distribution
3. Configure devices remotely
4. Monitor and update centrally

### Kiosk Hardware Setup
1. Mount tablet in landscape orientation
2. Secure power connection
3. Configure WiFi with stable connection
4. Test all POS hardware (printer, scanner)

## 🔍 Troubleshooting

### App Won't Start
- Check Android version compatibility
- Verify APK signature (for release builds)
- Clear app data and cache

### Network Issues
- Test target URL in browser
- Check WiFi/mobile data connection
- Verify firewall/proxy settings

### Permission Problems
- Manually grant permissions in Android settings
- Reinstall app if permissions corrupted
- Check device security policies

### Performance Issues
- Restart device
- Clear WebView cache
- Check available storage space
- Update Chrome WebView

## 📞 Support & Maintenance

### Regular Maintenance
- Monitor app performance and stability
- Update APK when web app changes
- Check for Android security updates
- Backup device configurations

### Emergency Procedures
- Keep backup APK files
- Document device unlock procedures
- Maintain contact with technical support
- Have fallback POS solution ready

---

**Success!** 🎉 The Croffle Store POS Kiosk APK has been successfully created and is ready for deployment!
