-- Create recipes for Croffle Overload and Mini Croffle products linking to our cleaned templates
DO $$
DECLARE
    croffle_overload_template_id UUID;
    mini_croffle_template_id UUID;
    store_id UUID := 'fd45e07e-7832-4f51-b46b-7ef604359b86';
BEGIN
    -- Get the template IDs for our cleaned templates
    SELECT id INTO croffle_overload_template_id FROM recipe_templates WHERE name = 'Croffle Overload';
    SELECT id INTO mini_croffle_template_id FROM recipe_templates WHERE name = 'Mini Croffle';
    
    -- Create recipe for Croffle Overload product
    INSERT INTO recipes (
        product_id,
        store_id,
        template_id,
        name,
        description,
        instructions,
        serving_size,
        is_active,
        created_by
    ) VALUES (
        '4f512e46-2d5e-437f-8305-7467a478bc50',
        store_id,
        croffle_overload_template_id,
        'Croffle Overload Recipe',
        'Recipe for Croffle Overload Mix & Match product',
        'Use base ingredients from template',
        1,
        true,
        (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)
    );
    
    -- Create recipe for Mini Croffle product  
    INSERT INTO recipes (
        product_id,
        store_id,
        template_id,
        name,
        description,
        instructions,
        serving_size,
        is_active,
        created_by
    ) VALUES (
        'd9463216-e2c0-4788-8853-e9736c881fd0',
        store_id,
        mini_croffle_template_id,
        'Mini Croffle Recipe',
        'Recipe for Mini Croffle Mix & Match product',
        'Use base ingredients from template',
        1,
        true,
        (SELECT id FROM auth.users WHERE email = 'admin@example.com' LIMIT 1)
    );
    
END $$;