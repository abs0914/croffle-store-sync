-- Add missing order type fields to transactions table for delivery platform support
ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'online_delivery')),
ADD COLUMN IF NOT EXISTS delivery_platform TEXT CHECK (delivery_platform IN ('grab_food', 'food_panda')),
ADD COLUMN IF NOT EXISTS delivery_order_number TEXT;

-- Update payment methods for delivery orders to match platform
UPDATE transactions 
SET payment_method = CASE 
    WHEN order_notes ILIKE '%grab%' THEN 'grab_food'
    WHEN order_notes ILIKE '%foodpanda%' OR order_notes ILIKE '%food panda%' THEN 'food_panda'
    ELSE payment_method 
END
WHERE (order_notes ILIKE '%grab%' OR order_notes ILIKE '%foodpanda%' OR order_notes ILIKE '%food panda%');