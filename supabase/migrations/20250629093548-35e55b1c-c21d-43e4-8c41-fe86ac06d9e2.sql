
-- Reactivate finished products (orderable_items) that should be available for ordering
UPDATE commissary_inventory 
SET is_active = true, 
    updated_at = NOW()
WHERE item_type = 'orderable_item' 
  AND is_active = false;

-- Ensure orderable items have reasonable stock levels for ordering
UPDATE commissary_inventory 
SET current_stock = GREATEST(current_stock, 10),
    minimum_threshold = GREATEST(minimum_threshold, 5),
    updated_at = NOW()
WHERE item_type = 'orderable_item' 
  AND current_stock <= 0;

-- Set up location pricing for orderable items if not exists (INSIDE CEBU)
INSERT INTO location_pricing (
  commissary_item_id, 
  location_type, 
  base_price, 
  markup_percentage, 
  minimum_order_quantity,
  shipping_cost,
  lead_time_days,
  is_active
)
SELECT 
  ci.id,
  'inside_cebu',
  COALESCE(ci.unit_cost, 50), -- Default base price if unit_cost is null
  0, -- No markup for inside cebu
  1,
  0, -- No shipping cost for inside cebu
  1, -- 1 day lead time for inside cebu
  true
FROM commissary_inventory ci
WHERE ci.item_type = 'orderable_item' 
  AND ci.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM location_pricing lp 
    WHERE lp.commissary_item_id = ci.id 
      AND lp.location_type = 'inside_cebu'
  );

-- Set up location pricing for orderable items if not exists (OUTSIDE CEBU)
INSERT INTO location_pricing (
  commissary_item_id, 
  location_type, 
  base_price, 
  markup_percentage, 
  minimum_order_quantity,
  shipping_cost,
  lead_time_days,
  is_active
)
SELECT 
  ci.id,
  'outside_cebu',
  COALESCE(ci.unit_cost, 50), -- Default base price if unit_cost is null
  15, -- 15% markup for outside cebu
  5, -- Higher minimum order quantity
  50, -- Shipping cost for outside cebu
  3, -- 3 days lead time for outside cebu
  true
FROM commissary_inventory ci
WHERE ci.item_type = 'orderable_item' 
  AND ci.is_active = true
  AND NOT EXISTS (
    SELECT 1 FROM location_pricing lp 
    WHERE lp.commissary_item_id = ci.id 
      AND lp.location_type = 'outside_cebu'
  );
