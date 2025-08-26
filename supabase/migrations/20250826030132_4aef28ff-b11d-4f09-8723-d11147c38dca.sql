-- Remove the problematic auto_deduct_inventory_on_transaction trigger and function
-- This will allow us to revert to frontend-based inventory deduction

-- Drop the trigger first
DROP TRIGGER IF EXISTS trg_auto_deduct_inventory ON transactions;
DROP TRIGGER IF EXISTS auto_deduct_inventory_on_transaction ON transactions;

-- Drop the function
DROP FUNCTION IF EXISTS auto_deduct_inventory_on_transaction();

-- Log the change for audit purposes
INSERT INTO public.system_config (config_key, config_value, description, is_active)
VALUES (
  'inventory_deduction_method', 
  'frontend_service', 
  'Reverted from database trigger to frontend service for inventory deduction due to reliability issues',
  true
)
ON CONFLICT (config_key) DO UPDATE SET
  config_value = 'frontend_service',
  description = 'Reverted from database trigger to frontend service for inventory deduction due to reliability issues',
  updated_at = NOW();