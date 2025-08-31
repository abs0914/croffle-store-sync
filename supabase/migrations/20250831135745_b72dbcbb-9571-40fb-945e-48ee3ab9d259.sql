-- Fix recipe template ingredient quantities to use 1x deduction logic
-- Current issue: Recipe templates have actual measured quantities (15ml, 30ml, etc.)
-- But inventory deduction should use normalized 1x quantities (except 0.5x for Regular Croffle in Mix & Match)

-- Update all recipe template ingredients to use quantity = 1 for inventory deduction
-- This normalizes the deduction logic to 1 item per product sold
UPDATE recipe_template_ingredients 
SET quantity = 1
WHERE quantity != 1
AND ingredient_name NOT IN (
    -- Keep existing quantities for ingredients that might legitimately need different amounts
    'Regular Croissant' -- This will be handled specially for Mix & Match (0.5x)
);

-- For Regular Croissant in templates that support Mix & Match, keep quantity = 1 
-- The 0.5x deduction will be handled in the application logic for Mix & Match orders
UPDATE recipe_template_ingredients 
SET quantity = 1
WHERE ingredient_name = 'Regular Croissant'
AND quantity != 1;

-- Add a comment to document this change
COMMENT ON TABLE recipe_template_ingredients IS 'Stores recipe ingredients with normalized quantities for inventory deduction. Most ingredients use quantity=1 for 1:1 deduction logic, with special handling in application code for Mix & Match fractional deductions.';