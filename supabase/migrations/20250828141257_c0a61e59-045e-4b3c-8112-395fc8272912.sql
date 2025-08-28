-- Create sample combo products using the new combo structure
-- Note: These will be linked to stores, using placeholder store IDs for now

-- Get a sample store ID for demonstration
DO $$
DECLARE
    sample_store_id uuid;
    combo_category_id uuid;
BEGIN
    -- Get the first active store
    SELECT id INTO sample_store_id FROM stores WHERE is_active = true LIMIT 1;
    
    -- Get or create the Combo category
    SELECT id INTO combo_category_id FROM categories WHERE name = 'Combo' AND store_id = sample_store_id LIMIT 1;
    
    -- If no combo category exists, create one
    IF combo_category_id IS NULL THEN
        INSERT INTO categories (name, description, store_id, is_active)
        VALUES ('Combo', 'Croffle and Espresso Combos', sample_store_id, true)
        RETURNING id INTO combo_category_id;
    END IF;
    
    -- Insert combo products if store exists
    IF sample_store_id IS NOT NULL THEN
        -- Classic + Hot Espresso Combo
        INSERT INTO products (
            name, description, price, store_id, category_id, 
            combo_main, combo_add_on, product_type, is_active
        ) VALUES 
        ('Classic + Hot Espresso Combo', 'Classic Croffle with Hot Espresso', 170, sample_store_id, combo_category_id, 'Classic', 'Hot Espresso', 'combo', true),
        ('Classic + Cold Espresso Combo', 'Classic Croffle with Cold Espresso', 175, sample_store_id, combo_category_id, 'Classic', 'Cold Espresso', 'combo', true),
        
        -- Glaze combos
        ('Glaze + Hot Espresso Combo', 'Glaze Croffle with Hot Espresso', 125, sample_store_id, combo_category_id, 'Glaze', 'Hot Espresso', 'combo', true),
        ('Glaze + Cold Espresso Combo', 'Glaze Croffle with Cold Espresso', 130, sample_store_id, combo_category_id, 'Glaze', 'Cold Espresso', 'combo', true),
        
        -- Fruity combos
        ('Fruity + Hot Espresso Combo', 'Fruity Croffle with Hot Espresso', 170, sample_store_id, combo_category_id, 'Fruity', 'Hot Espresso', 'combo', true),
        ('Fruity + Cold Espresso Combo', 'Fruity Croffle with Cold Espresso', 175, sample_store_id, combo_category_id, 'Fruity', 'Cold Espresso', 'combo', true),
        
        -- Premium combos
        ('Premium + Hot Espresso Combo', 'Premium Croffle with Hot Espresso', 170, sample_store_id, combo_category_id, 'Premium', 'Hot Espresso', 'combo', true),
        ('Premium + Cold Espresso Combo', 'Premium Croffle with Cold Espresso', 175, sample_store_id, combo_category_id, 'Premium', 'Cold Espresso', 'combo', true),
        
        -- Mini Croffle combos
        ('Mini Croffle + Hot Espresso Combo', 'Mini Croffle with Hot Espresso', 110, sample_store_id, combo_category_id, 'Mini Croffle', 'Hot Espresso', 'combo', true),
        ('Mini Croffle + Cold Espresso Combo', 'Mini Croffle with Cold Espresso', 115, sample_store_id, combo_category_id, 'Mini Croffle', 'Cold Espresso', 'combo', true)
        
        ON CONFLICT (name, store_id) DO NOTHING; -- Prevent duplicates
        
    END IF;
END $$;