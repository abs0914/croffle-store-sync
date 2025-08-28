# Database Management Guide

This directory contains all database-related scripts and migrations for the Croffle Store Sync application, organized by purpose and execution method.

## 📁 Directory Structure

```
database/
├── README.md                           # This guide
├── setup/                              # One-time setup scripts
│   ├── 01_unified_recipe_system.sql    # Complete recipe system setup
│   └── 02_essential_functions.sql      # Core database functions
├── maintenance/                        # Recurring maintenance scripts
│   ├── cleanup_inactive_data.sql       # Clean up old data
│   └── reindex_performance.sql         # Performance optimization
├── migrations/                         # Automatic migrations (handled by Supabase)
│   └── [timestamp]_migration_name.sql  # Auto-applied migrations
└── deprecated/                         # Obsolete scripts (DO NOT USE)
    └── old_scripts.sql                 # Moved here for reference
```

## 🚀 Quick Start

### For New Installations:
1. Run `setup/01_unified_recipe_system.sql` in Supabase SQL Editor
2. Run `setup/02_essential_functions.sql` in Supabase SQL Editor
3. Use the application's Unified Recipe Import Dialog to import data

### For Existing Installations:
1. Check current system status with `node scripts/testUnifiedRecipeSystem.cjs`
2. If needed, run setup scripts above
3. Use maintenance scripts as needed

## 📋 Script Categories

### 🔧 Setup Scripts (Run Once)
**Location**: `database/setup/`
**When to run**: New installations or major system updates
**How to run**: Copy and paste into Supabase SQL Editor

| Script | Purpose | Dependencies |
|--------|---------|--------------|
| `01_unified_recipe_system.sql` | Complete recipe management system setup | None |
| `01_unified_recipe_system_safe.sql` | Safe version for existing data (use if constraint errors) | None |
| `02_essential_functions.sql` | Core database functions and triggers | Script 01 |

### 🔄 Maintenance Scripts (Run as Needed)
**Location**: `database/maintenance/`
**When to run**: Regular maintenance or performance issues
**How to run**: Copy and paste into Supabase SQL Editor

| Script | Purpose | Frequency |
|--------|---------|-----------|
| `cleanup_inactive_data.sql` | Remove old inactive records | Monthly |
| `reindex_performance.sql` | Rebuild indexes for performance | As needed |

### ⚡ Automatic Migrations (Handled by Supabase)
**Location**: `supabase/migrations/`
**When to run**: Automatically applied by Supabase
**How to run**: No manual intervention needed

These are handled automatically by Supabase's migration system. Do not run manually.

### 🗑️ Deprecated Scripts (DO NOT USE)
**Location**: `database/deprecated/`
**Purpose**: Historical reference only
**Status**: Obsolete - replaced by unified system

## 🎯 Execution Order

### New Installation:
```sql
-- 1. Run in Supabase SQL Editor (choose one)
database/setup/01_unified_recipe_system.sql          -- Standard version
-- OR --
database/setup/01_unified_recipe_system_safe.sql     -- If you get constraint errors

-- 2. Run in Supabase SQL Editor
database/setup/02_essential_functions.sql

-- 3. Use application UI
-- Go to Admin → Recipe Management → Import Recipes
```

### System Update:
```sql
-- 1. Check current status (run in terminal)
node scripts/testUnifiedRecipeSystem.cjs

-- 2. If functions missing, run in Supabase SQL Editor
database/setup/02_essential_functions.sql

-- 3. If performance issues, run in Supabase SQL Editor
database/maintenance/reindex_performance.sql
```

## 🔍 Verification

After running setup scripts, verify with:

```bash
# Check system health
node scripts/testUnifiedRecipeSystem.cjs

# Check database connectivity
node scripts/checkDatabase.cjs

# Verify product categories
node scripts/checkPOSCategories.cjs
```

Expected results:
- ✅ All database functions exist
- ✅ 85%+ products have categories
- ✅ Recipe management summary view works
- ✅ No constraint violations

## 🚨 Troubleshooting

### Common Issues:

**"Function does not exist"**
- Solution: Run `database/setup/02_essential_functions.sql`

**"Duplicate key violation"**
- Solution: This is expected for existing data - ignore these errors

**"Column does not exist"**
- Solution: Run `database/setup/01_unified_recipe_system.sql`

**Poor performance**
- Solution: Run `database/maintenance/reindex_performance.sql`

### Getting Help:

1. Check the verification scripts output
2. Look for error patterns in the logs
3. Ensure you're running scripts in the correct order
4. Verify you have admin permissions in Supabase

## 📊 Monitoring

### Health Check Commands:
```bash
# Overall system status
node scripts/testUnifiedRecipeSystem.cjs

# Database connectivity
node scripts/checkDatabase.cjs

# Product categorization rate
node scripts/checkPOSCategories.cjs

# Inventory system status
node scripts/checkCurrentInventory.cjs
```

### Key Metrics to Monitor:
- Product categorization rate (target: >85%)
- Active recipe templates count
- Database function availability
- Query performance

## 🔄 Regular Maintenance

### Monthly Tasks:
1. Run `database/maintenance/cleanup_inactive_data.sql`
2. Check system health with verification scripts
3. Review performance metrics

### As-Needed Tasks:
1. Run `database/maintenance/reindex_performance.sql` if queries are slow
2. Update recipe data using the Unified Recipe Import Dialog
3. Clear old data if storage is an issue

## 📝 Notes

- **Never run deprecated scripts** - they may cause data corruption
- **Always backup before running maintenance scripts**
- **Test scripts in development environment first**
- **Monitor system performance after changes**
- **Use the application UI for data imports** - avoid manual SQL data insertion
