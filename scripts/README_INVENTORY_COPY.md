# Inventory Copy Scripts

This directory contains scripts for copying inventory data between stores in the croffle-store-sync system.

## Scripts

### 1. `copyInventoryToNewStores.cjs`

**Purpose**: Copies all inventory data from "Sugbo Mercado (IT Park, Cebu)" to specified target stores.

**Features**:
- Authenticates using admin credentials
- Finds source store by name
- Creates target stores if they don't exist
- Copies all inventory items from `inventory_stock` table
- Handles duplicate detection (skips existing items)
- Provides detailed logging and progress reports
- Batch processing for efficiency

**Usage**:
```bash
node scripts/copyInventoryToNewStores.cjs
```

**What it copies**:
- Item names and descriptions
- Stock quantities
- Units of measurement
- Costs and pricing
- SKU codes
- Minimum thresholds
- All other inventory metadata

### 2. `verifyInventoryCopy.cjs`

**Purpose**: Verifies that inventory was successfully copied and provides detailed comparison reports.

**Features**:
- Compares source and target inventories
- Reports matched, missing, and extra items
- Calculates completeness percentages
- Lists specific items that are missing or extra
- Provides summary statistics

**Usage**:
```bash
node scripts/verifyInventoryCopy.cjs
```

## Configuration

Both scripts are configured to work with:

**Source Store**: `Sugbo Mercado (IT Park, Cebu)`

**Target Stores**:
- `SM City Cebu`
- `SM Savemore Tacloban`

To modify the target stores, edit the `TARGET_STORES` array in both scripts.

## Database Tables

The scripts work with the following database structure:

### `stores` table
- Store information and metadata
- Used to find/create store records

### `inventory_stock` table (Store-level inventory)
- `id` - Unique identifier
- `store_id` - Reference to stores table
- `item` - Item name/description
- `unit` - Unit of measurement
- `stock_quantity` - Current stock level
- `minimum_threshold` - Reorder point
- `cost` - Item cost
- `sku` - Stock keeping unit
- `is_active` - Active status
- Other metadata fields

## Authentication

Scripts use admin credentials:
- Email: `admin@example.com`
- Password: `password123`

## Error Handling

The scripts include comprehensive error handling for:
- Authentication failures
- Network connectivity issues
- Database constraint violations
- Missing stores or data
- Duplicate item detection

## Logging

Both scripts provide detailed console output including:
- Step-by-step progress
- Success/failure indicators
- Item counts and statistics
- Error messages with context
- Summary reports

## Example Output

### Copy Operation
```
🚀 Starting inventory copy process...

🔐 Authenticating as admin...
✅ Authentication successful

🔍 Finding source store: Sugbo Mercado (IT Park, Cebu)
✅ Found source store: Sugbo Mercado (IT Park, Cebu) (ID: d7c47e6b-f20a-4543-a6bd-000398f72df5)

📋 Fetching source inventory...
✅ Found 37 inventory items in source store

📋 Sample inventory items:
   - REGULAR CROISSANT: 124 Pieces (Cost: ₱N/A)
   - WHIPPED CREAM: 128 Serving (Cost: ₱N/A)
   - Chocolate: 75 Portion (Cost: ₱N/A)

🏪 Processing target store: SM City Cebu
   ✅ Found existing store: SM City Cebu (ID: c3bfe728-1550-4f4d-af04-12899f3b276b)

📦 Copying inventory to SM City Cebu...
   ✅ Successfully copied 37 inventory items
   ℹ️  Skipped 0 existing items

📊 COPY OPERATION SUMMARY
==================================================
Source Store: Sugbo Mercado (IT Park, Cebu)
Source Inventory Items: 37

✅ SM City Cebu:
   - Copied: 37 items
   - Skipped: 0 items (already existed)

📈 Total Items Copied: 37
⚠️  Total Items Skipped: 0

🎉 Inventory copy operation completed successfully!
```

### Verification
```
🔍 Starting inventory verification...

📊 VERIFICATION SUMMARY
==================================================
Source Store: Sugbo Mercado (IT Park, Cebu)
Source Inventory Items: 37

✅ SM City Cebu:
   - Total items: 37
   - Matched: 37
   - Missing: 0
   - Extra: 0
   - Completeness: 100.0%

📈 Stores verified: 1/1
✅ Complete copies: 1/1

🎉 All inventory copies are complete and verified!
```

## Notes

- Scripts are designed to be idempotent (safe to run multiple times)
- Existing items are skipped to prevent duplicates
- All operations are logged for audit purposes
- Scripts follow the existing project patterns for database operations
- Uses the same authentication and database connection as the main application
