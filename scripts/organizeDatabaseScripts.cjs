#!/usr/bin/env node

/**
 * Organize Database Scripts
 * 
 * This script organizes all database-related files into the new structure
 * and marks deprecated scripts appropriately.
 */

const fs = require('fs');
const path = require('path');

// Files to move to deprecated folder
const DEPRECATED_SQL_FILES = [
  'scripts/applyDatabaseUpdates.sql',
  'supabase/migrations/20250828000000_consolidate_recipe_system.sql'
];

// Scripts that are now obsolete (replaced by unified system)
const OBSOLETE_SCRIPTS = [
  'scripts/applyDatabaseUpdates.cjs',
  'scripts/createEssentialFunctions.cjs'
];

function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`✅ Created directory: ${dirPath}`);
  }
}

function moveFile(source, destination) {
  try {
    if (fs.existsSync(source)) {
      ensureDirectoryExists(path.dirname(destination));
      fs.renameSync(source, destination);
      console.log(`✅ Moved: ${source} → ${destination}`);
      return true;
    } else {
      console.log(`⚠️ Not found: ${source}`);
      return false;
    }
  } catch (error) {
    console.log(`❌ Failed to move ${source}: ${error.message}`);
    return false;
  }
}

function createDeprecatedNotice(filePath, reason) {
  const notice = `-- =====================================================
-- DEPRECATED SCRIPT - DO NOT USE
-- =====================================================
-- 
-- This script has been deprecated and replaced by the unified system.
-- 
-- Reason: ${reason}
-- 
-- Replacement: Use the scripts in database/setup/ instead
-- 
-- For new installations:
-- 1. Run database/setup/01_unified_recipe_system.sql
-- 2. Run database/setup/02_essential_functions.sql
-- 3. Use the Unified Recipe Import Dialog in the application
-- 
-- This file is kept for historical reference only.
-- =====================================================

-- Original content preserved below for reference:
-- (Content has been commented out to prevent accidental execution)

`;

  try {
    if (fs.existsSync(filePath)) {
      let content = fs.readFileSync(filePath, 'utf8');
      
      // Comment out all SQL commands to prevent execution
      content = content.split('\n').map(line => {
        if (line.trim() && !line.trim().startsWith('--')) {
          return '-- ' + line;
        }
        return line;
      }).join('\n');
      
      const deprecatedContent = notice + content;
      fs.writeFileSync(filePath, deprecatedContent);
      console.log(`✅ Added deprecation notice to: ${filePath}`);
    }
  } catch (error) {
    console.log(`❌ Failed to add deprecation notice to ${filePath}: ${error.message}`);
  }
}

function createMigrationIndex() {
  const indexContent = `# Database Migrations Index

This directory contains Supabase migrations that are automatically applied.

## ⚠️ Important Notes

- **DO NOT run these manually** - Supabase handles them automatically
- **DO NOT modify existing migrations** - create new ones instead
- **Use database/setup/ scripts** for manual database setup

## Migration Categories

### Core System Migrations
These establish the basic database structure and are handled by Supabase automatically.

### Recipe System Migrations  
**DEPRECATED**: The recipe system migrations have been consolidated into manual setup scripts.

**Use instead**: 
- \`database/setup/01_unified_recipe_system.sql\`
- \`database/setup/02_essential_functions.sql\`

### Current Active Migrations
All migrations in this directory are automatically applied by Supabase when deploying.

## For Manual Database Setup
If you need to set up the database manually (e.g., for development), use the scripts in \`database/setup/\` instead of trying to run migrations manually.
`;

  const migrationIndexPath = 'supabase/migrations/README.md';
  fs.writeFileSync(migrationIndexPath, indexContent);
  console.log(`✅ Created migration index: ${migrationIndexPath}`);
}

