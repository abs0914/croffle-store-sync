-- Add KitKat biscuit as add-on with ₱10 price
INSERT INTO product_addon_items (
  name,
  category,
  price,
  description,
  is_available,
  is_premium,
  display_order,
  addon_category_id
) VALUES (
  'KitKat',
  'biscuits',
  10.00,
  'Premium chocolate wafer biscuit',
  true,
  false,
  1,
  '41a28a12-3293-4780-9ce4-5bc0fe7ddfe5'
);