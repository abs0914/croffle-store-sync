
#!/bin/bash

# Croffle Store POS - Web Build Script
# This script builds the web application for deployment to web hosting

set -e

echo "🌐 Building Croffle Store POS for Web Deployment..."
echo "=================================================="

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

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: Clean previous builds
print_status "Cleaning previous builds..."
if [ -d "dist" ]; then
    rm -rf dist
fi

# Step 2: Build the web application
print_status "Building web application..."
npm run build

if [ $? -eq 0 ]; then
    print_success "Web build completed successfully!"
    
    # Show build size
    if [ -d "dist" ]; then
        BUILD_SIZE=$(du -sh dist | cut -f1)
        echo "Build size: $BUILD_SIZE"
    fi
    
    echo ""
    echo "📋 Next Steps:"
    echo "=============="
    echo "1. Deploy the 'dist' folder to your web hosting service"
    echo "2. Configure your web server to serve the index.html for all routes"
    echo "3. Test the deployment to ensure all features work correctly"
    echo "4. Verify that Capacitor plugins gracefully fallback in web environment"
    echo ""
    print_success "Web build process completed! 🚀"
else
    print_error "Web build failed!"
    exit 1
fi
