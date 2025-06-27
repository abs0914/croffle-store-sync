
#!/bin/bash

# Croffle Store POS Kiosk - APK Build Script
# This script builds the Android APK for the kiosk browser application

set -e

echo "🏗️  Building Croffle Store POS Kiosk APK..."
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "capacitor.config.ts" ]; then
    print_error "capacitor.config.ts not found. Please run this script from the project root."
    exit 1
fi

# Check if Android directory exists
if [ ! -d "android" ]; then
    print_error "Android directory not found. Please ensure Capacitor Android platform is added."
    exit 1
fi

# Step 1: Clean previous builds
print_status "Cleaning previous builds..."
if [ -d "dist" ]; then
    rm -rf dist
fi

# Step 2: Build the web application for kiosk mode
print_status "Building web application for kiosk mode..."
BUILD_TARGET=kiosk npm run build

# Step 3: Sync Capacitor
print_status "Syncing Capacitor..."
npx cap sync android

# Step 4: Build Android APK
print_status "Building Android APK..."
cd android

# Clean previous Android builds
./gradlew clean

# Build debug APK
print_status "Building debug APK..."
./gradlew assembleDebug

# Build release APK (unsigned)
print_status "Building release APK..."
./gradlew assembleRelease

cd ..

# Step 5: Locate and display APK files
print_success "Build completed successfully!"
echo ""
echo "📱 APK Files Generated:"
echo "======================="

DEBUG_APK="android/app/build/outputs/apk/debug/app-debug.apk"
RELEASE_APK="android/app/build/outputs/apk/release/app-release-unsigned.apk"

if [ -f "$DEBUG_APK" ]; then
    print_success "Debug APK: $DEBUG_APK"
    APK_SIZE=$(du -h "$DEBUG_APK" | cut -f1)
    echo "           Size: $APK_SIZE"
else
    print_warning "Debug APK not found"
fi

if [ -f "$RELEASE_APK" ]; then
    print_success "Release APK: $RELEASE_APK"
    APK_SIZE=$(du -h "$RELEASE_APK" | cut -f1)
    echo "            Size: $APK_SIZE"
else
    print_warning "Release APK not found"
fi

echo ""
echo "📋 Next Steps:"
echo "=============="
echo "1. For testing: Install the debug APK on your device"
echo "   adb install $DEBUG_APK"
echo ""
echo "2. For production: Sign the release APK with your keystore"
echo "   jarsigner -verbose -sigalg SHA1withRSA -digestalg SHA1 -keystore your-keystore.jks $RELEASE_APK your-alias"
echo ""
echo "3. Test the following features:"
echo "   - URL loading and kiosk restrictions"
echo "   - Camera permissions for barcode scanning"
echo "   - Bluetooth permissions for thermal printer"
echo "   - Network error handling and retry"
echo "   - Immersive mode and navigation blocking"
echo ""
print_success "Kiosk APK build process completed! 🎉"
