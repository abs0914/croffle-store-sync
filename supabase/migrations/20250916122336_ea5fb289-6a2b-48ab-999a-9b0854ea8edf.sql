-- Fix the backfill function to not reference non-existent created_by column
CREATE OR REPLACE FUNCTION backfill_missing_audit_records(
  p_transaction_id uuid DEFAULT NULL,
  p_store_id uuid DEFAULT NULL,
  p_limit integer DEFAULT 100
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'auth'
AS $$
DECLARE
  v_transaction record;
  v_item jsonb;
  v_product record;
  v_ingredient record;
  v_audit_count integer := 0;
  v_result jsonb;
  v_user_id uuid;
BEGIN
  -- Get a default user ID (admin or first available user)
  SELECT user_id INTO v_user_id 
  FROM app_users 
  WHERE role = 'admin' AND is_active = true 
  LIMIT 1;
  
  IF v_user_id IS NULL THEN
    SELECT id INTO v_user_id FROM auth.users LIMIT 1;
  END IF;
  
  -- Process transactions that need audit backfill
  FOR v_transaction IN
    SELECT t.id, t.items, t.store_id, t.created_at, t.receipt_number
    FROM transactions t
    WHERE (p_transaction_id IS NULL OR t.id = p_transaction_id)
      AND (p_store_id IS NULL OR t.store_id = p_store_id)
      AND t.created_at >= NOW() - INTERVAL '7 days' -- Only recent transactions
    ORDER BY t.created_at DESC
    LIMIT p_limit
  LOOP
    -- Process each item in the transaction
    FOR v_item IN SELECT * FROM jsonb_array_elements(v_transaction.items)
    LOOP
      -- Get product and recipe details
      SELECT pc.*, r.name as recipe_name, r.id as recipe_id
      INTO v_product
      FROM product_catalog pc
      LEFT JOIN recipes r ON pc.recipe_id = r.id
      WHERE pc.id = (v_item->>'productId')::uuid
        AND pc.store_id = v_transaction.store_id;
      
      -- Skip if no recipe
      CONTINUE WHEN v_product.recipe_id IS NULL;
      
      -- Process each recipe ingredient
      FOR v_ingredient IN
        SELECT ri.*, ist.item as ingredient_name, ist.id as inventory_stock_id
        FROM recipe_ingredients ri
        JOIN inventory_stock ist ON ri.inventory_stock_id = ist.id
        WHERE ri.recipe_id = v_product.recipe_id
          AND ist.store_id = v_transaction.store_id
          AND ist.is_active = true
      LOOP
        -- Check if audit record already exists
        IF NOT EXISTS (
          SELECT 1 FROM inventory_transactions 
          WHERE reference_id = v_transaction.id
            AND product_id = v_product.id
            AND store_id = v_transaction.store_id
            AND notes LIKE '%' || v_ingredient.ingredient_name || '%'
        ) THEN
          -- Create missing audit record
          PERFORM log_inventory_deduction_audit(
            v_transaction.id,
            v_transaction.store_id,
            v_product.id,
            v_ingredient.inventory_stock_id,
            v_ingredient.ingredient_name,
            v_ingredient.quantity * (v_item->>'quantity')::numeric,
            0, -- Previous quantity unknown for backfill
            0, -- New quantity unknown for backfill
            v_product.recipe_name,
            v_user_id -- Use default user ID
          );
          
          v_audit_count := v_audit_count + 1;
        END IF;
      END LOOP;
    END LOOP;
  END LOOP;
  
  v_result := jsonb_build_object(
    'backfilled_records', v_audit_count,
    'processed_transactions', (
      SELECT COUNT(*) FROM transactions t
      WHERE (p_transaction_id IS NULL OR t.id = p_transaction_id)
        AND (p_store_id IS NULL OR t.store_id = p_store_id)
        AND t.created_at >= NOW() - INTERVAL '7 days'
    )
  );
  
  RETURN v_result;
END;
$$;