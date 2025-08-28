-- Helper functions for handling constraint violations in the application
-- These functions support the TypeScript constraint violation handler

-- Function to temporarily disable sync triggers
CREATE OR REPLACE FUNCTION disable_sync_triggers()
RETURNS void AS $$
BEGIN
    -- Disable product catalog sync triggers
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_catalog_to_products_trigger') THEN
        EXECUTE 'ALTER TABLE product_catalog DISABLE TRIGGER sync_catalog_to_products_trigger';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_products_to_catalog_trigger') THEN
        EXECUTE 'ALTER TABLE products DISABLE TRIGGER sync_products_to_catalog_trigger';
    END IF;
    
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enhanced_product_uniqueness_trigger') THEN
        EXECUTE 'ALTER TABLE products DISABLE TRIGGER enhanced_product_uniqueness_trigger';
    END IF;
    
    -- Log the action
    RAISE NOTICE 'Sync triggers temporarily disabled for constraint violation handling';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to re-enable sync triggers
CREATE OR REPLACE FUNCTION enable_sync_triggers()
RETURNS void AS $$
BEGIN
    -- Re-enable product catalog sync triggers
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_catalog_to_products_trigger' AND tgenabled = 'D') THEN
        EXECUTE 'ALTER TABLE product_catalog ENABLE TRIGGER sync_catalog_to_products_trigger';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'sync_products_to_catalog_trigger' AND tgenabled = 'D') THEN
        EXECUTE 'ALTER TABLE products ENABLE TRIGGER sync_products_to_catalog_trigger';
    END IF;

    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enhanced_product_uniqueness_trigger' AND tgenabled = 'D') THEN
        EXECUTE 'ALTER TABLE products ENABLE TRIGGER enhanced_product_uniqueness_trigger';
    END IF;
    
    -- Log the action
    RAISE NOTICE 'Sync triggers re-enabled after constraint violation handling';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to find and resolve duplicate SKUs for a specific store
CREATE OR REPLACE FUNCTION resolve_duplicate_skus_for_store(target_store_id UUID)
RETURNS TABLE(resolved_count INTEGER, details TEXT) AS $$
DECLARE
    duplicate_record RECORD;
    new_sku TEXT;
    resolved_count INTEGER := 0;
    detail_text TEXT := '';
BEGIN
    -- Find and resolve duplicate SKUs for the specific store
    FOR duplicate_record IN 
        SELECT 
            sku,
            array_agg(id ORDER BY created_at) as product_ids,
            array_agg(name ORDER BY created_at) as product_names
        FROM products 
        WHERE store_id = target_store_id 
        AND sku IS NOT NULL
        GROUP BY sku
        HAVING COUNT(*) > 1
    LOOP
        -- Keep the first product with original SKU, update others
        FOR i IN 2..array_length(duplicate_record.product_ids, 1) LOOP
            -- Generate new unique SKU
            new_sku := 'PC-' || 
                      UPPER(SUBSTRING(REGEXP_REPLACE(duplicate_record.product_names[i], '[^A-Za-z0-9]', '', 'g'), 1, 8)) || 
                      '-' || 
                      UPPER(SUBSTRING(target_store_id::TEXT, 1, 6)) || 
                      '-' || 
                      EXTRACT(EPOCH FROM NOW())::INTEGER;
            
            -- Ensure uniqueness by checking if SKU already exists
            WHILE EXISTS (SELECT 1 FROM products WHERE sku = new_sku AND store_id = target_store_id) LOOP
                new_sku := new_sku || '-' || (RANDOM() * 1000)::INTEGER;
            END LOOP;
            
            -- Update the duplicate product with new SKU
            UPDATE products 
            SET sku = new_sku,
                updated_at = NOW()
            WHERE id = duplicate_record.product_ids[i];
            
            resolved_count := resolved_count + 1;
            detail_text := detail_text || format(
                'Resolved duplicate SKU for %s (ID: %s): %s -> %s; ',
                duplicate_record.product_names[i],
                duplicate_record.product_ids[i],
                duplicate_record.sku,
                new_sku
            );
        END LOOP;
    END LOOP;
    
    RETURN QUERY SELECT resolved_count, detail_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to safely update product catalog with conflict resolution
CREATE OR REPLACE FUNCTION safe_update_product_catalog(
    catalog_id UUID,
    new_product_name TEXT DEFAULT NULL,
    new_description TEXT DEFAULT NULL,
    new_price DECIMAL DEFAULT NULL,
    new_is_available BOOLEAN DEFAULT NULL,
    new_image_url TEXT DEFAULT NULL,
    new_category_id UUID DEFAULT NULL
)
RETURNS TABLE(success BOOLEAN, message TEXT, updated_data JSONB) AS $$
DECLARE
    catalog_record RECORD;
    conflict_count INTEGER;
    update_data JSONB := '{}';
    result_data JSONB;
