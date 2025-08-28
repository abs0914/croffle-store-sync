-- Fix for Product Catalog Constraint Violation Issue
-- This script addresses the "products_store_id_sku_key" constraint violation
-- when updating products in the Product Catalog system

-- Step 0: Clean up any existing objects from previous runs
DO $$
BEGIN
    RAISE NOTICE 'Cleaning up any existing objects from previous runs...';

    -- Drop triggers first (they depend on functions)
    DROP TRIGGER IF EXISTS sync_catalog_to_products_safe_trigger ON product_catalog;
    DROP TRIGGER IF EXISTS sync_catalog_to_products_trigger ON product_catalog;

    -- Now drop functions
    DROP FUNCTION IF EXISTS fix_duplicate_skus();
    DROP FUNCTION IF EXISTS fix_duplicate_product_names();
    DROP FUNCTION IF EXISTS sync_product_catalog_to_products_safe();

    RAISE NOTICE 'Cleanup completed.';
END $$;

-- Step 1: Identify and analyze the constraint issue
DO $$
BEGIN
    RAISE NOTICE 'Starting Product Catalog Constraint Violation Fix...';
    RAISE NOTICE 'Analyzing current constraints on products table...';
END $$;

-- Check current constraints on products table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint 
WHERE conrelid = 'products'::regclass
ORDER BY conname;

-- Step 2: Find duplicate SKUs that might be causing the issue
WITH duplicate_skus AS (
    SELECT 
        store_id,
        sku,
        COUNT(*) as count,
        array_agg(id) as product_ids,
        array_agg(name) as product_names
    FROM products 
    WHERE sku IS NOT NULL
    GROUP BY store_id, sku
    HAVING COUNT(*) > 1
)
SELECT 
    'Duplicate SKU found' as issue_type,
    store_id,
    sku,
    count,
    product_ids,
    product_names
FROM duplicate_skus;

-- Step 3: Find products that might have conflicting names
WITH duplicate_names AS (
    SELECT 
        store_id,
        name,
        COUNT(*) as count,
        array_agg(id) as product_ids,
        array_agg(sku) as product_skus
    FROM products 
    WHERE is_active = true
    GROUP BY store_id, name
    HAVING COUNT(*) > 1
)
SELECT 
    'Duplicate active product name found' as issue_type,
    store_id,
    name,
    count,
    product_ids,
    product_skus
FROM duplicate_names;

-- Step 4: Check for orphaned product_catalog entries that might cause sync issues
SELECT 
    'Orphaned catalog entry' as issue_type,
    pc.id as catalog_id,
    pc.product_name,
    pc.store_id,
    'No matching product in products table' as issue_description
FROM product_catalog pc
LEFT JOIN products p ON p.store_id = pc.store_id AND p.name = pc.product_name
WHERE p.id IS NULL
AND pc.is_available = true
LIMIT 10;

-- Step 5: Temporarily disable problematic triggers to prevent conflicts during fix
DO $$
BEGIN
    -- Disable sync triggers temporarily
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_catalog_to_products_trigger') THEN
        ALTER TABLE product_catalog DISABLE TRIGGER sync_catalog_to_products_trigger;
        RAISE NOTICE 'Disabled sync_catalog_to_products_trigger';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_products_to_catalog_trigger') THEN
        ALTER TABLE products DISABLE TRIGGER sync_products_to_catalog_trigger;
        RAISE NOTICE 'Disabled sync_products_to_catalog_trigger';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enhanced_product_uniqueness_trigger') THEN
        ALTER TABLE products DISABLE TRIGGER enhanced_product_uniqueness_trigger;
        RAISE NOTICE 'Disabled enhanced_product_uniqueness_trigger';
    END IF;
END $$;

-- Step 6: Fix duplicate SKUs by regenerating them
CREATE OR REPLACE FUNCTION fix_duplicate_skus()
RETURNS TABLE(fixed_products INTEGER, details TEXT) AS $$
DECLARE
    duplicate_record RECORD;
    new_sku TEXT;
    fixed_count INTEGER := 0;
    detail_text TEXT := '';
BEGIN
    -- Process each set of duplicate SKUs
    FOR duplicate_record IN 
        SELECT 
            store_id,
            sku,
            array_agg(id ORDER BY created_at) as product_ids,
            array_agg(name ORDER BY created_at) as product_names
        FROM products 
        WHERE sku IS NOT NULL
        GROUP BY store_id, sku
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first product with original SKU, update others
        FOR i IN 2..array_length(duplicate_record.product_ids, 1) LOOP
            -- Generate new unique SKU
            new_sku := generate_recipe_sku(
                duplicate_record.product_names[i], 
                'recipe'
            );
            
            -- Update the duplicate product with new SKU
            UPDATE products 
            SET sku = new_sku,
                updated_at = NOW()
            WHERE id = duplicate_record.product_ids[i];
            
            fixed_count := fixed_count + 1;
            detail_text := detail_text || format(
                'Fixed product %s: changed SKU from %s to %s; ',
                duplicate_record.product_names[i],
                duplicate_record.sku,
                new_sku
            );
        END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT fixed_count, detail_text;
END;
$$ LANGUAGE plpgsql;

-- Execute the fix
SELECT * FROM fix_duplicate_skus();

-- Step 7: Fix duplicate product names by deactivating older duplicates
CREATE OR REPLACE FUNCTION fix_duplicate_product_names()
RETURNS TABLE(deactivated_products INTEGER, details TEXT) AS $$
DECLARE
    duplicate_record RECORD;
    deactivated_count INTEGER := 0;
    detail_text TEXT := '';
