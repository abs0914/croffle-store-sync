-- Diagnostic Check for Product Catalog Constraint Issues
-- Run this script first to understand the current state of your database

-- 1. Check all constraints on the products table
SELECT 
    'CONSTRAINT ANALYSIS' as section,
    conname as constraint_name,
    contype as type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint 
WHERE conrelid = 'products'::regclass
ORDER BY conname;

-- 2. Look for the specific constraint mentioned in the error
SELECT 
    'SPECIFIC CONSTRAINT CHECK' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM pg_constraint 
            WHERE conrelid = 'products'::regclass 
            AND conname = 'products_store_id_sku_key'
        ) THEN 'FOUND: products_store_id_sku_key constraint exists'
        ELSE 'NOT FOUND: products_store_id_sku_key constraint does not exist'
    END as constraint_status;

-- 3. Check for duplicate SKUs (likely cause of the constraint violation)
WITH duplicate_skus AS (
    SELECT 
        store_id,
        sku,
        COUNT(*) as duplicate_count,
        array_agg(id) as product_ids,
        array_agg(name) as product_names
    FROM products 
    WHERE sku IS NOT NULL
    GROUP BY store_id, sku
    HAVING COUNT(*) > 1
)
SELECT 
    'DUPLICATE SKU ANALYSIS' as section,
    store_id,
    sku,
    duplicate_count,
    product_names,
    'These products share the same store_id + sku combination' as issue
FROM duplicate_skus
ORDER BY duplicate_count DESC;

-- 4. Check for duplicate product names (another potential conflict)
WITH duplicate_names AS (
    SELECT 
        store_id,
        name,
        COUNT(*) as duplicate_count,
        array_agg(id) as product_ids,
        array_agg(sku) as product_skus,
        array_agg(is_active) as active_status
    FROM products 
    GROUP BY store_id, name
    HAVING COUNT(*) > 1
)
SELECT 
    'DUPLICATE NAME ANALYSIS' as section,
    store_id,
    name,
    duplicate_count,
    product_skus,
    active_status,
    'These products share the same store_id + name combination' as issue
FROM duplicate_names
ORDER BY duplicate_count DESC;

-- 5. Check the specific products mentioned in your error
SELECT 
    'SPECIFIC PRODUCT CHECK' as section,
    p.id,
    p.name,
    p.sku,
    p.store_id,
    p.is_active,
    s.name as store_name,
    'Status of products mentioned in error' as note
FROM products p
LEFT JOIN stores s ON p.store_id = s.id
WHERE p.name IN ('Tiramisu Croffle', 'Caramel Delight Croffle')
ORDER BY p.name, p.created_at;

-- 6. Check product_catalog entries for the same products
SELECT 
    'PRODUCT CATALOG CHECK' as section,
    pc.id,
    pc.product_name,
    pc.store_id,
    pc.is_available,
    s.name as store_name,
    'Product catalog entries for mentioned products' as note
FROM product_catalog pc
LEFT JOIN stores s ON pc.store_id = s.id
WHERE pc.product_name IN ('Tiramisu Croffle', 'Caramel Delight Croffle')
ORDER BY pc.product_name, pc.created_at;

-- 7. Check for orphaned product_catalog entries (no matching products)
SELECT 
    'ORPHANED CATALOG ENTRIES' as section,
    pc.id as catalog_id,
    pc.product_name,
    pc.store_id,
    s.name as store_name,
    pc.is_available,
    'Catalog entries without matching products table entries' as issue
FROM product_catalog pc
LEFT JOIN stores s ON pc.store_id = s.id
LEFT JOIN products p ON p.store_id = pc.store_id AND p.name = pc.product_name
WHERE p.id IS NULL
AND pc.is_available = true
LIMIT 10;

-- 8. Check active triggers that might be causing sync issues
SELECT
    'TRIGGER ANALYSIS' as section,
    n.nspname as schema_name,
    c.relname as table_name,
    t.tgname as trigger_name,
    CASE
        WHEN t.tgenabled = 'O' THEN 'Enabled'
        WHEN t.tgenabled = 'D' THEN 'Disabled'
        ELSE 'Other'
    END as trigger_status,
    'Trigger that might affect product sync' as note
FROM pg_trigger t
JOIN pg_class c ON t.tgrelid = c.oid
JOIN pg_namespace n ON c.relnamespace = n.oid
WHERE c.relname IN ('products', 'product_catalog')
AND t.tgname LIKE '%sync%'
ORDER BY c.relname, t.tgname;

-- 9. Check recent products that might have been created during the error
SELECT 
    'RECENT PRODUCTS' as section,
    p.id,
    p.name,
    p.sku,
    p.store_id,
    p.created_at,
    s.name as store_name,
    'Recently created products (last 24 hours)' as note
FROM products p
LEFT JOIN stores s ON p.store_id = s.id
WHERE p.created_at > NOW() - INTERVAL '24 hours'
ORDER BY p.created_at DESC
LIMIT 10;

-- 10. Summary statistics
SELECT 
    'SUMMARY STATISTICS' as section,
    (SELECT COUNT(*) FROM products) as total_products,
    (SELECT COUNT(*) FROM products WHERE is_active = true) as active_products,
    (SELECT COUNT(*) FROM product_catalog) as total_catalog_entries,
    (SELECT COUNT(*) FROM product_catalog WHERE is_available = true) as available_catalog_entries,
    (SELECT COUNT(DISTINCT sku) FROM products WHERE sku IS NOT NULL) as unique_skus,
    (SELECT COUNT(*) FROM products WHERE sku IS NOT NULL) as products_with_skus;

-- 11. Check if the specific product ID from your error exists
SELECT 
    'ERROR PRODUCT ID CHECK' as section,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM product_catalog 
            WHERE id = '20ca59d3-fd72-4888-81a9-f88b67f71abc'
        ) THEN 'FOUND: Product catalog entry exists'
        ELSE 'NOT FOUND: Product catalog entry does not exist'
    END as catalog_status,
    CASE 
        WHEN EXISTS (
            SELECT 1 FROM products 
            WHERE id = '20ca59d3-fd72-4888-81a9-f88b67f71abc'
        ) THEN 'FOUND: Products table entry exists'
        ELSE 'NOT FOUND: Products table entry does not exist'
    END as products_status;
