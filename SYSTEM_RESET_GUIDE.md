# Complete System Reset Guide for Croffle Store Sync

## Overview

This guide provides instructions for performing a complete system reset of the Croffle Store Sync application to prepare for fresh recipe management deployment. The reset clears all existing recipe, inventory, and product catalog data while preserving essential system data like stores, users, and basic configuration.

## ⚠️ Important Warnings

- **This is a destructive operation** - All recipe, inventory, and product catalog data will be permanently deleted
- **Backup your data** before proceeding if you need to preserve any existing information
- **Test in a development environment** first before running in production
- **Ensure you have the master recipe data ready** for upload after the reset

## What Gets Cleared

### Database Tables (Data Only)
- `recipe_templates` - All recipe templates
- `recipes` - All store-specific recipes  
- `recipe_ingredients` - All recipe ingredient relationships
- `recipe_template_ingredients` - All template ingredient relationships
- `inventory_stock` - All store inventory items
- `inventory_items` - Legacy inventory items
- `commissary_inventory` - All commissary items
- `product_catalog` - All product catalog entries
- `product_ingredients` - All product ingredient relationships
- Supporting tables: `recipe_deployments`, `recipe_ingredient_mappings`, `standardized_ingredients`, etc.

### What Gets Preserved
- `stores` - All store information
- `app_users` - All user accounts
- `categories` - Product categories
- `suppliers` - Supplier information
- `purchase_orders` - Order history (inventory references nullified)
- Database structure and functions

### Codebase Cleanup
- Removed hardcoded sample data files
- Cleaned up test fixtures and mock data
- Cleared application caches
- Removed test scripts with hardcoded recipes

## Step-by-Step Reset Process

### Step 1: Pre-Reset Preparation

1. **Backup Critical Data** (if needed)
   ```sql
   -- Run these queries in Supabase SQL Editor to backup data
   CREATE TABLE stores_manual_backup AS SELECT * FROM stores;
   CREATE TABLE users_manual_backup AS SELECT * FROM app_users;
   ```

2. **Verify Master Recipe Data Availability**
   - Ensure you have the complete 61-product recipe data ready
   - Verify the data format matches the expected upload format
   - Test the upload process in a development environment

### Step 2: Execute Database Reset

1. **Run the Reset Migration**
   ```bash
   # Using Supabase CLI
   supabase db push
   
   # Or manually run the migration file in Supabase SQL Editor:
   # supabase/migrations/20250827_complete_system_reset.sql
   ```

2. **Verify Reset Completion**
   The migration includes automatic verification that will output:
   ```
   === SYSTEM RESET VERIFICATION ===
   Recipe templates remaining: 0
   Inventory stock items remaining: 0
   Product catalog items remaining: 0
   Active stores preserved: [number]
   === RESET COMPLETE ===
   ```

### Step 3: Application-Level Reset

1. **Clear Application Caches**
   ```typescript
   // In the application, call:
   import { SystemResetService } from '@/services/system/systemResetService';
   
   await SystemResetService.performCompleteReset();
   ```

2. **Clear Browser Data**
   - Clear browser cache and localStorage
   - Refresh the application
   - Verify no cached recipe or inventory data remains

### Step 4: Verification

1. **Database Verification**
   ```sql
   -- Run these queries to verify reset
   SELECT COUNT(*) as recipe_templates FROM recipe_templates;
   SELECT COUNT(*) as recipes FROM recipes;
   SELECT COUNT(*) as inventory_stock FROM inventory_stock;
   SELECT COUNT(*) as product_catalog FROM product_catalog;
   SELECT COUNT(*) as active_stores FROM stores WHERE is_active = true;
   ```
   Expected results: All counts should be 0 except active_stores

2. **Application Verification**
   - Login to the admin panel
   - Navigate to Recipe Management - should show empty state
   - Navigate to Inventory Management - should show empty state
   - Navigate to Product Catalog - should show empty state
   - Verify stores are still visible and accessible

### Step 5: Fresh Data Upload

1. **Upload Master Recipe Data**
   - Use the Recipe Management interface
   - Upload the complete 61-product recipe dataset
   - Verify all recipes are imported correctly

2. **Deploy Recipes to Stores**
   - Use the recipe deployment functionality
   - Deploy recipes to all active stores
   - Verify inventory items are created automatically

3. **Verify Product Catalog Generation**
   - Check that product catalog entries are created
   - Verify pricing and availability settings
   - Test POS integration

## Troubleshooting

### Common Issues

1. **Migration Fails Due to Foreign Key Constraints**
   - The migration handles constraints automatically
   - If issues persist, check for custom constraints not covered

2. **Some Data Not Cleared**
   - Check the migration logs for specific errors
   - Manually verify problematic tables
   - Re-run specific cleanup sections if needed

3. **Application Still Shows Cached Data**
   - Clear browser cache completely
   - Clear localStorage manually
   - Restart the application server

### Recovery Options

1. **Restore from Backup**
   ```sql
   -- If you need to restore stores data
   INSERT INTO stores SELECT * FROM stores_backup_reset;
   ```

2. **Partial Reset**
   - You can run individual sections of the reset migration
   - Comment out sections you want to preserve
   - Test thoroughly after partial resets

## Post-Reset Checklist

- [ ] Database tables cleared (recipe_templates, recipes, inventory_stock, product_catalog = 0)
- [ ] Stores and users preserved
- [ ] Application caches cleared
- [ ] Fresh recipe data uploaded successfully
- [ ] Recipes deployed to all stores
- [ ] Product catalog generated correctly
- [ ] POS integration working
- [ ] Inventory sync functioning
- [ ] No conflicts or duplicate data

## Support

If you encounter issues during the reset process:

1. Check the `system_reset_log` table for detailed information
2. Review migration logs in Supabase
3. Verify all prerequisites are met
4. Test in development environment first

## Files Modified/Created

- `supabase/migrations/20250827_complete_system_reset.sql` - Main reset migration
- `src/services/system/systemResetService.ts` - Application reset utilities
- `scripts/auditMigrations.cjs` - Migration audit tool
- Removed: Various sample data and test files

The system is now ready for fresh recipe management deployment!
