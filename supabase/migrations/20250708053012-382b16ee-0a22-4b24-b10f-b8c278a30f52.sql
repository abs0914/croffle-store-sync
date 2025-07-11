-- Add new user roles to support Stock User and Production User
-- Update the app_role enum to include the new roles

-- First, add the new role values to the enum
ALTER TYPE app_role ADD VALUE 'stock_user';
ALTER TYPE app_role ADD VALUE 'production_user';

-- Update any existing 'manager' roles to align with new system if needed
-- Note: We keep 'manager' for backward compatibility but it will function similar to 'stock_user'

-- Create a function to check if user has required role for route access
CREATE OR REPLACE FUNCTION public.has_route_access(user_role app_role, required_access text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  -- Admin has access to everything
  IF user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Owner has access to everything  
  IF user_role = 'owner' THEN
    RETURN true;
  END IF;
  
  -- Stock User access permissions
  IF user_role = 'stock_user' OR user_role = 'manager' THEN
    RETURN required_access IN (
      'purchasing',
      'commissary_inventory',
      'production_management', 
      'order_management',
      'expenses',
      'recipe_management'
    );
  END IF;
  
  -- Production User access permissions
  IF user_role = 'production_user' THEN
    RETURN required_access IN (
      'production_management',
      'recipe_management'
    );
  END IF;
  
  -- Cashier access (POS only)
  IF user_role = 'cashier' THEN
    RETURN required_access = 'pos';
  END IF;
  
  RETURN false;
END;
$$;

-- Create helper function to get user role access list
CREATE OR REPLACE FUNCTION public.get_user_role_permissions(user_role app_role)
RETURNS text[]
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  CASE user_role
    WHEN 'admin', 'owner' THEN
      RETURN ARRAY[
        'pos', 'dashboard', 'inventory_management', 'commissary_inventory',
        'production_management', 'order_management', 'expenses', 
        'recipe_management', 'reports', 'settings', 'user_management',
        'purchasing'
      ];
    WHEN 'stock_user', 'manager' THEN
      RETURN ARRAY[
        'purchasing', 'commissary_inventory', 'production_management',
        'order_management', 'expenses', 'recipe_management'
      ];
    WHEN 'production_user' THEN
      RETURN ARRAY['production_management', 'recipe_management'];
    WHEN 'cashier' THEN
      RETURN ARRAY['pos'];
    ELSE
      RETURN ARRAY[]::text[];
  END CASE;
END;
$$;