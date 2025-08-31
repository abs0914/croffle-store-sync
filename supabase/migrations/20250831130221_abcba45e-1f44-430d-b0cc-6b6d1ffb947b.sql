-- Create recipes without product_id constraint - using NULL for product_id 
-- since this system uses recipe templates for inventory deduction
DO $$
DECLARE
    croffle_overload_template_id UUID;
    mini_croffle_template_id UUID;
    store_id UUID := 'fd45e07e-7832-4f51-b46b-7ef604359b86';
BEGIN
    -- Get the template IDs for our cleaned templates
    SELECT id INTO croffle_overload_template_id FROM recipe_templates WHERE name = 'Croffle Overload';
    SELECT id INTO mini_croffle_template_id FROM recipe_templates WHERE name = 'Mini Croffle';
    
    -- Create recipe for Croffle Overload (Mix & Match base recipe)
    INSERT INTO recipes (
        store_id,
        template_id,
        name,
        description,
        instructions,
        serving_size,
        is_active
    ) VALUES (
        store_id,
        croffle_overload_template_id,
        'Croffle Overload Base Recipe',
        'Base recipe for Croffle Overload Mix & Match product - contains only base ingredients',
        'Use base ingredients from template for inventory deduction',
        1,
        true
    );
    
    -- Create recipe for Mini Croffle (Mix & Match base recipe)
    INSERT INTO recipes (
        store_id,
        template_id,
        name,
        description,
        instructions,
        serving_size,
        is_active
    ) VALUES (
        store_id,
        mini_croffle_template_id,
        'Mini Croffle Base Recipe',
        'Base recipe for Mini Croffle Mix & Match product - contains only base ingredients',
        'Use base ingredients from template for inventory deduction',
        1,
        true
    );
    
END $$;