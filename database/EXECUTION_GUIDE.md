# Database Execution Guide

This guide provides step-by-step instructions for setting up and maintaining the Croffle Store Sync database.

## 🚀 Quick Start (New Installation)

### Step 1: Run Setup Scripts in Supabase SQL Editor

1. **Open Supabase Dashboard** → Go to your project → SQL Editor
2. **Copy and paste** the entire content of `database/setup/01_unified_recipe_system.sql`
3. **Click "Run"** and wait for completion
4. **Copy and paste** the entire content of `database/setup/02_essential_functions.sql`  
5. **Click "Run"** and wait for completion

### Step 2: Verify Installation

Run this command in your terminal:
```bash
node scripts/testUnifiedRecipeSystem.cjs
```

Expected output:
- ✅ All database functions exist
- ✅ Categories created for all stores
- ✅ System health checks pass

### Step 3: Import Recipe Data

1. **Open the application** → Go to Admin → Recipe Management
2. **Click "Import Recipes"** → Use the Unified Recipe Import Dialog
3. **Upload your CSV file** with recipe data
4. **Wait for processing** → System will automatically categorize products

## 📋 Detailed Execution Steps

### For New Installations

#### Prerequisites
- Supabase project set up
- Admin access to Supabase SQL Editor
- Node.js environment for testing scripts

#### Database Setup (Run in Supabase SQL Editor)

**Script 1: Core System Setup**
```sql
-- Copy entire content of database/setup/01_unified_recipe_system.sql
-- This creates:
-- ✅ Required table columns
-- ✅ Performance indexes  
-- ✅ Standard categories
-- ✅ Category mapping functions
-- ✅ Automatic triggers
-- ✅ Monitoring views
```

**Script 2: Advanced Functions**
```sql
-- Copy entire content of database/setup/02_essential_functions.sql
-- This creates:
-- ✅ Health monitoring functions
-- ✅ Data validation functions
-- ✅ Bulk operation functions
-- ✅ Maintenance utilities
```

#### Verification (Run in Terminal)
```bash
# Test overall system health
node scripts/testUnifiedRecipeSystem.cjs

# Check database connectivity
node scripts/checkDatabase.cjs

# Verify categories
node scripts/checkPOSCategories.cjs
```

### For Existing Installations

#### Health Check First
```bash
node scripts/testUnifiedRecipeSystem.cjs
```

#### If Functions Missing
Run `database/setup/02_essential_functions.sql` in Supabase SQL Editor

#### If Schema Issues
Run `database/setup/01_unified_recipe_system.sql` in Supabase SQL Editor

## 🔧 Maintenance Tasks

### Monthly Maintenance

**Clean Up Old Data** (Run in Supabase SQL Editor)
```sql
-- Copy entire content of database/maintenance/cleanup_inactive_data.sql
-- This removes old inactive records and optimizes storage
```

**Performance Optimization** (Run when queries are slow)
```sql
-- Copy entire content of database/maintenance/reindex_performance.sql
-- This rebuilds indexes and updates statistics
```

### Health Monitoring (Run in Terminal)
```bash
# Overall system status
node scripts/testUnifiedRecipeSystem.cjs

# Database connectivity
node scripts/checkDatabase.cjs

# Inventory status
node scripts/checkCurrentInventory.cjs
```

## 🎯 Execution Order & Dependencies

### Setup Order (Critical)
```
1. database/setup/01_unified_recipe_system.sql
   ↓
2. database/setup/02_essential_functions.sql
   ↓
3. Application-based recipe import
```

### Maintenance Order (Flexible)
```
1. Health check (scripts/testUnifiedRecipeSystem.cjs)
   ↓
2. If needed: database/maintenance/cleanup_inactive_data.sql
   ↓
3. If needed: database/maintenance/reindex_performance.sql
```

## ⚠️ Important Notes

### What to Run Manually
- ✅ Scripts in `database/setup/` - Run in Supabase SQL Editor
- ✅ Scripts in `database/maintenance/` - Run in Supabase SQL Editor
- ✅ Scripts in `scripts/` ending with `.cjs` - Run in terminal

### What NOT to Run Manually
- ❌ Files in `supabase/migrations/` - Handled automatically by Supabase
- ❌ Files in `database/deprecated/` - Obsolete and potentially harmful
- ❌ Any script marked as "DEPRECATED"

### Safety Guidelines
- **Always backup** before running maintenance scripts
- **Test in development** environment first
- **Run scripts in order** as specified
- **Verify results** with test scripts after changes

## 🔍 Troubleshooting

### Common Issues & Solutions

**"Function does not exist"**
```
Problem: Database functions not created
Solution: Run database/setup/02_essential_functions.sql
```

**"Column does not exist"**
```
Problem: Database schema not updated
Solution: Run database/setup/01_unified_recipe_system.sql
```

**"Duplicate key violation"**
```
Problem: Trying to create existing data
Solution: This is expected - ignore these errors
```

**Poor query performance**
```
Problem: Indexes need rebuilding
Solution: Run database/maintenance/reindex_performance.sql
```

**High storage usage**
```
Problem: Old inactive data accumulating
Solution: Run database/maintenance/cleanup_inactive_data.sql
```

### Getting Help

1. **Check system health**: `node scripts/testUnifiedRecipeSystem.cjs`
2. **Review error messages** for specific issues
3. **Ensure execution order** is followed correctly
4. **Verify permissions** in Supabase dashboard

## 📊 Success Metrics

After running setup scripts, you should see:

### Database Health
- ✅ All required functions exist
- ✅ All required views accessible
- ✅ All indexes created successfully

### Data Quality
- ✅ 85%+ products have categories assigned
- ✅ No constraint violations during imports
- ✅ Recipe templates deploy successfully

### Performance
- ✅ Queries execute in <1 second
- ✅ Import operations complete without errors
- ✅ Category assignment works automatically

## 🔄 Regular Monitoring

### Daily (Automated)
- System health checks via application monitoring

### Weekly (Manual)
```bash
node scripts/testUnifiedRecipeSystem.cjs
```

### Monthly (Manual)
```sql
-- Run in Supabase SQL Editor
database/maintenance/cleanup_inactive_data.sql
```

### As Needed (Manual)
```sql
-- Run when performance degrades
database/maintenance/reindex_performance.sql
```

## 📝 Change Log

When making database changes:
1. **Document the change** in this guide
2. **Update version numbers** if applicable
3. **Test thoroughly** before deployment
4. **Communicate changes** to the team

This ensures everyone stays synchronized with the database structure and procedures.
