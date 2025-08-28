-- Create combo products for all active stores

DO $$
DECLARE
    store_record RECORD;
    combo_category_id uuid;
BEGIN
    -- Loop through all active stores
    FOR store_record IN 
        SELECT id, name FROM stores WHERE is_active = true
    LOOP
        -- Get or create the Combo category for this store
        SELECT id INTO combo_category_id 
        FROM categories 
        WHERE name = 'Combo' AND store_id = store_record.id LIMIT 1;
        
        -- If no combo category exists for this store, create one
        IF combo_category_id IS NULL THEN
            INSERT INTO categories (name, description, store_id, is_active)
            VALUES ('Combo', 'Croffle and Espresso Combos', store_record.id, true)
            RETURNING id INTO combo_category_id;
        END IF;
        
        -- Check if combo products already exist for this store
        IF NOT EXISTS (
            SELECT 1 FROM products 
            WHERE store_id = store_record.id 
            AND combo_main IS NOT NULL 
            AND combo_add_on IS NOT NULL
        ) THEN
            -- Insert combo products for this store
            INSERT INTO products (
                name, description, price, store_id, category_id, 
                combo_main, combo_add_on, product_type, is_active, sku
            ) VALUES 
            ('Classic + Hot Espresso Combo', 'Classic Croffle with Hot Espresso', 170, store_record.id, combo_category_id, 'Classic', 'Hot Espresso', 'direct', true, 'COMBO-CLASSIC-HOT-' || store_record.id),
            ('Classic + Cold Espresso Combo', 'Classic Croffle with Cold Espresso', 175, store_record.id, combo_category_id, 'Classic', 'Cold Espresso', 'direct', true, 'COMBO-CLASSIC-COLD-' || store_record.id),
            ('Glaze + Hot Espresso Combo', 'Glaze Croffle with Hot Espresso', 125, store_record.id, combo_category_id, 'Glaze', 'Hot Espresso', 'direct', true, 'COMBO-GLAZE-HOT-' || store_record.id),
            ('Glaze + Cold Espresso Combo', 'Glaze Croffle with Cold Espresso', 130, store_record.id, combo_category_id, 'Glaze', 'Cold Espresso', 'direct', true, 'COMBO-GLAZE-COLD-' || store_record.id),
            ('Fruity + Hot Espresso Combo', 'Fruity Croffle with Hot Espresso', 170, store_record.id, combo_category_id, 'Fruity', 'Hot Espresso', 'direct', true, 'COMBO-FRUITY-HOT-' || store_record.id),
            ('Fruity + Cold Espresso Combo', 'Fruity Croffle with Cold Espresso', 175, store_record.id, combo_category_id, 'Fruity', 'Cold Espresso', 'direct', true, 'COMBO-FRUITY-COLD-' || store_record.id),
            ('Premium + Hot Espresso Combo', 'Premium Croffle with Hot Espresso', 170, store_record.id, combo_category_id, 'Premium', 'Hot Espresso', 'direct', true, 'COMBO-PREMIUM-HOT-' || store_record.id),
            ('Premium + Cold Espresso Combo', 'Premium Croffle with Cold Espresso', 175, store_record.id, combo_category_id, 'Premium', 'Cold Espresso', 'direct', true, 'COMBO-PREMIUM-COLD-' || store_record.id),
            ('Mini Croffle + Hot Espresso Combo', 'Mini Croffle with Hot Espresso', 110, store_record.id, combo_category_id, 'Mini Croffle', 'Hot Espresso', 'direct', true, 'COMBO-MINI-HOT-' || store_record.id),
            ('Mini Croffle + Cold Espresso Combo', 'Mini Croffle with Cold Espresso', 115, store_record.id, combo_category_id, 'Mini Croffle', 'Cold Espresso', 'direct', true, 'COMBO-MINI-COLD-' || store_record.id);
        END IF;
    END LOOP;
END $$;