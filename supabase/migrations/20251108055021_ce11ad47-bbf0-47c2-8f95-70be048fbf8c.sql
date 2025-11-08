-- Fix ambiguous column reference in update_product_catalog_price
CREATE OR REPLACE FUNCTION update_product_catalog_price(
  p_product_id uuid,
  p_new_price numeric
)
RETURNS TABLE(
  id uuid,
  product_name text,
  old_price numeric,
  new_price numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_user_id uuid;
  v_old_price numeric;
  v_product_name text;
BEGIN
  -- Get current user ID
  v_current_user_id := auth.uid();
  
  -- Check permissions only if there is an authenticated user
  IF v_current_user_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM app_users
      WHERE user_id = v_current_user_id
        AND role IN ('admin', 'owner', 'manager')
        AND is_active = true
    ) THEN
      RAISE EXCEPTION 'Permission denied: Only admins, owners, and managers can update prices';
    END IF;
  END IF;

  -- Get current price and name (fix ambiguous column reference)
  SELECT pc.price, pc.product_name INTO v_old_price, v_product_name
  FROM product_catalog pc
  WHERE pc.id = p_product_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product not found';
  END IF;

  -- Update the price
  UPDATE product_catalog pc
  SET price = p_new_price, updated_at = NOW()
  WHERE pc.id = p_product_id;

  RETURN QUERY SELECT p_product_id, v_product_name, v_old_price, p_new_price;
END;
$$;