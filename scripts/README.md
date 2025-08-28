# Scripts Directory Index

This directory contains various utility and maintenance scripts.

## 📁 Organization

### Database-Related Scripts
**MOVED**: All database setup scripts have been moved to `database/` directory.

**Use instead**:
- `database/setup/` - For database setup
- `database/maintenance/` - For maintenance tasks

### Application Scripts
- `checkDatabase.cjs` - Test database connectivity
- `testUnifiedRecipeSystem.cjs` - Test recipe system health
- `checkCurrentInventory.cjs` - Check inventory status
- `verificationAndMonitoring.cjs` - System monitoring

### Admin Scripts  
- `createAdmin.cjs` - Create admin user
- `populateProductCatalog.cjs` - Populate product catalog
- `deployAllRecipesToAllStores.cjs` - Deploy recipes

### Deprecated Scripts
Scripts that have been replaced by the unified system are marked as deprecated but kept for reference.

## 🎯 Recommended Usage

### For Database Setup:
Use `database/setup/` scripts instead of scripts in this directory.

### For System Monitoring:
```bash
node scripts/testUnifiedRecipeSystem.cjs
node scripts/checkDatabase.cjs
```

### For Data Management:
Use the Unified Recipe Import Dialog in the application interface.
