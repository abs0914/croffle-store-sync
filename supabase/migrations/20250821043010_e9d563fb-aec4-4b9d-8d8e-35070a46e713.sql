-- Add affected_inventory_items field to inventory_sync_audit table
ALTER TABLE public.inventory_sync_audit 
ADD COLUMN affected_inventory_items jsonb DEFAULT '[]'::jsonb;