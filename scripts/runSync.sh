#!/bin/bash

echo "🚀 Deploying missing products to all stores..."
echo "====================================================="

# Run the deployment script with --apply flag to actually make changes
node scripts/deployMissingProductsToAllStores.cjs --apply

echo ""
echo "✅ Deployment completed!"
echo "Check above for any errors or warnings."