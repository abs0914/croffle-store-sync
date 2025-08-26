# Glaze Powder Deployment Scripts

This folder contains scripts for deploying Glaze Powder inventory to all stores in the croffle-store-sync system.

## Scripts

### 1. deployGlazePowder.cjs
**Purpose**: Deploy 20,000 grams of Glaze Powder to all active stores

**Usage**:
```bash
node scripts/deployGlazePowder.cjs
```

**What it does**:
- Authenticates as admin user
- Fetches all active stores from the database
- Checks for existing Glaze Powder inventory
- Creates or updates Glaze Powder inventory (20,000g) for each store
- Sets cost at ₱0.008 per gram (₱8 per kg)
- Sets minimum threshold at 1,000g
- Provides detailed deployment summary

**Output**:
- Lists all stores being processed
- Shows success/failure for each store
- Displays total deployment statistics
- Reports total inventory value

### 2. verifyGlazePowderDeployment.cjs
**Purpose**: Verify that Glaze Powder has been successfully deployed to all stores

**Usage**:
```bash
node scripts/verifyGlazePowderDeployment.cjs
```

**What it does**:
- Authenticates as admin user
- Fetches all active stores
- Checks Glaze Powder inventory for each store
- Provides verification summary with quantities and values
- Identifies any stores missing Glaze Powder

**Output**:
- Lists inventory status for each store
- Shows total quantities and values
- Confirms successful deployment or identifies issues

## Deployment Details

### Inventory Specifications
- **Item Name**: Glaze Powder
- **Quantity**: 20,000 grams per store
- **Unit**: grams (g)
- **Cost**: ₱0.008 per gram (₱8 per kg)
- **Minimum Threshold**: 1,000 grams
- **Total Value per Store**: ₱160.00

### Database Tables
- **Primary Table**: `inventory_stock`
- **Fields Updated**:
  - `store_id`: Store identifier
  - `item`: "Glaze Powder"
  - `unit`: "g"
  - `stock_quantity`: 20000
  - `cost`: 0.008
  - `minimum_threshold`: 1000
  - `is_active`: true

## Authentication
Both scripts use admin credentials:
- **Email**: admin@example.com
- **Password**: password123

## Error Handling
- Scripts include comprehensive error handling
- Failed deployments are logged with specific error messages
- Verification script identifies missing inventory
- Both scripts provide detailed success/failure summaries

## Re-running Scripts
- **deployGlazePowder.cjs**: Can be run multiple times safely
  - Updates existing inventory if already present
  - Creates new inventory if not present
- **verifyGlazePowderDeployment.cjs**: Can be run anytime to check status

## Example Output

### Successful Deployment
```
🚀 Starting Glaze Powder deployment to all stores...
✅ Found 6 active stores
✅ Successfully deployed to 6 stores
📦 Total Glaze Powder deployed: 120000g
💰 Total inventory value: ₱960.00
🎉 All stores successfully updated with Glaze Powder inventory!
```

### Successful Verification
```
🔍 Verifying Glaze Powder deployment...
✅ Stores with Glaze Powder: 6/6
📦 Total Glaze Powder deployed: 120000g
💰 Total inventory value: ₱960.00
🎉 SUCCESS: All stores have Glaze Powder inventory!
```

## Notes
- Scripts use the Supabase REST API for database operations
- All operations are logged with detailed status messages
- Inventory is added to the `inventory_stock` table for each store
- Cost calculation: 20,000g × ₱0.008/g = ₱160.00 per store
