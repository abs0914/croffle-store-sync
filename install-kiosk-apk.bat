@echo off
setlocal enabledelayedexpansion

REM Croffle Store POS Kiosk - APK Installation Script
REM This script installs the kiosk APK on connected Android devices

echo 🚀 Croffle Store POS Kiosk - APK Installer
echo ==========================================

REM Check if ADB is available
where adb >nul 2>nul
if errorlevel 1 (
    echo [ERROR] ADB not found. Please install Android SDK Platform Tools.
    echo Download from: https://developer.android.com/studio/releases/platform-tools
    pause
    exit /b 1
)

REM Check for connected devices
echo [INFO] Checking for connected Android devices...
adb devices > devices.tmp
findstr /C:"device" devices.tmp | findstr /V /C:"List of devices" > connected.tmp

if not exist connected.tmp (
    echo [ERROR] No Android devices connected.
    echo Please connect your device via USB and enable USB debugging.
    del devices.tmp 2>nul
    pause
    exit /b 1
)

for /f %%i in (connected.tmp) do (
    echo [SUCCESS] Found device: %%i
)

del devices.tmp connected.tmp 2>nul

REM Check for APK files
set DEBUG_APK=android\app\build\outputs\apk\debug\app-debug.apk
set RELEASE_APK=android\app\build\outputs\apk\release\app-release-unsigned.apk

echo.
echo 📱 Available APK Files:
echo ======================

if exist "%DEBUG_APK%" (
    echo [1] Debug APK: %DEBUG_APK%
    for %%A in ("%DEBUG_APK%") do echo     Size: %%~zA bytes
    set HAS_DEBUG=1
) else (
    echo [1] Debug APK: Not found
    set HAS_DEBUG=0
)

if exist "%RELEASE_APK%" (
    echo [2] Release APK: %RELEASE_APK%
    for %%A in ("%RELEASE_APK%") do echo     Size: %%~zA bytes
    set HAS_RELEASE=1
) else (
    echo [2] Release APK: Not found
    set HAS_RELEASE=0
)

if %HAS_DEBUG%==0 if %HAS_RELEASE%==0 (
    echo [ERROR] No APK files found. Please build the project first.
    echo Run: build-kiosk-apk.bat
    pause
    exit /b 1
)

echo.
echo 🔧 Installation Options:
echo ========================
if %HAS_DEBUG%==1 echo [1] Install Debug APK (for testing)
if %HAS_RELEASE%==1 echo [2] Install Release APK (for production)
echo [3] Uninstall existing app
echo [4] Exit

echo.
set /p choice="Select option (1-4): "

if "%choice%"=="1" (
    if %HAS_DEBUG%==1 (
        echo [INFO] Installing Debug APK...
        adb install -r "%DEBUG_APK%"
        if errorlevel 1 (
            echo [ERROR] Installation failed
        ) else (
            echo [SUCCESS] Debug APK installed successfully!
        )
    ) else (
        echo [ERROR] Debug APK not available
    )
) else if "%choice%"=="2" (
    if %HAS_RELEASE%==1 (
        echo [INFO] Installing Release APK...
        adb install -r "%RELEASE_APK%"
        if errorlevel 1 (
            echo [ERROR] Installation failed
        ) else (
            echo [SUCCESS] Release APK installed successfully!
        )
    ) else (
        echo [ERROR] Release APK not available
    )
) else if "%choice%"=="3" (
    echo [INFO] Uninstalling existing app...
    adb uninstall com.crofflestore.pos.kiosk
    if errorlevel 1 (
        echo [WARNING] App may not have been installed
    ) else (
        echo [SUCCESS] App uninstalled successfully!
    )
) else if "%choice%"=="4" (
    echo [INFO] Exiting...
    exit /b 0
) else (
    echo [ERROR] Invalid choice
    pause
    exit /b 1
)

echo.
echo 📋 Next Steps:
echo ==============
echo 1. Launch "Croffle Store POS Kiosk" app on your device
echo 2. Grant required permissions (Camera, Bluetooth, Location)
echo 3. Verify the app loads https://crofflestore.pvosyncpos.com/
echo 4. Test kiosk restrictions (back button, navigation)
echo 5. Test POS functionality (camera, Bluetooth printer)

echo.
echo 🎉 Installation completed!
pause
