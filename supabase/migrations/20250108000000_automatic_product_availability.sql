-- Add product_status column to product_catalog table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_catalog' 
        AND column_name = 'product_status'
    ) THEN
        ALTER TABLE public.product_catalog 
        ADD COLUMN product_status TEXT CHECK (product_status IN ('available', 'out_of_stock', 'temporarily_unavailable', 'discontinued'));
    END IF;
END $$;

-- Create function to check product availability based on ingredients
CREATE OR REPLACE FUNCTION check_product_availability(product_catalog_id UUID)
RETURNS TABLE(can_make BOOLEAN, max_quantity INTEGER, insufficient_ingredients TEXT[]) AS $$
DECLARE
    ingredient_record RECORD;
    min_possible_quantity INTEGER := 999999;
    insufficient_list TEXT[] := ARRAY[]::TEXT[];
    can_produce BOOLEAN := TRUE;
BEGIN
    -- Check each ingredient for the product
    FOR ingredient_record IN
        SELECT 
            pi.required_quantity,
            ist.stock_quantity,
            ist.item as ingredient_name
        FROM product_ingredients pi
        JOIN inventory_stock ist ON pi.inventory_stock_id = ist.id
        WHERE pi.product_catalog_id = check_product_availability.product_catalog_id
    LOOP
        -- Check if we have enough stock for this ingredient
        IF ingredient_record.stock_quantity < ingredient_record.required_quantity THEN
            can_produce := FALSE;
            insufficient_list := array_append(insufficient_list, ingredient_record.ingredient_name);
        ELSE
            -- Calculate how many products we can make with this ingredient
            IF ingredient_record.required_quantity > 0 THEN
                min_possible_quantity := LEAST(
                    min_possible_quantity, 
                    FLOOR(ingredient_record.stock_quantity / ingredient_record.required_quantity)::INTEGER
                );
            END IF;
        END IF;
    END LOOP;

    -- If no ingredients found, assume product is always available
    IF NOT FOUND THEN
        can_produce := TRUE;
        min_possible_quantity := 999;
    END IF;

    -- Return results
    RETURN QUERY SELECT 
        can_produce as can_make,
        CASE WHEN can_produce THEN min_possible_quantity ELSE 0 END as max_quantity,
        insufficient_list as insufficient_ingredients;
END;
$$ LANGUAGE plpgsql;

-- Create function to update product availability
CREATE OR REPLACE FUNCTION update_product_availability_on_inventory_change()
RETURNS TRIGGER AS $$
DECLARE
    affected_product RECORD;
    availability_result RECORD;
    new_status TEXT;
    new_availability BOOLEAN;
BEGIN
    -- Find all products that use this inventory item
    FOR affected_product IN
        SELECT DISTINCT pc.id, pc.product_name, pc.store_id, pc.product_status, pc.is_available
        FROM product_catalog pc
        JOIN product_ingredients pi ON pc.id = pi.product_catalog_id
        WHERE pi.inventory_stock_id = COALESCE(NEW.id, OLD.id)
    LOOP
        -- Check availability for this product
        SELECT * INTO availability_result 
        FROM check_product_availability(affected_product.id);
        
        -- Determine new status
        IF availability_result.can_make THEN
            new_status := 'available';
            new_availability := TRUE;
        ELSE
            new_status := 'out_of_stock';
            new_availability := FALSE;
        END IF;
        
        -- Update product if status changed
        IF affected_product.product_status IS DISTINCT FROM new_status 
           OR affected_product.is_available IS DISTINCT FROM new_availability THEN
            
            UPDATE product_catalog 
            SET 
                product_status = new_status,
                is_available = new_availability,
                updated_at = NOW()
            WHERE id = affected_product.id;
            
            -- Log the change
            RAISE NOTICE 'Updated product % (%) availability: % -> %, can_make: %', 
                affected_product.product_name, 
                affected_product.id,
                affected_product.product_status, 
                new_status,
                availability_result.can_make;
        END IF;
    END LOOP;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger on inventory_stock table
DROP TRIGGER IF EXISTS trigger_update_product_availability_on_inventory_change ON public.inventory_stock;
CREATE TRIGGER trigger_update_product_availability_on_inventory_change
    AFTER INSERT OR UPDATE OR DELETE ON public.inventory_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_product_availability_on_inventory_change();

-- Create function to manually refresh all product availability for a store
CREATE OR REPLACE FUNCTION refresh_store_product_availability(store_id_param UUID)
RETURNS TABLE(
    product_id UUID,
    product_name TEXT,
    old_status TEXT,
    new_status TEXT,
    can_make BOOLEAN,
    max_quantity INTEGER
) AS $$
DECLARE
    product_record RECORD;
    availability_result RECORD;
    new_status TEXT;
    new_availability BOOLEAN;
BEGIN
    -- Process each product in the store
    FOR product_record IN
        SELECT id, product_name, product_status, is_available
        FROM product_catalog
        WHERE store_id = store_id_param
    LOOP
        -- Check availability
        SELECT * INTO availability_result 
        FROM check_product_availability(product_record.id);
        
        -- Determine new status
        IF availability_result.can_make THEN
            new_status := 'available';
            new_availability := TRUE;
        ELSE
            new_status := 'out_of_stock';
            new_availability := FALSE;
        END IF;
        
        -- Update if changed
        IF product_record.product_status IS DISTINCT FROM new_status 
           OR product_record.is_available IS DISTINCT FROM new_availability THEN
            
            UPDATE product_catalog 
            SET 
                product_status = new_status,
                is_available = new_availability,
                updated_at = NOW()
            WHERE id = product_record.id;
        END IF;
        
        -- Return result
        RETURN QUERY SELECT 
            product_record.id as product_id,
            product_record.product_name,
            product_record.product_status as old_status,
            new_status,
            availability_result.can_make,
            availability_result.max_quantity;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_product_ingredients_inventory_stock_id 
ON public.product_ingredients(inventory_stock_id);

CREATE INDEX IF NOT EXISTS idx_product_catalog_store_id_status 
ON public.product_catalog(store_id, product_status);

-- Add comment explaining the system
COMMENT ON FUNCTION update_product_availability_on_inventory_change() IS 
'Automatically updates product availability when inventory stock changes. Products become unavailable when any required ingredient is out of stock.';

COMMENT ON FUNCTION refresh_store_product_availability(UUID) IS 
'Manually refresh availability status for all products in a store based on current inventory levels.';

COMMENT ON COLUMN public.product_catalog.product_status IS 
'Enhanced product status: available, out_of_stock, temporarily_unavailable, discontinued';
