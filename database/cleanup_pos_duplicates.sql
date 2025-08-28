-- =====================================================
-- POS PRODUCT & CATALOG DEDUPLICATION CLEANUP
-- =====================================================
-- Purpose: Remove duplicate POS products and product_catalog rows per store
-- Criteria: Keep row linked to recipe_id if available, otherwise keep the most recent
-- Scope: products (POS-facing) and product_catalog
-- Safety: Categories, stores, and recipes remain intact
-- How to run: Execute in Supabase SQL Editor (ONE TIME)
-- =====================================================

BEGIN;

-- 1) POS products: Deduplicate by (store_id, lower(name))
--    Prefer rows with recipe_id; if multiple, keep latest created_at
WITH ranked AS (
  SELECT
    p.id,
    p.store_id,
    lower(trim(p.name)) AS key_name,
    p.recipe_id,
    p.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY p.store_id, lower(trim(p.name))
      ORDER BY (p.recipe_id IS NULL) ASC, p.created_at DESC
    ) AS rn
  FROM products p
)
DELETE FROM products d
USING ranked r
WHERE d.id = r.id
  AND r.rn > 1;

-- 2) Product catalog: Deduplicate by (store_id, lower(product_name))
--    Prefer rows with recipe_id; if multiple, keep latest created_at
WITH ranked AS (
  SELECT
    pc.id,
    pc.store_id,
    lower(trim(pc.product_name)) AS key_name,
    pc.recipe_id,
    pc.created_at,
    ROW_NUMBER() OVER (
      PARTITION BY pc.store_id, lower(trim(pc.product_name))
      ORDER BY (pc.recipe_id IS NULL) ASC, pc.created_at DESC
    ) AS rn
  FROM product_catalog pc
)
DELETE FROM product_catalog d
USING ranked r
WHERE d.id = r.id
  AND r.rn > 1;

-- 3) Ensure is_available/is_active reflect recipe linkage
--    If no recipe_id, set is_available=false to avoid POS noise
UPDATE product_catalog
SET is_available = CASE WHEN recipe_id IS NULL THEN false ELSE is_available END;

UPDATE products
SET is_active = CASE WHEN recipe_id IS NULL THEN false ELSE is_active END;

COMMIT;

-- =====================
-- Verification queries:
-- =====================
-- 1) Check remaining duplicate groups in products
-- SELECT store_id, lower(trim(name)) AS k, COUNT(*)
-- FROM products
-- GROUP BY store_id, k
-- HAVING COUNT(*) > 1
-- ORDER BY COUNT(*) DESC
-- LIMIT 20;

-- 2) Check remaining duplicate groups in product_catalog
-- SELECT store_id, lower(trim(product_name)) AS k, COUNT(*)
-- FROM product_catalog
-- GROUP BY store_id, k
-- HAVING COUNT(*) > 1
-- ORDER BY COUNT(*) DESC
-- LIMIT 20;

-- 3) Count how many unlinked rows were deactivated
-- SELECT COUNT(*) FROM product_catalog WHERE recipe_id IS NULL AND is_available = false;
-- SELECT COUNT(*) FROM products WHERE recipe_id IS NULL AND is_active = false;

