-- OPTION A: Standardize name and materialize product_ingredients for "Matcha Croffle"
-- One-time corrective script. Run in Supabase SQL editor or psql against the dev/prod DB (with caution).
-- Safe order: PRECHECK -> (optional) DRY RUN -> APPLY -> VERIFY

-- =====================
-- PRECHECKS (Read-only)
-- =====================
-- 1) Show catalog rows that currently use the double-space name
SELECT id, store_id, product_name, recipe_id, updated_at
FROM product_catalog
WHERE product_name = 'Matcha  Croffle'
ORDER BY store_id, updated_at DESC;

-- 2) Confirm there are no existing single-space rows that would conflict post-rename
SELECT id, store_id, product_name, recipe_id
FROM product_catalog
WHERE product_name = 'Matcha Croffle'
ORDER BY store_id;

-- 3) Confirm associated recipe/template and ingredient rows exist
SELECT pc.id AS product_catalog_id, pc.store_id, r.id AS recipe_id, rt.id AS template_id, rt.name AS template_name, rt.is_active
FROM product_catalog pc
JOIN recipes r ON r.id = pc.recipe_id
JOIN recipe_templates rt ON rt.id = r.template_id
WHERE pc.product_name IN ('Matcha  Croffle', 'Matcha Croffle')
ORDER BY pc.store_id;

-- 4) Count existing product_ingredients (should be 0 if not yet materialized)
SELECT pc.id AS product_catalog_id, COUNT(pi.id) AS ingredient_count
FROM product_catalog pc
LEFT JOIN product_ingredients pi ON pi.product_catalog_id = pc.id
WHERE pc.product_name IN ('Matcha  Croffle', 'Matcha Croffle')
GROUP BY pc.id
ORDER BY ingredient_count DESC;

-- =====================
-- (OPTIONAL) DRY RUN PREVIEW (Read-only):
-- What will be inserted into product_ingredients after rename/materialization?
-- This shows only rows that can be matched to inventory_stock by item name per store.
-- =====================
WITH targets AS (
  SELECT pc.id AS product_catalog_id, pc.store_id, r.template_id
  FROM product_catalog pc
  JOIN recipes r ON r.id = pc.recipe_id
  WHERE pc.product_name IN ('Matcha  Croffle', 'Matcha Croffle')
), mappable AS (
  SELECT t.product_catalog_id,
         t.store_id,
         rti.ingredient_name,
         rti.quantity AS required_quantity,
         rti.unit,
         ist.id AS inventory_stock_id
  FROM targets t
  JOIN recipe_template_ingredients rti ON rti.recipe_template_id = t.template_id
  LEFT JOIN inventory_stock ist
    ON ist.store_id = t.store_id
   AND ist.item = rti.ingredient_name
   AND ist.is_active = true
)
SELECT * FROM mappable WHERE inventory_stock_id IS NOT NULL ORDER BY product_catalog_id, ingredient_name;

-- =====================
-- APPLY CHANGES (Write)
-- =====================
BEGIN;

-- A) Standardize product name: double space -> single space
UPDATE product_catalog
SET product_name = 'Matcha Croffle', updated_at = NOW()
WHERE product_name = 'Matcha  Croffle';

-- B) Materialize product_ingredients for every affected catalog row
-- Insert only rows that have a matching inventory_stock_id and do not already exist
WITH targets AS (
  SELECT pc.id AS product_catalog_id, pc.store_id, r.template_id
  FROM product_catalog pc
  JOIN recipes r ON r.id = pc.recipe_id
  WHERE pc.product_name = 'Matcha Croffle'
), candidates AS (
  SELECT t.product_catalog_id,
         ist.id AS inventory_stock_id,
         NULL::uuid AS commissary_item_id,
         rti.quantity AS required_quantity,
         rti.unit
  FROM targets t
  JOIN recipe_template_ingredients rti ON rti.recipe_template_id = t.template_id
  JOIN inventory_stock ist
    ON ist.store_id = t.store_id
   AND ist.item = rti.ingredient_name
   AND ist.is_active = true
)
INSERT INTO product_ingredients (
  product_catalog_id, inventory_stock_id, commissary_item_id, required_quantity, unit
)
SELECT c.product_catalog_id, c.inventory_stock_id, c.commissary_item_id, c.required_quantity, c.unit
FROM candidates c
WHERE NOT EXISTS (
  SELECT 1 FROM product_ingredients pi
  WHERE pi.product_catalog_id = c.product_catalog_id
    AND pi.inventory_stock_id = c.inventory_stock_id
);

COMMIT;

-- =====================
-- VERIFY (Read-only)
-- =====================
-- 1) Confirm rename applied
SELECT id, store_id, product_name
FROM product_catalog
WHERE product_name IN ('Matcha Croffle', 'Matcha  Croffle')
ORDER BY product_name, store_id;

-- 2) Confirm product_ingredients now exist
SELECT pc.id AS product_catalog_id, pc.store_id, pc.product_name, COUNT(pi.id) AS ingredients
FROM product_catalog pc
LEFT JOIN product_ingredients pi ON pi.product_catalog_id = pc.id
WHERE pc.product_name = 'Matcha Croffle'
GROUP BY pc.id, pc.store_id, pc.product_name
ORDER BY pc.store_id;

-- 3) Show any missing mappings (ingredients with no matching inventory item)
WITH targets AS (
  SELECT pc.id AS product_catalog_id, pc.store_id, r.template_id
  FROM product_catalog pc
  JOIN recipes r ON r.id = pc.recipe_id
  WHERE pc.product_name = 'Matcha Croffle'
)
SELECT t.product_catalog_id, t.store_id, rti.ingredient_name, rti.unit
FROM targets t
JOIN recipe_template_ingredients rti ON rti.recipe_template_id = t.template_id
LEFT JOIN inventory_stock ist
  ON ist.store_id = t.store_id
 AND ist.item = rti.ingredient_name
 AND ist.is_active = true
WHERE ist.id IS NULL
ORDER BY t.store_id, rti.ingredient_name;

-- NOTE:
-- If VERIFY step (3) shows missing inventory item names, create the inventory_stock rows for those items per store
-- or adjust ingredient names to match inventory_stock.item exactly. Then re-run the APPLY section B) to insert any newly mappable rows.

