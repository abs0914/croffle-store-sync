
# Inventory Stock Services

The inventory stock services in this directory are designed to interact with an `inventory_stock` table in the Supabase database.

## Current Status

These services are currently disabled because the `inventory_stock` table does not exist in the database schema. This was revealed by TypeScript compiler errors indicating that the table name is not recognized by the Supabase client.

## Required Steps to Enable

To enable these services:

1. Create an `inventory_stock` table in your Supabase database with the appropriate schema
2. Update the Supabase type definitions to include this new table 
3. Uncomment the exports in the `src/services/inventoryStock/index.ts` file

## Expected Table Schema

The `inventory_stock` table should include at least these columns:

- `id` (UUID, primary key)
- `store_id` (UUID, foreign key to stores table)
- `item` (string)
- `unit` (string)
- `stock_quantity` (number)
- `cost` (number, optional)
- `is_active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)
