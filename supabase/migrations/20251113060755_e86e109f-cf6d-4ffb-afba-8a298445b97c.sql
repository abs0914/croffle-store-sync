-- Add commissary_item_id to purchase_order_items for proper separation
-- Step 1: Add the new column (nullable for now)
ALTER TABLE public.purchase_order_items 
ADD COLUMN IF NOT EXISTS commissary_item_id UUID REFERENCES public.commissary_inventory(id) ON DELETE SET NULL;

-- Step 2: Make inventory_stock_id nullable
ALTER TABLE public.purchase_order_items 
ALTER COLUMN inventory_stock_id DROP NOT NULL;

-- Step 3: For existing rows that have inventory_stock_id, try to find matching commissary items
-- This is a one-time migration to fix existing data
UPDATE public.purchase_order_items poi
SET commissary_item_id = ci.id
FROM public.inventory_stock ist
JOIN public.commissary_inventory ci ON ci.name = ist.item AND ci.unit = ist.unit
WHERE poi.inventory_stock_id = ist.id
  AND poi.commissary_item_id IS NULL;

-- Step 4: Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_purchase_order_items_commissary_item_id 
ON public.purchase_order_items(commissary_item_id);