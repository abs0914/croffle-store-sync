
# Inventory Stock Services

The inventory stock services in this directory are designed to interact with an `inventory_stock` table in the Supabase database.

## Current Status

These services are currently implemented as mock versions because the `inventory_stock` table does not exist in the database schema. This was revealed by TypeScript compiler errors indicating that the table name is not recognized by the Supabase client.

The mock functions provide placeholder implementations that allow the UI to function properly while displaying mock data, but they do not perform actual database operations.

## Required Steps to Enable Real Functionality

To enable real functionality for these services:

1. Create an `inventory_stock` table in your Supabase database with the appropriate schema
2. Update the Supabase type definitions to include this new table
3. Replace the mock implementations in `index.ts` with the real implementations from the individual service files

## Expected Table Schema

The `inventory_stock` table should include at least these columns:

- `id` (UUID, primary key)
- `store_id` (UUID, foreign key to stores table)
- `item` (string)
- `unit` (string)
- `stock_quantity` (number)
- `cost` (number, optional)
- `sku` (string, optional)
- `is_active` (boolean)
- `created_at` (timestamp)
- `updated_at` (timestamp)

## Usage Notice

When using these mock services, you will see console logs indicating which mock function was called and with what parameters. Toast messages are also shown to provide visual feedback, but the data is not persisted.
