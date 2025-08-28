# Product Catalog Constraint Violation Fix

## Problem Description

You're experiencing a database constraint violation error when updating products in the Product Catalog system:

- **Error Code**: 23505
- **Error Message**: "duplicate key value violates unique constraint 'products_store_id_sku_key'"
- **HTTP Status**: 409 Conflict
- **Affected Products**: "Tiramisu Croffle", "Caramel Delight Croffle", and others

## Root Cause Analysis

The issue is caused by multiple factors:

1. **Duplicate SKU Generation**: The SKU generation function may create identical SKUs for different products
2. **Synchronization Conflicts**: Triggers that sync between `product_catalog` and `products` tables can create duplicate entries
3. **Multiple Constraint Systems**: Various unique constraints and triggers can conflict with each other
4. **Data Integrity Issues**: Existing duplicate data in the database

## Solution Overview

The fix addresses these issues by:

1. **Identifying Duplicates**: Finding existing duplicate SKUs and product names
2. **Cleaning Data**: Removing or fixing duplicate entries
3. **Improving Sync Logic**: Creating conflict-resistant synchronization functions
4. **Preventing Future Issues**: Implementing better constraint handling

## Execution Instructions

### Step 1: Backup Your Database

**CRITICAL**: Always backup your database before running any fixes:

```sql
-- Create a backup of critical tables
CREATE TABLE products_backup AS SELECT * FROM products;
CREATE TABLE product_catalog_backup AS SELECT * FROM product_catalog;
```

### Step 2: Execute the Fix Script

Run the fix script in your Supabase SQL editor:

```bash
# Navigate to the fix directory
cd database/fixes

# Execute the fix script
# Copy and paste the contents of fix_product_catalog_constraint_violation.sql
# into your Supabase SQL editor and execute
```

### Step 3: Monitor the Execution

The script will output progress messages. Look for:

- ✅ **SUCCESS messages**: Indicating successful fixes
- ⚠️ **WARNING messages**: Indicating issues that need attention
- 📊 **Analysis results**: Showing what duplicates were found and fixed

### Step 4: Verify the Fix

After execution, verify that:

1. **No Duplicate SKUs**: Check that no products share the same store_id + sku combination
2. **No Duplicate Names**: Check that no active products share the same store_id + name combination
3. **Triggers Working**: Test updating a product in product_catalog to ensure sync works

### Step 5: Test Product Updates

Try updating the previously failing products:

```javascript
// Test the update that was failing before
const { error } = await supabase
  .from('product_catalog')
  .update({ price: 35.00 })
  .eq('id', '20ca59d3-fd72-4888-81a9-f88b67f71abc');

if (error) {
  console.error('Update still failing:', error);
} else {
  console.log('Update successful!');
}
```

## What the Fix Does

### 1. Data Analysis
- Identifies duplicate SKUs across store_id combinations
- Finds duplicate product names for active products
- Locates orphaned product_catalog entries

### 2. Conflict Resolution
- Regenerates unique SKUs for duplicate entries
- Deactivates older duplicate products (keeps newest)
- Ensures data consistency between tables

### 3. Improved Synchronization
- Creates a conflict-resistant sync function
- Handles edge cases gracefully
- Prevents future constraint violations

### 4. Constraint Management
- Temporarily disables problematic triggers during fix
- Re-enables triggers with improved logic
- Maintains data integrity throughout the process

## Expected Results

After running the fix:

- ✅ Product catalog updates should work without constraint violations
- ✅ No duplicate SKUs in the products table
- ✅ No duplicate active product names per store
- ✅ Improved synchronization between product_catalog and products tables
- ✅ Better error handling for future conflicts

## Rollback Plan

If issues occur, you can rollback using the backup tables:

```sql
-- Rollback products table
TRUNCATE products;
INSERT INTO products SELECT * FROM products_backup;

-- Rollback product_catalog table
TRUNCATE product_catalog;
INSERT INTO product_catalog SELECT * FROM product_catalog_backup;

-- Drop backup tables after successful verification
DROP TABLE products_backup;
DROP TABLE product_catalog_backup;
```

## Prevention Measures

To prevent future occurrences:

1. **Use the improved sync function** (automatically installed by the fix)
2. **Monitor for duplicate data** regularly
3. **Test product updates** in development before production
4. **Implement proper error handling** in your application code

## Support

If you encounter issues:

1. Check the execution output for specific error messages
2. Verify your database backup is intact
3. Review the constraint analysis results
4. Test individual components (SKU generation, product sync, etc.)

## Technical Details

### Key Functions Modified/Created:
- `sync_product_catalog_to_products_safe()`: Improved sync function
- `fix_duplicate_skus()`: Temporary function for cleaning duplicates
- `fix_duplicate_product_names()`: Temporary function for handling name conflicts

### Constraints Addressed:
- `products_store_id_sku_key`: The main constraint causing the error
- `products_store_name_unique`: Store + name uniqueness
- `idx_products_unique_active_name_store`: Active product name uniqueness

### Triggers Modified:
- `sync_catalog_to_products_trigger`: Replaced with safer version
- `enhanced_product_uniqueness_trigger`: Temporarily disabled during fix