BEGIN
    -- Get current catalog entry
    SELECT * INTO catalog_record
    FROM product_catalog
    WHERE id = catalog_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, 'Product catalog entry not found', NULL::JSONB;
        RETURN;
    END IF;
    
    -- Build update data
    IF new_product_name IS NOT NULL THEN
        update_data := update_data || jsonb_build_object('product_name', new_product_name);
    END IF;
    IF new_description IS NOT NULL THEN
        update_data := update_data || jsonb_build_object('description', new_description);
    END IF;
    IF new_price IS NOT NULL THEN
        update_data := update_data || jsonb_build_object('price', new_price);
    END IF;
    IF new_is_available IS NOT NULL THEN
        update_data := update_data || jsonb_build_object('is_available', new_is_available);
    END IF;
    IF new_image_url IS NOT NULL THEN
        update_data := update_data || jsonb_build_object('image_url', new_image_url);
    END IF;
    IF new_category_id IS NOT NULL THEN
        update_data := update_data || jsonb_build_object('category_id', new_category_id);
    END IF;
    
    -- Add updated_at timestamp
    update_data := update_data || jsonb_build_object('updated_at', NOW());
    
    -- Check for potential conflicts if product name is being changed
    IF new_product_name IS NOT NULL AND new_product_name != catalog_record.product_name THEN
        SELECT COUNT(*) INTO conflict_count
        FROM products
        WHERE store_id = catalog_record.store_id
        AND name = new_product_name
        AND is_active = true;
        
        -- If conflicts exist, resolve them first
        IF conflict_count > 0 THEN
            -- Resolve duplicate SKUs for this store
            PERFORM resolve_duplicate_skus_for_store(catalog_record.store_id);
            
            -- Deactivate conflicting products (keep newest active)
            UPDATE products 
            SET is_active = false, updated_at = NOW()
            WHERE store_id = catalog_record.store_id
            AND name = new_product_name
            AND is_active = true
            AND id NOT IN (
                SELECT id FROM products
                WHERE store_id = catalog_record.store_id
                AND name = new_product_name
                AND is_active = true
                ORDER BY created_at DESC
                LIMIT 1
            );
        END IF;
    END IF;
    
    -- Perform the update
    BEGIN
        UPDATE product_catalog
        SET 
            product_name = COALESCE(new_product_name, product_name),
            description = COALESCE(new_description, description),
            price = COALESCE(new_price, price),
            is_available = COALESCE(new_is_available, is_available),
            image_url = COALESCE(new_image_url, image_url),
            category_id = COALESCE(new_category_id, category_id),
            updated_at = NOW()
        WHERE id = catalog_id
        RETURNING to_jsonb(product_catalog.*) INTO result_data;
        
        RETURN QUERY SELECT TRUE, 'Product catalog updated successfully', result_data;
        
    EXCEPTION WHEN unique_violation THEN
        -- If we still get a unique violation, provide detailed error info
        RETURN QUERY SELECT FALSE, 
            format('Unique constraint violation: %s. Please check for duplicate data.', SQLERRM),
            NULL::JSONB;
    END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check for potential conflicts before updating
CREATE OR REPLACE FUNCTION check_product_catalog_update_conflicts(
    catalog_id UUID,
    new_product_name TEXT DEFAULT NULL
)
RETURNS TABLE(has_conflicts BOOLEAN, conflict_details JSONB) AS $$
DECLARE
    catalog_record RECORD;
    conflicts JSONB := '[]';
    conflict_found BOOLEAN := FALSE;
BEGIN
    -- Get current catalog entry
    SELECT * INTO catalog_record
    FROM product_catalog
    WHERE id = catalog_id;
    
    IF NOT FOUND THEN
        RETURN QUERY SELECT TRUE, jsonb_build_object('error', 'Product catalog entry not found');
        RETURN;
    END IF;
    
    -- Check for name conflicts if product name is being changed
    IF new_product_name IS NOT NULL AND new_product_name != catalog_record.product_name THEN
        -- Check for existing products with the same name
        SELECT jsonb_agg(
            jsonb_build_object(
                'type', 'name_conflict',
                'product_id', p.id,
                'product_name', p.name,
                'sku', p.sku,
                'is_active', p.is_active,
                'created_at', p.created_at
            )
        ) INTO conflicts
        FROM products p
        WHERE p.store_id = catalog_record.store_id
        AND p.name = new_product_name;
        
        IF conflicts != '[]' THEN
            conflict_found := TRUE;
        END IF;
    END IF;
    
    -- Check for SKU conflicts in the same store
    SELECT jsonb_agg(
        jsonb_build_object(
            'type', 'sku_conflict',
            'sku', sku,
            'product_count', cnt,
            'product_names', names
        )
    ) INTO conflicts
    FROM (
        SELECT 
            sku,
            COUNT(*) as cnt,
            array_agg(name) as names
        FROM products
        WHERE store_id = catalog_record.store_id
        AND sku IS NOT NULL
        GROUP BY sku
        HAVING COUNT(*) > 1
    ) sku_conflicts;
    
    IF conflicts != '[]' THEN
        conflict_found := TRUE;
    END IF;
    
    RETURN QUERY SELECT conflict_found, COALESCE(conflicts, '[]');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION disable_sync_triggers() TO authenticated;
GRANT EXECUTE ON FUNCTION enable_sync_triggers() TO authenticated;
GRANT EXECUTE ON FUNCTION resolve_duplicate_skus_for_store(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION safe_update_product_catalog(UUID, TEXT, TEXT, DECIMAL, BOOLEAN, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION check_product_catalog_update_conflicts(UUID, TEXT) TO authenticated;
