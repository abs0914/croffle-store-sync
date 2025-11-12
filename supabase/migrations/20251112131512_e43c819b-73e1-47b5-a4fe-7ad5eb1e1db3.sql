-- Mark all active commissary inventory items as orderable (finished products)
UPDATE commissary_inventory 
SET item_type = 'orderable_item',
    updated_at = now()
WHERE is_active = true
  AND item_type IN ('raw_material', 'supply');