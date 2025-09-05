-- Fix inventory deduction by mapping recipe template ingredients to inventory stock items

-- 1. Update Caramel Delight Croffle recipe template ingredients with proper inventory mappings
WITH ingredient_mappings AS (
  SELECT 
    rti.id as template_ingredient_id,
    rti.ingredient_name,
    CASE 
      WHEN rti.ingredient_name = 'Regular Croissant' THEN 
        (SELECT id FROM inventory_stock 
         WHERE item = 'Regular Croissant' 
         AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
         AND is_active = true LIMIT 1)
      WHEN rti.ingredient_name = 'Caramel Sauce' THEN 
        (SELECT id FROM inventory_stock 
         WHERE item = 'Caramel Sauce' 
         AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
         AND is_active = true LIMIT 1)
      WHEN rti.ingredient_name = 'Whipped Cream' THEN 
        (SELECT id FROM inventory_stock 
         WHERE item = 'Whipped Cream' 
         AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
         AND is_active = true LIMIT 1)
      WHEN rti.ingredient_name = 'Colored Sprinkles' THEN 
        (SELECT id FROM inventory_stock 
         WHERE item = 'Colored Sprinkles' 
         AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
         AND is_active = true LIMIT 1)
      WHEN rti.ingredient_name = 'Chopstick' THEN 
        (SELECT id FROM inventory_stock 
         WHERE item = 'Chopstick' 
         AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
         AND is_active = true LIMIT 1)
      WHEN rti.ingredient_name = 'Wax Paper' THEN 
        (SELECT id FROM inventory_stock 
         WHERE item = 'Wax Paper' 
         AND store_id = 'd7c47e6b-f20a-4543-a6bd-000398f72df5' 
         AND is_active = true LIMIT 1)
    END as inventory_stock_id
  FROM recipe_template_ingredients rti
  WHERE rti.recipe_template_id = '141f9491-f562-4040-bab2-376b13ed0ee6'
)
UPDATE recipe_template_ingredients 
SET inventory_stock_id = ingredient_mappings.inventory_stock_id
FROM ingredient_mappings
WHERE recipe_template_ingredients.id = ingredient_mappings.template_ingredient_id
  AND ingredient_mappings.inventory_stock_id IS NOT NULL;

-- 2. Create a function to manually deduct missing inventory for past transactions
CREATE OR REPLACE FUNCTION fix_missing_inventory_deduction(
  p_transaction_id UUID,
  p_store_id UUID
) RETURNS TABLE(
  ingredient_name TEXT,
  deducted_quantity NUMERIC,
  new_stock NUMERIC,
  success BOOLEAN,
  message TEXT
) LANGUAGE plpgsql AS $$
DECLARE
  trans_record RECORD;
  item_record RECORD;
  template_record RECORD;
  ingredient_record RECORD;
  inventory_item RECORD;
  deduction_amount NUMERIC;
  current_stock NUMERIC;
  new_stock_amount NUMERIC;
BEGIN
  -- Get transaction details
  SELECT * INTO trans_record
  FROM transactions 
  WHERE id = p_transaction_id;
  
  IF NOT FOUND THEN
    RETURN QUERY SELECT 'ERROR'::TEXT, 0::NUMERIC, 0::NUMERIC, FALSE, 'Transaction not found'::TEXT;
    RETURN;
  END IF;
  
  -- Process each transaction item
  FOR item_record IN 
    SELECT ti.name, ti.quantity::NUMERIC as quantity
    FROM jsonb_to_recordset(trans_record.items) AS ti(name TEXT, quantity TEXT)
  LOOP
    -- Find recipe template for this item
    SELECT * INTO template_record
    FROM recipe_templates 
    WHERE name = item_record.name AND is_active = true
    LIMIT 1;
    
    IF NOT FOUND THEN
      RETURN QUERY SELECT item_record.name, 0::NUMERIC, 0::NUMERIC, FALSE, 'No recipe template found'::TEXT;
      CONTINUE;
    END IF;
    
    -- Process each ingredient in the template
    FOR ingredient_record IN
      SELECT rti.ingredient_name, rti.quantity, rti.inventory_stock_id
      FROM recipe_template_ingredients rti
      WHERE rti.recipe_template_id = template_record.id
        AND rti.inventory_stock_id IS NOT NULL
    LOOP
      -- Get current inventory stock
      SELECT * INTO inventory_item
      FROM inventory_stock 
      WHERE id = ingredient_record.inventory_stock_id 
        AND store_id = p_store_id 
        AND is_active = true;
      
      IF NOT FOUND THEN
        RETURN QUERY SELECT ingredient_record.ingredient_name, 0::NUMERIC, 0::NUMERIC, FALSE, 'Inventory item not found'::TEXT;
        CONTINUE;
      END IF;
      
      -- Calculate deduction amount
      deduction_amount := ingredient_record.quantity * item_record.quantity;
      current_stock := inventory_item.stock_quantity;
      new_stock_amount := GREATEST(0, current_stock - deduction_amount);
      
      -- Update inventory stock
      UPDATE inventory_stock 
      SET stock_quantity = new_stock_amount,
          updated_at = NOW()
      WHERE id = inventory_item.id;
      
      -- Create inventory movement record
      INSERT INTO inventory_movements (
        inventory_stock_id,
        movement_type,
        quantity_change,
        previous_quantity,
        new_quantity,
        reference_type,
        reference_id,
        notes,
        created_by,
        created_at
      ) VALUES (
        inventory_item.id,
        'sale',
        -deduction_amount,
        current_stock,
        new_stock_amount,
        'transaction',
        p_transaction_id,
        'Manual correction for missing inventory deduction: ' || ingredient_record.ingredient_name,
        'system',
        NOW()
      );
      
      RETURN QUERY SELECT 
        ingredient_record.ingredient_name,
        deduction_amount,
        new_stock_amount,
        TRUE,
        'Successfully deducted'::TEXT;
    END LOOP;
  END LOOP;
END;
$$;