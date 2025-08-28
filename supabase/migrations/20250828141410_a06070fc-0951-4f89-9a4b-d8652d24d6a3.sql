-- Create sample combo products with proper SKU values

DO $$
DECLARE
    sample_store_id uuid;
    combo_category_id uuid;
    existing_combo_count integer;
BEGIN
    -- Get the first active store
    SELECT id INTO sample_store_id FROM stores WHERE is_active = true LIMIT 1;
    
    IF sample_store_id IS NOT NULL THEN
        -- Get or create the Combo category
        SELECT id INTO combo_category_id FROM categories WHERE name = 'Combo' AND store_id = sample_store_id LIMIT 1;
        
        -- If no combo category exists, create one
        IF combo_category_id IS NULL THEN
            INSERT INTO categories (name, description, store_id, is_active)
            VALUES ('Combo', 'Croffle and Espresso Combos', sample_store_id, true)
            RETURNING id INTO combo_category_id;
        END IF;
        
        -- Check if combo products already exist
        SELECT COUNT(*) INTO existing_combo_count 
        FROM products 
        WHERE store_id = sample_store_id 
        AND combo_main IS NOT NULL 
        AND combo_add_on IS NOT NULL;
        
        -- Only insert if no combo products exist
        IF existing_combo_count = 0 THEN
            INSERT INTO products (
                name, description, price, store_id, category_id, 
                combo_main, combo_add_on, product_type, is_active, sku
            ) VALUES 
            ('Classic + Hot Espresso Combo', 'Classic Croffle with Hot Espresso', 170, sample_store_id, combo_category_id, 'Classic', 'Hot Espresso', 'combo', true, 'COMBO-CLASSIC-HOT'),
            ('Classic + Cold Espresso Combo', 'Classic Croffle with Cold Espresso', 175, sample_store_id, combo_category_id, 'Classic', 'Cold Espresso', 'combo', true, 'COMBO-CLASSIC-COLD'),
            ('Glaze + Hot Espresso Combo', 'Glaze Croffle with Hot Espresso', 125, sample_store_id, combo_category_id, 'Glaze', 'Hot Espresso', 'combo', true, 'COMBO-GLAZE-HOT'),
            ('Glaze + Cold Espresso Combo', 'Glaze Croffle with Cold Espresso', 130, sample_store_id, combo_category_id, 'Glaze', 'Cold Espresso', 'combo', true, 'COMBO-GLAZE-COLD'),
            ('Fruity + Hot Espresso Combo', 'Fruity Croffle with Hot Espresso', 170, sample_store_id, combo_category_id, 'Fruity', 'Hot Espresso', 'combo', true, 'COMBO-FRUITY-HOT'),
            ('Fruity + Cold Espresso Combo', 'Fruity Croffle with Cold Espresso', 175, sample_store_id, combo_category_id, 'Fruity', 'Cold Espresso', 'combo', true, 'COMBO-FRUITY-COLD'),
            ('Premium + Hot Espresso Combo', 'Premium Croffle with Hot Espresso', 170, sample_store_id, combo_category_id, 'Premium', 'Hot Espresso', 'combo', true, 'COMBO-PREMIUM-HOT'),
            ('Premium + Cold Espresso Combo', 'Premium Croffle with Cold Espresso', 175, sample_store_id, combo_category_id, 'Premium', 'Cold Espresso', 'combo', true, 'COMBO-PREMIUM-COLD'),
            ('Mini Croffle + Hot Espresso Combo', 'Mini Croffle with Hot Espresso', 110, sample_store_id, combo_category_id, 'Mini Croffle', 'Hot Espresso', 'combo', true, 'COMBO-MINI-HOT'),
            ('Mini Croffle + Cold Espresso Combo', 'Mini Croffle with Cold Espresso', 115, sample_store_id, combo_category_id, 'Mini Croffle', 'Cold Espresso', 'combo', true, 'COMBO-MINI-COLD');
        END IF;
    END IF;
END $$;