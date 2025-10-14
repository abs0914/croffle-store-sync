
-- Update espresso drink prices across all stores

-- Americano Hot: ₱65 (already correct for most)
UPDATE product_catalog
SET price = 65, updated_at = now()
WHERE product_name = 'Americano Hot';

-- Americano Iced: ₱70
UPDATE product_catalog
SET price = 70, updated_at = now()
WHERE product_name = 'Americano Iced';

-- Cappuccino Hot: ₱75
UPDATE product_catalog
SET price = 75, updated_at = now()
WHERE product_name = 'Cappuccino Hot';

-- Cappuccino Iced: ₱80
UPDATE product_catalog
SET price = 80, updated_at = now()
WHERE product_name = 'Cappuccino Iced';

-- Cafe Latte Hot: ₱75
UPDATE product_catalog
SET price = 75, updated_at = now()
WHERE product_name = 'Cafe Latte Hot';

-- Cafe Latte Iced: ₱80
UPDATE product_catalog
SET price = 80, updated_at = now()
WHERE product_name = 'Cafe Latte Iced';

-- Cafe Mocha Hot: ₱80
UPDATE product_catalog
SET price = 80, updated_at = now()
WHERE product_name = 'Cafe Mocha Hot';

-- Cafe Mocha Iced: ₱85
UPDATE product_catalog
SET price = 85, updated_at = now()
WHERE product_name = 'Cafe Mocha Iced';

-- Caramel Latte Hot: ₱80
UPDATE product_catalog
SET price = 80, updated_at = now()
WHERE product_name = 'Caramel Latte Hot';

-- Caramel Latte Iced: ₱85
UPDATE product_catalog
SET price = 85, updated_at = now()
WHERE product_name = 'Caramel Latte Iced';
