# Database Migrations Index

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
- `database/setup/01_unified_recipe_system.sql`
- `database/setup/02_essential_functions.sql`

### Current Active Migrations
All migrations in this directory are automatically applied by Supabase when deploying.

## For Manual Database Setup
If you need to set up the database manually (e.g., for development), use the scripts in `database/setup/` instead of trying to run migrations manually.
