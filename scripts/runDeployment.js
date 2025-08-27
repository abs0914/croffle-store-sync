const { execSync } = require('child_process');

try {
  console.log('🚀 Running product deployment to all stores...');
  const output = execSync('node scripts/deployMissingProductsToAllStores.cjs --apply', { 
    encoding: 'utf8', 
    stdio: 'inherit' 
  });
  console.log('✅ Deployment completed successfully!');
} catch (error) {
  console.error('❌ Deployment failed:', error.message);
  process.exit(1);
}