function createScriptsIndex() {
  const indexContent = `# Scripts Directory Index

This directory contains various utility and maintenance scripts.

## 📁 Organization

### Database-Related Scripts
**MOVED**: All database setup scripts have been moved to \`database/\` directory.

**Use instead**:
- \`database/setup/\` - For database setup
- \`database/maintenance/\` - For maintenance tasks

### Application Scripts
- \`checkDatabase.cjs\` - Test database connectivity
- \`testUnifiedRecipeSystem.cjs\` - Test recipe system health
- \`checkCurrentInventory.cjs\` - Check inventory status
- \`verificationAndMonitoring.cjs\` - System monitoring

### Admin Scripts  
- \`createAdmin.cjs\` - Create admin user
- \`populateProductCatalog.cjs\` - Populate product catalog
- \`deployAllRecipesToAllStores.cjs\` - Deploy recipes

### Deprecated Scripts
Scripts that have been replaced by the unified system are marked as deprecated but kept for reference.

## 🎯 Recommended Usage

### For Database Setup:
Use \`database/setup/\` scripts instead of scripts in this directory.

### For System Monitoring:
\`\`\`bash
node scripts/testUnifiedRecipeSystem.cjs
node scripts/checkDatabase.cjs
\`\`\`

### For Data Management:
Use the Unified Recipe Import Dialog in the application interface.
`;

  const scriptsIndexPath = 'scripts/README.md';
  fs.writeFileSync(scriptsIndexPath, indexContent);
  console.log(`✅ Created scripts index: ${scriptsIndexPath}`);
}

function main() {
  console.log('🗂️ ORGANIZING DATABASE SCRIPTS');
  console.log('='.repeat(50));
  
  // Ensure database directory structure exists
  ensureDirectoryExists('database/setup');
  ensureDirectoryExists('database/maintenance');
  ensureDirectoryExists('database/deprecated');
  
  // Move deprecated SQL files
  console.log('\n📦 Moving deprecated SQL files...');
  let movedCount = 0;
  
  for (const file of DEPRECATED_SQL_FILES) {
    const filename = path.basename(file);
    const destination = `database/deprecated/${filename}`;
    if (moveFile(file, destination)) {
      movedCount++;
      createDeprecatedNotice(destination, 'Replaced by unified setup scripts');
    }
  }
  
  // Mark obsolete scripts as deprecated
  console.log('\n🚫 Marking obsolete scripts as deprecated...');
  for (const script of OBSOLETE_SCRIPTS) {
    if (fs.existsSync(script)) {
      createDeprecatedNotice(script, 'Functionality moved to database/setup/ scripts');
    }
  }
  
  // Create index files
  console.log('\n📋 Creating index files...');
  createMigrationIndex();
  createScriptsIndex();
  
  // Create final summary
  console.log('\n📊 ORGANIZATION SUMMARY');
  console.log('='.repeat(30));
  console.log(`✅ Database structure created`);
  console.log(`✅ ${movedCount} deprecated files moved`);
  console.log(`✅ Index files created`);
  console.log(`✅ Deprecation notices added`);
  
  console.log('\n🎯 NEW DATABASE MANAGEMENT STRUCTURE:');
  console.log('   📁 database/setup/ - One-time setup scripts');
  console.log('   📁 database/maintenance/ - Recurring maintenance');
  console.log('   📁 database/deprecated/ - Obsolete scripts (reference only)');
  console.log('   📁 supabase/migrations/ - Automatic migrations');
  console.log('   📁 scripts/ - Application utility scripts');
  
  console.log('\n📋 NEXT STEPS:');
  console.log('   1. Run database/setup/01_unified_recipe_system.sql in Supabase');
  console.log('   2. Run database/setup/02_essential_functions.sql in Supabase');
  console.log('   3. Test with: node scripts/testUnifiedRecipeSystem.cjs');
  console.log('   4. Use Unified Recipe Import Dialog for data management');
  
  console.log('\n🎉 DATABASE SCRIPT ORGANIZATION COMPLETE!');
}

main();