BEGIN
    -- Process each set of duplicate names
    FOR duplicate_record IN 
        SELECT 
            store_id,
            name,
            array_agg(id ORDER BY created_at DESC) as product_ids -- Keep newest first
        FROM products 
        WHERE is_active = true
        GROUP BY store_id, name
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first (newest) product active, deactivate others
        FOR i IN 2..array_length(duplicate_record.product_ids, 1) LOOP
            UPDATE products 
            SET is_active = false,
                updated_at = NOW()
            WHERE id = duplicate_record.product_ids[i];
            
            deactivated_count := deactivated_count + 1;
            detail_text := detail_text || format(
                'Deactivated duplicate product %s (ID: %s); ',
                duplicate_record.name,
                duplicate_record.product_ids[i]
            );
        END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT deactivated_count, detail_text;
END;
$$ LANGUAGE plpgsql;

-- Execute the fix
SELECT * FROM fix_duplicate_product_names();

-- Step 8: Create improved sync function that handles conflicts gracefully
CREATE OR REPLACE FUNCTION sync_product_catalog_to_products_safe()
RETURNS TRIGGER AS $$
DECLARE
    existing_product_id UUID;
    generated_sku TEXT;
BEGIN
    -- Try to find existing product by name and store
    SELECT id INTO existing_product_id
    FROM products 
    WHERE store_id = NEW.store_id 
    AND name = NEW.product_name
    AND is_active = true
    LIMIT 1;
    
    IF existing_product_id IS NOT NULL THEN
        -- Update existing product
        UPDATE products 
        SET 
            description = NEW.description,
            price = NEW.price,
            image_url = NEW.image_url,
            is_active = NEW.is_available,
            category_id = NEW.category_id,
            updated_at = NOW()
        WHERE id = existing_product_id;
    ELSE
        -- Only create new product if catalog item is available and no conflicts exist
        IF NEW.is_available = true AND NOT EXISTS (
            SELECT 1 FROM products 
            WHERE store_id = NEW.store_id 
            AND name = NEW.product_name 
            AND is_active = true
        ) THEN
            -- Generate unique SKU
            generated_sku := generate_recipe_sku(NEW.product_name, 'recipe');
            
            -- Ensure SKU is unique by adding suffix if needed
            WHILE EXISTS (SELECT 1 FROM products WHERE sku = generated_sku AND store_id = NEW.store_id) LOOP
                generated_sku := generated_sku || '-' || EXTRACT(EPOCH FROM NOW())::INTEGER;
            END LOOP;
            
            INSERT INTO products (
                name, description, price, cost, sku, stock_quantity,
                category_id, store_id, is_active, recipe_id, product_type, image_url
            ) VALUES (
                NEW.product_name,
                NEW.description,
                NEW.price,
                NEW.price * 0.7, -- Default cost calculation
                generated_sku,
                100, -- Default stock
                NEW.category_id,
                NEW.store_id,
                NEW.is_available,
                NEW.recipe_id,
                CASE WHEN NEW.recipe_id IS NOT NULL THEN 'recipe' ELSE 'direct' END,
                NEW.image_url
            );
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 9: Re-enable triggers with improved functions
DO $$
BEGIN
    -- Drop old triggers if they exist
    DROP TRIGGER IF EXISTS sync_catalog_to_products_trigger ON product_catalog;
    DROP TRIGGER IF EXISTS sync_catalog_to_products_safe_trigger ON product_catalog;

    -- Create new safe trigger
    CREATE TRIGGER sync_catalog_to_products_safe_trigger
        AFTER UPDATE ON product_catalog
        FOR EACH ROW
        EXECUTE FUNCTION sync_product_catalog_to_products_safe();

    RAISE NOTICE 'Created improved sync trigger: sync_catalog_to_products_safe_trigger';

    -- Re-enable other triggers if they exist
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enhanced_product_uniqueness_trigger' AND tgenabled = 'D') THEN
        ALTER TABLE products ENABLE TRIGGER enhanced_product_uniqueness_trigger;
        RAISE NOTICE 'Re-enabled enhanced_product_uniqueness_trigger';
    END IF;
END $$;

-- Step 10: Clean up temporary functions
DROP FUNCTION IF EXISTS fix_duplicate_skus();
DROP FUNCTION IF EXISTS fix_duplicate_product_names();

-- Step 11: Final verification
DO $$
DECLARE
    duplicate_count INTEGER;
BEGIN
    -- Check for remaining duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT store_id, sku
        FROM products 
        WHERE sku IS NOT NULL
        GROUP BY store_id, sku
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE WARNING 'Still found % duplicate SKU combinations after fix', duplicate_count;
    ELSE
        RAISE NOTICE 'SUCCESS: No duplicate SKU combinations found';
    END IF;
    
    -- Check for remaining name duplicates
    SELECT COUNT(*) INTO duplicate_count
    FROM (
        SELECT store_id, name
        FROM products 
        WHERE is_active = true
        GROUP BY store_id, name
        HAVING COUNT(*) > 1
    ) duplicates;
    
    IF duplicate_count > 0 THEN
        RAISE WARNING 'Still found % duplicate active product names after fix', duplicate_count;
    ELSE
        RAISE NOTICE 'SUCCESS: No duplicate active product names found';
    END IF;
    RAISE NOTICE 'Product Catalog Constraint Violation Fix completed successfully!';
END $$;
