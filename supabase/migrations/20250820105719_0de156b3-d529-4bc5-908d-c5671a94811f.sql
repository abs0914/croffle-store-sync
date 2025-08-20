-- Fix security issue with search_path for the function we just created
CREATE OR REPLACE FUNCTION check_product_uniqueness()
RETURNS TRIGGER 
SET search_path = 'public', 'auth'
AS $$
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND (OLD.name != NEW.name OR OLD.store_id != NEW.store_id)) THEN
    IF EXISTS (
      SELECT 1 FROM products 
      WHERE name = NEW.name 
      AND store_id = NEW.store_id 
      AND id != NEW.id
    ) THEN
      RAISE EXCEPTION 'Product "%" already exists in this store', NEW.name;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;