-- Add product_status column to product_catalog table if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'product_catalog' 
        AND column_name = 'product_status'
    ) THEN
        ALTER TABLE product_catalog 
        ADD COLUMN product_status TEXT DEFAULT 'available' 
        CHECK (product_status IN ('available', 'out_of_stock', 'temporarily_unavailable', 'discontinued'));
        
        -- Update existing records to have 'available' status if is_available is true
        UPDATE product_catalog 
        SET product_status = CASE 
            WHEN is_available = true THEN 'available'
            ELSE 'out_of_stock'
        END;
    END IF;
END $$;