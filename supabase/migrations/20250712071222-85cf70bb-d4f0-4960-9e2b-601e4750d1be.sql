-- Function to sync template images to product catalog entries
CREATE OR REPLACE FUNCTION sync_template_images_to_products()
RETURNS TABLE(updated_count integer, error_count integer, details text[])
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  product_record RECORD;
  updated_count integer := 0;
  error_count integer := 0;
  details text[] := ARRAY[]::text[];
BEGIN
  -- Update product catalog entries that are missing images but have templates with images
  FOR product_record IN 
    SELECT 
      pc.id,
      pc.product_name,
      pc.store_id,
      rt.image_url as template_image_url,
      s.name as store_name
    FROM product_catalog pc
    JOIN recipes r ON pc.recipe_id = r.id
    JOIN recipe_templates rt ON r.template_id = rt.id
    JOIN stores s ON pc.store_id = s.id
    WHERE pc.image_url IS NULL 
      AND rt.image_url IS NOT NULL
  LOOP
    BEGIN
      -- Update the product catalog entry with the template image
      UPDATE product_catalog 
      SET 
        image_url = product_record.template_image_url,
        updated_at = NOW()
      WHERE id = product_record.id;

      updated_count := updated_count + 1;
      details := details || (
        'Updated ' || product_record.product_name || 
        ' in ' || product_record.store_name || 
        ' with template image'
      );

    EXCEPTION WHEN OTHERS THEN
      error_count := error_count + 1;
      details := details || (
        'Error updating ' || product_record.product_name || 
        ' in ' || product_record.store_name || ': ' || SQLERRM
      );
    END;
  END LOOP;

  RETURN QUERY SELECT updated_count, error_count, details;
END;
$$;

-- Function to analyze deployment status across stores
CREATE OR REPLACE FUNCTION analyze_store_deployment_status()
RETURNS TABLE(
  store_name text, 
  store_id uuid,
  total_products integer, 
  products_with_images integer, 
  products_without_images integer,
  expected_products integer,
  missing_products integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  expected_count integer;
BEGIN
  -- Get the expected number of products (active templates)
  SELECT COUNT(*) INTO expected_count
  FROM recipe_templates 
  WHERE is_active = true;

  RETURN QUERY
  SELECT 
    s.name as store_name,
    s.id as store_id,
    COALESCE(COUNT(pc.id), 0)::integer as total_products,
    COALESCE(COUNT(CASE WHEN pc.image_url IS NOT NULL THEN 1 END), 0)::integer as products_with_images,
    COALESCE(COUNT(CASE WHEN pc.image_url IS NULL THEN 1 END), 0)::integer as products_without_images,
    expected_count as expected_products,
    GREATEST(expected_count - COALESCE(COUNT(pc.id), 0), 0)::integer as missing_products
  FROM stores s
  LEFT JOIN product_catalog pc ON s.id = pc.store_id
  WHERE s.is_active = true
  GROUP BY s.id, s.name, expected_count
  ORDER BY total_products DESC, store_name;
END;
$$;