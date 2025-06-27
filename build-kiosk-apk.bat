
@echo off
setlocal enabledelayedexpansion

REM Croffle Store POS Kiosk - APK Build Script (Windows)
REM This script builds the Android APK for the kiosk browser application

echo 🏗️  Building Croffle Store POS Kiosk APK...
echo ================================================

REM Check if we're in the right directory
if not exist "capacitor.config.ts" (
    echo [ERROR] capacitor.config.ts not found. Please run this script from the project root.
    exit /b 1
)

REM Check if Android directory exists
if not exist "android" (
    echo [ERROR] Android directory not found. Please ensure Capacitor Android platform is added.
    exit /b 1
)

REM Step 1: Clean previous builds
echo [INFO] Cleaning previous builds...
if exist "dist" rmdir /s /q "dist"

REM Step 2: Build the web application for kiosk mode
echo [INFO] Building web application for kiosk mode...
set BUILD_TARGET=kiosk
call npm run build
if errorlevel 1 (
    echo [ERROR] Web build failed
    exit /b 1
)

REM Step 3: Sync Capacitor
echo [INFO] Syncing Capacitor...
call npx cap sync android
if errorlevel 1 (
    echo [ERROR] Capacitor sync failed
    exit /b 1
)

REM Step 4: Build Android APK
echo [INFO] Building Android APK...
cd android

REM Clean previous Android builds
echo [INFO] Cleaning Android build...
call gradlew.bat clean

REM Build debug APK
echo [INFO] Building debug APK...
call gradlew.bat assembleDebug
if errorlevel 1 (
    echo [ERROR] Debug build failed
    cd ..
    exit /b 1
)

REM Build release APK (unsigned)
echo [INFO] Building release APK...
call gradlew.bat assembleRelease
if errorlevel 1 (
    echo [ERROR] Release build failed
    cd ..
    exit /b 1
)

cd ..

REM Step 5: Locate and display APK files
echo [SUCCESS] Build completed successfully!
echo.
echo 📱 APK Files Generated:
echo =======================

set DEBUG_APK=android\app\build\outputs\apk\debug\app-debug.apk
set RELEASE_APK=android\app\build\outputs\apk\release\app-release-unsigned.apk

if exist "%DEBUG_APK%" (
    echo [SUCCESS] Debug APK: %DEBUG_APK%
    for %%A in ("%DEBUG_APK%") do echo            Size: %%~zA bytes
) else (
    echo [WARNING] Debug APK not found
)

if exist "%RELEASE_APK%" (
    echo [SUCCESS] Release APK: %RELEASE_APK%
    for %%A in ("%RELEASE_APK%") do echo             Size: %%~zA bytes
) else (
    echo [WARNING] Release APK not found
)

echo.
echo 📋 Next Steps:
echo ==============
echo 1. For testing: Install the debug APK on your device
echo    adb install "%DEBUG_APK%"
echo.
echo 2. For production: Sign the release APK with your keystore
echo    Use Android Studio or command line signing tools
echo.
echo 3. Test the following features:
echo    - URL loading and kiosk restrictions
echo    - Camera permissions for barcode scanning
echo    - Bluetooth permissions for thermal printer
echo    - Network error handling and retry
echo    - Immersive mode and navigation blocking
echo.
echo [SUCCESS] Kiosk APK build process completed! 🎉

pause
